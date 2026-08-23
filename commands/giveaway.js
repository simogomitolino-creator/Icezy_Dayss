const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const giveawaySystem = require('../handlers/giveawaySystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('g')
    .setDescription('Giveaway management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s.setName('create')
        .setDescription('Start a giveaway')
        .addStringOption((o) => o.setName('prize').setDescription('Prize name').setRequired(true))
        .addStringOption((o) => o.setName('duration').setDescription('Duration (e.g., 1h, 1d)').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('Winner count').setRequired(true)),
    )
    .addSubcommand((s) =>
      s.setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((o) => o.setName('message_id').setDescription('Message ID of giveaway').setRequired(true)),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    
    if (sub === 'create') {
      await giveawaySystem.createGiveaway(interaction);
    } else if (sub === 'end') {
      await giveawaySystem.endGiveaway(interaction);
    }
  },
};