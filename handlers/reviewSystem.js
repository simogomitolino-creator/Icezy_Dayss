const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');

/**
 * Invia l'anteprima della recensione in DM all'utente con il pulsante per confermare
 */
async function sendReviewPreview(user, { rating, comment, price, product }) {
  const stars = '⭐'.repeat(Math.min(Math.max(Number(rating) || 5, 1), 5));

  const reviewEmbed = baseEmbed({
    title: `Vouch from ${user.username}`,
    description: `**${comment}**`,
    fields: [
      { name: 'Vouch Amount 💲', value: `$${price}`, inline: true },
      { name: 'Rating (5/5) 📈', value: stars, inline: true },
    ],
    footer: config.FOOTER,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`submit_vouch_${user.id}_${price}_${rating}`)
      .setLabel('Submit A Vouch')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⭐')
  );

  try {
    await user.send({
      content: 'Your vouch preview is ready! Click the button below to submit it publicly:',
      embeds: [reviewEmbed],
      components: [row],
    });
  } catch (err) {
    console.error('Cannot send DM to user for review submission:', err);
  }
}

/**
 * Gestisce l'invio finale nel canale recensioni quando l'utente clicca "Submit A Vouch"
 */
async function handleVouchSubmit(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }

  const reviewEmbed = interaction.message.embeds[0];
  const reviewChannel = interaction.client.channels.cache.find(
    (c) => c.name === 'customer-vouches' || c.name === 'reviews' || c.name === config.CUSTOMER_VOUCHES_CHANNEL
  );

  if (reviewChannel) {
    await reviewChannel.send({ embeds: [reviewEmbed] });
    await interaction.editReply({
      content: '✅ **Thank you!** Your vouch has been successfully published to the public reviews channel.',
      components: [],
    });
  } else {
    await interaction.editReply({
      content: '❌ Public reviews channel was not found. Please notify the staff.',
      components: [],
    });
  }
}

module.exports = {
  sendReviewPreview,
  handleVouchSubmit,
};