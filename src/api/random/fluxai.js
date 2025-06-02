const axios = require('axios')

module.exports = function (app) {
  app.get('/ai/flux', async (req, res) => {
    const { prompt } = req.query
    if (!prompt) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter prompt tidak boleh kosong'
      })
    }

    try {
      const response = await axios.get(`https://api.siputzx.my.id/api/ai/flux?prompt=${encodeURIComponent(prompt)}`, {
        responseType: 'arraybuffer'
      })

      res.set({
        'Content-Type': response.headers['content-type'],
        'Content-Disposition': 'inline; filename="flux-image.png"'
      })

      res.send(response.data)
    } catch (err) {
      console.error(err)
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil gambar dari API flux',
        error: err?.message || err
      })
    }
  })
}
