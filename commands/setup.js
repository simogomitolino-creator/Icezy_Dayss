const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup product purchase panel with custom image')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName('product')
        .setDescription('Select product panel')
        .setRequired(true)
        .addChoices(
          { name: 'Ranked Boost', value: 'ranked' },
          { name: 'Prestige Boost', value: 'prestige' },
          { name: 'Matcherino Boost', value: 'matcherino' },
          { name: 'Winstreak Boost', value: 'winstreak' }
        )
    )
    .addAttachmentOption((o) =>
      o.setName('image')
        .setDescription('Attach showcase image for panel')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const rawProduct = interaction.options.getString('product');
    const imageAttachment = interaction.options.getAttachment('image');

    if (!rawProduct) {
      return interaction.editReply({ content: '❌ Selected product option is invalid or empty.' });
    }

    const productKey = String(rawProduct).toLowerCase().trim();
    const meta = config.PRODUCT_META[productKey];

    if (!meta) {
      const validKeys = Object.keys(config.PRODUCT_META || {}).join(', ');
      return interaction.editReply({
        content: `❌ Invalid product configuration key: \`${productKey}\`. Available keys: \`${validKeys}\``,
      });
    }

    const embed = {
      title: `${meta.emoji || '🛒'} ${(meta.name || 'BOOST').toUpperCase()}`,
      description: `Welcome to **${config.BRAND_NAME || 'Our Service'}**!\n\nClick the button below to start your order setup.`,
      color: config.COLOR_PRIMARY || 0x8B2FE0,
      image: imageAttachment ? { url: imageAttachment.url } : undefined,
      footer: {
        text: config.FOOTER || 'Powered by Iceyz BrawlMart',
      },
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`create_ticket_${productKey}`)
        .setLabel(meta.buttonLabel || 'Get Started')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(meta.emoji || '🛒')
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `✅ **${meta.name}** panel with image posted successfully!` });
  },
};