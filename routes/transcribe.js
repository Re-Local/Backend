// routes/transcribe.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { transcribeTranslateTTS } = require('../models/Transcribe');

// 업로드 폴더 설정
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

/**
 * @swagger
 * /api/transcribe/auto:
 *   post:
 *     summary: "음성 자동 변환 (STT → 번역 → TTS)"
 *     tags: [Transcribe]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 번역된 음성 (mp3)
 */
router.post('/auto', upload.single('audio'), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: 'audio 파일이 필요합니다.' });

  try {
    const { buffer, contentType } = await transcribeTranslateTTS(filePath);
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', 'inline; filename="result.mp3"');
    res.send(buffer);
  } catch (err) {
    console.error('Auto Error:', err);
    res.status(500).json({ error: '처리 실패', detail: String(err) });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

module.exports = router;
