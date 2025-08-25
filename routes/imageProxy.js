const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

const ALLOW = new Set(['timeticket.co.kr','www.timeticket.co.kr']);
const guessType = (p='') => p.toLowerCase().endsWith('.png') ? 'image/png'
  : p.toLowerCase().endsWith('.webp') ? 'image/webp'
  : p.toLowerCase().endsWith('.gif') ? 'image/gif'
  : 'image/jpeg';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchImage(url, referer) {
  return axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    validateStatus: () => true, // 4xx/5xx도 받아서 판단
    headers: {
      'User-Agent': UA,
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'Referer': referer || 'https://timeticket.co.kr/',
      'Origin': 'https://timeticket.co.kr',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    },
  });
}

router.get('/', async (req, res) => {
  const raw = req.query.url;
  const ref = req.query.ref || 'https://timeticket.co.kr/';
  if (!raw) return res.status(400).send('Image URL is required');

  let u;
  try { u = new URL(raw); } catch { return res.status(400).send('Bad URL'); }
  if (!/^https?:$/.test(u.protocol)) return res.status(400).send('Protocol not allowed');
  if (!ALLOW.has(u.hostname)) return res.status(400).send('Host not allowed');

  try {
    // 1) 먼저 주어진 URL로 시도
    let r = await fetchImage(u.href, ref);

    // 2) 404면 ref 페이지에서 og:image를 찾아 재시도 (리스트 썸네일 404 대비)
    if (r.status === 404 && ref) {
      const pr = await axios.get(ref, {
        timeout: 15000,
        headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Referer': 'https://timeticket.co.kr/' },
        validateStatus: () => true,
      });

      if (pr.status >= 200 && pr.status < 300) {
        const $ = cheerio.load(pr.data);
        const og = $('meta[property="og:image"]').attr('content');
        if (og) {
          const fallbackUrl = new URL(og, 'https://timeticket.co.kr').href;
          r = await fetchImage(fallbackUrl, ref);
        }
      }
    }

    if (r.status >= 200 && r.status < 300) {
      const type = r.headers['content-type'] || guessType(u.pathname);
      res.set('Content-Type', type);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(r.data);
    } else {
      console.error('[image-proxy] upstream non-2xx:', r.status, r.statusText, u.href);
      return res.status(502).send(`Upstream ${r.status}`);
    }
  } catch (e) {
    console.error('[image-proxy] error:', e.code || e.message, u && u.href);
    return res.status(500).send(`Image proxy error: ${e.code || e.message}`);
  }
});

module.exports = router;
