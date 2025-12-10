const Player = require('./Player');

class Game {
    constructor() {
        this.players = {};
        this.bullets = [];
        this.obstacles = [];
        this.mapWidth = 2000;
        this.mapHeight = 2000;
        this.generateMap();
    }

    generateMap() {
        this.obstacles = [];
        for (let i = 0; i < 25; i++) {
            this.obstacles.push({
                x: Math.round(Math.random() * 1800),
                y: Math.round(Math.random() * 1800),
                w: Math.round(Math.random() * 150 + 50),
                h: Math.round(Math.random() * 150 + 50)
            });
        }
    }

    // === V11.0: 接收 device 参数 ===
    addPlayer(id, ip, type, name, device) {
        let cleanName = (name || '').trim().substring(0, 10); 
        if(!cleanName) cleanName = 'Soldier' + Math.floor(Math.random()*100);
        this.players[id] = new Player(id, ip, type, cleanName, device);
    }

    removePlayer(id) {
        delete this.players[id];
    }

    handleInput(id, input) {
        const p = this.players[id];
        if (!p || p.dead) return;

        if (input.skill && p.skillCdCurrent <= 0) this.activateSkill(p);
        if (p.skillActiveTime > 0) {
            p.skillActiveTime--;
            if (p.skillActiveTime <= 0) {
                p.speedMultiplier = 1;
                p.isInvulnerable = false;
                p.isInvisible = false;
            }
        }
        if (p.skillCdCurrent > 0) p.skillCdCurrent--;

        let moveSpeed = p.baseSpeed * p.speedMultiplier;
        if (input.up) p.y -= moveSpeed;
        if (input.down) p.y += moveSpeed;
        if (input.left) p.x -= moveSpeed;
        if (input.right) p.x += moveSpeed;
        p.angle = input.angle;

        p.x = Math.max(0, Math.min(this.mapWidth, p.x));
        p.y = Math.max(0, Math.min(this.mapHeight, p.y));

        this.obstacles.forEach(obs => {
            if (p.x > obs.x && p.x < obs.x + obs.w && p.y > obs.y && p.y < obs.y + obs.h) {
                if (input.up) p.y += moveSpeed;
                if (input.down) p.y -= moveSpeed;
                if (input.left) p.x += moveSpeed;
                if (input.right) p.x -= moveSpeed;
            }
        });

        if (input.shoot && p.currentCd <= 0) {
            this.fireBullet(p);
            if(p.type === 'SNIPER' && p.isInvisible) {
                p.isInvisible = false;
                p.skillActiveTime = 0;
            }
        }
        if (p.currentCd > 0) p.currentCd--;
    }

    activateSkill(p) {
        p.skillCdCurrent = p.skillCdMax;
        switch(p.type) {
            case 'RIFLE': p.skillActiveTime = 180; p.speedMultiplier = 2.0; break;
            case 'SNIPER': p.skillActiveTime = 300; p.isInvisible = true; break;
            case 'SHOTGUN': p.skillActiveTime = 150; p.isInvulnerable = true; break;
        }
    }

    fireBullet(p) {
        const count = p.type === 'SHOTGUN' ? 5 : 1;
        const spread = p.type === 'SHOTGUN' ? 0.3 : 0.05;
        let bType = p.type === 'SNIPER' ? 'sniper' : (p.type === 'SHOTGUN' ? 'shotgun' : 'normal');

        for(let i=0; i<count; i++) {
            const angleOffset = (Math.random() - 0.5) * spread;
            this.bullets.push({
                x: Math.round(p.x),
                y: Math.round(p.y),
                vx: Math.cos(p.angle + angleOffset) * 15,
                vy: Math.sin(p.angle + angleOffset) * 15,
                damage: p.damage,
                range: p.range,
                traveled: 0,
                owner: p.id,
                color: p.color,
                type: bType
            });
        }
        p.currentCd = p.cd;
    }

    update() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.traveled += 15;

            let remove = false;
            if (b.traveled > b.range) remove = true;
            this.obstacles.forEach(obs => {
                if (b.x > obs.x && b.x < obs.x + obs.w && b.y > obs.y && b.y < obs.y + obs.h) remove = true;
            });

            if (!remove) {
                for (let pid in this.players) {
                    let p = this.players[pid];
                    if (pid !== b.owner && !p.dead) {
                        const dx = p.x - b.x;
                        const dy = p.y - b.y;
                        if (Math.sqrt(dx*dx + dy*dy) < p.radius + 5) {
                            if (!p.isInvulnerable) p.hp -= b.damage;
                            remove = true;
                            if (p.hp <= 0 && !p.dead) {
                                p.dead = true;
                                p.hp = 0;
                                p.deaths++;
                                if (this.players[b.owner]) this.players[b.owner].kills++;
                                setTimeout(() => {
                                    if(this.players[pid]) {
                                        this.players[pid].dead = false;
                                        this.players[pid].hp = 100;
                                        this.players[pid].x = Math.round(Math.random() * 1800);
                                        this.players[pid].y = Math.round(Math.random() * 1800);
                                        this.players[pid].isInvulnerable = false;
                                        this.players[pid].isInvisible = false;
                                    }
                                }, 3000);
                            }
                            break;
                        }
                    }
                }
            }
            if (remove) this.bullets.splice(i, 1);
        }
    }

    getPackedState() {
        const packedPlayers = {};
        for(let id in this.players) {
            const p = this.players[id];
            packedPlayers[id] = {
                x: Math.round(p.x),
                y: Math.round(p.y),
                angle: parseFloat(p.angle.toFixed(2)),
                hp: p.hp,
                dead: p.dead,
                kills: p.kills,
                deaths: p.deaths,
                color: p.color,
                type: p.type,
                latency: p.latency,
                isInvisible: p.isInvisible,
                isInvulnerable: p.isInvulnerable,
                speedMultiplier: p.speedMultiplier,
                skillCdCurrent: p.skillCdCurrent,
                name: p.name,
                device: p.device // === V11.0: 打包设备信息 ===
            };
        }
        
        const packedBullets = this.bullets.map(b => ({
            x: Math.round(b.x),
            y: Math.round(b.y),
            color: b.color,
            type: b.type,
            vx: parseFloat(b.vx.toFixed(2)),
            vy: parseFloat(b.vy.toFixed(2))
        }));

        return { players: packedPlayers, bullets: packedBullets };
    }
}
module.exports = Game;
