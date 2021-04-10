const router = require('express').Router();
const { get } = require('../database');
const { wordsStandardize, getCountryData } = require('../utils/utils');

// get all data
router.get('/', async (req, res) => {
    const { yesterday = undefined } = req.query;
    const data = await getAllData(yesterday ? 'womYesterday' : 'womToday');
    return res.status(200).json(data);
});

// get all countries
router.get('/countries', async (req, res) => {
    const { yesterday = undefined } = req.query;
    let data = await get(yesterday ? 'womYesterday' : 'womToday');
    data = data.filter(el => el.country.toLowerCase() !== 'world').map(fixApostrophe).map(el => el);
    res.status(200).json(data);
});

// get data from countryname
router.get('/countries/:countryname', async (req, res) => {
    const { yesterday = undefined } = req.query;
    const { countryname } = req.params;
    let data = await get(yesterday ? 'womYesterday' : 'womToday');
    data = data.filter(el => el.country.toLowerCase() !== 'world').map(fixApostrophe).map(el => el);
    data = splitQuery(countryname).map(country => getWOHData(data, country)).filter(el => el).map(el => el);
    if (data.length > 0) return res.status(200).json(data.length === 1 ? data[0] : data);
    else res.status(404).send({ message: 'not found!' });
});


// get all states of US
router.get('/state', async (req, res) => {
    const { yesterday = undefined } = req.query;
    const data = await get(yesterday ? 'USYesterday' : 'USToday');
    return res.status(200).json(data);
});

// search state of US
router.get('/state/:statename', async (req, res) => {
    const { yesterday = undefined } = req.query;
    const { statename } = req.params;
    const data = await get(yesterday ? 'USYesterday' : 'USToday');
    const stateData = splitQuery(statename).map(el => data.find(state => el.toLowerCase() === state.state.toLowerCase())).filter(el => el).map(state => state);
    if (stateData.length > 0) return res.status(200).json(stateData.length === 1 ? stateData[0] : stateData);
    else return res.status(404).json({ message: 'not found!' });
});


module.exports = router;

async function getAllData(key) {
    const countries = await get(key);
	const worldData = countries.find(countryData => countryData.country.toLowerCase() === 'world');
	worldData.affectedCountries = countries.length - 1;
	const { country, countryInfo, ...cleanedWorldData } = worldData;
	return cleanedWorldData;
}

// Fix apostrophes in country name
function fixApostrophe(country) {
    country.country = country.country.replace(/"/g, '\'');
	return country;
}

function splitQuery(query) {
    return query.indexOf('|') === -1 ? query.split(',') : query.split('|');
}

function getWOHData(data, nameParam) {
    const countryInfo = isNaN(nameParam) ? getCountryData(nameParam) : {};
    const standardizedName = wordsStandardize(countryInfo.country ? countryInfo.country : nameParam);
    return data.find((country) => !isNaN(nameParam) ? country.countryInfo && country.countryInfo._id === Number(nameParam) : search(country, nameParam, standardizedName));
}

function search(country, nameParam, standardizedName) {
    return ((country.countryInfo || {}).iso3 || '').toLowerCase() === nameParam.toLowerCase()
    || ((country.countryInfo || {}).iso2 || '').toLowerCase() === nameParam.toLowerCase()
    || wordsStandardize(country['country']).includes(standardizedName);
}