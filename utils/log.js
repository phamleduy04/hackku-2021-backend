const moment = require('moment-timezone');

const timeNow = () => moment().tz('America/Chicago').format("MM-DD-YYYY hh:mm:ss");
const msg = (func, message) => func(`[${timeNow()}] : ${message}`);

const err = (message = 'Unkown Err!', err) => {
    console.error({
        message: `${timeNow()} Error: ${message}`,
        error: err.message,
        stack: err.stack,
    });
};

const info = (message) => msg(console.info, message);

const warn = (message) => msg(console.warn, `WARNING -> ${message}`);


module.exports = {
    err,
    info,
    warn,
};