import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { WebSocketGateway } from './websocket/gateway.js';

const app = createApp();
const server = createServer(app);
const gateway = new WebSocketGateway();
gateway.attach(server);
app.set('gateway', gateway);

server.listen(config.port, () => {
  console.log(`[backend] CareSync API listening on :${config.port}`);
});
