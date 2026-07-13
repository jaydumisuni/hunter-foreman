const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/gpt-oss-120b';
const DEFAULT_FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1';

const SYSTEM = `You are ROSE, the warm, attentive events receptionist for THETECHGUY Digital Events.

Your job is to make the client feel heard, reassured and helped. Respond like a capable human event coordinator: acknowledge what they said, answer the latest question directly, give practical guidance, and ask no more than one useful follow-up question when an important detail is missing.

You can help with event type, dates, guest estimates, venue readiness, digital invitations, RSVP and guest registration, guest tickets, QR check-in, approval flows, planning timelines, event packages, media coverage, and the information an events team would need next.

CLIENT-FACING BOUNDARY
Never mention Fireworks, AI providers, models, classifiers, fallbacks, APIs, backend processing, task lifecycles, or technical plumbing. Never sound like a system log or submission guide. The client only needs to know that their request was understood, recorded and can be worked through with you.

Do not claim that this chat sent invitations, WhatsApp messages, payments, tickets, QR codes, POS transactions or client data to another system. Do not promise that “we will” set up, send, generate, process or enable something that is not connected. Explain the recommended workflow and what should be prepared instead.

STYLE
Keep ordinary answers under 170 words. Use warm, natural language and contractions. Prefer short conversational paragraphs. Do not use Markdown headings, bold markers, asterisks, technical labels or architecture language. Give useful help first.`;

const INTERNAL_LANGUAGE = /\b(?:fireworks(?: ai)?|workers ai|cloudflare|deterministic fallback|classifier|provider|backend|api endpoint|language model|model provider|hunter foreman|public demo|task lifecycle)\b/i;
const UNSAFE_ACTION_CLAIMS = /(?:\bwe(?:'|’)?ll\b|\bwe will\b|\bwe can\b)[^.!?]{0,90}\b(?:send|set up|create|generate|enable|process|issue|embed|scan|mark|export)\b|\b(?:has|have|was|were)\s+(?:sent|processed|generated|created|booked)\b|\b(?:live|real-time)\s+dashboard\b|\brunning the THETECHGUY app\b|\binstantly marks\b/i;
const VERIFIED_GUIDANCE_TOPIC = /\b(?:qr|check-?in|invitation|invite|rsvp|pos|point of sale|payment|price|cost|package|quote|approval|timeline|booking window|venue)\b/i;

function clean(value, max = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function limitWords(value, maxWords = 170) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function plainClientText(value, max = 2200) {
  return limitWords(clean(value, max)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim());
}

function mergeDetails(existing, text) {
  const details = { ...(existing && typeof existing === 'object' ? existing : {}) };
  const source = String(text || '');
  const lower = source.toLowerCase();
  const eventNames = ['chilanga mulilo', 'kitchen party', 'birthday', 'wedding', 'conference', 'outing', 'corporate event', 'meeting', 'product launch', 'launch', 'funeral', 'graduation'];
  const event = eventNames.find(name => lower.includes(name));
  if (event) details.eventType = event.replace(/(^|\s)([a-z])/g, (_, gap, letter) => `${gap}${letter.toUpperCase()}`);
  const guests = lower.match(/(?:about|around|roughly|for)?\s*([0-9]{1,4})\s*(?:people|guests|pax|attendees)/);
  if (guests) details.guestCount = guests[1];
  const date = source.match(/(?:\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b|\b(?:today|tomorrow|next week|next month)\b)/i);
  if (date) details.date = date[0];
  if (/venue (?:is )?(?:not confirmed|not decided)|no venue|venue missing|not sure where/i.test(source)) details.venue = 'Not confirmed';
  const services = new Set(String(details.services || '').split(',').map(item => item.trim()).filter(Boolean));
  if (/invitation|invite|rsvp/i.test(source)) services.add('digital invitations');
  if (/qr|check-?in|guest ticket/i.test(source)) services.add('QR check-in');
  if (/photo|video|media coverage/i.test(source)) services.add('media coverage');
  if (/approval flow|approval process/i.test(source)) services.add('approval flow');
  if (/pos|point of sale/i.test(source)) services.add('POS access');
  if (services.size) details.services = [...services].join(', ');
  return details;
}

function deterministicReply(message, details, created) {
  const value = String(message || '').toLowerCase();
  if (/pos|point of sale|mobile|phone|tablet|log in|login/.test(value)) {
    return 'Yes — the THETECHGUY POS system is browser-based, so authorised staff can use it from a supported phone, tablet or computer instead of being tied to one workstation. It isn’t connected to this chat, so I can explain the setup and daily flow, but I can’t open a till or process a sale here.';
  }
  if (/qr|check-?in/.test(value)) {
    const guestCount = clean(details && details.guestCount, 8);
    const opening = guestCount ? `For ${guestCount} guests,` : 'For guest check-in,';
    return `Absolutely. ${opening} give each confirmed guest a unique QR code linked to one approved guest list. At the entrance, staff should scan the code, mark the guest as arrived and flag duplicate use. I’d also prepare a second check-in device, an offline backup list and one person who can handle name changes or codes that won’t scan. I can help you plan that flow here, but this chat doesn’t generate or scan the actual codes. Will there be one entrance or several?`;
  }
  if (/invitation|invite|rsvp/.test(value)) {
    return 'For the invitations, start with one approved guest list and one approved design before anything is released. Each invitation should include the event details, RSVP method and, where needed, a unique guest or ticket reference. It also helps to decide the plus-one rule and final RSVP deadline early. I can help you prepare the wording and structure here, but I can’t send the invitations from this chat. Do you already have the guest list?';
  }
  if (/approval/.test(value)) {
    return 'A smooth approval flow needs one clear decision-maker for the event details, quotation, design, guest list and final release. A practical order is: confirm the details, approve the quotation, approve the design, review the guest list, then approve the final release. That keeps changes from arriving after invitations or tickets are prepared.';
  }
  if (/timeline|when should|how early|booking window/.test(value)) {
    return 'Start with the fixed details: date, venue, guest estimate and the services you need. Invitations and registration should begin only after those are approved. QR check-in needs the final guest data before testing, and a larger event should have time for one full guest-list review plus a check-in rehearsal.';
  }
  if (/venue/.test(value)) {
    return 'For the venue, confirm capacity, access time, power, internet or mobile coverage, entry points, parking and the exact check-in position. Those details affect the invitation wording, staffing and QR setup. It’s okay to keep the venue marked as not confirmed while we organise the rest.';
  }
  if (/payment|price|cost|package|quote/.test(value)) {
    return 'The quote will depend on the event type, guest count, number of invitations, check-in setup, media coverage and any custom design work. I can help you organise everything the quote should include, but I can’t process a payment from this chat. Roughly how many guests are you expecting?';
  }
  if (created) {
    return 'Of course — your request is already saved, and we can keep working through it together here. I can help with the date, guest estimate, venue, invitations, guest registration, QR check-in, approval steps or planning timeline. What would you like to sort out next?';
  }
  return 'Thanks — I’ve got it. I’m organising the request now, and you can stay here with me while we work through the event details together.';
}

function clientSafeReply(value, latest, details, created) {
  const reply = plainClientText(value);
  if (!reply || INTERNAL_LANGUAGE.test(reply) || UNSAFE_ACTION_CLAIMS.test(reply)) {
    return deterministicReply(latest, details, created);
  }
  return reply;
}

async function callFireworks(messages) {
  const apiKey = clean(process.env.FIREWORKS_API_KEY || process.env.AI_API_KEY, 500);
  if (!apiKey) throw new Error('Fireworks is not configured');
  const baseUrl = clean(process.env.FIREWORKS_BASE_URL || DEFAULT_FIREWORKS_BASE_URL, 500).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.FIREWORKS_MODEL || DEFAULT_FIREWORKS_MODEL,
      temperature: 0.42,
      max_tokens: 360,
      messages,
    }),
  });
  if (!response.ok) throw new Error(`Fireworks returned HTTP ${response.status}`);
  const data = await response.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  if (!content) throw new Error('Fireworks response did not include content');
  return content;
}

