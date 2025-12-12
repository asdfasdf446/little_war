const Player = require('./entities/Player');
const Zombie = require('./entities/Zombie');
const CONFIG = require('./config');

class Game {
    constructor() {
        this.players = {};
        this.zombies = {};
        this.zombieIdCounter = 0;
        this.bullets = [];
        this.obstacles = [];
        this.generateMap();
    }

    generateMap() {
        this.obstacles = [];
        for (let i = 0; i < CONFIG.MAP.OBSTACLE_COUNT; i++) {
            this.obstacles.push({
                x: Math.round(Math.random() * (CONFIG.MAP.WIDTH - 200)),
                y: Math.round(Math.random() * (CONFIG.MAP.HEIGHT - 200)),
                w: Math.round(Math.random() * 150 + 50),
                h: Math.round(Math.random() * 150 + 50)
            });
        }
    }

    addPlayer(id, ip, type, name, device) {
        let cleanName = (name || '').trim().substring(0, 10); 
        if(!cleanName) cleanName = 'Soldier' + Math.floor(Math.random()*100);
        this.players[id] = new Player(id, ip, type, cleanName, device);
    }

    removePlayer(id) { delete this.players[id]; }

    handleInput(id, input) {
        const p = this.players[id];
        if (!p || p.dead) return;
        p.inputs = input;
        if(input.shoot && p.isInvisible) {
             p.isInvisible = false;
             p.skillActiveTime = 0;
        }
    }

    spawnZombie() {
        if(Object.keys(this.zombies).length >= CONFIG.ZOMBIE.MAX_COUNT) return; 
        this.zombieIdCounter++;
        const id = 'z_' + this.zombieIdCounter;
        this.zombies[id] = new Zombie(id, CONFIG.MAP.WIDTH, CONFIG.MAP.HEIGHT);
    }

    // === 核心循环 ===
    update() {
        // 1. 刷怪
        if(Math.random() < CONFIG.GAME_LOOP.ZOMBIE_SPAWN_RATE) this.spawnZombie();

        // 2. 玩家逻辑
        for(let id in this.players) {
            const p = this.players[id];
            if(!p.dead) this.updatePlayer(p);
        }

        // 3. 丧尸逻辑
        for(let id in this.zombies) {
            const z = this.zombies[id];
            z.update(this.players, this.obstacles);
            this.checkZombiePlayerCollision(z);
        }

        // 4. 子弹逻辑
        this.updateBullets();
    }

    updatePlayer(p) {
        const input = p.inputs;
        
        // 技能
        if (input.skill && p.skillCdCurrent <= 0) {
            p.skillCdCurrent = p.skillCdMax;
            if(p.type === 'RIFLE') { p.skillActiveTime = p.skillDurationMax; p.speedMultiplier = 2.0; }
            if(p.type === 'SNIPER') { p.skillActiveTime = p.skillDurationMax; p.isInvisible = true; }
            if(p.type === 'SHOTGUN') { p.skillActiveTime = p.skillDurationMax; p.isInvulnerable = true; }
        }
        
        // 技能计时
        if (p.skillActiveTime > 0) {
            p.skillActiveTime--;
            if (p.skillActiveTime <= 0) {
                p.speedMultiplier = 1;
                p.isInvulnerable = false;
                p.isInvisible = false;
            }
        }
        if (p.skillCdCurrent > 0) p.skillCdCurrent--;

        // 移动
        let moveSpeed = p.baseSpeed * p.speedMultiplier;
        let nextX = p.x;
        let nextY = p.y;
        if (input.up) nextY -= moveSpeed;
        if (input.down) nextY += moveSpeed;
        if (input.left) nextX -= moveSpeed;
        if (input.right) nextX += moveSpeed;

        nextX = Math.max(0, Math.min(CONFIG.MAP.WIDTH, nextX));
        nextY = Math.max(0, Math.min(CONFIG.MAP.HEIGHT, nextY));

        if (!this.checkCollision(nextX, p.y)) p.x = nextX;
        if (!this.checkCollision(p.x, nextY)) p.y = nextY;

        // 自动射击
        this.handleAutoCombat(p);
        if (p.currentCd > 0) p.currentCd--;
    }

    handleAutoCombat(p) {
        if(p.isInvisible) return; // 隐身不自动打

        let closestTarget = null;
        let minDist = p.range;

        // 找人
        for(let id in this.players) {
            if(id === p.id) continue;
            const other = this.players[id];
            if(other.dead || other.isInvisible) continue;
            const dist = Math.sqrt((p.x - other.x)**2 + (p.y - other.y)**2);
            if(dist < minDist) { minDist = dist; closestTarget = other; }
        }
        // 找僵尸
        for(let id in this.zombies) {
            const z = this.zombies[id];
            const dist = Math.sqrt((p.x - z.x)**2 + (p.y - z.y)**2);
            if(dist < minDist) { minDist = dist; closestTarget = z; }
        }

        if(closestTarget) {
            p.angle = Math.atan2(closestTarget.y - p.y, closestTarget.x - p.x);
            if(p.currentCd <= 0) this.fireBullet(p);
        }
    }

