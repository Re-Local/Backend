// routes/play.js
const express = require('express');
const router = express.Router();
const TheaterPlay = require('../models/TheaterPlay');

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

// 한글 → 영어 카테고리 매핑 (응답에서만 변환)
function mapCategory(raw) {
  if (!raw) return '';
  const base = String(raw).split('>').pop().trim(); // "🗂️ 연극 > 로맨틱코미디" → "로맨틱코미디"
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
 *     description: |
 *       타임티켓에서 크롤링된 연극 데이터를 반환합니다.  
 *       카테고리는 한국어 → 영어 매핑으로 변환되어 제공됩니다.  
 *       위치 정보(`location`)에는 주소와 위도/경도가 포함됩니다.
 *     responses:
 *       200:
 *         description: 성공적으로 연극 목록을 반환합니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   description: 연극 목록
 *                   items:
 *                     type: object
 *                     properties:
 *                       area:
 *                         type: string
 *                         example: "서울"
 *                       category:
 *                         type: string
 *                         example: "Romance"
 *                       title:
 *                         type: string
 *                         example: "로미오와 줄리엣"
 *                       sale:
 *                         type: string
 *                         example: "20% 할인"
 *                       price:
 *                         type: string
 *                         example: "₩20,000"
 *                       stars:
 *                         type: number
 *                         example: 4.7
 *                       imageUrl:
 *                         type: string
 *                         format: uri
 *                         example: "https://example.com/image.jpg"
 *                       posterUrl:
 *                         type: string
 *                         format: uri
 *                         example: "https://example.com/poster.jpg"
 *                       detailUrl:
 *                         type: string
 *                         format: uri
 *                         example: "https://timeticket.co.kr/product/1234"
 *                       location:
 *                         type: object
 *                         properties:
 *                           areaName:
 *                             type: string
 *                             example: "대학로 예술극장"
 *                           address:
 *                             type: string
 *                             example: "서울특별시 종로구 동숭동 1-1"
 *                           lat:
 *                             type: number
 *                             example: 37.5822
 *                           lng:
 *                             type: number
 *                             example: 127.0023
 */

router.get('/', async (req, res, next) => {
  try {
    const rows = await TheaterPlay.find({})
      .select('area category title sale price stars imageUrl posterUrl detailUrl location')
      .lean();

      const items = rows.map((d) => {
        const mappedCategory = mapCategory(d.category);
        const fallback = fallbackCategoryFromTitle(d.title || '');
        return {
          ...d,
          category: mappedCategory || fallback
        };
      });
      

    res.json({ items });
  } catch (e) { next(e); }
});

module.exports = router;
