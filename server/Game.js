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
                x: Math.random() * 1800,
                y: Math.random() * 1800,
                w: Math.random() * 150 + 50,
                h: Math.random() * 150 + 50
            });
        }
    }

    addPlayer(id, ip, type) {
        this.players[id] = new Player(id, ip, type);
    }

    removePlayer(id) {
        delete this.players[id];
    }

    handleInput(id, input) {
        const p = this.players[id];
        if (!p || p.dead) return;

        // --- 技能触发逻辑 ---
        if (input.skill && p.skillCdCurrent <= 0) {
            this.activateSkill(p);
        }

        // --- 技能状态更新 ---
        if (p.skillActiveTime > 0) {
            p.skillActiveTime--;
            // 技能结束时的清理
            if (p.skillActiveTime <= 0) {
                p.speedMultiplier = 1;
                p.isInvulnerable = false;
                p.isInvisible = false;
            }
        }
        if (p.skillCdCurrent > 0) p.skillCdCurrent--;

        // 计算实际速度
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
            // 狙击手开枪破隐
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
            case 'RIFLE': // 加速
                p.skillActiveTime = 180; // 3秒
                p.speedMultiplier = 2.0;
                break;
            case 'SNIPER': // 隐身
                p.skillActiveTime = 300; // 5秒
                p.isInvisible = true;
                break;
            case 'SHOTGUN': // 无敌
                p.skillActiveTime = 150; // 2.5秒
                p.isInvulnerable = true;
                break;
        }
    }

    fireBullet(p) {
        const count = p.type === 'SHOTGUN' ? 5 : 1;
        const spread = p.type === 'SHOTGUN' ? 0.3 : 0.05;
        
        // 定义子弹样式
        let bType = 'normal';
        if (p.type === 'SNIPER') bType = 'sniper';
        if (p.type === 'SHOTGUN') bType = 'shotgun';

        for(let i=0; i<count; i++) {
            const angleOffset = (Math.random() - 0.5) * spread;
            this.bullets.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(p.angle + angleOffset) * 15,
                vy: Math.sin(p.angle + angleOffset) * 15,
                damage: p.damage,
                range: p.range,
                traveled: 0,
                owner: p.id,
                color: p.color, // 子弹继承玩家颜色
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
                        
                        // 稍微调整命中半径
                        if (Math.sqrt(dx*dx + dy*dy) < p.radius + 5) {
                            // 如果无敌，则不扣血，但子弹还是会消失
                            if (!p.isInvulnerable) {
                                p.hp -= b.damage;
                            }
                            
                            remove = true;
                            
                            if (p.hp <= 0 && !p.dead) {
                                p.dead = true;
                                p.hp = 0;
                                if (this.players[b.owner]) this.players[b.owner].score += 100;
                                setTimeout(() => {
                                    if(this.players[pid]) {
                                        this.players[pid].dead = false;
                                        this.players[pid].hp = 100;
                                        this.players[pid].x = Math.random() * 1800;
                                        this.players[pid].y = Math.random() * 1800;
                                        // 复活重置状态
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

    getState() {
        return { players: this.players, bullets: this.bullets, obstacles: this.obstacles };
    }
}
module.exports = Game;
