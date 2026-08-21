const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits,
} = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const pricing = require('../utils/pricing');
const Order = require('../models/Order');
const { isStaffOrOwner } = require('../utils/permissions');

// userId -> session object (single active order wizard per user)
const sessions = new Map();

function stepsFor(product) {
  switch (product) {
    case 'ranked': return ['service', 'currentrank', 'desiredrank', 'payment', 'notes', 'confirm'];
    case 'prestige': return ['service', 'prestigespec', 'payment', 'notes', 'confirm'];
    case 'matcherino': return ['brawlercount', 'payment', 'notes', 'confirm'];
    case 'winstreak': return ['targetwinstreak', 'whochooses', 'power11', 'payment', 'notes', 'confirm'];
    default: return [];
  }
}

function newSession(product) {
  return { product, steps: stepsFor(product), idx: 0 };
}

function currentStep(session) {
  return session.steps[session.idx];
}

function advance(session) {
  session.idx = Math.min(session.idx + 1, session.steps.length - 1);
}

function goToConfirm(session) {
  session.idx = session.steps.length - 1;
}

function computePrice(session) {
  let price = 0;
  switch (session.product) {
    case 'ranked':
      price = pricing.calcRankedPrice(session.currentrank, session.desiredrank);
      price = pricing.applyServiceMultiplier(price, session.service);
      break;
    case 'prestige':
      price = pricing.calcPrestigePrice(session.prestigespec);
      price = pricing.applyServiceMultiplier(price, session.service);
      break;
    case 'matcherino':
      price = pricing.calcMatcherinoPrice(session.brawlercount);
      break;
    case 'winstreak':
      price = pricing.calcWinstreakPrice(session.targetwinstreak, session.whochooses);
      break;
  }
  return price;
}

function selectMenu(customId, placeholder, options) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options)
  );
}

