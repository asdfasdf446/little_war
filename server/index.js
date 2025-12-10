const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const Game = require('./Game');

app.use(express.static(path.join(__dirname, '../public')));

const game = new Game();

io.on('connection', (socket) => {
    let ip = socket.handshake.address.replace('::ffff:', '');
    console.log('Connected:', ip);
    
    // 初始化只发地图，不生成人
    socket.emit('init', { 
        id: socket.id, 
        width: game.mapWidth, 
        height: game.mapHeight,
        obstacles: game.obstacles 
    });

    // 监听加入游戏请求
    socket.on('joinGame', (type) => {
        if (game.players[socket.id]) game.removePlayer(socket.id);
        game.addPlayer(socket.id, ip, type);
    });

    socket.on('input', (data) => {
        game.handleInput(socket.id, data);
    });

    socket.on('disconnect', () => {
        game.removePlayer(socket.id);
    });
});

setInterval(() => {
    game.update();
    io.emit('state', game.getState());
}, 1000 / 60);

http.listen(3000, () => {
    console.log('Server running on 3000');
});
