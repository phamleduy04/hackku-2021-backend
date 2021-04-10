const router = require('express').Router();
const { get } = require('../database');
const { getCounty } = require('../scrapers/jhuCSSE');

router.get('/', async (req, res) => {
    const data = await get('jhucsse');
    res.status(200).json(data);
});

router.get('/:county', async (req, res) => {
    const data = await get('jhucsse');
    const { county } = req.params;
    console.log(req.params);
    const countryData = {};
    countryData[county] = getCounty(data, county);
    if (countryData[county].length === 0) delete countryData[county];

    if (countryData.length > 0 || Object.keys(countryData).length > 0) res.status(200).json(countryData);
    else res.status(404).json({ message: 'County not found!' });

});

module.exports = router;