const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits,
} = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const { isStaffOrOwner } = require('../utils/permissions');
const Order = require('../models/Order');

async function handlePaidButton(interaction, orderId) {
  await interaction.deferReply({ ephemeral: true });
  const order = await Order.findById(orderId).catch(() => null);
  const staffRole = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === config.STAFF_ROLE_NAME.toLowerCase());
  const ownerRole = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === config.OWNER_ROLE_NAME.toLowerCase());
  const pingTargets = [staffRole ? `<@&${staffRole.id}>` : '@Staff', ownerRole ? `<@&${ownerRole.id}>` : '@Owner'].join(' ');

  await interaction.editReply({ content: '✅ Thanks! Staff has been notified that payment was sent.' });

  const isProxy = order && config.PROXY_PAYMENT_METHODS.includes(order.paymentMethod);

  if (isProxy) {
    const embed = baseEmbed({
      title: '🌐 Payment Method Proxy Required',
      description: `The selected payment method (**${order.paymentMethod}**) is currently unavailable or handled via proxy.\n\nAn admin can either **input the payment details manually** or **route this order through the Heatz escrow network** to find an exchanger.`,
      color: config.COLOR_WARNING,
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tk_inputpay_${orderId}`).setLabel('Input Payment Info').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId(`tk_heatz_${orderId}`).setLabel('Find Exchange via Heatz').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
    );
    await interaction.channel.send({ content: pingTargets, embeds: [embed], components: [row] });
  } else {
    const embed = baseEmbed({
      title: '💳 Payment Confirmation Needed',
      description: 'The customer says they sent payment. A staff member should verify and click **Confirm Payment** below.',
      color: config.COLOR_WARNING,
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tk_confirmpay_${orderId}`).setLabel('Confirm Payment Received').setStyle(ButtonStyle.Success).setEmoji('✅'),
    );
    await interaction.channel.send({ content: pingTargets, embeds: [embed], components: [row] });
  }

  if (order) { order.status = 'paid'; await order.save().catch(() => {}); }
}

async function handleInputPayment(interaction, orderId) {
  if (!isStaffOrOwner(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can do this.', ephemeral: true });
  }
  const modal = new ModalBuilder().setCustomId(`tk_inputpaymodal_${orderId}`).setTitle('Input Payment Info');
  const input = new TextInputBuilder().setCustomId('payinfo').setLabel('Payment info to send the customer').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleInputPaymentModalSubmit(interaction, orderId) {
  await interaction.deferReply();
  const value = interaction.fields.getTextInputValue('payinfo');
  const embed = baseEmbed({ title: '📝 Payment Info', description: value, color: config.COLOR_BLUE });
  await interaction.editReply({ embeds: [embed] });
}

async function handleFindExchange(interaction, orderId) {
  if (!isStaffOrOwner(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can do this.', ephemeral: true });
  }
  const embed = baseEmbed({
    title: '🔄 Heatz Exchange Requested',
    description: 'This order has been flagged for routing through the Heatz escrow network. A staff member handling exchanges should coordinate manually with the customer.',
    color: config.COLOR_BLUE,
  });
  await interaction.reply({ embeds: [embed] });
}

async function handleConfirmPayment(interaction, orderId) {
  if (!isStaffOrOwner(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can do this.', ephemeral: true });
  }
  await interaction.deferReply();
  const order = await Order.findById(orderId).catch(() => null);
  if (order) { order.status = 'assigned'; await order.save().catch(() => {}); }

  const embed = baseEmbed({
    title: '🚀 Order Assigned',
    description: 'Payment confirmed! Your order has been assigned to a booster and work will begin shortly.\n\nUse the buttons below to close this ticket once the order is fully completed.',
    color: config.COLOR_SUCCESS,
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tk_close_${orderId}`).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId(`tk_closereason_${orderId}`).setLabel('Close With Reason').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleClose(interaction, orderId, reason) {
  if (!isStaffOrOwner(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can close tickets.', ephemeral: true });
  }
  if (reason) {
    const modal = new ModalBuilder().setCustomId(`tk_closereasonmodal_${orderId}`).setTitle('Close Ticket With Reason');
    const input = new TextInputBuilder().setCustomId('reason').setLabel('Reason for closing').setStyle(TextInputStyle.Paragraph).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
  await interaction.reply({ content: '🔒 Closing this ticket in 5 seconds...' });
  if (orderId && orderId !== 'x' && orderId !== 'generic') {
    const order = await Order.findById(orderId).catch(() => null);
    if (order) { order.status = 'closed'; await order.save().catch(() => {}); }
  }
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

async function handleCloseReasonModalSubmit(interaction, orderId) {
  const reason = interaction.fields.getTextInputValue('reason');
  await interaction.reply({ content: `🔒 Closing this ticket in 5 seconds...\n**Reason:** ${reason}` });
  if (orderId && orderId !== 'x' && orderId !== 'generic') {
    const order = await Order.findById(orderId).catch(() => null);
    if (order) { order.status = 'closed'; await order.save().catch(() => {}); }
  }
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

const TICKET_TYPE_LABELS = {
  apply: { title: '📋 Role Application', desc: 'Please tell us which role you are applying for (Support, Booster, Chat Mod, or Reporter) and why you would be a good fit.' },
  support: { title: '🙋 Support Ticket', desc: 'Please describe the issue you need help with and a staff member will be with you shortly.' },
};

async function findOrCreateTicketCategory(guild) {
  let category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === config.TICKET_CATEGORY_NAME);
  if (!category) category = await guild.channels.create({ name: config.TICKET_CATEGORY_NAME, type: ChannelType.GuildCategory });
  return category;
}

async function createGenericTicket(interaction, type) {
  const info = TICKET_TYPE_LABELS[type];
  if (!info) return interaction.reply({ content: '❌ Unknown ticket type.', ephemeral: true });

  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  const staffRole = guild.roles.cache.find((r) => r.name.toLowerCase() === config.STAFF_ROLE_NAME.toLowerCase());
  const ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === config.OWNER_ROLE_NAME.toLowerCase());
  const category = await findOrCreateTicketCategory(guild);

  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
  ];
  if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  if (ownerRole) overwrites.push({ id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });

  const channelName = `${type}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
  const channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: category.id, permissionOverwrites: overwrites });

  const pingTargets = [staffRole ? `<@&${staffRole.id}>` : '@Staff', ownerRole ? `<@&${ownerRole.id}>` : '@Owner'].join(' ');
  const embed = baseEmbed({ title: info.title, description: info.desc, color: config.COLOR_PRIMARY });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk_close_generic').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );
  await channel.send({ content: `${interaction.user} ${pingTargets}`, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
}

module.exports = {
  handlePaidButton,
  handleInputPayment,
  handleInputPaymentModalSubmit,
  handleFindExchange,
  handleConfirmPayment,
  handleClose,
  handleCloseReasonModalSubmit,
  createGenericTicket,
};
