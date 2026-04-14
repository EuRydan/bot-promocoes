const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    const res = await axios.get('https://www.coupert.com/promo-code/kabum', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(res.data);
    const text = $.text().substring(0, 1000);
    console.log("Coupert OK! Page length:", res.data.length);
    // tentar extrair cupons
    const coupons = [];
    $('[data-clipboard-text]').each((i, el) => {
        coupons.push($(el).attr('data-clipboard-text'));
    });
    console.log("Coupons clipboard text:", coupons);
    console.log("Title:", $('title').text());
  } catch (err) {
    console.error("Coupert Err:", err.message);
  }
})();
