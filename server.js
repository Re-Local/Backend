require('dotenv').config();
console.log('🔑 GROQ_API_KEY set:', !!process.env.GROQ_API_KEY); //

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const usersRouter = require('./routes/users');
const transcribeRouter = require('./routes/transcribe');

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (_, res) => res.json(swaggerSpec));

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/api/users', usersRouter);
app.use('/api/transcribe', transcribeRouter);

mongoose.connect(process.env.MONGODB_URI, { dbName: 're_local' })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
  })
  .catch(err => { console.error(err); process.exit(1); });
