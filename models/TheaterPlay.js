const mongoose = require('mongoose');

const playSchema = new mongoose.Schema({
  area: String,
  category: String,
  title: String,
  sale: String,
  price: String,
  stars: Number,
});

module.exports = mongoose.model('TheaterPlay', playSchema);
