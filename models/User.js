const { Schema, model } = require('mongoose');
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: String,
}, { timestamps: true });

module.exports = model('User', UserSchema);
