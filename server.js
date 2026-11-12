// Local server: serves the page from /public and the API from src/app.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const app = require('./src/app');
const { connect } = require('./src/db');

app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Risk register running at http://localhost:' + port);
  connect()
    .then(() => console.log('MongoDB connected'))
    .catch((e) => console.error('MongoDB connection failed:', e.message));
});
