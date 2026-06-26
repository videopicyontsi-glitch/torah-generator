const NS = 'torah-generator-natanel';

async function countHit(key) {
  try {
    await fetch(`https://api.counterapi.dev/v1/${NS}/${key}/up`);
  } catch {}
}

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'gemma2-9b-it',
  'llama-3.1-8b-instant',
];

async function callGroq(body) {
  for (const model of MODELS) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({ ...body, model })
    });

    const data = await res.json();

    // Rate limited — try next model
    if (res.status === 429 || data.error?.code === 'rate_limit_exceeded') continue;

    return { status: res.status, data };
  }
  return { status: 429, data: { error: { message: 'כל המודלים הגיעו למגבלה. נסה שוב מחר.' } } };
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
    const { status, data } = await callGroq(req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
