const path = require('path');
const dotenv = require('dotenv');

// Nạp cấu hình từ .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  logChannelId: process.env.LOG_CHANNEL_ID || '',
  minAccountAgeDays: parseInt(process.env.MIN_ACCOUNT_AGE_DAYS || '7', 10),
  minJoinDays: parseInt(process.env.MIN_JOIN_DAYS || '1', 10),
  requiredRoleId: process.env.REQUIRED_ROLE_ID || '',


  // Cấu hình Chế độ ngủ (Sleep Mode: Ẩn khi không có ai dùng, tự bật Online khi có tương tác)
  sleepMode: process.env.SLEEP_MODE !== 'false', // Mặc định bật true
  sleepTimeoutMinutes: parseInt(process.env.SLEEP_TIMEOUT_MINUTES || '2', 10),

  // Đường dẫn thư mục lưu trữ
  paths: {
    rawDocs: path.join(__dirname, '../storage/raw_docs'),
    fonts: path.join(__dirname, '../storage/fonts'),
    temp: path.join(__dirname, '../storage/temp'),
    logFile: path.join(__dirname, '../storage/download_logs.jsonl')
  }
};

function validateConfig() {
  const missing = [];
  if (!config.token || config.token === 'your_bot_token_here') missing.push('DISCORD_TOKEN');
  if (!config.clientId || config.clientId === 'your_client_id_here') missing.push('CLIENT_ID');
  if (!config.guildId || config.guildId === 'your_guild_id_here') missing.push('GUILD_ID');

  if (missing.length > 0) {
    console.warn('\n⚠️ [CẢNH BÁO CẤU HÌNH] Các biến môi trường sau chưa được điền trong file .env:');
    missing.forEach(m => console.warn(`   - ${m}`));
    console.warn('Vui lòng mở file .env và điền thông tin trước khi chạy bot trên Discord.\n');
    return false;
  }
  return true;
}

module.exports = {
  config,
  validateConfig
};
