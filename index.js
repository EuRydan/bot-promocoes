require("dotenv").config();

const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require("discord.js");
const TelegramBot = require("node-telegram-bot-api");
const {
  sentLinks,
  saveSentLinks,
  delay,
  formatPrice,
  getAffiliateLink,
  isHighlyRelevant,
  fetchAllPromos,
  normalizeLink,
  CHECK_INTERVAL,
  MAX_PROMOS_PER_CYCLE,
} = require("./scraper");

const minutesInterval = CHECK_INTERVAL / (60 * 1000);

// ─── Configurações ──────────────────────────────────────────
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const fs = require("fs");

const CHANNELS_FILE = "./channels.json";

function loadChannels() {
  if (fs.existsSync(CHANNELS_FILE)) return JSON.parse(fs.readFileSync(CHANNELS_FILE));
  return {};
}

function saveChannels(data) {
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(data, null, 2));
}

let guildChannels = loadChannels();
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!DISCORD_TOKEN) {
  console.error("❌ Token do Discord não encontrado no .env!");
  process.exit(1);
}

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("❌ Configuração do Telegram incompleta no .env!");
  process.exit(1);
}

// ─── Estado do Bot ──────────────────────────────────────────
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const telegramQueue = [];
let telegramCycleActive = true;
let telegramCycleStartTime = Date.now();

const TELEGRAM_ACTIVE_DURATION = 15 * 60 * 1000; // Aumentado para 15 minutos
const TELEGRAM_REST_DURATION = 3 * 60 * 1000;   // Reduzido para 3 minutos
const TELEGRAM_SEND_INTERVAL = 15000;          // ~4 itens por minuto (15s cada)

console.log("🚀 Iniciando Promo.Rydanbot Unificado com Fila Cíclica para Telegram...");

// ═══════════════════════════════════════════════════════════
//  FORMATAÇÃO: DISCORD
// ═══════════════════════════════════════════════════════════

function createDiscordEmbed(promo) {
  const embed = new EmbedBuilder()
    .setColor(promo.source.color)
    .setTitle(`${promo.source.emoji} ${promo.title}`)
    .setURL(promo.link)
    .setTimestamp()
    .setFooter({ text: `${promo.source.name} • ${promo.category || "Hardware"}` });

  const lines = [];
  if (promo.isCoupon) {
    lines.push(`🔥 **CUPOM PARA ${promo.source.name.toUpperCase()}**`);
    if (promo.discount) lines.push(`💰 Desconto: **${promo.discount}**`);
    lines.push(`🏷️ Cupom: **\`${promo.code}\`**`);
    lines.push("");
    lines.push(`🛒 **[Acessar a loja!](${promo.link})**`);
  } else {
    if (promo.oldPrice) lines.push(`~~${formatPrice(promo.oldPrice)}~~`);
    if (promo.price) lines.push(`💰 **${formatPrice(promo.price)}**`);
    if (promo.discount > 0) lines.push(`🏷️ **${promo.discount}% OFF**`);
    lines.push("");
    lines.push(`🛒 **[Comprar agora!](${promo.link})**`);
  }

  embed.setDescription(lines.join("\n"));
  if (promo.image && promo.image.startsWith("http")) embed.setImage(promo.image);
  return embed;
}

