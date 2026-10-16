const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Gửi tin nhắn văn bản qua bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Nội dung tin nhắn muốn gửi')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Kênh nhận tin nhắn (mặc định: kênh hiện tại)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    if (!targetChannel.isTextBased()) {
      return interaction.reply({
        content: 'Kênh được chọn không phải là kênh văn bản hợp lệ.',
        ephemeral: true
      });
    }

    try {
      // Cho phép xử lý ký tự xuống dòng \n nếu người dùng gõ
      const formattedMessage = message.replace(/\\n/g, '\n');

      await targetChannel.send({ content: formattedMessage });

      await interaction.reply({
        content: `Đã gửi tin nhắn thành công tới kênh <#${targetChannel.id}>.`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: `Lỗi khi gửi tin nhắn: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
