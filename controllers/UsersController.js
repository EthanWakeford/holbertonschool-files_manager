const sha1 = require('sha1');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;
    if (!email) return response.status(400).json({ error: 'Missing email' });
    if (!password) return response.status(400).json({ error: 'Missing password' });

    const user = await dbClient.db.collection('users').findOne({ email });
    if (user) return response.status(400).json({ error: 'Already exist' });

    await dbClient.db.collection('users').insertOne({ email, password: sha1(password) });
    const newUser = await dbClient.db.collection('users').findOne({ email });

    return response.status(201).json({ id: newUser._id, email });
  }

  static async getMe(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return response.status(401).json({ error: 'Unauthorized' });

    return response.json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
