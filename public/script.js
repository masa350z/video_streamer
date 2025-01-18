// script.js

// 現在の相対パス (ルートは "")
let currentRelativePath = "";

const breadcrumbEl = document.getElementById("breadcrumb");
const directoryListEl = document.getElementById("directory-list");

const videoPlayerEl = document.getElementById("video-player");
const closePlayerBtn = document.getElementById("close-player");
const player = document.getElementById("player");

// 初期表示
window.addEventListener("load", () => {
  loadDirectory("");
});

// ディレクトリ読み込み関数
function loadDirectory(relativePath) {
  currentRelativePath = relativePath;

  fetch(`/api/directory?p=${encodeURIComponent(relativePath)}`)
    .then(response => response.json())
    .then(data => {
      renderBreadcrumb(relativePath);
      renderDirectory(data);
    })
    .catch(err => {
      console.error(err);
      alert("ディレクトリを読み込めませんでした。");
    });
}

// パンくずリストの表示
function renderBreadcrumb(relativePath) {
  breadcrumbEl.innerHTML = "";

  // relativePath を "/" で分割してパーツにする
  // 例: "folder1/folder2" -> ["folder1", "folder2"]
  const parts = relativePath ? relativePath.split(pathSep()) : [];

  // ルートへのリンク
  const rootItem = document.createElement("span");
  rootItem.className = "breadcrumb-item";
  rootItem.textContent = "ルート";
  rootItem.addEventListener("click", () => loadDirectory(""));
  breadcrumbEl.appendChild(rootItem);

  let pathSoFar = "";
  for (let i = 0; i < parts.length; i++) {
    const sepSpan = document.createElement("span");
    sepSpan.className = "breadcrumb-sep";
    sepSpan.textContent = "/";
    breadcrumbEl.appendChild(sepSpan);

    const part = parts[i];
    pathSoFar += (i === 0 ? "" : pathSep()) + part;

    const partSpan = document.createElement("span");
    partSpan.className = "breadcrumb-item";
    partSpan.textContent = part;
    partSpan.addEventListener("click", () => loadDirectory(pathSoFar));
    breadcrumbEl.appendChild(partSpan);
  }
}

// ディレクトリ一覧の表示
function renderDirectory(treeData) {
  directoryListEl.innerHTML = "";

  // ディレクトリの描画
  for (const dir of treeData.directories) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <img src="folder_icon.png" alt="folder" />
      <div class="filename">${dir.name}</div>
    `;
    item.addEventListener("click", () => {
      loadDirectory(dir.path);
    });
    directoryListEl.appendChild(item);
  }

  // 動画ファイルの描画
  for (const video of treeData.videoFiles) {
    const item = document.createElement("div");
    item.className = "item";

    // サムネイルを取得
    const thumbUrl = `/api/thumbnail?p=${encodeURIComponent(video.path)}`;

    item.innerHTML = `
      <img src="${thumbUrl}" alt="video" />
      <div class="filename">${video.name}</div>
    `;
    item.addEventListener("click", () => {
      playVideo(video.path);
    });
    directoryListEl.appendChild(item);
  }

  // その他ファイル
  for (const file of treeData.otherFiles) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <img src="file_icon.png" alt="file" />
      <div class="filename">${file.name}</div>
    `;
    // ファイルをクリックしたときの挙動は特に実装しないが、
    // 必要であればダウンロードなどの機能を実装可能
    directoryListEl.appendChild(item);
  }
}

// 動画再生
function playVideo(videoRelativePath) {
  // 動画ソースを設定
  player.src = `/api/video?p=${encodeURIComponent(videoRelativePath)}`;

  // 動画プレイヤーを表示
  videoPlayerEl.classList.remove("hidden");
  player.play();
}

// 動画プレイヤーを閉じる
closePlayerBtn.addEventListener("click", () => {
  player.pause();
  player.src = "";
  videoPlayerEl.classList.add("hidden");
});

// OSに合わせたパスセパレータを返す。今回は "/" で統一想定なら固定でも良い
function pathSep() {
  return "/";
}
