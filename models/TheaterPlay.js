// models/TheaterPlay.js
const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  areaName: String,
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
  detailUrl: String, // ← index: true 제거
  location: LocationSchema,
}, { timestamps: true });

// 여기만 유지(고유 인덱스)
TheaterPlaySchema.index({ detailUrl: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TheaterPlay', TheaterPlaySchema, 'theaterplays');
