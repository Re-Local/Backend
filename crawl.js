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
function extractRightSideCategory(txt = '') {
  const s = String(txt)
    .replace(/[／⁄∕]/g, '/')          // 슬래시 통일
    .replace(/[＞›»〉]/g, '>')         // 부등호 통일
    .replace(/[·•・⋅]/g, ' ')          // 불필요한 점 제거
    .replace(/[^\w가-힣\s>/]/g, '')     // 🎭 등 이모지 제거
    .replace(/\s+/g, ' ')              // 공백 정리
    .trim();

  const m = s.match(/(?:뮤지컬|연극)\s*>\s*([가-힣A-Za-z/\s,&-]+)/);
  return m ? m[1].trim() : '';
}

function extractPureTitle(title = '') {
  const m = title.match(/\[[^\]]+\](.+?)\s*-\s*타임티켓/);
  return m ? m[1].trim() : title;
}


function fallbackCategoryFromTitle(title = '') {
  const t = title.replace(/\s+/g, '').toLowerCase();

  const matches = [
    { list: ['한뼘사이','뷰티플라이프','사내연애','핫식스','ps파트너','운빨','옥탑방','비누향기','사빠디','연애','오류404','남사친','여사친','사춘기','웨딩브레이커','시작하는여자','끝내주는남자','김종욱찾기','쇼머스트고온','왓이프','써니펜'], category: 'Romance' },
    { list: ['죽여주는','과속스캔들','라면','2호선','목소리','오백에삼십','보물찾기','딜리버리','늘근도둑','고도를기다리며를','라이어','행오버','끝까지','졸탄','코미디','택시안에서','드립소년단','영시기','스탠드업','게스트하우스','행쇼','뱀프','헌터','해피오','프리즌'], category: 'Comedy' },
    { list: ['고도를기다리며','베이컨','브릴리언트','서울의별','햄릿','사막의별','세컨드','불편한편의점','맥주한잔','문턱','시간을파는','내일은','아모르파티','타임','슈펀맨','체호프','이공칠','썸데이','스웨그','조선','르마스크','낙원','트레드밀','더크리처','다시','동물원','민들레','연남동','어서오세요','휴남동','시간을넘어서'], category: 'Drama' },
    { list: ['오마이갓','쉬어매드니스','자취','701호','조각','괴담','두여자','스위치','기억의숲','크리미널','앙리에트','흉터','멈춰진','위험한','실종사건'], category: 'Horror/Thriller' },
  ];

  for (const group of matches) {
    if (group.list.some(keyword => t.includes(keyword.replace(/\s+/g, '').toLowerCase()))) {
      return group.category;
    }
  }

  return 'Others';
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
  

  const seen = new Set();
  const preMap = Object.create(null);        // detailUrl -> { title, category, posterUrl }
  const items = []; // 이 선언 빠짐

  
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
      titleText = extractPureTitle(titleText);


      // 2) category: 반드시 '장소' 탭 열기 전에
      let detailCat =
        (await extractLabeled(page, '장르')) ||
        (await page.locator('.category, .cate, .genre, .product-category, .badge, .tag')
                   .first().textContent().catch(() => '')) || '';
      detailCat = extractRightSideCategory(detailCat) || detailCat;
      const categoryK =
  seed.category ||
  normalizeCategoryKR(detailCat) ||
  fallbackCategoryFromTitle(titleText) || '';


      // 3) posterUrl: 리스트 우선, 없으면 상세에서 보강
      const posterFromDetail =
        (await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null)) ||
        (await page.locator('.poster img, .product_view img, .gallery img').first().getAttribute('src').catch(() => null));
      // ✅ 안정적인 og:image 우선, 없을 때만 리스트 썸네일
const posterAbs = (posterFromDetail ? abs(posterFromDetail) : undefined) || seed.posterUrl;


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
      
      

      // 저장
      const $set = {
        detailUrl,
        title: titleText || undefined,     // 1
        category: categoryK || undefined,  // 2
        posterUrl: posterAbs || undefined, // 3
        location: {                        // 5~6
          areaName: areaName || undefined,
          address:  address  || undefined,
         
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
