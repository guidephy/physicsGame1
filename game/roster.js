// Standalone script: no module loader or build step required.
(() => {
'use strict';
globalThis.PhysicsArena ||= {};
const FIGHTERS = [
    { id: 'newton', name: '牛頓', english: 'ISAAC NEWTON', years: '1643–1727', title: '引力的掌控者', discipline: '力學', color: '#caafff', formula: 'F = Gm₁m₂ / r²', style: '均衡型 · 引力控制', speed: 260, power: 1.08, fact: '牛頓以三大運動定律與萬有引力，連結地面物體與天體的運動。', sprite: { src: './assets/fighters.png', column: 0, columns: 6, rows: 4 }, special: { name: '引力落體', kind: 'gravity', description: '在對手上方標示落點，短暫預告後落下紅蘋果。移動可躲避。' }, ultimate: { name: '萬有引力場', kind: 'gravity', description: '蘋果環繞形成引力場，把地面上的對手拉向中心，最後引爆；跳躍可避開吸引。' } },
    { id: 'faraday', name: '法拉第', english: 'MICHAEL FARADAY', years: '1791–1867', title: '電磁感應先驅', discipline: '電磁學', color: '#75ead1', formula: 'ε = −dΦB / dt', style: '設置型 · 線圈陷阱', speed: 248, power: 1, fact: '法拉第發現電磁感應：磁通量的改變能產生感應電動勢。', sprite: { src: './assets/fighters.png', column: 1, columns: 6, rows: 4 }, special: { name: '感應線圈', kind: 'coil', description: '在前方設置延遲啟動的線圈，對靠近的對手放電。' }, ultimate: { name: '磁通量激變', kind: 'coil', description: '三組線圈依序放電，控制地面空間；觀察預告並跳躍閃避。' } },
    { id: 'kepler', name: '克卜勒', english: 'JOHANNES KEPLER', years: '1571–1630', title: '星軌的解讀者', discipline: '天文力學', color: '#ffca78', formula: 'T² ∝ a³', style: '遠距型 · 往返星軌', speed: 260, power: .98, fact: '克卜勒分析第谷的觀測資料，提出行星運動三定律，包括橢圓軌道。', sprite: { src: './assets/fighters.png', column: 2, columns: 6, rows: 4 }, special: { name: '橢圓飛星', kind: 'orbit', description: '投出沿橢圓路線往返的星體，回程也可能命中。' }, ultimate: { name: '三定律星陣', kind: 'orbit', description: '連續展開三條不同高度的星軌，迫使對手改變位置。' } },
    { id: 'young', name: '楊氏', english: 'THOMAS YOUNG', years: '1773–1829', title: '光的干涉探索者', discipline: '光學', color: '#85c5ff', formula: 'Δr = mλ', style: '控制型 · 干涉波帶', speed: 274, power: .94, fact: '楊氏雙狹縫干涉實驗，為光的波動性提供有力支持。', sprite: { src: './assets/fighters.png', column: 3, columns: 6, rows: 4 }, special: { name: '雙縫波', kind: 'interference', description: '發出兩道不同高度的波動投射物，跳躍或防禦可應對。' }, ultimate: { name: '干涉陣列', kind: 'interference', description: '交替出現亮帶攻擊與暗帶空隙，移到暗帶可躲開。' } },
    { id: 'bohr', name: '波耳', english: 'NIELS BOHR', years: '1885–1962', title: '能階的跨越者', discipline: '原子物理', color: '#ff97b6', formula: 'ΔE = hν', style: '機動型 · 能階躍遷', speed: 286, power: .94, fact: '波耳在氫原子模型引入量子化能階，解釋氫原子的線光譜。', sprite: { src: './assets/fighters.png', column: 4, columns: 6, rows: 4 }, special: { name: '能階躍遷', kind: 'energy', description: '沿面向跳轉固定距離，並釋出一道光子；不能穿過對手。' }, ultimate: { name: '氫光譜連擊', kind: 'energy', description: '依序釋放四色光子，可用連續跳躍與防禦減少傷害。' } },
    { id: 'einstein', name: '愛因斯坦', english: 'ALBERT EINSTEIN', years: '1879–1955', title: '時空的重塑者', discipline: '相對論', color: '#ffe58e', formula: 'E = mc²', style: '變化型 · 時空領域', speed: 252, power: 1.02, fact: '愛因斯坦以光量子解釋光電效應，並建立狹義與廣義相對論。', sprite: { src: './assets/fighters.png', column: 5, columns: 6, rows: 4 }, special: { name: '光子脈衝', kind: 'photon', description: '發出快速光子；距離越近，對方的反應時間越短。' }, ultimate: { name: '時空曲率', kind: 'photon', description: '形成減速區域，並釋出彎曲前進的光子；可跳離領域。' } },
];
function getFighter(id) { const f = FIGHTERS.find(f => f.id === id); if (!f)
    throw new Error(`Unknown fighter: ${id}`); return f; }

Object.assign(globalThis.PhysicsArena, { FIGHTERS, getFighter });
})();
