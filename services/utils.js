const { ZipToTz } = require('zip-to-timezone');
const moment = require('moment-timezone');

function getTimezoneByZip(zip) {
    return new ZipToTz().full(zip)
}

function getTimeByTZ(timezone) {
    return moment().tz(timezone).format('hh:mm a')
}

function extractTime(dateString) {
    const date = new Date(dateString);
    const time = date.toISOString().split('T')[1].split('.')[0];
    return time;
}

function witDateTimeToCronExpression(witDateTime) {
    if (!witDateTime || !witDateTime.value) {
        return null;
    }

    const date = new Date(witDateTime.value);

    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = '*';

    const cronExpression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
    return cronExpression;
}

module.exports = {
    utils: {
        extractTime,
        witDateTimeToCronExpression,
        getTimezoneByZip,
        getTimeByTZ
    }
}