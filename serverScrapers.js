const { executeScraper } = require('./instances');
const ms = require('ms');
executeScraper();

setInterval(executeScraper, ms('10m'));