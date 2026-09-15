import '../game/roster.js';
import '../game/engine.js';
import '../game/input.js';
import '../game/learning.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { Match, SKILLS } = globalThis.PhysicsArena;
const { FIGHTERS } = globalThis.PhysicsArena;
const { Inputs, DEFAULT_BINDINGS } = globalThis.PhysicsArena;

test('random quiz is independent of attack buttons and freezes the battle',()=>{
 const m=setup();m.options.learning=true;m.quizTimer=.05;
 m.step(1/60,[{ultimate:true},{}]);assert.equal(m.learningRequest,null);
 run(m,.1);assert.ok(m.learningRequest.race);assert.equal(m.paused,true);
 const time=m.time;run(m,2);assert.equal(m.time,time);
});
test('race winner automatically casts once on resume without input, including CPU',()=>{
 for(const winner of [0,1])for(const action of ['special','ultimate']){
 const m=setup();m.options.learning=true;m.options.mode='cpu';m.paused=true;m.learningRequest={race:true,action};
 m.actors[winner].rollTime=.3;m.actors[winner].lock=.5;m.actors[winner].cooldown=2;
 m.finishLearningRace(winner);m.step(1/60);assert.equal(m.castCaption,null);
 m.paused=false;m.step(1/60);assert.equal(m.castCaption.player,winner);assert.equal(m.castCaption.ultimate,action==='ultimate');assert.equal(m.pendingQuizCast,null);assert.equal(m.actors[winner].rollTime,0);
 const casts=m.events.filter(e=>['cast','super'].includes(e.type)).length;
 m.step(1/60);assert.equal(m.events.filter(e=>['cast','super'].includes(e.type)).length,casts);
 assert.equal(m.canStudy(winner,action),false);
 }
});

test('manual skill keys are absent and cannot trigger learned combat skills',()=>{
 for(const binding of DEFAULT_BINDINGS){assert.equal(binding.special,undefined);assert.equal(binding.ultimate,undefined);}
 const m=setup();m.options.learning=true;m.actors[0].energy=100;run(m,.2,[{special:true,ultimate:true},{}]);assert.equal(m.effects.length,0);assert.equal(m.learningRequest,null);
});

test('wrong answer injury is five HP, nonlethal and animates even through invulnerability',()=>{
 const m=setup();m.actors[0].invuln=10;assert.equal(m.studyInjury(0),5);assert.equal(m.actors[0].hp,95);assert.ok(m.actors[0].internalDamage>0);
 m.actors[0].hp=3;assert.equal(m.studyInjury(0),2);assert.equal(m.actors[0].hp,1);
});
test('same question race accepts first correct only and disallows guessing again',()=>{
 const q={answer:1};const r=new PhysicsArena.LearningRace(q);
 assert.equal(r.answer(0,0),true);assert.equal(r.answer(0,1),false);assert.equal(r.answer(1,1),true);assert.equal(r.winner,1);assert.equal(r.answer(0,2),false);
 const tie=new PhysicsArena.LearningRace(q);tie.answer(1,1);tie.answer(0,1);assert.equal(tie.winner,1);
});
test('no answer times out without any injury event or reward',()=>{
 const r=new PhysicsArena.LearningRace({answer:0});r.step(11);assert.equal(r.done,true);assert.equal(r.winner,null);assert.equal(r.events.length,0);
 const m=setup();m.learningRequest={action:'special'};m.finishLearningRace(null);assert.equal(m.actors[0].hp,100);assert.equal(m.actors[0].permits.special,false);
});
test('CPU responds after thought delay and samples approximately 70 percent correct',()=>{
 let seed=7632;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let correct=0;
 for(let i=0;i<10000;i++){const r=new PhysicsArena.LearningRace({answer:1},{mode:'cpu',random});r.step(2);assert.equal(r.answers[1],null);r.step(4);assert.ok(r.answers[1]);if(r.answers[1].correct)correct++;}
 assert.ok(correct>6800&&correct<7200,`CPU correct ${correct}/10000`);
});
test('casting records readable move caption',()=>{const m=setup();m.cast(0,true);assert.equal(m.castCaption.name,m.actors[0].def.ultimate.name);assert.ok(m.castCaptionTime>1);});

