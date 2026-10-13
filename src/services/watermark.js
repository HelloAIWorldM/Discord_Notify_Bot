const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { config } = require('../config');

// Hàm loại bỏ dấu tiếng Việt dự phòng khi không nạp được font Unicode
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Đóng dấu Watermark động (Dynamic Watermark) vào file PDF:
 * Chỉ hiển thị:
 * - "Bản quyền bởi Vy Lì và GBN từ Niên Du"
 * - Mã bản in duy nhất (#printCode)
 *
 * @param {Buffer|Uint8Array} inputPdfBuffer - Buffer file PDF gốc
 * @param {Object} userInfo - Thông tin người dùng (vẫn nhận để phục vụ ghi log)
 * @param {string} printCode - Mã bản in duy nhất
 * @returns {Promise<Uint8Array>} - Buffer file PDF đã đóng dấu
 */
async function applyWatermark(inputPdfBuffer, userInfo, printCode) {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Tải tài liệu PDF
  const pdfDoc = await PDFDocument.load(inputPdfBuffer);
  pdfDoc.registerFontkit(fontkit);

  // Thử nạp font Arial hỗ trợ tiếng Việt
  let font;
  let isUnicode = false;
  const fontPath = path.join(config.paths.fonts, 'arial.ttf');

  if (fs.existsSync(fontPath)) {
    try {
      const fontBytes = fs.readFileSync(fontPath);
      font = await pdfDoc.embedFont(fontBytes);
      isUnicode = true;
    } catch (e) {
      console.warn('Không thể nạp font arial.ttf, chuyển về Helvetica mặc định:', e.message);
    }
  }

  if (!font) {
    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // Nội dung watermark theo yêu cầu mới
  const rawLine1 = 'BẢN QUYỀN BỞI VY LÌ VÀ GBN TỪ NIÊN DU';
  const rawLine2 = `MÃ BẢN IN: #${printCode} | NGÀY CẤP: ${dateFormatted}`;

  const line1 = isUnicode ? rawLine1 : removeVietnameseTones(rawLine1);
  const line2 = isUnicode ? rawLine2 : removeVietnameseTones(rawLine2);

  const rawFooter = `Bản quyền bởi Vy Lì và GBN từ Niên Du • Mã bản in: #${printCode}`;
  const footerText = isUnicode ? rawFooter : removeVietnameseTones(rawFooter);

  const pages = pdfDoc.getPages();
  const fontSizeMain = 15;
  const fontSizeSub = 12;
  const fontSizeFooter = 8.5;

  // Lặp qua từng trang để dập Watermark
  for (const page of pages) {
    const { width, height } = page.getSize();

    // 1. Watermark chéo mờ ở trung tâm trang (Góc xoay 45 độ)
    const centerX = width / 2;
    const centerY = height / 2;

    // Dập 2 vị trí (nửa trên và nửa dưới) để phân bổ đều trang
    const positions = [
      { x: centerX - 140, y: centerY + 110 },
      { x: centerX - 140, y: centerY - 130 }
    ];

    for (const pos of positions) {
      page.drawText(line1, {
        x: pos.x,
        y: pos.y + 16,
        size: fontSizeMain,
        font,
        color: rgb(0.65, 0.65, 0.65),
        opacity: 0.22,
        rotate: degrees(45)
      });

      page.drawText(line2, {
        x: pos.x,
        y: pos.y - 8,
        size: fontSizeSub,
        font,
        color: rgb(0.65, 0.65, 0.65),
        opacity: 0.22,
        rotate: degrees(45)
      });
    }

    // 2. Chân trang (Footer) dập cố định ở đáy trang
    page.drawText(footerText, {
      x: 30,
      y: 15,
      size: fontSizeFooter,
      font,
      color: rgb(0.4, 0.4, 0.4),
      opacity: 0.6
    });

    // 3. Chữ ký ẩn truy vết mã bản in
    page.drawText(`PRINT_CODE_${printCode}`, {
      x: 5,
      y: 5,
      size: 1,
      font,
      color: rgb(1, 1, 1),
      opacity: 0.05
    });
  }

  // 4. Khắc metadata vào file PDF
  pdfDoc.setTitle('Tài liệu lưu hành nội bộ - Niên Du');
  pdfDoc.setAuthor('Vy Lì & GBN - Niên Du');
  pdfDoc.setSubject(`Bản quyền bởi Vy Lì và GBN từ Niên Du - Mã bản in: #${printCode}`);
  pdfDoc.setProducer('Niên Du Management');
  pdfDoc.setKeywords(['Nien Du', 'Vy Li', 'GBN', `code:${printCode}`]);

  return await pdfDoc.save();
}

module.exports = {
  applyWatermark,
  removeVietnameseTones
};
