// controllers/sensorResultController.js
const SensorResult = require('../models/SensorResult');

// POST /api/sensor-result - 데이터 분석 결과 저장
const createSensorResult = async (req, res) => {
  try {
    const { id, temperature, humidity, status, user_status, led_signal, timestamp } = req.body;

    // 필수 필드 검증
    if (!id || temperature === undefined || humidity === undefined || !status || !user_status || !led_signal) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['id', 'temperature', 'humidity', 'status', 'user_status', 'led_signal']
      });
    }

    // 새 분석 결과 데이터 생성
    const sensorResult = new SensorResult({
      id: parseInt(id),
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      status: status,
      user_status: user_status,
      led_signal: led_signal,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    await sensorResult.save();

    res.status(201).json({
      success: true,
      message: 'Sensor analysis result saved',
      data: sensorResult
    });

  } catch (error) {
    console.error('SensorResult creation error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// GET /api/sensor-result - 모든 분석 결과 조회
const getAllSensorResults = async (req, res) => {
  try {
    const sensorResults = await SensorResult.find({}).sort({ createdAt: -1 });
    
    // data 객체 없이 직접 배열 반환
    res.status(200).json(sensorResults);

  } catch (error) {
    console.error('SensorResult retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// GET /api/sensor-result/:id - 특정 기기번호의 분석 결과 조회
const getSensorResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const sensorId = parseInt(id);

    if (isNaN(sensorId)) {
      return res.status(400).json({
        error: 'Invalid sensor ID',
        message: 'Sensor ID must be a number'
      });
    }

    const sensorResult = await SensorResult.findOne({ id: sensorId }).sort({ createdAt: -1 });

    if (!sensorResult) {
      return res.status(404).json({
        error: 'Sensor result not found',
        message: `No analysis result found for ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      ...sensorResult.toObject()
    });

  } catch (error) {
    console.error('SensorResult retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

module.exports = {
  createSensorResult,
  getAllSensorResults,
  getSensorResultById
};
