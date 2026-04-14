const { fetchAllPromos, sentLinks } = require("./scraper.js");

(async () => {
  console.log("Existing sent links length:", sentLinks.size);
  const promos = await fetchAllPromos();
  console.log("Returned promos:", promos.length);
  if (promos.length > 0) {
    console.log("Best fake promo:", JSON.stringify(promos[0], null, 2));
  }
})();
