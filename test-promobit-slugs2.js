const axios = require('axios');
(async () => {
    for (const slug of ['mercadolivre', 'amazon-br', 'amazon-com-br']) {
        try {
            const res = await axios.get(`https://www.promobit.com.br/cupons/${slug}/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            console.log(slug, "OK!");
        } catch (err) {
            console.log(slug, "ERR", err.response?.status);
        }
    }
})();
