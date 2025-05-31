const axios = require("axios");

const spotiDown = {
  api: {
    base: "https://parsevideoapi.videosolo.com",
    endpoints: {
      info: "/spotify-api/",
    },
  },

  headers: {
    authority: "parsevideoapi.videosolo.com",
    "user-agent": "Postify/1.0.0",
    referer: "https://spotidown.online/",
    origin: "https://spotidown.online",
  },

  extractId: (url) => {
    const patterns = [
      /spotify\.com\/track\/([a-zA-Z0-9]{22})/,
      /spotify:track:([a-zA-Z0-9]{22})/,
      /^([a-zA-Z0-9]{22})$/,
    ];
    for (const regex of patterns) {
      const match = url.match(regex);
      if (match) return match[1];
    }
    return null;
  },

  isUrl: (url) => {
    const trackId = spotiDown.extractId(url);
    return {
      valid: !!trackId,
      error: !url
        ? "Linknya mananya anjirr? Lu mau download apa kagak sih? kosong gini inputnya 🗿"
        : !trackId
        ? "Format linknya kagak valid bree 😑"
        : null,
      url: url?.trim(),
      trackId,
    };
  },

  download: async (url) => {
    const validation = spotiDown.isUrl(url);
    if (!validation.valid) {
      return {
        status: false,
        code: 400,
        creator: "ZenzzXD",
        result: { error: validation.error },
      };
    }

    try {
      const link =
        validation.trackId.length === 22 &&
        !url.includes("spotify.com")
          ? `https://open.spotify.com/track/${validation.trackId}`
          : validation.url;

      const response = await axios.post(
        `${spotiDown.api.base}${spotiDown.api.endpoints.info}`,
        { format: "web", url: link },
        { headers: spotiDown.headers }
      );

      if (response.data.status === "-4") {
        return {
          status: false,
          code: 400,
          creator: "ZenzzXD",
          result: {
            error:
              "Linknya kagak valid bree, cuman bisa download track doang euy 😂",
          },
        };
      }

      const { metadata } = response.data.data;
      if (!metadata || Object.keys(metadata).length === 0) {
        return {
          status: false,
          code: 404,
          creator: "ZenzzXD",
          result: {
            error:
              "Metadata tracknya kosong bree, ganti link yang lain aja yak..",
          },
        };
      }

      return {
        status: true,
        code: 200,
        creator: "ZenzzXD",
        result: {
          title: metadata.name,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          image: metadata.image,
          download: metadata.download,
          trackId: validation.trackId,
        },
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        creator: "ZenzzXD",
        result: {
          error: "Kagak bisa ambil data metadatanya bree 🙈",
        },
      };
    }
  },
};

// 🔁 ROUTE EXPRESS
module.exports = function (app) {
  app.get("/downloader/spotify", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        message: "Parameter 'url' wajib diisi",
      });
    }

    const result = await spotiDown.download(url);
    return res.status(result.code || 500).json(result);
  });
};
