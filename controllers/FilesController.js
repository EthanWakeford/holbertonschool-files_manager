const mongo = require('mongodb');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const mime = require('mime-types');
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
      const project = new mongo.ObjectID(parentId);
      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: project });

      if (!file) return res.status(400).json({ error: 'Parent not found' });

      if (file && file.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
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

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: new mongo.ObjectId(id) });

    if (!file) return res.status(404).json({ error: 'Not found' });
    if (userId !== file.userId.toString()) return res.status(404).json({ error: 'Not found' });

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { parentId, page = 0 } = req.params;

    let files;

    if (parentId) {
      files = await dbClient.db
        .collection('files')
        .aggregate([
          { $match: { parentId: new mongo.ObjectID(parentId) } },
          { $skip: page * 20 },
          { $limit: 20 },
        ])
        .toArray();
    } else {
      files = await dbClient.db
        .collection('files')
        .aggregate([
          { $match: { userId: new mongo.ObjectID(userId) } },
          { $skip: page * 20 },
          { $limit: 20 },
        ])
        .toArray();
    }

    const returnFile = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));

    return res.status(200).send(returnFile);
  }

  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({ _id: new mongo.ObjectId(id), userId: new mongo.ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: new mongo.ObjectId(id) }, { $set: { isPublic: true } });

    file.isPublic = true;
    return res.status(200).json(file);
  }

  static async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({ _id: new mongo.ObjectId(id), userId: new mongo.ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: new mongo.ObjectId(id) }, { $set: { isPublic: false } });

    file.isPublic = false;
    return res.status(200).json(file);
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    const file = await dbClient.db.collection('files').findOne({ _id: new mongo.ObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && (!userId || file.userId.toString() !== userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);

    const fileContent = await fs.promises.readFile(file.filePath, { encoding: 'utf-8' });

    res.set('Content-Type', mimeType);
    return res.send(fileContent);
  }
}

module.exports = FilesController;
