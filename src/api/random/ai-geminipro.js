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
      const response = await axios.get(`https://api.siputzx.my.id/api/ai/gemini-pro`, {
        params: { content }
      })

      const result = response.data?.result?.data || 'Tidak ada respon dari Gemini AI'

      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        result
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mendapatkan respon dari Gemini AI',
        error: err?.message || err
      })
    }
  })
}
