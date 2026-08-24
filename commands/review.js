const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { runReviewCommand } = require('../handlers/reviewSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('review')
    .setDescription('Send a customer a review request via DM')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('user').setDescription('The customer to request a review from').setRequired(true))
    .addStringOption((o) => o.setName('product').setDescription('The product/service purchased').setRequired(true).addChoices(
      { name: 'Ranked Boost', value: 'ranked' },
      { name: 'Prestige Boost', value: 'prestige' },
      { name: 'Matcherino Boost', value: 'matcherino' },
      { name: 'Winstreak Boost', value: 'winstreak' },
    )),
  async execute(interaction) {
    await runReviewCommand(interaction);
  },
};
