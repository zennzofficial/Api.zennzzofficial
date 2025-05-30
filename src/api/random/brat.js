const fetch = require("node-fetch");
const AbortController = require("abort-controller");

const CREATOR_NAME = "ZenzXD";
const FETCH_TIMEOUT = 15000;

async function fetchBratImage(text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const url = `https://api.yogik.id/maker/brat?text=${encodeURIComponent(text)}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      let errMsg = `Status ${response.status}`;
      try {
        if (response.headers.get("content-type")?.includes("application/json")) {
          const json = await response.json();
          errMsg += ` - ${json.message || "Unknown error"}`;
        }
      } catch {}

      return {
        status: false,
        message: `Gagal mengambil gambar dari API eksternal. ${errMsg}`
      };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType.startsWith("image/")) {
      return {
        status: false,
        message: "Respons dari API eksternal bukan gambar."
      };
    }

    const buffer = await response.buffer();
    return {
      status: true,
      buffer,
      contentType
    };

  } catch (err) {
    const isTimeout = err.name === "AbortError";
    return {
      status: false,
      message: isTimeout ? "Timeout ke API eksternal." : err.message
    };
  }
}

module.exports = function (app) {
  app.get("/maker/brat", async (req, res) => {
    const { text } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'text' wajib diisi."
      });
    }

    const result = await fetchBratImage(text);

    if (!result.status) {
      return res.status(500).json({
        status: false,
        creator: CREATOR_NAME,
        message: result.message
      });
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(result.buffer);
  });
};
