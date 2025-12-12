const socket = io({ transports: ['websocket'] });
const canvas = document.getElementById('gameCanvas');
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 初始化模块
const renderer = new Renderer(canvas, ASSET_MANIFEST);
UI.init();
if(isMobile) document.getElementById('mobile-hint').style.display = 'block';

// 游戏状态
let myId = null;
let mapSize = { w: 2000, h: 2000 };
let obstacles = [];
let players = {};
let serverPlayers = {};
let zombies = {};
let bullets = [];
let input = { up: false, down: false, left: false, right: false, shoot: false, skill: false, angle: 0 };
let mouse = { x: 0, y: 0 };

// === 网络事件 ===
window.joinGame = function(type) {
    let name = document.getElementById('username-input').value.trim() || "NO_NAME";
    localStorage.setItem('neon_username', name);
    socket.emit('joinGame', { type, name, device: isMobile ? 'MOBILE' : 'PC' });
    UI.hideLogin();
};

socket.on('init', (data) => {
    myId = data.id;
    mapSize.w = data.width;
    mapSize.h = data.height;
    obstacles = data.obstacles;
});

socket.on('state', (state) => {
    serverPlayers = state.players;
    zombies = state.zombies;
    bullets = state.bullets;
    UI.updateScoreboard(state.players, myId, 0, Object.keys(state.zombies).length);
});

socket.on('pong_check', (sentTime) => socket.emit('report_latency', Date.now() - sentTime));
setInterval(() => socket.emit('ping_check', Date.now()), 1000);

// === 输入控制 ===
if (!isMobile) {
    const updateKey = (code, val) => {
        if(code === 'KeyW') input.up = val;
        if(code === 'KeyS') input.down = val;
        if(code === 'KeyA') input.left = val;
        if(code === 'KeyD') input.right = val;
        if(code === 'Space') input.skill = val;
    };
    window.addEventListener('keydown', e => updateKey(e.code, true));
    window.addEventListener('keyup', e => updateKey(e.code, false));
    window.addEventListener('mousedown', () => input.shoot = true);
    window.addEventListener('mouseup', () => input.shoot = false);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
} else {
    // 手机摇杆逻辑 (简化版)
    const stick = document.getElementById('joystick-stick');
    const zone = document.getElementById('joystick-zone');
    let center = {x:0, y:0};
    zone.addEventListener('touchstart', e => {
        const rect = document.getElementById('joystick-base').getBoundingClientRect();
        center = {x: rect.left+50, y: rect.top+50};
    });
    zone.addEventListener('touchmove', e => {
        const touch = e.touches[0];
        const dx = touch.clientX - center.x;
        const dy = touch.clientY - center.y;
        input.angle = Math.atan2(dy, dx);
        input.up = dy < -10; input.down = dy > 10;
        input.left = dx < -10; input.right = dx > 10;
        stick.style.transform = `translate(${Math.cos(input.angle)*20}px, ${Math.sin(input.angle)*20}px)`;
    });
    document.getElementById('btn-skill').addEventListener('touchstart', (e) => { e.preventDefault(); input.skill=true; });
    document.getElementById('btn-skill').addEventListener('touchend', (e) => { e.preventDefault(); input.skill=false; });
    document.getElementById('btn-shoot').addEventListener('touchstart', (e) => { e.preventDefault(); input.shoot=true; });
    document.getElementById('btn-shoot').addEventListener('touchend', (e) => { e.preventDefault(); input.shoot=false; });
}

setInterval(() => {
    if(!myId) return;
    if(!isMobile) input.angle = Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);
    socket.emit('input', input);
}, 1000/30);

// === 渲染循环 ===
function lerp(start, end, t) { return start * (1 - t) + end * t; }

function loop() {
    // 插值处理
    for (let id in serverPlayers) {
        let sP = serverPlayers[id];
        if (!players[id]) players[id] = sP;
        else {
            players[id].x = lerp(players[id].x, sP.x, 0.1);
            players[id].y = lerp(players[id].y, sP.y, 0.1);
            players[id].angle = lerp(players[id].angle, sP.angle, 0.2);
            Object.assign(players[id], sP); // 同步其他属性
        }
    }
    for(let id in players) if(!serverPlayers[id]) delete players[id];

    if(myId && players[myId]) UI.updateHealth(players[myId].hp);

    renderer.draw(players, zombies, bullets, obstacles, mapSize, myId);
    requestAnimationFrame(loop);
}
loop();
