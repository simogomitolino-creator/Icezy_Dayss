const { MessageFlags } = require('discord.js');
const orderFlow = require('../handlers/orderFlow');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // 1. Gestione Slash Commands
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      // 2. Gestione Pressione Bottoni
      if (interaction.isButton()) {
        const customId = interaction.customId;

        // Creazione Ticket dal Pannello (es. create_ticket_ranked)
        if (customId.startsWith('create_ticket_')) {
          const productKey = customId.replace('create_ticket_', '').trim();
          await orderFlow.startOrder(interaction, productKey);
          return;
        }
      }

      // 3. Gestione Menu a Tendina (Select Menus)
      if (interaction.isStringSelectMenu()) {
        await orderFlow.handleSelect(interaction);
        return;
      }
    } catch (error) {
      console.error('Error handling interaction:', error);

      const errorMessage = {
        content: '❌ An error occurred while processing this action.',
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorMessage).catch(() => {});
      } else {
        await interaction.reply(errorMessage).catch(() => {});
      }
    }
  },
};