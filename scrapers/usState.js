const axios = require('axios');
const cheerio = require('cheerio');
const { set } = require('../database');
const log = require('../utils/log');

// Get data value from cell
const parseNumberCell = (cell) => {
    const cellValue = cell.children.length !== 0 ? cell.children[0].data : '';
    return parseFloat(cellValue.replace(/[,+\-\s]/g, '') || null);
};

// convert to object
const processData = ($, yesterday = false) => {
    const table = $(yesterday ? 'table#usa_table_countries_yesterday' : 'table#usa_table_countries_today');
    const tableRows = table.children('tbody').children('tr:not(.total_row)').get();
    const stateColIndex = 1;
    const dataColIndexes = {
        cases: 2,
        todayCases: 3,
        deaths: 4,
        todayDeaths: 5,
        recovered: 6,
        active: 7,
        casesPerOneMillion: 8,
        deathsPerOneMillion: 9,
        tests: 10,
        testsPerOneMillion: 11,
        population: 12,
    };

    return tableRows.map((row) => {
        const cells = row.children.filter(el => el.name === 'td');
        const stateData = { state: cheerio(cells[stateColIndex]).text().replace(/\n/g, '').trim(), updated: Date.now() };
        Object.keys(dataColIndexes).forEach((property) => stateData[property] = parseNumberCell(cells[dataColIndexes[property]]));
        return stateData;
    });
};

// get data and prase to database
const getStates = async () => {
    let response;
    try {
        response = await axios.get('https://www.worldometers.info/coronavirus/country/us/');
    } catch(err) {
        log.err('Error: Request USstate failed!', err);
        return;
    }
    const $ = cheerio.load(response.data);
    const today = processData($);
    await set(`USToday`, today);
    log.info(`Update today states: ${today.length} states!`);

    const yesterday = processData($, true);
    await set(`USYesterday`, yesterday);
    log.info(`Updated yesterday states: ${yesterday.length} states.`);

};

module.exports = getStates;