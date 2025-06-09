const axios = require('axios')

const terabox = {
  api: {
    base: "https://teraboxdl.site/api/",
    token: "token",
    terabox: "terabox"
  },

  headers: {
    'authority': 'teraboxdl.site',
    'user-agent': 'Postify/1.0.0'
  },

  token: null,

  getToken: async () => {
    if (terabox.token) {
      return {
        status: 'success',
        code: 200,
        result: terabox.token
      };
    }

    try {
      const response = await axios.get(`${terabox.api.base}${terabox.api.token}`, { headers: terabox.headers });
      const { data, status } = response;

      if (!data || !data.token) {
        return {
          status: 'error',
          code: 404,
          message: 'Tokennya kagak ada bree, coba lagi nanti yak 😬'
        };
      }

      terabox.token = data.token;
      return {
        status: 'success',
        code: status,
        result: terabox.token
      };

    } catch (error) {
      if (error.response) {
        return {
          status: 'error',
          code: error.response.status,
          message: `${error.response.data.message || error.message}`
        };
      } else {
        return {
          status: 'error',
          code: 500,
          message: `${error.message}`
        };
      }
    }
  },

  isUrl: (url) => {
    const match = url.match(/https?:\/\/(?:www\.)?(?:\w+)\.(com|link|app)\/s\/([^\/]+)/i);
    return match ? `https://1024terabox.com/s/${match[2]}` : null;
  },

  request: async (endpoint, params = {}) => {
    const toket = await terabox.getToken();
    if (toket.status === 'error') {
      return toket;
    }

    const url = `${terabox.api.base}${endpoint}?` + new URLSearchParams(params);

    try {
      const res = await axios.get(url, {
        headers: { ...terabox.headers, 'x-access-token': toket.result }
      });

      const { data, status } = res;

      if (!data || Object.keys(data).length === 0) {
        return {
          status: 'error',
          code: status,
          message: 'Kagak ada response dari apinya bree...'
        };
      }

      const result = data.data;

      return {
        status: 'success',
        code: status,
        result
      };

    } catch (error) {
      if (error.response) {
        return {
          status: 'error',
          code: error.response.status,
          message: `${error.response.data.message || error.message}`
        };
      } else {
        return {
          status: 'error',
          code: 500,
          message: `${error.message}`
        };
      }
    }
  },

  download: async (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return {
        status: 'error',
        code: 400,
        message: 'Lu niat download pake Terabox kagak? Input lu kosong anjiir 🙃'
      };
    }

    const linkNya = terabox.isUrl(url.trim());
    if (!linkNya) {
      return {
        status: 'error',
        code: 400,
        message: 'Kagak valid tuh linknya.. link yang dibolehin tuh kek gini "https://terabox.com/s/abcdefgh"'
      };
    }

    const response = await terabox.request(terabox.api.terabox, { url: linkNya });

    if (response.status === 'error') {
      return response;
    }

    return {
      status: 'success',
      code: 200,
      result: response.result
    };
  }
}

module.exports = function (app) {
  app.get('/downloader/terabox', async (req, res) => {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter url tidak boleh kosong'
      })
    }

    try {
      const result = await terabox.download(url)
      if (result.status === 'error') {
        return res.status(result.code || 500).json({
          status: false,
          creator: 'ZenzzXD',
          message: result.message
        })
      }

      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        result: result.result
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil data Terabox',
        error: err?.message || String(err)
      })
    }
  })
}
