const axios = require('axios');
(async () => {
    for (const slug of ['amazon', 'amazon-brasil', 'mercado-livre']) {
        try {
            const res = await axios.get(`https://www.promobit.com.br/cupons/${slug}/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            console.log(slug, "OK!");
            const nextData = res.data.split('__NEXT_DATA__')[1].split('</script>')[0].substring(2);
            const data = JSON.parse(nextData);
            console.log("Coupons:", data.props.pageProps.couponsByStore?.length);
        } catch (err) {
            console.log(slug, "ERR", err.response?.status);
        }
    }
})();
