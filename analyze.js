/**
 * APEX · Anthropic API Proxy
 * Vercel Serverless Function — Node.js runtime
 * maxDuration = 60 extends timeout to 60s (Pro plan)
 */

export const maxDuration = 60;

export default async function handler(req, res) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    Object.entries(cors).forEach(([k,v]) => res.setHeader(k,v));
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    Object.entries(cors).forEach(([k,v]) => res.setHeader(k,v));
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  Object.entries(cors).forEach(([k,v]) => res.setHeader(k,v));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'ANTHROPIC_API_KEY not set. Go to Vercel project Settings → Environment Variables.' }
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: { message: 'Invalid JSON body' } });
  }
  delete body.api_key;

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return res.status(502).json({ error: { message: 'Could not reach Anthropic: ' + err.message } });
  }

  if (!anthropicRes.ok) {
    let errBody = {};
    try { errBody = await anthropicRes.json(); } catch (_) {}
    const msg = errBody?.error?.message ?? 'Anthropic returned HTTP ' + anthropicRes.status;
    return res.status(anthropicRes.status).json({ error: { message: msg } });
  }

  const data = await anthropicRes.json();
  return res.status(200).json(data);
}
