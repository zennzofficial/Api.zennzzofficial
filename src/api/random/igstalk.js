const axios = require("axios");

async function forwardIGStalk(uname) {
  try {
    const { data } = await axios.get(`https://api.siputzx.my.id/api/stalk/instagram?username=${uname}`);

    // Cek response sesuai struktur API yang asli
    if (!data || !data.status || !data.data) {
      return {
        status: false,
        message: "Gagal mengambil data dari sumber",
      };
    }

    // Extract data sesuai properti asli
    const {
      profile_pic_url: avatar,
      username,
      posts_count: posts,
      followers_count: followers,
      following_count: following,
      biography: bio,
      full_name,
      is_verified,
      is_private,
      external_url
    } = data.data;

    return {
      status: true,
      creator: "ZenzXD",
      result: {
        avatar,
        username,
        full_name,
        posts,
        followers,
        following,
        bio,
        is_verified,
        is_private,
        external_url
      },
    };
  } catch (e) {
    return {
      status: false,
      creator: "ZenzXD",
      message: "Terjadi kesalahan saat mengambil data",
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
        creator: "ZenzXD",
        message: "Parameter 'username' wajib diisi",
      });
    }

    const result = await forwardIGStalk(username);
    res.json(result);
  });
};
