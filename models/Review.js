const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema({
  guildId: String,
  userId: String,
  product: String,
  comment: String,
  rating: Number,
  orderAmount: String,
  anonymous: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Review', ReviewSchema);
