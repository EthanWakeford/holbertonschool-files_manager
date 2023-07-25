const express = require('express');
const AppController = require('../controllers/AppController');

const router = express.Router();

router.get('/status', AppController.status);
router.get('/stats', AppController.stats);

module.exports = router;
