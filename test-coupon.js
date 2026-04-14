const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
  try {
    const res = await axios.get('https://www.promobit.com.br/cupons/loja/kabum/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    const data = JSON.parse($('#__NEXT_DATA__').html());
    console.log(Object.keys(data.props.pageProps));
    console.log("couponsByStore:", data.props.pageProps.couponsByStore?.length);
  } catch (err) {
    console.error(err.message);
  }
})();
