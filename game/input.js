// Standalone script: no module loader or build step required.
(() => {
'use strict';
globalThis.PhysicsArena ||= {};
const DEFAULT_BINDINGS = [
    { left: 'KeyA', right: 'KeyD', jump: 'KeyW', crouch: 'KeyS', punch: 'KeyJ', kick: 'KeyK', block: 'KeyL', roll: 'KeyO' },
    { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', crouch: 'ArrowDown', punch: 'Digit1', kick: 'Digit2', block: 'Digit3', roll: 'Digit6' },
];
const ACTION_LABELS = { left: '向左', right: '向右', jump: '跳躍', crouch: '蹲下', punch: '拳擊', kick: '踢擊', block: '防禦', special: '小絕招', ultimate: '大絕招', roll: '翻滾閃避' };
function keyLabel(code) { return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: '空白', ShiftLeft: '左 Shift', ShiftRight: '右 Shift' }[code] || code.replace('Key', '').replace('Digit', '').replace('Numpad', '數字 '); }
class Inputs {
    keys = new Set();
    pointers = new Map();
    taps = new Set();
    bindings;
    constructor(bindings) { this.bindings = bindings; }
    pressKey(code) { this.keys.add(code); this.bindings.forEach((mapping, player) => { for (const [action, key] of Object.entries(mapping)) if (key === code) this.taps.add(`${player}:${action}`); }); }
    pressPointer(id, value) { this.pointers.set(id, value); this.taps.add(`${value.player}:${value.action}`); }
    clear() { this.keys.clear(); this.pointers.clear(); this.taps.clear(); }
    read(consume = true) { const result = this.bindings.map((mapping, player) => { const input = {}; for (const [action, code] of Object.entries(mapping))
        input[action] = this.keys.has(code) || this.taps.has(`${player}:${action}`) || [...this.pointers.values()].some(p => p.player === player && p.action === action); return input; }); if (consume) this.taps.clear(); return result; }
}

Object.assign(globalThis.PhysicsArena, { DEFAULT_BINDINGS, ACTION_LABELS, keyLabel, Inputs });
})();
