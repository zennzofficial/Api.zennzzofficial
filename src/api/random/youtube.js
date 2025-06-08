const axios = require('axios');
const cheerio = require('cheerio');
const vm = require('vm');

module.exports = function (app) {
  const headers = {
    "user-agent": "Mozilla/5.0 (Linux; Android 14; JHFiony Custom) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "referer": "https://ytmp3.cc/",
    "sec-fetch-mode": "cors"
  };

  async function getParamA(url) {
    const ytId = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
    const html = (await axios.get("https://ytmp3.cc/", { headers })).data;
    const $ = cheerio.load(html);
    const script = $("script").filter((_, el) => $(el).html().includes("atob(")).html();
    const base64Str = script.match(/atob['"`]([^'"`)]+)['"`]/)?.[1];
    if (!base64Str) throw "Base64 tidak ditemukan";
    const decoded = Buffer.from(base64Str, "base64").toString();
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(decoded, sandbox);
    const gO = sandbox.gO;
    const gC = sandbox["g" + (parseInt(gO[0].split("").reverse().join("")) + 1)];
    gC.d = gC[gO[1]];
    const f = gC[gO[2]];
    const t = gC[gO[3]];
    if (vm.runInContext(`(${Buffer.from(t[0], 'base64').toString()})`, sandbox) != t[1]) throw "Auth gagal";
    let key = f[6].split("").reverse().join("") + f[7];
    const tokens = Buffer.from(gC.d[0], 'base64').toString().split(f[5]);
    const ref = f[4] > 0 ? gC.d[1].split("").reverse().join("") : gC.d[1];
    for (let i = 0; i < tokens.length; i++) key += ref[tokens[i] - f[3]];
    const prefixLen = f[6].length + f[7].length;
    const suffix = key.substring(prefixLen);
    if (f[1] === 1) key = key.substring(0, prefixLen) + suffix.toLowerCase();
    else if (f[1] === 2) key = key.substring(0, prefixLen) + suffix.toUpperCase();
    if (f[0].length > 0) {
      const cleaned = Buffer.from(f[0], 'base64').toString().replace(String.fromCharCode(f[8]), "");
      return {
        ytId,
        paramA: Buffer.from(`${cleaned}_${gC.d[2]}`).toString('base64')
      };
    } else if (f[2] > 0) {
      return {
        ytId,
        paramA: Buffer.from(`${key.substring(0, f[2] + prefixLen)}_${gC.d[2]}`).toString('base64')
      };
    } else {
      return {
        ytId,
        paramA: Buffer.from(`${key}_${gC.d[2]}`).toString('base64')
      };
    }
  }

  async function getDownload(type, domain, ytId, paramA) {
    const init = await axios.get(`https://d.ecoe.cc/api/v1/init?a=${paramA}&_=${Math.random()}`, { headers });
    const sig = new URLSearchParams(init.data.convertURL.split("?")[1]).get("sig");

    let polling = 0;
    let url = `https://${domain}.ecoe.cc/api/v1/convert?sig=${encodeURIComponent(sig)}&v=${ytId}&f=${type}&_=${Math.random()}`;
    let data = (await axios.get(url, { headers })).data;

    if (data.redirectURL) {
      data = (await axios.get(data.redirectURL, { headers })).data;
    }

    while (!data.downloadURL && data.progressURL && polling < 10) {
      await new Promise(r => setTimeout(r, 2500));
      const poll = `${data.progressURL}&_=${Math.random()}`;
      data = (await axios.get(poll, { headers })).data;
      polling++;
    }

    if (!data.downloadURL) throw "Gagal mendapatkan link download";

    return {
      title: data.title || "No Title",
      download: data.downloadURL
    };
  }

  // Endpoint: /downloader/ytmp3
  app.get('/downloader/ytmp3', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter ?url= wajib' });

    try {
      const { ytId, paramA } = await getParamA(url);
      const mp3 = await getDownload("mp3", "ceoo", ytId, paramA);
      res.json({ status: true, creator: 'ZenzzXD', result: mp3 });
    } catch (e) {
      res.status(500).json({ status: false, message: 'Gagal mengambil MP3', error: e.toString() });
    }
  });

  // Endpoint: /downloader/ytmp4
  app.get('/downloader/ytmp4', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter ?url= wajib' });

    try {
      const { ytId, paramA } = await getParamA(url);
      const mp4 = await getDownload("mp4", "eoco", ytId, paramA);
      res.json({ status: true, creator: 'ZenzzXD', result: mp4 });
    } catch (e) {
      res.status(500).json({ status: false, message: 'Gagal mengambil MP4', error: e.toString() });
    }
  });
};
