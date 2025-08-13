// routes/transcribe.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

// 업로드 디렉토리 보장
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// multer: 원본 확장자 보존
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// Groq SDK 클라이언트
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * @swagger
 * /api/transcribe/stt:
 *   post:
 *     summary: 오디오 파일을 업로드하여 텍스트로 변환 (STT)
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
 *                 description: 업로드할 음성 파일 (mp3, wav, m4a 등)
 *     responses:
 *       200:
 *         description: 변환된 텍스트
 *       400:
 *         description: 잘못된 요청 (파일/포맷/키 누락)
 *       500:
 *         description: 서버 오류
 */
router.post('/stt', upload.single('audio'), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: 'audio 파일이 필요합니다.' });
  if (!process.env.GROQ_API_KEY) return res.status(400).json({ error: 'GROQ_API_KEY가 설정되지 않았습니다.' });

  // (선택) 확장자 가드
  const allowed = ['.flac','.mp3','.mp4','.mpeg','.mpga','.m4a','.ogg','.opus','.wav','.webm'];
  const ext = (path.extname(req.file.originalname) || '').toLowerCase();
  if (!allowed.includes(ext)) {
    try { fs.unlinkSync(filePath); } catch {}
    return res.status(400).json({ error: `지원되지 않는 형식입니다: ${ext}` });
  }

  try {
    // ⬇️ 핵심: SDK에는 "그냥 ReadStream"만 넘긴다
    const result = await groq.audio.transcriptions.create({
      model: 'whisper-large-v3-turbo',
      file: fs.createReadStream(filePath),
      // language: 'ko',          // 필요 시 힌트
      // response_format: 'json', // 필요 시 지정
    });

    try { fs.unlinkSync(filePath); } catch {}
    return res.json(result); // result.text 포함
  } catch (err) {
    console.error('STT Error:', err?.response?.data || err?.message || err);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    return res.status(500).json({
      error: 'STT 실패',
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

module.exports = router;
