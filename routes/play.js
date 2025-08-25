// routes/play.js
const express = require('express');
const router = express.Router();
const TheaterPlay = require('../models/TheaterPlay');

// 문자열 안전 정제: "[연극] 옥탑방 고양이 - 타임티켓" → "옥탑방 고양이"
function extractPureTitle(raw = '') {
  if (typeof raw !== 'string') return '';
  // 제로폭공백 제거 등 사소한 숨김문자 제거
  const title = raw.replace(/\u200B/g, '');
  // 패턴 매치 ([- 타임티켓] 부분이 없어도 동작)
  const m = title.match(/\[[^\]]*]\s*([^[-]+(?:-[^-]+?)?)\s*(?:-\s*타임티켓)?$/);
  if (m) return m[1].trim();
  // 일반적인 케이스: 앞 대괄호 태그와 뒤 " - 타임티켓" 제거
  return title
    .replace(/^\[[^\]]*]\s*/, '')
    .replace(/\s*-\s*타임티켓\s*$/, '')
    .trim();
}

function fallbackCategoryFromTitle(title = '') {
  const t = (typeof title === 'string' ? title : '').replace(/\s+/g, '').toLowerCase();
  const matches = [
    { list: ['한뼘사이','뷰티플라이프','사내연애','핫식스','ps파트너','운빨','옥탑방','비누향기','사빠디','연애','오류404','남사친','여사친','사춘기','웨딩브레이커','시작하는여자','끝내주는남자','김종욱찾기','쇼머스트고온','왓이프','써니펜'], category: 'Romance' },
    { list: ['죽여주는','과속스캔들','라면','2호선','목소리','오백에삼십','보물찾기','딜리버리','늘근도둑','고도를기다리며를','라이어','행오버','끝까지','졸탄','코미디','택시안에서','드립소년단','영시기','스탠드업','게스트하우스','행쇼','뱀프','헌터','해피오','프리즌'], category: 'Comedy' },
    { list: ['고도를기다리며','베이컨','브릴리언트','서울의별','햄릿','사막의별','세컨드','불편한편의점','맥주한잔','문턱','시간을파는','내일은','아모르파티','타임','슈펀맨','체호프','이공칠','썸데이','스웨그','조선','르마스크','낙원','트레드밀','더크리처','다시','동물원','민들레','연남동','어서오세요','휴남동','시간을넘어서'], category: 'Drama' },
    { list: ['오마이갓','쉬어매드니스','자취','701호','조각','괴담','두여자','스위치','기억의숲','크리미널','앙리에트','흉터','멈춰진','위험한','실종사건'], category: 'Horror/Thriller' },
  ];
  for (const g of matches) {
    if (g.list.some(k => t.includes(k.replace(/\s+/g,'').toLowerCase()))) return g.category;
  }
  return 'Others';
}

function mapCategory(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const base = raw.split('>').pop().trim();
  if (/(로맨틱코미디|로맨스)/i.test(base)) return 'Romance';
  if (/코미디/i.test(base))               return 'Comedy';
  if (/(공포|스릴러)/i.test(base))        return 'Horror/Thriller';
  if (/드라마/i.test(base))               return 'Drama';
  if (/비극/i.test(base))                 return 'Tragedy';
  if (/뮤지컬/i.test(base))               return 'Musical';
  return base;
}

/**
 * @openapi
 * /api/play:
 *   get:
 *     tags: [Play]
 *     summary: 연극 목록 조회 (카테고리는 영어로 변환되어 제공됨)
 *     responses:
 *       200:
 *         description: 성공
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await TheaterPlay.find({})
      .select('area category title sale price stars imageUrl posterUrl detailUrl location')
      .lean();

    const items = (rows || []).map((d) => {
      const rawTitle = typeof d?.title === 'string' ? d.title : '';
      const mapped   = mapCategory(d?.category || '');
      const fallback = fallbackCategoryFromTitle(rawTitle);
      return {
        ...d,
        title: extractPureTitle(rawTitle),
        category: mapped || fallback
      };
    });

    res.json({ items });
  } catch (e) {
    console.error('/api/play error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
