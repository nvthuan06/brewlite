# Node 24 LTS supports the NestJS/Vitest dependencies in this repository.
FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=development
EXPOSE 3001
CMD ["npm", "run", "dev"]
