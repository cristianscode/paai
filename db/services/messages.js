// Save the received message in the database
async function saveMessage(conn, conversationId, messageType, messageContent) {
    await conn.query('INSERT INTO Messages (conversation_id, message_type, content) VALUES (?, ?, ?)', [conversationId, messageType, messageContent]);
}

module.exports = {
    saveMessage
}