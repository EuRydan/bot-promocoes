const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('https://www.cuponomia.com.br/desconto/kabum', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log(res.data.substring(0, 1000));
    const fs = require('fs');
    fs.writeFileSync('cuponomia.html', res.data);
  } catch (err) {
    console.error(err.message);
  }
})();
