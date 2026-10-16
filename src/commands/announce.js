const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Gửi thông báo dạng Embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Tiêu đề thông báo')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Nội dung thông báo')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Kênh nhận thông báo (mặc định: kênh hiện tại)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('Màu sắc khung thông báo')
        .addChoices(
          { name: 'Xanh dương (Mặc định)', value: 'BLUE' },
          { name: 'Xanh lá cây (An toàn / Thành công)', value: 'GREEN' },
          { name: 'Đỏ (Khẩn cấp / Cảnh báo)', value: 'RED' },
          { name: 'Vàng cam (Lưu ý / Nhắc nhở)', value: 'GOLD' },
          { name: 'Tím (Sang trọng / Sự kiện)', value: 'PURPLE' }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('mention')
        .setDescription('Tùy chọn tag thông báo')
        .addChoices(
          { name: 'Không tag ai', value: 'none' },
          { name: '@everyone (Tất cả mọi người)', value: 'everyone' },
          { name: '@here (Những người đang online)', value: 'here' }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const colorChoice = interaction.options.getString('color') || 'BLUE';
    const mentionChoice = interaction.options.getString('mention') || 'none';

    if (!targetChannel.isTextBased()) {
      return interaction.reply({
        content: 'Kênh được chọn không phải là kênh văn bản hợp lệ.',
        ephemeral: true
      });
    }

    // Bảng mã màu HEX
    const colorMap = {
      BLUE: 0x3498DB,
      GREEN: 0x2ECC71,
      RED: 0xE74C3C,
      GOLD: 0xF1C40F,
      PURPLE: 0x9B59B6
    };

    // Xử lý xuống dòng \n
    const formattedMessage = message.replace(/\\n/g, '\n');

    const embed = new EmbedBuilder()
      .setColor(colorMap[colorChoice] || 0x3498DB)
      .setTitle(title)
      .setDescription(formattedMessage)
      .setFooter({ text: 'Niên Du' })
      .setTimestamp();

    try {
      let content = undefined;
      if (mentionChoice === 'everyone') content = '@everyone';
      if (mentionChoice === 'here') content = '@here';

      await targetChannel.send({
        content,
        embeds: [embed]
      });

      await interaction.reply({
        content: `Đã gửi thông báo thành công tới kênh <#${targetChannel.id}>.`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: `Lỗi khi gửi thông báo: ${err.message}`,
        ephemeral: true
      });
    }
  }
};
