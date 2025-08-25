// routes/imageProxy.js
const express = require('express');
const { pipeline } = require('stream');
const { promisify } = require('util');
const fetch = global.fetch || ((...a) => import('node-fetch').then(({default:f}) => f(...a)));
const stream = promisify(pipeline);
const router = express.Router();

function spoofHeaders(u) {
  const isTT = /(^|\.)timeticket\.co\.kr$/i.test(u.hostname);
  const origin = isTT ? 'https://timeticket.co.kr/' : `${u.protocol}//${u.hostname}/`;
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Referer': origin,
    'Origin': origin,
  };
}

router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');
  let u; try { u = new URL(url); } catch { return res.status(400).send('Bad url'); }

  try {
    const upstream = await fetch(u.href, { redirect: 'follow', headers: spoofHeaders(u) });
    if (!upstream.ok) return res.status(upstream.status).send(`Upstream ${upstream.status}`);

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    const len = upstream.headers.get('content-length'); if (len) res.setHeader('Content-Length', len);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    await stream(upstream.body, res);
  } catch (e) {
    console.error('image-proxy error:', e);
    res.status(502).send('Bad gateway (proxy failed)');
  }
});

// 디버그용: 실제로 어떤 상태가 오는지 JSON으로 확인
router.get('/debug', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  let u; try { u = new URL(url); } catch { return res.status(400).json({ error: 'Bad url' }); }

  const headers = spoofHeaders(u);
  const r = await fetch(u.href, { method: 'GET', redirect: 'manual', headers });
  res.json({
    fetched: u.href,
    status: r.status,
    usedHeaders: headers,
    upstreamContentType: r.headers.get('content-type'),
  });
});

module.exports = router;
