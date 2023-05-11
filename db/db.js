const mysql = require('mysql2/promise');
const UserService = require('./services/users');
const ConfigurationService = require('./services/configurations');
const ConversationService = require('./services/conversations');
const MessageService = require('./services/messages');

// Configure MySQL connection
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const pool = mysql.createPool(dbConfig);

module.exports = {
    pool,
    db: {
        UserService,
        ConfigurationService,
        ConversationService,
        MessageService
    }
};