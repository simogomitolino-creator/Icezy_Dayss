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

// userId -> { rating, guildId, product, comment, amount }  (pending, not yet posted)
const pendingReviews = new Map();

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
  // Modal must be shown as the immediate response - no defer before this.
  const modal = new ModalBuilder().setCustomId(`rv_modal_${rating}_${guildId}_${product}`).setTitle('New Customer Vouch');
  const comment = new TextInputBuilder().setCustomId('comment').setLabel('Your comment').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300);
  const amount = new TextInputBuilder().setCustomId('amount').setLabel('Order Amount (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('e.g. $32.99');
  modal.addComponents(new ActionRowBuilder().addComponents(comment), new ActionRowBuilder().addComponents(amount));
  await interaction.showModal(modal);
}

function previewEmbed(data) {
  const stars = '⭐'.repeat(Number(data.rating)) + '▫️'.repeat(5 - Number(data.rating));
  return baseEmbed({
    title: 'New Customer Vouch! 💰',
    color: config.COLOR_PRIMARY,
    description: `**Product:** ${config.PRODUCT_META[data.product]?.name || data.product}`,
    fields: [
      { name: 'ℹ️', value: data.comment },
      { name: 'Vouch Amount 💲', value: data.amount || 'N/A', inline: true },
      { name: `Rating (${data.rating}/5) 📈`, value: stars, inline: true },
    ],
  }).setAuthor({ name: 'Vouch from Anonymous' });
}

async function handleReviewModalSubmit(interaction, rating, guildId, product) {
  await interaction.deferReply({ ephemeral: true });
  const comment = interaction.fields.getTextInputValue('comment');
  const amount = interaction.fields.getTextInputValue('amount') || 'N/A';

  const data = { rating, guildId, product, comment, amount };
  pendingReviews.set(interaction.user.id, data);

  const embed = previewEmbed(data);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rv_submit').setLabel('Procedi / Submit').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId('rv_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );
  await interaction.editReply({ content: 'Here is a preview of your review. Click **Procedi / Submit** to post it!', embeds: [embed], components: [row] });
}

async function handleSubmit(interaction) {
  await interaction.deferUpdate();
  const data = pendingReviews.get(interaction.user.id);
  if (!data) return interaction.editReply({ content: '❌ This review has expired, please start again.', embeds: [], components: [] });

  await Review.create({ guildId: data.guildId, userId: interaction.user.id, product: data.product, comment: data.comment, rating: Number(data.rating), orderAmount: data.amount }).catch(() => {});

  const guild = await interaction.client.guilds.fetch(data.guildId).catch(() => null);
  if (guild) {
    const vouchChannel = guild.channels.cache.find((c) => c.name === config.CUSTOMER_VOUCHES_CHANNEL);
    const embed = previewEmbed(data);
    const btnMeta = START_BUTTON[data.product];
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`rv_star_prompt_${data.guildId}_${data.product}`).setLabel('Submit A Vouch').setStyle(ButtonStyle.Primary).setEmoji('⭐'));
    if (btnMeta) row.addComponents(new ButtonBuilder().setCustomId(btnMeta.id).setLabel(btnMeta.label).setStyle(ButtonStyle.Secondary));
    if (vouchChannel) await vouchChannel.send({ embeds: [embed], components: [row] });
  }

  pendingReviews.delete(interaction.user.id);
  await interaction.editReply({ content: '✅ Thank you! Your review has been posted.', embeds: [], components: [] });
}

async function handleCancel(interaction) {
  await interaction.deferUpdate();
  pendingReviews.delete(interaction.user.id);
  await interaction.editReply({ content: '❌ Review cancelled.', embeds: [], components: [] });
}

module.exports = { runReviewCommand, handleStarPrompt, handleStarPicked, handleReviewModalSubmit, handleSubmit, handleCancel };
