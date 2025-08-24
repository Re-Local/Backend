require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const TheaterPlay = require('./models/TheaterPlay');

const BASE = 'https://timeticket.co.kr';

// ---------- 공통 유틸 ----------
const abs = (u) => { try { return new URL(u, BASE).href; } catch { return ''; } };
const toNum = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const clean = (s='') => s.replace(/\s+/g, ' ').trim();
const cleanAddress = (s='') => s.replace(/^\s*주소\s*[:：]?\s*/,'').replace(/\s+/g,' ').trim();

// 메타/헤더에서 제목 보강
async function extractTitle(page) {
  const t =
    (await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null)) ||
    (await page.locator('h1, .title, .subject, .product_title').first().textContent().catch(() => ''));
  return (t || '').replace(/\s+/g, ' ').trim();
}

// 라벨형(장소/주소/장르 등)
async function extractLabeled(page, label) {
  try {
    const t = await page.locator(`li:has-text("${label}")`).first().textContent({ timeout: 800 });
    if (t) return t.replace(new RegExp(`^[\\s·•-]*${label}\\s*[:：]?\\s*`), '').trim();
  } catch {}

  try {
    const dt = page.locator(`dt:has-text("${label}")`).first();
    if (await dt.count()) {
      const dd = dt.locator('xpath=following-sibling::dd[1]');
      const v = await dd.textContent({ timeout: 800 }).catch(()=> '');
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

// "뮤지컬 > 코미디" / "연극 > 로맨틱코미디"에서 '>' 오른쪽만
function extractRightSideCategory(txt='') {
  const s = String(txt)
    .replace(/[／⁄∕]/g,'/')
    .replace(/[＞›»〉]/g,'>')
    .replace(/[·•・⋅]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  const m = s.match(/(?:뮤지컬|연극)\s*>\s*([가-힣A-Za-z/\s,&-]+)/);
  return m ? m[1].trim() : '';
}

// 동의어 정규화(원하면 그대로 반환해도 OK)
function normalizeCategoryKR(raw='') {
  const t = raw.toLowerCase();
  if (/(로맨틱\s*코미디|로코|romantic\s*comedy)/.test(t)) return '로맨틱코미디';
  if (/(코미디|희극|comedy)/.test(t)) return '코미디';
  if (/((공포|호러|horror)[\s/,&-]*스릴러|스릴러[\s/,&-]*(공포|호러|horror)|thriller)/.test(t)) return '공포/스릴러';
  if (/(로맨스|멜로|romance)/.test(t)) return '로맨스';
  if (/(드라마|drama)/.test(t)) return '드라마';
  return raw || '';
}

// ---------- 실행 ----------
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 're_local' });

  // 1) 리스트 페이지에서 title / category / posterUrl / detailUrl 수집
  const listUrl = `${BASE}/list.php?&category=2096`;
  const { data: html } = await axios.get(listUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
    },
    timeout: 15000
  });

  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();
  const preMap = Object.create(null);        // detailUrl -> { title, category, posterUrl }

  $('a[href^="/product/"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;

    const link = abs(href);
    if (!link || seen.has(link)) return;
    seen.add(link);
    items.push(link);

    const $card = $(a).closest('li, .item, .list-item, .product, .prod, .thumb, .card, .column, .col, .goods, .list, .list_box');

    // title
    const title =
      ($card.find('.title, .tit, .subject, .name, .product_title').first().text().trim() ||
       $card.find('img[alt]').attr('alt') || ''
      ).replace(/\s+/g,' ').trim();

    // posterUrl
    const img = $card.find('img').first();
    const rawSrc = img.attr('data-src') || img.attr('data-original') || img.attr('src') || '';
    const posterUrl = rawSrc ? abs(rawSrc) : undefined;

    // category: "뮤지컬 > … / 연극 > …" 오른쪽
    let pathText = $card.find('.category, .cate, .genre, .product-category, .info, .desc, .meta, .sub')
                        .first().text().trim();
    if (!pathText) pathText = $card.text().trim();
    const right = extractRightSideCategory(pathText);
    const catK  = normalizeCategoryKR(right) || normalizeCategoryKR(pathText);

    preMap[link] = { title, category: catK || '', posterUrl };
  });

  console.log('상세 URL:', items.length, '개');

  // 2) 상세 페이지에서 address / areaName 수집 (카테고리는 탭 전환 전에 확정)
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR'
  });
  const page = await context.newPage();

  for (const detailUrl of items) {
    try {
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 1) title: 리스트 우선, 없으면 상세 메타로 보강
      const seed = preMap[detailUrl] || {};
      let titleText = seed.title || await extractTitle(page);

      // 2) category: 반드시 '장소' 탭 열기 전에
      let detailCat =
        (await extractLabeled(page, '장르')) ||
        (await page.locator('.category, .cate, .genre, .product-category, .badge, .tag')
                   .first().textContent().catch(() => '')) || '';
      detailCat = extractRightSideCategory(detailCat) || detailCat;
      const categoryK = seed.category || normalizeCategoryKR(detailCat) || '';

      // 3) posterUrl: 리스트 우선, 없으면 상세에서 보강
      const posterFromDetail =
        (await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null)) ||
        (await page.locator('.poster img, .product_view img, .gallery img').first().getAttribute('src').catch(() => null));
      const posterAbs = seed.posterUrl || (posterFromDetail ? abs(posterFromDetail) : undefined);

      // '장소' 탭 열기
      const tab = page.getByRole('tab', { name: '장소' });
      if (await tab.count()) { await tab.click().catch(()=>{}); await page.waitForTimeout(400); }
      else {
        const txt = page.getByText('장소', { exact: true });
        if (await txt.count()) { await txt.first().click().catch(()=>{}); await page.waitForTimeout(400); }
      }

      // 5~6) 장소/주소
      let areaName = await extractLabeled(page, '장소');
      if (!areaName) areaName = await extractLabeled(page, '공연장');
      let address = await extractLabeled(page, '주소');

      if (!areaName) areaName = await page.locator('.theater, .place, .venue, .hall, .place-name')
                                          .first().textContent().catch(()=> '') || '';
      if (!address) address = await page.locator('.address, .addr, .place-address')
                                        .first().textContent().catch(()=> '') || '';

      areaName = clean(areaName);
      address  = cleanAddress(address);

      // 좌표
      let lat, lng;
      const dataset = await page.evaluate(() => {
        const el = document.querySelector('#map, .map, [data-lat][data-lng]');
        return el ? { lat: el.dataset.lat, lng: el.dataset.lng } : null;
      });
      if (dataset) { lat = toNum(dataset.lat); lng = toNum(dataset.lng); }
      if (lat === undefined || lng === undefined) {
        const scripts = await page.$$eval('script', arr => arr.map(s => s.textContent || ''));
        const big = scripts.join('\n');
        const m =
          big.match(/(?:LatLng|new\s+kakao\.maps\.LatLng)\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i) ||
          big.match(/lat\s*[:=]\s*([\d.]+)[,\s]+lng\s*[:=]\s*([\d.]+)/i);
        if (m) { lat = toNum(m[1]); lng = toNum(m[2]); }
      }

      // 저장
      const $set = {
        detailUrl,
        title: titleText || undefined,     // 1
        category: categoryK || undefined,  // 2
        posterUrl: posterAbs || undefined, // 3
        location: {                        // 5~6
          areaName: areaName || undefined,
          address:  address  || undefined,
          lat, lng
        }
      };

      await TheaterPlay.updateOne({ detailUrl }, { $set }, { upsert: true });

      console.log('✅', `[${categoryK || '카테고리?'}]`, titleText, '|', areaName || '(장소?)', '|', address || '(주소?)');
      await page.waitForTimeout(250 + Math.random()*350);
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
