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

// Câu từ chối lịch sự, tự nhiên khi hỏi về code (xưng hô theo tên, không kèm icon)
function getCodeRefusalReply(userName) {
  return `Dạ chào ${userName}, mình không hỗ trợ giải đáp các câu hỏi liên quan đến lập trình hoặc viết mã nguồn. Nếu ${userName} cần hỗ trợ về tài liệu hoặc các vấn đề khác trong máy chủ, hãy cho mình biết nhé.`;
}

// Phản hồi mẫu thông minh khi chưa cấu hình API Key AI (hoặc mất mạng)
function getFallbackReply(prompt, userName) {
  const trimmed = (prompt || '').trim().toLowerCase();

  // 1. Trường hợp người dùng chỉ tag bot mà không gõ nội dung
  if (!trimmed) {
    return `Chào ${userName}, mình có thể giúp gì cho ${userName} không?`;
  }

  // 2. Chặn câu hỏi về code
  if (isCodeQuestion(trimmed)) {
    return getCodeRefusalReply(userName);
  }

  // 3. Lời chào hỏi
  if (/^(chào|chao|hi|hello|alo|ê|ơi|hey|chào bạn|hello bạn)\b/i.test(trimmed)) {
    return `Chào ${userName}, chúc ${userName} một ngày tốt lành. Mình có thể hỗ trợ gì cho ${userName} về máy chủ hoặc tài liệu không?`;
  }

  // 4. Hỏi về tài liệu / cách tải
  if (/(tài liệu|tai lieu|pdf|download|tải|nhận sách|lay tai lieu|lấy tài liệu|gửi đi)/i.test(trimmed)) {
    return `Để nhận tài liệu, ${userName} có thể theo dõi các bài đăng chia sẻ trong máy chủ và bấm vào nút tải tài liệu bên dưới mỗi bài viết.`;
  }

  // 5. Hỏi bot là ai / chức năng
  if (/(bạn là ai|bot là ai|chức năng|lam duoc gi|làm được gì|giới thiệu)/i.test(trimmed)) {
    return `Mình là bot hỗ trợ quản lý và phân phối tài liệu nội bộ trong máy chủ. ${userName} có thể nhận tài liệu có watermark định danh bảo mật và xem các thông báo từ ban quản trị.`;
  }

  // 6. Lời cảm ơn
  if (/(cảm ơn|cam on|thanks|thank you|cmon|tks)/i.test(trimmed)) {
    return `Rất sẵn lòng hỗ trợ ${userName}. Chúc ${userName} có những trải nghiệm hữu ích tại máy chủ.`;
  }

  // 7. Mặc định tự nhiên, lịch sự
  return `Chào ${userName}, mình đã nhận được tin nhắn của ${userName}. Nếu cần hỗ trợ về tài liệu hoặc thông tin trong máy chủ, ${userName} có thể liên hệ Ban Quản Trị hoặc để lại lời nhắn nhé.`;
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
    return `Chào ${userName}, mình có thể giúp gì cho ${userName} không?`;
  }

  // Kiểm tra chặn code ngay từ đầu để đảm bảo quy tắc tuyệt đối
  if (isCodeQuestion(cleanPrompt)) {
    return getCodeRefusalReply(userName);
  }

  // Nếu có cấu hình Google Gemini API Key, sử dụng AI để trả lời tự nhiên
  if (config.geminiApiKey) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

      const systemInstruction = `
Bạn là trợ lý ảo hỗ trợ thành viên trong máy chủ Discord.
Người dùng đang trò chuyện với bạn có tên là: "${userName}".

CÁC NGUYÊN TẮC BẮT BUỘC:
1. XƯNG HÔ THEO TÊN: Thay vì xưng hô là "bạn", bạn BẮT BUỘC phải xưng hô trực tiếp bằng tên "${userName}" của người dùng trong toàn bộ câu trả lời (ví dụ: "Chào ${userName}", "${userName} có thể...", "Dạ ${userName}..."). Tuyệt đối không dùng từ "bạn" để xưng hô với người này.
2. TUYỆT ĐỐI KHÔNG trả lời, giải đáp, hướng dẫn, viết mã hoặc tư vấn bất kỳ câu hỏi nào liên quan đến lập trình, giải thuật, viết code, sửa lỗi mã nguồn, hay công nghệ phần mềm. Khi nhận câu hỏi về code hay lập trình, bạn PHẢI từ chối một cách lịch sự, nhã nhặn với ${userName} rằng bạn không hỗ trợ các vấn đề về lập trình hay viết code.
3. TUYỆT ĐỐI KHÔNG sử dụng bất kỳ biểu tượng cảm xúc (emoji/icon) nào trong câu trả lời (kể cả icon mặt cười, ngôi sao, bàn tay vẫy hay bất kỳ ký tự biểu tượng nào). Toàn bộ nội dung trả lời chỉ sử dụng chữ viết và dấu câu ngữ pháp chuẩn mực.
4. Trả lời bằng tiếng Việt tự nhiên, lịch sự, khiêm tốn, hòa nhã, tôn trọng người dùng và đi thẳng vào vấn đề.
`;

      const response = await ai.models.generateContent({
        model: config.geminiModel || 'gemini-2.5-flash',
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
        // Giới hạn độ dài an toàn theo chuẩn Discord (2000 ký tự)
        return sanitized.length > 1900 ? sanitized.substring(0, 1900) + '...' : sanitized;
      }
    } catch (err) {
      console.error('[GEMINI API ERROR]', err.message);
      // Khi AI gặp sự cố, tự động dùng bộ phản hồi dự phòng
    }
  }

  // Fallback nếu không có Gemini API Key hoặc gọi API gặp sự cố
  return cleanEmojis(getFallbackReply(cleanPrompt, userName));
}

module.exports = {
  cleanEmojis,
  isCodeQuestion,
  getAutoReply
};
