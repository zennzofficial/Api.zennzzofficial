const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
  app.get('/berita/kompas', async (req, res) => {
    try {
      // Scraping dari RSS feed Kompas (lebih banyak artikel)
      const { data } = await axios.get('https://www.kompas.com/rss/', {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(data, { xmlMode: true });
      const articles = [];

      $('item').each((i, el) => {
        const title = $(el).find('title').text().trim();
        const url = $(el).find('link').text().trim();
        const description = $(el).find('description').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();
        
        // Extract thumbnail dari description (biasanya ada tag img)
        const descHtml = cheerio.load(description);
        const thumb = descHtml('img').attr('src') || '';

        if (title && url) {
          articles.push({
            title,
            url,
            thumbnail: thumb,
            published: pubDate,
            description: descHtml.text().substring(0, 150) + '...'
          });
        }
      });

      res.json({
        status: true,
        creator: "ZenzzXD",
        count: articles.length,
        result: articles
      });

    } catch (error) {
      console.error('Scrape error:', error.message);
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Terjadi kesalahan saat mengambil data dari kompas.com',
        error: error.message
      });
    }
  });
};
