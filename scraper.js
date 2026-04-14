const axios = require("axios");
const { gotScraping } = require("got-scraping");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// ─── Configuração Compartilhada ─────────────────────────────
const SENT_LINKS_FILE = path.join(__dirname, "sent_links.json");
const MAX_PROMOS_PER_CYCLE = 5; // Aumentado para 5 para maior volume por ciclo

// ─── Cores e emojis por loja ────────────────────────────────
const STORES = {
  kabum: { id: "kabum", name: "KaBuM!", color: 0xff6600, emoji: "🟠" },
  mercadolivre: { id: "mercadolivre", name: "Mercado Livre", color: 0xffe600, emoji: "🟡" },
  amazon: { id: "amazon", name: "Amazon", color: 0xff9900, emoji: "📦" },
  aliexpress: { id: "aliexpress", name: "AliExpress", color: 0xff4747, emoji: "🔴" },
  pichau: { id: "pichau", name: "Pichau", color: 0xe74c3c, emoji: "🔴" },
  terabyteshop: { id: "terabyteshop", name: "Terabyte", color: 0x2ecc71, emoji: "🟢" },
};

// ─── Headers para simular navegador real ────────────────────
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Cache-Control": "max-age=0",
  "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

// ─── Categorias de hardware a monitorar ─────────────────────
const KABUM_CATEGORIES = [
  { path: "/hardware/placa-de-video-vga", label: "Placa de Vídeo" },
  { path: "/hardware/ssd-2-5", label: "SSD" },
  { path: "/hardware/memoria-ram", label: "Memória RAM" },
  { path: "/hardware/processadores", label: "Processadores" },
  { path: "/perifericos/teclados", label: "Teclados" },
  { path: "/perifericos/mouses", label: "Mouses" },
  { path: "/perifericos/headsets", label: "Headsets" },
  { path: "/perifericos/monitores", label: "Monitores" },
  { path: "/hardware/placa-mae", label: "Placa Mãe" },
  { path: "/hardware/fontes", label: "Fontes" },
  { path: "/hardware/coolers/water-cooler", label: "Water Cooler" },
  { path: "/hardware/coolers/air-cooler", label: "Air Cooler" },
];

const ML_SEARCH_TERMS = [
  "placa de video gamer",
  "processador amd ryzen",
  "processador intel",
  "ssd nvme 1tb",
  "memoria ram ddr4 16gb",
  "monitor gamer 144hz",
  "teclado mecanico gamer",
  "mouse gamer",
  "headset gamer",
  "fonte 80 plus",
  "water cooler gamer",
  "air cooler",
];

const ALI_SEARCH_TERMS = [
  "graphics card nvidia",
  "graphics card amd",
  "amd ryzen processor",
  "intel core processor",
  "ssd nvme m2",
  "ddr4 ram 16gb",
  "mechanical keyboard",
  "gaming mouse",
  "gaming headset",
  "water cooler cpu",
  "air cooler cpu",
];

// Termos de busca reutilizados pela Amazon, Pichau e TerabyteShop
const COMMON_SEARCH_TERMS = [
  "placa de video",
  "processador ryzen",
  "processador intel",
  "ssd nvme",
  "memoria ram ddr4",
  "monitor gamer",
  "teclado mecanico",
  "mouse gamer",
  "headset gamer",
  "fonte 80 plus",
  "water cooler",
  "air cooler",
];

// Categorias Pichau
const PICHAU_CATEGORIES = [
  { path: "/hardware/placa-de-video", label: "Placa de Vídeo" },
  { path: "/hardware/processadores", label: "Processadores" },
  { path: "/hardware/memorias", label: "Memória RAM" },
  { path: "/hardware/ssd", label: "SSD" },
  { path: "/hardware/placa-m-e", label: "Placa-Mãe" },
  { path: "/perifericos/teclado", label: "Teclados" },
  { path: "/perifericos/acessorios", label: "Mouses" },
  { path: "/perifericos/fone-de-ouvido", label: "Headsets" },
  { path: "/hardware/fonte", label: "Fontes" },
  { path: "/hardware/cooler-processador/water-coolers", label: "Water Cooler" },
  { path: "/hardware/cooler-processador/air-coolers", label: "Air Cooler" },
];

// Categorias TerabyteShop
const TERABYTE_CATEGORIES = [
  { path: "/hardware/placas-de-video", label: "Placa de Vídeo" },
  { path: "/hardware/processadores", label: "Processadores" },
  { path: "/hardware/memorias", label: "Memória RAM" },
  { path: "/hardware/ssd", label: "SSD" },
  { path: "/perifericos/teclados", label: "Teclados" },
  { path: "/perifericos/mouses", label: "Mouses" },
  { path: "/perifericos/fones-de-ouvido", label: "Headsets" },
  { path: "/hardware/fontes", label: "Fontes" },
  { path: "/refrigeracao/watercooler", label: "Water Cooler" },
  { path: "/refrigeracao/cooler-p-cpu", label: "Air Cooler" },
];

