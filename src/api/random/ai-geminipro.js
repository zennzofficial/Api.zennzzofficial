const axios = require('axios')

module.exports = function (app) {
  app.get('/ai/geminipro', async (req, res) => {
    const { content } = req.query

    if (!content) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter content tidak boleh kosong'
      })
    }

    try {
      const { data } = await axios.get(`https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(content)}`)
      
      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        result: data
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mem-forward ke API Gemini',
        error: err?.message || err
      })
    }
  })
}
