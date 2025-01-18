// fileExplorer.js
const fs = require('fs');
const path = require('path');

async function getDirectoryTree(dirPath, rootPath) {
  const files = await fs.promises.readdir(dirPath, { withFileTypes: true });

  // ディレクトリとファイルに分けてソートして返す (UIで見やすいように)
  const directories = [];
  const videoFiles = [];
  const otherFiles = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    const relPath = path.relative(rootPath, fullPath);

    if (file.isDirectory()) {
      directories.push({
        name: file.name,
        type: 'directory',
        path: relPath
      });
    } else {
      // 拡張子が動画っぽいものかを簡易的に判別 (正確には mime-types 等を使うと良い)
      if (/\.(mp4|mov|m4v|avi|wmv|mkv|flv|webm)$/i.test(file.name)) {
        videoFiles.push({
          name: file.name,
          type: 'video',
          path: relPath
        });
      } else {
        otherFiles.push({
          name: file.name,
          type: 'file',
          path: relPath
        });
      }
    }
  }

  // ディレクトリは名前順、動画ファイルは名前順、その他ファイルは名前順でまとめて返す
  directories.sort((a, b) => a.name.localeCompare(b.name));
  videoFiles.sort((a, b) => a.name.localeCompare(b.name));
  otherFiles.sort((a, b) => a.name.localeCompare(b.name));

  return {
    directories,
    videoFiles,
    otherFiles
  };
}

module.exports = {
  getDirectoryTree
};
