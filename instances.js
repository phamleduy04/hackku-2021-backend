const { jhudata } = require('./scrapers/jhuCSSE');
const getWorldOMeter = require('./scrapers/wordometers');
const getUSState = require('./scrapers/usState');
const log = require('./utils/log');

module.exports = {
    executeScraper: async () => {
        await Promise.all([
            jhudata(),
            getWorldOMeter(),
            getUSState(),
        ]);
        log.info('Finished JHU scraping!');
    },
};