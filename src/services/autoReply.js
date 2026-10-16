const { config } = require('../config');

// Hàm loại bỏ triệt để các biểu tượng cảm xúc (emojis / icons vô ích)
function cleanEmojis(text) {
  if (!text) return '';
  return text
    // Xóa custom emojis của Discord dạng <:name:id> hoặc <a:name:id>
    .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '')
    // Xóa toàn bộ biểu tượng cảm xúc Unicode
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|\p{Extended_Pictographic}|[\uFE00-\uFE0F]/gu, '')
    // Chuẩn hóa khoảng trắng
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Kiểm tra xem câu hỏi có liên quan đến lập trình / viết code không
function isCodeQuestion(text) {
  if (!text) return false;
  const lower = text.toLowerCase();

  const codePatterns = [
    /\b(code|coding|coder|program|programming|programmer)\b/i,
    /\b(lập trình|lap trinh|viet code|viết code|sửa code|sua code|chỉ code|chi code|đoạn code|doan code)\b/i,
    /\b(python|javascript|typescript|c\+\+|c#|java|golang|rust|php|ruby|swift|kotlin|html|css|sql|react|vue|angular|nodejs)\b/i,
    /\b(bug|fix bug|sửa bug|lỗi code|loi code|debug|syntax error|runtime error|exception|traceback)\b/i,
    /\b(function|hàm|method|class|variable|biến|array|mảng|object|pointer|con trỏ)\b/i,
    /\b(thuật toán|algorithm|regex|regular expression|api endpoint|backend|frontend)\b/i,
    /\b(git commit|git push|github|repository|npm install|pip install)\b/i,
    /\b(viết bot|viet bot|tạo bot|tao bot|làm bot|lam bot|script|viết script|viet script)\b/i
  ];

  return codePatterns.some(pattern => pattern.test(lower));
}

// Phản hồi mẫu thông minh, cực kỳ ngắn gọn và đúng ngữ cảnh câu nói
function getFallbackReply(prompt, userName) {
  const trimmed = (prompt || '').trim();
  const lower = trimmed.toLowerCase();

  // 1. Tag bot không có nội dung
  if (!lower) {
    return `Chào ${userName}, ${userName} cần mình hỗ trợ gì không?`;
  }

  // 2. Chặn câu hỏi về code (ngắn gọn, dứt khoát, lịch sự)
  if (isCodeQuestion(lower)) {
    return `Dạ chào ${userName}, mình không hỗ trợ các câu hỏi về lập trình hay viết code đâu nhé.`;
  }

  // 3. Ngữ cảnh mắng / chửi / bực tức / tiếng lóng tục
  if (/(chửi|chui|mắng|mang|dumos|dume|duma|đm|dm|đcm|dcm|vcl|clm|vkl|đéo|deo|cút|cut|biến|bien|đồ tồi|do toi|bực|tức)/i.test(lower)) {
    const scoldReplies = [
      `Sao ${userName} lại mắng mình thế, mình làm gì sai à?`,
      `${userName} bớt nóng nào, có chuyện gì khiến ${userName} bực mình thế?`,
      `Đừng mắng mình mà ${userName}, có gì từ từ nói nhé.`
    ];
    return scoldReplies[Math.floor(Math.random() * scoldReplies.length)];
  }

  // 4. Ngữ cảnh vui vẻ / hài hước
  if (/(buồn cười|buon cuoi|hài hước|hai huoc|hài quá|haha|hihi|kkk|vui quá|vui thật)/i.test(lower)) {
    return `Có chuyện gì vui thế ${userName}, kể mình nghe với nào.`;
  }

  // 5. Ngữ cảnh than vãn / buồn bã / chán nản / mệt mỏi
  if (/(chán|chan|buồn(?! cười)|buon(?! cuoi)|mệt|met|nản|nan|stress|áp lực|ap luc|cô đơn|co don|tủi thân|tui than|sầu|sau)/i.test(lower)) {
    const sadReplies = [
      `Có chuyện gì làm ${userName} buồn chán thế, kể mình nghe xem nào?`,
      `${userName} nghỉ ngơi nghe nhạc một chút đi, đừng để bản thân mệt mỏi nhé.`,
      `Nếu ${userName} thấy chán thì vào kênh voice tám chuyện với mọi người trong server nè.`
    ];
    return sadReplies[Math.floor(Math.random() * sadReplies.length)];
  }

  // 6. Ngữ cảnh Game / Rủ chơi game (Roblox, LOL, game, chơi không...)
  if (/(roblox|game|liên quân|lien quan|lol|pubg|genshin|minecraft|valorant|csgo|ff|fifa|bắn súng|chơi|choi)/i.test(lower)) {
    if (/(muốn chơi|muon choi|thích chơi|thich choi|đang chơi|dang choi|đi chơi|di choi)/i.test(lower)) {
      return `Chúc ${userName} chơi game vui vẻ nhé.`;
    }
    if (/(không|khong|ko|k|hông|hong|hả|ha|cùng|nào|đi)/i.test(lower)) {
      return `Mình là bot nên không chơi game được đâu ${userName}.`;
    }
    return `Tiếc là mình không tham gia chơi game được rồi ${userName}.`;
  }

  // 7. Ngữ cảnh ăn uống / nghỉ ngơi
  if (/(ăn cơm|an com|ăn gì|an gi|ăn chưa|an chua|uống nước|uong nuoc|uống trà|trà sữa|đói|khát)/i.test(lower)) {
    return `Mình là bot nên không ăn uống được đâu, ${userName} nhớ ăn uống đầy đủ nhé.`;
  }
  if (/(ngủ ngon|ngu ngon|đi ngủ|di ngu|buồn ngủ|buon ngu)/i.test(lower)) {
    return `Chúc ${userName} ngủ ngon nhé.`;
  }

  // 8. Ngữ cảnh hỏi thăm sức khỏe / trạng thái bot
  if (/(khỏe không|khoe khong|ổn không|on khong|dạo này|sao rồi|mệt không|met khong)/i.test(lower)) {
    return `Mình vẫn hoạt động tốt, cảm ơn ${userName} đã hỏi thăm.`;
  }

  // 9. Ngữ cảnh hỏi đang làm gì / rảnh không
  if (/(làm gì|lam gi|đang làm|dang lam|rảnh không|ranh khong|bận không|ban khong)/i.test(lower)) {
    return `Mình đang trực server để hỗ trợ ${userName} và mọi người đây.`;
  }

  // 10. Khen ngợi / Chê bai / Trêu đùa
  if (/(giỏi|gioi|ngoan|đỉnh|dinh|xịn|xin|thông minh|thong minh|pro)/i.test(lower)) {
    return `Cảm ơn ${userName} đã khen nhé.`;
  }
  if (/(ngu|dốt|dot|ngốc|ngoc|điên|dien|ngáo|ngao|xàm|xam|cùi|cui|bắp|bap)/i.test(lower)) {
    return `Mình vẫn đang học hỏi thêm, ${userName} thông cảm nhé.`;
  }

  // 11. Ngữ cảnh tìm kiếm / tài liệu
  if (/(tài liệu|tai lieu|pdf|download|tải|nhận sách|file)/i.test(lower)) {
    if (/(lúc trước|luc truoc|gửi đi|gui di|tìm|tim|lấy|lay|đâu|dau)/i.test(lower)) {
      return `${userName} xem lại các bài đăng trong kênh tài liệu hoặc dùng lệnh /list-docs nhé.`;
    }
    return `Để nhận tài liệu, ${userName} bấm vào nút tải bên dưới bài đăng chia sẻ nhé.`;
  }

  // 12. Ngữ cảnh hỏi danh tính / chức năng bot
  if (/(bạn là ai|bot là ai|ai đấy|ai day|chức năng|làm được gì|lam duoc gi|giới thiệu|gioi thieu)/i.test(lower)) {
    return `Mình là bot hỗ trợ lưu trữ, dán watermark tài liệu và gửi thông báo trong server.`;
  }

  // 13. Chào hỏi
  if (/^(chào|chao|hi|hello|alo|ê|ơi|hey)\b/i.test(lower)) {
    return `Chào ${userName}, ${userName} cần mình hỗ trợ gì không?`;
  }

  // 14. Cảm ơn
  if (/(cảm ơn|cam on|thanks|thank you|cmon|tks)/i.test(lower)) {
    return `Không có gì đâu ${userName}.`;
  }

  // 15. Tạm biệt
  if (/(tạm biệt|tam biet|bye|bai|bb|hẹn gặp lại)/i.test(lower)) {
    return `Tạm biệt ${userName}, chúc ${userName} một ngày vui vẻ.`;
  }

  // 16. Hỏi có biết làm gì không
  if (/(có biết|co biet|biết bơi|biết hát|biết làm)/i.test(lower)) {
    return `Tiếc là việc này mình chưa làm được rồi ${userName}.`;
  }

  // 17. Hỏi là cái gì / gì thế
  if (/(là gì|la gi|cái gì|cai gi|gì thế|gi the|sao vậy|sao day)/i.test(lower)) {
    return `Câu này mình chưa rõ thông tin rồi ${userName}.`;
  }

  // 18. Câu hỏi Có/Không hoặc Có được không
  if (/(được không|duoc khong|được ko|duoc ko|phải không|phai khong|đúng không|dung khong)/i.test(lower)) {
    return `Việc này mình chưa rõ, ${userName} hỏi Ban Quản Trị xem sao nhé.`;
  }

  // 19. Danh sách fallback ngẫu nhiên đa dạng (tránh lặp đi lặp lại một câu)
  const randomFallbacks = [
    `Ý ${userName} là sao nhỉ, mình chưa theo kịp rồi.`,
    `${userName} nói cụ thể hơn một chút được không, mình chưa rõ lắm.`,
    `Câu này mình chưa hiểu lắm, ${userName} giải thích thêm cho mình đi.`,
    `Mình nghe đây ${userName}, nhưng câu vừa rồi mình chưa hiểu rõ ý.`
  ];
  return randomFallbacks[Math.floor(Math.random() * randomFallbacks.length)];
}

// Xử lý tạo câu trả lời khi có người nhắc đến Bot
async function getAutoReply(userPrompt, author, member) {
  const cleanPrompt = (userPrompt || '').trim();

  // Lấy tên hiển thị của người dùng (ưu tiên biệt danh Server, rồi tới Global Name, cuối cùng là Username)
  let rawName = '';
  if (member && member.displayName) {
    rawName = member.displayName;
  } else if (author) {
    rawName = author.globalName || author.displayName || author.username || '';
  }
  let userName = cleanEmojis(rawName).trim();
  if (!userName) userName = 'bạn';

  // Nếu người dùng không nhập gì mà chỉ nhắc bot
  if (!cleanPrompt) {
    return `Chào ${userName}, ${userName} cần mình hỗ trợ gì không?`;
  }

  // Kiểm tra chặn code ngay từ đầu để đảm bảo quy tắc tuyệt đối
  if (isCodeQuestion(cleanPrompt)) {
    return `Dạ chào ${userName}, mình không hỗ trợ các câu hỏi về lập trình hay viết code đâu nhé.`;
  }

  // Nếu có cấu hình Google Gemini API Key, sử dụng AI để trả lời tự nhiên theo ngữ cảnh
  if (config.geminiApiKey) {
    const modelsToTry = [config.geminiModel, 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'].filter(Boolean);
    const uniqueModels = [...new Set(modelsToTry)];

    for (const modelName of uniqueModels) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

        const systemInstruction = `
Bạn là trợ lý ảo hỗ trợ thành viên trong máy chủ Discord.
Người dùng đang trò chuyện với bạn có tên là: "${userName}".

CÁC NGUYÊN TẮC BẮT BUỘC:
1. XƯNG HÔ THEO TÊN: Thay vì xưng hô là "bạn", bạn BẮT BUỘC phải xưng hô trực tiếp bằng tên "${userName}" của người dùng trong toàn bộ câu trả lời (ví dụ: "Chào ${userName}", "${userName} có thể...", "Dạ ${userName}..."). Tuyệt đối không dùng từ "bạn" để xưng hô với người này.
2. TRẢ LỜI CỰC KỲ NGẮN GỌN (TỐI ĐA 1 ĐẾN 2 CÂU NGẮN): Trả lời đúng trọng tâm ngữ cảnh câu nói của ${userName}, tự nhiên, ngắn gọn như đang chat thường ngày. Tuyệt đối KHÔNG viết đoạn văn dài dòng, KHÔNG giải thích dông dài, KHÔNG lặp lại lời chào rườm rà.
3. TUYỆT ĐỐI KHÔNG trả lời, giải đáp, hướng dẫn, viết mã hoặc tư vấn bất kỳ câu hỏi nào liên quan đến lập trình, giải thuật, viết code, sửa lỗi mã nguồn, hay công nghệ phần mềm. Khi nhận câu hỏi về code hay lập trình, bạn PHẢI từ chối một cách lịch sự, nhã nhặn rằng bạn không hỗ trợ các vấn đề về lập trình hay viết code.
4. TUYỆT ĐỐI KHÔNG sử dụng bất kỳ biểu tượng cảm xúc (emoji/icon) nào trong câu trả lời (kể cả icon mặt cười, ngôi sao, bàn tay vẫy hay bất kỳ ký tự biểu tượng nào). Toàn bộ nội dung trả lời chỉ sử dụng chữ viết và dấu câu ngữ pháp chuẩn mực.
`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: cleanPrompt,
          config: {
            systemInstruction: systemInstruction.trim(),
            temperature: 0.7
          }
        });

        let replyText = response.text || '';
        let sanitized = cleanEmojis(replyText);

        // Thay thế dự phòng nếu AI vô tình xưng hô "bạn"
        sanitized = sanitized.replace(/\bbạn\b/gi, userName);

        if (sanitized) {
          return sanitized.length > 1900 ? sanitized.substring(0, 1900) + '...' : sanitized;
        }
      } catch (err) {
        console.error(`[GEMINI API ERROR với model ${modelName}]:`, err.message);
      }
    }
  }

  // Fallback theo ngữ cảnh nếu không có Gemini API Key hoặc gọi API gặp sự cố
  return cleanEmojis(getFallbackReply(cleanPrompt, userName));
}

module.exports = {
  cleanEmojis,
  isCodeQuestion,
  getAutoReply
};
