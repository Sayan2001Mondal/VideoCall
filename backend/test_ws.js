const WebSocket = require('ws');
const crypto = require('crypto');

const ws = new WebSocket('wss://sayanexpress.superfastmind.com/ws/test');

const roomId = 'testRoom123';
const peerId = crypto.randomUUID();
const name = 'TestBot';

ws.on('open', () => {
  console.log('Connected!');
  ws.send(JSON.stringify({ type: 'join', roomId, peerId, name }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received:', msg.type);
  
  if (msg.type === 'routerRtpCapabilities') {
    console.log('Got router caps, requesting producers...');
    ws.send(JSON.stringify({ type: 'getProducers', roomId, peerId }));
  }
  
  if (msg.type === 'existingProducers') {
    console.log('SUCCESS! Got existing producers:', msg.producers);
    process.exit(0);
  }
});

setTimeout(() => {
  console.log('Timeout. No existing producers received.');
  process.exit(1);
}, 5000);
