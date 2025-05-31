const axios = require("axios");
const cheerio = require("cheerio");

const GENIUS_API_URL = 'https://api.genius.com';
const GENIUS_ACCESS_TOKEN = 'L0BY-i4ZVi0wQ53vlvm2zucqjHTuLbHv--YgjxJoN0spnEIhb5swTr_mWlQ6Ye-F';

const headers = {
  Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}`,
  'User-Agent': 'apitester.org Android/7.5(641)'
};

async function searchSong(query) {
  const url = new URL('/search', GENIUS_API_URL);
  url.searchParams.append('q', query);
  const response = await axios.get(url.toString(), { headers });
  return response.data.response.hits;
}

async function getLyrics(songUrl) {
  const response = await axios.get(songUrl);
  const $ = cheerio.load(response.data);
  let lyrics = '';
  $('[class^="Lyrics__Container-"]').each((_, element) => {
    $(element).find('br').replaceWith('\n');
    lyrics += $(element).html()
      .replace(/<(?!\/?i>|\/?b>)[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ') + '\n';
  });
  lyrics = lyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n')
    .replace(//g, '\n\n[')
    .replace(/\n/g, ']\n')
    .replace(/\n{3,}/g, '\n\n');
  return lyrics.trim();
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
