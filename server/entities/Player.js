const CONFIG = require('../config');
const { stringToColor } = require('../utils/math');

class Player {
    constructor(id, ip, type, name, device) {
        this.id = id;
        this.ip = ip;
        this.name = name || ('Agent-' + id.substr(0,4)); 
        this.device = device || 'PC';
        
        const colorSource = this.name + this.ip + this.device;
        this.color = stringToColor(colorSource);
        
        // 初始位置随机
        this.x = Math.random() * (CONFIG.MAP.WIDTH - 200);
        this.y = Math.random() * (CONFIG.MAP.HEIGHT - 200);
        this.angle = 0;
        
        const validTypes = ['RIFLE', 'SNIPER', 'SHOTGUN'];
        this.type = validTypes.includes(type) ? type : 'RIFLE'; 
        
        // 从配置加载属性
        const stats = CONFIG.PLAYER_STATS[this.type];
        this.hp = stats.HP;
        this.maxHp = stats.HP;
        this.baseSpeed = stats.BASE_SPEED;
        this.damage = stats.DAMAGE;
        this.range = stats.RANGE;
        this.cd = stats.CD;
        this.skillCdMax = stats.SKILL_CD;
        this.skillDurationMax = stats.SKILL_DURATION;
        
        this.radius = 22;
        this.kills = 0;
        this.deaths = 0;
        this.latency = 0;
        this.dead = false;
        
        this.inputs = { up: false, down: false, left: false, right: false, shoot: false, skill: false, angle: 0 };
        
        // 状态
        this.currentCd = 0;
        this.skillCdCurrent = 0;
        this.skillActiveTime = 0;
        this.isInvulnerable = false;
        this.isInvisible = false;
        this.speedMultiplier = 1;
    }

    reset() {
        this.dead = false;
        this.hp = this.maxHp;
        this.x = Math.random() * (CONFIG.MAP.WIDTH - 200);
        this.y = Math.random() * (CONFIG.MAP.HEIGHT - 200);
        this.isInvulnerable = false;
        this.isInvisible = false;
        this.inputs = { up: false, down: false, left: false, right: false, shoot: false, skill: false, angle: 0 };
    }
}
module.exports = Player;
