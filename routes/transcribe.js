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
 * /api/transcribe/sts:
 *   get:
 *     summary: "저장된 음성 파일로부터 자동 번역 음성을 생성 (STT → 번역 → TTS)"
 *     tags: [Transcribe]
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: "업로드된 음성 파일 이름입니다. 쿼리 파라미터로 사용하세요 (예: /sts?filename=1692603423.mp3)"

 *     responses:
 *       200:
 *         description: "번역된 음성 mp3 반환"
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/sts', async (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'filename 쿼리 파라미터가 필요합니다.' });
  }

  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }

  try {
    // 1. STT
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'text',
    });
    const originalText = transcription;

    // 2. 언어 감지
    const isKorean = /[가-힣]/.test(originalText);
    const targetLang = isKorean ? 'en' : 'ko';

    // 3. 번역
    const prompt = `다음 문장을 ${targetLang}로 번역해줘:\n"${originalText}"`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    const translatedText = completion.choices[0].message.content;

    // 4. TTS
    const tts = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: targetLang === 'ko' ? 'nova' : 'shimmer',
      input: translatedText,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Disposition', 'inline; filename="translated.mp3"');
    res.send(buffer);
  } catch (err) {
    console.error('STS Error:', err);
    res.status(500).json({ error: 'STS 실패', detail: err.message });
  }
});


/**
 * @openapi
 * /api/transcribe/tt:
 *   post:
 *     summary: "텍스트 번역 (TT)"
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
 *               targetLang:
 *                 type: string
 *                 example: "en"
 *     responses:
 *       200:
 *         description: 번역된 텍스트 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 translated:
 *                   type: string
 *                   example: "Hello"
 */



// 📄 routes/transcribe.js 안에 추가 (또는 분리해서 써도 됨)
router.post('/tt', async (req, res) => {
  const { text, targetLang = 'en' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text는 필수입니다.' });
  }

  try {
    const prompt = `다음 문장을 ${targetLang}로 번역해줘:\n"${text}"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const translated = completion.choices[0].message.content;
    res.json({ translated });
  } catch (err) {
    console.error('TT Error:', err);
    res.status(500).json({ error: 'TT 실패', detail: err.message });
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
