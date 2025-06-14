const axios = require('axios');
const cheerio = require('cheerio');

async function fetchKompasNasionalRSS() {
  const { data } = await axios.get('https://www.kompas.com/getrss/nasional', { timeout: 10000 });
  const $ = cheerio.load(data, { xmlMode: true });
  return $('item').map((_, el) => ({
    title: $(el).find('title').text().trim(),
    link: $(el).find('link').text().trim(),
    published: $(el).find('pubDate').text().trim()
  })).get();
}

module.exports = function(app) {
  app.get('/berita/kompas-tv', async (req, res) => {
    try {
      const result = await fetchKompasNasionalRSS();
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
        message: 'Gagal mengambil berita nasional via RSS Kompas.com',
        error: err.message
      });
    }
  });
};
