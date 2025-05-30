const axios = require("axios");
const cheerio = require("cheerio");

const CREATOR_NAME = "ZenzzXD";

// --- Fungsi utama scraping dari insta-stories-viewer.com ---
async function igstalk(username) {
  try {
    const baseurl = "https://insta-stories-viewer.com";
    const url = `${baseurl}/${username}/`;
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
      timeout: 15000
    });

    const $ = cheerio.load(html);

    const avatar = $(".profile__avatar-pic").attr("src");
    const name = $(".profile__nickname").contents().first().text().trim();
    const posts = $(".profile__stats-posts").text().trim();
    const followers = $(".profile__stats-followers").text().trim();
    const following = $(".profile__stats-follows").text().trim();
    const bio = $(".profile__description").text().trim();

    if (!avatar || !name) {
      throw new Error("Username tidak ditemukan atau private.");
    }

    return {
      status: true,
      creator: CREATOR_NAME,
      result: {
        avatar,
        username: name,
        posts,
        followers,
        following,
        bio,
      }
    };
  } catch (err) {
    return {
      status: false,
      creator: CREATOR_NAME,
      message: err.message || "Terjadi kesalahan saat mengambil data."
    };
  }
}

// --- Router Express ---
module.exports = function (app) {
  app.get("/stalker/instagram", async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'username' wajib diisi."
      });
    }

    const result = await igstalk(username.trim());

    const statusCode = result.status ? 200 : 502;
    res.status(statusCode).json(result);
  });
};
