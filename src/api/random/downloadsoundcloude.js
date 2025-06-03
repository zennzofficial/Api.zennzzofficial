const axios = require("axios");

const cache = { version: "", id: "" };

async function getClientID() {
  try {
    const { data: html } = await axios.get("https://soundcloud.com/");
    const version = html.match(/<script>window\.__sc_version="(\d{10})"<\/script>/)?.[1];
    if (!version) return;

    if (cache.version === version) return cache.id;

    const scriptMatches = [...html.matchAll(/<script.*?src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+)"/g)];

    for (const [, scriptUrl] of scriptMatches) {
      const { data: js } = await axios.get(scriptUrl);
      const idMatch = js.match(/client_id:"([a-zA-Z0-9]{32})"/);
      if (idMatch) {
        cache.version = version;
        cache.id = idMatch[1];
        return idMatch[1];
      }
    }
  } catch (err) {
    console.error("Gagal ambil client_id:", err.message);
  }
}

async function soundcloud(url) {
  try {
    if (!url.includes("soundcloud.com")) return { error: "Invalid SoundCloud link" };

    const client_id = await getClientID();
    if (!client_id) return { error: "Gagal mendapatkan client_id" };

    const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${client_id}`;
    const { data: info } = await axios.get(resolveUrl);

    if (!info.media || !info.media.transcodings) return { error: "Media tidak ditemukan" };

    const streamInfo = info.media.transcodings.find(x => x.format.protocol === "progressive");
    if (!streamInfo) return { error: "Audio tidak bisa diunduh (non-progressive)" };

    const streamUrl = `${streamInfo.url}?client_id=${client_id}`;
    const { data: streamData } = await axios.get(streamUrl);

    return {
      status: true,
      title: info.title,
      author: info.user?.username || "unknown",
      audio_url: streamData.url,
      duration: Math.floor(info.duration / 1000) + " sec",
      thumbnail: info.artwork_url || null,
      source_url: info.permalink_url,
      creator: "ZenzzXD"
    };
  } catch (e) {
    return { error: true, message: e.message };
  }
}

module.exports = function (app) {
  app.get('/downloader/soundcloud', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "url" tidak ditemukan'
      });
    }

    const result = await soundcloud(url);
    if (result?.error) {
      return res.status(400).json({ status: false, message: result.error || result.message });
    }

    res.json(result);
  });
};
