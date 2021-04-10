const axios = require('axios');
const csv = require('csvtojson');
const log = require('../utils/log');
const base = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/';
const moment = require('moment');
const { set } = require('../database');

/**
 * Extract data from CSV row entry
 * @param { Object } loc CSV row from JHU repo
 * @returns { Object } data extracted from CSV row
 */

const extractData = (loc) => ({
    country: loc[3],
    province: loc[2] || null,
    county: loc[1] || null,
    updatedAt: loc[4],
    stats: {
        confirmed: parseInt(loc[7]),
        deaths: parseInt(loc[8]),
        recovered: parseInt(loc[9]),
    },
    coordinates: {
        latitude: loc[5],
        logitude: loc[6],
    },
});

/**
 * Set database full of today data
 * @param { string } keys
 */

const jhudata = async (key) => {
    let response;
    try {
        const dateString = moment().tz('America/Denver').subtract(1, 'days').format('MM-DD-YYYY');
        log.info(`USING ${dateString}.csv`);
        response = await axios.get(`${base}${dateString}.csv`);
        const parsed = await csv({
            noheader: true,
            output: 'csv',
        }).fromString(response.data);

        const result = parsed.splice(1).map(extractData);
        await set(key, result);
        log.info(`Updated JHU: ${result.length} locations`);
    }
    catch(err) {
        log.err('Error: Request JHU failed!', err);
        return;
    };
};

/**
 * Returns JHU data with US states summed over counties
 * @param 	{Object} 	data 	All JHU data retrieved from redis store
 * @returns {Array} 			All data objects from JHU set for today with states summed over counties
 */

const generalizedJHUdata = (data) => {
    const result = [];
    const statesResult = {};

    data.forEach((loc) => {
        const { province, ...defaultData } = loc;
        defaultData.province = province || null;

        if (loc.county !== null) {
            if (statesResult[loc.province]) {
                statesResult[loc.province].stats.confirmed += loc.stats.confirmed;
                statesResult[loc.province].stats.deaths += loc.stats.deaths;
                statesResult[loc.province].stats.recovered += loc.stats.recovered;
            } else { statesResult[loc.province] = defaultData; }
        } else result.push(defaultData);
    });
    Object.keys(statesResult).map((state) => result.push(statesResult[state]));
    return result;
};

/**
 * Filters JHU data to all counties
 * @param { object } data
 * @param { string }
 * @returns { Array }
 */

const getCounty = (data, county = null) =>
    county ? data.filter((loc) => loc.county !== null && loc.county.toLowerCase() === county)
           : data.filter((loc) => loc.county !== null);

module.exports = {
    jhudata,
    generalizedJHUdata,
    getCounty,
};