// ─── Termos Proibidos (Blacklist) ──────────────────────────
const BLACKLIST_TERMS = [
  "computador",
  "pc slim",
  "pc gamer",
  "cpu completa",
  "montado",
  "pc escritório",
  "pc escritorio",
  "estação de trabalho",
  "workstation",
];

// ─── Marcas Relevantes (Whitelist) ──────────────────────────
const RELEVANT_BRANDS = [
  // Processadores
  "amd", "ryzen", "intel", "core i3", "core i5", "core i7", "core i9",
  // GPUs — fabricantes de chip e placa
  "nvidia", "geforce", "rtx", "gtx", "radeon",
  "asus", "gigabyte", "msi", "galax", "zotac", "gainward",
  // Placas-mãe
  "asrock", "biostar",
  // Memória RAM e SSDs
  "kingston", "corsair", "xpg", "husky", "adata", "asgard", "crucial", "samsung",
  // Fontes
  "cooler master", "coolermaster", "evga", "msi mag", "thermaltake",
  // Gabinetes e Refrigeração
  "rise mode", "nzxt", "kalkan asgard", "deepcool", "lian li", "asus rog", "rog",
  // Periféricos
  "logitech", "razer", "hyperx", "steelseries", "jbl", "pcyes", "redragon", 
  "havit", "warrior", "multilaser", "machenike", "attack shark", "aulastar", "audeze",
];

/**
 * Verifica se o título do produto contém alguma marca relevante.
 */
function matchesRelevantBrand(title) {
  const lowerTitle = title.toLowerCase();
  
  // Primeiro, verifica se não contém termos proibidos (blacklist)
  const hasBlacklist = BLACKLIST_TERMS.some((term) => lowerTitle.includes(term));
  if (hasBlacklist) return false;

  return RELEVANT_BRANDS.some((brand) => lowerTitle.includes(brand));
}

// ═══════════════════════════════════════════════════════════
//  VALIDAÇÃO ANTI-PARCELA
// ═══════════════════════════════════════════════════════════

/**
 * Detecta se um texto contém indicação de parcela/parcelamento.
 * Retorna true se o texto parece ser preço de parcela.
 */
function isInstallmentText(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const installmentPatterns = [
    /\d+x\s*de/i,         // "12x de", "10x de"
    /\d+x\s*r\$/i,        // "12x R$"
    /em\s*até/i,           // "em até 12x"
    /por\s*mês/i,          // "por mês"
    /parcela/i,            // "parcela"
    /parcelado/i,          // "parcelado"
    /mensal/i,             // "mensal"
    /sem\s*juros/i,        // "sem juros" (contexto de parcela)
  ];
  return installmentPatterns.some((p) => p.test(lower));
}

/**
 * Valida que o preço NÃO é absurdo comparado ao preço antigo.
 * Ex: se preço antigo é R$ 100 e preço atual é R$ 8, provavelmente é parcela.
 * Retorna true se o preço parece válido (não é parcela).
 */
function isPriceReasonable(currentPrice, oldPrice) {
  if (!currentPrice || !oldPrice) return true;
  // Se o preço atual é menos de 5% do preço antigo, provavelmente é parcela
  if (currentPrice < oldPrice * 0.05) return false;
  // Se o desconto seria > 95%, provavelmente é parcela confundida
  if (currentPrice > 0 && oldPrice / currentPrice > 20) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════
//  DEDUPLICAÇÃO PERSISTENTE
// ═══════════════════════════════════════════════════════════

function loadSentLinks() {
  try {
    if (fs.existsSync(SENT_LINKS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SENT_LINKS_FILE, "utf-8"));
      return new Set(data);
    }
  } catch (err) {
    console.error("⚠️ Erro ao carregar links salvos:", err.message);
  }
  return new Set();
}

function saveSentLinks(links) {
  try {
    const arr = [...links];
    // Aumentado para 3000 para evitar que promoções recorrentes voltem a ser enviadas
    const trimmed = arr.slice(Math.max(0, arr.length - 3000)); 
    fs.writeFileSync(SENT_LINKS_FILE, JSON.stringify(trimmed, null, 2));
  } catch (err) {
    console.error("⚠️ Erro ao salvar links:", err.message);
  }
}

function normalizeLink(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const paramsToRemove = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", 
      "ref", "sp_id", "click_id", "smid", "pf_rd_r", "pf_rd_p", "pd_rd_wg", 
      "pd_rd_r", "pd_rd_i", "psc", "tag"
    ];
    paramsToRemove.forEach(p => u.searchParams.delete(p));
    let cleaned = u.origin + u.pathname + u.search;
    if (cleaned.endsWith("/")) cleaned = cleaned.slice(0, -1);
    return cleaned;
  } catch (e) {
    return url.split("?")[0].replace(/\/$/, "");
  }
}

