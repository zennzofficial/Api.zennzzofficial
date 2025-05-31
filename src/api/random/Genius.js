const axios = require("axios");
const cheerio = require("cheerio");

const GENIUS_API_URL = 'https://api.genius.com';
const GENIUS_ACCESS_TOKEN = 'L0BY-i4ZVi0wQ53vlvm2zucqjHTuLbHv--YgjxJoN0spnEIhb5swTr_mWlQ6Ye-F';

const headers = {
  Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}`,
  'User-Agent': 'apitester.org Android/7.5(641)'
};

async function searchSong(query) {
  try {
    const url = new URL('/search', GENIUS_API_URL);
    url.searchParams.append('q', query);
    const response = await axios.get(url.toString(), { headers });
    if (!response.data || !response.data.response || !response.data.response.hits) {
      throw new Error("Data tidak lengkap dari Genius API");
    }
    return response.data.response.hits;
  } catch (error) {
    throw new Error(`Gagal mencari lagu: ${error.message}`);
  }
}

async function getLyrics(songUrl) {
  try {
    const response = await axios.get(songUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });
    const $ = cheerio.load(response.data);
    let lyrics = '';
    // Genius menggunakan class dengan pola "Lyrics__Container-"
    $('[class^="Lyrics__Container-"]').each((_, element) => {
      $(element).find('br').replaceWith('\n');
      let section = $(element).text().trim();
      if(section) lyrics += section + '\n';
    });
    lyrics = lyrics
      .replace(//g, '\n\n[')  // ini simbol aneh dari Genius yang kadang muncul, bisa dihapus atau diganti
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if(!lyrics) throw new Error("Lirik kosong, kemungkinan struktur halaman berubah");
    return lyrics;
  } catch (error) {
    throw new Error(`Gagal mengambil lirik: ${error.message}`);
  }
}

async function getSongLyrics(query) {
  const hits = await searchSong(query);
  if (!hits.length) throw new Error("Lirik tidak ditemukan");
  const song = hits[0].result;
  const lyrics = await getLyrics(song.url);
  return {
    title: song.title,
    artist: song.primary_artist.name,
    lyrics,
    url: song.url,
    thumbnailUrl: song.song_art_image_thumbnail_url
  };
}

module.exports = function (app) {
  app.get("/search/geniuslirik", async (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'query' wajib diisi"
      });
    }

    try {
      const result = await getSongLyrics(query);
      res.json({
        status: true,
        creator: "ZenzzXD",
        result
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil lirik",
        error: error.message
      });
    }
  });
};
