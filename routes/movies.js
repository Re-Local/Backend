// routes/movies.js
const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

/**
 * @openapi
 * /api/movies:
 *   post:
 *     tags: [Movies]
 *     summary: 연극 정보 등록
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [theaterName, title, date, time, price, lat, lng, address]
 *             properties:
 *               theaterName: { type: string, example: "홍대 소극장" }
 *               title:       { type: string, example: "로미오와 줄리엣" }
 *               date:        { type: string, example: "2025-09-01" }
 *               time:        { type: string, example: "19:00" }
 *               price:       { type: number, example: 15000 }
 *               lat:         { type: number, example: 37.555 }
 *               lng:         { type: number, example: 126.923 }
 *               address:     { type: string, example: "서울특별시 마포구 어쩌구로 123" }
 *     responses:
 *       201:
 *         description: 연극 등록 성공
 */
router.post('/', async (req, res, next) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json(movie);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/movies:
 *   get:
 *     tags: [Movies]
 *     summary: 모든 연극 정보 조회
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', async (req, res, next) => {
  try {
    const movies = await Movie.find().lean();
    res.json({ items: movies, total: movies.length });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