// Estado compartilhado de links enviados
const sentLinks = loadSentLinks();

// ─── Utilitários ────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function formatPrice(value) {
  if (!value && value !== 0) return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num <= 0) return null;
  return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getAffiliateLink(link, sourceId) {
  // Conforme solicitado pelo usuário: usar link cru/original.
  return link;
}

function isHighlyRelevant(promo) {
  if (promo.discount <= 50) return false;

  const targetTerms = [
    "placa de vídeo", "placa de video", "vga", "ssd", "nvme", "memória ram", "memoria ram", "ddr4", "ddr5",
    "headset", "water cooler", "air cooler"
  ];
  const searchString = `${promo.category || ""} ${promo.title || ""}`.toLowerCase();

  return targetTerms.some((t) => searchString.includes(t));
}

/**
 * Limpa e extrai número de um texto de preço brasileiro.
 * Ex: "1.299,90" → 1299.90, "R$ 499" → 499
 */
function extractPrice(text) {
  if (!text) return 0;
  // Remove "R$", espaços, e caracteres não numéricos exceto . e ,
  const cleaned = text.replace(/r\$/gi, "").trim();
  // Formato BR: 1.299,90 → remove pontos de milhar, troca vírgula por ponto
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

// ═══════════════════════════════════════════════════════════
//  SCRAPER: KABUM (via __NEXT_DATA__)
// ═══════════════════════════════════════════════════════════

async function fetchKabum() {
  const promos = [];

  for (const category of KABUM_CATEGORIES) {
    try {
      const url = `https://www.kabum.com.br${category.path}`;
      const { data } = await axios.get(url, {
        headers: BROWSER_HEADERS,
        timeout: 20000,
      });

      const $ = cheerio.load(data);
      const nextDataScript = $("#__NEXT_DATA__").html();

      if (!nextDataScript) continue;

      const nextData = JSON.parse(nextDataScript);
      const pageDataStr = nextData.props?.pageProps?.data;
      if (!pageDataStr || typeof pageDataStr !== "string") continue;

      const pageData = JSON.parse(pageDataStr);
      const products = pageData.catalogServer?.data || [];

      for (const product of products) {
        if (!product.available) continue;

        // ══ FILTRO DE MARCA RELEVANTE ══
        if (!matchesRelevantBrand(product.name || "")) continue;

        // ══ VALIDAÇÃO DE DESCONTO REAL ══
        let priceNow = product.priceWithDiscount || product.price;
        const priceOld = product.oldPrice || product.price;

        // KaBuM pode usar um objeto "offer" ativo (Flash Sale) com o preço real no PIX
        if (product.offer && product.offer.priceWithDiscount) {
          priceNow = product.offer.priceWithDiscount;
        }

        if (!priceNow || !priceOld) continue;
        if (priceNow >= priceOld) continue;

        // ══ ANTI-PARCELA ══
        if (!isPriceReasonable(priceNow, priceOld)) continue;

        const discount = Math.round(((priceOld - priceNow) / priceOld) * 100);
        if (discount < 18) continue;

        const link = `https://www.kabum.com.br/produto/${product.code}`;

        promos.push({
          title: product.name,
          price: priceNow,
          oldPrice: priceOld,
          discount,
          link,
          image: product.image || "",
          category: category.label,
          source: STORES.kabum,
        });
      }

      await delay(2000);
    } catch (err) {
      console.error(`  ⚠️ Kabum [${category.label}]:`, err.message);
    }
  }

  promos.sort((a, b) => b.discount - a.discount);
  return promos.slice(0, MAX_PROMOS_PER_CYCLE);
}

// ═══════════════════════════════════════════════════════════
//  SCRAPER: MERCADO LIVRE (via HTML scraping)
// ═══════════════════════════════════════════════════════════

async function fetchMercadoLivre() {
  const promos = [];

  for (const term of ML_SEARCH_TERMS) {
    try {
      const searchTerm = term.replace(/ /g, "-");
      const url = `https://lista.mercadolivre.com.br/${searchTerm}_Desconto_10-100_NoIndex_True`;

      const { data } = await axios.get(url, {
        headers: BROWSER_HEADERS,
        timeout: 20000,
      });

      const $ = cheerio.load(data);

      $("li.ui-search-layout__item").each((i, el) => {
        if (i >= 2) return false;

        try {
          const $el = $(el);

          const title =
            $el.find(".poly-component__title").first().text().trim() ||
            $el.find("h2, h3").first().text().trim();

          if (!title || title.length < 10) return;

          // ══ FILTRO DE MARCA RELEVANTE ══
          if (!matchesRelevantBrand(title)) return;

          // ══ ANTI-PARCELA: verificar contexto do preço ══
          const priceContext = $el.text();
          
          // Preço antigo (riscado)
          let oldPriceNum = 0;
          const oldPriceEl = $el.find(
            "s .andes-money-amount__fraction, " +
            "del .andes-money-amount__fraction, " +
            ".poly-price__original .andes-money-amount__fraction, " +
            '[class*="original"] .andes-money-amount__fraction'
          ).first();

          if (oldPriceEl.length) {
            const oldText = oldPriceEl.text().trim().replace(/\./g, "").replace(",", ".");
            oldPriceNum = parseFloat(oldText);
          }

          if (!oldPriceNum || isNaN(oldPriceNum) || oldPriceNum <= 0) return;

          // Preço atual
          let currentPriceNum = 0;
          const currentPriceEl = $el.find(
            ".poly-price__current .andes-money-amount__fraction"
          ).first();

          if (currentPriceEl.length) {
            const curText = currentPriceEl.text().trim().replace(/\./g, "").replace(",", ".");
            currentPriceNum = parseFloat(curText);

            const centsEl = $el.find(
              ".poly-price__current .andes-money-amount__cents"
            ).first();
            if (centsEl.length) {
              const cents = parseInt(centsEl.text().trim());
              if (!isNaN(cents)) {
                currentPriceNum += cents / 100;
              }
            }
          }

          if (!currentPriceNum || currentPriceNum <= 0) return;
          if (currentPriceNum >= oldPriceNum) return;

          // ══ ANTI-PARCELA ══
          if (!isPriceReasonable(currentPriceNum, oldPriceNum)) return;

          const discount = Math.round(((oldPriceNum - currentPriceNum) / oldPriceNum) * 100);
          if (discount < 18) return;

          // Link
          let link = "";
          $el.find("a").each((_, a) => {
            const href = $(a).attr("href") || "";
            // Filtro rigoroso: deve conter a URL de produto e NÃO conter links de rastreio (click1)
            if (href.includes("mercadolivre.com.br/") && 
                !href.includes("click1.") && 
                (href.includes("/MLB-") || href.includes("p/MLB"))) {
              try {
                const urlObj = new URL(href);
                link = `https://${urlObj.hostname}${urlObj.pathname}`;
              } catch (e) {
                link = href.split("#")[0].split("?")[0];
              }
              return false;
            }
          });

          // Se não encontrou um link limpo de produto, descarta o item para evitar URLs de propaganda
          if (!link) return;

          // Imagem
          const image =
            $el.find("img").first().attr("src") ||
            $el.find("img").first().attr("data-src") ||
            "";

          promos.push({
            title: title.length > 100 ? title.substring(0, 97) + "..." : title,
            price: currentPriceNum,
            oldPrice: oldPriceNum,
            discount,
            link,
            image: image.startsWith("http") ? image : "",
            category: term,
            source: STORES.mercadolivre,
          });
        } catch (parseErr) {
          // Silenciado
        }
      });

      await delay(2500);
    } catch (err) {
      console.error(`  ⚠️ ML [${term}]:`, err.message);
    }
  }

  promos.sort((a, b) => b.discount - a.discount);
  return promos.slice(0, MAX_PROMOS_PER_CYCLE);
}

// ═══════════════════════════════════════════════════════════
//  SCRAPER: AMAZON BR (via HTML scraping)
// ═══════════════════════════════════════════════════════════

async function fetchAmazon() {
  const promos = [];

  for (const term of COMMON_SEARCH_TERMS) {
    try {
      const searchTerm = encodeURIComponent(term);
      // p_n_deal_type:19588566011 = filtro "Em oferta"
      const url = `https://www.amazon.com.br/s?k=${searchTerm}&rh=p_n_deal_type%3A19588566011`;

      const { data } = await axios.get(url, {
        headers: BROWSER_HEADERS,
        timeout: 20000,
      });

      const $ = cheerio.load(data);

      // Amazon usa div[data-component-type="s-search-result"]
      $('[data-component-type="s-search-result"]').each((i, el) => {
        if (i >= 2) return false; // Top 2 por busca

        try {
          const $el = $(el);

          // Título
          const title = $el.find("h2 a span, h2 span").first().text().trim();
          if (!title || title.length < 10) return;

          // ══ FILTRO DE MARCA RELEVANTE ══
          if (!matchesRelevantBrand(title)) return;

          // ══ PREÇOS — cuidado com parcelas! ══
          // Amazon mostra: "R$ 1.771,63" (preço atual) e "R$ 1.870,58" (preço antigo/De:)
          // Também pode mostrar parcelas como "em 12x de R$ XX"

          // Verificar se o contexto do preço contém parcela
          const priceArea = $el.find('.a-price, .a-section').text();

          // Preço atual (o menor, não a parcela)
          let currentPrice = 0;
          const priceWhole = $el.find(".a-price:not([data-a-strike]) .a-price-whole").first().text().trim();
          const priceFraction = $el.find(".a-price:not([data-a-strike]) .a-price-fraction").first().text().trim();
          
          if (priceWhole) {
            currentPrice = extractPrice(priceWhole);
            if (priceFraction) {
              currentPrice += parseInt(priceFraction) / 100;
            }
          }

          if (!currentPrice || currentPrice <= 0) return;

          // Preço antigo (riscado / "De:")
          let oldPrice = 0;
          const oldPriceEl = $el.find(".a-price[data-a-strike] .a-offscreen, .a-text-price .a-offscreen").first();
          if (oldPriceEl.length) {
            const oldText = oldPriceEl.text().trim();
            // ══ ANTI-PARCELA: se texto contém "x de" ou "parcela", ignorar ══
            if (!isInstallmentText(oldText)) {
              oldPrice = extractPrice(oldText);
            }
          }

          // Se não tem preço antigo, não é promoção real
          if (!oldPrice || oldPrice <= 0) return;
          if (currentPrice >= oldPrice) return;

          // ══ ANTI-PARCELA ══
          if (!isPriceReasonable(currentPrice, oldPrice)) return;

          const discount = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
          if (discount < 18) return;

          // Link
          const linkEl = $el.find("h2 a").first();
          let link = linkEl.attr("href") || "";
          if (link && !link.startsWith("http")) {
            link = "https://www.amazon.com.br" + link;
          }
          if (!link) return;
          
          // Limpar link da Amazon: manter apenas o link base sem tracking excessivo, 
          // mas garantindo que o ASIN (identificador do produto) esteja presente.
          if (link.includes("/dp/") || link.includes("/gp/product/")) {
            try {
              const urlObj = new URL(link);
              // Mantém o path que contém o produto, ignora o resto
              link = `https://www.amazon.com.br${urlObj.pathname}`;
            } catch (e) {
              // Mantém original
            }
          }

          // Imagem
          const image = $el.find("img.s-image").first().attr("src") || "";

          promos.push({
            title: title.length > 100 ? title.substring(0, 97) + "..." : title,
            price: currentPrice,
            oldPrice: oldPrice,
            discount,
            link,
            image: image.startsWith("http") ? image : "",
            category: term,
            source: STORES.amazon,
          });
        } catch (parseErr) {
          // Silenciado
        }
      });

      await delay(3000); // Amazon é mais agressiva com rate-limit
    } catch (err) {
      console.error(`  ⚠️ Amazon [${term}]:`, err.message);
    }
  }

  promos.sort((a, b) => b.discount - a.discount);
  return promos.slice(0, MAX_PROMOS_PER_CYCLE);
}

// ═══════════════════════════════════════════════════════════
//  SCRAPER: PICHAU (via HTML / __NEXT_DATA__)
// ═══════════════════════════════════════════════════════════

async function fetchPichau() {
  const promos = [];

  for (const category of PICHAU_CATEGORIES) {
    try {
      const url = `https://www.pichau.com.br${category.path}`;
      
      const response = await gotScraping({
        url,
        headerGeneratorOptions: {
          browsers: [{ name: "chrome", minVersion: 126 }],
          devices: ["desktop"],
          locales: ["pt-BR"],
          operatingSystems: ["windows"],
        },
        headers: {
          Referer: "https://www.pichau.com.br/",
          Origin: "https://www.pichau.com.br",
        },
        timeout: { request: 20000 },
      });

      const data = response.body;
      const $ = cheerio.load(data);

      // Tentar via __NEXT_DATA__ primeiro
      const nextDataScript = $("#__NEXT_DATA__").html();
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript);
          const products = nextData.props?.pageProps?.products?.items ||
                          nextData.props?.pageProps?.data?.products?.items ||
                          [];

          for (const product of products) {
            const name = product.name || "";
            if (!matchesRelevantBrand(name)) continue;

            const priceNow = product.special_price || product.price_range?.minimum_price?.final_price?.value || 0;
            const priceOld = product.price || product.price_range?.minimum_price?.regular_price?.value || 0;

            if (!priceNow || !priceOld) continue;
            if (priceNow >= priceOld) continue;
            if (!isPriceReasonable(priceNow, priceOld)) continue;

            const discount = Math.round(((priceOld - priceNow) / priceOld) * 100);
            if (discount < 18) continue;

            const slug = product.url_key || product.sku || "";
            const link = slug ? `https://www.pichau.com.br/${slug}` : "";
            if (!link) continue;

            const image = product.image?.url || product.small_image?.url || "";

            promos.push({
              title: name,
              price: priceNow,
              oldPrice: priceOld,
              discount,
              link,
              image: image.startsWith("http") ? image : "",
              category: category.label,
              source: STORES.pichau,
            });
          }
        } catch (jsonErr) {
          // __NEXT_DATA__ não tem o formato esperado
        }
      }

      // Fallback: scraping direto de HTML
      if (promos.length === 0) {
        $("[data-cy='list-product'], .MuiGrid-item, .product-card").each((i, el) => {
          if (i >= 3) return false;
          try {
            const $el = $(el);
            const title = $el.find("h2, [data-cy='product-name'], a[title]").first().text().trim() ||
                         $el.find("a[title]").first().attr("title") || "";
            if (!title || !matchesRelevantBrand(title)) return;

            // Extrair preços
            const allPrices = [];
            $el.find("[class*='price'], [class*='Price']").each((_, pe) => {
              const pt = $(pe).text().trim();
              if (pt && !isInstallmentText(pt)) {
                const pv = extractPrice(pt);
                if (pv > 0) allPrices.push(pv);
              }
            });

            if (allPrices.length < 2) return;
            allPrices.sort((a, b) => a - b);
            const priceNow = allPrices[0];
            const priceOld = allPrices[allPrices.length - 1];

            if (priceNow >= priceOld) return;
            if (!isPriceReasonable(priceNow, priceOld)) return;

            const discount = Math.round(((priceOld - priceNow) / priceOld) * 100);
            if (discount < 18) return;

            let link = $el.find("a").first().attr("href") || "";
            if (link && !link.startsWith("http")) {
              link = "https://www.pichau.com.br" + link;
            }
            if (!link) return;

            const image = $el.find("img").first().attr("src") || "";

            promos.push({
              title: title.length > 100 ? title.substring(0, 97) + "..." : title,
              price: priceNow,
              oldPrice: priceOld,
              discount,
              link,
              image: image.startsWith("http") ? image : "",
              category: category.label,
              source: STORES.pichau,
            });
          } catch (e) {
            // Silenciado
          }
        });
      }

      await delay(2500);
    } catch (err) {
      if (err.response?.status === 403) {
        console.error(`  ⚠️ Pichau [${category.label}]: Bloqueado (403) — site rejeita scrapers`);
      } else {
        console.error(`  ⚠️ Pichau [${category.label}]:`, err.message);
      }
    }
  }

  promos.sort((a, b) => b.discount - a.discount);
  return promos.slice(0, MAX_PROMOS_PER_CYCLE);
}

