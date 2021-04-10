const { jhudata } = require('./scrapers/jhuCSSE');
const log = require('./utils/log');
module.exports = {
    executeScraper: async () => {
        await Promise.all([
            jhudata('jhucsse'),
        ]);
        log.info('Finished JHU scraping!');
    },
};