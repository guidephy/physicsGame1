// Standalone script: no module loader or build step required.
(() => {
'use strict';
globalThis.PhysicsArena ||= {};
const { WIDTH, HEIGHT, FLOOR } = globalThis.PhysicsArena;
class Renderer {
    ctx;
    images = new Map();
    reduced = false;
    get reducedMotion() { return this.reduced; }
    set reducedMotion(value) { this.reduced = Boolean(value); }
    constructor(canvas) { const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx)
        throw new Error('此裝置無法建立遊戲畫面。'); this.ctx = ctx; canvas.width = WIDTH; canvas.height = HEIGHT; this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    async load(m) { await Promise.all([...new Set(m.actors.map(a => a.def.sprite.src))].map(src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => { this.images.set(src, img); resolve(); }; img.onerror = () => reject(new Error('角色圖片載入失敗，請重試。')); img.src = src; }))); }
    draw(m) {
        const c = this.ctx;
        c.save();
        c.fillStyle = '#171723';
        c.fillRect(0, 0, WIDTH, HEIGHT);
        if (!this.reduced && m.shake > 0)
            c.translate(Math.sin(m.elapsed * 151) * m.shake, Math.cos(m.elapsed * 123) * m.shake * .5);
        this.stage(m.elapsed);
        for (const e of m.effects)
            if (e.kind === 'zone')
                this.effect(e, m.elapsed);
        m.actors.forEach(a => this.castAura(a,m.elapsed));
        m.actors.forEach((a, i) => this.actor(a, i, m));
        for (const e of m.effects)
            if (e.kind !== 'zone')
                this.effect(e, m.elapsed);
        for (const p of m.sparks) {
            c.globalAlpha = Math.min(1, p.life * 3);
            c.fillStyle = p.color;
            if (!this.reduced) {
                c.strokeStyle = p.color;
                c.lineWidth = 2;
                c.beginPath();
                c.moveTo(p.x, p.y);
                c.lineTo(p.x - p.vx * .025, p.y - p.vy * .025);
                c.stroke();
            }
            c.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        c.globalAlpha = 1;
        if(m.castCaptionTime>0 && m.castCaption && m.phase==='fight') {
            const label=m.castCaption,alpha=Math.min(1,m.castCaptionTime*4),age=1.35-m.castCaptionTime;
            c.save();c.globalAlpha=alpha;c.translate(this.reduced?0:Math.max(0,1-age*9)*(label.player===0?-70:70),0);
            const bg=c.createLinearGradient(170,0,830,0);bg.addColorStop(0,'#10111a00');bg.addColorStop(.15,'#10111af2');bg.addColorStop(.85,'#10111af2');bg.addColorStop(1,'#10111a00');
            c.fillStyle=bg;c.fillRect(170,125,660,78);c.fillStyle=label.color;c.fillRect(280,125,440,2);c.fillRect(330,201,340,2);
            c.textAlign='center';c.font='bold 12px monospace';c.fillText(`${label.player===0?'1P':m.options.mode==='cpu'?'CPU':'2P'} / ${label.ultimate?'ULTIMATE':'SPECIAL'}`,500,144);
            c.font='900 33px "Microsoft JhengHei",sans-serif';c.strokeStyle='#080811';c.lineWidth=5;c.strokeText(label.name,500,182);c.fillText(label.name,500,182);c.restore();
        } else if (m.announcementTime > 0 && m.phase === 'fight') {
            c.save();
            c.textAlign = 'center';
            c.font = 'bold 22px "Microsoft JhengHei",sans-serif';
            c.fillStyle = '#11121dcc';
            c.fillRect(270, 115, 460, 42);
            c.fillStyle = '#e6fda8';
            c.fillText(m.announcement, 500, 144);
            c.restore();
        }
        c.restore();
    }
    stage(t) {
        const c = this.ctx;
        const g = c.createRadialGradient(500, 220, 10, 500, 220, 560);
        g.addColorStop(0, '#393049');
        g.addColorStop(1, '#171723');
        c.fillStyle = g;
        c.fillRect(0, 0, WIDTH, HEIGHT);
        // Side lights frame the fighters without reducing the arena's contrast.
        for (const [x, color] of [[0, '#8bc6d91a'], [1000, '#be98ea1a']]) {
            const light = c.createRadialGradient(x, 260, 0, x, 260, 380);
            light.addColorStop(0, color);
            light.addColorStop(1, '#17172300');
            c.fillStyle = light;
            c.fillRect(0, 0, WIDTH, FLOOR);
        }
        c.strokeStyle = '#7d6c912d';
        c.lineWidth = 1;
        for (let x = 0; x < WIDTH; x += 50) {
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x, FLOOR);
            c.stroke();
        }
        for (let y = 0; y < FLOOR; y += 50) {
            c.beginPath();
            c.moveTo(0, y);
            c.lineTo(WIDTH, y);
            c.stroke();
        }
        c.save();
        c.translate(500, 260);
        c.strokeStyle = '#b3a0d12c';
        for (let i = 0; i < 3; i++) {
            c.save();
            c.rotate(i * Math.PI / 3 + (this.reduced ? 0 : t * .018));
            c.beginPath();
            c.ellipse(0, 0, 205, 85, 0, 0, Math.PI * 2);
            c.stroke();
            c.restore();
        }
        c.beginPath();
        c.arc(0, 0, 145, 0, Math.PI * 2);
        c.stroke();
        c.restore();
        c.fillStyle = '#b8a4d12b';
        c.font = 'italic 24px Georgia';
        c.fillText('F = ma', 92, 193);
        c.fillText('ΔE = hν', 793, 250);
        c.fillText('∇ × E', 670, 110);
        c.font = '12px monospace';
        c.fillStyle = '#b0a2c17a';
        c.fillText('THEORETICAL ARENA', 420, 366);
        c.fillStyle = '#1c1c28';
        c.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
        const floorLight = c.createLinearGradient(0, FLOOR, 0, HEIGHT);
        floorLight.addColorStop(0, '#68617d32');
        floorLight.addColorStop(1, '#090a1480');
        c.fillStyle = floorLight;
        c.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
        c.strokeStyle = '#514a64';
        c.beginPath();
        c.moveTo(0, FLOOR);
        c.lineTo(WIDTH, FLOOR);
        c.stroke();
        c.strokeStyle = '#84709936';
        for (let x = -900; x < 1800; x += 140) {
            c.beginPath();
            c.moveTo(500 + (x - 500) * .3, FLOOR);
            c.lineTo(x, HEIGHT);
            c.stroke();
        }
        for (const y of [472, 495, 529, 558]) {
            c.beginPath();
            c.moveTo(0, y);
            c.lineTo(WIDTH, y);
            c.stroke();
        }
        c.fillStyle = '#dcfc8c';
        c.fillRect(465, FLOOR - 2, 70, 3);
        c.fillStyle = '#aab2ca80';
        c.font = '10px monospace';
        c.fillText('01 / CLASSICAL', 32, 536);
        c.fillText('02 / QUANTUM', 856, 536);
    }
    actor(a, i, m) {
        const c = this.ctx;
        const img = this.images.get(a.def.sprite.src);
        if (!img)
            return;
        c.save();
        const elevation = Math.min(1, Math.max(0, a.y) / 220);
        c.fillStyle = `rgba(0,0,0,${.42 - elevation * .24})`;
        c.beginPath();
        c.ellipse(a.x, FLOOR + 4, 65 - elevation * 23, 10 - elevation * 3, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = i === 0 ? '#dcfc8c70' : '#ff9ba870';
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(a.x, FLOOR + 5, 42, 6, 0, 0, Math.PI * 2);
        c.stroke();
        let row = 0;
        if (a.pose === 'punch')
            row = 1;
        if (a.pose === 'kick')
            row = 2;
        if (['special', 'ultimate', 'win'].includes(a.pose))
            row = 3;
        const attack = a.pose === 'punch' || a.pose === 'kick';
        const windup = attack && a.elapsed < (a.pose === 'punch' ? .1 : .18);
        if (windup)
            row = 0;
        const bob = !this.reduced && (a.pose === 'idle' || a.pose === 'walk') ? Math.sin(m.elapsed * (a.moving ? 15 : 3) + i) * (a.moving ? 5 : 2) : 0;
        c.translate(a.x, FLOOR - a.y + bob);
        c.scale(a.face, 1);
        if(a.pose === 'roll') {
            c.translate(0,-48);c.rotate(this.reduced?-.7:-a.rollDir*a.face*(a.elapsed/.42)*Math.PI*2);c.scale(.72,.72);c.translate(0,78);
            c.globalAlpha=.8;
        }
        if (a.pose === 'down') {
            c.rotate(-Math.PI / 2);
            c.translate(70, 30);
        }
        else if (a.pose === 'hurt')
            c.rotate(-.1);
        else if (a.pose === 'block')
            c.rotate(-.05);
        let sx = 1, sy = 1;
        if (a.pose === 'crouch') {
            sx = 1.08;
            sy = .65;
        }
        if (windup) {
            sx = .92;
            sy = .98;
        }
        if (a.pose === 'jump')
            sy = 1.03;
        c.scale(sx, sy);
        if (a.invuln > 0 && !this.reduced)
            c.globalAlpha = .55 + .45 * Math.abs(Math.sin(m.elapsed * 40));
        c.imageSmoothingEnabled = false;
        const sw = img.width / a.def.sprite.columns, sh = img.height / a.def.sprite.rows;
        c.drawImage(img, a.def.sprite.column * sw, row * sh, sw, sh, -104, -202, 208, 208);
        c.globalAlpha = 1;
        if (attack && !windup && a.elapsed < .28) {
            c.save();
            c.strokeStyle = a.def.color;
            c.globalAlpha = .45;
            c.lineWidth = a.pose === 'kick' ? 7 : 4;
            c.beginPath();
            c.ellipse(30, a.pose === 'kick' ? -75 : -120, a.pose === 'kick' ? 88 : 69, 28, -.25, -.9, 1.05);
            c.stroke();
            c.restore();
        }
        if (a.pose === 'block') {
            c.strokeStyle = '#a2ddff';
            c.lineWidth = 3;
            c.beginPath();
            c.ellipse(55, -100, 40, 76, 0, -1.4, 1.4);
            c.stroke();
        }
        c.restore();
        if(a.internalDamage>0) {
            c.save();c.globalAlpha=Math.min(1,a.internalDamage*2);c.strokeStyle='#ff5b80';c.lineWidth=4;c.translate(a.x,FLOOR-a.y-100);
            for(let k=0;k<3;k++){c.beginPath();c.moveTo(-23+k*18,-28);c.lineTo(-12+k*18,-5);c.lineTo(-26+k*18,5);c.lineTo(-8+k*18,30);c.stroke();}
            c.fillStyle='#ffa1b0';c.textAlign='center';c.font='bold 20px "Microsoft JhengHei",sans-serif';c.fillText(`內傷 −${Math.round(a.internalDamageAmount||0)} HP`,0,-60-(1.1-a.internalDamage)*20);c.restore();
        }
        c.save();
        c.fillStyle = i === 0 ? '#dcfc8c' : '#ff9ba8';
        c.font = 'bold 12px monospace';
        c.textAlign = 'center';
        c.fillText(i === 0 ? '1P' : m.options.mode === 'cpu' ? 'CPU' : '2P', a.x, FLOOR - a.y - 218);
        if (a.combo > 1 && a.comboTime > 0) {
            c.font = 'bold 22px monospace';
            c.fillStyle = a.def.color;
            c.fillText(`${a.combo} HIT`, a.x, FLOOR - a.y - 243);
        }
        c.restore();
    }
    castAura(a,time) {
        if(!['special','ultimate'].includes(a.pose)) return;
        const c=this.ctx, superMove=a.pose==='ultimate', duration=superMove?.85:.5;
        const progress=Math.min(1,a.elapsed/duration), radius=superMove?130:72;
        c.save();c.translate(a.x,FLOOR-a.y-90);
        const glow=c.createRadialGradient(0,0,8,0,0,radius);glow.addColorStop(0,a.def.color+'55');glow.addColorStop(1,a.def.color+'00');c.fillStyle=glow;c.fillRect(-radius,-radius,radius*2,radius*2);
        c.strokeStyle=a.def.color;c.lineWidth=superMove?4:2;c.globalAlpha=.65*(1-progress*.7);
        for(let k=0;k<(superMove?3:1);k++){c.beginPath();c.ellipse(0,0,radius*(.6+k*.18),radius*(.25+k*.1),this.reduced?0:time*.8+k,0,Math.PI*2);c.stroke();}
        if(superMove && !this.reduced) for(let k=0;k<12;k++){const angle=k*Math.PI/6;c.beginPath();c.moveTo(Math.cos(angle)*90,Math.sin(angle)*90);c.lineTo(Math.cos(angle)*(115+progress*50),Math.sin(angle)*(115+progress*50));c.stroke();}
        c.globalAlpha=.9;c.fillStyle=a.def.color;c.font='italic 18px Georgia';c.textAlign='center';c.fillText(a.def.formula,0,-radius-8);c.restore();
    }
    apple(x, y, size, rotation = 0) {
        const c = this.ctx;
        c.save(); c.translate(x, y); c.rotate(rotation); c.scale(size / 25, size / 25);
        c.lineWidth = 2; c.strokeStyle = '#581a29';
        const g = c.createLinearGradient(-20, -18, 20, 23);
        g.addColorStop(0, '#ff8b68'); g.addColorStop(.4, '#ed3e49'); g.addColorStop(1, '#941d38');
        c.fillStyle = g; c.beginPath(); c.moveTo(0,-16);
        c.bezierCurveTo(-30,-32,-34,10,-14,24); c.bezierCurveTo(-6,29,-3,22,0,23);
        c.bezierCurveTo(6,22,11,30,19,19); c.bezierCurveTo(36,-6,22,-30,0,-16);
        c.fill(); c.stroke();
        c.strokeStyle = '#c6975d'; c.lineWidth = 4; c.beginPath(); c.moveTo(0,-15); c.quadraticCurveTo(-3,-25,3,-31); c.stroke();
        c.fillStyle = '#99e46d'; c.strokeStyle = '#3d7339'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(1,-24); c.quadraticCurveTo(12,-38,22,-29); c.quadraticCurveTo(13,-18,1,-24); c.fill(); c.stroke();
        c.strokeStyle = '#ffe2c7'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16,-10); c.quadraticCurveTo(-23,-1,-17,7); c.stroke(); c.restore();
    }
    planet(x,y,r,time) {
        const c=this.ctx; c.save(); c.translate(x,y);
        c.strokeStyle='#f5d68d'; c.lineWidth=3; c.beginPath(); c.ellipse(0,0,r*1.65,r*.45,-.35,Math.PI,Math.PI*2); c.stroke();
        const g=c.createRadialGradient(-r*.35,-r*.35,1,0,0,r); g.addColorStop(0,'#fff0bc'); g.addColorStop(.5,'#e6a553'); g.addColorStop(1,'#885743');
        c.fillStyle=g; c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.fill();
        c.save(); c.clip(); c.strokeStyle='#9b634e'; c.lineWidth=3;
        for(let k=-1;k<2;k++){ c.beginPath(); c.ellipse(0,k*r*.5,r*1.1,r*.22,-.2,0,Math.PI); c.stroke(); } c.restore();
        c.strokeStyle='#ffe4a8'; c.lineWidth=3; c.beginPath(); c.ellipse(0,0,r*1.65,r*.45,-.35,0,Math.PI); c.stroke(); c.restore();
    }
    effect(e, time) {
        const c=this.ctx, active=e.age>=e.delay, t=Math.max(0,e.age-e.delay);
        if(this.reduced) time=0;
        c.save(); c.strokeStyle=e.color; c.fillStyle=e.color; c.lineWidth=2;
        // Dashed ground outlines always identify the actual attack range.
        if(e.kind==='zone') {
            c.globalAlpha=active?.75:.45; c.setLineDash(active?[]:[7,6]);
            c.beginPath(); c.ellipse(e.x,FLOOR,e.radius,17,0,0,Math.PI*2); c.stroke(); c.setLineDash([]); c.globalAlpha=1;
            if(e.theme==='coil') {
                const x=e.x,y=FLOOR;
                c.fillStyle='#303845'; c.strokeStyle='#a6b7bf'; c.lineWidth=2;
                c.beginPath(); c.roundRect(x-32,y-14,64,16,5); c.fill(); c.stroke();
                c.fillStyle='#91b3bd'; c.fillRect(x-6,y-91,12,77);
                for(let i=0;i<7;i++) { c.strokeStyle=i%2?'#e9ad6a':'#b56a3f'; c.lineWidth=5; c.beginPath(); c.ellipse(x,y-23-i*9,23,7,0,0,Math.PI*2); c.stroke(); }
                c.fillStyle='#c5edee'; c.beginPath(); c.ellipse(x,y-92,22,9,0,0,Math.PI*2); c.fill();
                if(active) for(let side of [-1,1]) { c.strokeStyle='#83ffeb'; c.shadowColor='#83ffeb';c.shadowBlur=this.reduced?0:12;c.lineWidth=5; c.beginPath(); c.moveTo(x,y-94);
                    for(let k=1;k<=7;k++) c.lineTo(x+side*e.radius*k/7,y-94+k*10+(k%2?12:-12)); c.stroke();
                    c.strokeStyle='#f0ffff'; c.lineWidth=1.5; c.stroke(); }
            } else if(e.theme==='gravity') {
                c.save(); c.translate(e.x,FLOOR-70); c.strokeStyle='#b8ceff';
                for(let k=0;k<4;k++){ c.globalAlpha=.2+k*.1; c.beginPath(); c.ellipse(0,0,e.radius*(.25+k*.23),18+k*10,0,0,Math.PI*2); c.stroke(); }
                c.globalAlpha=active?1:.55;
                for(let k=0;k<3;k++){ const a=time*1.4+k*Math.PI*2/3; this.apple(Math.cos(a)*e.radius*.65,Math.sin(a)*26-20,17,Math.sin(a)*.3); }
                this.apple(0,-8,active?38:28,0); c.restore();
                if(active){ c.strokeStyle='#e9e7ff'; for(let d of [-1,1]){c.beginPath();c.moveTo(e.x+d*e.radius*.9,FLOOR-45);c.lineTo(e.x+d*e.radius*.45,FLOOR-45);c.lineTo(e.x+d*e.radius*.55,FLOOR-53);c.stroke();} }
            } else if(e.theme==='photon') {
                // A warped spacetime mesh, distinct from Newton's orbiting apples.
                c.save(); c.translate(e.x,FLOOR-90); c.strokeStyle=active?'#ffe58e':'#9c9274'; c.globalAlpha=active?.8:.4;
                for(let k=-3;k<=3;k++) {const offset=k*e.radius/3;
                    c.beginPath();c.moveTo(-e.radius,k*22);c.bezierCurveTo(-55,k*13+45,55,k*13+45,e.radius,k*22);c.stroke();
                    c.beginPath();c.moveTo(offset,-80);c.bezierCurveTo(offset*.25,-30,offset*.25,35,offset,90);c.stroke();}
                c.fillStyle='#111522';c.strokeStyle='#fff0b1';c.lineWidth=3;c.beginPath();c.ellipse(0,15,28,17,-.25,0,Math.PI*2);c.fill();c.stroke(); c.restore();
            } else if(e.theme==='interference') {
                const g=c.createLinearGradient(0,FLOOR-230,0,FLOOR);g.addColorStop(0,e.color+'00');g.addColorStop(1,e.color+'90');c.fillStyle=g;c.globalAlpha=active?.9:.35;c.fillRect(e.x-e.radius,FLOOR-230,e.radius*2,230);
                c.strokeStyle='#d1efff';c.lineWidth=2;
                for(let k=0;k<5;k++){c.beginPath();for(let j=0;j<=24;j++){const x=e.x-e.radius+j*e.radius/12,y=FLOOR-25-k*39+Math.sin(j*.5-time*3)*10;j?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
                c.fillStyle='#b5ddff';c.fillRect(e.x-e.radius,FLOOR-8,e.radius*2,5);
            }
        } else if(e.kind==='drop') {
            if(!active){c.globalAlpha=.6;c.setLineDash([5,7]);c.beginPath();c.moveTo(e.x,135);c.lineTo(e.x,FLOOR);c.stroke();c.setLineDash([]);c.beginPath();c.ellipse(e.x,FLOOR,40,10,0,0,Math.PI*2);c.stroke();this.apple(e.x,125,20);}
            else { c.globalAlpha=.4;c.strokeStyle='#ffbe85';c.lineWidth=3;for(const dx of [-16,0,16]){c.beginPath();c.moveTo(e.x+dx,e.y-38);c.lineTo(e.x+dx,e.y-80);c.stroke();}c.globalAlpha=1;this.apple(e.x,e.y,31,this.reduced?0:Math.sin(t*8)*.2); }
        } else if(active) {
            const dir=Math.sign(e.vx)||1,r=e.radius||18;
            if(e.theme==='orbit') {
                c.globalAlpha=.3;c.strokeStyle='#ffe1a5';c.setLineDash([4,6]);c.beginPath();c.ellipse(e.x-dir*38,e.y,65,24,-.2,0,Math.PI*2);c.stroke();c.setLineDash([]);c.globalAlpha=1;this.planet(e.x,e.y,r*.95,time);
            } else if(e.theme==='interference') {
                c.save();c.translate(e.x,e.y);c.scale(dir,1);
                // Double slit plate and two semicircular wavefront sources.
                c.fillStyle='#afc5db';for(const [y,h] of [[-36,19],[-10,20],[17,19]]) c.fillRect(-29,y,6,h);
                for(const origin of [-13,13]) for(let k=0;k<3;k++){c.strokeStyle=k===0?'#ecfbff':e.color;c.globalAlpha=1-k*.23;c.lineWidth=3;c.beginPath();c.arc(-19,origin,18+k*15,-1.12,1.12);c.stroke();}c.restore();
            } else if(e.theme==='energy') {
                c.save();c.translate(e.x,e.y);c.strokeStyle=e.color;c.lineWidth=2;
                for(let k=0;k<3;k++){c.beginPath();c.ellipse(0,0,r*1.35,r*.52,k*Math.PI/3,0,Math.PI*2);c.stroke();}
                c.fillStyle='#fff1ff';c.beginPath();c.arc(0,0,5,0,Math.PI*2);c.fill();
                const a=time*5;c.fillStyle=e.color;c.beginPath();c.arc(Math.cos(a)*r*1.35,Math.sin(a)*r*.52,4,0,Math.PI*2);c.fill();
                c.globalAlpha=.6;for(let k=1;k<=3;k++){c.fillRect(-dir*(r+12+k*9),-k*5,5,k*10);}c.restore();
            } else {
                c.save();c.translate(e.x,e.y);c.scale(dir,1);c.strokeStyle=e.color;c.lineWidth=3;c.beginPath();
                for(let k=0;k<=32;k++){const x=-80+k*2.5,y=Math.sin(k*.48-time*7)*9;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
                c.fillStyle='#fff7d3';c.strokeStyle='#ffe58e';c.lineWidth=2;c.beginPath();c.moveTo(25,0);c.lineTo(2,-12);c.lineTo(-13,0);c.lineTo(2,12);c.closePath();c.fill();c.stroke();c.restore();
            }
        }
        c.restore();
    }

}

Object.assign(globalThis.PhysicsArena, { Renderer });
})();
