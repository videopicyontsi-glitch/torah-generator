const NS = 'torah-generator-natanel';

async function countHit(key) {
  try {
    await fetch(`https://api.counterapi.dev/v1/${NS}/${key}/up`);
  } catch {}
}

async function callGroq(body) {
  const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);

  for (const key of keys) {
    let res, data;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ ...body, model: 'llama-3.3-70b-versatile' })
      });
      data = await res.json();
    } catch { continue; }

    // Rate limited — try next key
    if (res.status === 429) continue;

    return { status: res.status, data };
  }

  return { status: 429, data: { error: { message: 'המגבלה היומית הגיעה לסיומה. נסה מחר.' } } };
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
