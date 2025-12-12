// 美术资源配置表
// frames: 图片里有多少帧 (横向排列)
// speed: 播放速度 (数字越大越慢，0为不播放)
const ASSET_MANIFEST = {
    // === 环境 ===
    floor:        { path: 'assets/floor_tile.png' },     // 地面纹理
    crate_top:    { path: 'assets/crate_texture.png' },  // 箱子顶部纹理
    crate_border: { path: 'assets/crate_border.png' },   // 箱子边框

    // === 步枪兵 (Rifle) ===
    rifle_legs:   { path: 'assets/rifle_legs.png',   frames: 8, speed: 0.2 },
    rifle_torso:  { path: 'assets/rifle_torso.png',  frames: 1, speed: 0 },
    rifle_shoot:  { path: 'assets/rifle_shoot.png',  frames: 3, speed: 0.5 },

    // === 狙击手 (Sniper) ===
    sniper_legs:  { path: 'assets/sniper_legs.png',  frames: 8, speed: 0.25 }, // 跑得慢，播慢点
    sniper_torso: { path: 'assets/sniper_torso.png', frames: 1, speed: 0 },
    sniper_shoot: { path: 'assets/sniper_shoot.png', frames: 4, speed: 0.5 },

    // === 喷子 (Shotgun) ===
    shotgun_legs: { path: 'assets/shotgun_legs.png',  frames: 8, speed: 0.2 },
    shotgun_torso:{ path: 'assets/shotgun_torso.png', frames: 1, speed: 0 },
    shotgun_shoot:{ path: 'assets/shotgun_shoot.png', frames: 3, speed: 0.5 },

    // === 丧尸 (Zombie) ===
    zombie_legs:  { path: 'assets/zombie_legs.png',   frames: 8, speed: 0.2 },
    zombie_torso: { path: 'assets/zombie_torso.png',  frames: 4, speed: 0.1 }, // 身体晃动
    zombie_attack:{ path: 'assets/zombie_attack.png', frames: 3, speed: 0.3 }
};
