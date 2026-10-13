const fs = require('fs');
const path = require('path');
const os = require('os');
const { config } = require('../config');

/**
 * Lấy danh sách các thư mục cần quét file trên máy tính:
 * 1. Kho lưu trữ nội bộ của Bot: storage/raw_docs/
 * 2. Thư mục Downloads của người dùng
 * 3. Thư mục Desktop của người dùng
 * 4. Thư mục OneDrive/Desktop (nếu dùng Windows đồng bộ OneDrive)
 */
function getWatchFolders() {
  const home = os.homedir();
  const folders = [
    config.paths.rawDocs,
    path.join(home, 'Downloads'),
    path.join(home, 'Desktop'),
    path.join(home, 'OneDrive', 'Desktop')
  ];
  return folders.filter(f => fs.existsSync(f));
}

/**
 * Lấy Map toàn bộ các file PDF có sẵn: { fileName -> absolutePath }
 */
function getAllAvailablePdfs() {
  const folders = getWatchFolders();
  const fileMap = new Map();

  for (const folder of folders) {
    try {
      const items = fs.readdirSync(folder);
      for (const item of items) {
        if (item.toLowerCase().endsWith('.pdf') && !fileMap.has(item)) {
          fileMap.set(item, path.join(folder, item));
        }
      }
    } catch (err) {
      // Bỏ qua nếu thư mục bị hạn chế quyền truy cập
    }
  }

  return fileMap;
}

/**
 * Tìm đường dẫn thực tế của một file PDF.
 * Nếu file nằm ở Downloads hoặc Desktop, tự động sao chép một bản vào storage/raw_docs/ để lưu trữ vĩnh viễn.
 */
function resolveAndStorePdf(fileName) {
  const cleanName = path.basename(fileName.trim());
  const fileMap = getAllAvailablePdfs();

  if (!fileMap.has(cleanName)) {
    return null;
  }

  const sourcePath = fileMap.get(cleanName);
  const internalDestPath = path.join(config.paths.rawDocs, cleanName);

  // Nếu file đang nằm ở Downloads hoặc Desktop, sao chép vào storage/raw_docs để bảo toàn
  if (path.resolve(sourcePath) !== path.resolve(internalDestPath)) {
    try {
      if (!fs.existsSync(config.paths.rawDocs)) {
        fs.mkdirSync(config.paths.rawDocs, { recursive: true });
      }
      fs.copyFileSync(sourcePath, internalDestPath);
      return internalDestPath;
    } catch (e) {
      console.warn('Không thể sao chép file vào kho lưu trữ, dùng file gốc:', e.message);
      return sourcePath;
    }
  }

  return internalDestPath;
}

module.exports = {
  getWatchFolders,
  getAllAvailablePdfs,
  resolveAndStorePdf
};
