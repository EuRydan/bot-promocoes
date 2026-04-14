const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    const res = await axios.get('https://www.promobit.com.br/cupons/kabum/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    let nextData = $('#__NEXT_DATA__').html();
    const data = JSON.parse(nextData);
    const coupons = data.props.pageProps.couponsByStore || [];
    console.log("Found coupons:", coupons.length);
    if(coupons.length > 0) {
       console.log(JSON.stringify(coupons[0], null, 2));
    }
  } catch (err) {
    console.error("Promobit:", err.message);
  }
})();
