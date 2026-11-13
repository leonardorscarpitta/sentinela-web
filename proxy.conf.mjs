// Proxy do ng serve: /api → sentinela-api. Mesmo origin no navegador, então não há CORS nem token em outra origem.
// API_PROXY_TARGET muda o destino (padrão: a API publicada na máquina host, API_PORT=18080 da sentinela-api).
const target = process.env.API_PROXY_TARGET || 'http://host.docker.internal:18080';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
};
