// 美术师请注意：
// 只需要修改 path 对应的路径，即可替换游戏内的图片
// 确保图片背景透明，且角色默认朝向为右侧
const ASSET_MANIFEST = {
    // 场景
    floor:   { path: 'assets/floor.png' },
    crate:   { path: 'assets/crate.png' },

    // 玩家角色
    rifle:   { path: 'assets/soldier_rifle.png' },
    sniper:  { path: 'assets/soldier_sniper.png' },
    shotgun: { path: 'assets/soldier_shotgun.png' },

    // 目前丧尸和子弹是代码绘制的，如果需要换成图片，请在这里添加
    // 并通知程序员修改 Renderer.js
};
