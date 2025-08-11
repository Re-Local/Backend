const express = require('express');
const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ ok: true, route: 'favorites' });
});

module.exports = router;
