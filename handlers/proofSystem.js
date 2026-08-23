const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const Order = require('../models/Order');

/**
 * Gestisce l'invio delle prove del ticket e inoltra al canale `#proofs` / `completed-jobs`
 */
async function runProofsCommand(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Cerca l'ordine associato a questo canale ticket
  const order = await Order.findOne({ channelId: interaction.channel.id }).catch(() => null);

  if (!order) {
    return interaction.editReply({
      content: '❌ No active order record found for this channel. Make sure you are inside an active ticket channel.',
    });
  }

  await interaction.editReply({
    content: '📸 Send the proof image in this channel within **5 minutes**.',
  });

  const filter = (m) => m.author.id === interaction.user.id && m.attachments.size > 0;
  const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 300000 });

  collector.on('collect', async (msg) => {
    const proofUrl = msg.attachments.first().url;
    const proofChannel = interaction.guild.channels.cache.find(
      (c) => c.name === 'proofs' || c.name === config.COMPLETED_JOBS_CHANNEL
    );

    if (!proofChannel) {
      return interaction.followUp({
        content: `❌ Proofs channel (\`${config.COMPLETED_JOBS_CHANNEL}\` or \`proofs\`) was not found in this server.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = baseEmbed({
      title: '✅ ORDER COMPLETED',
      fields: [
        { name: 'Buyer 🙋', value: `<@${order.userId}>`, inline: true },
        { name: 'Order Amount 💲', value: `$${Number(order.price || 0).toFixed(2)}`, inline: true },
        { name: 'Order Type 📦', value: `${order.product || 'Boost'}`, inline: true },
      ],
      image: proofUrl,
      footer: `${config.FOOTER} • ID: ${order._id || interaction.channel.id}`,
    });

    await proofChannel.send({ embeds: [embed] });
    await interaction.followUp({
      content: '✅ Proof image successfully published to the proofs channel!',
      flags: MessageFlags.Ephemeral,
    });
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      interaction.followUp({
        content: '⏰ Proof submission timed out. Please run `/ticket proof` again when ready.',
        flags: MessageFlags.Ephemeral,
      });
    }
  });
}

module.exports = { runProofsCommand };