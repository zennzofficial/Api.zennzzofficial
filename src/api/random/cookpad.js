const axios = require('axios');
const cheerio = require('cheerio');

class CookpadScraper {
    constructor() {
        // Menggunakan axios.create untuk instance dengan konfigurasi default
        this.client = axios.create({
            baseURL: 'https://cookpad.com',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'cache-control': 'no-cache',
                'priority': 'u=0, i',
                'pragma': 'no-cache',
                'referer': 'https://cookpad.com/id',
                'sec-ch-ua': '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0'
            },
            timeout: 20000 // Timeout 20 detik untuk setiap request axios
        });
    }

    async getRecipeDetails(url) {
        try {
            const response = await this.client.get(url);
            const html = response.data;
            const $ = cheerio.load(html);

            const recipeDetails = {};

            const recipeImageElement = $('#recipe_image img');
            recipeDetails.full_image = recipeImageElement.attr('src') || 'N/A';
            recipeDetails.title = $('h1[data-toggle-class-target-id-value="header--recipe-title"]').text().trim() || 'N/A';

            const authorLink = $('a[href*="/id/pengguna/"]');
            recipeDetails.author = authorLink.find('span.text-cookpad-14').text().trim() || 'N/A';
            recipeDetails.author_username = authorLink.find('span[dir="ltr"]').text().trim() || 'N/A';
            recipeDetails.author_avatar = authorLink.find('picture img').attr('src') || 'N/A';
            recipeDetails.author_location = authorLink.find('.location .mise-icon-text').text().trim() || 'N/A';

            const ingredientsList = [];
            $('#ingredients .ingredient-list ol li').each((_, element) => {
                const ingredientText = $(element).text().trim();
                if (ingredientText) ingredientsList.push(ingredientText);
            });
            recipeDetails.ingredients = ingredientsList.length > 0 ? ingredientsList : ['N/A'];

            const stepsList = [];
            $('#steps ol.list-none li.step').each((_, element) => {
                const stepNumber = $(element).find('.flex-shrink-0 > div').text().trim();
                const stepText = $(element).find('div[dir="auto"] p').text().trim();
                if (stepText) stepsList.push(`${stepNumber}. ${stepText}`);
            });
            recipeDetails.steps = stepsList.length > 0 ? stepsList : ['N/A'];
            
            return recipeDetails;

        } catch (error) {
            console.error(`Error mengambil detail dari ${url}:`, error.message);
            throw new Error(`Gagal mengambil detail resep dari ${url}.`); // Throw error
        }
    }

    async search({ query = 'cilok', limit = 5 }) { // Default limit 5
        try {
            const response = await this.client.get(`/id/cari/${encodeURIComponent(query)}`);
            const html = response.data;
            const $ = cheerio.load(html);

            const searchResultsContainer = $('ul#search-recipes-list');
            let total = 0;
            const trackingParamsValue = searchResultsContainer.attr('data-search-tracking-params-value');
            if (trackingParamsValue) {
                try {
                    const params = JSON.parse(trackingParamsValue);
                    total = parseInt(params.total_hits, 10) || 0;
                } catch (parseError) {
                    total = searchResultsContainer.find('li[id^="recipe_"]').length;
                }
            } else {
                total = searchResultsContainer.find('li[id^="recipe_"]').length;
            }

            const initialRecipes = [];
            searchResultsContainer.find('li[id^="recipe_"]').each((index, element) => {
                if (initialRecipes.length >= limit) return false; // Hentikan jika sudah mencapai limit

                const el = $(element);
                const title = el.find('h2 a.block-link__main').text().trim() || 'N/A';
                let link = el.find('h2 a.block-link__main').attr('href') || '';
                if (link && !link.startsWith('http')) link = `https://cookpad.com${link}`;

                let ingredientsArray = [];
                const ingredientsAttrValue = el.find('div[data-controller="ingredients-highlighter"]').attr('data-ingredients-highlighter-ingredients-value');
                if (ingredientsAttrValue) {
                    try { ingredientsArray = JSON.parse(ingredientsAttrValue); } catch (e) { ingredientsArray = ['Gagal parse bahan']; }
                } else {
                    const ingredientsText = el.find('div[data-ingredients-redesign-target="ingredients"] div.line-clamp-3').text().trim();
                    ingredientsArray = ingredientsText ? ingredientsText.split('•').map(ing => ing.trim()).filter(ing => ing) : ['N/A'];
                }
                const ingredients = Array.isArray(ingredientsArray) ? ingredientsArray : [ingredientsArray || 'N/A'];

                const authorName = el.find('div.flex.items-center span.break-all span').first().text().trim() || 'N/A';
                const authorAvatar = el.find('div.flex.items-center picture img').attr('src') || '';
                
                let recipeImage = el.find('div.flex-none picture img').attr('src') || '';
                const webpSourceSet = el.find('div.flex-none picture source[type="image/webp"]').attr('srcset');
                if (webpSourceSet) recipeImage = webpSourceSet.split(',')[0].trim().split(' ')[0];

                if (link) { // Hanya tambahkan jika ada link
                    initialRecipes.push({
                        id: el.attr('id')?.replace('recipe_', '') || null,
                        title, link, ingredients, author: authorName, author_avatar: authorAvatar, image: recipeImage
                    });
                }
            });

            const detailedRecipes = [];
            for (const recipe of initialRecipes) {
                try {
                    const details = await this.getRecipeDetails(recipe.link);
                    detailedRecipes.push({ ...recipe, details: details || null });
                } catch (detailError) {
                    console.warn(`Gagal mengambil detail untuk ${recipe.link}: ${detailError.message}. Resep ini akan dilewati untuk detailnya.`);
                    detailedRecipes.push({ ...recipe, details: null, error_detail: detailError.message }); // Tetap masukkan resepnya
                }
            }
            return { total_hits_on_page: total, results_count: detailedRecipes.length, recipes: detailedRecipes };
        } catch (error) {
            console.error(`Error mencari "${query}":`, error.message);
            throw new Error(`Gagal mencari resep untuk "${query}".`); // Throw error
        }
    }
}

// --- Rute Express ---
module.exports = function (app) {
  const creatorName = "ZenzXD";

  app.get('/search/cookpad', async (req, res) => {
    const { q, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'q' (query) wajib diisi."
      });
    }

    const numLimit = parseInt(limit) || 5; // Default limit 5 jika tidak ada atau tidak valid
    if (numLimit > 10) { // Batasi limit maksimal untuk performa
        return res.status(400).json({
            status: false,
            creator: creatorName,
            message: "Parameter 'limit' tidak boleh lebih dari 10 untuk menjaga performa."
        });
    }

    try {
      const scraper = new CookpadScraper();
      const result = await scraper.search({ query: q, limit: numLimit });

      res.json({
        status: true,
        creator: creatorName,
        result: result
      });

    } catch (error) {
      console.error("Cookpad API Error:", error.message, error.stack);
      res.status(500).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal saat mencari resep.'
      });
    }
  });

  // Tambahkan rute lain di sini...
};
