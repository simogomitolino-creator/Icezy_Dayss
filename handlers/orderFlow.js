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
 * Avvia la creazione dell'ordine e mostra tutti i Menu di Selezione (Rank, P11, Pagamento)
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

  // 1. Crea il canale Ticket
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

  // 2. Registra l'ordine nel Database
  await Order.create({
    channelId: ticketChannel.id,
    userId: interaction.user.id,
    product: productKey,
    status: 'pending',
    price: 0,
    details: {},
  });

  const embed = baseEmbed({
    title: `${meta.emoji || '🛒'} ${meta.name} Setup`,
    description: `Welcome <@${interaction.user.id}>!\nPlease select your current rank, target rank, Power 11 brawlers, and payment method using the menus below to configure your order.`,
    footer: config.FOOTER,
  });

  // 3. Genera tutti i Menu e Pulsanti necessari per il prodotto
  const components = [];

  if (productKey === 'ranked') {
    // Menu Current Rank (From Rank)
    const fromRankMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ranked_from_select')
        .setPlaceholder('Select Current Rank (From)...')
        .addOptions(config.RANKS.slice(0, -1).map((r) => ({ label: r.label, value: r.label })))
    );

    // Menu Target Rank (To Rank)
    const toRankMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ranked_to_select')
        .setPlaceholder('Select Desired Rank (To)...')
        .addOptions(config.RANKS.slice(1).map((r) => ({ label: r.label, value: r.label })))
    );

    components.push(fromRankMenu, toRankMenu, getPower11SelectMenu(), getPaymentSelectMenu());
  } else if (productKey === 'winstreak') {
    const brawlerPickerMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('winstreak_brawler_select')
        .setPlaceholder('Who picks the Brawler?')
        .addOptions([
          { label: 'Booster Picks (Free)', value: 'booster' },
          { label: 'Client Picks (+$5)', value: 'client' },
        ])
    );
    components.push(brawlerPickerMenu, getPaymentSelectMenu());
  } else {
    components.push(getPaymentSelectMenu());
  }

  // 4. Invia Embed + Componenti nel Ticket
  await ticketChannel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: components,
  });

  await interaction.editReply({
    content: `✅ Ticket created! Please head over to <#${ticketChannel.id}> to complete your order setup.`,
  });
}

/**
 * Gestisce le selezioni da tutti i Menu a Tendina
 */
async function handleSelect(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }

  const customId = interaction.customId;

  // Winstreak Brawler Selection
  if (customId === 'winstreak_brawler_select') {
    const selectedValue = interaction.values[0];
    const isClientPick = selectedValue === 'client';
    const extraCharge = isClientPick ? config.WINSTREAK_BRAWLER_CHOICE_SURCHARGE || 5 : 0;

    const order = await Order.findOne({ channelId: interaction.channel.id, status: 'pending' });

    if (order) {
      const newPrice = Number(order.basePrice || order.price || 0) + extraCharge;
      order.details.brawlerPicker = selectedValue;
      order.price = newPrice;
      await order.save();

      await interaction.followUp({
        content: `✅ Brawler selection set to: **${selectedValue === 'client' ? 'Client Picks (+$5)' : 'Booster Picks'}**.\n💰 Total Price: **$${newPrice.toFixed(2)}**`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  // Power 11 Selection
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

  // Rank Selection (From / To)
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
      order.basePrice = calculatedPrice;
      await order.save();

      await interaction.followUp({
        content: `📈 Rank updated: **${order.details.fromRank}** ➔ **${order.details.toRank}**\n💰 Calculated Total: **$${calculatedPrice.toFixed(2)}**`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  // Payment Method Selection
  if (customId === 'order_payment_select') {
    const selectedValue = interaction.values[0];
    await Order.findOneAndUpdate(
      { channelId: interaction.channel.id, status: 'pending' },
      { $set: { paymentMethod: selectedValue } }
    );

    await interaction.followUp({
      content: `💳 Payment method set to: **${selectedValue.toUpperCase()}**`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
}

/**
 * Calcola il prezzo per Ranked
 */
function calculateRankedPrice(fromRankLabel, toRankLabel) {
  const ranks = config.RANKS;
  const fromIndex = ranks.findIndex((r) => r.label === fromRankLabel);
  const toIndex = ranks.findIndex((r) => r.label === toRankLabel);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return config.RANK_MIN_PRICE || 5;
  }

  let total = 0;
  for (let i = fromIndex; i < toIndex; i++) {
    total += config.RANK_STEP_COSTS[i] || 1;
  }

  return Math.max(total, config.RANK_MIN_PRICE || 5);
}

/**
 * Menu Select Power 11
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
 * Menu Select Payment Methods
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