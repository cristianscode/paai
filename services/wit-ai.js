const { Wit, log } = require('node-wit');
const accessToken = process.env.WIT_AI_ACCESS_TOKEN;

const witClient = new Wit({
    accessToken,
    logger: new log.Logger(log.DEBUG),
});

module.exports = {
    witClient
}