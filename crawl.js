// crawl_place.js
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const TheaterPlay = require('./models/TheaterPlay');

const BASE = 'https://timeticket.co.kr';

// 타이틀 추출
async function extractTitle(page) {
  const t =
    (await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null)) ||
    (await page.locator('h1, .title, .subject, .product_title').first().textContent().catch(() => ''));
  return (t || '').replace(/\s+/g, ' ').trim();
}

// 라벨("주소","장소") 뒤 텍스트만 추출
async function extractLabeled(page, label) {
  try {
    const t = await page.locator(`li:has-text("${label}")`).first().textContent({ timeout: 800 });
    if (t) return t.replace(new RegExp(`^[\\s·•-]*${label}\\s*[:：]?\\s*`), '').trim();
  } catch {}

  try {
    const dt = page.locator(`dt:has-text("${label}")`).first();
    if (await dt.count()) {
      const dd = dt.locator('xpath=following-sibling::dd[1]');
      const v = await dd.textContent({ timeout: 800 }).catch(() => '');
      if (v) return v.trim();
    }
  } catch {}

  try {
    const value = await page.evaluate((label) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) {
        const s = (walker.currentNode.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (s) texts.push(s);
      }
      const re = new RegExp(`^(?:[·•-]\\s*)?${label}\\s*[:：]?\\s*`, 'i');
      const line = texts.find(s => re.test(s));
      return line ? line.replace(re, '').trim() : '';
    }, label);
    if (value) return value;
  } catch {}

  return '';
}

const toNum = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const clean = (s='') => s.replace(/\s+/g, ' ').trim();
const cleanAddress = (s='') => s.replace(/^\s*주소\s*[:：]?\s*/,'').replace(/\s+/g,' ').trim();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 're_local' });

  // 목록에서 상세 URL 수집
  const listUrl = `${BASE}/list.php?area=114&category=2096`;
  const { data: html } = await axios.get(listUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ko,en;q=0.8'
    },
    timeout: 15000
  });
  const $ = cheerio.load(html);

  // 중복 제거해서 상세 URL 목록 만들기
  const urls = new Set();
  $('a[href^="/product/"]').each((_, a) => {
    const href = $(a).attr('href');
    if (href) urls.add(new URL(href, BASE).href);
  });
  const items = [...urls];
  console.log('상세 URL:', items.length, '개');

  // Playwright
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR'
  });
  const page = await context.newPage();

  for (const detailUrl of items) {
    try {
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 타이틀(선택)
      const titleText = await extractTitle(page);

      // "장소" 탭 클릭(있으면)
      const tab = page.getByRole('tab', { name: '장소' });
      if (await tab.count()) {
        await tab.click().catch(()=>{});
        await page.waitForTimeout(400);
      } else {
        const txt = page.getByText('장소', { exact: true });
        if (await txt.count()) {
          await txt.first().click().catch(()=>{});
          await page.waitForTimeout(400);
        }
      }

      // 장소/주소 파싱
      let venueName = await extractLabeled(page, '장소');
      let address   = await extractLabeled(page, '주소');

      if (!venueName) venueName = await page.locator('.theater, .place, .venue, .hall, .place-name').first().textContent().catch(()=> '') || '';
      if (!address)   address   = await page.locator('.address, .addr, .place-address').first().textContent().catch(()=> '') || '';

      venueName = clean(venueName);
      address   = cleanAddress(address);

      // 좌표
      let lat, lng;
      const dataset = await page.evaluate(() => {
        const el = document.querySelector('#map, .map, [data-lat][data-lng]');
        return el ? { lat: el.dataset.lat, lng: el.dataset.lng } : null;
      });
      if (dataset) {
        lat = toNum(dataset.lat);
        lng = toNum(dataset.lng);
      }
      if (lat === undefined || lng === undefined) {
        const scripts = await page.$$eval('script', arr => arr.map(s => s.textContent || ''));
        const big = scripts.join('\n');
        const m =
          big.match(/(?:LatLng|new\s+kakao\.maps\.LatLng)\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i) ||
          big.match(/lat\s*[:=]\s*([\d.]+)[,\s]+lng\s*[:=]\s*([\d.]+)/i);
        if (m) { lat = toNum(m[1]); lng = toNum(m[2]); }
      }

      // 큰 포스터
      const posterUrl =
        (await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null)) ||
        (await page.locator('.poster img, .product_view img, .gallery img').first().getAttribute('src').catch(() => null));
      const posterAbs = posterUrl ? new URL(posterUrl, BASE).href : undefined;

      // 저장 문서
      const doc = {
        // 제목도 보관하고 싶으면 주석 해제
        title: titleText || undefined,
        detailUrl,
        posterUrl: posterAbs,
        location: {
          name: venueName || undefined,
          address: address || undefined,
          lat,
          lng,
        },
      };

      // detailUrl 기준 upsert
      await TheaterPlay.updateOne(
        { detailUrl },
        { $set: doc },
        { upsert: true }
      );

      console.log('✅', doc.location.name || '(장소 미검출)', '-', doc.location.address || '(주소 미검출)');
      await page.waitForTimeout(300 + Math.random()*400);
    } catch (e) {
      console.warn('❗상세 처리 실패:', detailUrl, e.message);
    }
  }

  await browser.close();
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
});
