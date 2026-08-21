const orderFlow = require('../handlers/orderFlow');
const ticketSystem = require('../handlers/ticketSystem');
const proofSystem = require('../handlers/proofSystem');
const reviewSystem = require('../handlers/reviewSystem');
const giveawaySystem = require('../handlers/giveawaySystem');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // ===== Slash Commands =====
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(interaction);
      }

      // ===== Buttons =====
      if (interaction.isButton()) {
        const id = interaction.customId;

        if (id.startsWith('start_')) {
          const product = id.replace('start_', '');
          if (config.PRODUCT_META[product]) return orderFlow.startOrder(interaction, product);
        }

        if (id === 'of_svc_boost') return orderFlow.handleServiceButton(interaction, 'boost');
        if (id === 'of_svc_carry') return orderFlow.handleServiceButton(interaction, 'carry');
        if (id === 'of_notes_add') return orderFlow.handleNotesChoice(interaction, true);
        if (id === 'of_notes_skip') return orderFlow.handleNotesChoice(interaction, false);
        if (id === 'of_confirm') return orderFlow.handleConfirm(interaction);
        if (id === 'of_change') return orderFlow.handleChange(interaction);
        if (id === 'of_cancel') return orderFlow.handleCancel(interaction);

        if (id.startsWith('tk_paid_')) return ticketSystem.handlePaidButton(interaction, id.replace('tk_paid_', ''));
        if (id.startsWith('tk_inputpay_')) return ticketSystem.handleInputPayment(interaction, id.replace('tk_inputpay_', ''));
        if (id.startsWith('tk_heatz_')) return ticketSystem.handleFindExchange(interaction, id.replace('tk_heatz_', ''));
        if (id.startsWith('tk_confirmpay_')) return ticketSystem.handleConfirmPayment(interaction, id.replace('tk_confirmpay_', ''));
        if (id.startsWith('tk_closereason_')) return ticketSystem.handleClose(interaction, id.replace('tk_closereason_', ''), true);
        if (id.startsWith('tk_close_')) return ticketSystem.handleClose(interaction, id.replace('tk_close_', ''), false);

        if (id.startsWith('proof_public_') || id.startsWith('proof_anon_')) {
          const anonymous = id.startsWith('proof_anon_');
          const rest = id.replace(anonymous ? 'proof_anon_' : 'proof_public_', '');
          const parts = rest.split('_');
          const orderId = parts.shift();
          const url = decodeURIComponent(parts.join('_'));
          return proofSystem.postProof(interaction, orderId, url, anonymous);
        }

        if (id.startsWith('rv_star_prompt_')) {
          const rest = id.replace('rv_star_prompt_', '');
          const [guildId, product] = rest.split('_');
          return reviewSystem.handleStarPrompt(interaction, guildId, product);
        }
        if (id.startsWith('rv_star_')) {
          const rest = id.replace('rv_star_', '');
          const [rating, guildId, product] = rest.split('_');
          return reviewSystem.handleStarPicked(interaction, rating, guildId, product);
        }

        if (id.startsWith('gw_enter_')) return giveawaySystem.handleEnter(interaction, id.replace('gw_enter_', ''));

        return;
      }

      // ===== Select Menus =====
      if (interaction.isStringSelectMenu()) {
        const id = interaction.customId;

        if (id.startsWith('of_select_')) return orderFlow.handleSelect(interaction);

        if (id === 'ticket_type_select') {
          const value = interaction.values[0];
          if (value === 'purchase') {
            const embed = baseEmbed({ title: 'Choose a service', description: 'Pick the service you would like to purchase:' });
            const row = new ActionRowBuilder().addComponents(
              Object.entries(config.PRODUCT_META).map(([key, meta]) =>
                new ButtonBuilder().setCustomId(`start_${key}`).setLabel(meta.buttonLabel).setStyle(ButtonStyle.Primary).setEmoji(meta.emoji)),
            );
            return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
          }
          return ticketSystem.createGenericTicket(interaction, value);
        }
        return;
      }

      // ===== Modals =====
      if (interaction.isModalSubmit()) {
        const id = interaction.customId;

        if (id === 'of_notes_modal') return orderFlow.handleNotesModalSubmit(interaction);
        if (id.startsWith('tk_inputpaymodal_')) return ticketSystem.handleInputPaymentModalSubmit(interaction, id.replace('tk_inputpaymodal_', ''));
        if (id.startsWith('tk_closereasonmodal_')) return ticketSystem.handleCloseReasonModalSubmit(interaction, id.replace('tk_closereasonmodal_', ''));

        if (id.startsWith('rv_modal_')) {
          const rest = id.replace('rv_modal_', '');
          const [rating, guildId, product] = rest.split('_');
          return reviewSystem.handleReviewModalSubmit(interaction, rating, guildId, product, interaction.client);
        }
        return;
      }
    } catch (err) {
      console.error('Interaction error:', err);
      const payload = { content: '❌ Something went wrong handling that action.', ephemeral: true };
      try {
        if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
        else await interaction.reply(payload);
      } catch (e) { /* ignore */ }
    }
  },
};
