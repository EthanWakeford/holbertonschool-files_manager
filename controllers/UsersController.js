import sha1 from 'sha1';
import Bull from 'bull';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const MISSINGEMAIL = 'Missing email';
const MISSINGPASSWORD = 'Missing password';
const ALREADYEXIST = 'Already exist';
const USERSCOLLECTION = 'users';
const UNAUTHORIZED = 'Unauthorized';
const TOKEN = 'x-token';

class UsersController {
  static async postNew(req, res) {
    const userQueue = new Bull('userQueue');
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: MISSINGEMAIL });
      return;
    }

    if (!password) {
      res.status(400).json({ error: MISSINGPASSWORD });
      return;
    }

    const existingUser = await dbClient.db.collection(USERSCOLLECTION).findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: ALREADYEXIST });
      return;
    }

    const hashedPassword = sha1(password);
    const newUser = { email, password: hashedPassword };
    const result = await dbClient.db.collection(USERSCOLLECTION).insertOne(newUser);
    newUser.id = result.ops[0]._id;

    userQueue.add({ userId: newUser.id });

    res.status(201).json({ newUser });
  }

  static async getMe(req, res) {
    const token = req.headers[TOKEN];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      res.status(401).json({ error: UNAUTHORIZED });
      return;
    }

    const user = await dbClient.db.collection(USERSCOLLECTION).findOne({ _id: ObjectId(userId) });
    if (!user) {
      res.status(401).json({ error: UNAUTHORIZED });
      return;
    }

    res.json({ id: user._id, email: user.email });
  }
}

export default UsersController;
