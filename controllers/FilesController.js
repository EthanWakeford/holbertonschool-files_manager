const mongo = require('mongodb');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });
    if (parentId !== 0) {
      const file = dbClient.db.collection('files').findOne({ parentId });

      if (!file) return res.status(400).json({ error: 'Parent not found' });
      if (file.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    let newFile;
    if (type === 'folder') {
      newFile = await dbClient.db.collection('files').insertOne({
        userId: new mongo.ObjectId(userId),
        name,
        type,
        isPublic,
        parentId,
      });
    } else {
      const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH);
      }

      const filePath = `${FOLDER_PATH}/${uuid()}`;
      const decodedData = Buffer.from(data, 'base64').toString('utf-8');

      await fs.promises.writeFile(filePath, decodedData);

      newFile = await dbClient.db.collection('files').insertOne({
        userId: new mongo.ObjectId(userId),
        name,
        type,
        isPublic,
        parentId,
        filePath,
      });
    }

    return res.status(201).send({
      id: newFile.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }
}

module.exports = FilesController;
