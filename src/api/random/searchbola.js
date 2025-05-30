const axios = require('axios');
const cheerio = require('cheerio');

const LAPANGBOLA_BASEURL = "https://live.lapangbola.com";
const creatorName = "ZenzzXD";

/**
 * Cari klub bola dari lapangbola.com
 */
async function searchClub(q) {
  const searchUrl = `${LAPANGBOLA_BASEURL}/teams?q=${encodeURIComponent(q)}`;
  try {
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
      },
      timeout: 15000
    });
    const $ = cheerio.load(data);
    const result = [];

    $('.panel.panel-default.panel-teams').each((_, el) => {
      const name = $(el).find('.panel-body h5.text-center').text().trim();
      const logoRaw = $(el).find('img').attr('src');
      const logo = logoRaw?.startsWith('http') ? logoRaw : LAPANGBOLA_BASEURL + logoRaw;
      const stadion = $(el).find('p.text-center.text-muted.small').text().trim();
      const link = $(el).find('a[href*="/teams/"]').attr('href');
      if (name && link) result.push({ name, logo, stadion, url: LAPANGBOLA_BASEURL + link });
    });

    return result;
  } catch (e) {
    throw new Error(e.code === 'ECONNABORTED' ? 'Timeout saat mencari klub.' : 'Gagal cari klub.');
  }
}

/**
 * Ambil info detail klub
 */
async function infoClub(clubUrl) {
  if (!clubUrl.startsWith(LAPANGBOLA_BASEURL)) throw new Error('URL klub tidak valid.');

  try {
    const { data } = await axios.get(clubUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000
    });

    const $ = cheerio.load(data);
    const name = $('.profile-header-title h1').text().trim();
    if (!name) throw new Error('Nama klub tidak ditemukan.');

    const logoRaw = $('.profile-user .avatar img').attr('src');
    const logo = logoRaw?.startsWith('http') ? logoRaw : LAPANGBOLA_BASEURL + logoRaw;
    const stadion = $('.profile-header-title p').text().trim() || "N/A";

    const players = [];
    $('#players-list tr').each((_, el) => {
      const name = $(el).find('td').eq(0).text().trim();
      const number = $(el).find('td').eq(1).text().trim();
      const position = $(el).find('td').eq(2).text().trim();
      if (name) players.push({ name, number, position });
    });

    const matchHistory = [];
    $('#match-history tr').each((_, el) => {
      const date = $(el).find('td').eq(0).text().trim();
      const score = $(el).find('td').eq(2).text().trim();
      const team1 = $(el).find('td').eq(1).find('.team-short-name').first().text().trim();
      const team2 = $(el).find('td').eq(1).find('.team-short-name').last().text().trim();
      const tournament = $(el).find('td').eq(3).text().trim();
      if (team1 && team2 && score) matchHistory.push({ date, versus: `${team1} vs ${team2}`, score, tournament });
    });

    return {
      name,
      logo,
      stadion,
      summary: {
        play: $('.widget-four .col-xl-3').eq(0).text().trim() || "0",
        win: $('.widget-four .col-xl-3').eq(1).text().trim() || "0",
        draw: $('.widget-four .col-xl-3').eq(2).text().trim() || "0",
        lose: $('.widget-four .col-xl-3').eq(3).text().trim() || "0"
      },
      players,
      matchHistory
    };

  } catch (e) {
    throw new Error(e.code === 'ECONNABORTED' ? 'Timeout saat ambil info klub.' : 'Gagal ambil info klub.');
  }
}

// ✅ GABUNGKAN EXPRESS ROUTE LANGSUNG
module.exports = (app) => {
  app.get('/bola/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ status: false, creator: creatorName, message: 'Parameter "q" wajib.' });

    try {
      const result = await searchClub(q);
      res.json({
        status: true,
        creator: creatorName,
        message: `Ditemukan ${result.length} klub untuk query "${q}".`,
        result
      });
    } catch (err) {
      console.error('❌ /bola/search error:', err.message);
      res.status(500).json({ status: false, creator: creatorName, message: err.message });
    }
  });

  app.get('/bola/info', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, creator: creatorName, message: 'Parameter "url" wajib.' });

    try {
      const result = await infoClub(url);
      res.json({
        status: true,
        creator: creatorName,
        message: `Info klub "${result.name}" berhasil diambil.`,
        result
      });
    } catch (err) {
      console.error('❌ /bola/info error:', err.message);
      res.status(500).json({ status: false, creator: creatorName, message: err.message });
    }
  });
};
