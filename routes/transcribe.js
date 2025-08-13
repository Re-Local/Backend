// routes/transcribe.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const axios = require('axios');

/* ───────────────────────── 공용 준비 ───────────────────────── */
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ALLOWED_EXT = ['.flac','.mp3','.mp4','.mpeg','.mpga','.m4a','.ogg','.opus','.wav','.webm'];
const isKorean = (t='') => /[가-힣]/.test(t);

/* (선택) AWS Translate fallback 지원 */
let awsTranslate = null;
try {
  const AWS = require('aws-sdk');
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-northeast-2',
  });
  awsTranslate = new AWS.Translate();
} catch { /* 패키지 없으면 무시 */ }

/* (선택) Google TTS(ko용) — 없으면 영어만 TTS */
let gtts = null;
try {
  const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
  gtts = new TextToSpeechClient();
} catch { /* 패키지 없으면 무시 */ }

/* ───────────────────────── STT ───────────────────────── */
/**
 * @swagger
 * /api/transcribe/stt:
 *   post:
 *     summary: 오디오 → 텍스트 (Groq Whisper)
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
 *       200: { description: OK }
 */
router.post('/stt', upload.single('audio'), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: 'audio 파일이 필요합니다.' });
  if (!process.env.GROQ_API_KEY) return res.status(400).json({ error: 'GROQ_API_KEY가 설정되지 않았습니다.' });

  const ext = (path.extname(req.file.originalname) || '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    try { fs.unlinkSync(filePath); } catch {}
    return res.status(400).json({ error: `지원되지 않는 형식입니다: ${ext}` });
  }

  try {
    const result = await groq.audio.transcriptions.create({
      model: 'whisper-large-v3-turbo',
      file: fs.createReadStream(filePath),
    });
    try { fs.unlinkSync(filePath); } catch {}
    return res.json(result); // { text: "...", ... }
  } catch (err) {
    console.error('STT Error:', err?.response?.data || err?.message || err);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    return res.status(500).json({
      error: 'STT 실패',
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

/* ───────────────────────── TT(번역) ───────────────────────── */
/**
 * @swagger
 * /api/transcribe/tt:
 *   post:
 *     summary: 텍스트 번역 (Groq Llama, AWS fallback)
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
 *               source: { type: string, example: "ko" }
 *               target: { type: string, example: "en" }
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
              ` to ${target}. Return only the translated sentence.`,
          },
          { role: 'user', content: text },
        ],
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    let out = r.data?.choices?.[0]?.message?.content?.trim() || '';
    out = out.replace(/^["“”']+|["“”']+$/g, '');
    if (!out && awsTranslate) {
      const aws = await awsTranslate.translateText({
        Text: text, SourceLanguageCode: source || 'auto', TargetLanguageCode: target,
      }).promise();
      return res.json({ text: aws.TranslatedText });
    }
    return res.json({ text: out || text });
  } catch (err) {
    console.error('TT Error:', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: '번역 실패', detail: err?.response?.data || err?.message || String(err) });
  }
});

/* ───────────────────────── TTS ───────────────────────── */
/**
 * @swagger
 * /api/transcribe/tts:
 *   post:
 *     summary: 텍스트 → 음성 (Groq PlayAI TTS: 영어/아랍어 자동 스위칭)
 *     tags: [Transcribe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:   { type: string, example: "مرحباً بكم في حي الجامعة!" }
 *               // model을 직접 지정 가능 (playai-tts | playai-tts-arabic)
 *               model:  { type: string, example: "playai-tts-arabic" }
 *               // 보이스 이름 (모델별 상이)
 *               voice:  { type: string, example: "Amira-PlayAI" }
 *               format: { type: string, enum: [mp3, wav], example: "mp3" }
 *     responses:
 *       200:
 *         description: 오디오 스트림
 *         content:
 *           audio/mpeg: { schema: { type: string, format: binary } }
 *           audio/wav:  { schema: { type: string, format: binary } }
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, model, voice, format = 'mp3' } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text is required' });

    // 1) 간단 언어 감지 (아랍어 유니코드 블록)
    const hasArabic = /[\u0600-\u06FF]/.test(text);

    // 2) 사용할 모델 결정 (우선순위: 클라이언트 지정 > 자동)
    const chosenModel = model || (hasArabic ? 'playai-tts-arabic' : 'playai-tts');

    // 3) 기본 보이스 (모델별 권장 기본값)
    // playai-tts (영어): Groq 문서에 19개 보이스 존재. 예: Arista-PlayAI, Quinn-PlayAI 등
    // playai-tts-arabic: Ahmad-PlayAI, Amira-PlayAI, Khalid-PlayAI, Nasser-PlayAI
    const defaultVoice =
      chosenModel === 'playai-tts-arabic'
        ? 'Amira-PlayAI'
        : 'Arista-PlayAI';

    const voiceName = voice || defaultVoice;
    const wantsWav = format === 'wav';

    // 4) Groq PlayAI TTS 호출
    const audioResp = await groq.audio.speech.create({
      model: chosenModel,                 // 'playai-tts' | 'playai-tts-arabic'
      voice: voiceName,                   // 모델에 맞는 보이스여야 함
      input: text,
      response_format: wantsWav ? 'wav' : 'mp3',
    });

    // 5) 응답 전송
    const buf = Buffer.from(await audioResp.arrayBuffer());
    res.set('Content-Type', wantsWav ? 'audio/wav' : 'audio/mpeg');
    res.set('Content-Disposition', `inline; filename="speech.${wantsWav ? 'wav' : 'mp3'}"`);
    return res.send(buf);

  } catch (err) {
    // 약관 미동의시 안내
    const detail = err?.response?.data || err?.message || String(err);
    if (typeof detail === 'string' && detail.includes('model_terms_required')) {
      return res.status(400).json({
        error: 'TTS 실패',
        detail: '해당 TTS 모델 약관 동의 필요. 콘솔에서 한 번만 동의하세요.',
        howTo: 'https://console.groq.com/playground?model=playai-tts 또는 playai-tts-arabic',
      });
    }
    console.error('TTS Error:', detail);
    return res.status(500).json({ error: 'TTS 실패', detail });
  }
});


module.exports = router;
