const router = require('express').Router();
const { get } = require('../database');
const { getCounty } = require('../scrapers/jhuCSSE');

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

module.exports = router;