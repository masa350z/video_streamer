// thumbnailCache.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');

// キャッシュ用ディレクトリを作成しておく
const cacheDir = path.join(__dirname, '.thumbnail_cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

/**
 * 与えられた動画パスに対応するサムネイルを返す。
 * まだキャッシュが存在しない場合は ffmpeg で生成してキャッシュする。
 * 返却は Buffer とする。
 */
async function getThumbnail(videoPath) {
  return new Promise((resolve, reject) => {
    // videoPath から一意のハッシュを作りキャッシュファイル名にする
    const hash = crypto.createHash('md5').update(videoPath).digest('hex');
    const cacheFile = path.join(cacheDir, hash + '.jpg');

    // 既にキャッシュファイルが存在すればそれを返す
    if (fs.existsSync(cacheFile)) {
      fs.readFile(cacheFile, (err, data) => {
        if (err) return reject(err);
        return resolve(data);
      });
    } else {
      // ffmpeg でサムネイルを作成
      // 例: 動画の 10% 時点のフレームをサムネイルにするなど (ここでは単に 1 秒地点を取得)
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [1],  // 秒
          filename: hash + '.jpg',
          folder: cacheDir,
          size: '320x?'
        })
        .on('end', () => {
          // 生成されたキャッシュファイルを読み込んで返す
          fs.readFile(cacheFile, (err, data) => {
            if (err) return reject(err);
            return resolve(data);
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    }
  });
}

module.exports = {
  getThumbnail
};
