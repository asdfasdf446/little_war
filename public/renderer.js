class Renderer {
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assets = assets;
        this.camera = { x: 0, y: 0 };
        this.particles = [];
        this.images = {};
        this.loadAssets();
    }

    loadAssets() {
        console.log("Loading assets from manifest...");
        for (let key in ASSET_MANIFEST) {
            const img = new Image();
            img.src = ASSET_MANIFEST[key].path;
            this.images[key] = img;
        }
    }

    isImgReady(key) { return this.images[key] && this.images[key].complete && this.images[key].naturalWidth !== 0; }

    addParticle(x, y, color) {
        this.particles.push({
            x, y, color, life: 1.0, 
            vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2 
        });
    }

    draw(players, zombies, bullets, obstacles, mapSize, myId) {
        const ctx = this.ctx;
        
        // 更新摄像机
        if(myId && players[myId]) {
            const me = players[myId];
            this.camera.x += (me.x - this.canvas.width/2 - this.camera.x) * 0.1;
            this.camera.y += (me.y - this.canvas.height/2 - this.camera.y) * 0.1;
        }

        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // 地面
        if (this.isImgReady('floor')) {
            const TILE = 100;
            const startCol = Math.floor(this.camera.x / TILE);
            const endCol = startCol + (this.canvas.width / TILE) + 1;
            const startRow = Math.floor(this.camera.y / TILE);
            const endRow = startRow + (this.canvas.height / TILE) + 1;
            for (let c = startCol; c <= endCol; c++) {
                for (let r = startRow; r <= endRow; r++) {
                    ctx.drawImage(this.images.floor, c * TILE, r * TILE, TILE, TILE);
                }
            }
        } else {
            ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath();
            ctx.strokeRect(0, 0, mapSize.w, mapSize.h); ctx.stroke();
        }

        // 障碍物
        obstacles.forEach(obs => {
            if(this.isImgReady('crate')) {
                ctx.drawImage(this.images.crate, obs.x, obs.y, obs.w, obs.h);
            } else {
                ctx.fillStyle = '#112233'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#00aaff'; ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
            }
        });

        // 丧尸
        for(let id in zombies) {
            let z = zombies[id];
            ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.angle);
            let isAggro = z.state !== 'WANDER';
            ctx.fillStyle = isAggro ? '#556b2f' : '#2e8b57';
            ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = isAggro ? '#f00' : '#ff0';
            ctx.beginPath(); ctx.arc(10, -6, 3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, 6, 3, 0, Math.PI*2); ctx.fill();
            if(isAggro) {
                ctx.save(); ctx.rotate(-z.angle); ctx.fillStyle = 'red'; 
                ctx.font = 'bold 20px Arial'; ctx.fillText('!', 0, -25); ctx.restore();
            }
            ctx.fillStyle = 'red'; ctx.fillRect(-15, -30, 30, 4);
            ctx.fillStyle = '#0f0'; ctx.fillRect(-15, -30, 30 * (z.hp/z.maxHp), 4);
            ctx.restore();
        }

        // 玩家
        for(let id in players) {
            let p = players[id];
            if(p.dead) continue;
            let alpha = p.isInvisible ? (id === myId ? 0.5 : 0.05) : 1.0;
            ctx.globalAlpha = alpha;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
            
            let sprite = this.images[p.type.toLowerCase()];
            if (this.isImgReady(p.type.toLowerCase())) {
                ctx.drawImage(sprite, -32, -32, 64, 64);
            } else {
                ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.fillRect(0, -4, 25, 8);
            }
            ctx.restore();
            
            if(p.isInvulnerable) { ctx.strokeStyle = 'gold'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, Math.PI*2); ctx.stroke(); }
            if(!p.isInvisible || id === myId) {
                ctx.fillStyle = '#222'; ctx.fillRect(p.x - 20, p.y - 45, 40, 6);
                ctx.fillStyle = p.color; ctx.fillRect(p.x - 20, p.y - 45, 40 * (p.hp/100), 6);
                ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText(p.name, p.x, p.y - 50);
            }
            ctx.globalAlpha = 1.0;
        }

        // 子弹
        bullets.forEach(b => {
            ctx.fillStyle = b.color; ctx.save(); ctx.translate(b.x, b.y);
            if(b.type === 'sniper') { ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.fillRect(-15,-2,30,4); }
            else { ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill(); }
            ctx.restore();
            if(Math.random()<0.2) this.addParticle(b.x, b.y, b.color);
        });

        // 粒子
        for(let i=this.particles.length-1; i>=0; i--) {
            let pt = this.particles[i];
            pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05;
            ctx.globalAlpha = pt.life; ctx.fillStyle = pt.color;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI*2); ctx.fill();
            if(pt.life <= 0) this.particles.splice(i, 1);
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}
