const axios = require("axios");
const qs = require("qs");

const CREATOR_NAME = "ZenzzXD";
const COMMON_USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const UPSTREAM_API_URL = 'https://app.mailcamplly.com/api/instagram-profile';
const UPSTREAM_REFERER = 'https://bitchipdigital.com/tools/social-media/instagram-profile-viewer/';
const REQUEST_TIMEOUT = 20000;

async function stalkInstagramProfile(username) {
  if (!username) {
    throw new Error("Parameter 'username' tidak boleh kosong.");
  }

  const requestData = qs.stringify({ url: `@${username.trim()}` });

  try {
    const response = await axios({
      method: 'POST',
      url: UPSTREAM_API_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'User-Agent': COMMON_USER_AGENT,
        'Referer': UPSTREAM_REFERER
      },
      data: requestData,
      timeout: REQUEST_TIMEOUT
    });

    if (response.status === 200 && response.data) {
      return response.data;
    } else {
      throw new Error(`Upstream mengembalikan status ${response.status}, data tidak valid.`);
    }

  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const detail = err.response.data;

      throw new Error(`Upstream error (status: ${status}): ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
    } else if (err.request) {
      throw new Error("Tidak ada respons dari server upstream (timeout atau koneksi gagal).");
    } else {
      throw new Error(`Kesalahan sistem lokal: ${err.message}`);
    }
  }
}

module.exports = function (app) {
  app.get('/stalker/instagram', async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'username' wajib diisi."
      });
    }

    try {
      const result = await stalkInstagramProfile(username);
      res.status(200).json({
        status: true,
        creator: CREATOR_NAME,
        result
      });

    } catch (error) {
      console.error("Error [IG Stalk]:", error.message);

      let statusCode = 500;
      let clientMessage = error.message;

      if (clientMessage.toLowerCase().includes("upstream")) {
        statusCode = 502;
      } else if (clientMessage.toLowerCase().includes("timeout") || clientMessage.toLowerCase().includes("tidak ada respons")) {
        statusCode = 504;
      } else if (clientMessage.toLowerCase().includes("parameter")) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        status: false,
        creator: CREATOR_NAME,
        message: clientMessage
      });
    }
  });
};
