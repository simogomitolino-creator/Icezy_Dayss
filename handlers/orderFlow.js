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
 * Avvia la creazione dell'ordine e del canale Ticket quando si clicca il pulsante del pannello
 */
async function startOrder(interaction, productKey) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const meta = config.PRODUCT_META[productKey];
  if (!meta) {
    return interaction.editReply({ content: '❌ Invalid product selected.' });
  }

  const guild = interaction.guild;
  const category = guild.channels.cache.find(
    (c) => c.name === config.TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory
  );

  // Crea il canale ticket privato per l'utente
  const ticketChannel = await guild.channels.create({
    name: `${productKey}-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: category ? category.id : null,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
        ],
      },
    ],
  });

  // Crea l'ordine nel Database MongoDB
  await Order.create({
    channelId: ticketChannel.id,
    userId: interaction.user.id,
    product: productKey,
    status: 'pending',
    price: 0,
    details: {},
  });

  const embed = baseEmbed({
    title: `${meta.emoji} ${meta.name} Setup`,
    description: `Welcome <@${interaction.user.id}>! Please configure your order preferences below.`,
    footer: config.FOOTER,
  });

  await ticketChannel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
  });

  await interaction.editReply({
    content: `✅ Ticket created! Please head over to <#${ticketChannel.id}> to complete your order.`,
  });
}

/**
 * Gestisce le selezioni dai Menu a Tendina
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
        content: `✅ Brawler selection set to: **${selectedValue === 'client' ? 'Client Picks (+$5)' : 'Booster Picks'}**.\n💰 Total Price: **$${newPrice.toFixed(2)}**`,
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

  // 2. Scelta Power 11 Brawlers per Ranked
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
}

/**
 * Calcola il prezzo per il Ranked Boost
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
 * Menu Select per Power 11
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
 * Menu Select per Metodi di Pagamento
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
  startOrder,
  handleSelect,
  calculateRankedPrice,
  getPower11SelectMenu,
  getPaymentSelectMenu,
};