// ═══════════════════════════════════════════════════════════
//  SCRAPER: TERABYTESHOP (via HTML scraping)
// ═══════════════════════════════════════════════════════════

async function fetchTerabyte() {
  const promos = [];

  for (const category of TERABYTE_CATEGORIES) {
    try {
      const url = `https://www.terabyteshop.com.br${category.path}`;
      const { data } = await axios.get(url, {
        headers: {
          ...BROWSER_HEADERS,
          Referer: "https://www.terabyteshop.com.br/",
          Origin: "https://www.terabyteshop.com.br",
        },
        timeout: 20000,
      });

      const $ = cheerio.load(data);

      // TerabyteShop usa cards de produto com classes específicas
      $(".commerce_columns_item, .prd-list-item, [class*='product-card']").each((i, el) => {
        if (i >= 3) return false;
        try {
          const $el = $(el);
          const title = $el.find(".prod-name, h3, h2, a[title]").first().text().trim() ||
                       $el.find("a[title]").first().attr("title") || "";
          if (!title || !matchesRelevantBrand(title)) return;

          // Procurar preço antigo e preço novo
          const allPrices = [];
          $el.find("[class*='price'], [class*='Price'], .prod-old-price, .prod-new-price").each((_, pe) => {
            const pt = $(pe).text().trim();
            if (pt && !isInstallmentText(pt)) {
              const pv = extractPrice(pt);
              if (pv > 0) allPrices.push(pv);
            }
          });

          if (allPrices.length < 2) return;
          allPrices.sort((a, b) => a - b);
          const priceNow = allPrices[0];
          const priceOld = allPrices[allPrices.length - 1];

          if (priceNow >= priceOld) return;
          if (!isPriceReasonable(priceNow, priceOld)) return;

          const discount = Math.round(((priceOld - priceNow) / priceOld) * 100);
          if (discount < 18) return;

          let link = $el.find("a").first().attr("href") || "";
          if (link && !link.startsWith("http")) {
            link = "https://www.terabyteshop.com.br" + link;
          }
          if (!link) return;

          const image = $el.find("img").first().attr("src") ||
                       $el.find("img").first().attr("data-src") || "";

          promos.push({
            title: title.length > 100 ? title.substring(0, 97) + "..." : title,
            price: priceNow,
            oldPrice: priceOld,
            discount,
            link,
            image: image.startsWith("http") ? image : "",
            category: category.label,
            source: STORES.terabyte,
          });
        } catch (e) {
          // Silenciado
        }
      });

      await delay(2500);
    } catch (err) {
      if (err.response?.status === 403) {
        console.error(`  ⚠️ TerabyteShop [${category.label}]: Bloqueado (403) — site rejeita scrapers`);
      } else {
        console.error(`  ⚠️ TerabyteShop [${category.label}]:`, err.message);
      }
    }
  }

  promos.sort((a, b) => b.discount - a.discount);
  return promos.slice(0, MAX_PROMOS_PER_CYCLE);
}

