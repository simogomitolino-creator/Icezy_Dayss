cconst { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const { isStaffOrOwner } = require('../utils/permissions');
const Order = require('../models/Order');
const Proof = require('../models/Proof');

// customId -> which button to attach on the completed-jobs post
const START_BUTTON = {
  ranked: { id: 'start_ranked', label: 'Get Your Rank Upgraded' },
  prestige: { id: 'start_prestige', label: 'Get Your Prestige' },
  matcherino: { id: 'start_matcherino', label: 'Get Your Matcherino' },
  winstreak: { id: 'start_winstreak', label: 'Get Your Longest Winstreak' },
};

async function runProofsCommand(interaction) {
  // 1. Differisci SUBITO la risposta per bloccare il timeout di 3 secondi
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!isStaffOrOwner(interaction.member)) {
    return interaction.editReply({ content: '❌ Only staff can post proofs.' });
  }

  const order = await Order.findOne({ channelId: interaction.channel.id }).sort({ createdAt: -1 }).catch(() => null);
  if (!order) {
    return interaction.editReply({ content: '❌ No order found for this ticket channel.' });
  }

  // 2. Usa editReply al posto di reply
  await interaction.editReply({
    content: '📸 Please send the **proof image** (as an attachment) in this channel within the next 5 minutes. I will pick it up automatically.',
  });

  const collector = interaction.channel.createMessageCollector({
    filter: (m) => m.author.id === interaction.user.id && m.attachments.size > 0,
    max: 1,
    time: 5 * 60 * 1000,
  });

  collector.on('collect', async (msg) => {
    const attachment = msg.attachments.first();
    const embed = baseEmbed({ title: 'Proof received', description: 'Should the buyer be shown publicly or stay anonymous?' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`proof_public_${order._id}_${encodeURIComponent(attachment.url)}`).setLabel('Show Buyer Name').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`proof_anon_${order._id}_${encodeURIComponent(attachment.url)}`).setLabel('Anonymous 💵').setStyle(ButtonStyle.Secondary),
    );
    await interaction.followUp({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  });

  collector.on('end', (collected) => {
    if (collected.size === 0) {
      interaction.followUp({ content: '⌛ Timed out waiting for a proof image.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  });
}

async function postProof(interaction, orderId, imageUrl, anonymous) {
  const order = await Order.findById(orderId).catch(() => null);
  if (!order) return interaction.update({ content: '❌ Order not found.', components: [] });

  const jobsChannel = interaction.guild.channels.cache.find((c) => c.name === config.COMPLETED_JOBS_CHANNEL);
  const meta = config.PRODUCT_META[order.product];

  const embed = baseEmbed({
    title: '✅ ORDER COMPLETED',
    color: config.COLOR_SUCCESS,
    fields: [
      { name: 'Buyer 🙋', value: anonymous ? 'Anonymous 💵' : `<@${order.userId}>`, inline: true },
      { name: 'Order Amount 💲', value: `$${order.price.toFixed(2)}`, inline: true },
      { name: 'Order Type 📦', value: meta ? meta.name : order.product, inline: true },
      { name: 'Order Details ℹ️', value: JSON.stringify(order.details || {}).slice(0, 500) || 'N/A' },
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

  await interaction.update({ content: `✅ Posted to ${jobsChannel ? jobsChannel.toString() : '#' + config.COMPLETED_JOBS_CHANNEL}!`, embeds: [], components: [] });
}

module.exports = { runProofsCommand, postProof };
