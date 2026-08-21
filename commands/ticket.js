const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { runProofsCommand } = require('../handlers/proofSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('proofs').setDescription('Post a completed job proof from this ticket to #completed-jobs')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'proofs') await runProofsCommand(interaction);
  },
};