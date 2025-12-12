const CONFIG = require('../config');

class Zombie {
    constructor(id, mapW, mapH) {
        this.id = id;
        this.mapW = mapW;
        this.mapH = mapH;
        
        const stats = CONFIG.ZOMBIE;
        this.hp = stats.HP;
        this.maxHp = stats.HP;
        this.damage = stats.DAMAGE;
        this.radius = stats.RADIUS;
        
        this.state = 'WANDER'; 
        this.targetId = null;
        this.visionRange = stats.VISION_RANGE; 
        
        // 边缘生成
        const edge = Math.floor(Math.random() * 4);
        if(edge === 0) { this.x = Math.random() * mapW; this.y = 0; }
        else if(edge === 1) { this.x = mapW; this.y = Math.random() * mapH; }
        else if(edge === 2) { this.x = Math.random() * mapW; this.y = mapH; }
        else { this.x = 0; this.y = Math.random() * mapH; }
        
        this.angle = Math.random() * Math.PI * 2;
        this.changeDirTimer = 0;
    }

    update(players, obstacles) {
        let currentSpeed = CONFIG.ZOMBIE.SPEED_WANDER;
        
        // 1. 索敌
        let minDist = this.visionRange;
        let target = null;

        // 检查旧目标
        if(this.targetId && players[this.targetId]) {
            const t = players[this.targetId];
            const dist = Math.sqrt((t.x - this.x)**2 + (t.y - this.y)**2);
            if(t.dead || t.isInvisible || dist > this.visionRange * 1.5) {
                this.targetId = null;
                this.state = 'WANDER';
            } else {
                target = t;
            }
        }

        // 寻找新目标
        if(!target) {
            for(let pid in players) {
                const p = players[pid];
                if(p.dead || p.isInvisible) continue;
                const dist = Math.sqrt((p.x - this.x)**2 + (p.y - this.y)**2);
                if(dist < minDist) {
                    minDist = dist;
                    target = p;
                    this.targetId = pid;
                }
            }
        }

        // 2. 状态机
        if(target) {
            this.state = 'CHASE';
            currentSpeed = CONFIG.ZOMBIE.SPEED_CHASE;
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            
            if(Math.sqrt((target.x - this.x)**2 + (target.y - this.y)**2) < 50) {
                this.state = 'ATTACK';
                currentSpeed *= 0.5; 
            }
        } else {
            this.state = 'WANDER';
            this.changeDirTimer--;
            if(this.changeDirTimer <= 0) {
                this.angle += (Math.random() - 0.5) * 2;
                this.changeDirTimer = 60 + Math.random() * 120;
            }
        }

        // 3. 移动
        const nextX = this.x + Math.cos(this.angle) * currentSpeed;
        const nextY = this.y + Math.sin(this.angle) * currentSpeed;
        
        if(nextX >= 0 && nextX <= this.mapW && !this.checkCollision(nextX, this.y, obstacles)) this.x = nextX;
        if(nextY >= 0 && nextY <= this.mapH && !this.checkCollision(this.x, nextY, obstacles)) this.y = nextY;
    }

    checkCollision(x, y, obstacles) {
        for(let obs of obstacles) {
            if (x > obs.x && x < obs.x + obs.w && y > obs.y && y < obs.y + obs.h) return true;
        }
        return false;
    }
}
module.exports = Zombie;
