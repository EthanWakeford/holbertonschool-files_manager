const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AuthController {
  static async getConnect(request, response) {
    const auth = request.headers.authorization;
    if (!auth) return response.status(401).json({ error: 'Unauthorized' });

    const buffer = Buffer.from(auth.split(' ')[1], 'base64');
    const [email, password] = buffer.toString('utf-8').split(':');
    if (!email || !password) return response.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ email, password: sha1(password) });
    if (!user) return response.status(401).json({ error: 'Unauthorized' });

    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
    return response.json({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(`auth_${token}`);
    return response.status(204).end();
  }
}

module.exports = AuthController;
