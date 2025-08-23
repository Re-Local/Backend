// routes/play.js
const express = require('express');
const router = express.Router();
const TheaterPlay = require('../models/TheaterPlay');

// 한글 카테고리 → 영어 매핑
const mapCategory = (raw) => {
  if (!raw) return '';
  // "🗂️ 연극 > 로맨틱코미디" → "로맨틱코미디"
  const base = String(raw).split('>').pop().trim();

  if (/(로맨틱코미디|로맨스)/i.test(base)) return 'Romance';
  if (/코미디/i.test(base))               return 'Comedy';
  // '공포/스릴러'는 슬래시 이스케이프 하거나, 둘 중 하나가 들어있으면 매칭
  if (/(공포|스릴러)/i.test(base))        return 'Horror/Thriller';
  if (/드라마/i.test(base))               return 'Drama';
  if (/비극/i.test(base))                 return 'Tragedy';
  if (/뮤지컬/i.test(base))               return 'Musical';
  return base; // 혹시 다른 값이면 원문 접미사 그대로
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
    const rows = await TheaterPlay.find()
      .select('area category title sale price stars')
      .lean();

    const items = rows.map((d) => ({
      ...d,
      category: mapCategory(d.category),
    }));

    res.json({ items });
  } catch (e) { next(e); }
});

module.exports = router;
