const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});
const path = require('path');
const Game = require('./Game');

app.use(express.static(path.join(__dirname, '../public')));

const game = new Game();

io.on('connection', (socket) => {
    let ip = socket.handshake.address.replace('::ffff:', '');
    if(ip === '1') ip = '127.0.0.1';
    
    console.log('Connected:', ip);
    
    socket.emit('init', { 
        id: socket.id, 
        width: game.mapWidth, 
        height: game.mapHeight,
        obstacles: game.obstacles 
    });

    socket.on('joinGame', (data) => {
        if (game.players[socket.id]) game.removePlayer(socket.id);
        // === V11.0: 传入 device ===
        game.addPlayer(socket.id, ip, data.type, data.name, data.device);
    });

    socket.on('input', (data) => {
        game.handleInput(socket.id, data);
    });
    
    socket.on('ping_check', (clientTime) => {
        socket.emit('pong_check', clientTime);
    });

    socket.on('report_latency', (latency) => {
        if (game.players[socket.id]) {
            game.players[socket.id].latency = latency;
        }
    });

    socket.on('disconnect', () => {
        game.removePlayer(socket.id);
    });
});

const TICK_RATE = 60; 
const BROADCAST_RATE = 30; 
let tickCount = 0;

setInterval(() => {
    game.update();
    tickCount++;
    if (tickCount % (TICK_RATE / BROADCAST_RATE) === 0) {
        io.emit('state', game.getPackedState());
    }
}, 1000 / TICK_RATE);

http.listen(3000, () => {
    console.log('Server running on 3000');
});