function render(session) {
  const meta = config.PRODUCT_META[session.product];
  const step = currentStep(session);

  if (step === 'service') {
    const embed = baseEmbed({
      title: 'Choose your service type',
      description: '🚀 **B00st** - Standard service\n🤝 **Carry** - Play together (2x price)',
      color: config.COLOR_PRIMARY,
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('of_svc_boost').setLabel('Get B00sted').setStyle(ButtonStyle.Success).setEmoji('🚀'),
      new ButtonBuilder().setCustomId('of_svc_carry').setLabel('Get Carried (2x Price)').setStyle(ButtonStyle.Primary).setEmoji('🤝'),
    );
    return { embeds: [embed], components: [row] };
  }

  if (step === 'currentrank') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'Select your **current rank**:' });
    const options = config.RANKS.map((r) => ({ label: r.label, value: r.label, emoji: r.emoji })).slice(0, 25);
    return { embeds: [embed], components: [selectMenu('of_select_currentrank', 'Select your current rank...', options)] };
  }

  if (step === 'desiredrank') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: `Current Rank: **${session.currentrank}**\n\nSelect your **desired rank**:` });
    const options = config.RANKS.map((r) => ({ label: r.label, value: r.label, emoji: r.emoji })).slice(0, 25);
    return { embeds: [embed], components: [selectMenu('of_select_desiredrank', 'Select your desired rank...', options)] };
  }

  if (step === 'prestigespec') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'Select your **prestige spec**:' });
    const options = config.PRESTIGE_OPTIONS.map((o) => ({ label: `${o.label} ($${o.price})`, value: o.value, emoji: o.emoji }));
    return { embeds: [embed], components: [selectMenu('of_select_prestigespec', 'Select prestige spec...', options)] };
  }

  if (step === 'brawlercount') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'How many brawlers do you have?' });
    const options = config.MATCHERINO_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
    return { embeds: [embed], components: [selectMenu('of_select_brawlercount', 'Select your brawler count range...', options)] };
  }

  if (step === 'targetwinstreak') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'Select your **target winstreak**:' });
    const options = config.WINSTREAK_OPTIONS.map((o) => ({ label: o.label, value: o.value, emoji: '🔥' }));
    return { embeds: [embed], components: [selectMenu('of_select_targetwinstreak', 'Select target winstreak...', options)] };
  }

  if (step === 'whochooses') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'Who chooses the brawler?' });
    const options = [
      { label: 'Booster chooses (Normal Price)', value: 'booster', emoji: '🎲' },
      { label: `I choose the brawler (+$${config.WINSTREAK_BRAWLER_CHOICE_SURCHARGE})`, value: 'customer', emoji: '👤' },
    ];
    return { embeds: [embed], components: [selectMenu('of_select_whochooses', 'Select who picks the brawler...', options)] };
  }

  if (step === 'power11') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'How many Power 11 brawlers do you have?' });
    const options = config.POWER11_OPTIONS.map((o) => ({ label: o.label, value: o.value, emoji: '⓫' }));
    return { embeds: [embed], components: [selectMenu('of_select_power11', 'Select number of Power 11 brawlers...', options)] };
  }

  if (step === 'payment') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'Select your **payment method**:' });
    const options = config.PAYMENT_METHODS.map((o) => ({ label: o.label, value: o.value, emoji: o.emoji }));
    return { embeds: [embed], components: [selectMenu('of_select_payment', 'Select payment method...', options)] };
  }

  if (step === 'notes') {
    const embed = baseEmbed({ title: `${meta.emoji} ${meta.name} Order`, description: 'Would you like to add any additional notes? (optional)' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('of_notes_add').setLabel('Add Notes').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('of_notes_skip').setLabel('Skip').setStyle(ButtonStyle.Secondary),
    );
    return { embeds: [embed], components: [row] };
  }

  if (step === 'confirm') {
    const price = computePrice(session);
    session.price = price;
    const fields = [{ name: 'Order Type 🚀', value: config.PRODUCT_META[session.product].name, inline: false }];

    if (session.product === 'ranked') {
      fields.push({ name: 'Current Rank 📊', value: session.currentrank, inline: true });
      fields.push({ name: 'Desired Rank 🎯', value: session.desiredrank, inline: true });
    } else if (session.product === 'prestige') {
      const opt = config.PRESTIGE_OPTIONS.find((o) => o.value === session.prestigespec);
      fields.push({ name: 'Prestige Spec ⭐', value: opt ? opt.label : session.prestigespec, inline: true });
    } else if (session.product === 'matcherino') {
      const opt = config.MATCHERINO_OPTIONS.find((o) => o.value === session.brawlercount);
      fields.push({ name: 'Brawler Count 🎗️', value: opt ? opt.label : session.brawlercount, inline: true });
    } else if (session.product === 'winstreak') {
      const opt = config.WINSTREAK_OPTIONS.find((o) => o.value === session.targetwinstreak);
      fields.push({ name: 'Target Winstreak 🔥', value: opt ? opt.label : session.targetwinstreak, inline: true });
      fields.push({ name: 'Brawler Choice 🎮', value: session.whochooses === 'customer' ? 'I choose' : 'Booster chooses', inline: true });
      fields.push({ name: 'Power 11 Brawlers ⓫', value: (config.POWER11_OPTIONS.find((o) => o.value === session.power11) || {}).label || 'N/A', inline: true });
    }

    if (session.service) fields.push({ name: 'Service Type', value: session.service === 'carry' ? '🤝 Carry (2x)' : '🚀 B00st', inline: true });
    const payMeta = config.PAYMENT_METHODS.find((p) => p.value === session.payment);
    fields.push({ name: 'Estimated Price 💲', value: `$${price.toFixed(2)}`, inline: false });
    fields.push({ name: 'Payment Method 💳', value: payMeta ? `${payMeta.emoji} ${payMeta.label}` : 'N/A', inline: false });
    fields.push({ name: 'Notes 📝', value: session.notes || 'None', inline: false });

    const embed = baseEmbed({
      title: `🎯 Confirm Your ${meta.name} Order`,
      description: 'Please review your order details below and confirm:',
      fields,
      color: config.COLOR_PRIMARY,
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('of_confirm').setLabel('Confirm & Create Ticket').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('of_change').setLabel('Change Selections').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
      new ButtonBuilder().setCustomId('of_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    );
    return { embeds: [embed], components: [row] };
  }

  return { embeds: [baseEmbed({ title: 'Error', description: 'Something went wrong, please try again.' })], components: [] };
}

async function startOrder(interaction, product) {
  const session = newSession(product);
  sessions.set(interaction.user.id, session);
  const { embeds, components } = render(session);
  await interaction.reply({ embeds, components, ephemeral: true });
}

async function handleServiceButton(interaction, type) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Your order session expired, please start again.', ephemeral: true });
  session.service = type;
  advance(session);
  const { embeds, components } = render(session);
  await interaction.update({ embeds, components });
}

async function handleNotesChoice(interaction, add) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Your order session expired, please start again.', ephemeral: true });

  if (!add) {
    session.notes = null;
    advance(session);
    const { embeds, components } = render(session);
    return interaction.update({ embeds, components });
  }

  const modal = new ModalBuilder().setCustomId('of_notes_modal').setTitle('Additional Notes');
  const input = new TextInputBuilder()
    .setCustomId('notes_input')
    .setLabel('Any special requests or information?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleNotesModalSubmit(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Your order session expired, please start again.', ephemeral: true });
  session.notes = interaction.fields.getTextInputValue('notes_input') || null;
  advance(session);
  const { embeds, components } = render(session);
  await interaction.update({ embeds, components });
}

async function handleSelect(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Your order session expired, please start again.', ephemeral: true });
  const value = interaction.values[0];
  const field = interaction.customId.replace('of_select_', '');
  session[field] = value;
  advance(session);
  const { embeds, components } = render(session);
  await interaction.update({ embeds, components });
}

