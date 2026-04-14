const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
    try {
        const res = await axios.get(`https://www.promobit.com.br/cupons/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(res.data);
        const stores = [];
        $('a[href^="/cupons/"]').each((i, el) => {
            stores.push($(el).attr('href'));
        });
        console.log("Stores:", [...new Set(stores)]);
    } catch (err) {
        console.log("ERR", err.message);
    }
})();
