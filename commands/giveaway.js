const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createGiveaway, endGiveaway } = require('../handlers/giveawaySystem');
const { isStaffOrOwner } = require('../utils/permissions');
const Giveaway = require('../models/Giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('g')
    .setDescription('Giveaway commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('create').setDescription('Create a new giveaway')
      .addStringOption((o) => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1))
      .addStringOption((o) => o.setName('duration').setDescription('Duration, e.g. 30m, 2h, 1d').setRequired(true)))
    .addSubcommand((s) => s.setName('end').setDescription('End a giveaway early')
      .addStringOption((o) => o.setName('message_id').setDescription('The giveaway message ID').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return createGiveaway(interaction);

    if (sub === 'end') {
      if (!isStaffOrOwner(interaction.member)) return interaction.reply({ content: '❌ Only staff can end giveaways.', ephemeral: true });
      const messageId = interaction.options.getString('message_id');
      const gw = await Giveaway.findOne({ messageId });
      if (!gw) return interaction.reply({ content: '❌ No giveaway found with that message ID.', ephemeral: true });
      await endGiveaway(interaction.client, gw._id);
      return interaction.reply({ content: '✅ Giveaway ended.', ephemeral: true });
    }
  },
};
