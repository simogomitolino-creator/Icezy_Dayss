const { Schema, model } = require('mongoose');

const ProofSchema = new Schema({
  guildId: String,
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  imageUrl: String,
  postedBy: String,
  anonymous: Boolean,
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Proof', ProofSchema);
