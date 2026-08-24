const config = require('../config');

function labelFor(list, value) {
  const found = list.find((o) => o.value === value);
  return found ? found.label : (value || 'N/A');
}

// `d` = the order's `details` object (a spread of the wizard session)
function formatOrderDetails(product, d = {}) {
  switch (product) {
    case 'ranked':
      return [
        `Current Rank: **${d.currentrank || 'N/A'}**`,
        `Desired Rank: **${d.desiredrank || 'N/A'}**`,
        `Power 11 Brawlers: **${labelFor(config.POWER11_OPTIONS, d.power11)}**`,
      ].join('\n');
    case 'prestige':
      return `Spec: **${labelFor(config.PRESTIGE_OPTIONS, d.prestigespec)}**`;
    case 'matcherino':
      return `Brawlers: **${labelFor(config.MATCHERINO_OPTIONS, d.brawlercount)}**`;
    case 'winstreak':
      return [
        `Target: **${labelFor(config.WINSTREAK_OPTIONS, d.targetwinstreak)}**`,
        `Brawler Choice: **${d.whochooses === 'customer' ? 'Customer' : 'Booster'}**`,
      ].join('\n');
    default:
      return 'N/A';
  }
}

module.exports = { formatOrderDetails, labelFor };
