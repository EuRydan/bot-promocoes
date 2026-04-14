const { matchesRelevantBrand } = require("../scraper");

const testCases = [
  { title: "Water Cooler NZXT Kraken 240", expected: true },
  { title: "Deepcool AK400 Air Cooler", expected: true },
  { title: "Lian Li Galahad II Trinity", expected: true },
  { title: "ASUS ROG Ryujin III", expected: true },
  { title: "ROG STRIX LC III", expected: true },
  { title: "Headset Audeze Maxwell", expected: true },
  { title: "Rise Mode G800 Fan", expected: true },
  { title: "PC Gamer Montado com RTX", expected: false }, // Should be blacklisted
  { title: "Computador Escritório", expected: false }, // Should be blacklisted
  { title: "Fonte genérica 500w", expected: false }, // Not in whitelist
];

console.log("🧪 Iniciando testes de marcas e categorias...");

let successCount = 0;
testCases.forEach((t, i) => {
  const result = matchesRelevantBrand(t.title);
  if (result === t.expected) {
    console.log(`✅ [Teste ${i + 1}] Passou: "${t.title}"`);
    successCount++;
  } else {
    console.error(`❌ [Teste ${i + 1}] Falhou: "${t.title}" (Esperado: ${t.expected}, Recebido: ${result})`);
  }
});

console.log(`\n📊 Resultado: ${successCount}/${testCases.length} testes passaram.`);

if (successCount === testCases.length) {
  process.exit(0);
} else {
  process.exit(1);
}
