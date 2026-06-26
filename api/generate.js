const NS = 'torah-generator-natanel';

async function countHit(key) {
  try {
    await fetch(`https://api.counterapi.dev/v1/${NS}/${key}/up`, { method: 'GET' });
  } catch {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Stats endpoint
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