test('roll evades early hits but has vulnerable recovery and cannot be held to repeat',()=>{
 const m=setup();const a=m.actors[0];m.step(1/60,[{roll:true,right:true},{}]);assert.equal(a.pose,'roll');assert.equal(m.hit(1,10,0,false),false);
 const x=a.x;run(m,.33,[{roll:true},{}]);assert.ok(a.x>x);assert.equal(m.hit(1,10,0,false),true);
 run(m,2,[{roll:true},{}]);assert.notEqual(a.pose,'roll');assert.ok(a.x<=935);
});
test('every character has three explained questions with valid shuffled answers',()=>{
 for(const f of FIGHTERS){const ids=new Set();for(let i=0;i<3;i++){const q=PhysicsArena.nextQuestion(f.id);ids.add(q.id);assert.equal(q.choices.length,3);assert.ok(q.choices[q.answer]);assert.ok(q.explanation.length>15);}assert.equal(ids.size,3);}
});

test('short keyboard and touch taps survive between frames and HUD reads do not consume them', () => {
  const input = new Inputs(DEFAULT_BINDINGS);
  input.pressKey('KeyJ'); input.keys.delete('KeyJ');
  input.pressPointer(7, { player: 0, action: 'kick' }); input.pointers.delete(7);
  assert.equal(input.read(false)[0].punch, true);
  const frame = input.read(); assert.equal(frame[0].punch, true); assert.equal(frame[0].kick, true);
  assert.equal(input.read()[0].punch, false); assert.equal(input.read()[0].kick, false);
  input.pressKey('KeyU'); input.clear(); assert.equal(Boolean(input.read()[0].special), false);
});
function setup(p1 = 'newton', p2 = 'faraday') { const m = new Match({ p1, p2, mode: 'local', difficulty: 'normal', seed: 7 }); m.phase = 'fight'; return m; }
function run(m, seconds, input = [{}, {}]) { for (let n = 0; n < Math.ceil(seconds * 60); n++)
    m.step(1 / 60, input); }
test('all six fighters have unique identities and implemented skill handlers', () => { assert.equal(FIGHTERS.length, 6); assert.equal(new Set(FIGHTERS.map(f => f.id)).size, 6); for (const f of FIGHTERS) {
    assert.ok(SKILLS[f.special.kind]);
    assert.ok(SKILLS[f.ultimate.kind]);
} });
test('movement stays inside arena; jumps land', () => { const m = setup(); run(m, 4, [{ left: true }, {}]); assert.equal(m.actors[0].x, 65); m.step(1 / 60, [{ jump: true }, {}]); assert.ok(m.actors[0].y > 0); run(m, 2); assert.equal(m.actors[0].y, 0); assert.equal(m.actors[0].vy, 0); });
test('melee has startup, hits once per press, and respects range', () => { const m = setup(); m.actors[0].x = 400; m.actors[1].x = 500; m.step(1 / 60, [{ punch: true }, {}]); assert.equal(m.actors[1].hp, 100); run(m, .14, [{ punch: true }, {}]); assert.ok(m.actors[1].hp < 100); const hp = m.actors[1].hp; run(m, 1, [{ punch: true }, {}]); assert.equal(m.actors[1].hp, hp); const far = setup(); run(far, .5, [{ kick: true }, {}]); assert.equal(far.actors[1].hp, 100); });
test('facing defense reduces damage but does not grant unlimited invincibility', () => { const m = setup(); m.actors[0].x = 400; m.actors[1].x = 500; m.actors[1].pose = 'block'; m.actors[1].face = -1; m.hit(0, 10, 0, false); assert.ok(m.actors[1].hp > 97 && m.actors[1].hp < 100); const hp = m.actors[1].hp; m.hit(0, 10, 0, false); assert.equal(m.actors[1].hp, hp); run(m, .3); m.hit(0, 10, 0, false); assert.ok(m.actors[1].hp < hp); });
test('specials enforce energy and cooldown; ultimates require full meter', () => { const m = setup(); m.actors[0].energy = 0; m.step(1 / 60, [{ special: true }, {}]); assert.equal(m.effects.length, 0); run(m, .1); m.actors[0].energy = 50; m.step(1 / 60, [{ special: true }, {}]); assert.ok(m.effects.length > 0); assert.ok(m.actors[0].energy < 31); assert.ok(m.actors[0].cooldown > 2); run(m, .65); const n = m.effects.length; m.step(1 / 60, [{ special: true }, {}]); assert.equal(m.effects.length, n); m.actors[0].energy = 99; m.actors[0].lock = 0; m.step(1 / 60, [{ ultimate: true }, {}]); assert.notEqual(m.actors[0].pose, 'ultimate'); m.step(1 / 60, [{}, {}]); m.actors[0].energy = 100; m.step(1 / 60, [{ ultimate: true }, {}]); assert.equal(m.actors[0].pose, 'ultimate'); assert.equal(m.actors[0].energy, 0); });
test('every special and ultimate can damage an opponent', () => { for (const f of FIGHTERS)
    for (const ultimate of [false, true]) {
        const m = setup(f.id);
        m.actors[0].x = 330;
        m.actors[1].x = ultimate && f.id === 'young' ? 500 : f.id === 'faraday' ? 470 : 550;
        m.actors[0].face = 1;
        m.cast(0, ultimate);
        run(m, 3);
        assert.ok(m.actors[1].hp < 100, `${f.id} ${ultimate ? 'ultimate' : 'special'} should hit`);
        assert.ok(m.actors[1].hp >= 0);
    } });
