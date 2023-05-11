async function setConversationState(conn, conversation_id, state) {
    await conn.query('UPDATE Conversations SET state = ? WHERE conversation_id = ?', [state, conversation_id]);
}


// Check for an existing conversation within a specific time threshold
async function findConversationByUserAndThreshold(conn, userId, thresholdInHours) {
    const thresholdTimestamp = new Date();
    thresholdTimestamp.setHours(thresholdTimestamp.getHours() - thresholdInHours);

    const [result] = await conn.query(`
      SELECT * FROM Conversations
      WHERE user_id = ? AND updated_at >= ?
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId, thresholdTimestamp]);

    return result.length > 0 ? result[0] : null;
}

// If no conversation is found, create a new one
async function createNewConversation(conn, userId) {
    await conn.query('INSERT INTO Conversations (user_id) VALUES (?)', [userId]);
    const [result] = await conn.query('SELECT * FROM Conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    return result[0];
}

async function updateConversationTimestamp(conn, conversationId) {
    await conn.query('UPDATE Conversations SET updated_at = NOW() WHERE conversation_id = ?', [conversationId]);
}

module.exports = {
    setConversationState,
    findConversationByUserAndThreshold,
    createNewConversation,
    updateConversationTimestamp
}