// ═══════════════════════════════════════════════════════════
//  SCRAPER: ALIEXPRESS (via HTML/JSON extraction)
// ═══════════════════════════════════════════════════════════

async function fetchAliExpress() {
  const promos = [];

  for (const term of ALI_SEARCH_TERMS) {
    try {
      const searchTerm = encodeURIComponent(term);
      // AliExpress search URL em português
      const url = `https://pt.aliexpress.com/w/wholesale-${searchTerm}.html?SearchText=${searchTerm}&sortType=default&g=y`;

      const { data } = await axios.get(url, {
        headers: {
          ...BROWSER_HEADERS,
          "Referer": "https://pt.aliexpress.com/",
        },
        timeout: 20000,
      });

      const $ = cheerio.load(data);
      
      // AliExpress injeta dados em scripts. Vamos tentar extrair via Regex se o Cheerio não achar direto.
      let items = [];
      const scriptContent = $("script").filter((i, el) => $(el).html().includes("window.runParams")).html();
      
      if (scriptContent) {
        try {
          // Extrair o JSON de dentro do script
          const jsonStr = scriptContent.match(/window\.runParams\s*=\s*({.+});/)?.[1];
          if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            items = parsed.mods?.itemList?.content || [];
          }
        } catch (e) {
          // Fallback para selectors se JSON falhar
        }
      }

      // Fallback selectors (AliExpress muda muito, esses são alguns comuns)
      if (items.length === 0) {
        $("[class*='search-item-card'], [class*='multi--container']").each((i, el) => {
          if (i >= 3) return false;
          const $el = $(el);
          const title = $el.find("[class*='title--'], h1").text().trim();
          if (!title || !matchesRelevantBrand(title)) return;

          const priceStr = $el.find("[class*='price--value']").text().trim();
          const price = extractPrice(priceStr);
          if (price <= 0) return;

          // AliExpress nem sempre mostra o preço antigo na listagem de busca de forma clara
          const discountStr = $el.find("[class*='price--discount']").text().replace("-", "").replace("%", "").trim();
          const discount = parseInt(discountStr) || 0;
          if (discount < 15) return; // AliExpress tem descontos menores por padrão

          let link = $el.find("a").attr("href") || "";
          if (link && !link.startsWith("http")) link = "https:" + link;
          if (!link) return;

          const image = $el.find("img").attr("src") || "";

          promos.push({
            title: title.length > 100 ? title.substring(0, 97) + "..." : title,
            price: price,
            oldPrice: price / (1 - (discount / 100)),
            discount,
            link: link.split("?")[0], // Limpa rastreio
            image: image.startsWith("http") ? image : "https:" + image,
            category: term,
            source: STORES.aliexpress,
          });
        });
      } else {
        // Processar itens vindos do JSON window.runParams
        for (const item of items) {
          const title = item.title?.displayTitle || "";
          if (!title || !matchesRelevantBrand(title)) continue;

          const price = parseFloat(item.price?.salePrice?.value) || 0;
          if (price <= 0) continue;

          const discount = parseInt(item.price?.discount?.discount) || 0;
          if (discount < 18) continue;

          let link = item.productId ? `https://pt.aliexpress.com/item/${item.productId}.html` : "";
          if (!link) continue;

          const image = item.image?.imgUrl || "";

          promos.push({
            title: title,
            price: price,
            oldPrice: parseFloat(item.price?.originalPrice?.value) || price,
            discount,
            link: link,
            image: image.startsWith("http") ? image : "https:" + image,
            category: term,
            source: STORES.aliexpress,
          });
          if (promos.length >= 3) break;
        }
      }

      await delay(3000);
    } catch (err) {
      console.error(`  ⚠️ AliExpress [${term}]:`, err.message);
    }
  }

  promos.sort((a, b) => b.discount - a.discount);
  return promos.slice(0, MAX_PROMOS_PER_CYCLE);
}

