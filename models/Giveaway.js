const { Schema, model } = require('mongoose');

const GiveawaySchema = new Schema({
  guildId: String,
  channelId: String,
  messageId: String,
  prize: String,
  winnersCount: Number,
  hostedBy: String,
  participants: { type: [String], default: [] },
  endsAt: Date,
  ended: { type: Boolean, default: false },
  winners: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Giveaway', GiveawaySchema);
