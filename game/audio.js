// Standalone script: no module loader or build step required.
(() => {
'use strict';
globalThis.PhysicsArena ||= {};
class GameAudio {
    context = null;
    muted = false;
    master = null;
    noiseBuffer = null;
    lastPlayed = new Map();
    unlock() { try {
        if (!this.context || this.context.state === 'closed') {
            const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
            if (!Audio) return;
            this.context = new Audio();
            this.master = this.context.createGain();
            this.master.gain.value = .28;
            const limiter = this.context.createDynamicsCompressor();
            limiter.threshold.value = -16;
            limiter.knee.value = 12;
            limiter.ratio.value = 8;
            this.master.connect(limiter);
            limiter.connect(this.context.destination);
            this.noiseBuffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * .2), this.context.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            this.lastPlayed.clear();
        }
        void this.context.resume().catch(() => { });
    }
    catch { /* Audio is optional on devices without Web Audio. */ } }
    tone(start, end, duration, volume, type = 'sine', delay = 0) {
        const ctx = this.context, t = ctx.currentTime + delay;
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(start, t);
        osc.frequency.exponentialRampToValueAtTime(end, t + duration);
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.exponentialRampToValueAtTime(volume, t + .006);
        gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
        osc.connect(gain); gain.connect(this.master);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        osc.start(t); osc.stop(t + duration + .01);
    }
    impact(duration, frequency, volume) {
        const ctx = this.context, t = ctx.currentTime;
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        source.buffer = this.noiseBuffer;
        filter.type = 'lowpass'; filter.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
        source.connect(filter); filter.connect(gain); gain.connect(this.master);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        source.start(t); source.stop(t + duration);
    }
    play(event) {
        if (this.muted || !this.context || this.context.state !== 'running') return;
        const t = this.context.currentTime;
        // Multi-hit attacks can emit several impacts in one frame; keep them legible.
        if (t - (this.lastPlayed.get(event.type) ?? -10) < .045) return;
        this.lastPlayed.set(event.type, t);
        switch (event.type) {
            case 'hit':
                this.tone(160, 48, .16, .32);
                this.impact(.085, 1900, .22);
                break;
            case 'block':
                this.tone(780, 380, .12, .13, 'triangle');
                this.tone(1170, 570, .095, .065);
                this.impact(.035, 3600, .09);
                break;
            case 'cast':
                this.tone(280, 780, .24, .14, 'triangle');
                this.tone(560, 1100, .17, .045, 'sine', .035);
                break;
            case 'super':
                this.tone(95, 680, .55, .18, 'triangle');
                this.tone(190, 1360, .48, .065, 'sine', .07);
                this.impact(.16, 1300, .18);
                break;
            case 'ko':
                this.tone(220, 55, .65, .19, 'triangle');
                this.tone(330, 82.5, .6, .07, 'sine', .08);
                break;
            case 'round':
                this.tone(440, 440, .12, .11, 'sine');
                this.tone(660, 660, .22, .13, 'sine', .15);
                break;
        }
    }
    dispose() { void this.context?.close().catch(() => { }); this.lastPlayed.clear(); }
}

Object.assign(globalThis.PhysicsArena, { GameAudio });
})();
