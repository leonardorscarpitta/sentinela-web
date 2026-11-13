// Proxy do ng serve: /api → sentinela-api. Mesmo origin no navegador, então não há CORS nem token em outra origem.
// API_PROXY_TARGET muda o destino (padrão: o api-gateway da sentinela-api na rede sentinela-web-gateway).
const target = process.env.API_PROXY_TARGET || 'http://api-gateway:8080';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
};
