const express = require('express');
const router = express.Router();
const TheaterPlay = require('../models/TheaterPlay');

// 한글 카테고리 → 영어 매핑
const mapCategory = (raw) => {
  if (!raw) return '';
  const base = String(raw).split('>').pop().trim(); // "🗂️ 연극 > 로맨틱코미디" → "로맨틱코미디"
  if (/(로맨틱코미디|로맨스)/i.test(base)) return 'Romance';
  if (/코미디/i.test(base))               return 'Comedy';
  if (/(공포|스릴러)/i.test(base))        return 'Horror/Thriller';
  if (/드라마/i.test(base))               return 'Drama';
  if (/비극/i.test(base))                 return 'Tragedy';
  if (/뮤지컬/i.test(base))               return 'Musical';
  return base;
};

/**
 * @openapi
 * /api/play:
 *   get:
 *     tags: [Play]
 *     summary: 기본 연극 데이터 조회 (카테고리를 영어로 변환해 반환)
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await TheaterPlay.find({}, null, { sort: { createdAt: -1 } })
      .select('area category title sale price stars location posterUrl detailUrl')
      .lean();

    const items = rows.map(({ _id, area, category, title, sale, price, stars, location, posterUrl, detailUrl }) => ({
      _id, area, title, sale, price, stars, posterUrl, detailUrl,
      category: mapCategory(category),
      location: location || null,
    }));

    res.json({ items });
  } catch (e) { next(e); }
});

module.exports = router;