// ═══════════════════════════════════════════════════════════
//  FORMATAÇÃO: TELEGRAM
// ═══════════════════════════════════════════════════════════

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function createTelegramMessage(promo) {
  const lines = [];
  if (promo.isCoupon) {
    lines.push(`🔥 <b>CUPOM PARA ${promo.source.name.toUpperCase()}</b>`);
    lines.push("");
    if (promo.discount) lines.push(`💰 Desconto: <b>${escapeHtml(promo.discount)}</b>`);
    lines.push(`🏷️ Cupom: <code>${escapeHtml(promo.code)}</code>`);
    lines.push("");
    lines.push(`🛒 <a href="${promo.link}">Acessar a loja!</a>`);
  } else {
    lines.push(`${promo.source.emoji} <b>${escapeHtml(promo.title)}</b>`);
    lines.push("");
    if (promo.oldPrice) lines.push(`❌ <s>${formatPrice(promo.oldPrice)}</s>`);
    if (promo.price) lines.push(`💰 <b>${formatPrice(promo.price)}</b>`);
    if (promo.discount > 0) lines.push(`🏷️ <b>${promo.discount}% OFF</b>`);
    lines.push("");
    lines.push(`🏪 ${promo.source.name} • ${escapeHtml(promo.category || "Hardware")}`);
    lines.push("");
    lines.push(`🛒 <a href="${promo.link}">Comprar agora!</a>`);
  }
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════
//  PROCESSO DE ENVIO: DISCORD (Imediato, limitado por ciclo)
// ═══════════════════════════════════════════════════════════

async function sendToDiscord(promo) {
  const embed = createDiscordEmbed(promo);
  const payload = { embeds: [embed] };
  if (isHighlyRelevant(promo) && !promo.isCoupon) {
    payload.content = "📢 @everyone 🔥 **OFERTA IMPERDÍVEL COM MAIS DE 50% OFF!**";
  }

  let totalSuccess = false;
  for (const [guildId, channelId] of Object.entries(guildChannels)) {
    try {
      const channel = await discordClient.channels.fetch(channelId);
      if (channel) {
        await channel.send(payload);
        totalSuccess = true;
      }
    } catch (err) {
      console.error(`❌ Erro ao enviar no servidor ${guildId}:`, err.message);
    }
  }
  return totalSuccess;
}

// ═══════════════════════════════════════════════════════════
//  PROCESSO DE ENVIO: TELEGRAM (Via Fila e Worker Ciclo)
// ═══════════════════════════════════════════════════════════

async function sendToTelegram(promo) {
  try {
    const htmlMsg = createTelegramMessage(promo);
    const options = { parse_mode: "HTML" };
    
    let finalMsg = htmlMsg;
    if (isHighlyRelevant(promo) && !promo.isCoupon) {
      finalMsg = "📢 🔥 <b>OFERTA IMPERDÍVEL COM MAIS DE 50% OFF!</b>\n\n" + htmlMsg;
    }

    if (promo.image && promo.image.startsWith("http")) {
      await telegramBot.sendPhoto(TELEGRAM_CHAT_ID, promo.image, {
        caption: finalMsg,
        parse_mode: "HTML",
      });
    } else {
      await telegramBot.sendMessage(TELEGRAM_CHAT_ID, finalMsg, options);
    }
    return true;
  } catch (err) {
    console.error("❌ Erro Telegram:", err.message);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
//  WORKER DO TELEGRAM: Ciclo 10min ON / 5min OFF
// ═══════════════════════════════════════════════════════════

async function telegramWorker() {
  setInterval(async () => {
    const now = Date.now();
    const elapsed = now - telegramCycleStartTime;
    
    // Gerenciar mudança de estado no ciclo
    if (telegramCycleActive) {
      if (elapsed >= TELEGRAM_ACTIVE_DURATION) {
        console.log("⏸️ Telegram entrando em pausa de 5 minutos...");
        telegramCycleActive = false;
        telegramCycleStartTime = now;
        return;
      }
    } else {
      if (elapsed >= TELEGRAM_REST_DURATION) {
        console.log("▶️ Telegram saindo da pausa, iniciando 10 minutos de envio...");
        telegramCycleActive = true;
        telegramCycleStartTime = now;
        // Não return, já pode tentar enviar item abaixo
      } else {
        return; // Está no descanso
      }
    }

    // Verificar janela de tempo (08:00 - 23:59)
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 7) {
      return; // Madrugada (00h-07h) preserva a fila e não envia
    }

    // Enviar próximo item da fila
    if (telegramQueue.length > 0) {
      const promo = telegramQueue.shift();
      console.log(`📤 Telegram enviando da fila: ${promo.title} (${telegramQueue.length} restantes)`);
      await sendToTelegram(promo);
    }
  }, TELEGRAM_SEND_INTERVAL);
}

// ═══════════════════════════════════════════════════════════
//  ORQUESTRADOR DO SCRAPER
// ═══════════════════════════════════════════════════════════

async function runScraperCycle() {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 0 && currentHour < 7) {
    console.log(`\n⏰ [${now.toLocaleString("pt-BR")}] Scraper em espera (descanso 00h-07h)`);
    return;
  }

  console.log(`\n🔄 [${now.toLocaleString("pt-BR")}] Iniciando busca de promoções...`);
  
  try {
    const promos = await fetchAllPromos();
    let discordCount = 0;
    let telegramAddedCount = 0;

    for (const promo of promos) {
      // Normalizar o link para evitar duplicatas por parâmetros de rastreio (UTM, etc)
      const cleanLink = normalizeLink(promo.link);
      const uniqueKey = promo.dedupeKey || cleanLink;
      const alreadySent = sentLinks.has(uniqueKey);

      // 1. Processo Discord (Apenas os top N que não foram enviados)
      if (!alreadySent && discordCount < MAX_PROMOS_PER_CYCLE) {
        const success = await sendToDiscord(promo);
        if (success) {
          sentLinks.add(uniqueKey); // Marca como enviado para evitar repetição
          discordCount++;
        }
      }

      // 2. Processo Telegram (Sempre adiciona à fila se não foi enviado)
      // Checamos duplicatas na fila por link limpo
      const isInQueue = telegramQueue.some(p => (p.dedupeKey || normalizeLink(p.link)) === uniqueKey);
      if (!alreadySent && !isInQueue) {
        telegramQueue.push(promo);
        sentLinks.add(uniqueKey); // Marca como "visto/em fila" para evitar duplicar no próximo ciclo
        telegramAddedCount++;
      }
    }

    if (discordCount > 0 || telegramAddedCount > 0) {
      saveSentLinks(sentLinks);
      console.log(`✅ Ciclo finalizado: Discord env ${discordCount} | Telegram fila +${telegramAddedCount} (Total Fila: ${telegramQueue.length})`);
    } else {
      console.log("ℹ️ Nenhuma promoção nova neste ciclo.");
    }
  } catch (err) {
    console.error("❌ Erro no ciclo do scraper:", err.message);
  }
}

// ─── Eventos e Comandos ──────────────────────────────────────

discordClient.on("ready", async () => {
  console.log(`✅ Discord pronto: ${discordClient.user.tag}`);

  const command = new SlashCommandBuilder()
    .setName("setcanal")
    .setDescription("Define o canal onde as promoções serão enviadas")
    .addChannelOption(opt =>
      opt.setName("canal")
        .setDescription("Canal de texto")
        .setRequired(true)
    );

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(discordClient.user.id), {
    body: [command.toJSON()],
  });

  console.log("✅ Comando /setcanal registrado globalmente.");
});

