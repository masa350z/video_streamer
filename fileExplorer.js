// fileExplorer.js
const fs = require('fs');
const path = require('path');

// 拡張子の判定用
const VIDEO_EXT_REGEX = /\.(mp4|mov|m4v|avi|wmv|mkv|flv|webm)$/i;
const IMAGE_EXT_REGEX = /\.(jpg|jpeg|JPG|JPEG|png|gif|bmp|webp)$/i;

async function getDirectoryTree(dirPath, rootPath) {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  const directories = [];
  const videoFiles = [];
  const imageFiles = [];
  const otherFiles = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      directories.push({
        name: entry.name,
        type: 'directory',
        path: relPath
      });
    } else {
      // 拡張子判定
      if (VIDEO_EXT_REGEX.test(entry.name)) {
        videoFiles.push({
          name: entry.name,
          type: 'video',
          path: relPath
        });
      } else if (IMAGE_EXT_REGEX.test(entry.name)) {
        imageFiles.push({
          name: entry.name,
          type: 'image',
          path: relPath
        });
      } else {
        // その他ファイルは無視（返さない）
      }
    }
  }

  // 名前順にソート
  directories.sort((a, b) => a.name.localeCompare(b.name));
  videoFiles.sort((a, b) => a.name.localeCompare(b.name));
  imageFiles.sort((a, b) => a.name.localeCompare(b.name));
  otherFiles.sort((a, b) => a.name.localeCompare(b.name));

  return {
    directories,
    videoFiles,
    imageFiles,
    otherFiles
  };
}

module.exports = {
  getDirectoryTree
};
