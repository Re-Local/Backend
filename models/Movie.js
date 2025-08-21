const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const MovieSchema = new mongoose.Schema({
  movie_id:    { type: Number, unique: true },
  title:       { type: String, required: true },
  category:    { type: String, required: true, enum: ['romance', 'comedy', 'horror', 'tragedy', 'thriller', 'musical'] },
  location:    { type: String, required: true },
  start_date:  { type: String, required: true },
  end_date:    { type: String, required: true },
  image:       { type: String, required: true },
  price:       { type: Number, required: true },
  duration:    { type: Number, required: true },
  lat:         { type: Number, required: true },
  lng:         { type: Number, required: true },
}, { timestamps: true });

MovieSchema.plugin(AutoIncrement, { inc_field: 'movie_id' });

module.exports = mongoose.model('Movie', MovieSchema);
