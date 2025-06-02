const axios = require('axios')

module.exports = function (app) {
  app.get('/downloader/mediafire', async (req, res) => {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter url tidak boleh kosong'
      })
    }

    try {
      const response = await axios.get('https://fastrestapis.fasturl.cloud/downup/mediafiredown', {
        params: { url }
      })

      const apiResult = response.data

      if (!apiResult || apiResult.status !== 200) {
        return res.status(500).json({
          status: false,
          creator: 'ZenzzXD',
          message: 'Gagal mengambil data Mediafire dari pihak ketiga'
        })
      }

      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        result: apiResult.result
      })

    } catch (err) {
      console.error(err)
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Terjadi kesalahan saat memproses permintaan',
        error: err?.message || err
      })
    }
  })
}
