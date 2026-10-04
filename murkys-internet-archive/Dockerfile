FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

ENV PORT=8099
ENV DATA_DIR=/data

EXPOSE 8099

VOLUME ["/data"]

CMD ["node", "server.js"]
