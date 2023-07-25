const express = require('express');
const routes = require('./routes/index');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use('/', routes);

app.listen(PORT, () => {
  console.log('express running on port', PORT);
});

module.exports = app;
