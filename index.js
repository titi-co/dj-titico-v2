require("dotenv").config();

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { Player } = require("discord-player");

const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("@discordjs/builders");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
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
  // Get all ids of the servers
  const guild_ids = client.guilds.cache.map((guild) => guild.id);

  const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
  for (const guildId of guild_ids) {
    rest
      .put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), {
        body: commands,
      })
      .then(() =>
        console.log("Successfully updated commands for guild " + guildId)
      )
      .catch(console.error);
  }
});

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
    .setColor([109, 103, 228])
    .setFooter({
      text: `Pedida por: <@${queue.metadata.member.nickname}>`,
      iconURL: `https://cdn.discordapp.com/avatars/${track.requestedBy.id}/${track.requestedBy.avatar}.png?size=256`,
    });

  queue.metadata.channel.send({ embeds: [embed] });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute({ client, interaction });
  } catch (error) {
    console.error(error);

    let embed = new EmbedBuilder();
    embed
      .setTitle("DJ Titico parou de funfar :(")
      .setDescription("Caso o problema persista, contate Titico para solução.")
      .setThumbnail("attachment://error.gif")
      .setColor([220, 53, 53]);
    await interaction.reply({
      embeds: [embed],
      files: ["./error.gif"],
    });
  }
});

client.login(process.env.TOKEN);
