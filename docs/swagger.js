const swaggerJsdoc = require('swagger-jsdoc');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 're-local API', version: '1.0.0' },
    servers: [
      { url: process.env.SWAGGER_SERVER_URL || 'http://localhost:4000' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
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
              example: ['#festival', '#food']
            },
            status:     { type: 'string', example: 'active' },
            createdAt:  { type: 'string', format: 'date-time' },
            updatedAt:  { type: 'string', format: 'date-time' },
          }
        },
        Movie: { // ✅ Movie 스키마는 여기 안에
          type: 'object',
          properties: {
            code:      { type: 'string', description: 'KOBIS movieCd' },
            name:      { type: 'string' },
            nameEn:    { type: 'string' },
            openDate:  { type: 'string', description: 'YYYYMMDD' },
            genre:     { type: 'string' },
            directors: { type: 'string', description: '감독명 콤마 구분' },
            nations:   { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Users', description: '회원 관련 API' },
      { name: 'Movies', description: '영화 검색 API' },
      { name: 'Transcribe', description: '번역, 통역 API'},
    ]
  },
  apis: ['./routes/*.js'],
});
