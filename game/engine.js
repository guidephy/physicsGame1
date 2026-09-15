// Standalone script: no module loader or build step required.
(() => {
'use strict';
globalThis.PhysicsArena ||= {};
const { getFighter } = globalThis.PhysicsArena;
const WIDTH = 1000, HEIGHT = 560, FLOOR = 456;
const ACTIONS = ['left', 'right', 'jump', 'crouch', 'punch', 'kick', 'block', 'roll'];
const BUFFERED_ACTIONS = ['roll', 'ultimate', 'special', 'kick', 'punch', 'jump'];
const INPUT_BUFFER = .12;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
class Match {
    learningRequest = null;
    pendingQuizCast = null;
    quizTimer = 6;
    castCaptionTime = 0;
    castCaption = null;
    actors;
    effects = [];
    sparks = [];
    options;
    phase = 'countdown';
    phaseTime = 2.2;
    time = 60;
    round = 1;
    winner = null;
    paused = false;
    elapsed = 0;
    hitstop = 0;
    shake = 0;
    announcement = '';
    announcementTime = 0;
    events = [];
    previous = [{}, {}];
    buffered = [{}, {}];
    aiInput = {};
    aiTimer = 0;
    seed;
    constructor(options) { this.options = options; this.seed = options.seed ?? Date.now(); this.actors = [this.actor(options.p1, 260, 1), this.actor(options.p2, 740, -1)]; this.quizTimer=5+this.random()*3; }
    actor(id, x, face) { return { def: getFighter(id), x, y: 0, vy: 0, face, hp: 100, energy: this.options.mode === 'practice' ? 100 : 35, recovery: 0, internalDamage: 0, rollCooldown: 0, rollTime: 0, rollDir: face, studyCooldown: 0, permits: {special: false, ultimate: false}, pose: 'idle', elapsed: 0, lock: 0, invuln: 0, cooldown: 0, didHit: false, wins: 0, moving: false, combo: 0, comboTime: 0 }; }
    finishLearningRace(winner) {
        if(!this.learningRequest) return;
        const action=this.learningRequest.action;
        if(winner===0 || winner===1) {
            const actor=this.actors[winner];this.pendingQuizCast={player:winner,action};
            actor.energy=Math.max(actor.energy,action==='ultimate'?100:20);
        }
        this.learningRequest=null;this.buffered=[{},{}];this.previous=[{},{}];this.quizTimer=12+this.random()*8;
    }
    studyInjury(player) {
        const a=this.actors[player],damage=Math.min(5,Math.max(0,a.hp-1));
        a.hp-=damage;a.internalDamageAmount=damage;a.internalDamage=1.1;a.pose='hurt';a.elapsed=0;a.rollTime=0;a.invuln=0;a.lock=.3;
        if(this.options.mode==='practice')a.recovery=3;
        this.burst(a.x,FLOOR-a.y-100,'#ff657a',20);this.events.push({type:'hit',owner:1-player});
        return damage;
    }
    canStudy(i, action) {
        if(!this.options.learning) return true;
        return false;
    }
    random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
    burst(x, y, color, n = 14) { for (let i = 0; i < n; i++) {
        const angle = this.random() * Math.PI * 2, speed = 60 + this.random() * 210;
        this.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .2 + this.random() * .35, color });
    } if (this.sparks.length > 160)
        this.sparks.splice(0, this.sparks.length - 160); }
    announce(text) { this.announcement = text; this.announcementTime = 1.45; }
    nextRound() { this.pendingQuizCast=null;this.castCaptionTime=0;this.learningRequest=null;this.quizTimer=5+this.random()*3;const wins = this.actors.map(a => a.wins); this.actors = [this.actor(this.options.p1, 260, 1), this.actor(this.options.p2, 740, -1)]; this.actors.forEach((a, i) => a.wins = wins[i]); this.effects = []; this.sparks = []; this.previous = [{}, {}]; this.buffered = [{}, {}]; this.hitstop = 0; this.phase = 'countdown'; this.phaseTime = 2; this.time = 60; this.round++; this.winner = null; this.aiInput = {}; this.aiTimer = 0; this.events.push({ type: 'round' }); }
    finishRound() { if (this.phase !== 'fight' || this.options.mode === 'practice')
        return; const [a, b] = this.actors; this.winner = a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1; if (this.winner !== null) {
        this.actors[this.winner].wins++;
        this.actors[this.winner].pose = 'win';
        this.actors[1 - this.winner].pose = 'down';
    } this.effects = []; this.phase = this.actors.some(a => a.wins >= 2) ? 'matchOver' : 'roundOver'; this.phaseTime = 3; this.events.push({ type: 'ko' }); }
    step(dt, provided = [{}, {}]) {
        if (this.paused || this.phase === 'matchOver')
            return;
        if (!Number.isFinite(dt) || dt <= 0) return;
        dt = clamp(dt, 0, 1 / 30);
        this.castCaptionTime=Math.max(0,this.castCaptionTime-dt);
        this.elapsed += dt;
        this.shake = Math.max(0, this.shake - dt * 24);
        this.announcementTime = Math.max(0, this.announcementTime - dt);
        for (const p of this.sparks) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 350 * dt;
            p.life -= dt;
        }
        this.sparks = this.sparks.filter(p => p.life > 0);
        if (this.phase === 'countdown') {
            this.phaseTime -= dt;
            if (this.phaseTime <= 0) {
                this.phase = 'fight';
                this.announce('實驗開始！');
            }
            this.previous = provided.map(i => ({ ...i }));
            return;
        }
        if (this.phase === 'roundOver') {
            this.phaseTime -= dt;
            if (this.phaseTime <= 0)
                this.nextRound();
            return;
        }
        if(this.pendingQuizCast) {
            const {player,action}=this.pendingQuizCast;this.pendingQuizCast=null;
            const a=this.actors[player],ultimate=action==='ultimate';
            a.face=this.actors[1-player].x>=a.x?1:-1;a.rollTime=0;a.invuln=0;a.lock=0;
            a.energy=Math.max(0,a.energy-(ultimate?100:20));
            if(!ultimate)a.cooldown=2.2;
            this.buffered=[{},{}];this.cast(player,ultimate);
            return;
        }
        if(this.options.learning) {
            this.quizTimer-=dt;
            if(this.quizTimer<=0) {
                this.learningRequest={race:true,action:this.random()<.5?'special':'ultimate'};
                this.paused=true;this.buffered=[{},{}];this.previous=[{},{}];return;
            }
        }
        const inputs = [provided[0] || {}, provided[1] || {}];
        if (this.options.mode === 'cpu') inputs[1] = this.think(dt);
        if (this.options.mode === 'practice') inputs[1] = {};
        for (let i = 0; i < 2; i++) {
            for (const key of BUFFERED_ACTIONS) {
                this.buffered[i][key] = Math.max(0, (this.buffered[i][key] || 0) - (this.hitstop > 0 ? 0 : dt));
                if (inputs[i][key] && !this.previous[i]?.[key]) this.buffered[i][key] = INPUT_BUFFER;
            }
        }
        this.previous = inputs.map(input => ({ ...input }));
        if (this.hitstop > 0) {
            this.hitstop -= dt;
            return;
        }
        if (this.options.mode !== 'practice') this.time = Math.max(0, this.time - dt);
        this.actors.forEach((a, i) => { const other = this.actors[1 - i]; if (a.lock <= 0)
            a.face = other.x >= a.x ? 1 : -1; this.updateActor(a, i, inputs[i], dt); });
        if(this.learningRequest) return;
        const [a, b] = this.actors;
        const overlap = 70 - Math.abs(a.x - b.x);
        if (overlap > 0 && Math.abs(a.y - b.y) < 125) {
            const dir = a.x <= b.x ? 1 : -1;
            a.x = clamp(a.x - dir * overlap / 2, 65, 935);
            b.x = clamp(b.x + dir * overlap / 2, 65, 935);
            // Transfer separation blocked by a wall to the other fighter.
            const remaining = 70 - Math.abs(a.x - b.x);
            if (remaining > 0) {
                if (a.x === 65 || a.x === 935) b.x = clamp(b.x + dir * remaining, 65, 935);
                else a.x = clamp(a.x - dir * remaining, 65, 935);
            }
        }
        // Collect both strikes before resolving damage so player order cannot cancel a trade.
        const strikes = [];
        for (let i = 0; i < 2; i++) {
            const f = this.actors[i];
            if ((f.pose === 'punch' || f.pose === 'kick') && !f.didHit) {
                const active = f.pose === 'punch' ? .10 : .18;
                if (f.elapsed >= active && f.elapsed <= active + .08) {
                    const target = this.actors[1 - i];
                    const reach = f.pose === 'punch' ? 128 : 163;
                    const delta = (target.x - f.x) * f.face;
                    if (delta > 0 && delta < reach && Math.abs(target.y - f.y) < 100) {
                        f.didHit = true;
                        strikes.push({ owner: i, damage: f.pose === 'punch' ? 7 : 10 });
                    }
                }
            }
        }
        for (const strike of strikes) this.hit(strike.owner, strike.damage, 30, false);
        for (const e of this.effects)
            this.updateEffect(e, dt);
        this.effects = this.effects.filter(e => e.age < e.delay + e.life && e.x > -150 && e.x < 1150);
        this.previous = inputs.map(i => ({ ...i }));
        if (this.time <= 0 || this.actors.some(a => a.hp <= 0))
            this.finishRound();
    }
    updateActor(a, i, input, dt) {
        if(this.learningRequest) return;
        a.internalDamage=Math.max(0,a.internalDamage-dt);
        a.elapsed += dt;
        a.rollCooldown=Math.max(0,a.rollCooldown-dt);
        a.studyCooldown=Math.max(0,a.studyCooldown-dt);
        if(a.rollTime>0) {
            a.rollTime=Math.max(0,a.rollTime-dt);
            a.x=clamp(a.x+a.rollDir*520*dt,65,935);
            a.invuln=a.rollTime>.12?.04:0;
            a.pose='roll'; a.lock=a.rollTime;
            if(a.rollTime===0){a.pose='idle';a.lock=0;}
            return;
        }
        a.cooldown = Math.max(0, a.cooldown - dt);
        a.invuln = Math.max(0, a.invuln - dt);
        a.energy = this.options.mode === 'practice' ? 100 : clamp(a.energy + dt * 4, 0, 100);
        if (this.options.mode === 'practice' && a.recovery > 0) {
            a.recovery = Math.max(0, a.recovery - dt);
            if (a.recovery === 0) a.hp = 100;
        }
        a.comboTime -= dt;
        if (a.comboTime <= 0)
            a.combo = 0;
        a.moving = false;
        if (a.y > 0 || a.vy > 0) {
            a.y += a.vy * dt;
            a.vy -= 1550 * dt;
            if (a.y <= 0) {
                a.y = 0;
                a.vy = 0;
            }
        }
        if (a.lock > 0) {
            a.lock -= dt;
            if (a.lock <= 0) {
                a.pose = a.y > 0 ? 'jump' : 'idle';
                a.elapsed = 0;
            }
            if (a.lock > 0) return;
        }
        const edge = key => this.buffered[i][key] > 0;
        const consume = () => { this.buffered[i] = {}; };
        if(edge('roll') && a.rollCooldown<=0 && a.y===0) {
            consume();a.rollTime=.42;a.rollCooldown=1.5;a.rollDir=input.left?-1:input.right?1:-a.face;
            a.pose='roll';a.elapsed=0;a.invuln=.04;a.lock=.42;return;
        }
        if (input.block && a.y === 0) {
            a.pose = 'block';
            return;
        }
        if (edge('ultimate') && a.energy >= 100) {
            consume();
            if(!this.canStudy(i,'ultimate')) return;
            a.energy = 0;
            this.cast(i, true);
            return;
        }
        if (edge('special') && a.energy >= 20 && a.cooldown === 0) {
            consume();
            if(!this.canStudy(i,'special')) return;
            a.energy -= 20;
            a.cooldown = 2.2;
            this.cast(i, false);
            return;
        }
        if (edge('punch') || edge('kick')) {
            const kick = !!edge('kick');
            consume();
            a.pose = kick ? 'kick' : 'punch';
            a.elapsed = 0;
            a.lock = kick ? .55 : .34;
            a.didHit = false;
            return;
        }
        if (edge('jump') && a.y === 0) {
            consume();
            a.vy = 650;
            a.y = .01;
        }
        if (input.crouch && a.y === 0) {
            a.pose = 'crouch';
            return;
        }
        const direction = Number(!!input.right) - Number(!!input.left);
        let slow = 1;
        for (const e of this.effects) {
            if (e.owner !== i && e.theme === 'photon' && e.kind === 'zone' && e.age >= e.delay && Math.abs(e.x - a.x) < e.radius && a.y < 70)
                slow = .55;
        }
        a.x = clamp(a.x + direction * a.def.speed * dt * slow, 65, 935);
        a.moving = direction !== 0;
        a.pose = a.y > 0 ? 'jump' : direction ? 'walk' : 'idle';
    }
    hit(owner, damage, push, superHit) {
        const a = this.actors[owner], b = this.actors[1 - owner];
        if (b.invuln > 0 || b.hp <= 0)
            return false;
        const blocking = b.pose === 'block' && (a.x - b.x) * b.face > 0;
        const amount = damage * a.def.power * (blocking ? .18 : 1);
        b.hp = clamp(b.hp - amount, this.options.mode === 'practice' ? 1 : 0, 100);
        b.recovery = 3;
        b.energy = clamp(b.energy + (blocking ? 4 : 7), 0, 100);
        a.energy = clamp(a.energy + (blocking ? 2 : 7), 0, 100);
        b.x = clamp(b.x + Math.sign(b.x - a.x) * push * (blocking ? .3 : 1), 65, 935);
        b.invuln = blocking ? .13 : .24;
        if (!blocking) {
            b.pose = 'hurt';
            b.elapsed = 0;
            b.lock = superHit ? .25 : .2;
            a.combo = a.comboTime > 0 ? a.combo + 1 : 1;
            a.comboTime = 1.2;
        }
        this.burst(b.x, FLOOR - b.y - 90, blocking ? '#a8d6ff' : a.def.color, blocking ? 8 : 18);
        this.shake = blocking ? 1 : superHit ? 7 : 3;
        this.hitstop = blocking ? .015 : .045;
        this.events.push({ type: blocking ? 'block' : 'hit', owner });
        return true;
    }
    effect(owner, kind, theme, overrides = {}) { const a = this.actors[owner]; const e = { kind, theme, owner, x: a.x + a.face * 65, y: FLOOR - a.y - 95, originX: a.x, originY: FLOOR - a.y - 95, vx: a.face * 430, vy: 0, age: 0, delay: 0, life: 2, radius: 19, damage: 13, ultimate: false, hit: false, returnHit: false, angle: 0, color: a.def.color, ...overrides }; this.effects.push(e); return e; }
    cast(owner, ultimate) {
        const a = this.actors[owner], b = this.actors[1 - owner], kind = ultimate ? a.def.ultimate.kind : a.def.special.kind;
        this.castCaption={name:ultimate?a.def.ultimate.name:a.def.special.name,player:owner,ultimate,color:a.def.color};this.castCaptionTime=1.35;
        a.pose = ultimate ? 'ultimate' : 'special';
        a.elapsed = 0;
        a.lock = ultimate ? .85 : .5;
        a.didHit = true;
        this.events.push({ type: ultimate ? 'super' : 'cast', owner });
        this.announce((owner === 0 ? '1P · ' : '2P · ') + (ultimate ? a.def.ultimate.name : a.def.special.name));
        SKILLS[kind](this, owner, ultimate, a, b);
    }
    updateEffect(e, dt) {
        e.age += dt;
        if (e.age < e.delay)
            return;
        const t = e.age - e.delay, b = this.actors[1 - e.owner];
        if (e.kind === 'bolt') {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            if (e.ultimate && e.theme === 'photon')
                e.y = e.originY + Math.sin(t * 5) * 55;
            if (!e.hit && Math.abs(e.x - b.x) < e.radius + 30 && Math.abs(e.y - (FLOOR - b.y - (b.pose === 'crouch' ? 42 : 85))) < e.radius + (b.pose === 'crouch' ? 30 : 62)) {
                if (this.hit(e.owner, e.damage, 22, e.ultimate)) {
                    e.hit = true;
                    e.age = e.delay + e.life;
                }
            }
        }
        if (e.kind === 'drop') {
            e.vy += 1100 * dt;
            e.y += e.vy * dt;
            if (!e.hit && Math.abs(e.x - b.x) < 55 && Math.abs(e.y - (FLOOR - b.y - 70)) < 80) {
                if (this.hit(e.owner, e.damage, 25, false))
                    e.hit = true;
            }
            if (e.y > FLOOR) {
                this.burst(e.x, FLOOR, e.color);
                e.age = e.delay + e.life;
            }
        }
        if (e.kind === 'orbit') {
            const phase = t / e.life * Math.PI * 2;
            e.x = e.originX + Math.sin(phase / 2) * 460 * e.vx;
            e.y = e.originY + Math.sin(phase) * 50;
            const returning = t > e.life / 2;
            if (Math.abs(e.x - b.x) < 50 && Math.abs(e.y - (FLOOR - b.y - 85)) < 68 && !(returning ? e.returnHit : e.hit)) {
                if (this.hit(e.owner, e.damage, 18, e.ultimate)) {
                    if (returning)
                        e.returnHit = true;
                    else
                        e.hit = true;
                }
            }
        }
        if (e.kind === 'zone') {
            if (e.theme === 'gravity' && b.y < 60 && Math.abs(b.x - e.x) < e.radius) {
                b.x = clamp(b.x + Math.sign(e.x - b.x) * 120 * dt, 65, 935);
            }
            const active = e.theme === 'gravity' ? t > e.life - .25 : true;
            if (active && !e.hit && Math.abs(b.x - e.x) < e.radius + 24 && b.y < (e.theme === 'interference' ? 190 : 75)) {
                if (this.hit(e.owner, e.damage, 25, e.ultimate))
                    e.hit = true;
            }
        }
    }
    think(dt) {
        this.aiTimer -= dt;
        if (this.aiTimer > 0)
            return this.aiInput;
        const difficulty = this.options.difficulty;
        this.aiTimer = difficulty === 'easy' ? .30 : difficulty === 'hard' ? .12 : .21;
        const a = this.actors[1], b = this.actors[0], distance = Math.abs(a.x - b.x), dir = a.x < b.x ? 'right' : 'left', away = dir === 'right' ? 'left' : 'right', r = this.random();
        const input = {};
        const danger = this.effects.some(e => e.owner === 0 && Math.abs(e.x - a.x) < 180);
        if ((danger || distance < 155 && (b.pose === 'punch' || b.pose === 'kick')) && r < (difficulty === 'easy' ? .28 : .65)) {
            if (danger && this.random() > .35)
                input.jump = true;
            else
                input.block = true;
        }
        else if ((!this.options.learning || a.permits.ultimate) && a.energy >= 100 && distance < 550 && r > .35)
            input.ultimate = true;
        else if (distance < 140) {
            if (r < .35)
                input.punch = true;
            else if (r < .65)
                input.kick = true;
            else if (r < .8)
                input[away] = true;
            else
                input.jump = true;
        }
        else if ((!this.options.learning || a.permits.special) && a.energy >= 20 && a.cooldown <= 0 && distance < 650 && r < .46)
            input.special = true;
        else if (r < .88)
            input[dir] = true;
        if (distance > 170 && r > .91)
            input.jump = true;
        // Release attacks between decisions so the same action can be pressed again.
        for (const key of ['punch', 'kick', 'special', 'ultimate', 'jump'])
            if (this.aiInput[key] && input[key])
                input[key] = false;
        this.aiInput = input;
        return input;
    }
}
// Registry keeps new skill behaviors independent of the combat loop.
const SKILLS = {
    gravity: (m, o, u, a, b) => { if (u)
        m.effect(o, 'zone', 'gravity', { x: b.x, y: FLOOR, delay: .6, life: 1.5, radius: 185, damage: 34, ultimate: true });
    else
        m.effect(o, 'drop', 'gravity', { x: b.x, y: 105, delay: .5, life: 2, damage: 17, radius: 25, vx: 0 }); },
    coil: (m, o, u, a) => { for (let i = 0; i < (u ? 3 : 1); i++)
        m.effect(o, 'zone', 'coil', { x: clamp(a.x + a.face * (140 + i * 175), 80, 920), y: FLOOR, delay: .65 + i * .26, life: u ? .6 : 2.3, radius: u ? 70 : 60, damage: u ? 15 : 15, ultimate: u }); },
    orbit: (m, o, u, a) => { for (let i = 0; i < (u ? 3 : 1); i++)
        m.effect(o, 'orbit', 'orbit', { originX: a.x, originY: FLOOR - a.y - 90 - i * 37, vx: a.face, delay: i * .24, life: 2, damage: u ? 9 : 11, ultimate: u }); },
    interference: (m, o, u, a) => { if (u) {
        for (let i = 0; i < 5; i++)
            m.effect(o, 'zone', 'interference', { x: 100 + i * 200, y: FLOOR, delay: .8 + (i % 2) * .35, life: .65, radius: 52, damage: 20, ultimate: true });
    }
    else
        for (let i = 0; i < 2; i++)
            m.effect(o, 'bolt', 'interference', { y: FLOOR - a.y - 70 - i * 55, damage: 8, delay: i * .16, vx: a.face * 350 }); },
    energy: (m, o, u, a, b) => { if (u) {
        ['#ff789b', '#8de6ff', '#a995ff', '#e3b1ff'].forEach((color, i) => m.effect(o, 'bolt', 'energy', { delay: .3 + i * .23, damage: 10, vx: a.face * (450 + i * 30), y: FLOOR - a.y - 70 - i * 18, color, ultimate: true }));
    }
    else {
        const before = a.x;
        const limit = b.x - a.face * 80;
        a.x = clamp(a.face === 1 ? Math.min(a.x + 175, limit) : Math.max(a.x - 175, limit), 65, 935);
        m.burst(before, FLOOR - a.y - 70, a.def.color, 24);
        m.effect(o, 'bolt', 'energy', { vx: a.face * 480, damage: 10 });
    } },
    photon: (m, o, u, a, b) => { if (u) {
        m.effect(o, 'zone', 'photon', { x: b.x, y: FLOOR, delay: .4, life: 2.5, radius: 190, damage: 6, ultimate: true });
        for (let i = 0; i < 4; i++)
            m.effect(o, 'bolt', 'photon', { delay: .5 + i * .3, vx: a.face * 440, damage: 9, ultimate: true });
    }
    else
        m.effect(o, 'bolt', 'photon', { vx: a.face * 620, radius: 15, damage: 13 }); },
};

Object.assign(globalThis.PhysicsArena, { WIDTH, HEIGHT, FLOOR, ACTIONS, Match, SKILLS });
})();

