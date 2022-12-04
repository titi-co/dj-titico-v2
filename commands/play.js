const { SlashCommandBuilder, EmbedBuilder } = require("@discordjs/builders");
const { QueryType } = require("discord-player");
const lyricsFinder = require("lyrics-finder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("djtitico")
    .setDescription("Toca uma musica do Youtube ou Spotify")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("playlist")
        .setDescription("Procura e toca uma playlist")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("a url da playlist")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Procura e toca uma musica")
        .addStringOption((option) =>
          option
            .setName("musica")
            .setDescription("a url ou o nome da musica")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("queue")
        .setDescription("Mostra as proximas 10 musicas na fila")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("skip").setDescription("Pula uma musica")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("fuckoff").setDescription("Expulsa o DJ Titico")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("lyrics").setDescription("Mostra a letra da musica")
    ),
  execute: async ({ client, interaction }) => {
    let embed = new EmbedBuilder();

    if (!interaction.member.voice.channel) {
      await interaction.deferReply();
      embed
        .setTitle("DJ Titico não foi convidado pra festa :(")
        .setDescription(
          "O DJ Titico tem que estar em um canal pra tocar musica ou fazer algo. Convida ele pra festa!"
        )
        .setColor([220, 53, 53]);
      return interaction.editReply({ embeds: [embed] });
    }

    const queue = await client.player.createQueue(interaction.guild, {
      metadata: interaction,
    });

    if (!queue.connection)
      await queue.connect(interaction.member.voice.channel);

    if (interaction.options.getSubcommand() === "play") {
      let url = interaction.options.getString("musica");

      const result = await client.player.search(url, {
        requestedBy: interaction.user,
        searchEngine: QueryType.AUTO,
      });

      if (result.tracks.length === 0) {
        await interaction.deferReply();
        embed
          .setTitle("DJ Titico não achou essa musica :(")
          .setDescription("Não achei essa música, tenta denovo ai!")
          .setColor([244, 157, 26]);
        return interaction.editReply({ embeds: [embed] });
      }

      const song = result.tracks[0];

      await queue.addTrack(song);
      embed
        .setTitle("DJ Titico adicionou na fila:")
        .setDescription(`**[${song.title}](${song.url})**`)
        .setFields([
          { name: "Duração", value: song.duration, inline: true },
          song.views !== 0
            ? { name: "Views", value: "" + song.views, inline: true }
            : null,
          { name: "Autor", value: song.author, inline: true },
        ])
        .setThumbnail(song.thumbnail)
        .setColor([88, 101, 242])
        .setFooter({
          text: `Pedida por: ${interaction.member.nickname}`,
          iconURL: `https://cdn.discordapp.com/avatars/${song.requestedBy.id}/${song.requestedBy.avatar}.png?size=256`,
        });
    } else if (interaction.options.getSubcommand() === "playlist") {
      let url = interaction.options.getString("url");
      const result = await client.player.search(url, {
        requestedBy: interaction.user,
        searchEngine: QueryType.AUTO,
      });

      if (result.tracks.length === 0) {
        await interaction.deferReply();
        embed
          .setTitle("DJ Titico não achou essa playlist :(")
          .setDescription("Não achei essa playlist, tenta denovo ai!")
          .setColor([244, 157, 26]);
        return interaction.editReply({ embeds: [embed] });
      }

      const playlist = result.playlist;

      await queue.addTracks(result.tracks);
      embed
        .setTitle("DJ Titico adicionou na fila a playlist:")
        .setDescription(`**[${playlist.title}](${playlist.url})**`)
        .setFields([
          {
            name: "Número de musicas",
            value: "" + playlist.tracks.length,
            inline: true,
          },
        ])
        .setThumbnail(playlist.thumbnail)
        .setColor([88, 101, 242])
        .setFooter({
          text: `Pedida por: ${interaction.member.nickname}`,
          iconURL: `https://cdn.discordapp.com/avatars/${result.tracks[0].requestedBy.id}/${result.tracks[0].requestedBy.avatar}.png?size=256`,
        });
    } else if (interaction.options.getSubcommand() === "queue") {
      const queue = client.player.getQueue(interaction.guildId);

      if (!queue || !queue.playing) {
        await interaction.deferReply();
        embed
          .setTitle("DJ Titico ta sem serviço")
          .setDescription("Não tem nenhuma música na fila.")
          .setColor([255, 211, 114]);
        return interaction.editReply({ embeds: [embed] });
      }

      const queueString = queue.tracks
        .slice(0, 10)
        .map((song, i) => {
          return `**${i + 1})** \`[${song.duration}]\` ${song.title} - <@${
            song.requestedBy.id
          }>`;
        })
        .join("\n");

      const currentSong = queue.current;

      await interaction.deferReply();
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Playlist do DJ Titico")
            .setDescription(
              `**Tocando agora**\n` +
                (currentSong
                  ? `\`[${currentSong.duration}]\` ${currentSong.title} - <@${currentSong.requestedBy.id}>`
                  : "None")
            )
            .setColor([251, 37, 118])
            .setThumbnail(currentSong.thumbnail)
            .setFields([{ name: "Queue", value: queueString }]),
        ],
      });

      return;
    } else if (interaction.options.getSubcommand() === "skip") {
      const queue = client.player.getQueue(interaction.guildId);

      if (!queue || !queue.playing || queue.tracks.length === 0) {
        await interaction.deferReply();
        embed
          .setTitle("DJ Titico ta sem serviço")
          .setDescription("Não tem nenhuma música na fila.")
          .setColor([255, 211, 114]);
        return interaction.editReply({ embeds: [embed] });
      }

      const currentSong = queue.current;

      queue.skip();

      embed
        .setTitle("DJ Titico pulou uma musica")
        .setDescription(
          `${currentSong.title} - <@${currentSong.requestedBy.id}>`
        )
        .setColor([251, 37, 118])
        .setThumbnail(currentSong.thumbnail);
    } else if (interaction.options.getSubcommand() === "fuckoff") {
      const queue = client.player.getQueue(interaction.guildId);

      queue.destroy();

      await interaction.deferReply();
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("DJ Titico foi expulso :/")
            .setDescription("Vishkkkkkk, me expulsaram.")
            .setColor([220, 53, 53]),
        ],
      });

      return;
    } else if (interaction.options.getSubcommand() === "lyrics") {
      const queue = client.player.getQueue(interaction.guildId);

      if (!queue || !queue.playing) {
        await interaction.deferReply();
        embed
          .setTitle("DJ Titico ta sem serviço")
          .setDescription("Não tem nenhuma música na fila.")
          .setColor([255, 211, 114]);
        return interaction.editReply({ embeds: [embed] });
      }

      const currentSong = queue.current;
      let regEx = new RegExp("\\[.*\\]|\\(.*?\\)", "g");
      let lyrics =
        (await lyricsFinder(
          currentSong.author,
          currentSong.title.replace(currentSong.author, "").replace(regEx, "")
        )) || "Letra não encontrada :(";

      await interaction.deferReply();
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

    if (!queue.playing) await queue.play();
    await interaction.deferReply();
    await interaction.editReply({
      embeds: [embed],
    });
  },
};
