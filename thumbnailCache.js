// thumbnailCache.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');

// サムネイルキャッシュ用ディレクトリ
const cacheDir = path.join(__dirname, '.thumbnail_cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

// ファイルが動画か画像か判定するための簡易正規表現
const VIDEO_EXT_REGEX = /\.(mp4|mov|m4v|avi|wmv|mkv|flv|webm)$/i;
const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|bmp|webp)$/i;

/**
 * 与えられたファイルパスが動画か画像かを判定し、
 * 適切な方法でサムネイルを生成して返却する。
 * 
 * @param {string} filePath
 * @returns {Promise<Buffer>} JPEGデータをBufferで返す
 */
function getThumbnail(filePath) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath).toLowerCase();
    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    const cacheFile = path.join(cacheDir, hash + '.jpg');

    // キャッシュがあれば即返す
    if (fs.existsSync(cacheFile)) {
      fs.readFile(cacheFile, (err, data) => {
        if (err) return reject(err);
        return resolve(data);
      });
      return;
    }

    // キャッシュがないので新規作成
    if (VIDEO_EXT_REGEX.test(ext)) {
      // --- 動画の場合は ffmpeg ---
      ffmpeg(filePath)
        .screenshots({
          timestamps: [1],  // 1秒地点
          filename: hash + '.jpg',
          folder: cacheDir,
          size: '320x?'     // 幅320px、高さはアスペクト比維持
        })
        .on('end', () => {
          fs.readFile(cacheFile, (err, data) => {
            if (err) return reject(err);
            resolve(data);
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    } else if (IMAGE_EXT_REGEX.test(ext)) {
      // --- 画像の場合は sharp ---
      // 幅320pxにリサイズし、JPEGで出力する
      sharp(filePath)
        .resize({ width: 320 })
        .jpeg()
        .toFile(cacheFile)
        .then(() => {
          fs.readFile(cacheFile, (err, data) => {
            if (err) return reject(err);
            resolve(data);
          });
        })
        .catch((err) => reject(err));
    } else {
      // その他ファイルはサムネイル生成対象外
      // 代わりに適当な共通のアイコン画像を返す等も可能
      return reject(new Error('サムネイル生成対象ではありません'));
    }
  });
}

module.exports = {
  getThumbnail
};
