const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const { isStaffOrOwner } = require('../utils/permissions');

function withImageOption(sub) {
  return sub.addAttachmentOption((o) => o.setName('image').setDescription('Image representing this product (shown in the panel)').setRequired(true));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post a shop setup panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => withImageOption(s.setName('ranked').setDescription('Post the Ranked Boost panel')))
    .addSubcommand((s) => withImageOption(s.setName('prestige').setDescription('Post the Prestige Boost panel')))
    .addSubcommand((s) => withImageOption(s.setName('matcherino').setDescription('Post the Matcherino Boost panel')))
    .addSubcommand((s) => withImageOption(s.setName('winstreak').setDescription('Post the Winstreak Boost panel')))
    .addSubcommand((s) => s.setName('ticket').setDescription('Post the general support/ticket panel')),

  async execute(interaction) {
    if (!isStaffOrOwner(interaction.member)) {
      return interaction.reply({ content: '❌ Only staff can use /setup.', ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'ticket') {
      const embed = baseEmbed({
        title: 'Select An Option Below 🚀',
        description: '**Rules** ✅\n• Follow the directions of our bots if given\n• Do not spam ping staff\n• Be patient, support has many tickets to handle\n\n**Select what type of ticket you want to be opened from the dropdown below** ⬇️',
        color: config.COLOR_PRIMARY,
      });
      const menu = new StringSelectMenuBuilder().setCustomId('ticket_type_select').setPlaceholder('Choose an option').addOptions([
        { label: 'Purchase A Brawl Service', description: 'Purchase one of our many different brawl services', value: 'purchase', emoji: '🛒' },
        { label: 'Apply For A Role', description: 'Apply: Support, Booster, Chat Mod, or Reporter role', value: 'apply', emoji: '📋' },
        { label: 'Get Help From Support', description: 'Get help with an issue relating to this server', value: 'support', emoji: '🙋' },
      ]);
      await interaction.reply({ content: '✅ Panel posted!', ephemeral: true });
      return interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
    }

    const meta = config.PRODUCT_META[sub];
    if (!meta) return interaction.reply({ content: '❌ Unknown panel.', ephemeral: true });

    const image = interaction.options.getAttachment('image');
    if (image && !image.contentType?.startsWith('image/')) {
      return interaction.reply({ content: '❌ Please attach a valid image file.', ephemeral: true });
    }

    const descriptions = {
      ranked: '• Climb the ranks with professional boosting service\n• Fast, secure, and reliable rank progression\n• Experienced boosters with proven track records',
      prestige: '• Unlock prestige levels for your brawlers\n• Quick and efficient prestige progression\n• Show off your dedication with prestige ranks',
      matcherino: '• Professional matcherino tournament services\n• Competitive edge with experienced players\n• Tournament ready team support',
      winstreak: '• Achieve impressive winstreaks with pro players\n• Dominate matches and build your streak\n• Consistent wins with skilled teammates',
    };

    const embed = baseEmbed({
      title: `${meta.emoji} ${meta.name} Service`,
      description: `**What We Offer**\n${descriptions[sub]}`,
      color: config.COLOR_PRIMARY,
      image: image?.url,
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`start_${sub}`).setLabel(meta.buttonLabel).setStyle(ButtonStyle.Primary).setEmoji(meta.emoji),
    );

    await interaction.reply({ content: '✅ Panel posted!', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  },
};
