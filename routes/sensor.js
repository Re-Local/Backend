// routes/sensor.js
const express = require('express');
const router = express.Router();
const {
  createSensorData,
  getAllSensorData,
  getSensorDataById
} = require('../controllers/sensorController');

/**
 * @openapi
 * /api/sensor:
 *   post:
 *     tags: [Sensor]
 *     summary: 하드웨어 센서 데이터 전송 (하드웨어가 데이터분석에게 보내는 API)
 *     description: 하드웨어가 센서 데이터를 데이터분석 시스템으로 전송하는 API입니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, temperature, humidity, status]
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 기기번호
 *                 example: 123
 *               temperature:
 *                 type: number
 *                 description: 온도 (섭씨)
 *                 example: 26.4
 *               humidity:
 *                 type: number
 *                 description: 습도 (%)
 *                 example: 63.2
 *               status:
 *                 type: string
 *                 description: 센서 상태
 *                 example: "ok"
 *           examples:
 *             기본:
 *               summary: 하드웨어 센서 데이터 예시
 *               value:
 *                 id: 123
 *                 temperature: 26.4
 *                 humidity: 63.2
 *                 status: "ok"
 *     responses:
 *       201:
 *         description: 하드웨어 센서 데이터 수신 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Hardware sensor data received"
 *                 data:
 *                   $ref: '#/components/schemas/Sensor'
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields"
 *       500:
 *         description: 서버 오류
 */

/**
 * @openapi
 * /api/sensor:
 *   get:
 *     tags: [Sensor]
 *     summary: 모든 센서 데이터 조회
 *     responses:
 *       200:
 *         description: 센서 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sensor'
 *       500:
 *         description: 서버 오류
 */

/**
 * @openapi
 * /api/sensor/{id}:
 *   get:
 *     tags: [Sensor]
 *     summary: 특정 기기번호의 센서 데이터 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 기기번호
 *         example: 123
 *     responses:
 *       200:
 *         description: 센서 데이터 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 _id:
 *                   type: string
 *                 id:
 *                   type: integer
 *                   example: 123
 *                 temperature:
 *                   type: number
 *                   example: 26.4
 *                 humidity:
 *                   type: number
 *                   example: 63.2
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 잘못된 센서 ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid sensor ID"
 *       404:
 *         description: 센서 데이터를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Sensor not found"
 *       500:
 *         description: 서버 오류
 */

// POST /api/sensor - 하드웨어 센서 데이터 전송
router.post('/', createSensorData);

// GET /api/sensor - 모든 센서 데이터 조회
router.get('/', getAllSensorData);

// GET /api/sensor/:id - 특정 기기번호의 센서 데이터 조회
router.get('/:id', getSensorDataById);

module.exports = router;
