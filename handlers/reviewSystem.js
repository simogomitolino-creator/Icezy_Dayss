const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const { isStaffOrOwner } = require('../utils/permissions');
const Review = require('../models/Review');

const START_BUTTON = {
  ranked: { id: 'start_ranked', label: 'Get Your Rank Upgraded' },
  prestige: { id: 'start_prestige', label: 'Get Your Prestige' },
  matcherino: { id: 'start_matcherino', label: 'Get Your Matcherino' },
  winstreak: { id: 'start_winstreak', label: 'Get Your Longest Winstreak' },
};

async function runReviewCommand(interaction) {
  if (!isStaffOrOwner(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can request reviews.', ephemeral: true });
  }
  const user = interaction.options.getUser('user');
  const product = interaction.options.getString('product');

  const embed = baseEmbed({
    title: '⭐ Leave a Review',
    description: `Thanks for your order! We'd love to hear your feedback about our **${config.PRODUCT_META[product]?.name || product}** service.`,
    color: config.COLOR_PRIMARY,
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rv_star_prompt_${interaction.guild.id}_${product}`).setLabel('Leave a Review').setStyle(ButtonStyle.Primary).setEmoji('⭐'),
  );

  try {
    await user.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Review request sent to ${user}.`, ephemeral: true });
  } catch (e) {
    await interaction.reply({ content: `❌ Could not DM ${user} (their DMs may be closed).`, ephemeral: true });
  }
}

async function handleStarPrompt(interaction, guildId, product) {
  const embed = baseEmbed({ title: '⭐ Rate Your Experience', description: 'Select a star rating below:' });
  const row = new ActionRowBuilder().addComponents(
    [1, 2, 3, 4, 5].map((n) => new ButtonBuilder().setCustomId(`rv_star_${n}_${guildId}_${product}`).setLabel(`${n}⭐`).setStyle(ButtonStyle.Secondary)),
  );
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleStarPicked(interaction, rating, guildId, product) {
  const modal = new ModalBuilder().setCustomId(`rv_modal_${rating}_${guildId}_${product}`).setTitle('New Customer Vouch');
  const comment = new TextInputBuilder().setCustomId('comment').setLabel('Your comment').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300);
  const amount = new TextInputBuilder().setCustomId('amount').setLabel('Order Amount (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('e.g. $32.99');
  modal.addComponents(new ActionRowBuilder().addComponents(comment), new ActionRowBuilder().addComponents(amount));
  await interaction.showModal(modal);
}

async function handleReviewModalSubmit(interaction, rating, guildId, product, client) {
  const comment = interaction.fields.getTextInputValue('comment');
  const amount = interaction.fields.getTextInputValue('amount') || 'N/A';

  await Review.create({ guildId, userId: interaction.user.id, product, comment, rating: Number(rating), orderAmount: amount }).catch(() => {});

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return interaction.reply({ content: '✅ Thanks for your feedback!', ephemeral: true });

  const vouchChannel = guild.channels.cache.find((c) => c.name === config.CUSTOMER_VOUCHES_CHANNEL);
  const stars = '⭐'.repeat(Number(rating)) + '▫️'.repeat(5 - Number(rating));
  const embed = baseEmbed({
    title: 'New Customer Vouch! 💰',
    color: config.COLOR_PRIMARY,
    fields: [
      { name: 'ℹ️', value: comment },
      { name: 'Vouch Amount 💲', value: amount, inline: true },
      { name: `Rating (${rating}/5) 📈`, value: stars, inline: true },
    ],
  }).setAuthor({ name: 'Vouch from Anonymous' });

  const btnMeta = START_BUTTON[product];
  const rows = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`rv_star_prompt_${guildId}_${product}`).setLabel('Submit A Vouch').setStyle(ButtonStyle.Primary).setEmoji('⭐'))];
  if (btnMeta) rows[0].addComponents(new ButtonBuilder().setCustomId(btnMeta.id).setLabel(btnMeta.label).setStyle(ButtonStyle.Secondary));

  if (vouchChannel) await vouchChannel.send({ embeds: [embed], components: rows });
  await interaction.reply({ content: '✅ Thank you for your feedback!', ephemeral: true });
}

module.exports = { runReviewCommand, handleStarPrompt, handleStarPicked, handleReviewModalSubmit };
