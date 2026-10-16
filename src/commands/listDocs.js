const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllAvailablePdfs } = require('../services/fileScanner');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-docs')
    .setDescription('Xem danh sách tài liệu PDF có sẵn'),

  async execute(interaction) {
    const fileMap = getAllAvailablePdfs();

    if (fileMap.size === 0) {
      return interaction.reply({
        content: 'Chưa tìm thấy file PDF nào trong kho lưu trữ, thư mục Downloads hoặc Desktop của máy tính.',
        ephemeral: true
      });
    }

    const fileEntries = Array.from(fileMap.entries());
    const fileListStr = fileEntries.map(([file, fullPath], idx) => {
      try {
        const stats = fs.statSync(fullPath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        return `${idx + 1}. \`${file}\` (${sizeKB} KB)`;
      } catch (e) {
        return `${idx + 1}. \`${file}\``;
      }
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('Danh sách tài liệu PDF có sẵn trên máy')
      .setDescription(fileListStr)
      .setFooter({ text: 'Dùng lệnh /publish-doc để xuất bản tài liệu ra kênh cho thành viên' })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
