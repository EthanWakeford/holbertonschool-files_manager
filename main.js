const express = require('express');
const dbClient = require('./utils/db');
const router = require('./routes/index');

const app = express();

app.use(express.json());

app.use('/', router);

const waitConnection = () => {
    return new Promise((resolve, reject) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                i += 1;
                if (i >= 10) {
                    reject()
                }
                else if (!dbClient.isAlive()) {
                    repeatFct()
                }
                else {
                    resolve()
                }
            }, 1000);
        };
        repeatFct();
    })
};

waitConnection()
    .then(() => {
        app.listen(5000, () => {
            console.log('Server is running at port 5000');
        });
    })
    .catch(() => {
        console.error('Cannot connect to database');
        process.exit(1);
    });
