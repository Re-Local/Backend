const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 're-local API',
      version: '1.0.0',
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER_URL || 'http://localhost:4000',
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ✅ 회원 스키마
        User: {
          type: 'object',
          properties: {
            _id:        { type: 'string' },
            userid:     { type: 'string', description: '로그인 아이디(고유)' },
            name:       { type: 'string' },
            gender:     { type: 'integer', enum: [0, 1], description: '0:남 1:여' },
            country:    { type: 'string' },
            language:   { type: 'string' },
            selectedTags:   { type: 'string' },
            status:     { type: 'string', example: 'active' },
            createdAt:  { type: 'string', format: 'date-time' },
            updatedAt:  { type: 'string', format: 'date-time' },
          },
        },

  
       

        // ✅ 연극 상영용 TheaterPlay
        TheaterPlay: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            theaterName: { type: 'string', example: '대학로 예술극장' },
            title:       { type: 'string', example: '햄릿' },
            date:        { type: 'string', example: '2025-09-15' },
            time:        { type: 'string', example: '19:30' },
            price:       { type: 'number', example: 15000 },
            genre:       { type: 'string', example: '로맨스' },
            lat:         { type: 'number', example: 37.5822 },
            lng:         { type: 'number', example: 127.0023 },
            address:     { type: 'string', example: '서울특별시 종로구 동숭동 1-1' },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },

        // ✅ 하드웨어 센서 데이터 스키마
        Sensor: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            id: { 
              type: 'integer', 
              description: '기기번호',
              example: 123 
            },
            temperature: { 
              type: 'number', 
              description: '온도 (섭씨)',
              example: 26.4 
            },
            humidity: { 
              type: 'number', 
              description: '습도 (%)',
              example: 63.2 
            },
            status: { 
              type: 'string', 
              description: '센서 상태',
              example: 'ok' 
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        // ✅ 센서 분석 결과 스키마
        SensorResult: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            id: { 
              type: 'integer', 
              description: '기기번호',
              example: 123 
            },
            temperature: { 
              type: 'number', 
              description: '온도 (섭씨)',
              example: 26.4 
            },
            humidity: { 
              type: 'number', 
              description: '습도 (%)',
              example: 63.2 
            },
            status: { 
              type: 'string', 
              description: '센서 상태 (ok)',
              example: 'ok' 
            },
            user_status: { 
              type: 'string', 
              description: '사용자 상태',
              example: 'stress' 
            },
            led_signal: { 
              type: 'string', 
              description: 'LED 불빛 신호',
              example: 'yellow' 
            },
            timestamp: { 
              type: 'string', 
              format: 'date-time',
              description: '분석 시간',
              example: '2025-09-22T10:30:00Z'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Users', description: '회원 관련 API' },
      { name: 'Transcribe', description: '번역, 통역 API' },
      { name: "Play", description: '연극 정보 API'},
      { name: 'Sensor', description: '센서 데이터 API' },
    ],
  },
    apis: [path.join(__dirname, '../routes/*.js')],  // Swagger 주석이 포함된 파일 경로
});
