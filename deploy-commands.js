const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
  try {
    if (!config.CLIENT_ID) throw new Error('CLIENT_ID is missing in your .env file');
    console.log(`🚀 Deploying ${commands.length} slash command(s)...`);

    if (config.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
      console.log(`✅ Deployed instantly to guild ${config.GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
      console.log('✅ Deployed globally (may take up to 1 hour to appear everywhere)');
    }
  } catch (err) {
    console.error('❌ Failed to deploy commands:', err);
  }
})();
