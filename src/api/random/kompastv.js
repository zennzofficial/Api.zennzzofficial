const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchKompasTv() {
  const { data } = await axios.get('https://www.kompas.tv/', {
    httpsAgent: agent,
    timeout: 10000
  });

  const $ = cheerio.load(data);
  const items = [];

  $('a.card__link').each((_, el) => {
    const link = 'https://www.kompas.tv' + $(el).attr('href');
    const title = $(el).find('.card__title').text().trim();

    if (title && link.includes('/article/')) {
      items.push({ title, link });
    }
  });

  return items.slice(0, 20); // ambil maksimal 20 berita
}

module.exports = function (app) {
  app.get('/berita/kompas-tv', async (req, res) => {
    try {
      const result = await fetchKompasTv();
      res.json({
        status: true,
        creator: 'ZenzzXD',
        count: result.length,
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil berita dari kompas.tv',
        error: err.message
      });
    }
  });
};
