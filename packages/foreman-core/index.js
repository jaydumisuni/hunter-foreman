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

function createTask(input) {
  const customerName = normalizeText(input.customerName) || 'Demo Customer';
  const channel = normalizeText(input.channel) || 'website';
  const message = normalizeText(input.message);
  const intent = detectIntent(message);
  const confidence = scoreConfidence(intent, message);
  const workflow = WORKFLOWS[intent];
  const escalation = needsEscalation(intent, confidence, message);

  return {
    id: `HF-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    customerName,
    channel,
    message,
    intent,
    confidence,
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

module.exports = { createTask, WORKFLOWS, detectIntent, scoreConfidence, needsEscalation };
