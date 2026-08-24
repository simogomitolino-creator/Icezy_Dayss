const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { baseEmbed } = require('../utils/embeds');
const Giveaway = require('../models/Giveaway');
const { isStaffOrOwner } = require('../utils/permissions');

const timers = new Map();

function parseDuration(str) {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(str.trim());
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return n * mult;
}

function liveEmbed(gw) {
  return baseEmbed({
    title: '🎉 NEW GIVEAWAY!',
    color: config.COLOR_PRIMARY,
    description: `🎁 **${gw.prize}**`,
    fields: [
      { name: '🏆 Winners', value: `${gw.winnersCount} winner${gw.winnersCount > 1 ? 's' : ''}`, inline: true },
      { name: '🎯 Hosted By', value: `<@${gw.hostedBy}>`, inline: true },
      { name: '⏰ Ends', value: `<t:${Math.floor(new Date(gw.endsAt).getTime() / 1000)}:R>`, inline: false },
      { name: '👥 Participants', value: `${gw.participants.length} participants`, inline: false },
    ],
  });
}

function endedEmbed(gw) {
  return baseEmbed({
    title: '🎊 GIVEAWAY ENDED 🎊',
    color: config.COLOR_SUCCESS,
    description: `🎁 **${gw.prize}**`,
    fields: [
      { name: '🏆 Winners', value: `${gw.winnersCount} winner${gw.winnersCount > 1 ? 's' : ''}`, inline: true },
      { name: '🎯 Hosted By', value: `<@${gw.hostedBy}>`, inline: true },
      { name: '👥 Participants', value: `${gw.participants.length} participants`, inline: false },
      { name: '🎊 Winners', value: gw.winners.length ? gw.winners.map((w) => `<@${w}>`).join(', ') : 'No valid entries', inline: false },
    ],
  });
}

async function createGiveaway(interaction) {
  if (!isStaffOrOwner(interaction.member)) {
    return interaction.reply({ content: '❌ Only staff can start giveaways.', ephemeral: true });
  }
  // Defer FIRST, before touching the database - avoids "The application did not respond".
  await interaction.deferReply({ ephemeral: true });

  const prize = interaction.options.getString('prize');
  const winnersCount = interaction.options.getInteger('winners');
  const durationStr = interaction.options.getString('duration');
  const ms = parseDuration(durationStr);
  if (!ms) return interaction.editReply({ content: '❌ Invalid duration. Use formats like `30m`, `2h`, `1d`.' });

  const endsAt = new Date(Date.now() + ms);
  const gw = await Giveaway.create({
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    prize, winnersCount, hostedBy: interaction.user.id, endsAt,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`gw_enter_${gw._id}`).setLabel('Enter Giveaway').setStyle(ButtonStyle.Success).setEmoji('🎉'),
  );
  const msg = await interaction.channel.send({ content: '@everyone **NEW GIVEAWAY!**', embeds: [liveEmbed(gw)], components: [row] });
  gw.messageId = msg.id;
  await gw.save();

  await interaction.editReply({ content: '✅ Giveaway started!' });
  scheduleEnd(interaction.client, gw._id, ms);
}

async function handleEnter(interaction, giveawayId) {
  await interaction.deferReply({ ephemeral: true });
  const gw = await Giveaway.findById(giveawayId).catch(() => null);
  if (!gw || gw.ended) return interaction.editReply({ content: '❌ This giveaway has ended.' });

  const idx = gw.participants.indexOf(interaction.user.id);
  if (idx === -1) {
    gw.participants.push(interaction.user.id);
    await gw.save();
    await interaction.editReply({ content: '🎉 You entered the giveaway! Good luck!' });
  } else {
    gw.participants.splice(idx, 1);
    await gw.save();
    await interaction.editReply({ content: '❌ You left the giveaway.' });
  }

  try {
    const channel = await interaction.guild.channels.fetch(gw.channelId);
    const msg = await channel.messages.fetch(gw.messageId);
    await msg.edit({ embeds: [liveEmbed(gw)] });
  } catch (e) { /* ignore */ }
}

function scheduleEnd(client, giveawayId, ms) {
  if (timers.has(String(giveawayId))) clearTimeout(timers.get(String(giveawayId)));
  const t = setTimeout(() => endGiveaway(client, giveawayId).catch(console.error), ms);
  timers.set(String(giveawayId), t);
}

async function endGiveaway(client, giveawayId) {
  const gw = await Giveaway.findById(giveawayId).catch(() => null);
  if (!gw || gw.ended) return;

  const winners = [];
  const pool = [...gw.participants];
  const count = Math.min(gw.winnersCount, pool.length);
  for (let i = 0; i < count; i++) {
    const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    winners.push(pick);
  }
  gw.winners = winners;
  gw.ended = true;
  await gw.save();

  try {
    const channel = await client.channels.fetch(gw.channelId);
    const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
    if (msg) await msg.edit({ embeds: [endedEmbed(gw)], components: [] });
    if (winners.length) {
      await channel.send(`🎊 Congratulations ${winners.map((w) => `<@${w}>`).join(', ')}! You won **${gw.prize}**!`);
    } else {
      await channel.send(`😢 No valid entries for **${gw.prize}**, no winners could be selected.`);
    }
  } catch (e) { console.error('Failed to announce giveaway end:', e.message); }

  timers.delete(String(giveawayId));
}

async function rescheduleAll(client) {
  const pending = await Giveaway.find({ ended: false }).catch(() => []);
  for (const gw of pending) {
    const remaining = new Date(gw.endsAt).getTime() - Date.now();
    if (remaining <= 0) endGiveaway(client, gw._id).catch(console.error);
    else scheduleEnd(client, gw._id, remaining);
  }
  console.log(`🔁 Rescheduled ${pending.length} pending giveaway(s)`);
}

module.exports = { createGiveaway, handleEnter, endGiveaway, rescheduleAll, parseDuration };
