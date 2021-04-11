const router = require('express').Router();
const { get } = require('../database');
const { getCounty } = require('../scrapers/jhuCSSE');
const { getCountryHistorical } = require('../scrapers/historical');

// get all data
router.get('/', async (req, res) => {
    const data = await get('jhucsse');
    res.status(200).json(data);
});

// get specific county in US
router.get('/county/:county', async (req, res) => {
    const data = await get('jhucsse');
    const { county } = req.params;
    const countyData = {};
    countyData[county] = getCounty(data, county);
    if (countyData[county].length === 0) delete countyData[county];
    if (countyData.length > 0 || Object.keys(countyData).length > 0) res.status(200).json(countyData);
    else res.status(404).json({ message: 'County not found!' });
});

// get all historical data
router.get('/historical', async (req, res) => {
    const data = await get('jhuHistorical');
    return res.status(200).json(data);
});

// get historical data in a specific country
router.get('/historical/:countryname', async (req, res) => {
    const data = await get('jhuHistorical');
    const { countryname } = req.params;
    const { lastdays } = req.query;
    const countryData = getCountryHistorical(data, countryname, null, lastdays);
    if (countryData) return res.status(200).json(countryData);
    else res.status(404).json({ message: 'Country not found!' });
});

module.exports = router;