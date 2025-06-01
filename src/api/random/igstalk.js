const axios = require("axios");

async function forwardIGStalk(username) {
  try {
    const { data } = await axios.get(`https://api.siputzx.my.id/api/stalk/instagram?username=${username}`);
    
    if (!data || !data.status || !data.result) {
      return {
        status: false,
        message: "Gagal mengambil data dari sumber",
      };
    }

    const { avatar, username, posts, followers, following, bio } = data.result;

    return {
      status: true,
      creator: "ZenzXD",
      result: {
        avatar,
        username,
        posts,
        followers,
        following,
        bio,
      },
    };
  } catch (e) {
    return {
      status: false,
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
        message: "Parameter 'username' wajib diisi",
      });
    }

    const result = await forwardIGStalk(username);
    res.json(result);
  });
};