discordClient.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setcanal") {
    if (!interaction.memberPermissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Apenas administradores podem usar este comando.", ephemeral: true });
    }

    const canal = interaction.options.getChannel("canal");
    guildChannels[interaction.guildId] = canal.id;
    saveChannels(guildChannels);

    await interaction.reply({ content: `✅ Canal configurado! As promoções serão enviadas em ${canal}`, ephemeral: true });
  }
});

telegramBot.onText(/\/status/, (msg) => {
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 0 && currentHour < 7;
  const statusCycle = telegramCycleActive ? "Ativo (Enviando)" : "Em Pausa (Rest)";

  telegramBot.sendMessage(msg.chat.id, 
    `📊 <b>Status do Rydanbot</b>\n\n` +
    `📁 Links salvos: <b>${sentLinks.size}</b>\n` +
    `📥 Fila Telegram: <b>${telegramQueue.length} itens</b>\n` +
    `🔄 Ciclo Telegram: <b>${isNight ? "Dormindo (Pausa 00-07h)" : statusCycle}</b>\n` +
    `⏱️ Scraper: <b>A cada ${minutesInterval} min</b>`, 
    { parse_mode: "HTML" }
  );
});

// ─── Inicialização ──────────────────────────────────────────

async function start() {
  await discordClient.login(DISCORD_TOKEN);
  
  // Iniciar Worker da fila do Telegram
  telegramWorker();

  // Primeira execução do scraper
  runScraperCycle();

  // Agendar scraper
  setInterval(runScraperCycle, CHECK_INTERVAL);
}

start().catch(err => {
  console.error("❌ Erro fatal na inicialização:", err);
  process.exit(1);
});