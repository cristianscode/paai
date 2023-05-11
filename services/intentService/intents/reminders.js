const { witClient } = require("../../wit-ai");
const { twilio } = require("../../twilio");
const { utils } = require("../../utils");
const { db } = require("../../../db/db");
const cron = require('node-cron');

async function handleReminder(conn, messageContent, user, conversation) {
    if (conversation.state == "MENU_REMINDERS") {
        const menuOption = parseInt(messageContent.trim());
        if (!isNaN(menuOption)) {
            switch (menuOption) {
                case 1:
                    await db.ConversationService.setConversationState(conn, conversation['Conversation_ID'], 'MENU_REMINDERS_SCHEDULE');
                    return "What would you like to be reminded?";
                default:
                    return "Invalid menu option. Please enter a valid number.";
            }
        } else {
            return "Invalid input. Please enter the number of the option you'd like to select.";
        }
    } else {
        if (conversation.state.startsWith("MENU_REMINDERS_SCHEDULE")) return await handleScheduling(conn, messageContent, user, conversation)
    }
}

async function handleScheduling(conn, messageContent, user, conversation) {
    const response = await witClient.message(messageContent, {
        timezone: user['timezone']
    });
    try {
        const intent = response.intents[0].name;
        const entities = response.entities;
        if (intent == 'schedule_reminder') {
            if (!entities["wit$datetime:datetime"]) return "Please include a time and modify your reminder?";
            else if (!entities["wit$reminder:reminder"]) return "What would you like to be reminded?";
            else {
                await conn.query('INSERT INTO Reminders (User_ID, Title, Description, Time, Next_Execution, Recurrence_Pattern) VALUES (?, ?, ?, ?, ?, ?)', [user["User_ID"], "Reminder to " + entities["wit$reminder:reminder"][0].value, response.text, utils.extractTime(entities["wit$datetime:datetime"][0].value), entities["wit$datetime:datetime"][0].value, entities['recurrence:recurrence'] ? entities['recurrence:recurrence'][0].value : null]);

                // Schedule tasks to be run on the server.
                cron.schedule(utils.witDateTimeToCronExpression(entities["wit$datetime:datetime"][0]), function() {
                    twilio.sendMessageToPhoneNumber(user['Phone_Number'], "This is your friendly reminder to " + entities["wit$reminder:reminder"][0].value)
                }, {
                    timezone: user['timezone'],
                    scheduled: true
                });
                await db.ConversationService.setConversationState(conn, conversation['Conversation_ID'], null);

                return "A reminder to " + entities["wit$reminder:reminder"][0].value + " was set";
            }
        } else {
            return "I'm not sure I understand, here's an example of how to set a reminder: \nCan you remind me to take my medicine everyday at 1pm?"
        }
    } catch (error) {
        console.log(error)
        return "I'm not sure I understand, here's an example of how to set a reminder: \nCan you remind me to take my medicine everyday at 1pm?"
    }
}

module.exports = ReminderService = {
    handleReminder
}