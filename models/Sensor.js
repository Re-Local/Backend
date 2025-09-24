// models/Sensor.js
const mongoose = require('mongoose');

// 하드웨어에서 보내는 센서 데이터 스키마
const SensorSchema = new mongoose.Schema({
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
    default: 'ok',
    description: '센서 상태'
  }
}, { timestamps: true });

// 기기번호(id)와 시간 조합 인덱스 (unique 제거하여 같은 id로 여러 데이터 저장 가능)
SensorSchema.index({ id: 1, createdAt: -1 });

module.exports = mongoose.model('Sensor', SensorSchema, 'sensor_data');
