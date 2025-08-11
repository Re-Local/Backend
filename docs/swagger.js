// docs/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 're-local API', version: '1.0.0' },
    // swagger 상단의 서버 주소 (ngrok/Render 쓰면 env로 바꿔도 좋음)
    servers: [{ url: process.env.SWAGGER_SERVER_URL || 'http://localhost:4000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } // 선택
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
            nationality:{ type: 'string' },
            age:        { type: 'integer' },
            interestTags:{
              type: 'array',
              items: { type: 'string' },
              example: ['#festival', '#food']
            },
            status:     { type: 'string', example: 'active' },
            createdAt:  { type: 'string', format: 'date-time' },
            updatedAt:  { type: 'string', format: 'date-time' },
          }
        }
      }
    },
    tags: [{ name: 'Users', description: '회원 관련 API' }]
  },
  // 라우트의 @openapi 주석 읽을 위치
  apis: ['./routes/*.js'],
});
