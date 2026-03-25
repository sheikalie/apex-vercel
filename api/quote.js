/**
 * APEX · Live Quote Fetcher
 * Uses Finnhub API — reliable, free tier, 60 calls/min
 * Get your free key at finnhub.io (no credit card)
 * Add FINNHUB_API_KEY to Vercel → Project Settings → Environment Variables
 */

export const maxDuration = 10;

export default async function handler(req, res) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    Object.entries(cors).forEach(([k,v]) => res.setHeader(k,v));
    return res.status(204).end();
  }

  Object.entries(cors).forEach(([k,v]) => res.setHeader(k,v));

  const symbol = (req.query.ticker || '').toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: 'Missing ticker' });

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      error: 'FINNHUB_API_KEY not set. Get a free key at finnhub.io and add it to Vercel environment variables.'
    });
  }

  try {
    // Fetch quote and company profile in parallel
    const [quoteRes, profileRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`)
    ]);

    const [quote, profile] = await Promise.all([
      quoteRes.json(),
      profileRes.json()
    ]);

    // Finnhub returns c=0 when ticker not found
    if (!quote.c || quote.c === 0) {
      return res.status(200).json({ error: `No data found for ${symbol}. Check the ticker is a valid US stock symbol.` });
    }

    const change    = quote.c - quote.pc;
    const changePct = quote.pc ? ((change / quote.pc) * 100) : 0;

    return res.status(200).json({
      ticker:     symbol,
      name:       profile.name || symbol,
      price:      quote.c.toFixed(2),
      change:     change.toFixed(2),
      changePct:  changePct.toFixed(2),
      open:       quote.o?.toFixed(2),
      high:       quote.h?.toFixed(2),
      low:        quote.l?.toFixed(2),
      prevClose:  quote.pc?.toFixed(2),
      week52High: profile.weekHigh || null,
      week52Low:  profile.weekLow  || null,
      marketCap:  profile.marketCapitalization ? formatCap(profile.marketCapitalization * 1e6) : null,
      pe:         null, // available in basic financials endpoint
      exchange:   profile.exchange || null,
      industry:   profile.finnhubIndustry || null,
      timestamp:  new Date().toISOString(),
    });

  } catch (err) {
    return res.status(200).json({ error: 'Quote fetch failed: ' + err.message });
  }
}

function formatCap(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2)  + 'M';
  return '$' + n.toLocaleString();
}
