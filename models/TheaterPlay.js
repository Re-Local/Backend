const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: String,
  address: String,
  lat: Number,
  lng: Number,
}, { _id: false });

const TheaterPlaySchema = new mongoose.Schema({
  area: String,
  category: String,
  title: String,
  sale: String,
  price: String,
  stars: Number,

  imageUrl: String,
  posterUrl: String,
  detailUrl: { type: String, index: true },

  location: LocationSchema,
}, { timestamps: true });

TheaterPlaySchema.index({ detailUrl: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TheaterPlay', TheaterPlaySchema, 'theaterplays');
