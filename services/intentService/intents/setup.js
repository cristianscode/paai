const { utils } = require("../../utils");
const { db } = require("../../../db/db");

async function handleSetup(conn, messageContent, user, conversation, req) {
    if (user['name'] == null) return handleName(conn, messageContent, user, conversation, req);
    else if (user['timezone'] == null) return handleTimezone(conn, messageContent, user, conversation, req);
}

async function handleTimezone(conn, messageContent, user, conversation, req) {
    user['timezone'] = utils.getTimezoneByZip(req.body['FromZip']);
    if (conversation.state == "ASK_TIMEZONE") {
        if (messageContent.toLowerCase() === 'yes') {
            // Save the user's timezone in the Configurations table or update the user's record
            await conn.query('INSERT INTO Configurations (user_id, config_key, config_value) VALUES (?, ?, ?)', [user['User_ID'], 'timezone', user['timezone']]);

            // Update the conversation state to 'NORMAL'
            await conn.query('UPDATE Conversations SET state = ? WHERE conversation_id = ?', [null, conversation['Conversation_ID']]);
            return "Great! Your timezone is saved. Please continue to set your reminders.";
        } else if (messageContent.toLowerCase() === 'no') {
            // Ask the user to provide their current time
            await db.ConversationService.setConversationState(conn, conversation['Conversation_ID'], 'ASK_TIME');
            return "Please provide your zip code to determine timezone.";
        } else {
            return "Please answer 'yes' or 'no' to confirm your current time.";
        }
    } else if (conversation.state === 'ASK_TIME') {
        // Parse the user's message to extract the current time, save the timezone, and update the conversation state
        const zipCode = messageContent.trim();
        if (/^\d{5}$/.test(zipCode)) {
            try {
                user['timezone'] = utils.getTimezoneByZip(zipCode);

                // Save the user's timezone in the Configurations table or update the user's record
                await conn.query('INSERT INTO Configurations (user_id, config_key, config_value) VALUES (?, ?, ?)', [user['User_ID'], 'timezone', user['timezone']]);

                // Update the conversation state to 'NORMAL'
                await conn.query('UPDATE Conversations SET state = ? WHERE conversation_id = ?', [null, conversation['Conversation_ID']]);
                return `Thank you, your timezone (${user['timezone']}) has been updated based on your provided zip code. Please continue to set your reminders.`;
            } catch (error) {
                console.error('Error getting timezone:', error);
                return "Sorry, we couldn't determine your timezone based on the provided zip code. Please try again.";
            }
        } else {
            return "Please provide a valid 5-digit zip code.";
        }
    } else {
        await db.ConversationService.setConversationState(req.conn, conversation['Conversation_ID'], "ASK_TIMEZONE");
        return "Welcome " + user['name'] + ", is your current time " + utils.getTimeByTZ(user['timezone']) + "?";
    }
}

async function handleName(conn, messageContent, user, conversation, req) {
    if (conversation.state == "ASK_NAME") {
        await conn.query('UPDATE Conversations SET state = ? WHERE conversation_id = ?', [null, conversation['Conversation_ID']]);
        user['name'] = messageContent.trim();
        await conn.query('INSERT INTO Configurations (user_id, config_key, config_value) VALUES (?, ?, ?)', [user['User_ID'], 'name', user['name']]);
        return await handleTimezone(conn, messageContent, user, conversation, req);
    } else {
        await db.ConversationService.setConversationState(req.conn, conversation['Conversation_ID'], "ASK_NAME");
        return "Welcome, my name is Paai! What's your name?";
    }
}

module.exports = SetupService = {
    handleSetup
}