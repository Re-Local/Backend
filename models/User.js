// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userid: { type: String, unique: true, sparse: true, index: true }, // 로그인 아이디
  passwordHash: { type: String },                                     // 해시 저장
  name: String,
  gender: { type: Number, enum: [0, 1] },                             // 0 남 1 여
  country: String,
  language: String,                                              // 선택
  age: Number,
  interestTags: [{ type: String }],                                   // ['#festival','#food']
  // 기존 필드(email, providers, nickname 등 있으면 그대로 두세요)
  email: { type: String, unique: true, sparse: true },

  nickname: String,
  profileImageUrl: String,
  providers: [{
    provider: String,
    providerUserId: String,
    connectedAt: Date,
  }],
  status: { type: String, default: 'active' },
  deletedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
