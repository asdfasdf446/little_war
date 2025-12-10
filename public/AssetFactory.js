const Assets = {
    images: {},
    
    init: function() {
        // 图片加载辅助函数
        const load = (path) => {
            const img = new Image();
            img.src = path;
            // 简单的错误处理，如果图片没加载出来，控制台报个错
            img.onerror = () => console.error('Failed to load:', path);
            return img;
        };

        console.log("Loading game assets...");

        // 1. 场景素材
        this.images.floor = load('assets/floor.png');
        this.images.crate = load('assets/crate.png');
        
        // 2. 角色素材
        // 注意：图片必须是面朝右(3点钟方向)的，否则旋转会错乱
        this.images.rifle = load('assets/soldier_rifle.png');     
        this.images.sniper = load('assets/soldier_sniper.png');   
        this.images.shotgun = load('assets/soldier_shotgun.png'); 
    }
};
