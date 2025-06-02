const axios = require('axios')

module.exports = function (app) {
  app.get('/maker/brat', async (req, res) => {
    const { text } = req.query
    if (!text) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter text tidak boleh kosong'
      })
    }

    try {
      const response = await axios.get(`https://api.nekorinn.my.id/maker/brat-v2?text=${encodeURIComponent(text)}`, {
        responseType: 'arraybuffer'
      })

      res.set({
        'Content-Type': response.headers['content-type'],
        'Content-Disposition': 'inline; filename="brat-image.png"'
      })

      res.send(response.data)
    } catch (err) {
      console.error(err)
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil gambar dari API nekorinn',
        error: err?.message || err
      })
    }
  })
}
