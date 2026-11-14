// /api/chat — بروكسي متدفّق إلى OpenRouter
// المفتاح يُقرأ من OPENROUTER_API_KEY على Vercel، أو من ترويسة x-openrouter-key.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const headerKey = req.headers['x-openrouter-key'];
  const key = (typeof headerKey === 'string' && headerKey.trim()) || process.env.OPENROUTER_API_KEY || '';

  if (!key) {
    return res.status(501).json({ error: 'no_key', detail: 'Set OPENROUTER_API_KEY or use direct mode.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad_json' }); }
  }
  if (!body || !body.model || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: 'bad_request', detail: 'model and messages are required' });
  }

  const payload = {
    model: body.model,
    messages: body.messages,
    stream: true,
    temperature: typeof body.temperature === 'number' ? body.temperature : 1.0,
    top_p: typeof body.top_p === 'number' ? body.top_p : 1.0,
  };
  if (typeof body.max_tokens === 'number') payload.max_tokens = body.max_tokens;
  if (body.reasoning && typeof body.reasoning === 'object') payload.reasoning = body.reasoning;

  let upstream;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin || 'https://amq.local',
        'X-Title': 'AMQ',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return res.status(502).json({ error: 'upstream_unreachable', detail: String(err?.message || err) });
  }

  if (!upstream.ok) {
    let detail = '';
    try { detail = (await upstream.text()).slice(0, 1200); } catch {}
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(upstream.status).send(JSON.stringify({ error: 'upstream', detail }));
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch {
    /* العميل قطع الاتصال */
  } finally {
    res.end();
  }
}
