// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const usersRouter = require('./routes/users');
const transcribeRouter = require('./routes/transcribe');
const moviesRouter = require('./routes/movies');


const app = express();
const PORT = process.env.PORT || 4000;

// 디버그용: 개발환경에서만 키 노출 여부 출력
if (process.env.NODE_ENV !== 'production') {
  console.log('🔑 GROQ_API_KEY set:', !!process.env.GROQ_API_KEY);
}

// 필수 환경변수 체크
if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}

// 미들웨어
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json()); // 필요시 조절
app.use(morgan('dev'));

// (선택) 요청 타임아웃
app.use((req, res, next) => {
  req.setTimeout(60_000); // 60s
  next();
});

// Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (_, res) => res.json(swaggerSpec));

// 헬스체크
app.get('/health', (_, res) => res.json({ ok: true }));

// 라우트
app.use('/api/users', usersRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/movies', moviesRouter);


// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// 에러 핸들러
app.use((err, req, res, _next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// DB & 서버 시작
mongoose.connect(process.env.MONGODB_URI, { dbName: 're_local' })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
  })
  .catch(err => { console.error(err); process.exit(1); });
