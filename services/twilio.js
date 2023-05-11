const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = twilio(accountSid, authToken);

async function sendMessageToPhoneNumber(phoneNumber, messageContent) {
    const fromPhoneNumber = twilioPhone; // Replace with your Twilio phone number
    await twilioClient.messages.create({
        body: messageContent,
        from: fromPhoneNumber,
        to: phoneNumber
    });
}

module.exports = {
    twilio: {
        sendMessageToPhoneNumber
    }
}