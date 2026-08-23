const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const config = require('../config');
const Order = require('../models/Order');
const { baseEmbed } = require('../utils/embeds');

// Elenco Rank predefinito di sicurezza
const RANKS_LIST = [
  { label: 'Bronze I', value: 'Bronze I' },
  { label: 'Bronze II', value: 'Bronze II' },
  { label: 'Bronze III', value: 'Bronze III' },
  { label: 'Silver I', value: 'Silver I' },
  { label: 'Silver II', value: 'Silver II' },
  { label: 'Silver III', value: 'Silver III' },
  { label: 'Gold I', value: 'Gold I' },
  { label: 'Gold II', value: 'Gold II' },
  { label: 'Gold III', value: 'Gold III' },
  { label: 'Diamond I', value: 'Diamond I' },
  { label: 'Diamond II', value: 'Diamond II' },
  { label: 'Diamond III', value: 'Diamond III' },
  { label: 'Mythic I', value: 'Mythic I' },
  { label: 'Mythic II', value: 'Mythic II' },
  { label: 'Mythic III', value: 'Mythic III' },
  { label: 'Legendary I', value: 'Legendary I' },
  { label: 'Legendary II', value: 'Legendary II' },
  { label: 'Legendary III', value: 'Legendary III' },
  { label: 'Masters', value: 'Masters' }
];

// Elenco Power 11 predefinito
const POWER11_LIST = [
  { label: '1 - 3 Brawlers', value: '1-3' },
  { label: '4 - 7 Brawlers', value: '4-7' },
  { label: '8 - 12 Brawlers', value: '8-12' },
  { label: '13+ Brawlers', value: '13+' }
];

// Elenco Metodi di Pagamento predefinito
const PAYMENT_LIST = [
  { label: 'PayPal', value: 'paypal' },
  { label: 'Credit / Debit Card', value: 'card' },
  { label: 'Crypto (LTC/BTC/ETH)', value: 'crypto' },
  { label: 'Gift Card / Paysafecard', value: 'giftcard' }
];

async function startOrder(interaction, productKey) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const guild = interaction.guild;
    const categoryName = config.TICKET_CATEGORY_NAME || 'TICKETS';
    const category = guild.channels.cache.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === ChannelType.GuildCategory
    );

    // 1. Creazione del canale Ticket
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

    // 2. Registrazione nel DB
    await Order.create({
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      product: productKey,
      status: 'pending',
      price: 0,
      details: {},
    }).catch(() => {});

    // 3. Costruzione Embed
    const embed = baseEmbed({
      title: `🛒 ${productKey.toUpperCase()} BOOST SETUP`,
      description: `Welcome <@${interaction.user.id}>!\n\nPlease use the drop-down menus below to configure your order (Current Rank, Desired Rank, Power 11 Brawlers, and Payment Method).`,
      footer: config.FOOTER || 'Powered by Iceyz BrawlMart',
    });

    // 4. Costruzione Selettori
    const components = [];

    if (productKey === 'ranked') {
      // Current Rank
      const currentRankMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ranked_from_select')
          .setPlaceholder('1️⃣ Select Current Rank...')
          .addOptions(RANKS_LIST.slice(0, -1))
      );

      // Desired Rank
      const targetRankMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ranked_to_select')
          .setPlaceholder('2️⃣ Select Desired Rank...')
          .addOptions(RANKS_LIST.slice(1))
      );

      // Power 11
      const power11Menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ranked_p11_select')
          .setPlaceholder('3️⃣ Select Power 11 Brawlers count...')
          .addOptions(POWER11_LIST)
      );

      // Payment
      const paymentMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('order_payment_select')
          .setPlaceholder('4️⃣ Select Payment Method...')
          .addOptions(PAYMENT_LIST)
      );

      components.push(currentRankMenu, targetRankMenu, power11Menu, paymentMenu);
    } else {
      // Menu Generico di Pagamento per altri prodotti
      const paymentMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('order_payment_select')
          .setPlaceholder('Select Payment Method...')
          .addOptions(PAYMENT_LIST)
      );
      components.push(paymentMenu);
    }

    // 5. Invio messaggio nel canale Ticket
    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: components,
    });

    await interaction.editReply({
      content: `✅ Ticket created successfully! Go to <#${ticketChannel.id}> to complete your order.`,
    });
  } catch (error) {
    console.error('Error in startOrder:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ Failed to create ticket. Please check bot permissions.' }).catch(() => {});
    }
  }
}

async function handleSelect(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }

    const customId = interaction.customId;
    const selectedValue = interaction.values[0];

    if (customId === 'ranked_from_select') {
      await Order.findOneAndUpdate(
        { channelId: interaction.channel.id },
        { $set: { 'details.fromRank': selectedValue } }
      );
      await interaction.followUp({ content: `✅ Current Rank set to: **${selectedValue}**`, flags: MessageFlags.Ephemeral });
    } else if (customId === 'ranked_to_select') {
      await Order.findOneAndUpdate(
        { channelId: interaction.channel.id },
        { $set: { 'details.toRank': selectedValue } }
      );
      await interaction.followUp({ content: `✅ Desired Rank set to: **${selectedValue}**`, flags: MessageFlags.Ephemeral });
    } else if (customId === 'ranked_p11_select') {
      await Order.findOneAndUpdate(
        { channelId: interaction.channel.id },
        { $set: { 'details.power11Count': selectedValue } }
      );
      await interaction.followUp({ content: `✅ Power 11 Brawlers set to: **${selectedValue}**`, flags: MessageFlags.Ephemeral });
    } else if (customId === 'order_payment_select') {
      await Order.findOneAndUpdate(
        { channelId: interaction.channel.id },
        { $set: { paymentMethod: selectedValue } }
      );
      await interaction.followUp({ content: `💳 Payment Method set to: **${selectedValue.toUpperCase()}**`, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    console.error('Error in handleSelect:', err);
  }
}

module.exports = {
  startOrder,
  handleSelect,
};