const axios = require('axios');
const cheerio = require('cheerio');
const { URLSearchParams } = require('url');

const PINTEREST_HOME = "https://pinterestdownloader.com";

/**
 * Scraper Pinterest versi V2 - Grab Full Quality
 * @param {string} pinterestUrl
 * @returns {Promise<Array<object>>}
 */
async function fetchPinterestMediaV2(pinterestUrl) {
  try {
    // Step 1: Get Cookie & First HTML
    const homeRes = await axios.get(PINTEREST_HOME);
    const cookie = homeRes.headers['set-cookie']?.map(x => x.split(';')[0]).join('; ') || '';

    const headers = {
      cookie,
      "content-type": "application/x-www-form-urlencoded",
      origin: PINTEREST_HOME,
      referer: PINTEREST_HOME,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/108.0 Safari/537.36"
    };

    const bodyUrl = new URLSearchParams({ url: pinterestUrl }).toString();
    const resFirst = await axios.post(PINTEREST_HOME, bodyUrl, { headers });
    let html = resFirst.data;

    // Ambil process_id
    let processId = html.match(/process_id[\"']?\s*:\s*[\"']([a-f0-9\-]+)[\"']/i)?.[1] ||
                    cheerio.load(html)('input[name="process_id"]').attr('value');

    let resultHtml = html;

    // Step 2: Polling jika ada processId
    if (processId) {
      let start = Date.now();
      while (Date.now() - start < 300000) {
        const pollBody = new URLSearchParams({ process_id: processId }).toString();
        const pollRes = await axios.post(PINTEREST_HOME, pollBody, { headers });
        resultHtml = pollRes.data;

        if (!/we are working on/i.test(resultHtml)) break;
        await new Promise(r => setTimeout(r, 3000));
      }

      if (/we are working on/i.test(resultHtml)) {
        throw new Error("Process terlalu lama atau server gagal respon.");
      }
    }

    // Step 3: Parse hasil HTML
    const $ = cheerio.load(resultHtml);
    const resultMap = {};

    $('a.download__btn').each((_, el) => {
      const btn = $(el), href = btn.attr('href'), text = btn.text();
      if (!href) return;
      const quality = text.match(/(hd|\d+p|\d{3}p)/i)?.[1]?.toUpperCase() || "unknown";
      const type = text.toLowerCase().includes('force') ? "force" : "direct";
      const key = `image_${quality}`;
      if (!resultMap[key]) resultMap[key] = { tag: "image", quality };
      resultMap[key][type] = href;
    });

    $('a.download_button').each((_, el) => {
      const btn = $(el), href = btn.attr('href'), text = btn.text();
      if (!href) return;
      if (/video/i.test(text) || href.endsWith('.mp4')) {
        const type = text.toLowerCase().includes('force') ? "force" : "direct";
        const key = `video_unknown`;
        if (!resultMap[key]) resultMap[key] = { tag: "video", quality: "unknown" };
        resultMap[key][type] = href;
      }
      if (/\.gif($|\?)/i.test(href)) {
        const type = text.toLowerCase().includes('force') ? "force" : "direct";
        const key = `gif_${href.split('/').pop().split('?')[0]}`;
        if (!resultMap[key]) resultMap[key] = { tag: "gif", quality: "standard" };
        resultMap[key][type] = href;
      }
    });

    const results = Object.values(resultMap);
    if (!results.length) throw new Error("Gagal dapetin data download, kosong!");

    return results;

  } catch (err) {
    throw new Error(err.message || "Scraping error.");
  }
}

// === Plugin Express Route ===
module.exports = (app) => {
  const creator = "ZenzzXD";

  app.get('/downloader/pinterest', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator,
        message: 'Parameter `url` wajib diisi.'
      });
    }

    if (!/^https?:\/\/(www\.)?(pinterest\.com|pin\.it)\//.test(url)) {
      return res.status(400).json({
        status: false,
        creator,
        message: 'URL tidak valid! Harus dari pinterest.com atau pin.it'
      });
    }

    try {
      const result = await fetchPinterestMediaV2(url);
      res.json({
        status: true,
        creator,
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator,
        message: err.message || 'Terjadi kesalahan saat scraping.'
      });
    }
  });
};
