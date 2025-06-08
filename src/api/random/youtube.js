const axios = require('axios')
const cheerio = require('cheerio')
const vm = require('vm')

module.exports = function (app) {

  async function fetchYtDownload(youtubeUrl, format) {
    try {
      const ytId = youtubeUrl.split("v=")[1]?.split("&")[0] || youtubeUrl.split("/").pop()
      const jantung = {
        "user-agent": "Mozilla/5.0 (Linux; Android 14; JHFiony Custom) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "referer": "https://ytmp3.cc/",
        "sec-fetch-mode": "cors"
      }

      const res = await axios.get("https://ytmp3.cc/", { headers: jantung })
      const $ = cheerio.load(res.data)

      let base64Str = null
      $("script").each((_, el) => {
        const txt = $(el).html() || ""
        if (txt.includes("atob(")) base64Str = txt.match(/atob['"`]([^'"`)]+)['"`]/)?.[1]
      })

      if (!base64Str) throw new Error("Gagal menemukan base64 string")

      const decoded = Buffer.from(base64Str, "base64").toString()
      const sandbox = {}
      vm.createContext(sandbox)
      vm.runInContext(decoded, sandbox)

      const gO = sandbox.gO
      const gC = sandbox["g" + (parseInt(gO[0].split("").reverse().join("")) + 1)]
      gC.d = gC[gO[1]]
      const f = gC[gO[2]]
      const t = gC[gO[3]]

      if (vm.runInContext(`(${Buffer.from(t[0], 'base64').toString()})`, sandbox) != t[1]) throw new Error("Auth code tidak valid")

      let key = f[6].split("").reverse().join("") + f[7]
      const tokens = Buffer.from(gC.d[0], 'base64').toString().split(f[5])
      const ref = f[4] > 0 ? gC.d[1].split("").reverse().join("") : gC.d[1]

      for (let i = 0; i < tokens.length; i++) key += ref[tokens[i] - f[3]]

      const prefixLen = f[6].length + f[7].length
      const suffix = key.substring(prefixLen)

      if (f[1] === 1) key = key.substring(0, prefixLen) + suffix.toLowerCase()
      else if (f[1] === 2) key = key.substring(0, prefixLen) + suffix.toUpperCase()

      let paramA
      if (f[0].length > 0) {
        const cleaned = Buffer.from(f[0], 'base64').toString().replace(String.fromCharCode(f[8]), "")
        paramA = Buffer.from(`${cleaned}_${gC.d[2]}`).toString('base64')
      } else if (f[2] > 0) {
        paramA = Buffer.from(`${key.substring(0, f[2] + prefixLen)}_${gC.d[2]}`).toString('base64')
      } else {
        paramA = Buffer.from(`${key}_${gC.d[2]}`).toString('base64')
      }

      const initRes = await axios.get(`https://d.ecoe.cc/api/v1/init?a=${paramA}&_=${Math.random()}`, { headers: jantung })
      if (!initRes.data?.convertURL) throw new Error("Gagal mendapatkan convertURL")

      const sig = new URLSearchParams(initRes.data.convertURL.split("?")[1]).get("sig")
      if (!sig) throw new Error("Gagal mendapatkan sig")

      const domain = format === 'mp3' ? 'ceoo' : 'eoco'
      let data
      let polling = 0
      while (polling < 10) {
        const url = `https://${domain}.ecoe.cc/api/v1/convert?sig=${encodeURIComponent(sig)}&v=${ytId}&f=${format}&_=${Math.random()}`
        data = (await axios.get(url, { headers: jantung })).data
        if (data.redirectURL) {
          data = (await axios.get(data.redirectURL, { headers: jantung })).data
        }
        if (data.downloadURL && (data.title || format === 'mp4')) {
          return {
            title: data.title || null,
            download: data.downloadURL
          }
        }
        if (!data.progressURL) break
        await new Promise(r => setTimeout(r, 2500))
        polling++
      }

      throw new Error("Download URL tidak ditemukan dalam batas waktu")
    } catch (error) {
      throw error
    }
  }

  app.get('/downloader/ytmp3', async (req, res) => {
    const url = req.query.url
    if (!url) return res.status(400).json({ error: "Parameter 'url' wajib diisi" })

    try {
      const result = await fetchYtDownload(url, 'mp3')
      res.json({ status: true, data: result })
    } catch (err) {
      res.status(500).json({ status: false, error: err.message || err.toString() })
    }
  })

  app.get('/downloader/ytmp4', async (req, res) => {
    const url = req.query.url
    if (!url) return res.status(400).json({ error: "Parameter 'url' wajib diisi" })

    try {
      const result = await fetchYtDownload(url, 'mp4')
      res.json({ status: true, data: result })
    } catch (err) {
      res.status(500).json({ status: false, error: err.message || err.toString() })
    }
  })

        }
