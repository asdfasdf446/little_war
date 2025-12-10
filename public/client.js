const socket = io({
    transports: ['websocket'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
});
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiHealth = document.getElementById('health-bar');
const uiScore = document.getElementById('scoreboard');
const uiRespawn = document.getElementById('respawn-msg');
const loginScreen = document.getElementById('login-screen');
const mobileHint = document.getElementById('mobile-hint');
const nameInput = document.getElementById('username-input');

if(localStorage.getItem('neon_username')) {
    nameInput.value = localStorage.getItem('neon_username');
}

window.onload = () => { if(typeof Assets !== 'undefined') Assets.init(); };

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
if(isMobile) mobileHint.style.display = 'block';

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let myId = null;
let mapSize = { w: 2000, h: 2000 };
let obstacles = [];
let players = {}; 
let serverPlayers = {}; 
let bullets = [];
let particles = [];
let myLatency = 0;

const input = { up: false, down: false, left: false, right: false, shoot: false, skill: false, angle: 0 };
const mouse = { x: 0, y: 0 };
let camera = { x: 0, y: 0 };
const BASE_SPEEDS = { 'RIFLE': 5, 'SNIPER': 3, 'SHOTGUN': 4.5 };

window.joinGame = function(type) {
    let name = nameInput.value.trim();
    if(!name) name = "NO_NAME";
    localStorage.setItem('neon_username', name);

    const deviceType = isMobile ? 'MOBILE' : 'PC';
    socket.emit('joinGame', { type: type, name: name, device: deviceType });
    loginScreen.style.display = 'none';
};

socket.on('init', (data) => {
    myId = data.id;
    mapSize.w = data.width;
    mapSize.h = data.height;
    obstacles = data.obstacles;
});

socket.on('state', (state) => {
    serverPlayers = state.players;
    bullets = state.bullets;
    if (typeof updateScoreboard === 'function') updateScoreboard(state.players);
});

setInterval(() => {
    socket.emit('ping_check', Date.now());
}, 1000);

socket.on('pong_check', (sentTime) => {
    const latency = Date.now() - sentTime;
    myLatency = latency;
    socket.emit('report_latency', latency);
});

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
}

if (isMobile) {
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    const joystickZone = document.getElementById('joystick-zone');
    let joystickCenter = { x: 0, y: 0 };
    let touchId = null;

    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        const touch = e.changedTouches[0];
        touchId = touch.identifier;
        const rect = joystickBase.getBoundingClientRect();
        joystickCenter = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
        updateJoystick(touch);
    }, {passive: false});

    joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === touchId) {
                updateJoystick(e.changedTouches[i]);
                break;
            }
        }
    }, {passive: false});

    const resetJoystick = () => {
        touchId = null;
        joystickStick.style.transform = `translate(0px, 0px)`;
        input.up = input.down = input.left = input.right = false;
    };
    joystickZone.addEventListener('touchend', resetJoystick);
    joystickZone.addEventListener('touchcancel', resetJoystick);

    function updateJoystick(touch) {
        const dx = touch.clientX - joystickCenter.x;
        const dy = touch.clientY - joystickCenter.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.min(Math.sqrt(dx*dx + dy*dy), 30);
        joystickStick.style.transform = `translate(${Math.cos(angle)*distance}px, ${Math.sin(angle)*distance}px)`;
        input.angle = angle;
        input.up = dy < -10; input.down = dy > 10; input.left = dx < -10; input.right = dx > 10;
    }

    const bindButton = (btn, inputKey) => {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); input[inputKey] = true; }, {passive: false});
        btn.addEventListener('touchend', (e) => { e.preventDefault(); input[inputKey] = false; }, {passive: false});
    };
    bindButton(document.getElementById('btn-shoot'), 'shoot');
    bindButton(document.getElementById('btn-skill'), 'skill');
}

setInterval(() => {
    if(!myId) return;
    if (!isMobile) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        input.angle = Math.atan2(mouse.y - cy, mouse.x - cx);
    }
    socket.emit('input', input);
}, 1000 / 30);

function lerp(start, end, t) { return start * (1 - t) + end * t; }

function checkCollision(x, y) {
    for(let obs of obstacles) {
        if (x > obs.x && x < obs.x + obs.w && y > obs.y && y < obs.y + obs.h) return true;
    }
    return false;
}

