const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const upload = multer({ dest: 'uploads/' });

router.post('/stt', upload.single('audio'), async (req, res) => {
  const filePath = req.file.path;

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-large-v3-turbo'); // 또는 whisper-large-v3

    const response = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );

    fs.unlinkSync(filePath); // 업로드된 파일 삭제

    res.json(response.data);
  } catch (error) {
    console.error('STT Error:', error.response?.data || error.message);
    fs.unlinkSync(filePath);
    res.status(500).json({ error: 'STT 실패' });
  }
});

/**
 * @swagger
 * /api/transcribe/stt:
 *   post:
 *     summary: 오디오 파일을 업로드하여 텍스트로 변환 (STT)
 *     tags: [STT]
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
 *                 description: 업로드할 음성 파일 (mp3, wav 등)
 *     responses:
 *       200:
 *         description: 변환된 텍스트
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *       500:
 *         description: 서버 오류
 */
router.post('/stt', upload.single('audio'), async (req, res) => {
  // ...기존 STT 로직 유지
});


module.exports = router;
