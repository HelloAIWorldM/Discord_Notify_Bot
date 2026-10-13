const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const { config } = require('../config');

/**
 * Ghi log tải tài liệu:
 * 1. Bắn tin nhắn Embed về kênh bí mật của Admin
 * 2. Lưu vào file JSONL trên máy chủ
 * 3. In ra console
 */
async function logDownload({ client, user, member, docName, printCode, targetChannelId }) {
  const timestamp = new Date();
  const timeFormatted = timestamp.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  
  const accountAgeDays = Math.floor((timestamp - user.createdAt) / (1000 * 60 * 60 * 24));
  const joinAgeDays = member && member.joinedAt 
    ? Math.floor((timestamp - member.joinedAt) / (1000 * 60 * 60 * 24)) 
    : 'N/A';

  const logData = {
    printCode,
    docName,
    userId: user.id,
    userTag: user.tag,
    displayName: member ? member.displayName : user.username,
    accountAgeDays,
    joinAgeDays,
    timestamp: timestamp.toISOString(),
    timeFormatted
  };

  // 1. In ra Terminal Console
  console.log(`[DOWNLOAD LOG] ${timeFormatted} | ${user.tag} (${user.id}) | File: ${docName} | Code: ${printCode}`);

  // 2. Ghi vào file download_logs.jsonl
  try {
    fs.appendFileSync(config.paths.logFile, JSON.stringify(logData) + '\n', 'utf8');
  } catch (err) {
    console.error('Lỗi khi ghi file log nội bộ:', err.message);
  }

  // 3. Gửi Embed đến kênh Discord (kênh chỉ định riêng hoặc kênh mặc định trong .env)
  const channelId = targetChannelId || config.logChannelId;
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      console.warn(`[LOGGER] Không tìm thấy kênh text với ID: ${config.logChannelId}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00A86B)
      .setTitle('[AUDIT LOG] THÀNH VIÊN ĐÃ TẢI TÀI LIỆU')
      .setDescription(`Thành viên <@${user.id}> vừa tải tài liệu.`)
      .addFields(
        { name: 'Tài liệu', value: `\`${docName}\``, inline: true },
        { name: 'Mã bản in', value: `\`${printCode}\``, inline: true },
        { name: 'Người tải', value: `${user.tag} (\`${user.id}\`)`, inline: false },
        { name: 'Thời gian', value: timeFormatted, inline: true },
        { name: 'Tuổi tài khoản', value: `${accountAgeDays} ngày`, inline: true },
        { name: 'Ở trong server', value: `${joinAgeDays} ngày`, inline: true }
      )
      .setFooter({ text: 'Niên Du Document Guard' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[LOGGER] Lỗi khi gửi Embed về kênh Discord Admin:', err.message);
  }
}

module.exports = {
  logDownload
};
