const express = require('express');
const app = express();

function keepAlive() {
  app.get('/', (req, res) => {
    res.send('Bot attivo 24/7!');
  });

  const PORT = process.env.PORT || 10000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server HTTP attivo ed ascolto sulla porta ${PORT}`);
  });
}

module.exports = { keepAlive };