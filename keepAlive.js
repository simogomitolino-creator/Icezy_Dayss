const express = require('express');

function keepAlive() {
  const app = express();
  app.get('/', (req, res) => res.send('iDayss x IcezyBrawlMartBOT is alive! ✅'));
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🌐 Keep-alive web server running on port ${port}`));
}

module.exports = { keepAlive };
