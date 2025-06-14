const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  // Detail berita CNNIndonesia
  app.get('/berita/cnnindonesia/detail', async (req, res) => {
  const { url } = req.query;

  if (!url || !url.startsWith('https://www.cnnindonesia.com/')) {
    return res.status(400).json({
      status: false,
      message: 'Masukkan parameter ?url= dengan link berita CNNIndonesia yang valid'
    });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $('h1').first().text().trim();
    const thumbnail = $('meta[property="og:image"]').attr('content') || '';
    const published = $('div.detail__date').text().trim()
      || $('div.video-detail__date').text().trim()
      || '';
    const content = (
      $('div.detail__body').find('p').map((_, el) => $(el).text().trim()).get().join('\n\n')
      || $('div.video-detail__caption').text().trim()
      || ''
    );

    res.json({
      status: true,
      creator: 'ZenzzXD',
      result: { title, thumbnail, published, content, url }
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: 'Gagal mengambil detail berita',
      error: err.message
    });
  }
});
};
