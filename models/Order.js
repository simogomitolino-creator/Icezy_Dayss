const { Schema, model } = require('mongoose');

const OrderSchema = new Schema({
  guildId: String,
  userId: String,
  username: String,
  channelId: String, // ticket channel id
  product: String,   // ranked | prestige | matcherino | winstreak
  serviceType: String, // boost | carry | null
  details: Schema.Types.Mixed, // free-form fields depending on product
  price: Number,
  paymentMethod: String,
  notes: String,
  status: { type: String, default: 'open' }, // open | paid | assigned | completed | closed
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Order', OrderSchema);
