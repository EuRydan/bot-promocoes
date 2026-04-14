require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const { fetchAllPromos, formatPrice, isHighlyRelevant } = require("./scraper");

// Configurações
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNELS_FILE = "./channels.json";

function loadChannels() {
  if (fs.existsSync(CHANNELS_FILE)) return JSON.parse(fs.readFileSync(CHANNELS_FILE));
  return {};
}

const guildChannels = loadChannels();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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

client.once("ready", async () => {
  console.log(`✅ Logado para teste real: ${client.user.tag}`);
  
  console.log("🔍 Buscando promoções reais (isso pode levar alguns segundos)...");
  try {
    const promos = await fetchAllPromos();
    
    if (promos.length === 0) {
      console.log("⚠️ Nenhuma promoção encontrada no momento.");
      process.exit(0);
    }

    const promo = promos[0]; // Pega a primeira promoção encontrada
    console.log(`🔥 Promoção selecionada: ${promo.title}`);

    const embed = createDiscordEmbed(promo);
    const payload = { embeds: [embed] };
    
    if (isHighlyRelevant(promo) && !promo.isCoupon) {
      payload.content = "📢 @everyone 🔥 **OFERTA IMPERDÍVEL COM MAIS DE 50% OFF!**";
    }

    console.log(`📤 Enviando para ${Object.keys(guildChannels).length} servidores...`);

    for (const [guildId, channelId] of Object.entries(guildChannels)) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
          await channel.send(payload);
          console.log(`✅ Enviado para Servidor: ${guildId} (Canal: ${channel.name})`);
        }
      } catch (err) {
        console.error(`❌ Erro no Servidor ${guildId}:`, err.message);
      }
    }

  } catch (err) {
    console.error("❌ Erro ao buscar/enviar promoções:", err.message);
  }

  console.log("🏁 Teste de promoção real finalizado.");
  process.exit(0);
});

client.login(DISCORD_TOKEN);
