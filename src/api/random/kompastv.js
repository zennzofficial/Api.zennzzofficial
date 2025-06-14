const axios = require('axios');
const cheerio = require('cheerio');

async function fetchKompasKom() {
  const { data } = await axios.get('https://www.kompas.com/getrss/olahraga', { timeout: 10000 });
  const $ = cheerio.load(data, { xmlMode: true });
  const result = [];
  $('item').each((_, el) => {
    result.push({
      title: $(el).find('title').text().trim(),
      link: $(el).find('link').text().trim(),
      published: $(el).find('pubDate').text().trim(),
    });
  });
  return result;
}

module.exports = function(app) {
  app.get('/berita/kompas-tv', async (req, res) => {
    try {
      const result = await fetchKompasKom();
      res.json({
        status: true,
        creator: 'ZenzzXD',
        count: result.length,
        result
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil berita kompas.com',
        error: e.message
      });
    }
  });
};
