# README

## 概要
video-streamer は、ローカルネットワーク内で **動画や画像** を入れ子構造（複数階層のディレクトリ）ごとブラウザから視聴・閲覧できるようにする **Node.js + Docker Compose** アプリケーションです。

- **動画**: サムネイル（ffmpeg で生成）＋クリックでストリーミング再生
- **画像**: サムネイル（sharp で生成）＋クリックでモーダル拡大表示
- **ディレクトリ探索**: パンくずリストで中間ディレクトリに戻る・移動が可能
- **レスポンシブUI**: スマホ・PC どちらでも使いやすい
- **Docker Compose** を使って 1 コマンドで起動可能

## ディレクトリ構成
```plaintext
.
├── docker-compose.yml
├── Dockerfile
├── package.json
├── package-lock.json        (npm install 後に生成される場合がある。必須ではない)
├── server.js
├── fileExplorer.js
├── thumbnailCache.js
└── public
    ├── index.html
    ├── style.css
    └── script.js
```

- **docker-compose.yml**: マルチコンテナを扱う Compose 設定（ただし本プロジェクトではサービス 1 つのみ）
- **Dockerfile**: Node.js + ffmpeg + libvips をインストールし、アプリケーションをビルド・実行するためのレシピ
- **package.json**: Node.js の依存パッケージ（express, fluent-ffmpeg, mime-types, sharp など）を定義
- **server.js**: メインの Express サーバーエントリポイント
- **fileExplorer.js**: 指定ディレクトリの下位ディレクトリ構成を解析するモジュール
- **thumbnailCache.js**: 動画・画像ファイルのサムネイルを生成・キャッシュするモジュール
- **public/**: 静的ファイル（HTML / CSS / JS）。ブラウザ向けUI

## 前提条件
- Intelチップの macOS 環境で Docker が動いていること
- ffmpeg と libvips を Docker イメージ内でインストールするため、インターネットに接続できる環境
- ホストマシン上に動画・画像ファイルが配置されたディレクトリが存在し、そのディレクトリをコンテナにマウントする
- Apple Silicon (M1/M2) の場合は別途 arm64 用イメージ設定などが必要になる場合があります。

## インストール・セットアップ手順

### 1. リポジトリをクローン or 直接ファイル一式を取得
```bash
git clone <このプロジェクトのリポジトリURL>
cd video_streamer
```
または ZIP などでダウンロードし、上記ディレクトリ構成になるよう配置してください。

### 2. docker-compose.yml の編集
以下のように、ご自身の「動画や画像ファイルをまとめたディレクトリ」を コンテナの `/videos` にマウントします。
```yaml
services:
  video-server:
    build: .
    container_name: video_server
    volumes:
      - ./:/usr/src/app
      - /usr/src/app/node_modules
      - /absolute/path/to/your/media/files:/videos
    ports:
      - "3000:3000"
    environment:
      - VIDEO_DIRECTORY=/videos
```
- `- /absolute/path/to/your/media/files:/videos` の部分を**実際の絶対パス**に置き換えてください。  
- `VIDEO_DIRECTORY=/videos` により、コンテナ内では `/videos` ディレクトリがメディアファイルのルートディレクトリとして扱われます。

### 3. Docker ビルド
```bash
docker-compose build --no-cache
```
Dockerfile が実行され、ffmpeg, libvips, libvips-dev のインストールと npm install が行われます。

### 4. 依存パッケージインストール（念のため）
```bash
docker-compose run --rm video-server npm install
```

### 5. 実行
```bash
docker-compose up
```
ブラウザで `http://localhost:3000` にアクセスすると、ルートディレクトリ (`/videos`) 以下のフォルダ・ファイル一覧が表示されます。

## 使い方

### ディレクトリ構成の表示
- ルート直下のサブフォルダや動画・画像がサムネイルとファイル名で表示されます。
- 入れ子のサブフォルダがある場合はフォルダアイコンが表示され、クリックでそのフォルダ内に移動できます。

### パンくずリスト
- 画面上部（breadcrumb）に「ルート / フォルダ名 / ...」のように表示されます。
- 中間のディレクトリ名もクリック(タップ)すると、そのディレクトリへジャンプできます。

### 動画の再生
- 動画サムネイルをクリックすると、モーダル上に動画プレイヤーが表示されます。
- iPhone Safari 等では `playsinline` によるインライン再生にも対応しており、音量や再生シークなどが可能です。

### 画像の拡大表示
- 画像サムネイルをクリックすると、別のモーダルウィンドウに拡大した画像が表示されます。
- 閉じるボタンで元のファイル一覧画面に戻ります。

### その他ファイル
- 画像でも動画でもないファイルは「その他ファイル (file_icon.png)」として一覧に表示。
- 必要に応じてダウンロード機能を付けるなどの拡張が可能です。

### スマホ対応
- `<meta name="viewport">` と CSS の メディアクエリ により、画面幅が狭い（600px以下）の場合は自動的にコンパクトレイアウトに切り替わります。

## トラブルシューティング

### 「Cannot find module 'sharp'」や「Cannot find module 'express'」エラー
コンテナ起動時に、ホストマウントで node_modules が上書きされて失われることが原因です。
以下の設定を確認してください。
```yaml
volumes:
  - ./:/usr/src/app
  - /usr/src/app/node_modules
  - ...
```
さらに以下を実行すると確実です。
```bash
docker-compose build --no-cache && docker-compose run --rm video-server npm install
```

### キャッシュしたサムネイルを消したい
- プロジェクトフォルダ内に `.thumbnail_cache` ディレクトリが作成されます。
- 削除すれば次回アクセス時に再生成されます。

### Apple Silicon (M1/M2) 環境でビルドできない／エラーになる
- このDockerfileは `node:18` イメージ（amd64）を前提としています。
- Apple Silicon なら `node:18` イメージが arm64 を含むかどうかに依存します。
- 必要に応じて `platform: linux/amd64` を指定してください。

### 「version: '3' はobsolete」と警告が出る
- Docker Compose v2 以降では、`version:` フィールドは省略推奨ですが動作に支障はありません。
- 気になる場合は `version:` を削除してください。

## ライセンス
本プロジェクトは（必要に応じて）MITライセンス等、ご自由に設定してください。
現在は特定のOSSライセンス未設定です。
