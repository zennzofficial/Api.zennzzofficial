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

  $('h2, h3').each((_, el) => {
    const title = $(el).text().trim();
    const link = $(el).find('a').attr('href');
    if (title && link && link.startsWith('http')) {
      items.push({ title, link });
    }
  });

  return items.slice(0, 20); // ambil maksimal 20
}

module.exports = function(app) {
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
