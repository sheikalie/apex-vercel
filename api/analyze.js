/**
 * APEX · Anthropic API Proxy
 * Vercel Serverless Function with Edge Runtime + Streaming
 *
 * Uses the Edge runtime which supports streaming responses.
 * First byte arrives in ~1s, so Vercel's CDN never times out.
 * API key stays server-side — never exposed to the browser.
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: { message: 'ANTHROPIC_API_KEY not set. Add it in Vercel → Project Settings → Environment Variables.' }
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON body' } }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  delete body.api_key;

  // Forward to Anthropic
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
    return new Response(JSON.stringify({ error: { message: 'Could not reach Anthropic: ' + err.message } }), {
      status: 502, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  if (!anthropicRes.ok) {
    let errBody = {};
    try { errBody = await anthropicRes.json(); } catch (_) {}
    const msg = errBody?.error?.message ?? 'Anthropic returned HTTP ' + anthropicRes.status;
    return new Response(JSON.stringify({ error: { message: msg } }), {
      status: anthropicRes.status,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  // Stream the response back — first byte arrives in ~1s, CDN stays happy
  return new Response(anthropicRes.body, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': anthropicRes.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
