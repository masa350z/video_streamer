// script.js

let currentRelativePath = "";

const breadcrumbEl = document.getElementById("breadcrumb");
const directoryListEl = document.getElementById("directory-list");

// 動画関連
const videoPlayerEl = document.getElementById("video-player");
const closePlayerBtn = document.getElementById("close-player");
const player = document.getElementById("player");

// 画像関連
const imageViewerEl = document.getElementById("image-viewer");
const closeImageViewerBtn = document.getElementById("close-image-viewer");
const viewerImageEl = document.getElementById("viewer-image");

// ページ読み込み時、ルートを読み込む
window.addEventListener("load", () => {
  loadDirectory("");
});

// ディレクトリ読み込み
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

// パンくずリスト表示
function renderBreadcrumb(relativePath) {
  breadcrumbEl.innerHTML = "";

  const parts = relativePath ? relativePath.split("/") : [];

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
    const nextPath = pathSoFar + (i === 0 ? "" : "/") + part;

    const partSpan = document.createElement("span");
    partSpan.className = "breadcrumb-item";
    partSpan.textContent = part;
    partSpan.addEventListener("click", () => loadDirectory(nextPath));
    breadcrumbEl.appendChild(partSpan);

    pathSoFar = nextPath;
  }
}

// ディレクトリ一覧表示
function renderDirectory(treeData) {
  directoryListEl.innerHTML = "";

  // ディレクトリ
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

  // 動画ファイル
  for (const video of treeData.videoFiles) {
    const item = document.createElement("div");
    item.className = "item";

    // サムネイル取得
    const thumbUrl = `/api/thumbnail?p=${encodeURIComponent(video.path)}`;

    item.innerHTML = `
      <img src="${thumbUrl}" alt="video thumbnail" />
      <div class="filename">${video.name}</div>
    `;
    item.addEventListener("click", () => {
      playVideo(video.path);
    });
    directoryListEl.appendChild(item);
  }

  // 画像ファイル
  for (const image of treeData.imageFiles) {
    const item = document.createElement("div");
    item.className = "item";

    // サムネイル
    const thumbUrl = `/api/thumbnail?p=${encodeURIComponent(image.path)}`;

    item.innerHTML = `
      <img src="${thumbUrl}" alt="image thumbnail" />
      <div class="filename">${image.name}</div>
    `;
    item.addEventListener("click", () => {
      showImage(image.path);
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
    directoryListEl.appendChild(item);
  }
}

// 動画再生 (モーダル)
function playVideo(videoRelativePath) {
  player.src = `/api/video?p=${encodeURIComponent(videoRelativePath)}`;
  videoPlayerEl.classList.remove("hidden");
  player.play();
}

// 動画モーダルを閉じる
closePlayerBtn.addEventListener("click", () => {
  player.pause();
  player.src = "";
  videoPlayerEl.classList.add("hidden");
});

// 画像表示 (モーダル)
function showImage(imageRelativePath) {
  // 画像パスを設定して表示
  viewerImageEl.src = `/api/image?p=${encodeURIComponent(imageRelativePath)}`;
  imageViewerEl.classList.remove("hidden");
}

// 画像モーダルを閉じる
closeImageViewerBtn.addEventListener("click", () => {
  viewerImageEl.src = "";
  imageViewerEl.classList.add("hidden");
});
