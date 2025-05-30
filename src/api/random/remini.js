const axios = require("axios");

const CREATOR_NAME = "ZenzzXD";

async function forwardRemini(url) {
  try {
    const target = `https://zenzzx-api.vercel.app/tools/remini?url=${encodeURIComponent(url)}`;
    const response = await axios.get(target, { timeout: 30000 });

    if (response.status !== 200 || !response.data || response.data.status !== true) {
      return {
        status: false,
        creator: CREATOR_NAME,
        message: "Gagal mendapatkan respons yang valid dari zenzzx-api.",
        upstream_response: response.data
      };
    }

    const upscaledImageUrl = response.data.result;

    if (!upscaledImageUrl || typeof upscaledImageUrl !== "string") {
      return {
        status: false,
        creator: CREATOR_NAME,
        message: "URL hasil tidak ditemukan atau tidak valid.",
        upstream_response: response.data
      };
    }

    return {
      status: true,
      creator: CREATOR_NAME,
      result: upscaledImageUrl
    };
  } catch (e) {
    let statusCode = 500;
    let errorMessage = "Terjadi kesalahan internal pada server.";

    if (e.response) {
      statusCode = e.response.status >= 500 ? 502 : e.response.status;
      errorMessage = e.response.data?.message || `Gagal hubungi upstream (status: ${e.response.status})`;
    } else if (e.request) {
      statusCode = 504;
      errorMessage = "Timeout atau tidak ada respons dari upstream.";
    } else {
      errorMessage = e.message;
    }

    return {
      status: false,
      creator: CREATOR_NAME,
      message: errorMessage,
      code: statusCode
    };
  }
}

module.exports = function (app) {
  app.get("/tools/remini", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'url' wajib diisi"
      });
    }

    const result = await forwardRemini(url);
    const statusCode = result.code || 200;
    if (result.code) delete result.code;
    res.status(statusCode).json(result);
  });
};
