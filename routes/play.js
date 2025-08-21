// routes/play.js
const express = require('express');
const router = express.Router();
const TheaterPlay = require('../models/TheaterPlay');

/**
 * @openapi
 * /api/play:
 *   get:
 *     tags: [Play]
 *     summary: 연극 목록 전체 조회
 *     responses:
 *       200:
 *         description: 연극 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       area:     { type: string, example: "대학로" }
 *                       category: { type: string, example: "🗂️ 연극 > 코미디" }
 *                       title:    { type: string, example: "고도를 기다리며" }
 *                       sale:     { type: string, example: "30%" }
 *                       price:    { type: string, example: "14,000원" }
 *                       stars:    { type: number, example: 4.8 }
 */
router.get('/', async (req, res, next) => {
  try {
    const items = await TheaterPlay.find().lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
