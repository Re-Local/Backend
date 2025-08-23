// crawl_place.js
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const TheaterPlay = require('./models/TheaterPlay');

const BASE = 'https://timeticket.co.kr';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 're_local' });

  // 0) 목록 페이지에서 상세 URL 먼저 수집
  const listUrl = `${BASE}/list.php?area=114&category=2096r01`;
  const { data: html } = await axios.get(listUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ko,en;q=0.8'
    },
    timeout: 15000
  });
  const $ = cheerio.load(html);
  const items = [];
  $('a[href^="/product/"]').each((_, a) => {
    const href = $(a).attr('href');
    if (href) items.push(new URL(href, BASE).href);
  });
  console.log('상세 URL:', items.length, '개');

  // 1) Playwright 시작
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR'
  });
  const page = await context.newPage();

  const results = [];
  for (const detailUrl of items) {
    try {
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // ① 먼저 그대로 텍스트가 있는지(탭 클릭 없이) 시도
      let venueName = await page.locator('.theater, .place, .venue, .hall, .place-name').first().textContent().catch(()=>'');
      let address   = await page.locator('.address, .addr, .place-address').first().textContent().catch(()=>'');
      if ((!venueName || !address)) {
        // ② '장소' 탭 클릭
        const tab = page.locator('text=장소').first();
        if (await tab.count()) {
          await tab.click();
          await page.waitForTimeout(300); // 탭 전환 대기
        }
        // ③ 다시 시도
        venueName = venueName || await page.locator('.theater, .place, .venue, .hall, .place-name').first().textContent().catch(()=> '');
        address   = address   || await page.locator('.address, .addr, .place-address').first().textContent().catch(()=> '');
      }

      // 좌표 추출(데이터 속성 or 스크립트에서 패턴 매칭)
      let lat = null, lng = null;
      const dataset = await page.evaluate(() => {
        const el = document.querySelector('#map, .map, [data-lat][data-lng]');
        return el ? { lat: el.dataset.lat, lng: el.dataset.lng } : null;
      });
      if (dataset) { lat = parseFloat(dataset.lat); lng = parseFloat(dataset.lng); }
      if (lat == null || lng == null) {
        const scripts = await page.$$eval('script', arr => arr.map(s => s.textContent || ''));
        const big = scripts.join('\n');
        let m = big.match(/(?:LatLng|new\s+kakao\.maps\.LatLng)\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i)
              || big.match(/lat\s*[:=]\s*([\d.]+)[,\s]+lng\s*[:=]\s*([\d.]+)/i);
        if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); }
      }

      // 큰 포스터(있으면)
      const posterUrl = await page.locator('meta[property="og:image"]').getAttribute('content').catch(()=>null)
                      || await page.locator('.poster img, .product_view img, .gallery img').first().getAttribute('src').catch(()=>null);
      const posterAbs = posterUrl ? new URL(posterUrl, BASE).href : null;

      results.push({ detailUrl, venueName: trim(venueName), address: trim(address), lat, lng, posterUrl: posterAbs });
      console.log('✅', trim(venueName) || '(장소 미검출)', '-', detailUrl);

      await page.waitForTimeout(600 + Math.random()*600); // 예의상 딜레이
    } catch (e) {
      console.warn('❗상세 처리 실패:', detailUrl, e.message);
    }
  }

  // 2) DB 저장(스키마에 필드 추가 필요)
  for (const r of results) {
    await TheaterPlay.updateOne(
      { detailUrl: r.detailUrl },
      { $set: r },
      { upsert: true }
    );
  }

  await browser.close();
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
});

function trim(s) { return (s || '').replace(/\s+/g,' ').trim(); }
