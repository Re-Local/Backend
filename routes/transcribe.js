// routes/transcribe.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const axios = require('axios');

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

/**
 * @swagger
 * /api/transcribe/tt:
 *   post:
 *     summary: 텍스트 번역 (Groq LLM)
 *     tags: [Transcribe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, target]
 *             properties:
 *               text:   { type: string, example: "안녕 만나서 반가워" }
 *               source: { type: string, example: "ko", description: "원문 언어 (선택)" }
 *               target: { type: string, example: "en", description: "목표 언어" }
 *     responses:
 *       200: { description: OK }
 */
router.post('/tt', async (req, res) => {
  const { text, source, target } = req.body || {};
  if (!text || !target) return res.status(400).json({ error: 'text, target은 필수입니다.' });

  try {
    const r = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              `You are a professional translator. Translate the user's text` +
              (source ? ` from ${source}` : '') +
              ` to ${target}. Preserve meaning and tone. Return only the translated sentence.`,
          },
          { role: 'user', content: text },
        ],
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );

    const out = r.data?.choices?.[0]?.message?.content?.trim() || '';
    return res.json({ text: out });
  } catch (err) {
    console.error('Translate Error:', err.response?.data || err.message);
    return res.status(500).json({ error: '번역 실패', detail: err.response?.data || err.message });
  }
});
const detectLang = (t='') => (/[가-힣]/.test(t) ? 'ko' : 'en');

/**
 * @swagger
 * /api/tts/auto:
 *   post:
 *     summary: 텍스트를 언어에 맞춰 자동 TTS (en=Groq, ko=Google)
 *     tags: [Transcribe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:   { type: string, example: "혜화에 오신 걸 환영합니다!" }
 *               voice:  { type: string, example: "Aria-PlayAI", description: "영어일 때만 적용 (Groq 보이스)" }
 *               format: { type: string, enum: [mp3,wav], example: "mp3" }
 *     responses:
 *       200:
 *         description: 오디오 스트림
 *         content:
 *           audio/mpeg: { schema: { type: string, format: binary } }
 *           audio/wav:  { schema: { type: string, format: binary } }
 */
router.post('/auto', async (req, res) => {
  try {
    const { text, voice = 'Aria-PlayAI', format = 'mp3' } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text is required' });

    const lang = detectLang(text);

    if (lang === 'en') {
      // ▶︎ 영어: Groq PlayAI TTS
      const audioResp = await groq.audio.speech.create({
        model: 'playai-tts',
        voice,
        input: text,
        response_format: format === 'wav' ? 'wav' : 'mp3',
      });
      const buf = Buffer.from(await audioResp.arrayBuffer());
      if (format === 'wav') {
        res.set('Content-Type', 'audio/wav');
        res.set('Content-Disposition', 'inline; filename="speech.wav"');
      } else {
        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Disposition', 'inline; filename="speech.mp3"');
      }
      return res.send(buf);
    } else {
      // ▶︎ 한국어: Google Cloud TTS
      const [resp] = await gtts.synthesizeSpeech({
        input: { text },
        voice: { languageCode: 'ko-KR', ssmlGender: 'NEUTRAL' }, // 원하면 'ko-KR-Standard-A' 등 보이스 지정
        audioConfig: { audioEncoding: format === 'wav' ? 'LINEAR16' : 'MP3' },
      });
      const buf = Buffer.from(resp.audioContent, 'base64');
      if (format === 'wav') {
        res.set('Content-Type', 'audio/wav');
        res.set('Content-Disposition', 'inline; filename="speech.wav"');
      } else {
        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Disposition', 'inline; filename="speech.mp3"');
      }
      return res.send(buf);
    }
  } catch (err) {
    console.error('TTS Auto Error:', err?.response?.data || err?.message || err);
    res.status(500).json({ error: 'TTS 실패', detail: err?.response?.data || err?.message || String(err) });
  }
});

module.exports = router;