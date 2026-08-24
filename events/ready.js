const { ActivityType } = require('discord.js');
const { rescheduleAll } = require('../handlers/giveawaySystem');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'Brawl Stars boosts | /setup', type: ActivityType.Watching }],
      status: 'online',
    });
    await rescheduleAll(client);
  },
};
