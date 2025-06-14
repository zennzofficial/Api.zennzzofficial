const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
  app.get('/berita/kompas-tv', async (req, res) => {
    try {
      const { data } = await axios.get('https://news.kompas.com/?source=navbar', { timeout: 10000 });
      const $ = cheerio.load(data);
      const articles = [];

      $('.latest--idx-0, .latest--idx-1, .latest--idx-2').each((_, el) => {
        const elSel = $(el);
        const title = elSel.find('h3.article__title, h2.article__title').text().trim();
        const link = elSel.find('a.article__link').attr('href');
        const published = elSel.find('span.article__date').text().trim();

        if (title && link) {
          articles.push({ title, link, published });
        }
      });

      return res.json({
        status: true,
        creator: 'ZenzzXD',
        count: articles.length,
        result: articles
      });
    } catch (err) {
      console.error('Scrape error:', err.message);
      return res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil berita dari news.kompas.com',
        error: err.message
      });
    }
  });
};
