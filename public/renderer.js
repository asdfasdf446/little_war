class Renderer {
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assets = assets;
        this.camera = { x: 0, y: 0 };
        this.particles = [];
        this.images = {};
        this.animState = {}; 
        this.loadAssets();
    }

    loadAssets() {
        console.log("Loading assets...");
        for (let key in ASSET_MANIFEST) {
            const img = new Image();
            img.src = ASSET_MANIFEST[key].path;
            img.onerror = () => console.warn(`[Asset Missing] ${key} - Using fallback.`);
            this.images[key] = img;
        }
    }

    isImgReady(key) { 
        return this.images[key] && this.images[key].complete && this.images[key].naturalWidth !== 0; 
    }

    drawSprite(assetKey, frameIndex, x, y, rotation, scale = 1.0) {
        if (!this.isImgReady(assetKey)) return false;

        const img = this.images[assetKey];
        const config = ASSET_MANIFEST[assetKey];
        const totalFrames = config?.frames || 1;
        
        // 虽然外部已经取模了，这里保留取模作为双重保险
        const currentFrame = Math.floor(frameIndex) % totalFrames;
        const frameWidth = img.width / totalFrames;
        const frameHeight = img.height;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        this.ctx.scale(scale, scale);
        
        this.ctx.drawImage(
            img,
            currentFrame * frameWidth, 0, frameWidth, frameHeight, 
            -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight 
        );
        this.ctx.restore();
        return true; 
    }

    drawFallbackCharacter(p, x, y, torsoRotation, legRotation, legFrame, color, isZombie) {
        const ctx = this.ctx;

        // 1. 腿部
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(legRotation);
        ctx.fillStyle = '#444'; ctx.fillRect(-12, -12, 24, 24); 
        ctx.fillStyle = '#888'; ctx.beginPath(); ctx.moveTo(12, -5); ctx.lineTo(20, 0); ctx.lineTo(12, 5); ctx.fill();
        ctx.restore();

        // 2. 身体
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(torsoRotation);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isZombie ? '#ff0000' : '#ffffff';
        if(isZombie) {
            ctx.beginPath(); ctx.arc(15, -10, 5, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.arc(15, 10, 5, 0, Math.PI*2); ctx.fill();  
        } else {
            ctx.fillRect(0, -3, 30, 6); 
        }
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();

        // 3. === 调试修复：现在显示的数字会在 0 ~ MaxFrame 之间循环 ===
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        // 显示 F: 当前帧 / 总帧数
        // 获取预设的总帧数，如果没图则默认为8
        const typePrefix = (isZombie ? 'zombie' : p.type).toLowerCase();
        const maxFrames = ASSET_MANIFEST[typePrefix + '_legs']?.frames || 8;
        ctx.fillText(`F: ${Math.floor(legFrame)} / ${maxFrames}`, x, y + 5);
    }

    drawFallbackObstacle(obs) {
        const ctx = this.ctx;
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#34495e'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.rect(obs.x, obs.y, obs.w, obs.h);
        ctx.moveTo(obs.x, obs.y); ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
        ctx.moveTo(obs.x + obs.w, obs.y); ctx.lineTo(obs.x, obs.y + obs.h);
        ctx.stroke();
        ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2; ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    }

    drawFallbackFloor(width, height) {
        const ctx = this.ctx;
        const gridSize = 100;
        
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath();
        for(let x=0; x<=width; x+=gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for(let y=0; y<=height; y+=gridSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        // 边界高亮：白色粗框
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, width, height);
    }

    drawCharacter(p, type, isZombie) {
        if (!this.animState[p.id]) {
            this.animState[p.id] = { legFrame: 0, torsoFrame: 0, lastX: p.x, lastY: p.y, legAngle: 0 };
        }
        const anim = this.animState[p.id];

        const dx = p.x - anim.lastX;
        const dy = p.y - anim.lastY;
        const speed = Math.sqrt(dx*dx + dy*dy);
        const isMoving = speed > 0.1;
        anim.lastX = p.x;
        anim.lastY = p.y;

        if (isMoving) {
            const targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - anim.legAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            anim.legAngle += diff * 0.2;
        }

        const prefix = type.toLowerCase();
        
        // === 动画逻辑修正 ===
        const legKey = prefix + '_legs';
        const config = ASSET_MANIFEST[legKey];
        // 如果找不到配置，默认8帧（用于替补模式调试）
        const totalFrames = config?.frames || 8; 

        if (isMoving) {
            anim.legFrame += (config?.speed || 0.2) * (speed * 0.5);
            
            // === 核心修复：在这里取模，防止数字无限变大 ===
            // 我们保留浮点数部分以维持动画平滑度
            if (anim.legFrame >= totalFrames) {
                anim.legFrame = anim.legFrame % totalFrames;
            }
        } else {
            anim.legFrame = 0;
        }

        let legsDrawn = this.drawSprite(legKey, anim.legFrame, p.x, p.y, anim.legAngle);
        
        const torsoKey = prefix + '_torso';
        const torsoDrawn = this.drawSprite(torsoKey, anim.torsoFrame, p.x, p.y, p.angle);

        // 如果身体没画出来，启用替补并显示调试数字
        if (!torsoDrawn) {
            let color = isZombie ? (p.state !== 'WANDER' ? '#556b2f' : '#2e8b57') : p.color;
            this.drawFallbackCharacter(p, p.x, p.y, p.angle, anim.legAngle, anim.legFrame, color, isZombie);
        }
    }

    addParticle(x, y, color) {
        this.particles.push({
            x, y, color, life: 1.0, 
            vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3 
        });
    }

    draw(players, zombies, bullets, obstacles, mapSize, myId) {
        const ctx = this.ctx;
        
        if(myId && players[myId]) {
            const me = players[myId];
            this.camera.x += (me.x - this.canvas.width/2 - this.camera.x) * 0.1;
            this.camera.y += (me.y - this.canvas.height/2 - this.camera.y) * 0.1;
        }

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        if (this.isImgReady('floor')) {
            const ptrn = ctx.createPattern(this.images['floor'], 'repeat');
            ctx.fillStyle = ptrn;
            ctx.save(); ctx.translate(0,0); 
            ctx.fillRect(0, 0, mapSize.w, mapSize.h);
            ctx.restore();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeRect(0,0,mapSize.w, mapSize.h);
        } else {
            this.drawFallbackFloor(mapSize.w, mapSize.h);
        }

        obstacles.forEach(obs => {
            if (this.isImgReady('crate_top')) {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                const pattern = ctx.createPattern(this.images['crate_top'], 'repeat');
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, obs.w, obs.h);
                if(this.isImgReady('crate_border')) {
                    ctx.drawImage(this.images['crate_border'], 0, 0, obs.w, obs.h);
                } else {
                    ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2; ctx.strokeRect(0,0,obs.w, obs.h);
                }
                ctx.restore();
            } else {
                this.drawFallbackObstacle(obs);
            }
        });

        for(let id in zombies) {
            this.drawCharacter(zombies[id], 'zombie', true);
            let z = zombies[id];
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(z.x-15, z.y-35, 30, 4);
            ctx.fillStyle = '#f00'; ctx.fillRect(z.x-15, z.y-35, 30 * (z.hp/z.maxHp), 4);
        }

        for(let id in players) {
            let p = players[id];
            if(p.dead) continue;
            let alpha = p.isInvisible ? (id === myId ? 0.5 : 0.1) : 1.0;
            ctx.globalAlpha = alpha;
            
            this.drawCharacter(p, p.type, false);

            if(!p.isInvisible || id === myId) {
                ctx.fillStyle = '#fff'; 
                ctx.font = 'bold 12px Consolas'; 
                ctx.textAlign = 'center'; 
                ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
                ctx.fillText(p.name, p.x, p.y - 45);
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#333'; ctx.fillRect(p.x - 20, p.y - 40, 40, 6);
                ctx.fillStyle = p.color; ctx.fillRect(p.x - 20, p.y - 40, 40 * (p.hp/100), 6);
            }
            ctx.globalAlpha = 1.0;
        }

        bullets.forEach(b => {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(Math.atan2(b.vy, b.vx));
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color; ctx.shadowBlur = 10;
            if(b.type === 'sniper') ctx.fillRect(-10, -2, 20, 4);
            else if(b.type === 'shotgun') ctx.beginPath(), ctx.arc(0,0,4,0,Math.PI*2), ctx.fill();
            else ctx.fillRect(-5, -2, 10, 4);
            ctx.restore();
            if(Math.random()<0.2) this.addParticle(b.x, b.y, b.color);
        });

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