async function handleChange(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Your order session expired, please start again.', ephemeral: true });
  const product = session.product;
  const fresh = newSession(product);
  sessions.set(interaction.user.id, fresh);
  const { embeds, components } = render(fresh);
  await interaction.update({ embeds, components });
}

async function handleCancel(interaction) {
  sessions.delete(interaction.user.id);
  const embed = baseEmbed({ title: '❌ Order Cancelled', description: 'You can start a new order any time by clicking the button in the shop channel.', color: config.COLOR_DANGER });
  await interaction.update({ embeds: [embed], components: [] });
}

function detailsSummary(session) {
  switch (session.product) {
    case 'ranked': return `Current Rank: **${session.currentrank}**\nDesired Rank: **${session.desiredrank}**`;
    case 'prestige': {
      const opt = config.PRESTIGE_OPTIONS.find((o) => o.value === session.prestigespec);
      return `Spec: **${opt ? opt.label : session.prestigespec}**`;
    }
    case 'matcherino': {
      const opt = config.MATCHERINO_OPTIONS.find((o) => o.value === session.brawlercount);
      return `Brawlers: **${opt ? opt.label : session.brawlercount}**`;
    }
    case 'winstreak': {
      const opt = config.WINSTREAK_OPTIONS.find((o) => o.value === session.targetwinstreak);
      return `Target: **${opt ? opt.label : session.targetwinstreak}**\nBrawler Choice: **${session.whochooses === 'customer' ? 'Customer' : 'Booster'}**`;
    }
    default: return '';
  }
}

async function findOrCreateTicketCategory(guild) {
  let category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === config.TICKET_CATEGORY_NAME);
  if (!category) {
    category = await guild.channels.create({ name: config.TICKET_CATEGORY_NAME, type: ChannelType.GuildCategory });
  }
  return category;
}

async function handleConfirm(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Your order session expired, please start again.', ephemeral: true });

  await interaction.deferUpdate();

  const guild = interaction.guild;
  const meta = config.PRODUCT_META[session.product];
  const staffRole = guild.roles.cache.find((r) => r.name.toLowerCase() === config.STAFF_ROLE_NAME.toLowerCase());
  const ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === config.OWNER_ROLE_NAME.toLowerCase());
  const category = await findOrCreateTicketCategory(guild);

  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
  ];
  if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.AttachFiles] });
  if (ownerRole) overwrites.push({ id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.AttachFiles] });

  const channelName = `${session.product}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: overwrites,
  });

  const order = await Order.create({
    guildId: guild.id,
    userId: interaction.user.id,
    username: interaction.user.username,
    channelId: ticketChannel.id,
    product: session.product,
    serviceType: session.service || null,
    details: { ...session },
    price: session.price,
    paymentMethod: session.payment,
    notes: session.notes,
    status: 'open',
  }).catch((e) => { console.error('Order save failed:', e.message); return null; });

  // Step 1/5 - Ticket opened
  const openEmbed = baseEmbed({
    title: `🎫 ${meta.name} Order Ticket`,
    description: `Your **${meta.name}** order ticket is now open ${meta.emoji}\n\nStaff will be with you shortly. Click the button below to close this ticket when you're done.`,
    color: config.COLOR_PRIMARY,
  });
  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tk_close_${order?._id || 'x'}`).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId(`tk_closereason_${order?._id || 'x'}`).setLabel('Close With Reason').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );

  // Step 2/5 - Order Details
  const detailsEmbed = baseEmbed({
    title: 'Step 2/5 · Order Details',
    description: `**Your ${meta.name} Order**\n\n${detailsSummary(session)}\nOrder Type: **${session.service === 'carry' ? 'Carry' : session.service === 'boost' ? 'Boost' : 'N/A'}**\nTotal Price 💰: **$${session.price.toFixed(2)} USD**\nOrder ID: \`${order?._id || 'N/A'}\``,
    color: config.COLOR_PRIMARY,
  });
  const paidRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tk_paid_${order?._id || 'x'}`).setLabel('I Sent Payment').setStyle(ButtonStyle.Success).setEmoji('💸'),
  );

  const pingTargets = [staffRole ? `<@&${staffRole.id}>` : '@Staff', ownerRole ? `<@&${ownerRole.id}>` : '@Owner'].join(' ');

  await ticketChannel.send({ content: `${interaction.user} ${pingTargets}`, embeds: [openEmbed], components: [closeRow] });
  await ticketChannel.send({ embeds: [detailsEmbed], components: [paidRow] });

  sessions.delete(interaction.user.id);
  const doneEmbed = baseEmbed({ title: '✅ Ticket Created', description: `Your order ticket has been created: ${ticketChannel}`, color: config.COLOR_SUCCESS });
  await interaction.editReply({ embeds: [doneEmbed], components: [] });
}

module.exports = {
  sessions,
  startOrder,
  handleServiceButton,
  handleNotesChoice,
  handleNotesModalSubmit,
  handleSelect,
  handleChange,
  handleCancel,
  handleConfirm,
};
