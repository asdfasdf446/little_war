module.exports = {
    // === 地图设置 ===
    MAP: {
        WIDTH: 2000,        // 地图宽度
        HEIGHT: 2000,       // 地图高度
        OBSTACLE_COUNT: 30  // 障碍物生成的数量
    },

    // === 游戏节奏 ===
    GAME_LOOP: {
        TICK_RATE: 60,      // 服务器逻辑帧率 (FPS)
        BROADCAST_RATE: 30, // 网络同步帧率 (每秒广播次数)
        ZOMBIE_SPAWN_RATE: 0.03 // 每一帧生成丧尸的概率 (越大生成越快)
    },

    // === 玩家职业数值配置 ===
    // CD: 攻击冷却 (帧)
    // SPEED: 移动速度倍率
    // HP: 生命值
    PLAYER_STATS: {
        RIFLE: {
            BASE_SPEED: 5,   // 基础移动速度
            HP: 100,         // 生命值
            DAMAGE: 10,      // 单发伤害
            RANGE: 650,      // 射程
            CD: 10,          // 射击冷却(帧)
            SKILL_CD: 360,   // 技能冷却(帧) - 6秒
            SKILL_DURATION: 180 // 技能持续时间 - 3秒加速
        },
        SNIPER: {
            BASE_SPEED: 3,   // 跑得慢
            HP: 100,
            DAMAGE: 60,      // 伤害极高
            RANGE: 1000,     // 射程极远
            CD: 60,          // 射速慢
            SKILL_CD: 600,   // 10秒冷却
            SKILL_DURATION: 300 // 5秒隐身
        },
        SHOTGUN: {
            BASE_SPEED: 4.5,
            HP: 100,
            DAMAGE: 15,      // 单颗弹丸伤害 (x5)
            RANGE: 350,      // 射程近
            CD: 40,
            SKILL_CD: 480,
            SKILL_DURATION: 150 // 2.5秒无敌
        }
    },

    // === 丧尸数值配置 ===
    ZOMBIE: {
        MAX_COUNT: 40,      // 场上最大丧尸数量
        HP: 50,             // 丧尸血量
        DAMAGE: 0.5,        // 接触玩家时的持续扣血量
        VISION_RANGE: 400,  // 索敌范围
        SPEED_WANDER: 0.8,  // 游荡速度
        SPEED_CHASE: 3.5,   // 追击速度
        RADIUS: 20          // 碰撞体积半径
    }
};
