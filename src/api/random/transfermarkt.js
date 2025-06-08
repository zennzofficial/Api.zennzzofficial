const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  app.get('/search/transfermarkt', async (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter query tidak boleh kosong',
      });
    }

    const headers = {
      'user-agent': 'Mozilla/5.0',
      'accept-language': 'id-ID,id;q=0.9',
    };

    try {
      // Step 1: Cari link profil
      const searchUrl = `https://www.transfermarkt.co.id/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchUrl, { headers });
      const $s = cheerio.load(searchRes.data);
      const relativeLink = $s('table.items tbody tr td.hauptlink a').first().attr('href');

      if (!relativeLink) {
        return res.status(404).json({
          status: false,
          creator: 'ZenzzXD',
          message: `Profil untuk pemain "${query}" tidak ditemukan`,
        });
      }

      const profileUrl = 'https://www.transfermarkt.co.id' + relativeLink;

      // Step 2: Ambil data dari profil pemain
      const profileRes = await axios.get(profileUrl, { headers });
      const $ = cheerio.load(profileRes.data);

      // Nama & Nomor Punggung
      let name = $('h1.data-header__headline-wrapper').clone();
      name.find('span.data-header__shirt-number').remove();
      name = name.text().trim().replace(/\s+/g, ' ');
      const shirtNumber = $('.data-header__shirt-number').text().replace('#', '').trim() || null;

      const photo = $('#modal-1-content img').attr('src') || null;

      const getInfo = (label) => {
        let value = null;
        $('.info-table__content--regular').each((i, el) => {
          if ($(el).text().includes(label)) {
            value = $('.info-table__content--bold').eq(i).text().trim().replace(/\s{2,}/g, ' ').replace(/\u00a0/g, ' ');
          }
        });
        return value;
      };

      const birthRaw = getInfo('Tanggal lahir');
      const birthMatch = birthRaw?.match(/(\d{1,2} \w+ \d{4})/);
      const ageMatch = birthRaw?.match(/(\d+)\s*tahun/);
      const birthdate = birthMatch ? birthMatch[1] : null;
      const age = ageMatch ? ageMatch[1] : null;

      const nationality = getInfo('Kewarganegaraan') || null;
      const height = getInfo('Tinggi') || null;
      const foot = getInfo('Kaki dominan')?.toLowerCase() || null;
      const position = getInfo('Posisi') || null;
      const agent = getInfo('Agen pemain') || null;
      const contractUntil = getInfo('Kontrak berakhir') || null;
      const club = getInfo('Klub Saat Ini') || $('.data-header__club-info a').first().text().trim() || null;
      const league = $('.data-header__club-info .data-header__league-link').text().trim() || null;

      const mvWrapper = $('.data-header__market-value-wrapper');
      const mvText = mvWrapper.clone().children().remove().end().text().trim().replace(/\s+/g, '');
      const mvUnit = mvWrapper.find('.waehrung').text().trim().replace(/\s+/g, '');
      const marketValue = mvText ? mvText + (mvUnit || '') : null;

      return res.json({
        status: true,
        creator: 'ZenzzXD',
        data: {
          name,
          shirtNumber,
          photo,
          birthdate,
          age,
          nationality,
          height,
          foot,
          position,
          agent,
          contractUntil,
          marketValue,
          club,
          league,
          profileUrl,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil data pemain',
        error: err?.message || err,
      });
    }
  });
};
