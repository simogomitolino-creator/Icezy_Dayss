require('dotenv').config();

module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  MONGODB_URI: process.env.MONGODB_URI,

  STAFF_ROLE_NAME: process.env.STAFF_ROLE_NAME || 'Staff',
  OWNER_ROLE_NAME: process.env.OWNER_ROLE_NAME || 'Owner',

  BRAND_NAME: 'iDayss × IcezyBrawlMartBOT',
  FOOTER: 'Powered by Iceyz BrawlMart™',

  // Colors (dark purple / electric blue theme, matching the reference screenshots)
  COLOR_PRIMARY: 0x8B2FE0, // purple
  COLOR_BLUE: 0x3B82F6,    // electric blue
  COLOR_SUCCESS: 0x2ECC71,
  COLOR_DANGER: 0xE74C3C,
  COLOR_WARNING: 0xF1C40F,

  // Category where ticket channels are created
  TICKET_CATEGORY_NAME: process.env.TICKET_CATEGORY_NAME || 'Tickets',
  // Channel where completed order proofs get posted (your server calls it "proofs")
  COMPLETED_JOBS_CHANNEL: process.env.PROOFS_CHANNEL_NAME || 'proofs',
  CUSTOMER_VOUCHES_CHANNEL: process.env.VOUCHES_CHANNEL_NAME || 'customer-vouches',

  // Payment methods. `emojiName` = the name of the CUSTOM EMOJI to look for in your server
  // (upload an emoji with that exact name and the bot will use it automatically).
  // `fallback` = unicode emoji used if no matching custom emoji is found in the server.
  PAYMENT_METHODS: [
    { label: 'PayPal', value: 'paypal', emojiName: 'paypal', fallback: '💳' },
    { label: 'Revolut Jr', value: 'revolutjr', emojiName: 'revolutjr', fallback: '🇷' },
    { label: 'Venmo', value: 'venmo', emojiName: 'venmo', fallback: '💠' },
    { label: 'Cashapp', value: 'cashapp', emojiName: 'cashapp', fallback: '💵' },
    { label: 'Wise', value: 'wise', emojiName: 'wise', fallback: '🌍' },
    { label: 'Apple Pay', value: 'applepay', emojiName: 'applepay', fallback: '🍎' },
    { label: 'Zelle', value: 'zelle', emojiName: 'zelle', fallback: '🏦' },
    { label: 'Binance', value: 'binance', emojiName: 'binance', fallback: '🟡' },
    { label: 'Revolut', value: 'revolut', emojiName: 'revolut', fallback: '🇷' },
    { label: 'Chime', value: 'chime', emojiName: 'chime', fallback: '💚' },
    { label: 'Skrill', value: 'skrill', emojiName: 'skrill', fallback: '🟣' },
    { label: 'BitCoin', value: 'bitcoin', emojiName: 'bitcoin', fallback: '₿' },
    { label: 'Litecoin', value: 'litecoin', emojiName: 'litecoin', fallback: 'Ł' },
    { label: 'Ethereum', value: 'ethereum', emojiName: 'ethereum', fallback: 'Ξ' },
    { label: 'Solana', value: 'solana', emojiName: 'solana', fallback: '◎' },
    { label: 'Tether', value: 'tether', emojiName: 'tether', fallback: '🟢' },
    { label: 'Bank Trasfer Portal', value: 'banktransfer', emojiName: 'banktransfer', fallback: '🏛️' },
  ],

  // Payment methods that require staff to manually input info / proxy via Heatz
  PROXY_PAYMENT_METHODS: ['zelle', 'wise', 'banktransfer', 'revolut', 'revolutjr'],

  // Full rank ladder used for Ranked Boost, in order (low -> high)
  RANKS: [
    { label: 'Bronze I', emoji: '🥉' }, { label: 'Bronze II', emoji: '🥉' }, { label: 'Bronze III', emoji: '🥉' },
    { label: 'Silver I', emoji: '⚪' }, { label: 'Silver II', emoji: '⚪' }, { label: 'Silver III', emoji: '⚪' },
    { label: 'Gold I', emoji: '🥇' }, { label: 'Gold II', emoji: '🥇' }, { label: 'Gold III', emoji: '🥇' },
    { label: 'Diamond I', emoji: '💎' }, { label: 'Diamond II', emoji: '💎' }, { label: 'Diamond III', emoji: '💎' },
    { label: 'Mythic I', emoji: '🔮' }, { label: 'Mythic II', emoji: '🔮' }, { label: 'Mythic III', emoji: '🔮' },
    { label: 'Legendary I', emoji: '🔴' }, { label: 'Legendary II', emoji: '🔴' }, { label: 'Legendary III', emoji: '🔴' },
    { label: 'Masters I', emoji: '⭐' }, { label: 'Masters II', emoji: '⭐' }, { label: 'Masters III', emoji: '⭐' },
    { label: 'Pro', emoji: '🏆' },
  ],
  // Cost (in $) to climb from rank[i] to rank[i+1]. Edit freely to match your real prices.
  RANK_STEP_COSTS: [
    0.5, 0.5, 0.75, 0.75, 0.75, 1, 1, 1.5, 2, 2, 2.5, 3, 4, 5, 6, 8, 10, 15, 30, 60, 80,
  ],
  RANK_MIN_PRICE: 5,

  PRESTIGE_OPTIONS: [
    { label: 'Prestige 1 → Prestige 2', value: 'p1_p2', emoji: '⭐', price: 34.99 },
    { label: 'Prestige 2 → Prestige 3', value: 'p2_p3', emoji: '🏆', price: 90 },
  ],

  MATCHERINO_OPTIONS: [
    { label: '60-70 Brawlers (~$290)', value: '60_70', price: 290 },
    { label: '70-80 Brawlers (~$270)', value: '70_80', price: 270 },
    { label: '80-90 Brawlers (~$250)', value: '80_90', price: 250 },
    { label: '90+ Brawlers (~$250)', value: '90_plus', price: 250 },
  ],

  WINSTREAK_OPTIONS: [
    { label: '50 wins ($23 base)', value: '50', price: 23 },
    { label: '69 wins ($33 base)', value: '69', price: 33 },
    { label: '101 wins ($51 base)', value: '101', price: 51 },
    { label: '111 wins ($63 base)', value: '111', price: 63 },
    { label: '125 wins ($77 base)', value: '125', price: 77 },
    { label: '200 wins ($150 base)', value: '200', price: 150 },
  ],
  WINSTREAK_BRAWLER_CHOICE_SURCHARGE: 5,

  POWER11_OPTIONS: [
    { label: '0-10', value: '0_10' }, { label: '11-20', value: '11_20' },
    { label: '21-30', value: '21_30' }, { label: '31-40', value: '31_40' },
    { label: '41-50', value: '41_50' }, { label: '51-60', value: '51_60' },
    { label: '61-70', value: '61_70' }, { label: '71+', value: '71_plus' },
  ],

  PRODUCT_META: {
    ranked: { name: 'Ranked Boost', emoji: '🥊', buttonLabel: 'Get Your Rank Upgraded', hasServiceType: true },
    prestige: { name: 'Prestige Boost', emoji: '🛡️', buttonLabel: 'Get Your Prestige', hasServiceType: true },
    matcherino: { name: 'Matcherino Boost', emoji: '🎗️', buttonLabel: 'Get Your Matcherino', hasServiceType: false },
    winstreak: { name: 'Winstreak Boost', emoji: '🔥', buttonLabel: 'Get Your Longest Winstreak', hasServiceType: false },
  },
};
