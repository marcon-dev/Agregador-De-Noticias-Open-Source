const axios = require('axios');

exports.handler = async (event) => {
  try {
    // Parse optional exclude list (array of titles)
    let excludeTitles = [];
    const qs = event?.queryStringParameters || {};
    if (qs.exclude) {
      try {
        const parsed = JSON.parse(qs.exclude);
        if (Array.isArray(parsed)) excludeTitles = parsed;
      } catch {
        // Fallback: support comma-separated list
        excludeTitles = String(qs.exclude)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    const excludeSet = new Set(
      excludeTitles
        .map((t) => String(t || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const apiKey = process.env.NEWSAPI_ACCESS_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing News API key in environment.' }),
      };
    }

    // Optional pagination passthrough (NewsAPI supports `page`)
    const page = Number.parseInt(qs.page, 10) > 0 ? Number.parseInt(qs.page, 10) : 1;
    const pageSize = Number.parseInt(qs.pageSize, 10) > 0 ? Number.parseInt(qs.pageSize, 10) : 30;

    // Request a larger set, client will filter to ensure 4 with content
    const { data } = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: { country: 'us', pageSize, page, apiKey },
      timeout: 10000,
    });

    const articles = Array.isArray(data?.articles) ? data.articles : [];

    const cleaned = articles
      .map((a) => {
        const rawContent = a?.content || '';
        const content = rawContent.replace(/\s*\[\+\d+\s+chars\]$/i, '');
        const description = a?.description || '';
        return {
          source: a?.source?.name || null,
          author: a?.author || null,
          title: a?.title || '',
          description,
          url: a?.url || '',
          urlToImage: a?.urlToImage || '',
          publishedAt: a?.publishedAt || '',
          content,
        };
      })
      .filter((a) => {
        const text = (a.content || a.description || '').trim();
        return text.length >= 20; // heuristic: ensure non-empty, informative text
      })
      // Exclude titles already seen (case-insensitive)
      .filter((a) => a.title && !excludeSet.has(String(a.title).trim().toLowerCase()))
      // Return up to 4 items to match frontend render expectations
      .slice(0, 4);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: cleaned }),
    };
  } catch (err) {
    const status = err.response?.status || 500;
    return {
      statusCode: status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch news from NewsAPI.',
        details: err.response?.data || err.message,
      }),
    };
  }
};