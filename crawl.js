require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const TheaterPlay = require('./models/TheaterPlay');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function crawlAndSave() {
  const url = 'https://timeticket.co.kr/list.php?area=114&category=2096r01';
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  const plays = [];

  $('a[href^="/product/"]').each((_, el) => {
    const area = $(el).find('.area').text().trim();
    const category = $(el).find('.category').text().trim();
    const title = $(el).find('.title').text().trim();
    const sale = $(el).find('.sale_percent').text().trim();
    const price = $(el).find('.baro_price').text().trim();
    const starsText = $(el).find('.stars').text().trim();
    const starsMatch = starsText.match(/([\d.]+)/);
    const stars = starsMatch ? parseFloat(starsMatch[1]) : 0;

    plays.push({ area, category, title, sale, price, stars });
  });

  try {
    await TheaterPlay.deleteMany(); // 필요 시 기존 데이터 제거
    await TheaterPlay.insertMany(plays);
    console.log('✅ 연극 데이터 저장 완료:', plays.length, '개');
  } catch (err) {
    console.error('❌ 저장 실패:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

crawlAndSave();
