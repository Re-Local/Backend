const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userid: { type: String, unique: true, sparse: true, index: true },
  password: { type: String },
  name: String,
  gender: { type: Number, enum: [0, 1] },
  country: String,
  language: String,
  selectedTags: { type: String }, // 문자열로 저장 (쉼표구분)
  status: { type: String, default: 'active' },
  deletedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
