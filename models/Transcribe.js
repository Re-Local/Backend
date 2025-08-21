const fs = require('fs');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeTranslateTTS(filePath) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API Key가 설정되어 있지 않습니다.');
  }

  // 파일 존재 확인
  if (!fs.existsSync(filePath)) {
    throw new Error('파일이 존재하지 않습니다.');
  }

  // 파일 크기 확인 (25MB 제한)
  const stats = fs.statSync(filePath);
  if (stats.size > 25 * 1024 * 1024) {
    throw new Error('파일 크기가 25MB를 초과합니다.');
  }

  try {
    // 1. STT: 음성 → 텍스트
    const stt = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'text',
      language: 'ko', // 한국어 명시
    });

    // STT 응답은 response_format: 'text'일 때 문자열로 반환됨
    const sourceTextRaw = typeof stt === 'string' ? stt : stt?.text;
    const sourceText = sourceTextRaw ? String(sourceTextRaw).trim() : '';
    console.log('STT Raw Result:', stt);
    console.log('STT Text:', sourceText);
    if (!sourceText) throw new Error('STT 결과가 없습니다.');

    // 2. 언어 감지
    const isKorean = /[가-힣]/.test(sourceText);
    const sourceLang = isKorean ? 'ko' : 'en';
    const targetLang = isKorean ? 'en' : 'ko';

    // 3. 번역
    const gpt = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Translate this text from ${sourceLang} to ${targetLang}. Return only the translated sentence.`,
        },
        { role: 'user', content: sourceText }
      ],
      temperature: 0,
    });

    const translated = gpt.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('GPT 번역 실패');

    // 4. TTS: 번역 → 음성
    const tts = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: translated,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    return { buffer, contentType: 'audio/mpeg' };
  } catch (error) {
    console.error('Transcribe error:', error);
    throw new Error(`처리 중 오류가 발생했습니다: ${error.message}`);
  }
}

async function transcribeToText(filePath) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API Key가 설정되어 있지 않습니다.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('파일이 존재하지 않습니다.');
  }

  const stats = fs.statSync(filePath);
  if (stats.size > 25 * 1024 * 1024) {
    throw new Error('파일 크기가 25MB를 초과합니다.');
  }

  try {
    const stt = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'text',
      language: 'ko',
    });

    const sourceTextRaw = typeof stt === 'string' ? stt : stt?.text;
    const text = sourceTextRaw ? String(sourceTextRaw).trim() : '';
    if (!text) throw new Error('STT 결과가 없습니다.');

    const isKorean = /[가-힣]/.test(text);
    const detectedLang = isKorean ? 'ko' : 'en';

    return { text, detectedLang };
  } catch (error) {
    console.error('Transcribe-only error:', error);
    throw new Error(`STT 처리 중 오류: ${error.message}`);
  }
}

module.exports = { transcribeTranslateTTS, transcribeToText };
