# Imagem de desenvolvimento: ng serve em modo debug (source maps, HMR).
FROM node:24-alpine

WORKDIR /app
ENV NG_CLI_ANALYTICS=false

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN mkdir -p .angular && chown node:node .angular

USER node
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "1000"]
