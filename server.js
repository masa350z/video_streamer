// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const fileExplorer = require('./fileExplorer');
const thumbnailCache = require('./thumbnailCache');

const app = express();

// 環境変数 VIDEO_DIRECTORY に設定されたディレクトリをメディアのルートとする
const MEDIA_ROOT = process.env.VIDEO_DIRECTORY;
if (!MEDIA_ROOT) {
  console.error('環境変数 VIDEO_DIRECTORY が指定されていません。');
  process.exit(1);
}

// public フォルダ配下を静的に配信
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------
// 1) ディレクトリ・ファイル一覧を返す API
// ---------------------------------------------------
app.get('/api/directory', async (req, res) => {
  const relativePath = req.query.p || '';
  const targetPath = path.join(MEDIA_ROOT, relativePath);

  try {
    // パスがルート外に出ないようにガード
    const resolvedTargetPath = path.resolve(targetPath);
    const resolvedRootPath = path.resolve(MEDIA_ROOT);
    if (!resolvedTargetPath.startsWith(resolvedRootPath)) {
      return res.status(403).json({ error: '許可されていないパスです。' });
    }

    // ディレクトリツリーを取得
    const tree = await fileExplorer.getDirectoryTree(resolvedTargetPath, resolvedRootPath);
    res.json(tree);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ディレクトリ情報の取得に失敗しました。' });
  }
});

// ---------------------------------------------------
// 2) サムネイル取得 API（動画or画像 どちらでも）
// ---------------------------------------------------
app.get('/api/thumbnail', async (req, res) => {
  const relativePath = req.query.p;
  if (!relativePath) {
    return res.status(400).send('パラメータが不足しています。');
  }

  const targetPath = path.join(MEDIA_ROOT, relativePath);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedRootPath = path.resolve(MEDIA_ROOT);
  if (!resolvedTargetPath.startsWith(resolvedRootPath)) {
    return res.status(403).send('許可されていないパスです。');
  }

  try {
    // サムネイルを生成/キャッシュして取得
    const thumbnailBuffer = await thumbnailCache.getThumbnail(resolvedTargetPath);
    res.set('Content-Type', 'image/jpeg');
    res.send(thumbnailBuffer);
  } catch (err) {
    console.error(err);
    return res.status(404).send('サムネイル取得に失敗しました。');
  }
});

// ---------------------------------------------------
// 3) 動画ストリーミング API
// ---------------------------------------------------
app.get('/api/video', (req, res) => {
  const relativePath = req.query.p;
  if (!relativePath) {
    return res.status(400).send('パラメータが不足しています。');
  }

  const targetPath = path.join(MEDIA_ROOT, relativePath);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedRootPath = path.resolve(MEDIA_ROOT);
  if (!resolvedTargetPath.startsWith(resolvedRootPath)) {
    return res.status(403).send('許可されていないパスです。');
  }

  if (!fs.existsSync(resolvedTargetPath)) {
    return res.status(404).send('ファイルが存在しません。');
  }

  const range = req.headers.range;
  if (!range) {
    // Range ヘッダがない場合はファイルを丸ごと返す
    const fileSize = fs.statSync(resolvedTargetPath).size;
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mime.lookup(resolvedTargetPath) || 'application/octet-stream',
    });
    fs.createReadStream(resolvedTargetPath).pipe(res);
  } else {
    // Range ヘッダがある場合は部分的に返す (ストリーミング)
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

// ---------------------------------------------------
// 4) 画像ファイルをそのまま返す API
//    (動画のように Range 不要なので直接返却)
// ---------------------------------------------------
app.get('/api/image', (req, res) => {
  const relativePath = req.query.p;
  if (!relativePath) {
    return res.status(400).send('パラメータが不足しています。');
  }

  const targetPath = path.join(MEDIA_ROOT, relativePath);
  const resolvedTargetPath = path.resolve(targetPath);
  const resolvedRootPath = path.resolve(MEDIA_ROOT);
  if (!resolvedTargetPath.startsWith(resolvedRootPath)) {
    return res.status(403).send('許可されていないパスです。');
  }

  if (!fs.existsSync(resolvedTargetPath)) {
    return res.status(404).send('ファイルが存在しません。');
  }

  // MIME タイプを判定してセットし、静的ファイルを送信
  const contentType = mime.lookup(resolvedTargetPath) || 'application/octet-stream';
  res.set('Content-Type', contentType);
  res.sendFile(resolvedTargetPath);
});

// ---------------------------------------------------
// 5) ルート ('/') にアクセスしたら index.html を返す
// ---------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------
// ポート3000で起動
// ---------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
