// models/Transcribe.js
const fs = require('fs');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeTranslateTTS(filePath) {
  // 1. 음성 → 텍스트
  const stt = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'gpt-4o-transcribe',
    response_format: 'text',
  });
  const sourceText = stt.text?.trim();
  if (!sourceText) throw new Error('STT 결과가 없습니다.');

  // 2. 언어 감지 및 번역 언어 결정
  const isKorean = /[가-힣]/.test(sourceText);
  const sourceLang = isKorean ? 'ko' : 'en';
  const targetLang = isKorean ? 'en' : 'ko';

  // 3. 번역
  const gpt = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Translate this text from ${sourceLang} to ${targetLang}. Return only the translated sentence.`,
      },
      { role: 'user', content: sourceText }
    ],
  });
  const translated = gpt.choices?.[0]?.message?.content?.trim() || sourceText;

  // 4. TTS
  const tts = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: targetLang === 'ko' ? 'nova' : 'shimmer',
    input: translated,
    response_format: 'mp3',
  });
  const buffer = Buffer.from(await tts.arrayBuffer());

  return { buffer, contentType: 'audio/mpeg' };
}

module.exports = { transcribeTranslateTTS };
