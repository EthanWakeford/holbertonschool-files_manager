const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static status(req, res) {
    return res
      .status(200)
      .json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async stats(req, res) {
    const nbUsers = await dbClient.nbUsers();
    const nbFiles = await dbClient.nbFiles();

    return res.status(200).json({ users: nbUsers, files: nbFiles });
  }
}

module.exports = AppController;
