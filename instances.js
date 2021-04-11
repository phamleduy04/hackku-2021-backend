/* eslint-disable no-inline-comments */
/* eslint-disable no-trailing-spaces */
const { jhudata } = require('./scrapers/jhuCSSE');
const getWorldOMeter = require('./scrapers/wordometers');
const getUSState = require('./scrapers/usState');
const { processHistorical } = require('./scrapers/historical');
const log = require('./utils/log');

module.exports = {
    executeScraper: async () => {
        await Promise.all([
            jhudata(), // DatabaseID: jhucsse
            getWorldOMeter(), // DatabaseID: womToday/womYesterday
            getUSState(), // DatabaseID: USToday/USYesterday
            processHistorical(), // DatabaseID: jhuHistorical
        ]);
        log.info('Finished JHU scraping!');
    },
};