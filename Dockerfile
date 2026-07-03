# Hunter Foreman public demo container
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install || true

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
