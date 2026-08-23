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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const productKey = interaction.options.getString('product').toLowerCase().trim();
    const imageAttachment = interaction.options.getAttachment('image');
    const meta = config.PRODUCT_META[productKey];

    if (!meta) {
      return interaction.editReply({
        content: `❌ Invalid product configuration key: \`${productKey}\`. Available keys: \`${Object.keys(config.PRODUCT_META).join(', ')}\``,
      });
    }

    const embed = {
      title: `${meta.emoji} ${meta.name.toUpperCase()}`,
      description: `Welcome to **${config.BRAND_NAME}**!\n\nClick the button below to start your order setup.`,
      color: config.COLOR_PRIMARY,
      image: {
        url: imageAttachment.url,
      },
      footer: {
        text: config.FOOTER,
      },
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`create_ticket_${productKey}`)
        .setLabel(meta.buttonLabel)
        .setStyle(ButtonStyle.Primary)
        .setEmoji(meta.emoji)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `✅ **${meta.name}** panel with image posted successfully!` });
  },
};