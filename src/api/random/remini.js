const axios = require('axios')
const FormData = require('form-data')

async function upscaler(image) {
  if (!image) throw 'Mana parameter image berupa url/buffer'
  
  if (image.startsWith('http')) {
    let img = await axios.get(image, {
      responseType: 'arraybuffer'
    })
    image = img.data
  }

  let form = new FormData()
  form.append('image', Buffer.from(image), {
    filename: 'image.jpg',
    contentType: 'image/jpeg'
  })
  form.append('scale', 2)

  let { data } = await axios.post('https://api2.pixelcut.app/image/upscale/v1', form, {
    headers: {
      ...form.getHeaders(),
      "accept": "application/json",
      "origin": "https://www.pixelcut.ai",
      "referer": "https://www.pixelcut.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      "x-client-version": "web",
      "x-locale": "id"
    }
  })

  return data
}

module.exports = function (app) {
  app.get('/tools/remini', async (req, res) => {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter url tidak boleh kosong'
      })
    }

    try {
      const result = await upscaler(url)
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
        message: 'Gagal melakukan upscale gambar',
        error: err?.message || String(err)
      })
    }
  })
}
