FROM node:18

RUN apt-get update && \
    apt-get install -y ffmpeg libvips libvips-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
