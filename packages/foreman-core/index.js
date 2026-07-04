const WORKFLOWS = {
  event_booking: {
    label: 'Event Booking Workflow',
    owner: 'Events Team',
    steps: [
      'Confirm event type and date',
      'Prepare invite/ticket setup',
      'Prepare QR check-in plan',
      'Send human review summary',
    ],
  },
  tech_support: {
    label: 'Tech Support Workflow',
    owner: 'Support Team',
    steps: [
      'Capture issue details',
      'Check priority and affected system',
      'Assign technical follow-up',
      'Send customer update',
    ],
  },
  business_automation: {
    label: 'Business Automation Workflow',
    owner: 'Automation Team',
    steps: [
      'Map request intake',
      'Choose routing path',
      'Prepare dashboard task',
      'Send approval summary',
    ],
  },
  general_request: {
    label: 'General Business Request',
    owner: 'Operations',
    steps: [
      'Review request',
      'Clarify missing information',
      'Assign owner',
      'Send customer update',
    ],
  },
};

const VALID_INTENTS = Object.keys(WORKFLOWS);
const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/llama-v3p1-8b-instruct';
const DEFAULT_FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1';

function normalizeText(value) {
  return String(value || '').trim();
}

function detectIntent(message) {
  const value = normalizeText(message).toLowerCase();
  if (/event|wedding|ticket|invite|qr|check.?in|booking|birthday|conference|chilanga/.test(value)) return 'event_booking';
  if (/website|app|bug|support|issue|error|not working|tech/.test(value)) return 'tech_support';
  if (/automation|workflow|receptionist|dashboard|business|system|whatsapp|email/.test(value)) return 'business_automation';
  return 'general_request';
}

function scoreConfidence(intent, message) {
  const words = normalizeText(message).split(/\s+/).filter(Boolean).length;
  let score = intent === 'general_request' ? 0.54 : 0.76;
  if (words >= 12) score += 0.08;
  if (words >= 25) score += 0.06;
  if (/urgent|today|asap|now|stuck|client waiting/i.test(message)) score -= 0.08;
  return Math.max(0.35, Math.min(0.94, Number(score.toFixed(2))));
}

function needsEscalation(intent, confidence, message) {
  return confidence < 0.68 || /urgent|legal|payment|refund|complaint|angry|sensitive|private|owner/i.test(message);
}

function classifyWithRules(input) {
  const message = normalizeText(input.message);
  const intent = detectIntent(message);
  const confidence = scoreConfidence(intent, message);
  return {
    intent,
    confidence,
    summary: 'Rule-based fallback classification used for local demo safety.',
    provider: 'rules',
    fallbackUsed: true,
  };
}

function clampConfidence(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0.35, Math.min(0.98, Number(parsed.toFixed(2))));
}

function normalizeProviderDecision(rawDecision, fallbackDecision) {
  const intent = VALID_INTENTS.includes(rawDecision.intent) ? rawDecision.intent : fallbackDecision.intent;
  return {
    intent,
    confidence: clampConfidence(rawDecision.confidence, fallbackDecision.confidence),
    summary: normalizeText(rawDecision.summary) || 'Provider classified the request.',
    provider: rawDecision.provider || 'provider',
    fallbackUsed: false,
  };
}

async function callChatCompletions({ baseUrl, apiKey, model, payload }) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You classify small-business customer requests for Hunter Foreman.',
            'Return only JSON with keys: intent, confidence, summary.',
            `Allowed intents: ${VALID_INTENTS.join(', ')}.`,
            'confidence must be a number from 0.35 to 0.98.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Provider returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`);
  }

  const data = await response.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  if (!content) throw new Error('Provider response did not include message content');

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Provider returned non-JSON classification: ${content.slice(0, 160)}`);
  }
}

async function classifyWithProvider(input, options = {}) {
  const fallbackDecision = classifyWithRules(input);
  const provider = normalizeText(options.provider || process.env.AI_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock' || provider === 'rules') return fallbackDecision;
  if (provider !== 'fireworks') {
    return { ...fallbackDecision, fallbackReason: `Unsupported AI_PROVIDER '${provider}'` };
  }

  const apiKey = normalizeText(options.apiKey || process.env.FIREWORKS_API_KEY || process.env.AI_API_KEY);
  if (!apiKey) return { ...fallbackDecision, fallbackReason: 'Missing Fireworks API key' };

  try {
    const rawDecision = await callChatCompletions({
      baseUrl: options.baseUrl || process.env.FIREWORKS_BASE_URL || DEFAULT_FIREWORKS_BASE_URL,
      apiKey,
      model: options.model || process.env.FIREWORKS_MODEL || DEFAULT_FIREWORKS_MODEL,
      payload: {
        customerName: input.customerName,
        channel: input.channel,
        message: input.message,
      },
    });
    return normalizeProviderDecision({ ...rawDecision, provider: 'fireworks' }, fallbackDecision);
  } catch (error) {
    return { ...fallbackDecision, fallbackReason: error.message };
  }
}

function buildTask(input, decision) {
  const customerName = normalizeText(input.customerName) || 'Demo Customer';
  const channel = normalizeText(input.channel) || 'website';
  const message = normalizeText(input.message);
  const intent = decision.intent;
  const confidence = decision.confidence;
  const workflow = WORKFLOWS[intent] || WORKFLOWS.general_request;
  const escalation = needsEscalation(intent, confidence, message);

  return {
    id: `HF-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    customerName,
    channel,
    message,
    intent,
    confidence,
    classifier: {
      provider: decision.provider,
      fallbackUsed: Boolean(decision.fallbackUsed),
      fallbackReason: decision.fallbackReason || null,
      summary: decision.summary,
    },
    workflow,
    status: escalation ? 'needs_human_review' : 'ready_to_assign',
    escalation: escalation
      ? {
          required: true,
          reason: confidence < 0.68 ? 'Low confidence or missing details' : 'Sensitive or urgent request detected',
        }
      : { required: false, reason: 'High enough confidence for normal workflow' },
    notificationPreview: {
      email: `Hi ${customerName}, ROSE received your request and Hunter Foreman routed it to ${workflow.owner}. We will follow up shortly.`,
      whatsapp: `Hi ${customerName}, ROSE received your request. Hunter Foreman routed it to ${workflow.owner}. Status: ${escalation ? 'human review' : 'ready to assign'}.`,
    },
  };
}

function createTask(input) {
  return buildTask(input, classifyWithRules(input));
}

async function createTaskWithProvider(input, options = {}) {
  const decision = await classifyWithProvider(input, options);
  return buildTask(input, decision);
}

module.exports = {
  createTask,
  createTaskWithProvider,
  WORKFLOWS,
  VALID_INTENTS,
  detectIntent,
  scoreConfidence,
  needsEscalation,
  classifyWithRules,
  classifyWithProvider,
};
