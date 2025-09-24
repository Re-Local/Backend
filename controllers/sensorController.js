// controllers/sensorController.js
const Sensor = require('../models/Sensor');

// POST /api/sensor - 하드웨어에서 센서 데이터 전송
const createSensorData = async (req, res) => {
  try {
    const { id, temperature, humidity, status } = req.body;

    // 필수 필드 검증
    if (!id || temperature === undefined || humidity === undefined || !status) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['id', 'temperature', 'humidity', 'status']
      });
    }

    // 새 센서 데이터 생성 (하드웨어 데이터는 항상 새로 저장)
    const sensorData = new Sensor({
      id: parseInt(id),
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      status: status || 'ok'
    });

    await sensorData.save();

    res.status(201).json({
      success: true,
      message: 'Hardware sensor data received',
      data: sensorData
    });

  } catch (error) {
    console.error('Sensor creation error:', error);
    
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

// GET /api/sensor - 모든 센서 데이터 조회
const getAllSensorData = async (req, res) => {
  try {
    const sensors = await Sensor.find({}).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: sensors.length,
      data: sensors
    });

  } catch (error) {
    console.error('Sensor retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// GET /api/sensor/:id - 특정 기기번호의 센서 데이터 조회
const getSensorDataById = async (req, res) => {
  try {
    const { id } = req.params;
    const sensorId = parseInt(id);

    if (isNaN(sensorId)) {
      return res.status(400).json({
        error: 'Invalid sensor ID',
        message: 'Sensor ID must be a number'
      });
    }

    const sensor = await Sensor.findOne({ id: sensorId });

    if (!sensor) {
      return res.status(404).json({
        error: 'Sensor not found',
        message: `No sensor data found for ID: ${id}`
      });
    }

    res.status(200).json({
      success: true,
      data: sensor
    });

  } catch (error) {
    console.error('Sensor retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

module.exports = {
  createSensorData,
  getAllSensorData,
  getSensorDataById
};
