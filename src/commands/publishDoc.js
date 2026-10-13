const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { config } = require('../config');
const { resolveAndStorePdf } = require('../services/fileScanner');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('publish-doc')
    .setDescription('Đăng tải bài viết chia sẻ tài liệu kèm nút tải cá nhân hóa (Chỉ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Tiêu đề tài liệu hiển thị cho thành viên')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option
        .setName('file_upload')
        .setDescription('Kéo thả / Đính kèm file PDF trực tiếp (dành cho người ở máy tính khác hoặc điện thoại)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('file_name')
        .setDescription('Hoặc chọn file PDF có sẵn trên máy (tự quét Desktop, Downloads và kho lưu trữ)')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('Mô tả ngắn gọn về tài liệu')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('required_role')
        .setDescription('Chỉ định Role bắt buộc mới được phép tải tài liệu này (Tùy chọn)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('log_channel')
        .setDescription('Chọn kênh nhận thông báo log khi có người tải (Mặc định: kênh trong .env)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const fileUpload = interaction.options.getAttachment('file_upload');
    const rawFileName = interaction.options.getString('file_name');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || 'Tài liệu độc quyền lưu hành nội bộ.';
    const requiredRole = interaction.options.getRole('required_role');
    const logChannel = interaction.options.getChannel('log_channel');

    let fileName = '';

    // Trường hợp 1: Người dùng đính kèm file trực tiếp qua Discord (người khác ở máy khác hoặc điện thoại)
    if (fileUpload) {
      const uploadName = fileUpload.name.toLowerCase();

      // Cảnh báo nếu là file Word
      if (uploadName.endsWith('.doc') || uploadName.endsWith('.docx')) {
        return interaction.editReply({
          content: 'Tài liệu đang ở định dạng Word (.doc/.docx). Vui lòng mở file bằng Word, chọn "Save As" (hoặc Export) sang định dạng PDF rồi tải lên lại để bảo vệ bản quyền.'
        });
      }

      if (!uploadName.endsWith('.pdf')) {
        return interaction.editReply({
          content: 'Hệ thống chỉ hỗ trợ tài liệu định dạng PDF.'
        });
      }

      try {
        if (!fs.existsSync(config.paths.rawDocs)) {
          fs.mkdirSync(config.paths.rawDocs, { recursive: true });
        }

        fileName = path.basename(fileUpload.name);
        const destinationPath = path.join(config.paths.rawDocs, fileName);

        const response = await fetch(fileUpload.url);
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(destinationPath, Buffer.from(arrayBuffer));
      } catch (err) {
        return interaction.editReply({
          content: `Lỗi khi lưu file đính kèm: ${err.message}`
        });
      }
    }
    // Trường hợp 2: Chọn từ danh sách quét trên máy (Downloads, Desktop, kho lưu trữ)
    else if (rawFileName) {
      const resolvedPath = resolveAndStorePdf(rawFileName);
      if (!resolvedPath) {
        return interaction.editReply({
          content: `Không tìm thấy file \`${rawFileName}\` trên máy (đã quét cả Desktop, Downloads và kho lưu trữ)! Bạn có thể dùng ô \`file_upload\` để đính kèm file trực tiếp.`
        });
      }
      fileName = path.basename(resolvedPath);
    }
    // Trường hợp 3: Không cung cấp cả 2
    else {
      return interaction.editReply({
        content: 'Vui lòng đính kèm file qua `file_upload` hoặc chọn file có sẵn qua `file_name`.'
      });
    }

    // Tạo CustomID cho nút bấm: dl_doc:<fileName>:<roleId>:<logChannelId>
    const roleIdParam = requiredRole ? requiredRole.id : 'none';
    const logChannelIdParam = logChannel ? logChannel.id : 'default';
    const buttonCustomId = `dl_doc:${fileName}:${roleIdParam}:${logChannelIdParam}`;

    // Xây dựng mô tả sạch sẽ, không icon, không cảnh báo
    let desc = description;
    if (requiredRole) {
      desc += `\n\nYêu cầu vai trò: <@&${requiredRole.id}>`;
    }

    // Tạo Embed bài đăng tài liệu
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`Tài liệu: ${title}`)
      .setDescription(desc)
      .addFields(
        { name: 'Định dạng', value: 'PDF', inline: true },
        { name: 'Cách nhận', value: 'Bấm nút bên dưới để nhận file', inline: true }
      )
      .setFooter({ text: 'Niên Du' })
      .setTimestamp();

    // Tạo nút bấm (không icon)
    const downloadButton = new ButtonBuilder()
      .setCustomId(buttonCustomId)
      .setLabel('Tải tài liệu (PDF)')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(downloadButton);

    // Báo thành công cho Admin và gửi bài đăng công khai vào kênh
    await interaction.editReply({
      content: `Đã xuất bản tài liệu \`${fileName}\` thành công.`
    });

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
};
