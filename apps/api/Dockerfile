FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "start:dev", "--", "--hostname", "0.0.0.0"]
