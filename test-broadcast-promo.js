require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

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
    lines.push(`💰 **R$ 1.234,56**`);
    lines.push(`🏷️ **50% OFF**`);
    lines.push("");
    lines.push(`🛒 **[Comprar agora!](${promo.link})**`);
  }

  embed.setDescription(lines.join("\n"));
  if (promo.image) embed.setImage(promo.image);
  return embed;
}

client.once("ready", async () => {
  console.log(`✅ Logado para teste: ${client.user.tag}`);
  
  const mockPromo = {
    title: "TESTE DE BROADCAST - RTX 4090 SUPER",
    link: "https://www.kabum.com.br",
    price: 1234.56,
    discount: 50,
    source: { name: "KaBuM!", emoji: "🔵", color: "#0060b1" },
    image: "https://images.kabum.com.br/produtos/fotos/516246/placa-de-video-rtx-4090-super_1706642055_m.jpg"
  };

  console.log(`📤 Enviando teste para ${Object.keys(guildChannels).length} servidores...`);

  const embed = createDiscordEmbed(mockPromo);
  const payload = { embeds: [embed] };

  for (const [guildId, channelId] of Object.entries(guildChannels)) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send(payload);
        console.log(`✅ Sucesso no Servidor: ${guildId} (Canal: ${channel.name})`);
      }
    } catch (err) {
      console.error(`❌ Erro no Servidor ${guildId}:`, err.message);
    }
  }

  console.log("🏁 Teste finalizado. Saindo...");
  process.exit(0);
});

client.login(DISCORD_TOKEN);
