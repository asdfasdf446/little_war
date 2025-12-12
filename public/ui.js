const UI = {
    elements: {
        healthBar: document.getElementById('health-bar'),
        scoreboard: document.getElementById('scoreboard'),
        respawnMsg: document.getElementById('respawn-msg'),
        loginScreen: document.getElementById('login-screen'),
        nameInput: document.getElementById('username-input')
    },

    init() {
        if(localStorage.getItem('neon_username')) {
            this.elements.nameInput.value = localStorage.getItem('neon_username');
        }
    },

    hideLogin() {
        this.elements.loginScreen.style.display = 'none';
    },

    updateHealth(hp) {
        this.elements.healthBar.style.width = hp + '%';
        this.elements.healthBar.style.backgroundColor = hp < 30 ? 'red' : '#00ff00';
    },

    showRespawn(isDead) {
        this.elements.respawnMsg.style.display = isDead ? 'block' : 'none';
        if(isDead) this.elements.respawnMsg.innerText = "重新部署中...";
    },

    updateScoreboard(players, myId, myLatency, zombieCount) {
        let list = Object.values(players).sort((a,b) => b.kills - a.kills);
        let html = `
        <table class="tactical-table">
            <thead>
                <tr>
                    <th class="col-rank">#</th><th class="col-class">兵种</th><th class="col-id">ID</th>
                    <th class="col-dev">DEV</th><th class="col-ip">IP</th><th class="col-ping">PING</th>
                    <th class="col-kd">K/D</th><th class="col-skill">技能</th>
                </tr>
            </thead>
            <tbody>`;
        
        list.forEach((p, index) => {
            let skillText = p.skillCdCurrent <= 0 ? '<span style="color:#0f0">RDY</span>' : `<span style="color:#555">${Math.ceil(p.skillCdCurrent/60)}</span>`;
            let typeName = p.type === 'RIFLE' ? '步' : (p.type === 'SNIPER' ? '狙' : '喷');
            let deviceIcon = p.device === 'MOBILE' ? '📱' : '💻';
            let pingColor = (p.latency || 0) < 100 ? '#0f0' : '#f00';
            let rowClass = (p.id === myId) ? 'my-row' : '';
            
            html += `<tr class="${rowClass}">
                <td class="col-rank">${index + 1}</td><td class="col-class">${typeName}</td>
                <td class="col-id" style="color:${p.color}">${p.name}</td><td class="col-dev">${deviceIcon}</td>
                <td class="col-ip">${p.ip || '---'}</td><td class="col-ping" style="color:${pingColor}">${p.latency || 0}</td>
                <td class="col-kd"><span style="color:#0f0">${p.kills}</span>/<span style="color:#f44">${p.deaths}</span></td>
                <td class="col-skill">${skillText}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        let myPingColor = myLatency < 100 ? '#0f0' : '#fa0';
        html += `<div style="text-align:right; padding:5px; font-size:10px; border-top:1px solid #446688; color:#88aacc">
            LATENCY: <span style="color:${myPingColor}">${myLatency}ms</span> | ZOMBIES: ${zombieCount}
        </div>`;
        this.elements.scoreboard.innerHTML = html;
    }
};
