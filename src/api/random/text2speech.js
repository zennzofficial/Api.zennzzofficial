const axios = require("axios");

const speechmaHeaders = {
  'authority': 'speechma.com',
  'origin': 'https://speechma.com',
  'referer': 'https://speechma.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // ganti agar lebih mirip browser
};

const voices = [
  { id: 'voice-107', name: 'Andrew Multilingual' },
  { id: 'voice-110', name: 'Ava Multilingual' },
  { id: 'voice-112', name: 'Brian Multilingual' },
  { id: 'voice-115', name: 'Emma Multilingual' },
  { id: 'voice-106', name: 'Ana' },
  { id: 'voice-108', name: 'Andrew' },
  { id: 'voice-109', name: 'Aria' },
  { id: 'voice-82', name: 'Libby' },
  { id: 'voice-83', name: 'Maisie' },
  { id: 'voice-179', name: 'Keita' },
  { id: 'voice-180', name: 'Nanami' },
  { id: 'voice-190', name: 'InJoon' },
  { id: 'voice-191', name: 'SunHi' }
];

const getVoiceId = (name) => {
  const voice = voices.find(v => v.name.toLowerCase() === name.toLowerCase());
  return voice ? voice.id : null;
};

async function generateSpeech(text, voice = 'Ava Multilingual', pitch = 0, rate = 0, volume = 100) {
  const voiceId = voice.startsWith('voice-') ? voice : getVoiceId(voice);
  if (!voiceId) throw new Error(`Voice "${voice}" tidak ditemukan`);

  try {
    const response = await axios.post(
      'https://speechma.com/com.api/tts-api.php',
      { text, voice: voiceId, pitch, rate, volume },
      { headers: speechmaHeaders }
    );

    // Log hasil mentah kalau ada error
    if (!response.data || !response.data.success) {
      console.error('[DEBUG] Speechma raw response:', response.data);
      throw new Error(response.data?.message || 'Speechma gagal merespons');
    }

    const jobId = response.data.data.job_id;
    await new Promise(resolve => setTimeout(resolve, 2500)); // delay agar audio siap

    return `https://speechma.com/com.api/tts-api.php/audio/${jobId}`;
  } catch (e) {
    throw new Error('Speechma error: ' + (e?.response?.data?.message || e.message));
  }
}

module.exports = function (app) {
  app.get("/tools/text2speech", async (req, res) => {
    const { text, voice, pitch, rate, volume } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' diperlukan"
      });
    }

    try {
      const audioUrl = await generateSpeech(
        text,
        voice || 'Ava Multilingual',
        Number(pitch) || 0,
        Number(rate) || 0,
        Number(volume) || 100
      );

      res.json({
        status: true,
        voice: voice || 'Ava Multilingual',
        audio: audioUrl
      });
    } catch (error) {
      console.error("TTS error:", error.message);
      res.status(500).json({
        status: false,
        message: "Gagal generate suara",
        error: error.message
      });
    }
  });
};
