# 🛡️ Niên Du Document Gatekeeper & Anti-Theft Bot

Hệ thống Bot Discord tự động **quản lý, ghi log chi tiết lượt tải và đóng dấu Watermark định danh (Tên + Discord ID)** lên tài liệu PDF nhằm ngăn chặn triệt để hành vi đánh cắp, xóa credit hoặc đem bán thương mại.

---

## 🌟 Tính năng nổi bật

1. **Ghi Log Kiểm toán 100% (Download Audit Logging):**
   - Discord mặc định không ghi log ai tải file đính kèm. Bot đóng vai trò Gatekeeper: Mọi lượt tải đều thông qua nút bấm tương tác.
   - Ghi nhận chi tiết: **Tên người dùng, Discord ID, Tuổi tài khoản, Ngày gia nhập server, Thời gian chính xác, Tên tài liệu** và gửi về kênh riêng của Admin (`#download-logs`).
   - Lưu trữ tự động vào file `storage/download_logs.jsonl`.

2. **Dập Watermark Động (Dynamic Personal Watermark):**
   - Không dùng watermark chung dễ bị tẩy xóa.
   - Khi người dùng bấm tải, Bot tự động dập mờ chữ ký số chéo qua **từng trang tài liệu**:
     `BẢN CẤP RIÊNG CHO: <Tên người dùng> (ID: <Discord ID>)`
     `NGÀY TẢI: <Ngày/Tháng/Năm> | MÃ BẢN IN: #<PrintCode>`
     `NGHIÊM CẤM PHÁT TÁN, XÓA CREDIT HOẶC THƯƠNG MẠI HÓA`
   - Đóng dấu chân trang (Footer) và gắn **Metadata bản quyền** ẩn bên trong cấu trúc file PDF.

3. **Chống Clone & Phân quyền bảo mật (Anti-Clone / Role-Gate):**
   - Chặn tài khoản mới tạo (ví dụ < 7 ngày) để tránh kẻ gian tạo nick phụ vào tải trộm.
   - Chặn tài khoản mới vào server (ví dụ < 1 ngày).
   - Tùy chọn chỉ định Role bắt buộc (ví dụ chỉ role "Nội Viện" hoặc "Thành viên chính thức" mới được tải).

4. **Gửi file riêng tư (Ephemeral Delivery):**
   - File đã đóng dấu chỉ gửi hiển thị trên màn hình của người bấm nút (`ephemeral`), các thành viên khác không thấy và không tải ké được.

---

## 🚀 Hướng dẫn cài đặt & Chạy Bot

### Bước 1: Tạo Bot trên Discord Developer Portal
1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications) và đăng nhập.
2. Bấm **New Application** -> Đặt tên (ví dụ: `Niên Du Gatekeeper`) -> Bấm **Create**.
3. Vào tab **Bot** (cột bên trái):
   - Bấm **Reset Token** -> Copy mã Token này (đây là `DISCORD_TOKEN`).
   - Cuộn xuống mục **Privileged Gateway Intents**:
     - Bật tích xanh cho cả 3 mục: `Presence Intent`, `Server Members Intent`, `Message Content Intent`.
     - Bấm **Save Changes**.
4. Vào tab **General Information**:
   - Copy **Application ID** (đây là `CLIENT_ID`).
5. Vào tab **Installation** (hoặc **OAuth2 -> URL Generator**):
   - Chọn Scopes: `bot`, `applications.commands`.
   - Chọn Bot Permissions: `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Use Slash Commands`.
   - Copy link vừa tạo, mở trong trình duyệt và chọn Server của bạn để mời Bot vào.

---

### Bước 2: Cấu hình file `.env`
Mở file `.env` trong thư mục dự án và điền thông tin:

```env
DISCORD_TOKEN=Mã_token_ở_bước_1
CLIENT_ID=Application_ID_ở_bước_1
GUILD_ID=ID_Server_Discord_của_bạn
LOG_CHANNEL_ID=ID_Kênh_Admin_để_nhận_thông_báo_tải

# (Tùy chọn) Chống nick clone:
MIN_ACCOUNT_AGE_DAYS=7
MIN_JOIN_DAYS=1
REQUIRED_ROLE_ID=
```

> 💡 **Cách lấy ID Server và ID Kênh trên Discord:**
> - Mở Discord -> Cài đặt người dùng (User Settings) -> Nâng cao (Advanced) -> Bật **Chế độ nhà phát triển (Developer Mode)**.
> - Sau khi bật, bạn chỉ cần chuột phải vào Server hoặc Kênh để chọn **Sao chép ID (Copy ID)**.

---

### Bước 3: Thêm tài liệu PDF vào kho lưu trữ
Copy các file tài liệu PDF gốc của bạn vào thư mục:
```text
storage/raw_docs/
```
*(Hiện tại đã có sẵn 1 file mẫu: `Tai_Lieu_Mau_Noi_Vien.pdf`)*

---

### Bước 4: Kiểm thử dập Watermark độc lập (Không cần kết nối Discord)
Chạy lệnh sau trong Terminal để xem thử tính năng dập Watermark động hoạt động ra sao:
```bash
npm run test:watermark
```
File PDF kết quả sau khi đóng dấu sẽ nằm tại:
`storage/temp/test_watermarked_sample.pdf`

---

### Bước 5: Khởi động Bot
Chạy lệnh:
```bash
npm start
```
Khi bot online, bạn sẽ thấy thông báo:
```text
🤖 BOT ĐÃ ONLINE THÀNH CÔNG: Niên Du Gatekeeper#0000
✅ Đã đăng ký thành công các lệnh: /publish-doc, /list-docs
```

---

## 📖 Hướng dẫn sử dụng các lệnh trên Discord

### 1. Xem danh sách tài liệu đang có
Gõ lệnh:
```text
/list-docs
```
Bot sẽ trả về danh sách toàn bộ các file PDF có trong thư mục `storage/raw_docs/`.

### 2. Xuất bản tài liệu ra kênh chung
Gõ lệnh:
```text
/publish-doc
```
- `file_name`: Tên file PDF trong thư mục `storage/raw_docs/` (Discord sẽ tự động gợi ý danh sách file để bạn chọn).
- `title`: Tiêu đề hiển thị của tài liệu.
- `description`: Mô tả nội dung tài liệu (tùy chọn).
- `log_channel`: Chọn kênh riêng nhận log tải tài liệu này (tùy chọn, mặc định lấy trong `.env`).
- `required_role`: Chỉ định vai trò bắt buộc mới được phép tải (tùy chọn).

### 3. Điều khiển Bot gửi tin nhắn văn bản (/say)
Gõ lệnh:
```text
/say message: "Nội dung cần gửi" channel: #kênh-nhận
```
Bot sẽ gửi tin nhắn thuần túy thay mặt bạn (dùng avatar và tên của Bot).

### 4. Điều khiển Bot gửi thông báo trang trọng (/announce)
Gõ lệnh:
```text
/announce title: "Tiêu đề" message: "Nội dung" channel: #kênh-nhận color: "Xanh dương/Đỏ/Xanh lá..." mention: "everyone/here/none"
```
Bot sẽ gửi khung thông báo Embed viền màu sang trọng vào kênh chỉ định.
