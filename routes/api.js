const router = require('express').Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { getCountryData } = require('../utils/utils');
const log = require('../utils/log');

router.get('/:country', async (req, res) => {
    const { country } = req.params;
    const countryInfo = getCountryData(country);
    if (!countryInfo.woh) return res.status(404).json({ message: 'Found on worldometers but dont have website!' });
    const response = await axios.get(`https://www.worldometers.info/coronavirus/country/${countryInfo.woh}`);
    const $ = cheerio.load(response.data);
    const html = $('.col-md-8').eq(2).find('script').eq(0).html();
    if (html) return res.status(200).send(html.toString());
    log.warn('html is empty');
    return res.status(500).send('Internel server error');
});

module.exports = router;