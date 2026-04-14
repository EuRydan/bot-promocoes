const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    const res = await axios.get('https://www.promobit.com.br/cupons/kabum/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    let cupons = [];
    $('[data-coupon]').each((i, el) => {
       cupons.push($(el).attr('data-coupon'));
    });
    console.log("data-coupon:", cupons);
    
    // Check next.js JSON if available
    let nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
      console.log("Found __NEXT_DATA__!");
    } else {
       console.log("No next data, here is body sample:", $('body').text().substring(0,200));
    }
  } catch (err) {
    console.error("Promobit:", err.message);
  }
})();
