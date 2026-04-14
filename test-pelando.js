const axios = require('axios');

(async () => {
  try {
    const res = await axios.get('https://www.pelando.com.br/api/offers?limit=5', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log(res.data);
  } catch (err) {
    console.error("Pelando:", err.message);
  }
})();
