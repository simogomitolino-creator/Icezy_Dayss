const config = require('../config');

function rankIndex(label) {
  return config.RANKS.findIndex((r) => r.label === label);
}

function calcRankedPrice(currentRankLabel, desiredRankLabel) {
  const from = rankIndex(currentRankLabel);
  const to = rankIndex(desiredRankLabel);
  if (from === -1 || to === -1 || to <= from) return config.RANK_MIN_PRICE;
  let total = 0;
  for (let i = from; i < to; i++) total += config.RANK_STEP_COSTS[i];
  return Math.max(Math.round(total * 100) / 100, config.RANK_MIN_PRICE);
}

function calcPrestigePrice(specValue) {
  const opt = config.PRESTIGE_OPTIONS.find((o) => o.value === specValue);
  return opt ? opt.price : 0;
}

function calcMatcherinoPrice(rangeValue) {
  const opt = config.MATCHERINO_OPTIONS.find((o) => o.value === rangeValue);
  return opt ? opt.price : 0;
}

function calcWinstreakPrice(targetValue, brawlerChoice) {
  const opt = config.WINSTREAK_OPTIONS.find((o) => o.value === targetValue);
  let price = opt ? opt.price : 0;
  if (brawlerChoice === 'customer') price += config.WINSTREAK_BRAWLER_CHOICE_SURCHARGE;
  return price;
}

function applyServiceMultiplier(price, serviceType) {
  return serviceType === 'carry' ? Math.round(price * 2 * 100) / 100 : price;
}

module.exports = {
  rankIndex,
  calcRankedPrice,
  calcPrestigePrice,
  calcMatcherinoPrice,
  calcWinstreakPrice,
  applyServiceMultiplier,
};
