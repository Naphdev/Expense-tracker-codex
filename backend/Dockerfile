FROM node:20-alpine
RUN apk add --no-cache font-noto-thai
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
