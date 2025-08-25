// 📁 routes/imageProxy.js
const express = require('express');
const fetch = require('node-fetch'); // 또는 axios
const router = express.Router();

router.get('/', async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send('Image URL is required');
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(500).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();

    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.error('프록시 에러:', err);
    res.status(500).send('Image proxy error');
  }
});

module.exports = router;
