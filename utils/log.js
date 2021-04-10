const msg = (func, message) => func(`[${new Date().toISOString()}] : ${message}`);

const err = (message = 'Unkown Err!', err) => {
    console.error({
        message: `${new Date().toISOString()} Error: ${message}`,
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