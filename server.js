// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const fileExplorer = require('./fileExplorer');
const thumbnailCache = require('./thumbnailCache');

const app = express();

// 環境変数 VIDEO_DIRECTORY に設定されたディレクトリを動画ルートとする
const VIDEO_ROOT = process.env.VIDEO_DIRECTORY;
if (!VIDEO_ROOT) {
  console.error('環境変数 VIDEO_DIRECTORY が指定されていません。');
  process.exit(1);
}

// 静的ファイルを public ディレクトリから配信
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------
// 1) ディレクトリツリーを返すAPI
// -------------------------------------
app.get('/api/directory', async (req, res) => {
  // ?p= 相対パス (VIDEO_ROOT をルートとした相対パス) が来る想定
  // 無い場合は "/" として処理
  const relativePath = req.query.p || '';
  const targetPath = path.join(VIDEO_ROOT, relativePath);

  try {
    // セキュリティのため、ターゲットパスが VIDEO_ROOT 外に出ないようにガード
    const resolvedTargetPath = path.resolve(targetPath);
    const resolvedRootPath = path.resolve(VIDEO_ROOT);
    if (!resolvedTargetPath.startsWith(resolvedRootPath)) {
      return res.status(403).json({ error: '許可されていないパスです。' });
    }

    // ディレクトリツリー構造を取得
    const tree = await fileExplorer.getDirectoryTree(resolvedTargetPath, resolvedRootPath);
    return res.json(tree);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ディレクトリ情報の取得に失敗しました。' });
  }
});

// -------------------------------------
// 2) サムネイル取得API
// -------------------------------------
app.get('/api/thumbnail', async (req, res) => {
  const relativePath = req.query.p;
  if (!relativePath) {
    return res.status(400).send('パラメータが不足しています。');
  }

  const targetPath = path.join(VIDEO_ROOT, relativePath);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedRootPath = path.resolve(VIDEO_ROOT);
  if (!resolvedTargetPath.startsWith(resolvedRootPath)) {
    return res.status(403).send('許可されていないパスです。');
  }

  try {
    // サムネイルを取得 (キャッシュ利用)
    const thumbnailBuffer = await thumbnailCache.getThumbnail(resolvedTargetPath);
    res.set('Content-Type', 'image/jpeg');
    res.send(thumbnailBuffer);
  } catch (err) {
    console.error(err);
    // 失敗した場合は適当な代替画像を返す or 404
    return res.status(404).send('サムネイル取得に失敗しました。');
  }
});

// -------------------------------------
// 3) 動画ストリーミングAPI
// -------------------------------------
app.get('/api/video', (req, res) => {
  const relativePath = req.query.p;
  if (!relativePath) {
    return res.status(400).send('パラメータが不足しています。');
  }

  const targetPath = path.join(VIDEO_ROOT, relativePath);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedRootPath = path.resolve(VIDEO_ROOT);
  if (!resolvedTargetPath.startsWith(resolvedRootPath)) {
    return res.status(403).send('許可されていないパスです。');
  }

  if (!fs.existsSync(resolvedTargetPath)) {
    return res.status(404).send('ファイルが存在しません。');
  }

  // Rangeヘッダに応じて部分的に動画を返す
  const range = req.headers.range;
  if (!range) {
    // Range が無い場合は全体を送信
    const fileSize = fs.statSync(resolvedTargetPath).size;
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mime.lookup(resolvedTargetPath) || 'application/octet-stream',
    });
    fs.createReadStream(resolvedTargetPath).pipe(res);
  } else {
    const fileSize = fs.statSync(resolvedTargetPath).size;
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    const contentType = mime.lookup(resolvedTargetPath) || 'application/octet-stream';

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType
    });

    fs.createReadStream(resolvedTargetPath, { start, end }).pipe(res);
  }
});

// -------------------------------------
// 4) ルートアクセス時、public/index.html を返す
// -------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------------------------
// ポート3000で起動
// -------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
