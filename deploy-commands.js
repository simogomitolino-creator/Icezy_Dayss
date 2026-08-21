require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
  try {
    if (!config.CLIENT_ID) throw new Error('CLIENT_ID non trovato');
    console.log(`Caricamento di ${commands.length} comandi slash...`);

    if (config.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
      console.log(`Comandi caricati nel server ${config.GUILD_ID}!`);
    } else {
      await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
      console.log('Comandi caricati globalmente!');
    }
  } catch (err) {
    console.error('Errore durante il deploy:', err);
  }
})();