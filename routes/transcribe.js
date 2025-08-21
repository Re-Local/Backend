const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 📁 업로드 설정
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

/**
 * @openapi
 * /api/transcribe/stt:
 *   post:
 *     summary: "음성 파일을 텍스트로 변환 (STT)"
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
 *         description: 텍스트 반환
 */
router.post('/stt', upload.single('audio'), async (req, res) => {
  console.log('req.file:', req.file);
  console.log('req.body:', req.body);
  
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: '파일이 없습니다.' });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'text',
    });
    res.json({ text: transcription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'STT 실패', detail: err.message });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});


/**
 * @openapi
 * /api/transcribe/tts:
 *   post:
 *     summary: "텍스트 → 음성 변환 (TTS)"
 *     tags: [Transcribe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "안녕하세요"
 *               language:
 *                 type: string
 *                 enum: [ko, en]
 *                 example: "ko"
 *     responses:
 *       200:
 *         description: 생성된 음성 mp3 반환
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/tts', async (req, res) => {
  const { text, language = 'ko' } = req.body;
  if (!text) return res.status(400).json({ error: 'text가 필요합니다.' });

  try {
    const tts = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: language === 'ko' ? 'nova' : 'shimmer',
      input: text,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Disposition', 'inline; filename="tts.mp3"');
    res.send(buffer);
  } catch (err) {
    console.error('TTS Error:', err);
    res.status(500).json({ error: 'TTS 실패', detail: err.message });
  }
});

module.exports = router;
