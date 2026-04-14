const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('https://www.promobit.com.br/cupons/kabum/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    console.log(res.data.substring(0, 500));
  } catch (err) {
    console.error("Promobit:", err.response ? err.response.status : err.message);
  }
})();
