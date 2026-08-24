const { Schema, model } = require('mongoose');

const ProofSchema = new Schema({
  guildId: String,
  orderId: Schema.Types.Mixed,
  imageUrl: String,
  postedBy: String,
  anonymous: Boolean,
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Proof', ProofSchema);
