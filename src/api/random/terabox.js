const axios = require('axios');

module.exports = function (app) {
  app.get('/downloader/terabox', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Masukkan parameter ?url= dengan link Terabox yang valid'
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Referer': 'https://teradl.dapuntaratya.com/'
    };

    try {
      const fileRes = await axios.post('https://teradl-api.dapuntaratya.com/generate_file', {
        url,
        mode: 3
      }, { headers });

      const fileData = fileRes.data;
      if (fileData.status !== 'success') {
        return res.status(500).json({
          status: false,
          message: 'Gagal mengambil data file',
          detail: fileData
        });
      }

      const item = fileData.list?.[0];
      const bodyLink = {
        uk: fileData.uk,
        shareid: fileData.shareid,
        timestamp: fileData.timestamp,
        sign: fileData.sign,
        fs_id: item.fs_id,
        mode: 3
      };

      const linkRes = await axios.post('https://teradl-api.dapuntaratya.com/generate_link', bodyLink, { headers });
      const linkData = linkRes.data;

      if (linkData.status !== 'success') {
        return res.status(500).json({
          status: false,
          message: 'Gagal membuat link unduhan',
          detail: linkData
        });
      }

      return res.json({
        status: true,
        creator: 'ZenzzXD',
        result: {
          filename: item.name,
          size: item.size,
          thumb: item.image,
          direct_url: linkData.download_link.url_1,
          backup_url: linkData.download_link.url_2
        }
      });

    } catch (e) {
      const detail = e.response?.data || e.message;
      return res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan saat proses scraping',
        error: detail
      });
    }
  });
};