// ═══════════════════════════════════════════════════════════
//  BUSCAR TODAS AS PROMOÇÕES (com dedup)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  BUSCA DE CUPONS (Promobit)
// ═══════════════════════════════════════════════════════════

async function fetchCoupons() {
  const coupons = [];
  const slugs = ['kabum', 'amazon', 'mercado-livre', 'pichau', 'terabyteshop'];

  for (const slug of slugs) {
    try {
      const res = await axios.get(`https://www.promobit.com.br/cupons/loja/${slug}/`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        timeout: 8000
      });
      const $ = cheerio.load(res.data);
      const nextData = $("#__NEXT_DATA__").html();
      if (!nextData) continue;
      
      const data = JSON.parse(nextData);
      const storeCoupons = data.props?.pageProps?.serverCoupons?.coupons || data.props?.pageProps?.couponsByStore || [];
      
      for (const coupon of storeCoupons) {
        if (!coupon.couponCode) continue;

        // Dedup link key is going to be the internal couponUrl
        // so we can deduplicate them naturally using the existing sentLinks Set.
        const dedupeKey = `cupom-${coupon.couponId}`;

        // Map the slug to our local STORES object format
        let storeObj;
        if (slug === 'kabum') storeObj = STORES.kabum;
        else if (slug === 'mercado-livre') storeObj = STORES.mercadolivre;
        else if (slug === 'amazon') storeObj = STORES.amazon;
        else if (slug === 'pichau') storeObj = STORES.pichau;
        else if (slug === 'terabyteshop') storeObj = STORES.terabyteshop;

        const linkMap = {
          "kabum": "https://www.kabum.com.br",
          "amazon": "https://www.amazon.com.br",
          "mercado-livre": "https://www.mercadolivre.com.br",
          "pichau": "https://www.pichau.com.br",
          "terabyteshop": "https://www.terabyteshop.com.br"
        };

        coupons.push({
          isCoupon: true,
          title: coupon.couponTitle || coupon.couponDiscountValue,
          code: coupon.couponCode,
          discount: coupon.couponDiscountValue,
          dedupeKey: `cupom-${coupon.couponId}`,
          link: linkMap[slug],
          image: coupon.storeImage, // Promobit provides the store logo
          category: `Cupons (${storeObj.name})`,
          source: storeObj
        });
      }
    } catch (err) {
      console.error(`  ❌ Erro ao buscar cupons para ${slug}:`, err.message);
    }
  }

  // Same deduplication rule - prevent flood, grab max 3 coupons overall
  // Deduplicação dos cupons: prioriza o código, mas usa o título como fallback
  const seen = new Set();
  const deduped = coupons.filter((c) => {
    const key = (c.code && c.code !== "N/A" ? c.code : c.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, 5); // Apenas os 5 cupons mais quentes de hoje (evita flood)
}

async function fetchAllPromos() {
  console.log("📡 Buscando promoções de todas as fontes...\n");

  const results = await Promise.allSettled([
    fetchKabum().then((p) => {
      console.log(`  🟠 KaBuM!: ${p.length} promoções com desconto real`);
      return p;
    }),
    fetchMercadoLivre().then((p) => {
      console.log(`  🟡 Mercado Livre: ${p.length} promoções com desconto real`);
      return p;
    }),
    fetchAmazon().then((p) => {
      console.log(`  📦 Amazon BR: ${p.length} promoções com desconto real`);
      return p;
    }),
    fetchAliExpress().then((p) => {
      console.log(`  🔴 AliExpress: ${p.length} promoções encontradas`);
      return p;
    }),
    fetchPichau().then((p) => {
      console.log(`  🔴 Pichau: ${p.length} promoções com desconto real`);
      return p;
    }),
    fetchTerabyte().then((p) => {
      console.log(`  🟢 Terabyte: ${p.length} promoções com desconto real`);
      return p;
    }),
    fetchCoupons().then((c) => {
      console.log(`  🏷️ Cupons: ${c.length} códigos ativos resgatados`);
      return c;
    })
  ]);

  const allPromos = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allPromos.push(...result.value);
    } else {
      console.error("  ❌ Fonte falhou:", result.reason?.message);
    }
  }

  // Embaralha para que cupons tenham chance justa de aparecer junto com as promoções
  // Embaralha para que cupons tenham chance justa de aparecer junto com as promoções
  allPromos.sort(() => Math.random() - 0.5);
  
  console.log("🔍 Itens antes do dedup (Top 10):", allPromos.slice(0, 10).map(p => ({ category: p.source.id, title: p.title })));

  // Remover duplicatas por título/código similar
  const seen = new Set();
  const deduped = allPromos.filter((p) => {
    // Definir chave: prioriza código do cupom, caso contrário usa título truncado
    const rawKey = (p.code && p.code !== "N/A" ? p.code : (p.title || ""));
    const key = String(rawKey).toLowerCase().substring(0, 50);
    
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
}

// ═══════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  STORES,
  RELEVANT_BRANDS,
  sentLinks,
  loadSentLinks,
  saveSentLinks,
  delay,
  formatPrice,
  getAffiliateLink,
  isHighlyRelevant,
  matchesRelevantBrand,
  isInstallmentText,
  isPriceReasonable,
  fetchKabum,
  fetchMercadoLivre,
  fetchAmazon,
  fetchAliExpress,
  fetchPichau,
  fetchTerabyte,
  fetchCoupons,
  fetchAllPromos,
  normalizeLink,
  CHECK_INTERVAL: 3 * 60 * 1000,
  MAX_PROMOS_PER_CYCLE,
};
