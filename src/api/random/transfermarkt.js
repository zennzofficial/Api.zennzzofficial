const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  app.get('/search/transfermarkt', async (req, res) => {
    const { player } = req.query;

    if (!player) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter player tidak boleh kosong'
      });
    }

    const jantung = {
      "user-agent": "Mozilla/5.0",
      "accept-language": "id-ID,id;q=0.9"
    };

    try {
      const searchRes = await axios.get(
        `https://www.transfermarkt.co.id/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(player)}`,
        { headers: jantung }
      );

      const $search = cheerio.load(searchRes.data);
      const relativeLink = $search("table.items tbody tr td.hauptlink a").first().attr("href");

      if (!relativeLink) {
        return res.status(404).json({
          status: false,
          creator: 'ZenzzXD',
          message: `Profil untuk pemain "${player}" tidak ditemukan`
        });
      }

      const profileUrl = "https://www.transfermarkt.co.id" + relativeLink;
      const profileRes = await axios.get(profileUrl, { headers: jantung });
      const $ = cheerio.load(profileRes.data);

      let name = $("h1.data-header__headline-wrapper").clone();
      name.find("span.data-header__shirt-number").remove();
      name = name.text().replace(/\s+/g, " ").trim();

      const shirtNumber = $(".data-header__shirt-number").text().replace("#", "").trim() || null;
      const photo = $("#modal-1-content img").attr("src") || null;

      const getInfoTableValue = (label) => {
        let idx = -1;
        $(".info-table__content--regular").each((i, el) => {
          if ($(el).text().includes(label)) idx = i;
        });
        if (idx >= 0) {
          return $(".info-table__content--bold")
            .eq(idx)
            .text()
            .replace(/\s{2,}/g, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();
        }
        return null;
      };

      const birthRaw = getInfoTableValue("Tanggal lahir");
      let birthdate = null, age = null;
      if (birthRaw) {
        const matchDate = birthRaw.match(/(\d{1,2} \w+ \d{4})/);
        const matchAge = birthRaw.match(/(\d+)/);
        birthdate = matchDate ? matchDate[1] : null;
        age = matchAge ? matchAge[1] : null;
      }

      const nationality = getInfoTableValue("Kewarganegaraan");
      const height = getInfoTableValue("Tinggi");
      const foot = getInfoTableValue("Kaki dominan");
      const position = getInfoTableValue("Posisi");
      const agent = getInfoTableValue("Agen pemain");
      const contractUntil = getInfoTableValue("Kontrak berakhir");
      const club = getInfoTableValue("Klub Saat Ini") || $(".data-header__club-info a").first().text().trim();
      const league = $(".data-header__club-info .data-header__league-link").text().trim() || "Liga 1";

      let marketValue = null;
      const mvWrap = $(".data-header__market-value-wrapper");
      if (mvWrap.length) {
        const mvText = mvWrap.clone().children().remove().end().text().replace(/\s+/g, "").trim();
        const mvUnit = mvWrap.find(".waehrung").text().replace(/\s+/g, "").trim();
        marketValue = mvText + (mvUnit || "");
      }

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
          profileUrl
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil data pemain',
        error: err?.message || err
      });
    }
  });
};