test('gravity warning can be escaped before impact', () => { const m = setup(); m.cast(0, false); run(m, 1.5, [{}, { left: true }]); assert.equal(m.actors[1].hp, 100); });
test('pause freezes timers, movement, and effects', () => { const m = setup(); m.cast(0, false); m.paused = true; const before = JSON.stringify({ actors: m.actors, effects: m.effects, time: m.time }); run(m, 1, [{ right: true }, {}]); assert.equal(JSON.stringify({ actors: m.actors, effects: m.effects, time: m.time }), before); });
test('two round wins finish match, while draws do not award a win', () => { const m = setup(); m.actors[1].hp = 0; m.finishRound(); assert.equal(m.phase, 'roundOver'); assert.equal(m.actors[0].wins, 1); run(m, 5.3); assert.equal(m.phase, 'fight'); assert.equal(m.actors[0].wins, 1); assert.equal(m.actors[1].hp, 100); m.actors[1].hp = 0; m.finishRound(); assert.equal(m.phase, 'matchOver'); assert.equal(m.winner, 0); const draw = setup(); draw.time = 0; draw.step(1 / 60); assert.equal(draw.winner, null); assert.deepEqual(draw.actors.map(a => a.wins), [0, 0]); });
test('all 36 ordered pairings simulate without invalid numbers or stuck rounds', () => { for (const a of FIGHTERS)
    for (const b of FIGHTERS) {
        const m = new Match({ p1: a.id, p2: b.id, mode: 'cpu', difficulty: 'hard', seed: 1 });
        for (let n = 0; n < 4500 && m.phase !== 'matchOver'; n++) {
            m.step(1 / 60, [{ right: n % 300 < 110, punch: n % 31 === 0, kick: n % 43 === 0, special: n % 150 === 0, ultimate: n % 250 === 0, jump: n % 210 === 0 }, {}]);
            for (const f of m.actors) {
                assert.ok(Number.isFinite(f.x) && Number.isFinite(f.hp) && Number.isFinite(f.energy));
                assert.ok(f.hp >= 0 && f.hp <= 100);
            }
        }
        assert.ok(m.round > 1 || m.phase === 'matchOver', `${a.id}/${b.id} should finish a round`);
    } });
test('touch and keyboard inputs coexist and clear on focus loss', () => { const inputs = new Inputs(DEFAULT_BINDINGS); inputs.keys.add('KeyD'); inputs.pointers.set(1, { player: 0, action: 'jump' }); inputs.pointers.set(2, { player: 0, action: 'punch' }); assert.ok(inputs.read()[0].right && inputs.read()[0].jump && inputs.read()[0].punch); inputs.pointers.delete(1); assert.ok(!inputs.read()[0].jump && inputs.read()[0].punch); inputs.clear(); assert.ok(Object.values(inputs.read()[0]).every(v => !v)); });

test('simultaneous melee trades fairly, including a double knockout', () => {
    for (const health of [100, 1]) {
        const m = setup('newton', 'newton');
        m.actors[0].x = 400; m.actors[1].x = 500;
        for (const a of m.actors) a.hp = health;
        run(m, .15, [{ punch: true }, { punch: true }]);
        assert.equal(m.actors[0].hp, m.actors[1].hp);
        assert.ok(m.actors[0].hp < health);
        if (health === 1) {
            assert.equal(m.winner, null);
            assert.deepEqual(m.actors.map(a => a.wins), [0, 0]);
        }
    }
});

