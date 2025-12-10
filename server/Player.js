function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        // 提高亮度基准，防止颜色过暗
        if(value < 80) value += 80; 
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

class Player {
    constructor(id, ip, type, name, device) {
        this.id = id;
        this.ip = ip;
        this.name = name || ('Agent-' + id.substr(0,4)); 
        this.device = device || 'PC';
        
        // === V12.0: 复合颜色源 (ID + IP + 设备) ===
        // 这样即使名字一样，IP不同颜色也不一样
        const colorSource = this.name + this.ip + this.device;
        this.color = stringToColor(colorSource);
        
        this.x = Math.random() * 1800 + 100;
        this.y = Math.random() * 1800 + 100;
        this.angle = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.kills = 0;
        this.deaths = 0;
        this.latency = 0;
        this.dead = false;
        
        const validTypes = ['RIFLE', 'SNIPER', 'SHOTGUN'];
        this.type = validTypes.includes(type) ? type : 'RIFLE'; 
        
        this.skillCdMax = 0;
        this.skillCdCurrent = 0;
        this.skillActiveTime = 0;
        this.isInvulnerable = false;
        this.isInvisible = false;
        this.speedMultiplier = 1;

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
                this.skillCdMax = 600;
                break;
            case 'SHOTGUN':
                this.baseSpeed = 4.5;
                this.radius = 25;
                this.cd = 40;
                this.damage = 15;
                this.range = 350;
                this.skillCdMax = 480;
                break;
            default:
                this.baseSpeed = 5;
                this.radius = 22;
                this.cd = 10;
                this.damage = 10;
                this.range = 650;
                this.skillCdMax = 360;
                break;
        }
        this.currentCd = 0;
        this.speed = this.baseSpeed;
    }
}
module.exports = Player;
