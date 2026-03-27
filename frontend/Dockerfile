FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Building the app for production isn't needed here if we only want to run dev server
# but standard practice is CMD npm run dev --host for dev environments in compose
EXPOSE 5173

CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0"]
