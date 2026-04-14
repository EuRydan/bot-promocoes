const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    const res = await axios.get('https://www.cuponomia.com.br/desconto/kabum', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const $ = cheerio.load(res.data);
    let cupons = [];
    $('.rewardsCode-offer-item').each((i, el) => {
       const badge = $(el).find('.rewardsBadge').text().trim();
       if (badge.toLowerCase().includes('cupom')) {
          const title = $(el).find('h3').text().trim();
          const code = $(el).find('.rewardsCode-code').text().trim();
          if (title) cupons.push({ title, code });
       }
    });
    console.log("Cuponomia Cupons:", cupons.length > 0 ? cupons : "None parsed properly");
    
    // Fallback parsing (Cuponomia often hides the code inside a data attribute)
    let codes = [];
    $('[data-code]').each((i, el) => {
        codes.push($(el).attr('data-code'));
    });
    console.log("Data codes:", codes);
  } catch (err) {
    console.error("Cuponomia Err:", err.message);
  }
})();
