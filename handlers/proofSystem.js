const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const { isStaffOrOwner } = require('../utils/permissions');
const Order = require('../models/Order');
const Proof = require('../models/Proof');
const { formatOrderDetails } = require('../utils/orderDetails');
const { emojiForText } = require('../utils/emoji');

const START_BUTTON = {
  ranked: { id: 'start_ranked', label: 'Get Your Rank Upgraded' },
  prestige: { id: 'start_prestige', label: 'Get Your Prestige' },
  matcherino: { id: 'start_matcherino', label: 'Get Your Matcherino' },
  winstreak: { id: 'start_winstreak', label: 'Get Your Longest Winstreak' },
};

// Guess the product from the ticket channel's name (e.g. "ranked-idayss" -> "ranked")
function guessProductFromChannel(channelName) {
  return Object.keys(config.PRODUCT_META).find((p) => channelName.startsWith(p)) || 'ranked';
}

async function runProofsCommand(interaction) {
  if (!isStaffOrOwner(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can post proofs.', ephemeral: true });
  }

  // Look up the real order for this ticket channel. If none is found (e.g. an older ticket,
  // or the DB write failed when the ticket was created), fall back to a minimal order object
  // guessed from the channel name so /ticket proofs NEVER hard-fails.
  let order = await Order.findOne({ channelId: interaction.channel.id }).sort({ createdAt: -1 }).catch(() => null);
  let usingFallback = false;
  if (!order) {
    usingFallback = true;
    order = {
      _id: null,
      product: guessProductFromChannel(interaction.channel.name),
      price: 0,
      paymentMethod: null,
      userId: null,
      details: {},
    };
  }

  await interaction.reply({
    content: `📸 Please send the **proof image** (as an attachment) in this channel within the next 5 minutes. I will pick it up automatically.${usingFallback ? '\n⚠️ No matching order was found in the database for this ticket — I will post using best-guess info based on the channel name. You can fix the amount/buyer manually in the posted message if needed.' : ''}`,
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageCollector({
    filter: (m) => m.author.id === interaction.user.id && m.attachments.size > 0,
    max: 1,
    time: 5 * 60 * 1000,
  });

  collector.on('collect', async (msg) => {
    const attachment = msg.attachments.first();
    const embed = baseEmbed({ title: 'Proof received', description: 'Should the buyer be shown publicly or stay anonymous?' });
    const orderIdPart = order._id ? String(order._id) : 'manual';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`proof_public_${orderIdPart}_${encodeURIComponent(attachment.url)}`).setLabel('Show Buyer Name').setStyle(ButtonStyle.Secondary).setDisabled(!order.userId),
      new ButtonBuilder().setCustomId(`proof_anon_${orderIdPart}_${encodeURIComponent(attachment.url)}`).setLabel('Anonymous 💵').setStyle(ButtonStyle.Secondary),
    );
    await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });
  });

  collector.on('end', (collected) => {
    if (collected.size === 0) {
      interaction.followUp({ content: '⌛ Timed out waiting for a proof image.', ephemeral: true }).catch(() => {});
    }
  });
}

async function postProof(interaction, orderId, imageUrl, anonymous) {
  await interaction.deferUpdate();

  let order = orderId && orderId !== 'manual' ? await Order.findById(orderId).catch(() => null) : null;
  if (!order) {
    order = {
      _id: null,
      product: guessProductFromChannel(interaction.channel.name),
      price: 0,
      paymentMethod: null,
      userId: null,
      details: {},
      save: async () => {},
    };
  }

  const jobsChannel = interaction.guild.channels.cache.find((c) => c.name === config.COMPLETED_JOBS_CHANNEL);
  const meta = config.PRODUCT_META[order.product];
  const payMeta = config.PAYMENT_METHODS.find((p) => p.value === order.paymentMethod);

  const buyerValue = anonymous
    ? `Anonymous 💵${payMeta ? ` ${emojiForText(interaction.guild, payMeta)}` : ''}`
    : `${order.userId ? `<@${order.userId}>` : interaction.user.toString()}${payMeta ? ` ${emojiForText(interaction.guild, payMeta)}` : ''}`;

  const embed = baseEmbed({
    title: `${(meta ? meta.name : order.product).toUpperCase()} ORDER`,
    color: config.COLOR_SUCCESS,
    fields: [
      { name: 'Buyer 🙋', value: buyerValue, inline: false },
      { name: 'Order Amount (USD) 💲', value: `$${(order.price || 0).toFixed(2)}`, inline: false },
      { name: 'Order Type 🚀', value: `${meta ? meta.name : order.product}${order.serviceType === 'carry' ? ' (Carry)' : ''}`, inline: false },
      { name: 'Order Details ℹ️', value: formatOrderDetails(order.product, order.details || {}), inline: false },
    ],
    image: imageUrl,
  });

  const btnMeta = START_BUTTON[order.product];
  const row = btnMeta ? new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(btnMeta.id).setLabel(btnMeta.label).setStyle(ButtonStyle.Primary).setEmoji(meta.emoji),
  ) : null;

  if (jobsChannel) {
    await jobsChannel.send({ embeds: [embed], components: row ? [row] : [] });
  }

  await Proof.create({ guildId: interaction.guild.id, orderId: order._id, imageUrl, postedBy: interaction.user.id, anonymous }).catch(() => {});
  order.status = 'completed';
  await order.save().catch(() => {});

  await interaction.editReply({ content: jobsChannel ? `✅ Posted to ${jobsChannel}!` : `⚠️ Could not find the #${config.COMPLETED_JOBS_CHANNEL} channel — create it or set PROOFS_CHANNEL_NAME in .env to match your channel's name.`, embeds: [], components: [] });
}

module.exports = { runProofsCommand, postProof };
