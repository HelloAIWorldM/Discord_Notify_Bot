const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { applyWatermark } = require('../src/services/watermark');
const { config } = require('../src/config');

async function runTest() {
  console.log('--- [BẮT ĐẦU KIỂM THỬ ĐÓNG DẤU WATERMARK ĐỘNG] ---');

  // Đảm bảo các thư mục tồn tại
  if (!fs.existsSync(config.paths.rawDocs)) fs.mkdirSync(config.paths.rawDocs, { recursive: true });
  if (!fs.existsSync(config.paths.temp)) fs.mkdirSync(config.paths.temp, { recursive: true });

  const samplePdfPath = path.join(config.paths.rawDocs, 'Tai_Lieu_Mau_Noi_Vien.pdf');

  // 1. Tạo 1 file PDF gốc mẫu nếu chưa có
  console.log('1. Tạo file PDF gốc mẫu...');
  const newPdf = await PDFDocument.create();
  newPdf.registerFontkit(fontkit);

  // Nạp font tiếng Việt nếu có
  let font;
  const fontPath = path.join(config.paths.fonts, 'arial.ttf');
  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath);
    font = await newPdf.embedFont(fontBytes);
  } else {
    font = await newPdf.embedFont(StandardFonts.Helvetica);
  }

  // Tạo 2 trang mẫu
  for (let i = 1; i <= 2; i++) {
    const page = newPdf.addPage([595.28, 841.89]); // Khổ A4
    page.drawText(`TÀI LIỆU HƯỚNG DẪN NỘI BỘ - BANG NIÊN DU (TRANG ${i})`, {
      x: 50,
      y: 780,
      size: 16,
      font,
      color: rgb(0.1, 0.2, 0.5)
    });

    page.drawText(
      'Đây là tài liệu được biên soạn công phu bởi đội ngũ dịch thuật và biên tập viên.\n' +
      'Mọi thông tin trong tài liệu này chỉ lưu hành trong nhóm thành viên chính thức.\n' +
      'Nghiêm cấm chia sẻ, thương mại hóa hoặc xóa credit tác giả.',
      {
        x: 50,
        y: 720,
        size: 12,
        font,
        lineHeight: 18,
        color: rgb(0.2, 0.2, 0.2)
      }
    );
  }

  const rawBytes = await newPdf.save();
  fs.writeFileSync(samplePdfPath, rawBytes);
  console.log(`-> Đã tạo PDF gốc mẫu tại: ${samplePdfPath} (${rawBytes.length} bytes)`);

  // 2. Chạy thử hàm applyWatermark
  console.log('\n2. Thực hiện dập Watermark động theo thông tin User giả lập...');
  const mockUser = {
    userId: '987654321012345678',
    userTag: 'ThanhVienTest#9999',
    displayName: 'Nguyễn Văn Minh'
  };
  const printCode = 'ND-88219-TEST';

  const watermarkedBytes = await applyWatermark(rawBytes, mockUser, printCode);
  const outputPath = path.join(config.paths.temp, 'test_watermarked_sample.pdf');
  fs.writeFileSync(outputPath, watermarkedBytes);

  console.log(`-> Dập Watermark thành công!`);
  console.log(`-> File kết quả xuất tại: ${outputPath} (${watermarkedBytes.length} bytes)`);

  // 3. Kiểm tra tính toàn vẹn của PDF sau khi dập
  const checkPdf = await PDFDocument.load(watermarkedBytes);
  console.log(`-> Số trang file sau khi đóng dấu: ${checkPdf.getPageCount()}`);
  console.log(`-> Tiêu đề metadata: ${checkPdf.getTitle()}`);
  console.log(`-> Subject metadata: ${checkPdf.getSubject()}`);
  console.log(`-> Producer: ${checkPdf.getProducer()}`);

  console.log('\n✅ KIỂM THỬ THÀNH CÔNG RỰC RỠ!');
}

runTest().catch(err => {
  console.error('❌ Lỗi khi kiểm thử:', err);
  process.exit(1);
});
