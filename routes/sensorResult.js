// routes/sensorResult.js
const express = require('express');
const router = express.Router();
const {
  createSensorResult,
  getAllSensorResults,
  getSensorResultById
} = require('../controllers/sensorResultController');

/**
 * @openapi
 * /api/sensor-result:
 *   post:
 *     tags: [Sensor]
 *     summary: 데이터분석이 센서 분석 결과를 프론트와 하드웨어에게 보내는 것
 *     description: 데이터 분석 시스템에서 분석 결과를 저장하는 API입니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, temperature, humidity, status, user_status]
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
 *                 description: 센서 상태 (ok)
 *                 example: "ok"
 *               user_status:
 *                 type: string
 *                 description: 사용자 상태
 *                 example: "스트레스 높음"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: 분석 시간
 *                 example: "2025-09-22T10:30:00Z"
 *           examples:
 *             기본:
 *               summary: 센서 분석 결과 예시
 *               value:
 *                 id: 123
 *                 temperature: 26.4
 *                 humidity: 63.2
 *                 status: "ok"
 *                 user_status: "스트레스 높음"
 *                 timestamp: "2025-09-22T10:30:00Z"
 *     responses:
 *       201:
 *         description: 분석 결과 저장 성공
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
 *                   example: "Sensor analysis result saved"
 *                 data:
 *                   $ref: '#/components/schemas/SensorResult'
 *       400:
 *         description: 잘못된 요청 데이터
 *       500:
 *         description: 서버 오류
 */

/**
 * @openapi
 * /api/sensor-result:
 *   get:
 *     tags: [Sensor]
 *     summary: 모든 센서 분석 결과 조회
 *     responses:
 *       200:
 *         description: 분석 결과 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: 분석 결과 개수
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SensorResult'
 *       500:
 *         description: 서버 오류
 */

/**
 * @openapi
 * /api/sensor-result/{id}:
 *   get:
 *     tags: [Sensor]
 *     summary: 특정 기기번호의 센서 분석 결과 조회
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
 *         description: 분석 결과 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SensorResult'
 *       400:
 *         description: 잘못된 센서 ID
 *       404:
 *         description: 분석 결과를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

// POST /api/sensor-result - 센서 분석 결과 저장
router.post('/', createSensorResult);

// GET /api/sensor-result - 모든 센서 분석 결과 조회
router.get('/', getAllSensorResults);

// GET /api/sensor-result/:id - 특정 기기번호의 센서 분석 결과 조회
router.get('/:id', getSensorResultById);

module.exports = router;
