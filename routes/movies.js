const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

/**
 * @openapi
 * /api/movies:
 *   post:
 *     tags: [Movies]
 *     summary: 연극/뮤지컬 등록
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - location
 *               - start_date
 *               - end_date
 *               - image
 *               - price
 *               - duration
 *               - lat
 *               - lng
 *             properties:
 *               title:       { type: string, example: "헤드윅" }
 *               category:    { type: string, enum: ["romance", "comedy", "horror", "tragedy", "thriller", "musical"], example: "musical" }
 *               location:    { type: string, example: "서울시 마포구 와이산로 355" }
 *               start_date:  { type: string, example: "2025-08-10" }
 *               end_date:    { type: string, example: "2025-08-25" }
 *               image:       { type: string, example: "/images/musical.jpg" }
 *               price:       { type: number, example: 20000 }
 *               duration:    { type: number, example: 200 }
 *               lat:         { type: number, example: 37.555 }
 *               lng:         { type: number, example: 126.923 }
 *     responses:
 *       201:
 *         description: 공연 등록 성공
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
 *     summary: 공연 목록 조회
 *     responses:
 *       200:
 *         description: OK
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
 *                       movie_id:    { type: number, example: 1 }
 *                       title:       { type: string, example: "헤드윅" }
 *                       category:    { type: string, example: "musical" }
 *                       location:    { type: string, example: "서울시 마포구 와이산로 355" }
 *                       start_date:  { type: string, example: "2025-08-10" }
 *                       end_date:    { type: string, example: "2025-08-25" }
 *                       image:       { type: string, example: "/images/musical.jpg" }
 *                       price:       { type: number, example: 20000 }
 *                       duration:    { type: number, example: 200 }
 *                       lat:         { type: number, example: 37.555 }
 *                       lng:         { type: number, example: 126.923 }
 *                       createdAt:   { type: string, format: 'date-time' }
 *                       updatedAt:   { type: string, format: 'date-time' }
 *                 total: { type: integer, example: 1 }
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
