// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

// Routers
const usersRouter = require('./routes/users');
const transcribeRouter = require('./routes/transcribe');
const moviesRouter = require('./routes/movies');
const playRouter = require('./routes/play');
const searchRouter = require('./routes/search');
const imageProxy = require('./routes/imageProxy');
const imageCache = require('./routes/imageCache'); // 쓰는 경우

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ CORS 설정
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend.com'], // 여기에 프론트 주소 넣기
  credentials: true
}));

// Required env
if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}

// 404 등록보다 '항상 위'에 두세요
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerSpec, { explorer: true }));

ㅊ
// ===== Middlewares =====
app.use(cors());


app.use(express.json());
app.use(morgan('dev'));
app.use((req, _res, next) => { req.setTimeout(60_000); next(); });

// ===== Health first (모니터링용) =====
app.get('/health', (_req, res) => res.json({ ok: true }));

// ===== Feature routes (404보다 위) =====
app.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'Referer': 'https://timeticket.co.kr', // 이미지 서버가 기대하는 리퍼러
        'User-Agent': 'Mozilla/5.0 (compatible; MyProxy/1.0)' // 브라우저처럼 보이게 설정
      }
    });
        // 이미지 타입 유지
        res.set('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
      } catch (err) {
        console.error('이미지 요청 에러:', err.message);
        res.status(err.response?.status || 500).send('이미지 요청 실패');
      }
    });

app.use('/image-cache', imageCache); // 선택 사용

app.use('/api/users', usersRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/play', playRouter);
app.use('/api/search', searchRouter);

// ===== Swagger (404보다 위) =====
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// ===== 404 & Error handlers (맨 마지막) =====
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});
app.use((err, _req, res, _next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ===== DB & Server start =====
mongoose.connect(process.env.MONGODB_URI, { dbName: 're_local' })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => { console.error(err); process.exit(1); });

// Debug
console.log('✅ Swagger Paths:');
console.log(Object.keys(swaggerSpec.paths));
