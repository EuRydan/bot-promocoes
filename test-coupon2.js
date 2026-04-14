const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
  try {
    const res = await axios.get('https://www.promobit.com.br/cupons/loja/kabum/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    const data = JSON.parse($('#__NEXT_DATA__').html());
    const sc = data.props.pageProps.serverCoupons;
    console.log("length:", sc?.items?.length || sc?.length);
    console.log("first item:", sc?.items?.[0] || sc?.[0]);
  } catch (err) {
    console.error(err.message);
  }
})();
