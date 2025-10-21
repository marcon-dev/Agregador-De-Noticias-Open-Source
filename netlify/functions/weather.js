const axios = require('axios');

exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const city = (qs.city || 'Oakland').toString();
    const apiKey = process.env.OPENWEATHER_ACCESS_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing OpenWeather API key in environment.' }),
      };
    }

    const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: city,
        appid: apiKey,
        units: 'metric',
        lang: 'pt_br',
      },
      timeout: 10000,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    const status = err.response?.status || 500;
    return {
      statusCode: status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch weather from OpenWeather.',
        details: err.response?.data || err.message,
      }),
    };
  }
};