const axios = require("axios");
const cheerio = require("cheerio");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const CREATOR_NAME = "ZenzzXD";
const REQUEST_TIMEOUT = 25000;

async function igProfileStalker(username) {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, timeout: REQUEST_TIMEOUT }));

  const urlMain = `https://instasaved.net/id/save-stories/${username}`;
  const headers = {
    "User-Agent": "Mozilla/5.0",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "upgrade-insecure-requests": "1"
  };

  try {
    await client.get(urlMain, { headers });
    const cookies = await jar.getCookies(urlMain);
    const xsrf = cookies.find(c => c.key === "XSRF-TOKEN")?.value;
    const xsrfToken = xsrf ? decodeURIComponent(xsrf) : null;
    if (!xsrfToken) throw new Error("Gagal mengambil token XSRF");

    const headersPost = {
      ...headers,
      "Content-Type": "application/json",
      "x-xsrf-token": xsrfToken,
      "Referer": urlMain,
      "Origin": "https://instasaved.net",
      "X-Requested-With": "XMLHttpRequest"
    };

    const payload = {
      type: "story",
      username,
      origin_value: username
    };

    const { data } = await client.post("https://instasaved.net/id/ajax/saver", payload, { headers: headersPost });
    const user = data.user;

    if (!user) throw new Error("User tidak ditemukan atau akun private");

    return {
      status: true,
      creator: CREATOR_NAME,
      result: {
        username: user.username || username,
        full_name: user.full_name || "",
        profile_url: `https://www.instagram.com/${user.username || username}`,
        profile_pic_url: user.profile_pic_url || "",
        bio: user.biography || "",
        is_verified: !!user.is_verified,
        is_private: !!user.is_private,
        followers_count: user.follower_count || 0,
        following_count: user.following_count || 0,
        posts_count: user.media_count || 0
      }
    };
  } catch (err) {
    return {
      status: false,
      creator: CREATOR_NAME,
      message: err?.response?.data?.message || err.message || "Terjadi kesalahan"
    };
  }
}

module.exports = function (app) {
  app.get("/stalker/instagram", async (req, res) => {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'username' wajib diisi"
      });
    }

    const result = await igProfileStalker(username.trim());
    res.json(result);
  });
};
