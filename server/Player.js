// IP 转颜色算法
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        // 保证颜色稍微亮一点，避免太黑看不见
        if(value < 50) value += 50; 
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

class Player {
    constructor(id, ip, type) {
        this.id = id;
        this.ip = ip;
        this.color = stringToColor(ip); // 颜色由IP决定
        
        this.x = Math.random() * 1800 + 100;
        this.y = Math.random() * 1800 + 100;
        this.angle = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.score = 0;
        this.dead = false;
        
        const validTypes = ['RIFLE', 'SNIPER', 'SHOTGUN'];
        this.type = validTypes.includes(type) ? type : 'RIFLE'; 
        
        // 技能状态
        this.skillCdMax = 0;     // 技能总CD
        this.skillCdCurrent = 0; // 当前冷却
        this.skillActiveTime = 0;// 技能持续时间
        this.isInvulnerable = false; // 无敌状态
        this.isInvisible = false;    // 隐身状态
        this.speedMultiplier = 1;    // 速度倍率

        this.applyTypeStats();
    }

    applyTypeStats() {
        switch(this.type) {
            case 'SNIPER':
                this.baseSpeed = 3;
                this.radius = 20;
                this.cd = 60;
                this.damage = 60;
                this.range = 1000;
                this.skillCdMax = 600; // 10秒CD (60帧/秒)
                break;
            case 'SHOTGUN':
                this.baseSpeed = 4.5;
                this.radius = 25;
                this.cd = 40;
                this.damage = 15;
                this.range = 350;
                this.skillCdMax = 480; // 8秒CD
                break;
            default: // RIFLE
                this.baseSpeed = 5;
                this.radius = 22;
                this.cd = 10;
                this.damage = 10;
                this.range = 650;
                this.skillCdMax = 360; // 6秒CD
                break;
        }
        this.currentCd = 0;
        this.speed = this.baseSpeed;
    }
}
module.exports = Player;
