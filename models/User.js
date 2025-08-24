const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userid: {
    type: String, required: true, unique: true, trim: true, lowercase: true
  },
  passwordHash: {
    type: String, required: true, select: false   // 기본 조회에서 숨김
  },
  name: String,
  gender: { type: Number, enum: [0, 1] },
  country: String,
  language: String,
  selectedTags: String,       // 문자열 저장이면 String, 배열이면 [String]
  status: { type: String, default: 'active' },
  deletedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
