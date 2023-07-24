const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');

const router = express.Router();

router.get('/status', AppController.status);
router.get('/stats', AppController.stats);
router.post('/users', UsersController.postNew);

module.exports = router;
