const axios = require("axios");
const cheerio = require("cheerio");

async function igStalker(username) {
  const baseurl = "https://insta-stories-viewer.com";

  try {
    const { data: html } = await axios.get(`${baseurl}/${username}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(html);

    const avatar = $(".profile__avatar-pic").attr("src") || null;
    const name = $(".profile__nickname").contents().first().text().trim();
    const posts = $(".profile__stats-posts").text().trim();
    const followers = $(".profile__stats-followers").text().trim();
    const following = $(".profile__stats-follows").text().trim();
    const bio = $(".profile__description").text().trim();

    if (!avatar || !name) {
      return {
        status: false,
        message: "Akun tidak ditemukan atau tidak tersedia",
      };
    }

    return {
      status: true,
      result: {
        avatar,
        username: name,
        posts,
        followers,
        following,
        bio,
      },
    };
  } catch (e) {
    return {
      status: false,
      message: "Gagal mengambil data",
      error: e.message,
    };
  }
}

module.exports = function (app) {
  app.get("/stalker/instagram", async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'username' wajib diisi",
      });
    }

    const result = await igStalker(username);
    res.json(result);
  });
};
