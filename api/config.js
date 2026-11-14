// /api/config — يخبر الواجهة إذا كان الخادم يملك مفتاحاً
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    hasServerKey: Boolean(process.env.OPENROUTER_API_KEY),
    mode: process.env.OPENROUTER_API_KEY ? 'proxy' : 'direct',
  });
}