class Particle {
    constructor(x, y, color, speed, lifeDecay) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 3 + 2;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.life = 1.0;
        this.decay = lifeDecay || 0.05;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; }
    draw(ctx) {
        ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function isImgReady(img) { return img && img.complete && img.naturalWidth !== 0; }

function render() {
    for (let id in serverPlayers) {
        let sP = serverPlayers[id];
        if (id === myId) continue; 
        if (!players[id]) {
            players[id] = sP;
        } else {
            players[id].x = lerp(players[id].x, sP.x, 0.05);
            players[id].y = lerp(players[id].y, sP.y, 0.05);
            players[id].angle = lerp(players[id].angle, sP.angle, 0.1);
            players[id].hp = sP.hp;
            players[id].dead = sP.dead;
            players[id].color = sP.color;
            players[id].type = sP.type;
            players[id].kills = sP.kills;
            players[id].deaths = sP.deaths;
            players[id].latency = sP.latency;
            players[id].speedMultiplier = sP.speedMultiplier;
            players[id].isInvisible = sP.isInvisible;
            players[id].isInvulnerable = sP.isInvulnerable;
            players[id].name = sP.name; 
            players[id].device = sP.device; 
        }
    }

    if (myId && serverPlayers[myId]) {
        let sMe = serverPlayers[myId];
        if (!players[myId]) {
            players[myId] = sMe;
        } else {
            let me = players[myId];
            me.hp = sMe.hp;
            me.dead = sMe.dead;
            me.color = sMe.color;
            me.type = sMe.type;
            me.kills = sMe.kills;
            me.deaths = sMe.deaths;
            me.latency = sMe.latency;
            me.speedMultiplier = sMe.speedMultiplier;
            me.isInvisible = sMe.isInvisible;
            me.isInvulnerable = sMe.isInvulnerable;
            me.name = sMe.name; 
            me.device = sMe.device;

            if (!me.dead) {
                let speed = (BASE_SPEEDS[me.type] || 5) * (me.speedMultiplier || 1);
                let nextX = me.x;
                let nextY = me.y;

                if (input.up) nextY -= speed;
                if (input.down) nextY += speed;
                if (input.left) nextX -= speed;
                if (input.right) nextX += speed;

                nextX = Math.max(0, Math.min(mapSize.w, nextX));
                nextY = Math.max(0, Math.min(mapSize.h, nextY));
                
                if (!checkCollision(nextX, me.y)) me.x = nextX;
                if (!checkCollision(me.x, nextY)) me.y = nextY;
                me.angle = input.angle;
            }

            const dist = Math.sqrt(Math.pow(me.x - sMe.x, 2) + Math.pow(me.y - sMe.y, 2));
            if (dist > 100) {
                me.x = sMe.x; me.y = sMe.y;
            } else if (dist > 10) {
                me.x = lerp(me.x, sMe.x, 0.05);
                me.y = lerp(me.y, sMe.y, 0.05);
            }
        }
    }

    for (let id in players) { if (!serverPlayers[id]) delete players[id]; }

    if (myId && players[myId]) {
        const me = players[myId];
        camera.x = lerp(camera.x, me.x - canvas.width / 2, 0.1);
        camera.y = lerp(camera.y, me.y - canvas.height / 2, 0.1);
        
        uiHealth.style.width = me.hp + '%';
        uiHealth.style.backgroundColor = me.hp < 30 ? 'red' : '#00ff00';
        uiRespawn.style.display = me.dead ? 'block' : 'none';
        if(me.dead) uiRespawn.innerText = "重新部署中...";
    }

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    if (typeof Assets !== 'undefined' && isImgReady(Assets.images.floor)) {
        const TILE_SIZE = 100;
        const startCol = Math.floor(camera.x / TILE_SIZE);
        const endCol = startCol + (canvas.width / TILE_SIZE) + 1;
        const startRow = Math.floor(camera.y / TILE_SIZE);
        const endRow = startRow + (canvas.height / TILE_SIZE) + 1;
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                if (c >= 0 && c * TILE_SIZE < mapSize.w && r >= 0 && r * TILE_SIZE < mapSize.h) {
                    ctx.drawImage(Assets.images.floor, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    } else {
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath();
        for(let x=0; x<=mapSize.w; x+=100) { ctx.moveTo(x, 0); ctx.lineTo(x, mapSize.h); }
        for(let y=0; y<=mapSize.h; y+=100) { ctx.moveTo(0, y); ctx.lineTo(mapSize.w, y); }
        ctx.stroke();
    }

    obstacles.forEach(obs => {
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
        if(typeof Assets !== 'undefined' && isImgReady(Assets.images.crate)) {
            ctx.drawImage(Assets.images.crate, obs.x, obs.y, obs.w, obs.h);
        } else {
            ctx.fillStyle = '#112233'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2; ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        }
    });
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    for (let id in players) {
        let p = players[id];
        if (p.dead) continue;

        let alpha = 1.0;
        if (p.isInvisible) {
            alpha = (id === myId) ? 0.5 : 0.05; 
            if(Math.random() < 0.1) particles.push(new Particle(p.x, p.y, '#555', 2, 0.1));
        }
        ctx.globalAlpha = alpha;
        if (p.speedMultiplier > 1.5 && Math.random() < 0.5) {
            particles.push(new Particle(p.x, p.y, p.color, 0.5, 0.1));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.shadowColor = p.color; ctx.shadowBlur = 20; 
        ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill();

        let sprite = null;
        if (typeof Assets !== 'undefined') {
            if (p.type === 'SNIPER') sprite = Assets.images.sniper;
            else if (p.type === 'SHOTGUN') sprite = Assets.images.shotgun;
            else sprite = Assets.images.rifle;
        }
        if (isImgReady(sprite)) {
            ctx.drawImage(sprite, -32, -32, 64, 64);
        } else {
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(0, -4, 25, 8);
        }
        ctx.restore();

        if (p.isInvulnerable) {
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, Math.PI*2); ctx.stroke(); ctx.shadowBlur = 0;
        }

        if (!p.isInvisible || id === myId) {
            ctx.fillStyle = '#222'; ctx.fillRect(p.x - 20, p.y - 45, 40, 6);
            ctx.fillStyle = p.color; ctx.fillRect(p.x - 20, p.y - 45, 40 * (p.hp/100), 6);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(p.x - 20, p.y - 45, 40, 6);
            
            ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
            ctx.fillText(p.name || 'Unknown', p.x, p.y - 50);
        }
        ctx.globalAlpha = 1.0;
    }

    bullets.forEach(b => {
        ctx.shadowBlur = 10; ctx.shadowColor = b.color; ctx.fillStyle = b.color;
        ctx.save(); ctx.translate(b.x, b.y);
        if (b.type === 'sniper') { ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.fillRect(-15, -2, 30, 4); } 
        else if (b.type === 'shotgun') { ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill(); } 
        else { ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill(); }
        ctx.restore(); ctx.shadowBlur = 0;
        if(Math.random() < 0.2) particles.push(new Particle(b.x, b.y, b.color, 0.5));
    });

    for(let i=particles.length-1; i>=0; i--) {
        particles[i].update(); particles[i].draw(ctx);
        if(particles[i].life <= 0) particles.splice(i, 1);
    }
    ctx.restore();
    requestAnimationFrame(render);
}

// === V12.0: 战术表格生成 ===
function updateScoreboard(players) {
    let list = Object.values(players).sort((a,b) => b.kills - a.kills);
    
    let html = `
    <table class="tactical-table">
        <thead>
            <tr>
                <th class="col-rank">#</th>
                <th class="col-class">兵种</th>
                <th class="col-id">ID</th>
                <th class="col-dev">DEV</th>
                <th class="col-ip">IP</th>
                <th class="col-ping">PING</th>
                <th class="col-kd">K/D</th>
                <th class="col-skill">技能</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    list.forEach((p, index) => {
        let skillText = p.skillCdCurrent <= 0 ? '<span style="color:#0f0">RDY</span>' : `<span style="color:#555">${Math.ceil(p.skillCdCurrent/60)}</span>`;
        let typeName = p.type === 'RIFLE' ? '步' : (p.type === 'SNIPER' ? '狙' : '喷');
        let deviceIcon = p.device === 'MOBILE' ? '📱' : '💻';
        
        // PING 颜色
        let pingVal = p.latency || 0;
        let pingColor = pingVal < 100 ? '#0f0' : (pingVal < 200 ? '#fa0' : '#f00');
        // K/D
        let kdDisplay = `<span style="color:#0f0">${p.kills}</span>/<span style="color:#f44">${p.deaths}</span>`;

        let rowClass = (p.id === myId) ? 'my-row' : '';
        
        html += `
        <tr class="${rowClass}">
            <td class="col-rank">${index + 1}</td>
            <td class="col-class">${typeName}</td>
            <td class="col-id" style="color:${p.color}">${p.name}</td>
            <td class="col-dev">${deviceIcon}</td>
            <td class="col-ip">${p.ip}</td>
            <td class="col-ping" style="color:${pingColor}">${pingVal}</td>
            <td class="col-kd">${kdDisplay}</td>
            <td class="col-skill">${skillText}</td>
        </tr>
        `;
    });
    
    html += `</tbody></table>`;
    
    // 底部显示自己的延迟 (保留一个小条，作为快速参考)
    let myPingColor = myLatency < 100 ? '#0f0' : '#fa0';
    html += `<div style="text-align:right; padding:5px; font-size:10px; border-top:1px solid #446688; color:#88aacc">
        LATENCY: <span style="color:${myPingColor}">${myLatency}ms</span>
    </div>`;

    uiScore.innerHTML = html;
}

render();
