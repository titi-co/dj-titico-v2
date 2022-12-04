require("dotenv").config();

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { Player } = require("discord-player");
const lyricsFinder = require("lyrics-finder");

const fs = require("fs");
const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("@discordjs/builders");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// List of all commands
const commands = [];
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands"); // E:\yt\discord bot\js\intro\commands
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

// Add the player on the client
client.player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

client.on("ready", () => {
  const guild_ids = client.guilds.cache.map((guild) => guild.id);

  const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
  for (const guildId of guild_ids) {
    rest
      .put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), {
        body: commands,
      })
      .then(() =>
        console.log("Comandos atualizados com sucesso para a guild " + guildId)
      )
      .catch(console.error);
  }
});

const prefix = ">";
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  let embed = new EmbedBuilder();

  embed
    .setTitle("Opa... acho que você errou 🫢")
    .setDescription(
      "Parece que você tentou me chamar, mas usou o comando errado!\n\nEu atualizei e agora respondo apenas por **SlashCommands**\nPara me usar, digite **/djtitico** e escolha algum dos métodos que eu te sugerir.\n\n É facil! Bora, me chama pra festa!"
    )
    .setColor([251, 37, 118]);

  return message.channel.send({ embeds: [embed] });
});

let row = new ActionRowBuilder();
row.addComponents([
  new ButtonBuilder()
    .setCustomId("resume")
    .setLabel("▶️")
    .setStyle("Primary")
    .setDisabled(true),
  new ButtonBuilder().setCustomId("pause").setLabel("⏸️").setStyle("Primary"),
  new ButtonBuilder().setCustomId("lyrics").setLabel("🎤").setStyle("Primary"),
]);

client.player.on("trackStart", (queue, track) => {
  let embed = new EmbedBuilder();
  embed
    .setTitle("DJ Titico esta tocando:")
    .setDescription(`**[${track.title}](${track.url})**`)
    .setFields([
      { name: "Duração", value: track.duration, inline: true },
      track.views !== 0
        ? { name: "Views", value: "" + track.views, inline: true }
        : null,
      { name: "Autor", value: track.author, inline: true },
    ])
    .setThumbnail(track.thumbnail)
    .setColor([88, 101, 242])
    .setFooter({
      text: `Pedida por: ${queue.metadata.member.nickname}`,
      iconURL: `https://cdn.discordapp.com/avatars/${track.requestedBy.id}/${track.requestedBy.avatar}.png?size=256`,
    });

  queue.metadata.channel.send({ embeds: [embed], components: [row] });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand() && !interaction.isButton()) return;

  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute({ client, interaction });
    } catch (error) {
      console.error(error);

      let embed = new EmbedBuilder();
      embed
        .setTitle("DJ Titico parou de funfar")
        .setDescription(
          "Caso o problema persista, contate Titico para solução."
        )
        .setThumbnail("attachment://error.gif")
        .setColor([220, 53, 53]);
      await interaction.reply({
        embeds: [embed],
        files: ["./error.gif"],
      });
    }
  } else if (interaction.isButton()) {
    const queue = client.player.getQueue(interaction.guildId);
    const currentSong = queue.current;

    if (!queue || !queue.playing) {
      embed
        .setTitle("DJ Titico ta sem serviço")
        .setDescription("Não tem nenhuma música na fila.")
        .setColor([255, 211, 114]);
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.customId === "pause") {
      row.components[0].setDisabled(false);
      row.components[1].setDisabled(true);

      queue.setPaused(true);

      await interaction.update({ components: [row] });
    } else if (interaction.customId === "resume") {
      row.components[0].setDisabled(true);
      row.components[1].setDisabled(false);

      queue.setPaused(false);

      await interaction.update({ components: [row] });
    } else if (interaction.customId === "lyrics") {
      await interaction.deferReply();
      let regEx = new RegExp("\\[.*\\]|\\(.*?\\)", "g");
      let lyrics =
        (await lyricsFinder(
          currentSong.author,
          currentSong.title.replace(currentSong.author, "").replace(regEx, "")
        )) || "Letra não encontrada.";

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(currentSong.title)
            .setDescription(lyrics)
            .setColor([251, 37, 118])
            .setThumbnail(currentSong.thumbnail),
        ],
      });

      return;
    }
  }
});

client.login(process.env.TOKEN);
