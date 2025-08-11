const express = require('express');
const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ ok: true, route: 'notifications' });
});

module.exports = router;
