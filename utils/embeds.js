const { EmbedBuilder } = require('discord.js');
const config = require('../config');

function baseEmbed({ title, description, color, fields, thumbnail, image } = {}) {
  const embed = new EmbedBuilder()
    .setColor(color || config.COLOR_PRIMARY)
    .setFooter({ text: config.FOOTER });
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  return embed;
}

module.exports = { baseEmbed };