async function createRoseReply(body = {}) {
  const messages = Array.isArray(body.messages)
    ? body.messages
      .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
      .slice(-12)
      .map(item => ({ role: item.role, content: clean(item.content, 3000) }))
      .filter(item => item.content)
    : [];
  if (!messages.length) throw new Error('A message is required');

  const latest = messages[messages.length - 1].content;
  const created = Boolean(body.created);
  const taskId = clean(body.taskId, 80);
  const details = mergeDetails(body.details, latest);

  if (!created) {
    return {
      ok: true,
      provider: 'rose-guided-intake',
      readyToCreate: true,
      details,
      reply: 'Thanks — I’ve got it. You’d like support with event booking, digital invitations, guest tickets, QR check-in and a clear approval process. I’m getting the request organised now, and you can stay here with me while we work through the details together.',
    };
  }

  let content;
  let provider = 'rose-verified-guidance';
  if (VERIFIED_GUIDANCE_TOPIC.test(latest)) {
    content = deterministicReply(latest, details, created);
  } else {
    try {
      content = await callFireworks([
        { role: 'system', content: SYSTEM },
        { role: 'system', content: `Current event context: ${JSON.stringify({ created, taskId: taskId || null, details })}` },
        ...messages,
      ]);
      provider = 'fireworks';
    } catch {
      content = deterministicReply(latest, details, created);
      provider = 'rose-guided-fallback';
    }
  }

  return {
    ok: true,
    provider,
    model: provider === 'fireworks' ? (process.env.FIREWORKS_MODEL || DEFAULT_FIREWORKS_MODEL) : null,
    readyToCreate: false,
    details,
    reply: clientSafeReply(content, latest, details, created),
  };
}

module.exports = {
  createRoseReply,
  deterministicReply,
  mergeDetails,
  clientSafeReply,
};
