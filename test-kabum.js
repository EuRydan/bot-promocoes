const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://www.kabum.com.br/hardware/placa-de-video-vga', {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}}).then(res => {
  const $ = cheerio.load(res.data);
  let nextScript = $('#__NEXT_DATA__').html();
  if(!nextScript) { console.log('no next'); return; }
  const data = JSON.parse(nextScript);
  const pageData = JSON.parse(data.props.pageProps.data);
  const prods = pageData.catalogServer.data;
  prods.slice(0, 10).forEach(p => {
    console.log(p.name);
    console.log('price:', p.price);
    console.log('priceWithDiscount:', p.priceWithDiscount);
    console.log('offer.price:', p.offer ? p.offer.price : "NO OFFER");
    console.log('offer.priceWithDiscount:', p.offer ? p.offer.priceWithDiscount : "NO OFFER");
    console.log('-----------------');
  });
}).catch(console.error);
