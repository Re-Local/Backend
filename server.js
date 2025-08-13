// server.js
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}


const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');


app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (_, res) => res.json(swaggerSpec));


// 미들웨어
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ ok: true }));

// ⬇️ 라우터 import
const usersRouter = require('./routes/users');
console.log('usersRouter type:', typeof usersRouter);

//const favoritesRouter = require('./routes/favorites');
//const notificationsRouter = require('./routes/notifications');

// ⬇️ 타입 확인(디버그용) — 첫 실행에 한 번 확인
console.log('usersRouter type:', typeof usersRouter);
// ⬇️ 연결
app.use('/api/users', usersRouter);

const transcribeRouter = require('./routes/transcribe');
console.log('transcribe: ', typeof transcribeRouter);
app.use('/api/transcribe', transcribeRouter);

//app.use('/api/favorites', favoritesRouter);
//app.use('/api/notifications', notificationsRouter);

// DB & 서버 시작
const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGODB_URI, { dbName: 're_local' })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
  })
  .catch(err => { console.error(err); process.exit(1); });
