FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 ffmpeg curl ca-certificates

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

COPY package*.json ./

ENV NODE_ENV=production
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p downloads && chmod 755 downloads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]