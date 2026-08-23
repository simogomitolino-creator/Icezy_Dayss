const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config');
const Order = require('../models/Order');
const { baseEmbed } = require('../utils/embeds');

/**
 * Gestisce tutte le interazioni dai menu a tendina e dai pulsanti del flusso d'ordine
 */
async function handleSelect(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }

  const customId = interaction.customId;

  // 1. Scelta Winstreak: "Who picks the brawler"
  if (customId === 'winstreak_brawler_select') {
    const selectedValue = interaction.values[0];
    const isClientPick = selectedValue === 'client';
    const extraCharge = isClientPick ? config.WINSTREAK_BRAWLER_CHOICE_SURCHARGE : 0;

    const order = await Order.findOne({ channelId: interaction.channel.id, status: 'pending' });

    if (order) {
      const newPrice = Number(order.basePrice || order.price) + extraCharge;
      order.details.brawlerPicker = selectedValue;
      order.price = newPrice;
      await order.save();

      await interaction.editReply({
        content: `✅ Brawler selection set to: **${selectedValue === 'client' ? 'Client Picks (+$5)' : 'Booster Picks'}**.\n💰 Updated Price: **$${newPrice.toFixed(2)}**`,
        components: [],
      });
    } else {
      await interaction.editReply({
        content: `✅ Brawler selection set to: **${selectedValue}**.`,
        components: [],
      });
    }
    return;
  }

  // 2. Scelta Power 11 Brawlers per Ranked Boost
  if (customId === 'ranked_p11_select') {
    const selectedValue = interaction.values[0];
    await Order.findOneAndUpdate(
      { channelId: interaction.channel.id, status: 'pending' },
      { $set: { 'details.power11Count': selectedValue } }
    );

    await interaction.followUp({
      content: `✅ Power 11 Brawlers count set to: **${selectedValue}**`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 3. Scelta Ranks (From Rank / To Rank)
  if (customId === 'ranked_from_select' || customId === 'ranked_to_select') {
    const selectedValue = interaction.values[0];
    const fieldToUpdate = customId === 'ranked_from_select' ? 'details.fromRank' : 'details.toRank';

    const order = await Order.findOneAndUpdate(
      { channelId: interaction.channel.id, status: 'pending' },
      { $set: { [fieldToUpdate]: selectedValue } },
      { new: true }
    );

    if (order && order.details.fromRank && order.details.toRank) {
      const calculatedPrice = calculateRankedPrice(order.details.fromRank, order.details.toRank);
      order.price = calculatedPrice;
      await order.save();

      await interaction.followUp({
        content: `📈 Rank updated: **${order.details.fromRank}** ➔ **${order.details.toRank}**\n💰 Calculated Total: **$${calculatedPrice.toFixed(2)}**`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }
}

/**
 * Calcola il prezzo del Ranked Boost in base ai gradi selezionati
 */
function calculateRankedPrice(fromRankLabel, toRankLabel) {
  const ranks = config.RANKS;
  const fromIndex = ranks.findIndex((r) => r.label === fromRankLabel);
  const toIndex = ranks.findIndex((r) => r.label === toRankLabel);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return config.RANK_MIN_PRICE;
  }

  let total = 0;
  for (let i = fromIndex; i < toIndex; i++) {
    total += config.RANK_STEP_COSTS[i] || 1;
  }

  return Math.max(total, config.RANK_MIN_PRICE);
}

/**
 * Menu a tendina per la selezione dei Power 11
 */
function getPower11SelectMenu() {
  const options = config.POWER11_OPTIONS.map((opt) => ({
    label: opt.label,
    value: opt.value,
    emoji: opt.emoji || '⚡',
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ranked_p11_select')
      .setPlaceholder('Select amount of Power 11 Brawlers...')
      .addOptions(options)
  );
}

/**
 * Menu a tendina per i metodi di pagamento (usando gli ID o le Emoji del config)
 */
function getPaymentSelectMenu() {
  const options = config.PAYMENT_METHODS.map((method) => {
    const optionObj = {
      label: method.label,
      value: method.value,
    };
    if (method.emoji) {
      optionObj.emoji = method.emoji;
    }
    return optionObj;
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('order_payment_select')
      .setPlaceholder('Select your payment method...')
      .addOptions(options)
  );
}

module.exports = {
  handleSelect,
  calculateRankedPrice,
  getPower11SelectMenu,
  getPaymentSelectMenu,
};