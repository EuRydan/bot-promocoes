const axios = require('axios');
(async () => {
    for (const slug of ['terabyte', 'terabyteshop', 'terabyte-shop']) {
        try {
            const res = await axios.get(`https://www.promobit.com.br/cupons/loja/${slug}/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            console.log(slug, "OK!");
        } catch (err) {
            console.log(slug, "ERR", err.response?.status);
        }
    }
})();
