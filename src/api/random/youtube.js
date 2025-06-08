const axios = require('axios');
const cheerio = require('cheerio');
const vm = require('vm');

module.exports = function(app) {

  const jantung = {
    "user-agent": "Mozilla/5.0 (Linux; Android 14; JHFiony Custom) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "referer": "https://ytmp3.cc/",
    "sec-fetch-mode": "cors"
  };

  async function getBase64AndParams() {
    try {
      const res = await axios.get("https://ytmp3.cc/", { headers: jantung });
      const $ = cheerio.load(res.data);

      let base64Str = null;
      $('script').each((_, el) => {
        const txt = $(el).html() || "";
        if (txt.includes("atob(")) {
          const match = txt.match(/atob['"`]([^'"`)]+)['"`]/);
          if (match && match[1]) base64Str = match[1];
        }
      });

      if (!base64Str) throw new Error("Gagal menemukan base64 string");

      const decoded = Buffer.from(base64Str, "base64").toString();
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(decoded, sandbox);

      let gO = sandbox.gO;
      let gC = sandbox["g" + (parseInt(gO[0].split("").reverse().join("")) + 1)];
      gC.d = gC[gO[1]];
      const f = gC[gO[2]];
      const t = gC[gO[3]];

      if (vm.runInContext(`(${Buffer.from(t[0], 'base64').toString()})`, sandbox) != t[1]) throw new Error("auth code not valid");

      let key = f[6].split("").reverse().join("") + f[7];
      const tokens = Buffer.from(gC.d[0], 'base64').toString().split(f[5]);
      const ref = f[4] > 0 ? gC.d[1].split("").reverse().join("") : gC.d[1];

      for (let i = 0; i < tokens.length; i++) {
        key += ref[tokens[i] - f[3]];
      }

      const prefixLen = f[6].length + f[7].length;
      const suffix = key.substring(prefixLen);

      if (f[1] === 1) key = key.substring(0, prefixLen) + suffix.toLowerCase();
      else if (f[1] === 2) key = key.substring(0, prefixLen) + suffix.toUpperCase();

      let paramA;
      if (f[0].length > 0) {
        const cleaned = Buffer.from(f[0], 'base64').toString().replace(String.fromCharCode(f[8]), "");
        paramA = Buffer.from(`${cleaned}_${gC.d[2]}`).toString('base64');
      } else if (f[2] > 0) {
        paramA = Buffer.from(`${key.substring(0, f[2] + prefixLen)}_${gC.d[2]}`).toString('base64');
      } else {
        paramA = Buffer.from(`${key}_${gC.d[2]}`).toString('base64');
      }

      return paramA;
    } catch (e) {
      throw e;
    }
  }

  async function getSig(paramA) {
    try {
      const initRes = await axios.get(
        `https://d.ecoe.cc/api/v1/init?a=${paramA}&_=${Math.random()}`,
        { headers: jantung }
      );

      if (!initRes.data?.convertURL) throw new Error("gagal dapet convertURL");
      const sig = new URLSearchParams(initRes.data.convertURL.split("?")[1]).get("sig");
      return sig;
    } catch (e) {
      throw e;
    }
  }

  async function getDownload(format, domain, sig, ytId) {
    let data, polling = 0;
    try {
      const initialUrl = `https://${domain}.ecoe.cc/api/v1/convert?sig=${encodeURIComponent(sig)}&v=${ytId}&f=${format}&_=${Math.random()}`;
      data = (await axios.get(initialUrl, { headers: jantung })).data;

      if (data.redirectURL) {
        data = (await axios.get(data.redirectURL, { headers: jantung })).data;
      }

      while (!data.downloadURL && data.progressURL && polling < 10) {
        await new Promise(r => setTimeout(r, 2500));
        const pollUrl = `${data.progressURL}&_=${Math.random()}`;
        data = (await axios.get(pollUrl, { headers: jantung })).data;
        polling++;
      }

      if (data.downloadURL && (data.title || format === "mp4")) {
        return {
          title: data.title,
          download: data.downloadURL
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  // Route for mp3
  app.get('/downloader/ytmp3', async (req, res) => {
    try {
      const youtubeUrl = req.query.url;
      if (!youtubeUrl) return res.status(400).json({ status: false, message: "Parameter url dibutuhkan" });

      const ytId = youtubeUrl.split("v=")[1]?.split("&")[0] || youtubeUrl.split("/").pop();

      const paramA = await getBase64AndParams();
      const sig = await getSig(paramA);
      const result = await getDownload("mp3", "ceoo", sig, ytId);

      if (!result) return res.status(500).json({ status: false, message: "Gagal mengambil data mp3" });

      res.json({
        status: true,
        format: "mp3",
        title: result.title,
        download: result.download
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message || err.toString()
      });
    }
  });

  // Route for mp4
  app.get('/downloader/ytmp4', async (req, res) => {
    try {
      const youtubeUrl = req.query.url;
      if (!youtubeUrl) return res.status(400).json({ status: false, message: "Parameter url dibutuhkan" });

      const ytId = youtubeUrl.split("v=")[1]?.split("&")[0] || youtubeUrl.split("/").pop();

      const paramA = await getBase64AndParams();
      const sig = await getSig(paramA);
      const result = await getDownload("mp4", "eoco", sig, ytId);

      if (!result) return res.status(500).json({ status: false, message: "Gagal mengambil data mp4" });

      res.json({
        status: true,
        format: "mp4",
        title: result.title,
        download: result.download
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message || err.toString()
      });
    }
  });

};
