const axios = require('axios');
const log = require('../utils/log');
const { getCountryData, wordsStandardize } = require('../utils/utils');
const csv = require('csvtojson');
const { set } = require('../database');
const instance = axios.create({ baseURL: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series' });

const getCountryHistorical = (data, query, province = null, lastdays = 30) => {
	lastdays = getLastDays(lastdays);
	const countryInfo = getCountryData(query);
	const standardizedCountryName = wordsStandardize(countryInfo.country ? countryInfo.country : query);
	if (standardizedCountryName.toLowerCase() === 'canada' && province) data = removeRecoveredAggregateCanada(data);

	// filter to either specific province, or provinces to sum country over
	const countryData = data.filter(item => {
		const deepMatch = () => wordsStandardize(item.country) === standardizedCountryName
			&& item.countryInfo.iso2 === countryInfo.iso2
			&& item.countryInfo.iso3 === countryInfo.iso3
			&& item.countryInfo._id === countryInfo._id;
		if (item.countryInfo.country) {
			if (province) {
				return (item.province === province.toLowerCase() || (item.province === null && province.toLowerCase() === 'mainland'))
					&& deepMatch();
			}
			return deepMatch();
		}
		return wordsStandardize(item.country) === standardizedCountryName;
	});
	if (countryData.length === 0) return null;

	// overall timeline for country
	const timeline = { cases: {}, deaths: {}, recovered: {} };
	const provinces = [];
	countryData.forEach((_, index) => {
		countryData[index].province ? provinces.push(countryData[index].province) : provinces.push('mainland');
		// loop cases, deaths for each province
		Object.keys(countryData[index].timeline).forEach((specifier) => {
			Object.keys(countryData[index].timeline[specifier]).slice(lastdays * -1).forEach((date) => {
				// eslint-disable-next-line no-unused-expressions
				timeline[specifier][date] ? timeline[specifier][date] += parseInt(countryData[index].timeline[specifier][date])
					: timeline[specifier][date] = parseInt(countryData[index].timeline[specifier][date]);
			});
		});
	});
	if (standardizedCountryName.toLowerCase() === 'canada' && province === null) {
		for (let i = 0; i < provinces.length; i++) {
			if (provinces[i] === 'recovered-aggregate') {
				provinces.splice(i, 1);
				break;
			}
		}
	}
	return {
		country: countryData[0].country || standardizedCountryName,
		province: province ? countryData[0].province || province : provinces,
		timeline,
	};
};


const processHistorical = async () => {
    const timeline = 4;
    let caseRes, deathsRes, recoveredRes;
    try {
        caseRes = await instance.get('/time_series_covid19_confirmed_global.csv');
        deathsRes = await instance.get('/time_series_covid19_deaths_global.csv');
        recoveredRes = await instance.get('/time_series_covid19_recovered_global.csv');
    }
    catch(e) {
        log.err('Error at global JHU historical request!', err);
        return;
    }

    const parsedCases = await parseCSVData(caseRes.data);
    const parsedDeaths = await parseCSVData(deathsRes.data);
    const parsedRecovered = await parseCSVData(recoveredRes.data);
    // JHU data is bad formatted
    const formattedRecovered = formatRecovered(parsedCases, parsedRecovered);
    const timelineKey = Object.keys(parsedCases[0]).splice(timeline);
	const recoveredAggregateCanada = parsedRecovered.find(country => country['Country/Region'] === 'Canada' && country['Province/State'] === '');
	const recoveredAggregateCanadaTimeline = Object.values(recoveredAggregateCanada).splice(timeline);
	const firstCountryCases = Object.values(parsedCases[0]).splice(timeline);
	const newElementCanada = {
		country: '', countryInfo: {}, province: 'recovered-aggregate', timeline: { cases: {}, deaths: {}, recovered: {} },
	};
	for (let i = 0; i < firstCountryCases.length; i++) {
		newElementCanada.timeline.cases[timelineKey[i]] = 0;
		newElementCanada.timeline.deaths[timelineKey[i]] = 0;
		newElementCanada.timeline.recovered[timelineKey[i]] = parseInt(recoveredAggregateCanadaTimeline[i]);
	}

    // format csv
    const result = parsedCases.map((_, index) => {
        const newEl = {
            country: '', countryInfo: {}, province: '', timeline: { cases: {}, deaths: {}, recovered: {} },
        };
        const cases = Object.values(parsedCases[index]).splice(timeline);
        const deaths = Object.values(parsedDeaths[index]).splice(timeline);
        const recovered = Object.values(formattedRecovered[index]).splice(timeline);

        for (let i = 0; i < cases.length; i++) {
            newEl.timeline.cases[timelineKey[i]] = parseInt(cases[i]);
            newEl.timeline.deaths[timelineKey[i]] = parseInt(deaths[i]);
            newEl.timeline.recovered[timelineKey[i]] = parseInt(recovered[i]);
        }

        // add country info
        const parsedAtIndex = Object.values(parsedCases)[index];
        const countryData = getCountryData(parsedAtIndex['Country/Region'].replace('*', ''));
        newEl.country = countryData.country || parsedAtIndex['Country/Region'];
        newEl.countryInfo = countryData;
        newEl.province = parsedAtIndex['Province/State'] == '' ? null : parsedAtIndex['Province/State'].toLowerCase();

        // add values
        if (newElementCanada.country === '' && newEl.country.toLocaleLowerCase() === 'canada') {
            newElementCanada.country = newEl.country;
            newElementCanada.countryInfo = newEl.countryInfo;
        };
        return newEl;
    });

	const newElementCanadaCopy = JSON.parse(JSON.stringify(newElementCanada));
	for (let i = 0; i < result.length; i++) {
		if (result[i].country.toLocaleLowerCase() === 'canada') {
			result.splice(i, 0, newElementCanadaCopy);
			break;
		}
	};

    await set('jhuHistorical', result);
    log.info(`Updated JHU Historical: ${result.length} locations!`);
};

module.exports = {
    processHistorical,
    getCountryHistorical,
};

function formatRecovered(cases, recovered) {
	const dates = Object.keys(cases[0]).slice(4);
	const countries = cases.map((country) => ({
		name: country['Country/Region'],
		province: country['Province/State'] || '',
		Lat: country.Lat || '',
		Long: country.Long || '',
	}));
	return countries.map((country) => {
		const provinces = recovered.filter(el => el['Country/Region'] === country.name && el['Province/State'] === country.province);
		dates.forEach(date => {
			country[date] = provinces[0] ? parseInt(provinces[0][date]) : 0;
		});
		return country;
	});
}

async function parseCSVData(data) {
    const parsedData = await csv({
        noheader: false,
        output: 'json',
    }).fromString(data);
    return parsedData;
}

function getLastDays(lastdays) {
    if (lastdays && lastdays === 'all') lastdays = Number.POSITIVE_INFINITY;
    if (!lastdays || isNaN(lastdays)) lastdays = 30;
    return lastdays;
}

function removeRecoveredAggregateCanada(data) {
    for (let i = 0; i < data.length; i++) {
        if (data[i].country.toLowerCase() === 'canada' && data[i].province.toLowerCase() === 'recovered-aggregate') {
            data.splice(i, 1);
            break;
        }
    }
    return data;
}