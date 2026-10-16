const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  AttachmentBuilder,
  Events,
  PermissionFlagsBits
} = require('discord.js');
const { config, validateConfig } = require('./config');
const { applyWatermark } = require('./services/watermark');
const { logDownload } = require('./services/logger');
const { getAllAvailablePdfs } = require('./services/fileScanner');

// Các lệnh Slash Command
const publishDocCmd = require('./commands/publishDoc');
const listDocsCmd = require('./commands/listDocs');
const sayCmd = require('./commands/say');
const announceCmd = require('./commands/announce');

const commands = [publishDocCmd, listDocsCmd, sayCmd, announceCmd];

// Khởi tạo Client Discord (GatewayIntentBits.Guilds đủ cho Slash Commands và Buttons)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// Đăng ký Slash Commands toàn cầu (Global Commands) duy nhất, xóa sạch lệnh trùng ở cấp Guild
async function registerCommands() {
  if (!config.token || !config.clientId) return;

  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    console.log('[BOT] Đang đồng bộ Slash Commands toàn cầu...');
    const commandData = commands.map(c => c.data.toJSON());

    // 1. Đăng ký duy nhất 1 bộ lệnh toàn cầu (Global commands)
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commandData }
    );

    // 2. Xóa sạch các lệnh ở cấp Guild cũ để triệt tiêu hoàn toàn tình trạng trùng 2 lệnh
    for (const guild of client.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, guild.id),
        { body: [] }
      ).catch(() => {});
    }
    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: [] }
      ).catch(() => {});
    }

    console.log('✅ Đã đồng bộ Slash Commands toàn cầu và dọn sạch các lệnh trùng lặp!');
  } catch (err) {
    console.error('❌ Lỗi khi đăng ký Slash Commands:', err.message);
  }
}

// Quản lý Chế độ ngủ thông minh (Sleep Mode)
let sleepTimer = null;

function wakeUpBot() {
  if (!config.sleepMode || !client.user) return;

  try {
    // Đánh thức bot: chuyển trạng thái sang Online (chấm xanh)
    client.user.setPresence({ status: 'online' });

    // Hủy hẹn giờ ngủ cũ và đặt lại bộ đếm thời gian mới
    if (sleepTimer) clearTimeout(sleepTimer);

    const timeoutMs = (config.sleepTimeoutMinutes || 2) * 60 * 1000;
    sleepTimer = setTimeout(() => {
      try {
        if (client.user) {
          client.user.setPresence({ status: 'invisible' });
          console.log(`🌙 [SLEEP MODE] Hết ${config.sleepTimeoutMinutes} phút không có tương tác, bot đã quay về chế độ ngủ (invisible).`);
        }
      } catch (e) {
        console.error('[SLEEP MODE ERROR]', e.message);
      }
    }, timeoutMs);
  } catch (err) {
    console.error('[WAKE UP ERROR]', err.message);
  }
}

// Xử lý sự kiện khi Bot sẵn sàng
client.once(Events.ClientReady, async () => {
  console.log(`\n==============================================`);
  console.log(`🤖 BOT ĐÃ KHỞI ĐỘNG THÀNH CÔNG: ${client.user.tag}`);
  console.log(`🛡️ Niên Du Document Gatekeeper đang bảo vệ server.`);

  if (config.sleepMode) {
    client.user.setPresence({ status: 'invisible' });
    console.log(`🌙 [SLEEP MODE BẬT] Bot đang ẩn (invisible), sẽ tự bật Online khi có tương tác (tự ngủ sau ${config.sleepTimeoutMinutes} phút).`);
  } else {
    client.user.setPresence({ status: 'online' });
  }

  console.log(`==============================================\n`);

  await registerCommands();
});

