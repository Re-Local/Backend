// models/Movie.js
const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  theaterName: { type: String, required: true },
  title:       { type: String, required: true },
  date:        { type: String, required: true }, // ISO 형식 또는 yyyy-mm-dd
  time:        { type: String, required: true }, // HH:MM
  price:       { type: Number, required: true },
  lat:         { type: Number, required: true },
  lng:         { type: Number, required: true },
  address:     { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Movie', MovieSchema);
