// Looks up a custom emoji uploaded to the guild by name (case-insensitive).
// Upload an emoji named e.g. "paypal" to your server and the bot will use it automatically
// everywhere a PayPal icon is shown. If no matching custom emoji exists, a unicode fallback is used.

function findGuildEmoji(guild, name) {
  if (!guild || !name) return null;
  return guild.emojis.cache.find((e) => e.name && e.name.toLowerCase() === name.toLowerCase()) || null;
}

// For use in .setEmoji() on buttons / select menu options (needs an object or unicode string)
function emojiForComponent(guild, method) {
  const found = findGuildEmoji(guild, method.emojiName);
  if (found) return { id: found.id, name: found.name, animated: found.animated };
  return method.fallback;
}

// For use inside embed/message text (needs the <:name:id> markdown, or plain unicode)
function emojiForText(guild, method) {
  const found = findGuildEmoji(guild, method.emojiName);
  if (found) return `<${found.animated ? 'a' : ''}:${found.name}:${found.id}>`;
  return method.fallback;
}

module.exports = { findGuildEmoji, emojiForComponent, emojiForText };
