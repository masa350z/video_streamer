# Node公式イメージ (Debianベース) を使用
FROM node:18

# ffmpeg をインストール
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを指定
WORKDIR /usr/src/app

# package.json と package-lock.json を先にコピーして npm install
COPY package*.json ./
RUN npm install

# プロジェクトのソースコードすべてをコピー
COPY . .

# コンテナが起動したらサーバーを起動
EXPOSE 3000
CMD ["npm", "start"]
