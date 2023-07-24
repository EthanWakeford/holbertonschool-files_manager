const sha1 = require('sha1');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    const user = await dbClient.client.db().collection('users').findOne({ email });
    if (user) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }

    const hashedPassword = sha1(password);
    const newUser = {
      email,
      password: hashedPassword,
    };

    const userCreated = await dbClient.client.db().collection('users').insertOne(newUser);
    const createdUserInDb = await dbClient.client.db().collection('users').findOne({ _id: userCreated.insertedId });

    res.status(201).json({ id: createdUserInDb._id.toString(), email: createdUserInDb.email });
  }
}

module.exports = UsersController;
