const axios = require('axios');
const cheerio = require('cheerio');

const GENIUS_API_URL = 'https://api.genius.com';
const GENIUS_ACCESS_TOKEN = 'L0BY-i4ZVi0wQ53vlvm2zucqjHTuLbHv--YgjxJoN0spnEIhb5swTr_mWlQ6Ye-F';

const headers = {
  'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`,
  'User-Agent': 'apitester.org Android/7.5(641)'
};

const genius = {
  async searchSong(query) {
    const url = new URL('/search', GENIUS_API_URL);
    url.searchParams.append('q', query);
    const response = await axios.get(url.toString(), { headers });
    return response.data.response.hits;
  },

  async getLyrics(songUrl) {
    const response = await axios.get(songUrl);
    const $ = cheerio.load(response.data);
    let lyrics = '';
    $('[class^="Lyrics__Container-"]').each((i, el) => {
      $(el).find('br').replaceWith('\n');
      lyrics += $(el).html()
        .replace(/<(?!\/?i>|\/?b>)[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        + '\n';
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
  },

  async getSongLyrics(query) {
    try {
      const searchResults = await this.searchSong(query);
      if (searchResults.length === 0) {
        return {
          status: false,
          creator: "ZenzzXD",
          message: "Lirik tidak ditemukan 🌝"
        };
      }
      const song = searchResults[0].result;
      const lyrics = await this.getLyrics(song.url);
      return {
        status: true,
        creator: "ZenzzXD",
        title: song.title,
        artist: song.primary_artist.name,
        lyrics,
        url: song.url,
        thumbnail: song.song_art_image_thumbnail_url
      };
    } catch (err) {
      return {
        status: false,
        creator: "ZenzzXD",
        message: "Terjadi kesalahan saat mengambil lirik",
        error: err.message
      };
    }
  }
};

module.exports = function (app) {
  app.get("/tools/genius", async (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        message: "Parameter 'query' harus diisi"
      });
    }

    const result = await genius.getSongLyrics(query);
    res.json(result);
  });
};
