(() => {
'use strict';
const { FIGHTERS, getFighter } = globalThis.PhysicsArena;
const { Match, ACTIONS } = globalThis.PhysicsArena;
const { Renderer } = globalThis.PhysicsArena;
const { Inputs, DEFAULT_BINDINGS, ACTION_LABELS, keyLabel } = globalThis.PhysicsArena;
const { GameAudio } = globalThis.PhysicsArena;

const app = document.querySelector('#app');
const screen = document.querySelector('#screen');
const guide = document.querySelector('#guide');
const quiz = document.querySelector('#quiz');
let quizState = null;
const guideBody = document.querySelector('#guide-body');
const cloneBindings = () => DEFAULT_BINDINGS.map(b => ({ ...b }));
const state = { picks: [0, 1], target: 0, mode: 'cpu', difficulty: 'normal', muted: false, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, bindings: cloneBindings(), guideTab: 'moves', capture: null, keyError: '' };
let battle = null;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = name => {
  const paths = { arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', back: '<path d="M19 12H5m6-6-6 6 6 6"/>', play: '<path d="m8 5 11 7-11 7Z"/>', pause: '<path d="M8 5v14M16 5v14"/>', full: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>', sound: '<path d="m11 4-6 5H2v6h3l6 5Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>', mute: '<path d="m11 4-6 5H2v6h3l6 5Zm5 5 5 6m0-6-5 6"/>', keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1m3 0h1M7 16h10"/>' };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};
function savePreferences() { try { localStorage.setItem('physics-muted', String(state.muted)); localStorage.setItem('physics-reduced-motion', String(state.reducedMotion)); localStorage.setItem('physics-bindings', JSON.stringify(state.bindings)); } catch { /* Storage is optional. */ } }
function validCode(code) { return /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Comma|Period|Slash|Semicolon|Quote|Bracket(Left|Right)|Minus|Equal|Backslash)$/.test(code); }
try {
  if (localStorage.getItem('physics-reduced-motion') !== null) state.reducedMotion = localStorage.getItem('physics-reduced-motion') === 'true';
  state.muted = localStorage.getItem('physics-muted') === 'true';
  let saved = JSON.parse(localStorage.getItem('physics-bindings') || 'null');
  if(Array.isArray(saved) && saved.length===2) saved=saved.map((b,i)=>Object.fromEntries(ACTIONS.map(a=>[a,b[a]||DEFAULT_BINDINGS[i][a]])));
  if (Array.isArray(saved) && saved.length === 2 && saved.every(b => b && ACTIONS.every(a => typeof b[a] === 'string' && validCode(b[a]))) && new Set(saved.flatMap(b => ACTIONS.map(a => b[a]))).size === ACTIONS.length * 2) state.bindings = saved;
} catch { /* Use defaults when storage is unavailable. */ }
function spriteStyle(f) { return `background-image:url('${f.sprite.src}');background-size:${f.sprite.columns * 100}% ${f.sprite.rows * 100}%;background-position:${f.sprite.columns > 1 ? f.sprite.column / (f.sprite.columns - 1) * 100 : 0}% 0%`; }
function renderSelection() {
  stopBattle(); app.classList.remove('playing'); document.documentElement.classList.toggle('low-motion', state.reducedMotion);
  const pick = state.picks[state.target], f = FIGHTERS[pick];
  screen.innerHTML = `<section class="select-screen">
    <div class="section-top"><div><p class="eyebrow">THE MINDS. THE MOVES.</p><h1>選擇你的<span>物理傳奇</span></h1></div><div class="mode-tabs" role="group" aria-label="對戰模式"><button class="mode-tab ${state.mode === 'cpu' ? 'active' : ''}" data-command="mode" data-mode="cpu" aria-pressed="${state.mode === 'cpu'}">單人挑戰</button><button class="mode-tab ${state.mode === 'local' ? 'active' : ''}" data-command="mode" data-mode="local" aria-pressed="${state.mode === 'local'}">雙人對戰</button><button class="mode-tab ${state.mode === 'practice' ? 'active' : ''}" data-command="mode" data-mode="practice" aria-pressed="${state.mode === 'practice'}">練習教室</button></div></div>
    <div class="selection-layout"><div class="portrait-stage" style="--fighter:${f.color}"><div class="stage-index">${String(pick + 1).padStart(2, '0')} / ${String(FIGHTERS.length).padStart(2, '0')}</div><span class="portrait-field">${f.discipline}</span><div class="formula">${f.formula}</div><div role="img" aria-label="${f.name}卡通格鬥角色" class="big-sprite sprite" style="${spriteStyle(f)}"></div><div class="portrait-caption"><span>${f.english}</span><h2>${f.name}</h2><p>${f.title} <span class="years">／ ${f.years}</span></p></div></div>
    <div class="selection-info"><div class="player-selectors">${state.picks.map((index, i) => `<button data-command="target" data-player="${i}" class="${state.target === i ? 'active' : ''}" aria-pressed="${state.target === i}"><span class="player-tag tag-${i}">${i === 0 ? '1P' : state.mode === 'practice' ? '練習靶' : state.mode === 'cpu' ? 'CPU' : '2P'}</span><strong>${FIGHTERS[index].name}</strong><span class="change-label">${state.target === i ? '選擇中' : '更換'}</span></button>`).join('')}</div>
    <p class="eyebrow roster-label">${state.target === 0 ? 'PLAYER 01 — 選擇你的角色' : state.mode === 'cpu' ? 'CPU OPPONENT — 選擇對手' : 'PLAYER 02 — 選擇對手'}</p>
    <div class="roster-grid">${FIGHTERS.map((c, i) => `<button aria-label="選擇${c.name}" aria-pressed="${pick === i}" class="fighter-card ${pick === i ? 'chosen' : ''}" data-command="fighter" data-index="${i}" style="--fighter:${c.color}"><span class="card-number">${String(i + 1).padStart(2, '0')}</span><span class="mini-sprite sprite" style="${spriteStyle(c)}"></span><strong>${c.name}</strong><small>${c.discipline}</small></button>`).join('')}</div>
    <div class="moves-preview"><p class="eyebrow">${f.style}</p><h3>${f.special.name} <span>／</span> ${f.ultimate.name}</h3><p>${f.fact}</p></div>
    ${state.mode === 'cpu' ? `<div class="difficulty-row"><span>電腦難度</span><div class="difficulty-tabs" role="group" aria-label="電腦難度">${[['easy', '入門'], ['normal', '標準'], ['hard', '挑戰']].map(([id, text]) => `<button class="${state.difficulty === id ? 'active' : ''}" aria-pressed="${state.difficulty === id}" data-command="difficulty" data-difficulty="${id}">${text}</button>`).join('')}</div></div>` : state.mode === 'practice' ? '<p class="local-tip">不限時・能量補滿・對手不攻擊。跟著提示熟悉八種基本動作。</p>' : '<p class="local-tip">兩人共用鍵盤。隨機搶答：1P 用 J／K／L、2P 用 1／2／3 選 A／B／C；可自訂按鍵。</p>'}
    <button class="start-button" data-command="start"><span>${state.mode === 'practice' ? '開始練習' : '開始對戰'} <small>${state.mode === 'practice' ? 'TRAINING' : 'FIGHT!'}</small></span>${icon('arrow')}</button><button class="input-hint help-link" data-command="keys">${icon('keyboard')} 查看操作 / 自訂按鍵</button></div></div>
    <div class="selection-key-summary"><span><b>1P</b> W A S D 移動 · J 拳 · K 踢 · L 防 · O 翻滾</span><span><b>2P</b> ↑ ← ↓ → 移動 · 1 拳 · 2 踢 · 3 防 · 6 翻滾</span><small>上列為預設按鍵，可在「操作設定」更換；對戰時會顯示目前設定。</small></div>
    <footer class="bottomline"><span>六位先驅，一座擂台。</span><span>三戰兩勝 · 鍵盤 / 觸控</span></footer></section>`;
}
function stopBattle() { if(quiz.open) quiz.close(); quizState=null; if (!battle) return; battle.resizeObserver?.disconnect(); if (battle.fit) window.removeEventListener('resize', battle.fit); cancelAnimationFrame(battle.frame); battle.cancelled = true; battle.input.clear(); battle.audio.dispose(); battle = null; }
function buttonFor(player, action, extra = '') {
  const symbol = { left: '←', right: '→', jump: '↑', crouch: '↓' }[action];
  const label = { punch: '拳', kick: '踢', block: '防禦', special: '小絕招', ultimate: '大絕招', roll: '翻滾' }[action];
  return `<button class="touch-key ${extra}" data-action="${action}" data-player="${player}" aria-label="玩家 ${player + 1} ${ACTION_LABELS[action]}，按鍵 ${escapeHTML(keyLabel(state.bindings[player][action]))}"><strong>${symbol || label}</strong><kbd>${escapeHTML(keyLabel(state.bindings[player][action]))}</kbd>${action === 'special' ? `<small id="cooldown-${player}">20 能量</small>` : action === 'ultimate' ? `<small id="super-${player}">100 能量</small>` : ''}</button>`;
}
function controlsFor(player, f, cpu) {
  return `<section class="control-deck ${cpu ? 'cpu-deck' : ''}"><div class="control-deck-title"><span class="player-tag tag-${player}">${cpu ? 'CPU' : player + 1 + 'P'}</span><strong>${f.name}</strong><span>${cpu ? '由電腦操作' : '按鍵 / 觸控'}</span></div>${cpu ? `<div class="cpu-moves"><p>小絕招 <strong>${f.special.name}</strong></p><p>大絕招 <strong>${f.ultimate.name}</strong></p><small>觀察起手動作，移動、跳躍或防禦。</small></div>` : `<div class="touch-panel"><div class="dpad">${buttonFor(player, 'jump', 'up')}${buttonFor(player, 'left', 'left')}${buttonFor(player, 'crouch', 'down')}${buttonFor(player, 'right', 'right')}</div><div class="touch-attacks">${buttonFor(player, 'punch')}${buttonFor(player, 'kick')}${buttonFor(player, 'block')}${buttonFor(player, 'roll', 'roll')}</div></div><p class="move-key-label">搶答成功自動施放：${f.special.name}／${f.ultimate.name}</p>`}</section>`;
}
function startMatch(options = null) {
  stopBattle(); if (guide.open) guide.close();
  options ||= { p1: FIGHTERS[state.picks[0]].id, p2: FIGHTERS[state.picks[1]].id, mode: state.mode, difficulty: state.difficulty };
  options = {...options, learning: true};
  const fighters = [getFighter(options.p1), getFighter(options.p2)];
  app.classList.add('playing');
  screen.innerHTML = `<section class="battle-shell ${options.mode}-mode" id="battle-shell"><div class="battle-toolbar"><button class="quiet" data-command="home">${icon('back')} 返回選角</button><span>理論競技場 <b>／</b> ${options.mode === 'practice' ? '練習教室' : options.mode === 'cpu' ? '單人挑戰' : '雙人對戰'}</span><div class="toolbar-actions"><button class="icon-button" data-command="keys" aria-label="操作設定">${icon('keyboard')}</button><button class="icon-button" id="mute-button" data-command="mute" aria-label="${state.muted ? '開啟' : '關閉'}音效">${icon(state.muted ? 'mute' : 'sound')}</button><button class="icon-button" data-command="fullscreen" aria-label="全螢幕">${icon('full')}</button><button class="icon-button" id="pause-button" data-command="pause" aria-label="暫停">${icon('pause')}</button></div></div>
    <p class="notice" id="fullscreen-message" role="status" hidden></p><div class="arena-slot"><div class="arena-frame"><canvas id="arena" aria-label="物理擂台，使用下方按鍵或觸控按鈕操作"></canvas><div class="battle-hud">${fighters.map((f, i) => `<div class="fighter-hud hud-${i}"><div class="hud-name"><span>${i === 0 ? '1P' : options.mode === 'practice' ? '練習靶' : options.mode === 'cpu' ? 'CPU' : '2P'}</span><strong>${f.name}</strong><span class="round-dots" id="wins-${i}"><i></i><i></i></span></div><div class="health-track" role="meter" aria-label="${f.name}血量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" id="health-meter-${i}"><div id="health-${i}"></div></div><div class="energy-track"><div id="energy-${i}" style="background:${f.color}"></div></div><div class="energy-label" id="energy-label-${i}">能量 35 / 100</div></div>`).join('')}<div class="timer"><strong id="timer">60</strong><span id="round-label">ROUND 1</span></div></div><div class="arena-overlay" id="overlay" aria-live="polite"></div></div><aside class="portrait-coach"><strong>${fighters[0].name} · ${fighters[0].style}</strong><p>${fighters[0].special.name}：${fighters[0].special.description}</p><small>↻ 橫向握持，可放大戰場並以雙手操作。</small></aside></div>
    <div class="control-decks ${options.mode === 'local' ? 'local-decks' : ''}">${controlsFor(0, fighters[0], false)}${controlsFor(1, fighters[1], options.mode !== 'local')}</div><p class="battle-note" id="battle-note">隨機物理搶答：先答對自動放招，不答無損失，答錯內傷 −5 HP。翻滾 O／6。<span>Esc 暫停 · 切換視窗自動暫停 · 可在上方自訂按鍵</span></p></section>`;
  const m = new Match(options), audio = new GameAudio(); audio.muted = state.muted; audio.unlock();
  const current = { match: m, options, fighters, audio, input: new Inputs(state.bindings), frame: 0, cancelled: false, loading: true, error: '', overlayKey: '', renderer: null, practiced: new Set() };
  battle = current;
  try { current.renderer = new Renderer(document.querySelector('#arena')); current.renderer.reducedMotion = state.reducedMotion; } catch (error) { current.error = error.message; current.loading = false; updateHUD(current); return; }
  const slot = screen.querySelector('.arena-slot');
  const arena = screen.querySelector('.arena-frame');
  current.fit = () => {
    if (current.cancelled) return;
    const fitted = true;
    if (fitted) {
      const width = Math.max(0, Math.floor(Math.min(slot.clientWidth, Math.max(0, slot.clientHeight - (screen.querySelector('.portrait-coach')?.offsetHeight || 0)) * 1000 / 560)));
      arena.style.width = width + 'px';
      arena.style.height = Math.floor(width * 560 / 1000) + 'px';
    } else {
      arena.style.removeProperty('width');
      arena.style.removeProperty('height');
    }
  };
  current.resizeObserver = new ResizeObserver(current.fit);
  current.resizeObserver.observe(slot);
  window.addEventListener('resize', current.fit);
  current.fit();
  updateHUD(current); window.scrollTo({ top: 0, behavior: 'instant' });
  current.renderer.load(m).then(() => {
    if (current.cancelled) return; current.loading = false;
    let last = 0, accumulator = 0, hudTime = 0;
    const loop = time => {
      if (current.cancelled) return;
      const dt = last ? Math.min((time - last) / 1000, .1) : 0; last = time; accumulator += dt;
      while (accumulator >= 1 / 60) {
        m.step(1 / 60, current.input.read()); accumulator -= 1 / 60;
        if (options.mode === 'practice' && !m.paused && m.phase === 'fight') {
          const a = m.actors[0];
          if (a.moving) current.practiced.add('move');
          if (a.y > 0) current.practiced.add('jump');
          if (['punch','kick','block','special','ultimate','roll'].includes(a.pose)) current.practiced.add(a.pose);
        }
      }
      current.audio.muted = state.muted; for (const event of m.events.splice(0)) current.audio.play(event);
      if(m.learningRequest && !quizState) openQuiz(current);
      if(quizState) updateRace(dt);
      current.renderer.draw(m); hudTime += dt;
      if (hudTime > .06) { updateHUD(current); hudTime = 0; }
      current.frame = requestAnimationFrame(loop);
    };
    current.frame = requestAnimationFrame(loop);
  }).catch(error => { if (!current.cancelled) { current.error = error.message; current.loading = false; updateHUD(current); } });
}
function setPaused(value) { if (!battle || quiz.open) return; battle.match.paused = value; battle.input.clear(); document.querySelectorAll('.touch-key.pressed').forEach(button => button.classList.remove('pressed')); updateHUD(battle); }
function updateHUD(current) {
  if (current.cancelled || current !== battle) return;
  const m = current.match;
  const inputState = current.input.read(false);
  document.querySelectorAll('[data-action]').forEach(button => button.classList.toggle('pressed', Boolean(inputState[Number(button.dataset.player)][button.dataset.action])));
  if (current.options.mode === 'practice') {
    const a = m.actors[0];
    if (!m.paused && m.phase === 'fight') {
      if (a.moving) current.practiced.add('move');
      if (a.y > 0) current.practiced.add('jump');
      if (['punch', 'kick', 'block', 'special', 'ultimate', 'roll'].includes(a.pose)) current.practiced.add(a.pose);
    }
    const lessons = [['move','左右移動'],['jump','跳躍'],['punch','拳擊'],['kick','踢擊'],['block','防禦'],['special','小絕招'],['ultimate','大絕招'],['roll','翻滾閃避']];
    const next = lessons.find(([id]) => !current.practiced.has(id));
    const note = document.querySelector('#battle-note');
    const tip = next ? `練習 ${current.practiced.size}/8：試試${next[1]}${next[0] === 'move' ? '，靠近對手' : ['special','ultimate'].includes(next[0]) ? '，等待隨機題目並搶答成功即可自動施放' : '，使用下方按鈕或標示按鍵'}` : '✓ 八種動作完成！試試跳躍接踢擊，再用小絕招控制距離。';
    if (note.textContent !== tip) note.textContent = tip;
  }
  m.actors.forEach((a, i) => {
    document.querySelector(`#health-${i}`).style.width = `${a.hp}%`;
    document.querySelector(`#health-meter-${i}`).setAttribute('aria-valuenow', String(Math.round(a.hp)));
    const meter = document.querySelector(`#energy-${i}`); meter.style.width = `${a.energy}%`; meter.style.background = a.energy >= 100 ? '#dcfc8c' : a.def.color;
    document.querySelector(`#energy-label-${i}`).textContent = '搶答成功 → 自動施招';
    document.querySelectorAll(`#wins-${i} i`).forEach((dot, n) => dot.classList.toggle('won', a.wins > n));
    const rollButton=document.querySelector(`[data-player="${i}"][data-action="roll"]`); if(rollButton) { rollButton.classList.toggle('unavailable',a.rollCooldown>0); rollButton.querySelector('strong').textContent=a.rollCooldown>0?`${a.rollCooldown.toFixed(1)}秒`:'翻滾'; }
    const cool = document.querySelector(`#cooldown-${i}`), sup = document.querySelector(`#super-${i}`);
    if (cool) {
      cool.textContent = a.cooldown > 0 ? `${a.cooldown.toFixed(1)} 秒` : a.energy < 20 ? '能量不足' : a.permits.special ? '已解鎖' : '等待搶答';
      cool.closest('button').classList.toggle('unavailable', a.cooldown > 0 || a.energy < 20);
    }
    if (sup) { sup.textContent = a.energy >= 100 ? (a.permits.ultimate ? '已解鎖！' : '等待搶答') : `${Math.floor(a.energy)}/100`; sup.closest('button').classList.toggle('unavailable', a.energy < 100); sup.closest('button').classList.toggle('ready', a.energy >= 100); }
  });
  document.querySelector('#timer').textContent = current.options.mode === 'practice' ? '∞' : String(Math.ceil(m.time)).padStart(2, '0');
  document.querySelector('#round-label').textContent = `ROUND ${m.round}`;
  const key = `${current.loading}|${current.error}|${m.paused}|${m.phase}|${m.phaseTime > 1}|${m.winner}|${m.round}`;
  if (key === current.overlayKey) return; current.overlayKey = key;
  const pauseButton = document.querySelector('#pause-button'); pauseButton.innerHTML = icon(m.paused ? 'play' : 'pause'); pauseButton.setAttribute('aria-label', m.paused ? '繼續' : '暫停');
  const overlay = document.querySelector('#overlay'); overlay.classList.toggle('countdown', m.phase === 'countdown' && !m.paused && !current.loading);
  overlay.hidden = !current.loading && !current.error && !m.paused && m.phase === 'fight';
  if (overlay.hidden) { overlay.innerHTML = ''; return; }
  if (current.error) overlay.innerHTML = `<h2>載入遇到問題</h2><p>${escapeHTML(current.error)}</p><button class="start-button" data-command="restart">重試</button>`;
  else if (current.loading) overlay.innerHTML = '<p class="eyebrow">PREPARING THE ARENA</p><h2>正在準備角色…</h2>';
  else if (m.paused) overlay.innerHTML = `<p class="eyebrow">TAKE A BREATH</p><h2>已暫停</h2><p>按 Esc 或下方按鈕繼續</p><button class="start-button" data-command="resume">${icon('play')} 繼續對戰</button><button class="quiet" data-command="home">返回選角</button>`;
  else if (m.phase === 'countdown') overlay.innerHTML = `<p class="eyebrow">ROUND ${m.round}</p><h2>${m.phaseTime > 1 ? '準備' : 'READY'}</h2><p>${current.fighters[0].name} <em>VS</em> ${current.fighters[1].name}</p>`;
  else overlay.innerHTML = `<p class="eyebrow">${m.phase === 'matchOver' ? 'MATCH COMPLETE' : 'ROUND COMPLETE'}</p><h2>${m.winner === null ? '平手，再戰一回！' : current.fighters[m.winner].name + ' 勝利'}</h2><p>${m.actors[0].wins} <em>－</em> ${m.actors[1].wins}</p>${m.phase === 'matchOver' ? `<p class="result-fact">${current.fighters[m.winner ?? 0].fact}</p><div class="result-actions"><button class="start-button" data-command="restart">再戰一場</button><button class="quiet" data-command="home">重新選角</button></div>` : '<p>即將進入下一回合</p>'}`;
}
function openGuide(tab = state.guideTab) { if(quiz.open) return; state.guideTab = tab; state.capture = null; state.keyError = ''; if (battle) setPaused(true); renderGuide(); if (!guide.open) guide.showModal(); }
function openQuiz(current) {
  const request=current.match.learningRequest;
  current.input.clear();
  const question=PhysicsArena.randomQuestion(()=>current.match.random());
  quizState={race:new PhysicsArena.LearningRace(question,{mode:current.options.mode,random:()=>current.match.random()}),action:request.action,finished:false,returnTime:5,suspended:false};
  const race=quizState.race;
  quiz.innerHTML=`<p class="eyebrow">PHYSICS QUICK DRAW · 隨機搶答</p><h2 id="quiz-title">搶答贏${request.action==='ultimate'?'大絕招':'小絕招'} <span id="race-clock">10</span></h2><p class="race-rule">同一道題，每人限答一次。先答對，回戰場自動施招；不答無損失，答錯內傷 −5 HP（最低保留 1 HP）。作答期間戰鬥暫停。</p><h3>${escapeHTML(question.question)}</h3><div class="race-options">${question.choices.map((choice,i)=>`<p><b>${String.fromCharCode(65+i)}</b> ${escapeHTML(choice)}</p>`).join('')}</div><div class="race-players">${current.fighters.map((f,i)=>{
    if(i===1 && current.options.mode==='practice')return '';
    const cpu=i===1&&current.options.mode==='cpu';
    return `<section class="race-player" id="race-player-${i}"><div class="race-identity"><span class="race-avatar sprite" style="${spriteStyle(f)}"></span><strong>${cpu?'CPU':i+1+'P'} ${f.name}</strong></div><small>獎勵：${f[request.action].name}</small><p class="race-status" id="race-status-${i}">${cpu?'正在讀題…':'準備搶答'}</p><div class="race-buttons">${question.choices.map((_,n)=>`<button data-race-player="${i}" data-answer="${n}" disabled aria-label="玩家 ${i+1} 選擇 ${String.fromCharCode(65+n)}：${escapeHTML(question.choices[n])}">${String.fromCharCode(65+n)}<kbd>${cpu?'CPU':escapeHTML(keyLabel(state.bindings[i][['punch','kick','block'][n]]))}</kbd></button>`).join('')}</div></section>`;
  }).join('')}</div><div id="quiz-feedback" role="status"></div><button class="quiet" id="quiz-leave" hidden>立即回戰場</button>`;
  quiz.setAttribute('tabindex','-1');quiz.showModal();quiz.focus();
}
function submitRace(player,choice) {
  if(!quizState || !battle || quizState.suspended || quizState.race.elapsed<.8) return;
  if(player===1 && battle.options.mode!=='local')return;
  quizState.race.answer(player,choice);updateRace(0);
}
function returnFromRace() {
  if(!battle || !quizState?.finished)return;
  quiz.close();quizState=null;battle.input.clear();battle.match.buffered=[{},{}];battle.match.previous=[{},{}];
  battle.audio.unlock();battle.match.paused=false;updateHUD(battle);
}
function updateRace(dt) {
  if(!quizState || !battle || document.hidden || quizState.suspended) return;
  const q=quizState,r=q.race;
  if(q.finished){q.returnTime-=dt;quiz.querySelector('#race-clock').textContent=`${Math.ceil(Math.max(0,q.returnTime))} 秒後回戰場`;if(q.returnTime<=0)returnFromRace();return;}
  r.step(dt);
  quiz.querySelectorAll('[data-answer]').forEach(btn=>{const p=Number(btn.dataset.racePlayer);btn.disabled=r.done||r.elapsed<.8||r.answers[p]!==null||(p===1&&r.mode!=='local');});
  quiz.querySelector('#race-clock').textContent=`${Math.ceil(r.remaining)} 秒`;
  for(const event of r.events.splice(0)) {
    const card=quiz.querySelector(`#race-player-${event.player}`),status=quiz.querySelector(`#race-status-${event.player}`);
    card.classList.add(event.correct?'race-right':'race-injury');
    const damage=event.correct?0:battle.match.studyInjury(event.player);
    status.textContent=event.correct?`選 ${String.fromCharCode(65+event.choice)} · 搶答成功！`:`選 ${String.fromCharCode(65+event.choice)} · 內傷 −${Math.round(damage)} HP`;
    card.querySelectorAll('button').forEach(btn=>btn.disabled=true);
  }
  if(!r.answers[0])quiz.querySelector('#race-status-0').textContent=r.elapsed<.8?'準備搶答…':'等待你的答案';
  if(r.mode==='local' && !r.answers[1])quiz.querySelector('#race-status-1').textContent=r.elapsed<.8?'準備搶答…':'等待你的答案';
  if(r.mode==='cpu' && !r.answers[1])quiz.querySelector('#race-status-1').textContent=r.elapsed<1.5?'正在讀題…':'正在推理、準備作答…';
  if(r.done) {
    q.finished=true;battle.match.finishLearningRace(r.winner);
    const title=r.winner===null?'本次無人答對，不施放招式':`${r.winner===1&&r.mode==='cpu'?'CPU':r.winner+1+'P'} 搶答成功！`;
    quiz.querySelector('#quiz-feedback').innerHTML=`<h3>${title}</h3><p>正確答案：${escapeHTML(r.question.choices[r.question.answer])}</p><p>${escapeHTML(r.question.explanation)}</p><small>將自動恢復對戰。${r.winner===null?'雙方繼續對戰。':'勝方隨即自動施放本次'+(q.action==='ultimate'?'大絕招':'小絕招')+'，不需要按施招鍵。'}</small>`;
    quiz.querySelectorAll('[data-answer]').forEach(btn=>btn.disabled=true);quiz.querySelector('#quiz-leave').hidden=false;
  }
}
quiz.addEventListener('cancel',event=>event.preventDefault());
quiz.addEventListener('click',event=>{
  const answer=event.target.closest('[data-answer]');
  if(answer)submitRace(Number(answer.dataset.racePlayer),Number(answer.dataset.answer));
  if(event.target.closest('#quiz-leave'))returnFromRace();
});
window.addEventListener('blur',()=>{if(quizState)quizState.suspended=true;});
window.addEventListener('focus',()=>{if(quizState)quizState.suspended=false;});
function renderGuide() {
  guide.querySelectorAll('[data-tab]').forEach(b => { const active = b.dataset.tab === state.guideTab; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  if (state.guideTab === 'moves') {
    guideBody.innerHTML = `<div class="guide-roster">${FIGHTERS.map(c => `<article style="--fighter:${c.color}"><h3>${c.name}<small>${c.discipline} · ${c.years}</small></h3><p>${c.fact}</p><dl><dt>小絕招 · ${c.special.name}</dt><dd>${c.special.description}</dd><dt>大絕招 · ${c.ultimate.name}</dt><dd>${c.ultimate.description}</dd></dl></article>`).join('')}<p class="notice">知識依兩份物理史教材整理。招式是科學概念的遊戲化想像，並非真實物理過程。<a href="https://www.nobelprize.org/laureate/27" target="_blank" rel="noopener noreferrer">波耳人物資料</a></p></div>`;
  } else if (state.guideTab === 'experience') {
    guideBody.innerHTML = `<div class="experience-settings"><h3>適合你的遊玩方式</h3><button class="setting-switch" data-command="motion" aria-pressed="${state.reducedMotion}"><span>低動態效果<small>減少震屏、背景動態與粒子演出</small></span><strong>${state.reducedMotion ? '已開啟' : '已關閉'}</strong></button><button class="setting-switch" data-command="setting-sound" aria-pressed="${!state.muted}"><span>遊戲音效<small>攻擊、格擋與絕招的聲音提示</small></span><strong>${state.muted ? '已關閉' : '已開啟'}</strong></button><p class="notice">手機建議橫向握持，左手移動、右手攻擊；可同時按住方向和攻擊。雙人模式適合共用電腦鍵盤。第一次遊玩可從「練習教室」開始。</p></div>`;
  } else {
    guideBody.innerHTML = `<div class="keys-guide"><p>點選按鍵後，按下新的按鍵。Esc 取消設定或暫停對戰。手機也可使用畫面下方的觸控按鈕。</p><div class="key-table"><div class="key-row key-heading"><span>動作</span><span>玩家 1</span><span>玩家 2</span></div>${ACTIONS.map(action => `<div class="key-row"><span>${ACTION_LABELS[action]}</span>${state.bindings.map((b, player) => `<button class="${state.capture?.player === player && state.capture.action === action ? 'listening' : ''}" data-command="bind" data-player="${player}" data-bind="${action}">${state.capture?.player === player && state.capture.action === action ? '請按新鍵…' : escapeHTML(keyLabel(b[action]))}</button>`).join('')}</div>`).join('')}</div><p class="error-text" role="status">${state.keyError}</p><button class="quiet" data-command="reset-keys">恢復預設按鍵</button><p class="notice">若同鍵盤双人對戰漏掉輸入，可更換按鍵組合。玩家 2 預設使用上排數字鍵；也可以在這裡改成數字鍵盤。跳躍與出招需再次按下，不會因長按而連續發動。</p></div>`;
  }
}
function refreshBattleLabels() {
  if (!battle) return;
  battle.input.bindings = state.bindings;
  document.querySelectorAll('[data-action]').forEach(button => { const player = Number(button.dataset.player), action = button.dataset.action; button.querySelector('kbd').textContent = keyLabel(state.bindings[player][action]); button.setAttribute('aria-label', `玩家 ${player + 1} ${ACTION_LABELS[action]}，按鍵 ${keyLabel(state.bindings[player][action])}`); });
  document.querySelectorAll('.move-key-label').forEach((p, i) => { const f = battle.fighters[i]; p.innerHTML = `搶答成功自動施放：${f.special.name}／${f.ultimate.name}`; });
}
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-command]'); if (!button) return;
  const command = button.dataset.command;
  if (command === 'home') { if (guide.open) guide.close(); renderSelection(); }
  if (command === 'mode') { state.mode = button.dataset.mode; renderSelection(); }
  if (command === 'target') { state.target = Number(button.dataset.player); renderSelection(); }
  if (command === 'fighter') { state.picks[state.target] = Number(button.dataset.index); renderSelection(); screen.querySelector(`[data-command="fighter"][data-index="${button.dataset.index}"]`)?.focus({ preventScroll: true }); }
  if (command === 'difficulty') { state.difficulty = button.dataset.difficulty; renderSelection(); }
  if (command === 'start') startMatch();
  if (command === 'restart' && battle) startMatch({ ...battle.options });
  if (command === 'pause' && battle) setPaused(!battle.match.paused);
  if (command === 'resume' && battle) { battle.audio.unlock(); setPaused(false); }
  if (command === 'mute') { state.muted = !state.muted; savePreferences(); button.innerHTML = icon(state.muted ? 'mute' : 'sound'); button.setAttribute('aria-label', state.muted ? '開啟音效' : '關閉音效'); }
  if (command === 'motion') { state.reducedMotion = !state.reducedMotion; document.documentElement.classList.toggle('low-motion', state.reducedMotion); if (battle?.renderer) battle.renderer.reducedMotion = state.reducedMotion; savePreferences(); renderGuide(); }
  if (command === 'setting-sound') { state.muted = !state.muted; savePreferences(); if (battle) { const b = document.querySelector('#mute-button'); b.innerHTML = icon(state.muted ? 'mute' : 'sound'); b.setAttribute('aria-label', state.muted ? '開啟音效' : '關閉音效'); } renderGuide(); }
  if (command === 'guide') openGuide();
  if (command === 'keys') openGuide('keys');
  if (command === 'close-guide') guide.close();
  if (command === 'guide-tab') { state.guideTab = button.dataset.tab; state.capture = null; renderGuide(); }
  if (command === 'bind') { state.capture = { player: Number(button.dataset.player), action: button.dataset.bind }; state.keyError = ''; renderGuide(); }
  if (command === 'reset-keys') { state.bindings = cloneBindings(); state.capture = null; state.keyError = ''; savePreferences(); refreshBattleLabels(); renderGuide(); }
  if (command === 'fullscreen') {
    const message = () => { const p = document.querySelector('#fullscreen-message'); if (p) { p.hidden = false; p.textContent = '此瀏覽器未允許全螢幕，橫向遊玩可獲得較大畫面。'; } };
    if (document.fullscreenElement) document.exitFullscreen().catch(message);
    else if (document.querySelector('#battle-shell')?.requestFullscreen) document.querySelector('#battle-shell').requestFullscreen().catch(message);
    else message();
  }
});
guide.addEventListener('close', () => { state.capture = null; });
document.addEventListener('keydown', event => {
  if (quiz.open) {
    if(event.code==='Escape')event.preventDefault();
    if(event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    for(let player=0;player<(battle?.options.mode==='local'?2:1);player++) {
      const choice=['punch','kick','block'].findIndex(action=>state.bindings[player][action]===event.code);
      if(choice>=0){event.preventDefault();submitRace(player,choice);break;}
    }
    return;
  }
  if (guide.open) {
    if (!state.capture) return;
    event.preventDefault(); event.stopPropagation();
    if (event.code === 'Escape') { state.capture = null; renderGuide(); return; }
    if (!validCode(event.code) || event.ctrlKey || event.metaKey || event.altKey) { state.keyError = '請選擇字母、數字、方向鍵或一般符號鍵。'; renderGuide(); return; }
    const { player, action } = state.capture;
    if (state.bindings.some((b, p) => ACTIONS.some(a => !(p === player && a === action) && b[a] === event.code))) { state.keyError = '這個按鍵已用於其他動作，請換一個。'; renderGuide(); return; }
    state.bindings = state.bindings.map((b, p) => p === player ? { ...b, [action]: event.code } : { ...b }); state.capture = null; state.keyError = ''; savePreferences(); refreshBattleLabels(); renderGuide(); return;
  }
  if (!battle) return;
  if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) setPaused(!battle.match.paused); return; }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (state.bindings.some(b => Object.values(b).includes(event.code))) { event.preventDefault(); if (!battle.match.paused && !event.repeat) { battle.input.pressKey(event.code); battle.audio.unlock(); } }
}, true);
document.addEventListener('keyup', event => { battle?.input.keys.delete(event.code); });
document.addEventListener('pointerdown', event => {
  const button = event.target.closest('button[data-action]'); if (!button || !battle || battle.loading || battle.match.paused || guide.open || quiz.open) return;
  event.preventDefault(); button.setPointerCapture(event.pointerId); button.classList.add('pressed');
  battle.input.pressPointer(event.pointerId, { player: Number(button.dataset.player), action: button.dataset.action }); battle.audio.unlock();
});
function releasePointer(event) { battle?.input.pointers.delete(event.pointerId); const button = event.target.closest?.('[data-action]'); if (button) button.classList.remove('pressed'); }
document.addEventListener('pointermove', event => {
  if (!battle?.input.pointers.has(event.pointerId)) return;
  const held = battle.input.pointers.get(event.pointerId);
  if (!['left','right','jump','crouch'].includes(held.action)) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-action]');
  if (target && Number(target.dataset.player) === held.player && ['left','right','jump','crouch'].includes(target.dataset.action)) held.action = target.dataset.action;
});
document.addEventListener('pointerup', releasePointer); document.addEventListener('pointercancel', releasePointer); document.addEventListener('lostpointercapture', releasePointer);
document.addEventListener('contextmenu', event => { if (event.target.closest('[data-action]')) event.preventDefault(); });
window.addEventListener('blur', () => { if (battle && battle.match.phase !== 'matchOver') setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && battle && battle.match.phase !== 'matchOver') setPaused(true); });

