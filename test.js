const redisClient = require('./utils/redis');

console.log(redisClient.isAlive());
setTimeout(() => console.log(redisClient.isAlive()), 10000);
