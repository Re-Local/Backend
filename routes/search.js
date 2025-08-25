const express = require('express');
const TheaterPlay = require('../models/TheaterPlay');
const router = express.Router();

// 특수문자 이스케이프
const esc = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    if (!q) return res.json({ items: [] });

    // 부분일치(대소문자 무시)
    const rx = new RegExp(esc(q), 'i');

    const items = await TheaterPlay.find({
      $or: [
        { title: rx },
        { category: rx },
        { 'location.areaName': rx },
        { 'location.address': rx },
      ],
    })
    .select('title category posterUrl detailUrl location')
    .limit(limit)
    .lean();

    res.json({ items });
  } catch (e) { next(e); }
});

module.exports = router;