    fireBullet(p) {
        const count = p.type === 'SHOTGUN' ? 5 : 1;
        const spread = p.type === 'SHOTGUN' ? 0.3 : 0.05;
        let bType = p.type === 'SNIPER' ? 'sniper' : (p.type === 'SHOTGUN' ? 'shotgun' : 'normal');

        for(let i=0; i<count; i++) {
            const angleOffset = (Math.random() - 0.5) * spread;
            this.bullets.push({
                x: Math.round(p.x), y: Math.round(p.y),
                vx: Math.cos(p.angle + angleOffset) * 15,
                vy: Math.sin(p.angle + angleOffset) * 15,
                damage: p.damage, range: p.range,
                traveled: 0, owner: p.id, color: p.color, type: bType
            });
        }
        p.currentCd = p.cd;
    }

    checkCollision(x, y) {
        for(let obs of this.obstacles) {
            if (x > obs.x && x < obs.x + obs.w && y > obs.y && y < obs.y + obs.h) return true;
        }
        return false;
    }

    checkZombiePlayerCollision(z) {
        for(let pid in this.players) {
            const p = this.players[pid];
            if(p.dead) continue;
            const dist = Math.sqrt((p.x - z.x)**2 + (p.y - z.y)**2);
            if(dist < z.radius + p.radius) {
                if(!p.isInvulnerable) p.hp -= z.damage;
                if(p.hp <= 0 && !p.dead) this.killPlayer(p, null);
            }
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx; b.y += b.vy; b.traveled += 15;
            let remove = false;

            if (b.traveled > b.range) remove = true;
            if (this.checkCollision(b.x, b.y)) remove = true;

            if (!remove) {
                // 打人
                for (let pid in this.players) {
                    let p = this.players[pid];
                    if (pid !== b.owner && !p.dead) {
                        if (Math.sqrt((p.x - b.x)**2 + (p.y - b.y)**2) < p.radius + 5) {
                            if (!p.isInvulnerable) p.hp -= b.damage;
                            remove = true;
                            if (p.hp <= 0 && !p.dead) this.killPlayer(p, b.owner);
                            break;
                        }
                    }
                }
            }
            if (!remove) {
                // 打僵尸
                for(let zid in this.zombies) {
                    let z = this.zombies[zid];
                    if(Math.sqrt((z.x - b.x)**2 + (z.y - b.y)**2) < z.radius + 5) {
                        z.hp -= b.damage;
                        remove = true;
                        if(z.hp <= 0) delete this.zombies[zid];
                        break;
                    }
                }
            }
            if (remove) this.bullets.splice(i, 1);
        }
    }

    killPlayer(p, killerId) {
        p.dead = true;
        p.hp = 0;
        p.deaths++;
        if (killerId && this.players[killerId]) this.players[killerId].kills++;
        setTimeout(() => { if(this.players[p.id]) this.players[p.id].reset(); }, 3000);
    }

    getPackedState() {
        const packedPlayers = {};
        for(let id in this.players) {
            const p = this.players[id];
            packedPlayers[id] = {
                x: Math.round(p.x), y: Math.round(p.y), angle: parseFloat(p.angle.toFixed(2)),
                hp: Math.round(p.hp), dead: p.dead, kills: p.kills, deaths: p.deaths,
                color: p.color, type: p.type, latency: p.latency,
                isInvisible: p.isInvisible, isInvulnerable: p.isInvulnerable,
                speedMultiplier: p.speedMultiplier, skillCdCurrent: p.skillCdCurrent,
                name: p.name, device: p.device, ip: p.ip
            };
        }
        const packedZombies = {};
        for(let id in this.zombies) {
            const z = this.zombies[id];
            packedZombies[id] = {
                x: Math.round(z.x), y: Math.round(z.y), angle: parseFloat(z.angle.toFixed(2)),
                hp: z.hp, maxHp: z.maxHp, state: z.state
            };
        }
        const packedBullets = this.bullets.map(b => ({
            x: Math.round(b.x), y: Math.round(b.y), color: b.color, type: b.type,
            vx: parseFloat(b.vx.toFixed(2)), vy: parseFloat(b.vy.toFixed(2))
        }));
        return { players: packedPlayers, zombies: packedZombies, bullets: packedBullets };
    }
}
module.exports = Game;