test('a tap near the end of recovery executes once; early taps expire', () => {
    const m = setup();
    m.actors[0].lock = .06;
    m.actors[0].pose = 'hurt';
    m.step(1 / 60, [{ kick: true }, {}]);
    run(m, .07);
    assert.equal(m.actors[0].pose, 'kick');
    run(m, .7);
    assert.equal(m.actors[0].pose, 'idle');
    const early = setup();
    early.actors[0].lock = .4;
    early.actors[0].pose = 'hurt';
    early.step(1 / 60, [{ kick: true }, {}]);
    run(early, .5);
    assert.equal(early.actors[0].pose, 'idle');
});

test('a brief input during hitstop is retained after the freeze', () => {
    const m = setup();
    m.hitstop = .045;
    m.step(1 / 60, [{ punch: true }, {}]);
    run(m, .06);
    assert.equal(m.actors[0].pose, 'punch');
});

test('melee retains an active window when an opponent moves into reach', () => {
    const m = setup();
    m.actors[0].x = 400; m.actors[1].x = 550;
    m.step(1 / 60, [{ punch: true }, {}]);
    run(m, .12);
    assert.equal(m.actors[1].hp, 100);
    m.actors[1].x = 510;
    m.step(1 / 60);
    assert.ok(m.actors[1].hp < 100);
});

test('body separation remains complete at either arena wall', () => {
    for (const [x1, x2] of [[65, 100], [900, 935], [935, 900], [100, 65]]) {
        const m = setup();
        m.actors[0].x = x1; m.actors[1].x = x2;
        m.step(1 / 60);
        assert.ok(Math.abs(m.actors[0].x - m.actors[1].x) >= 70);
        for (const a of m.actors) assert.ok(a.x >= 65 && a.x <= 935);
    }
});

test('invalid or zero time steps cannot mutate or poison the simulation', () => {
    const m = setup();
    const before = JSON.stringify(m);
    for (const dt of [NaN, Infinity, -Infinity, -1, 0]) m.step(dt, [{ right: true }, {}]);
    assert.equal(JSON.stringify(m), before);
});

test('practice has unlimited time and meter and an idle opponent', () => {
    const m = new Match({ p1: 'newton', p2: 'faraday', mode: 'practice', seed: 7 });
    m.phase = 'fight';
    assert.deepEqual(m.actors.map(a => a.energy), [100, 100]);
    m.step(1 / 60, [{ ultimate: true }, { special: true, left: true, punch: true }]);
    assert.equal(m.actors[0].pose, 'ultimate');
    assert.equal(m.actors[1].pose, 'idle');
    assert.equal(m.actors[1].x, 740);
    m.step(1 / 60);
    assert.equal(m.actors[0].energy, 100);
    m.effects = [];
    run(m, 65, [{}, { left: true, punch: true }]);
    assert.equal(m.time, 60);
    assert.equal(m.phase, 'fight');
    assert.equal(m.actors[1].x, 740);
    assert.equal(m.actors[0].hp, 100);
});

test('practice prevents knockout and restores health after three quiet seconds', () => {
    const m = new Match({ p1: 'newton', p2: 'faraday', mode: 'practice', seed: 7 });
    m.phase = 'fight';
    m.hit(0, 200, 0, false);
    assert.equal(m.actors[1].hp, 1);
    run(m, 2);
    assert.equal(m.actors[1].hp, 1);
    assert.equal(m.phase, 'fight');
    m.hit(0, 20, 0, false);
    run(m, 2);
    assert.equal(m.actors[1].hp, 1);
    run(m, 1.2);
    assert.equal(m.actors[1].hp, 100);
    assert.deepEqual(m.actors.map(a => a.wins), [0, 0]);
});

test('new rounds discard hitstop and buffered actions', () => {
    const m = setup();
    m.hitstop = .045;
    m.step(1 / 60, [{ ultimate: true }, {}]);
    m.nextRound();
    assert.equal(m.hitstop, 0);
    assert.deepEqual(m.buffered, [{}, {}]);
});