// Xử lý tương tác (Slash Commands & Nút bấm tải tài liệu)
client.on('interactionCreate', async interaction => {
  try {
    // Đánh thức bot dậy khi có bất kỳ tương tác nào (Slash Command / Button / Autocomplete)
    wakeUpBot();

    // 1. Xử lý gợi ý tự động (Autocomplete)
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === 'publish-doc') {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const fileMap = getAllAvailablePdfs();
        const files = Array.from(fileMap.keys());
        const filtered = files
          .filter(choice => choice.toLowerCase().includes(focusedValue))
          .slice(0, 25);
        await interaction.respond(
          filtered.map(choice => ({ name: choice, value: choice }))
        );
      }
      return;
    }

    // 2. Xử lý Slash Commands
    if (interaction.isChatInputCommand()) {
      // Kiểm tra quyền hạn:
      // - Chủ sở hữu Bot (Owner ID) luôn có toàn quyền tuyệt đối ở mọi server (không cần bất kỳ Role hay quyền Admin nào)
      // - Người dùng khác muốn chạy lệnh bắt buộc phải có quyền Administrator trên server
      const isOwner = config.ownerId && interaction.user.id === config.ownerId;
      const isAdmin = interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.Administrator);

      if (!isOwner && !isAdmin) {
        return interaction.reply({
          content: 'Bạn không có quyền thực hiện lệnh này. Chỉ Chủ sở hữu Bot hoặc Quản trị viên mới được phép.',
          ephemeral: true
        });
      }

      const command = commands.find(c => c.data.name === interaction.commandName);
      if (command) {
        await command.execute(interaction);
      }
      return;
    }

    // 3. Xử lý Nút bấm nhận tài liệu (Button Interaction)
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (!customId.startsWith('dl_doc:')) return;

      // Phân tách customId: dl_doc:<fileName>:<requiredRoleId>:<logChannelId>
      const parts = customId.split(':');
      parts.shift(); // loại bỏ tiền tố dl_doc

      let logChannelIdParam = 'default';
      let buttonRoleId = 'none';

      if (parts.length >= 3) {
        logChannelIdParam = parts.pop() || 'default';
        buttonRoleId = parts.pop() || 'none';
      } else if (parts.length === 2) {
        buttonRoleId = parts.pop() || 'none';
      }

      const fileName = path.basename(parts.join(':'));

      // Trả lời tạm thời dạng Ephemeral (chỉ user nhìn thấy) để tránh timeout 3s
      await interaction.deferReply({ ephemeral: true });

      const user = interaction.user;
      const member = interaction.member;

      // --- BƯỚC 1: KIỂM TRA ĐIỀU KIỆN AN TOÀN (ANTI-CLONE & PHÂN QUYỀN) ---
      const now = Date.now();
      const accountAgeDays = Math.floor((now - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      if (accountAgeDays < config.minAccountAgeDays) {
        return interaction.editReply({
          content: `Yêu cầu bị từ chối: Tài khoản Discord của bạn mới tạo được ${accountAgeDays} ngày (Yêu cầu tối thiểu: ${config.minAccountAgeDays} ngày).\nVui lòng liên hệ Quản trị viên nếu đây là tài khoản chính của bạn.`
        });
      }

      // Kiểm tra thời gian ở trong server
      if (member && member.joinedAt) {
        const joinAgeDays = Math.floor((now - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (joinAgeDays < config.minJoinDays) {
          return interaction.editReply({
            content: `Yêu cầu bị từ chối: Bạn mới tham gia server được ${joinAgeDays} ngày (Yêu cầu tối thiểu: ${config.minJoinDays} ngày). Hãy hoạt động thêm trước khi truy cập tài liệu nội bộ.`
          });
        }
      }

      // Kiểm tra Role bắt buộc (nếu bài đăng có set role hoặc .env có cấu hình)
      const targetRoleId = buttonRoleId !== 'none' ? buttonRoleId : config.requiredRoleId;
      if (targetRoleId && member) {
        const hasRole = member.roles.cache.has(targetRoleId);
        if (!hasRole) {
          return interaction.editReply({
            content: `Tài liệu bị khóa: Chỉ dành riêng cho thành viên có vai trò <@&${targetRoleId}>.`
          });
        }
      }

      // --- BƯỚC 2: KIỂM TRA FILE GỐC ---
      const filePath = path.join(config.paths.rawDocs, fileName);
      if (!fs.existsSync(filePath)) {
        return interaction.editReply({
          content: `Tài liệu \`${fileName}\` hiện không còn khả dụng trên máy chủ. Vui lòng báo cho Admin!`
        });
      }

      // Thông báo đang xử lý
      await interaction.editReply({
        content: `Đang chuẩn bị tài liệu cho bạn...\nVui lòng đợi giây lát.`
      });

      // --- BƯỚC 3: DẬP DYNAMIC WATERMARK ĐỘNG ---
      const rawPdfBytes = fs.readFileSync(filePath);
      const printCode = `ND-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      const userInfo = {
        userId: user.id,
        userTag: user.tag,
        displayName: member ? member.displayName : user.username
      };

      const watermarkedBytes = await applyWatermark(rawPdfBytes, userInfo, printCode);

      // --- BƯỚC 4: GHI LOG HÀNH VI TẢI VỀ KÊNH ADMIN ---
      await logDownload({
        client,
        user,
        member,
        docName: fileName,
        printCode,
        targetChannelId: logChannelIdParam !== 'default' ? logChannelIdParam : config.logChannelId
      });

      // --- BƯỚC 5: GỬI FILE QUA TIN NHẮN RIÊNG (EPHEMERAL) ---
      const outputFileName = fileName;
      const attachment = new AttachmentBuilder(Buffer.from(watermarkedBytes), { name: outputFileName });

      await interaction.editReply({
        content: `**Tài liệu của bạn đã sẵn sàng.**\n\n` +
          `Người nhận: <@${user.id}> (\`${user.tag}\`)\n` +
          `Mã bản in: \`#${printCode}\``,
        files: [attachment]
      });
    }
  } catch (err) {
    console.error('[INTERACTION ERROR]', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `Đã có lỗi xảy ra trong quá trình xử lý: \`${err.message}\``
      }).catch(() => {});
    }
  }
});



// Xử lý lỗi ngoại lệ không để bot sập đột ngột
process.on('unhandledRejection', error => {
  console.error('[UNHANDLED REJECTION]', error);
});

// Khởi động bot nếu cấu hình hợp lệ
if (validateConfig()) {
  client.login(config.token).catch(err => {
    console.error('❌ Không thể đăng nhập vào Discord. Vui lòng kiểm tra lại DISCORD_TOKEN:', err.message);
  });
} else {
  console.log('💡 Hướng dẫn: Mở file .env để điền DISCORD_TOKEN, CLIENT_ID, GUILD_ID rồi chạy lệnh: npm start');
}
