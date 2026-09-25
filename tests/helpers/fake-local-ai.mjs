import { createServer } from 'node:http';

createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request.url === '/health') return response.end(JSON.stringify({ state: 'service_ready', model_state: 'service_ready' }));
  if (request.url === '/v1/local/analyze') return response.end(JSON.stringify({ state: 'service_ready', result: { summary: '代理链路返回的端侧证据结论', signals: ['openvino-local-inference'] } }));
  response.statusCode = 404;
  response.end(JSON.stringify({ state: 'not_found' }));
}).listen(8787, '127.0.0.1', () => console.log('fake-local-ai-ready'));
