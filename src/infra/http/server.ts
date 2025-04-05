import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';

const server = fastify();

server.register(fastifyCors, {
  origin: '*',
});

server.listen({ port : 3333, host: '0.0.0.0'}).then(() => {
  console.log('HTTP server running on http://localhost:3333');
});