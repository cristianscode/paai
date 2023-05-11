require('dotenv').config();
const { pool, db } = require("./db/db");
const { twilio } = require("./services/twilio");
const { intentService } = require("./services/intentService/intentService");

// app configurations
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(compression());
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// app configurations end

const withConnection = (handler) => async(req, res, next) => {
    try {
        req.conn = await pool.getConnection();
        await handler(req, res, next);
    } catch (err) {
        next(err);
    } finally {
        if (req.conn) req.conn.release();
    }
}

app.post('/webhook', withConnection(async(req, res) => {
    const senderPhoneNumber = req.body['From'];
    const messageContent = req.body['Body'];

    const user = await db.UserService.findOrCreateUserByPhoneNumber(req.conn, senderPhoneNumber);

    const thresholdInHours = 24;
    const conversation = await db.ConversationService.findConversationByUserAndThreshold(req.conn, user['User_ID'], thresholdInHours);

    const currentConversation = conversation || await db.ConversationService.createNewConversation(req.conn, user['User_ID']);

    await db.MessageService.saveMessage(req.conn, currentConversation['Conversation_ID'], 'incoming', messageContent);

    const responseMessage = await processMessage(req.conn, messageContent, user, currentConversation, req);

    await db.MessageService.saveMessage(req.conn, currentConversation['Conversation_ID'], 'outgoing', responseMessage);

    await twilio.sendMessageToPhoneNumber(senderPhoneNumber, responseMessage);

    await db.ConversationService.updateConversationTimestamp(req.conn, currentConversation['Conversation_ID']);

    res.status(200).send('Message processed');
}));

// Process the message and send a response
async function processMessage(conn, messageContent, user, conversation, req) {
    try {
        // *TODO: This should be a function like getUserConfigurations or i should include these when fetching user to begin with
        user['timezone'] = await db.ConfigurationService.getConfigByKey(req.conn, 'Timezone', user['User_ID']);
        user['name'] = await db.ConfigurationService.getConfigByKey(req.conn, 'Name', user['User_ID']);

        if (user['name'] == null || user['timezone'] == null) return await intentService.SetupService.handleSetup(conn, messageContent, user, conversation, req);
        else if (conversation.state === 'MENU') {
            const menuOption = parseInt(messageContent.trim());
            if (!isNaN(menuOption)) {
                switch (menuOption) {
                    case 1:
                        await db.ConversationService.setConversationState(conn, conversation['Conversation_ID'], 'MENU_REMINDERS');
                        return "Reminders:\n\n1. Schedule reminder\n2. Manage reminders\n3. Sync with external services";
                    default:
                        return "Invalid menu option. Please enter a valid number.";
                }
            } else {
                return "Invalid input. Please enter the number of the option you'd like to select.";
            }
        } else if (conversation.state && conversation.state.startsWith('MENU_')) {
            // Handle specific menu option logic here
            // For example, in the 'MENU_REMINDERS' state, you can check for the user's input to schedule or manage reminders
            if (conversation.state.startsWith("MENU_REMINDERS")) return await intentService.ReminderService.handleReminder(conn, messageContent, user, conversation);
            await db.ConversationService.setConversationState(conn, conversation['Conversation_ID'], null);
        } else {
            // If not in any specific state, show the main menu -> Allow to choose menu or use shortcuts
            await db.ConversationService.setConversationState(conn, conversation['Conversation_ID'], 'MENU');
            return "Main Menu:\n1. Reminders";
        }
    } catch (error) {
        console.error('Error processing message:', error);
        return `You said: ${messageContent}`;
    }
}


app.use((err, req, res, next) => {
    res.status(500).send('An error occurred');
});

app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});



/*
Commands
-------------------
/ask  {prompt}  ->  Trigger chatgpt
/imagine {prompt} -> Trigger an image generation
/meme  ->  Returns a meme
/joke   -> Returns a joke
/education -> They want to learn something? Can learn a new laungage, quick math problem, etc
/news -> Trigger news and allow them to subscribe to categories
/read -> Give them something to read 
/menu   ->  1.  Reminders or /reminders
                                        ->  Schedule Reminder    *after scheduling a reminder at the end remind them they can use short cuts to avoid the hassle
                                                                    -> Set a one-time reminder
                                                                    -> Set a recurring reminder (daily, weekly, monthly, etc.)
                                                                    -> Set reminders for specific days of the week
                                                                    -> Set reminders with specific start and end dates
                                                                                        -> "What would you like to be reminded"
                                                                                        -> "Is this a recurring reminder?" -> Yes? -> 2.a "How often would you like to be reminded?""
                                                                                        -> "What time would you like to be reminded"
                                                                                        -> Reminder scheduled
                                        
                                        ->  Manage Reminders    
                                                                    -> View a list of upcoming reminders
                                                                    -> View a list of past reminders
                                                                    -> Edit existing reminders (change time, message, or recurrence)
                                                                    -> Delete or cancel reminders

                                        ->  Sync with external services:
                                                                    -> Integrate with calendar services (Google Calendar, Outlook, etc.)
                                                                    -> Sync with task management apps (Todoist, Trello, etc.)

            2. Meetings or /meetings
                                        -> Schedule a Meeting
                                                                    -> Set a one-time meeting
                                                                    -> Set a recurring meeting (daily, weekly, monthly, etc.)
                                                                    -> Choose the duration of the meeting
                                                                    -> Set reminders for upcoming meetings
                                    
                                        -> Manage Meetings
                                                                    -> View a list of upcoming meetings
                                                                    -> View a list of past meetings
                                                                    -> Edit existing meetings (change time, duration, attendees, etc.)
                                                                    -> Cancel or delete meetings
                                                                    -> Export meetings to a calendar (Google Calendar, Outlook, etc.)

                                        -> Invite Attendees
                                                                    -> Select Meeting
                                                                                        -> Add attendees by email or phone number
                                                                                        -> Send meeting invitations with RSVP options
                                                                                        -> Track attendee responses (accepted, declined, tentative)
                                                                                        -> Send follow-up messages or reminders to attendees                                                                    
            8. Account
                                        -> 
                                        -> Preferences
                                        -> Subscriber/Unsubscribe

            9. Help                     
                                        -> Tutorials
                                        -> Shortcuts
                                        -> Customer Support      
                                        
                                        




Plan
--------------
Roll out only reminders and as features are coming out text users "*New Feature Alert*: Are you interested in scheduling meetings? Yes or no". If no then I'd disable it and they
can always reable through account settings. when disabled I'd say "The feature has been diabled, if you want to renable it access your preferences"
*/