// Optional browser agent interface; core gameplay does not depend on it.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController(); window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const register = tool => { try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Unsupported draft implementation. */ } };
  register({ name: 'read_physics_roster', description: 'Read fighter identities, moves and current match settings.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ fighters: FIGHTERS.map(f => ({ id: f.id, name: f.name, special: f.special, ultimate: f.ultimate })), match: battle?.options ?? null }) });
  register({ name: 'start_physics_match', description: 'Start a visible new physics match, replacing any current match.', inputSchema: { type: 'object', properties: { p1: { type: 'string', enum: FIGHTERS.map(f => f.id) }, p2: { type: 'string', enum: FIGHTERS.map(f => f.id) }, mode: { type: 'string', enum: ['cpu', 'local'] }, difficulty: { type: 'string', enum: ['easy', 'normal', 'hard'] } }, required: ['p1', 'p2', 'mode', 'difficulty'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => { if (!input || !['cpu', 'local'].includes(input.mode) || !['easy', 'normal', 'hard'].includes(input.difficulty)) throw new Error('Invalid settings'); getFighter(input.p1); getFighter(input.p2); const options = { p1: input.p1, p2: input.p2, mode: input.mode, difficulty: input.difficulty }; startMatch(options); return { started: true, ...options }; } });
}
renderSelection();

globalThis.PhysicsArena.bootReady = true;
})();
