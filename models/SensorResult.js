// models/SensorResult.js
const mongoose = require('mongoose');

// 데이터 분석 결과 스키마
const SensorResultSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    description: '기기번호'
  },
  temperature: {
    type: Number,
    required: true,
    description: '온도 (섭씨)'
  },
  humidity: {
    type: Number,
    required: true,
    description: '습도 (%)'
  },
  status: {
    type: String,
    required: true,
    description: '센서 상태 (ok)'
  },
  user_status: {
    type: String,
    required: true,
    description: '사용자 상태'
  },
  led_signal: {
    type: String,
    required: true,
    description: 'LED 불빛 신호'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    description: '분석 시간'
  }
}, { timestamps: true });

// 기기번호(id)와 시간 조합 인덱스
SensorResultSchema.index({ id: 1, createdAt: -1 });

module.exports = mongoose.model('SensorResult', SensorResultSchema, 'sensor_results');
