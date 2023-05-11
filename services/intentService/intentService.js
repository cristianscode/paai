const SetupService = require("./intents/setup");
const ReminderService = require("./intents/reminders");
module.exports = {
    intentService: {
        SetupService,
        ReminderService
    }
}