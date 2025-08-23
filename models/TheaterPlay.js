// models/TheaterPlay.js
const mongoose = require('mongoose');

const TheaterPlaySchema = new mongoose.Schema({
  area: String,
  category: String,
  title: String,
  sale: String,
  price: String,
  stars: Number,
  imageUrl: String,    // 기존 썸네일
  detailUrl: String,   // 상세페이지 URL

  // 🎯 장소 관련 크롤링 정보
  venueName: String,   // 공연장 이름
  address: String,     // 공연장 주소
  lat: Number,         // 위도
  lng: Number,         // 경도
  posterUrl: String,   // 큰 포스터 이미지 (meta 태그 기반)

}, { timestamps: true });

module.exports = mongoose.model('TheaterPlay', TheaterPlaySchema, 'theaterplays');
