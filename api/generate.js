const NS = 'torah-generator-natanel';

async function countHit(key) {
  try {
    await fetch(`https://api.counterapi.dev/v1/${NS}/${key}/up`);
  } catch {}
}

const MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
];

async function callAI(body) {
  for (const model of MODELS) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://torah-generator.vercel.app',
        'X-Title': 'Torah Generator'
      },
      body: JSON.stringify({ ...body, model })
    });

    const data = await res.json();
    const errMsg = (data.error?.message || '').toLowerCase();
    console.log(`[${model}] status=${res.status} err="${errMsg.slice(0,80)}"`);

    // Skip to next model on availability/rate errors only
    if (res.status === 429 || res.status === 404 ||
        errMsg.includes('rate limit') || errMsg.includes('no endpoints') ||
        errMsg.includes('decommissioned') || errMsg.includes('unavailable for free') ||
        errMsg.includes('context length')) continue;

    return { status: res.status, data };
  }
  return { status: 429, data: { error: { message: 'כל המודלים הגיעו למגבלה. נסה שוב מאוחר יותר.' } } };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const [v, g] = await Promise.all([
        fetch(`https://api.counterapi.dev/v1/${NS}/visits`).then(r => r.json()),
        fetch(`https://api.counterapi.dev/v1/${NS}/generations`).then(r => r.json()),
      ]);
      return res.json({ visits: v.count ?? 0, generations: g.count ?? 0 });
    } catch {
      return res.json({ visits: 0, generations: 0 });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  try {
    countHit('generations');
    const { status, data } = await callAI(req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
