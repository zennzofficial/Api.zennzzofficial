const axios = require('axios')

const terabox = {
  api: {
    base: "https://teraboxdl.site/api/",
    token: "token",
    terabox: "terabox"
  },

  headers: {
    'authority': 'teraboxdl.site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
  },

  token: null,

  getToken: async (force = false) => {
    if (!force && terabox.token) {
      return { status: 'success', code: 200, result: terabox.token }
    }

    try {
      const { data } = await axios.get(`${terabox.api.base}${terabox.api.token}`, { headers: terabox.headers })
      if (!data?.token) {
        throw new Error('Token gak ada di response')
      }
      terabox.token = data.token
      return { status: 'success', code: 200, result: data.token }
    } catch (err) {
      console.error('Error getToken:', err.response?.data || err.message)
      return { status: 'error', code: err.response?.status || 500, message: err.response?.data?.message || err.message }
    }
  },

  isUrl: (u) => {
    const m = u.match(/https?:\/\/(?:www\.)?(?:terabox|teraboxlink)\.(com|app)\/s\/([^\/]+)/i)
    return m ? `https://1024terabox.com/s/${m[2]}` : null
  },

  request: async (endpoint, params) => {
    let tokenRes = await terabox.getToken()
    if (tokenRes.status === 'error') return tokenRes

    const makeRequest = async () => {
      const url = `${terabox.api.base}${endpoint}?${new URLSearchParams(params)}`
      try {
        const { data, status } = await axios.get(url, {
          headers: { ...terabox.headers, 'x-access-token': terabox.token }
        })
        return { status: 'success', code: status, result: data.data }
      } catch (err) {
        console.warn('Request error:', err.response?.data || err.message)
        if (err.response?.data?.message === 'Invalid access token') {
          // Hapus token dan retry sekali
          terabox.token = null
          tokenRes = await terabox.getToken(true)
          if (tokenRes.status === 'error') return tokenRes
          return makeRequest()
        }
        return { status: 'error', code: err.response?.status || 500, message: err.response?.data?.message || err.message }
      }
    }

    return await makeRequest()
  },

  download: async (u) => {
    if (!u || typeof u !== 'string' || !u.trim()) {
      return { status: 'error', code: 400, message: 'URL kosong bree!' }
    }
    const fixed = terabox.isUrl(u.trim())
    if (!fixed) {
      return { status: 'error', code: 400, message: 'URL gak valid, harus kayak: https://terabox.com/s/abcdef' }
    }
    return await terabox.request(terabox.api.terabox, { url: fixed })
  }
}

module.exports = function (app) {
  app.get('/downloader/terabox', async (req, res) => {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({ status: false, creator: 'ZenzzXD', message: 'Parameter url gak boleh kosong' })
    }

    try {
      const out = await terabox.download(url)
      if (out.status === 'error') {
        return res.status(out.code || 500).json({ status: false, creator: 'ZenzzXD', message: out.message })
      }
      return res.json({ status: true, creator: 'ZenzzXD', result: out.result })
    } catch (err) {
      console.error('Fatal terabox error:', err)
      return res.status(500).json({ status: false, creator: 'ZenzzXD', message: 'Internal server error', error: err.message })
    }
  })
}
