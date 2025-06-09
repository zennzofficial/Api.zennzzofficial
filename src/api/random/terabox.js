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
      }
    }

    try {
      const { data, status } = await axios.get(`${terabox.api.base}${terabox.api.token}`, {
        headers: terabox.headers
      })

      if (!data?.token) {
        return {
          status: 'error',
          code: 404,
          message: 'Tokennya kagak ada bree, coba lagi nanti yak 😬'
        }
      }

      terabox.token = data.token
      return {
        status: 'success',
        code: status,
        result: terabox.token
      }

    } catch (err) {
      return {
        status: 'error',
        code: err?.response?.status || 500,
        message: err?.response?.data?.message || err.message
      }
    }
  },

  isUrl: (url) => {
    const match = url.match(/https?:\/\/(?:www\.)?(?:\w+)\.(com|app)\/s\/([^\/]+)/i)
    return match ? `https://1024terabox.com/s/${match[2]}` : null
  },

  request: async (endpoint, params = {}) => {
    const toket = await terabox.getToken()
    if (toket.status === 'error') return toket

    const url = `${terabox.api.base}${endpoint}?` + new URLSearchParams(params)

    try {
      const { data, status } = await axios.get(url, {
        headers: { ...terabox.headers, 'x-access-token': toket.result }
      })

      if (!data || !data.data) {
        return {
          status: 'error',
          code: status,
          message: 'Kagak ada response dari apinya bree...'
        }
      }

      return {
        status: 'success',
        code: status,
        result: data.data
      }

    } catch (err) {
      return {
        status: 'error',
        code: err?.response?.status || 500,
        message: err?.response?.data?.message || err.message
      }
    }
  },

  download: async (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return {
        status: 'error',
        code: 400,
        message: 'Lu niat download pake Terabox kagak? Input lu kosong anjiir 🙃'
      }
    }

    const fixedUrl = terabox.isUrl(url.trim())
    if (!fixedUrl) {
      return {
        status: 'error',
        code: 400,
        message: 'Kagak valid tuh linknya.. link yang dibolehin tuh kek gini "https://terabox.com/s/abcdefgh"'
      }
    }

    return await terabox.request(terabox.api.terabox, { url: fixedUrl })
  }
}

module.exports = function (app) {
  app.get('/downloader/terabox', async (req, res) => {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter url gak boleh kosong dong bree 😒'
      })
    }

    try {
      const result = await terabox.download(url)
      if (result.status === 'error') {
        return res.status(result.code).json({
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
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Terjadi kesalahan pas download Terabox 😵‍💫',
        error: err?.message || String(err)
      })
    }
  })
        }
