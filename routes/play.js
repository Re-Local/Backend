// routes/play.js
const express = require('express');
const router = express.Router();
const TheaterPlay = require('../models/TheaterPlay');

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

    const items = rows.map(d => ({
      ...d,
      category: mapCategory(d.category),
    }));

    res.json({ items });
  } catch (e) { next(e); }
});

module.exports = router;
