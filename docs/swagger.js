// swagger.js
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
            age:        { type: 'integer' },
            interestTags: {
              type: 'array',
              items: { type: 'string' },
              example: ['#festival', '#food'],
            },
            status:     { type: 'string', example: 'active' },
            createdAt:  { type: 'string', format: 'date-time' },
            updatedAt:  { type: 'string', format: 'date-time' },
          },
        },

        // ✅ 기존 영화 검색용 (KOBIS)
        KobisMovie: {
          type: 'object',
          properties: {
            code:      { type: 'string', description: 'KOBIS movieCd' },
            name:      { type: 'string' },
            nameEn:    { type: 'string' },
            openDate:  { type: 'string', description: 'YYYYMMDD' },
            genre:     { type: 'string' },
            directors: { type: 'string', description: '감독명 콤마 구분' },
            nations:   { type: 'string' },
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
            lat:         { type: 'number', example: 37.5822 },
            lng:         { type: 'number', example: 127.0023 },
            address:     { type: 'string', example: '서울특별시 종로구 동숭동 1-1' },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Users', description: '회원 관련 API' },
      { name: 'Movies', description: '영화 검색 (KOBIS)' },
      { name: 'Plays', description: '연극 상영 정보 API' },
      { name: 'Transcribe', description: '번역, 통역 API' },
    ],
  },
  apis: ['./routes/*.js'], // Swagger 주석이 포함된 파일 경로
});
