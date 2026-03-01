import { useState, useEffect, useRef, useCallback } from "react";

const GW = 800;
const GH = 500;
const GRAVITY = 0.38;
const JUMP_FORCE = -13;
const MOVE_SPEED = 3.5;
const PW = 36;
const PH = 44;
const ENEMY_W = 34;
const ENEMY_H = 30;

// ─── RETRO MUSIC ENGINE (Web Audio chiptune) ────────────────────────────
class RetroMusic {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.nextNoteTime = 0;
    this.currentNote = 0;
    this.tempo = 150;
    this.timerID = null;
    this.melody = [
      660, 660, 0, 660, 0, 520, 660, 0,
      784, 0, 0, 0, 392, 0, 0, 0,
      520, 0, 0, 392, 0, 0, 330, 0,
      0, 440, 0, 494, 0, 466, 440, 0,
      392, 660, 784, 880, 0, 698, 784, 0,
      660, 0, 520, 587, 494, 0, 0, 0,
      520, 0, 0, 392, 0, 0, 330, 0,
      0, 440, 0, 494, 0, 466, 440, 0,
      392, 660, 784, 880, 0, 698, 784, 0,
      660, 0, 520, 587, 494, 0, 0, 0,
    ];
    this.bass = [
      131, 131, 0, 131, 0, 131, 165, 0,
      196, 0, 0, 0, 98, 0, 0, 0,
      131, 0, 0, 98, 0, 0, 82, 0,
      0, 110, 0, 123, 0, 117, 110, 0,
      98, 165, 196, 220, 0, 175, 196, 0,
      165, 0, 131, 147, 123, 0, 0, 0,
      131, 0, 0, 98, 0, 0, 82, 0,
      0, 110, 0, 123, 0, 117, 110, 0,
      98, 165, 196, 220, 0, 175, 196, 0,
      165, 0, 131, 147, 123, 0, 0, 0,
    ];
    this.powerMelody = [
      784, 0, 880, 0, 988, 0, 1047, 0,
      988, 0, 880, 0, 784, 0, 0, 0,
      784, 0, 880, 0, 988, 0, 880, 0,
      784, 660, 784, 0, 0, 0, 0, 0,
      880, 0, 988, 0, 1047, 0, 1175, 0,
      1047, 0, 988, 0, 880, 0, 0, 0,
      880, 0, 988, 0, 1047, 0, 988, 0,
      880, 784, 880, 0, 0, 0, 0, 0,
    ];
    this.powerBass = [
      196, 0, 220, 0, 247, 0, 262, 0,
      247, 0, 220, 0, 196, 0, 0, 0,
      196, 0, 220, 0, 247, 0, 220, 0,
      196, 165, 196, 0, 0, 0, 0, 0,
      220, 0, 247, 0, 262, 0, 294, 0,
      262, 0, 247, 0, 220, 0, 0, 0,
      220, 0, 247, 0, 262, 0, 247, 0,
      220, 196, 220, 0, 0, 0, 0, 0,
    ];
    this.mode = "normal";
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playNote(freq, time, duration, type = "square", vol = 0.08) {
    if (!this.ctx || freq === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.9);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  scheduler() {
    const mel = this.mode === "power" ? this.powerMelody : this.melody;
    const bas = this.mode === "power" ? this.powerBass : this.bass;
    const tempo = this.mode === "power" ? this.tempo * 1.3 : this.tempo;
    const secondsPerBeat = 60.0 / tempo / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      const idx = this.currentNote % mel.length;
      this.playNote(mel[idx], this.nextNoteTime, secondsPerBeat * 0.8, "square", 0.06);
      this.playNote(bas[idx], this.nextNoteTime, secondsPerBeat * 0.8, "triangle", 0.07);
      if (this.currentNote % 2 === 0) this.playPercussion(this.nextNoteTime);
      this.nextNoteTime += secondsPerBeat;
      this.currentNote++;
    }
  }

  playPercussion(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.05);
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  playSFX(type) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (type === "jump") {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "square"; o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o.connect(g); g.connect(this.ctx.destination); o.start(now); o.stop(now + 0.16);
    } else if (type === "stomp") {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(600, now); o.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o.connect(g); g.connect(this.ctx.destination); o.start(now); o.stop(now + 0.26);
      const o2 = this.ctx.createOscillator(), g2 = this.ctx.createGain();
      o2.type = "sine"; o2.frequency.setValueAtTime(400, now + 0.05); o2.frequency.exponentialRampToValueAtTime(900, now + 0.15);
      g2.gain.setValueAtTime(0.06, now + 0.05); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      o2.connect(g2); g2.connect(this.ctx.destination); o2.start(now + 0.05); o2.stop(now + 0.21);
    } else if (type === "star") {
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "square"; o.frequency.setValueAtTime(f, now + i * 0.06);
        g.gain.setValueAtTime(0.06, now + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.1);
        o.connect(g); g.connect(this.ctx.destination); o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.12);
      });
    } else if (type === "levelup") {
      [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "square"; o.frequency.setValueAtTime(f, now + i * 0.08);
        g.gain.setValueAtTime(0.07, now + i * 0.08); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        o.connect(g); g.connect(this.ctx.destination); o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.16);
      });
    } else if (type === "hurt") {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      o.connect(g); g.connect(this.ctx.destination); o.start(now); o.stop(now + 0.31);
    } else if (type === "mushroom") {
      [392, 523, 659, 784, 1047].forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "square"; o.frequency.setValueAtTime(f, now + i * 0.07);
        g.gain.setValueAtTime(0.09, now + i * 0.07); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
        o.connect(g); g.connect(this.ctx.destination); o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.16);
      });
    } else if (type === "break") {
      for (let i = 0; i < 4; i++) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(280 - i * 45, now + i * 0.04);
        g.gain.setValueAtTime(0.09, now + i * 0.04); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.07);
        o.connect(g); g.connect(this.ctx.destination); o.start(now + i * 0.04); o.stop(now + i * 0.04 + 0.09);
      }
    } else if (type === "shrink") {
      [784, 698, 587, 523, 440].forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "square"; o.frequency.setValueAtTime(f, now + i * 0.06);
        g.gain.setValueAtTime(0.07, now + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.1);
        o.connect(g); g.connect(this.ctx.destination); o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.11);
      });
    }
  }

  setMode(mode) { this.mode = mode; }

  start() { this.init(); if (this.playing) return; this.playing = true; this.currentNote = 0; this.nextNoteTime = this.ctx.currentTime; this.timerID = setInterval(() => this.scheduler(), 25); }
  stop() { this.playing = false; if (this.timerID) { clearInterval(this.timerID); this.timerID = null; } }
  toggle() { if (this.playing) this.stop(); else this.start(); return this.playing; }
}

const music = new RetroMusic();

// ─── FULLSCREEN (Android / mobile browser) ───────────────────────────────
function isAndroidBrowser() {
  return /Android/i.test(navigator.userAgent);
}

function requestFullscreen() {
  const el = document.documentElement;
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (rfs) {
    rfs.call(el).then(() => {
      // Try to lock orientation to landscape for better gameplay
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    }).catch(() => {});
  }
}

// ─── ENEMIES ─────────────────────────────────────────────────────────────
function createEnemies(level) {
  const defs = [
    [
      { type: "turtle", x: 300, y: 406, patrolMin: 200, patrolMax: 450, speed: 1.2 },
      { type: "turtle", x: 600, y: 406, patrolMin: 500, patrolMax: 750, speed: 1.5 },
      { type: "boar", x: 400, y: 404, patrolMin: 150, patrolMax: 550, speed: 2 },
    ],
    [
      { type: "turtle", x: 250, y: 406, patrolMin: 100, patrolMax: 400, speed: 1.3 },
      { type: "boar", x: 500, y: 404, patrolMin: 400, patrolMax: 700, speed: 2.2 },
      { type: "hippo", x: 350, y: 400, patrolMin: 200, patrolMax: 500, speed: 0.8 },
      { type: "turtle", x: 680, y: 406, patrolMin: 600, patrolMax: 760, speed: 1.6 },
    ],
    [
      { type: "hippo", x: 200, y: 400, patrolMin: 80, patrolMax: 350, speed: 1 },
      { type: "boar", x: 450, y: 404, patrolMin: 350, patrolMax: 600, speed: 2.5 },
      { type: "turtle", x: 650, y: 406, patrolMin: 550, patrolMax: 750, speed: 1.8 },
      { type: "hippo", x: 100, y: 400, patrolMin: 50, patrolMax: 250, speed: 0.9 },
      { type: "boar", x: 700, y: 404, patrolMin: 600, patrolMax: 770, speed: 2 },
    ],
    [
      { type: "boar", x: 300, y: 404, patrolMin: 200, patrolMax: 450, speed: 2.2 },
      { type: "turtle", x: 550, y: 406, patrolMin: 450, patrolMax: 700, speed: 1.5 },
      { type: "hippo", x: 150, y: 400, patrolMin: 50, patrolMax: 300, speed: 0.9 },
      { type: "boar", x: 650, y: 404, patrolMin: 550, patrolMax: 760, speed: 2.0 },
      { type: "turtle", x: 400, y: 406, patrolMin: 300, patrolMax: 500, speed: 1.7 },
    ],
  ];
  return (defs[level] || []).map(e => ({ ...e, alive: true, flyingAway: false, flyVx: 0, flyVy: 0, flyRot: 0, dir: 1, frame: Math.random() * 100 }));
}

function drawTurtle(ctx, x, y, dir, frame) {
  const bob = Math.sin(frame * 0.1) * 1;
  ctx.fillStyle = "#2E7D32";
  ctx.beginPath(); ctx.ellipse(x + 17, y + 14 + bob, 16, 12, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#1B5E20"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 10, y + 14 + bob); ctx.lineTo(x + 17, y + 2 + bob); ctx.lineTo(x + 24, y + 14 + bob); ctx.stroke();
  ctx.fillStyle = "#A5D6A7"; ctx.fillRect(x + 4, y + 13 + bob, 26, 10);
  ctx.fillStyle = "#66BB6A";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 30 : 4), y + 14 + bob, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 32 : 2), y + 12 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 33 : 1), y + 12 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#66BB6A";
  const lo = Math.sin(frame * 0.15) * 3;
  ctx.fillRect(x + 6, y + 22 + bob, 6, 6 + lo); ctx.fillRect(x + 22, y + 22 + bob, 6, 6 - lo);
}

function drawBoar(ctx, x, y, dir, frame) {
  const bob = Math.sin(frame * 0.15) * 1.5;
  ctx.fillStyle = "#6D4C41";
  ctx.beginPath(); ctx.ellipse(x + 17, y + 14 + bob, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4E342E";
  ctx.beginPath(); ctx.ellipse(x + 17, y + 6 + bob, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8D6E63";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 30 : 4), y + 14 + bob, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFAB91";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 35 : -1), y + 16 + bob, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4E342E";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 34 : 0), y + 15.5 + bob, 1, 0, Math.PI * 2); ctx.arc(x + (dir > 0 ? 36.5 : -2.5), y + 15.5 + bob, 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 29 : 5), y + 11 + bob, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#D32F2F";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 30 : 4), y + 11 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.moveTo(x + (dir > 0 ? 33 : 1), y + 20 + bob); ctx.lineTo(x + (dir > 0 ? 35 : -1), y + 23 + bob); ctx.lineTo(x + (dir > 0 ? 31 : 3), y + 21 + bob); ctx.fill();
  ctx.fillStyle = "#5D4037";
  const lo = Math.sin(frame * 0.2) * 3;
  ctx.fillRect(x + 6, y + 22 + bob, 5, 7 + lo); ctx.fillRect(x + 22, y + 22 + bob, 5, 7 - lo);
}

function drawHippo(ctx, x, y, dir, frame) {
  const bob = Math.sin(frame * 0.08) * 1;
  ctx.fillStyle = "#78909C";
  ctx.beginPath(); ctx.ellipse(x + 17, y + 10 + bob, 17, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#B0BEC5";
  ctx.beginPath(); ctx.ellipse(x + 17, y + 16 + bob, 12, 8, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#90A4AE";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 32 : 2), y + 8 + bob, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFAB91";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 37 : -3), y + 14 + bob, 5, 4, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 30 : 4), y + 4 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#263238";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 31 : 3), y + 4 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#607D8B";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 26 : 8), y - 2 + bob, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  const lo = Math.sin(frame * 0.12) * 2;
  ctx.fillRect(x + 4, y + 22 + bob, 7, 7 + lo); ctx.fillRect(x + 23, y + 22 + bob, 7, 7 - lo);
}

function drawEnemy(ctx, enemy) {
  if (!enemy.alive && !enemy.flyingAway) return;
  ctx.save();
  if (enemy.flyingAway) {
    ctx.translate(enemy.x + ENEMY_W / 2, enemy.y + ENEMY_H / 2);
    ctx.rotate(enemy.flyRot);
    ctx.translate(-(enemy.x + ENEMY_W / 2), -(enemy.y + ENEMY_H / 2));
    ctx.globalAlpha = Math.max(0, 1 - Math.abs(enemy.flyVy) / 30);
  }
  if (enemy.type === "turtle") drawTurtle(ctx, enemy.x, enemy.y, enemy.dir, enemy.frame);
  else if (enemy.type === "boar") drawBoar(ctx, enemy.x, enemy.y, enemy.dir, enemy.frame);
  else if (enemy.type === "hippo") drawHippo(ctx, enemy.x, enemy.y, enemy.dir, enemy.frame);
  ctx.restore();
}

// ─── LEVELS ──────────────────────────────────────────────────────────────
const LEVELS = [
  {
    name: "Louka plná hvězd ⭐",
    bg: "linear-gradient(180deg, #87CEEB 0%, #B0E0FF 60%, #90EE90 60%, #228B22 100%)",
    platforms: [
      { x: 0, y: 440, w: 800, h: 60, color: "#4a8c3f" },
      { x: 150, y: 350, w: 120, h: 20, color: "#8B4513" },
      { x: 350, y: 290, w: 120, h: 20, color: "#8B4513", breakable: true, drop: "star" },
      { x: 550, y: 220, w: 120, h: 20, color: "#8B4513" },
      { x: 200, y: 170, w: 120, h: 20, color: "#8B4513" },
      { x: 450, y: 130, w: 100, h: 20, color: "#8B4513", breakable: true, drop: "growMushroom" },
      { x: 650, y: 350, w: 100, h: 20, color: "#8B4513", breakable: true, drop: "shrinkMushroom" },
    ],
    stars: [{ x: 190, y: 310 }, { x: 390, y: 250 }, { x: 590, y: 180 }, { x: 240, y: 130 }, { x: 480, y: 90 }, { x: 690, y: 310 }, { x: 100, y: 400 }, { x: 500, y: 400 }],
    eyeExercise: "tracking",
    movingStars: [
      { x: 100, y: 200, dx: 2, dy: 0, minX: 50, maxX: 300, minY: 200, maxY: 200 },
      { x: 500, y: 150, dx: 0, dy: 1.5, minX: 500, maxX: 500, minY: 80, maxY: 220 },
    ],
    clouds: [{ x: 100, y: 50, size: 1 }, { x: 350, y: 30, size: 1.3 }, { x: 600, y: 60, size: 0.9 }],
    mushrooms: [{ x: 210, y: 333 }],
  },
  {
    name: "Kouzelný les 🌲",
    bg: "linear-gradient(180deg, #7B1FA2 0%, #CE93D8 35%, #81C784 60%, #388E3C 100%)",
    platforms: [
      { x: 0, y: 440, w: 800, h: 60, color: "#2d5016" },
      { x: 30, y: 350, w: 140, h: 20, color: "#5c3d2e" },
      { x: 200, y: 300, w: 140, h: 20, color: "#5c3d2e", breakable: true, drop: "shrinkMushroom" },
      { x: 370, y: 350, w: 140, h: 20, color: "#5c3d2e", breakable: true, drop: "star" },
      { x: 280, y: 200, w: 160, h: 20, color: "#5c3d2e" },
      { x: 520, y: 260, w: 140, h: 20, color: "#5c3d2e" },
      { x: 630, y: 180, w: 140, h: 20, color: "#5c3d2e", breakable: true, drop: "growMushroom" },
      { x: 70, y: 150, w: 140, h: 20, color: "#5c3d2e" },
    ],
    stars: [{ x: 80, y: 310 }, { x: 250, y: 260 }, { x: 430, y: 310 }, { x: 340, y: 160 }, { x: 580, y: 220 }, { x: 720, y: 140 }, { x: 130, y: 110 }, { x: 300, y: 400 }, { x: 650, y: 400 }],
    eyeExercise: "saccade",
    movingStars: [
      { x: 700, y: 100, dx: -3, dy: 0, minX: 50, maxX: 750, minY: 100, maxY: 100 },
      { x: 200, y: 350, dx: 2, dy: -1, minX: 100, maxX: 400, minY: 250, maxY: 400 },
    ],
    fireflies: [{ x: 150, y: 100 }, { x: 300, y: 80 }, { x: 500, y: 120 }, { x: 650, y: 90 }, { x: 400, y: 200 }, { x: 100, y: 250 }],
    mushrooms: [{ x: 270, y: 283 }],
  },
  {
    name: "Duhový hrad 🏰",
    bg: "linear-gradient(180deg, #FFB6C1 0%, #DDA0DD 30%, #ADD8E6 60%, #98FB98 80%, #F5DEB3 100%)",
    platforms: [
      { x: 0, y: 440, w: 800, h: 60, color: "#C0A080" },
      { x: 80, y: 360, w: 130, h: 20, color: "#FF6B6B" },
      { x: 230, y: 300, w: 130, h: 20, color: "#FFA500", breakable: true, drop: "growMushroom" },
      { x: 380, y: 240, w: 130, h: 20, color: "#FFD700", breakable: true, drop: "star" },
      { x: 520, y: 300, w: 130, h: 20, color: "#90EE90" },
      { x: 630, y: 240, w: 130, h: 20, color: "#87CEEB" },
      { x: 270, y: 160, w: 130, h: 20, color: "#DDA0DD" },
      { x: 460, y: 120, w: 130, h: 20, color: "#FF69B4", breakable: true, drop: "shrinkMushroom" },
      { x: 120, y: 200, w: 130, h: 20, color: "#FF6B6B" },
      { x: 610, y: 150, w: 140, h: 20, color: "#FFD700" },
    ],
    stars: [{ x: 120, y: 320 }, { x: 270, y: 260 }, { x: 420, y: 200 }, { x: 570, y: 260 }, { x: 700, y: 200 }, { x: 320, y: 120 }, { x: 520, y: 80 }, { x: 170, y: 160 }, { x: 680, y: 110 }, { x: 400, y: 400 }],
    eyeExercise: "convergence",
    movingStars: [
      { x: 50, y: 80, dx: 1.5, dy: 1, minX: 50, maxX: 750, minY: 60, maxY: 180 },
      { x: 750, y: 180, dx: -1.5, dy: -1, minX: 50, maxX: 750, minY: 60, maxY: 180 },
      { x: 400, y: 300, dx: 2, dy: 0, minX: 200, maxX: 600, minY: 300, maxY: 300 },
    ],
    mushrooms: [{ x: 445, y: 223 }],
  },
  {
    name: "Psí les 🐕🌲",
    bg: "linear-gradient(180deg, #558B2F 0%, #7CB342 35%, #33691E 65%, #1B5E20 100%)",
    platforms: [
      { x: 0, y: 440, w: 800, h: 60, color: "#2d4a1e" },
      { x: 80, y: 360, w: 110, h: 20, color: "#5c3d2e" },
      { x: 250, y: 310, w: 100, h: 20, color: "#5c3d2e", breakable: true, drop: "star" },
      { x: 420, y: 260, w: 110, h: 20, color: "#5c3d2e" },
      { x: 600, y: 320, w: 100, h: 20, color: "#5c3d2e", breakable: true, drop: "growMushroom" },
      { x: 160, y: 210, w: 100, h: 20, color: "#5c3d2e" },
      { x: 350, y: 160, w: 110, h: 20, color: "#5c3d2e", breakable: true, drop: "shrinkMushroom" },
      { x: 560, y: 190, w: 100, h: 20, color: "#5c3d2e" },
      { x: 700, y: 140, w: 90, h: 20, color: "#5c3d2e" },
    ],
    stars: [
      { x: 120, y: 320 }, { x: 280, y: 270 }, { x: 460, y: 220 }, { x: 630, y: 280 },
      { x: 190, y: 170 }, { x: 390, y: 120 }, { x: 590, y: 150 }, { x: 730, y: 100 },
      { x: 400, y: 400 }, { x: 150, y: 400 },
    ],
    eyeExercise: "tracking",
    movingStars: [
      { x: 100, y: 120, dx: 2, dy: 0.8, minX: 50, maxX: 400, minY: 80, maxY: 200 },
      { x: 600, y: 100, dx: -1.5, dy: 1, minX: 400, maxX: 750, minY: 80, maxY: 200 },
    ],
    trees: [
      { x: 40, y: 420, size: 1.3, variant: 0 },
      { x: 130, y: 420, size: 1.0, variant: 1 },
      { x: 220, y: 420, size: 1.5, variant: 0 },
      { x: 340, y: 420, size: 1.1, variant: 1 },
      { x: 480, y: 420, size: 1.4, variant: 0 },
      { x: 570, y: 420, size: 1.0, variant: 1 },
      { x: 660, y: 420, size: 1.3, variant: 0 },
      { x: 750, y: 420, size: 1.1, variant: 1 },
      { x: 300, y: 420, size: 0.8, variant: 0 },
      { x: 520, y: 420, size: 0.9, variant: 1 },
    ],
    dogs: [
      { x: 200, y: 406, patrolMin: 100, patrolMax: 350, speed: 1.0 },
      { x: 500, y: 406, patrolMin: 400, patrolMax: 650, speed: 1.2 },
      { x: 680, y: 406, patrolMin: 620, patrolMax: 760, speed: 0.8 },
    ],
    fireflies: [
      { x: 100, y: 80 }, { x: 250, y: 60 }, { x: 400, y: 90 },
      { x: 550, y: 70 }, { x: 700, y: 85 }, { x: 180, y: 150 },
      { x: 450, y: 130 }, { x: 650, y: 160 },
    ],
    mushrooms: [{ x: 135, y: 343 }],
  },
];

// ─── DRAW HELPERS ────────────────────────────────────────────────────────
function drawMushroom(ctx, x, y, frame) {
  const bob = Math.sin(frame * 0.06 + x * 0.01) * 3;
  ctx.save();
  ctx.shadowColor = "rgba(255,80,80,0.6)"; ctx.shadowBlur = 16;
  // stem
  ctx.fillStyle = "#F5DEB3";
  ctx.beginPath(); ctx.roundRect(x + 8, y + 20 + bob, 16, 14, [2, 2, 4, 4]); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.fillRect(x + 10, y + 21 + bob, 12, 2);
  // cap
  ctx.fillStyle = "#D32F2F";
  ctx.beginPath(); ctx.ellipse(x + 16, y + 20 + bob, 18, 14, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#B71C1C"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x + 16, y + 20 + bob, 18, 14, 0, Math.PI, 0); ctx.stroke();
  // white dots
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(x + 9, y + 13 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 16, y + 8 + bob, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 23, y + 13 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawShrinkMushroom(ctx, x, y, frame) {
  const bob = Math.sin(frame * 0.06 + x * 0.01) * 2;
  ctx.save();
  ctx.shadowColor = "rgba(30,100,255,0.6)"; ctx.shadowBlur = 14;
  // stem
  ctx.fillStyle = "#F5DEB3";
  ctx.beginPath(); ctx.roundRect(x + 7, y + 18 + bob, 10, 10, [2, 2, 3, 3]); ctx.fill();
  // cap - blue, smaller
  ctx.fillStyle = "#1565C0";
  ctx.beginPath(); ctx.ellipse(x + 12, y + 18 + bob, 13, 9, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#0D47A1"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x + 12, y + 18 + bob, 13, 9, 0, Math.PI, 0); ctx.stroke();
  // white dots
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(x + 6, y + 11 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 12, y + 7 + bob, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 18, y + 11 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, x, y, facingRight, frame, invincible, mushroomPower = false, shrinkPower = false) {
  ctx.save();
  if (mushroomPower) {
    const pcx = x + PW / 2, pcy = y + PH / 2;
    ctx.translate(pcx, pcy); ctx.scale(1.5, 1.5); ctx.translate(-pcx, -pcy);
    if (Math.floor(frame / 6) % 2 === 0) ctx.globalAlpha = 0.65;
  } else if (shrinkPower) {
    const pcx = x + PW / 2, pcy = y + PH / 2;
    ctx.translate(pcx, pcy); ctx.scale(0.65, 0.65); ctx.translate(-pcx, -pcy);
    if (Math.floor(frame / 6) % 2 === 0) ctx.globalAlpha = 0.65;
  }
  const f = facingRight ? 1 : -1;
  const cx = x + PW / 2;
  const bob = Math.sin(frame * 0.15) * 1.5;
  if (invincible && Math.floor(frame / 3) % 2 === 0) ctx.globalAlpha = 0.4;

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(cx, y + PH, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#D32F2F";
  ctx.fillRect(cx - 10 * f - 6, y + 38 + bob, 10, 6);
  ctx.fillRect(cx + 2 * f - 2, y + 38 + bob, 10, 6);
  ctx.fillStyle = "#1565C0";
  ctx.fillRect(cx - 7 * f - 3, y + 28 + bob, 7, 12);
  ctx.fillRect(cx + 2 * f - 1, y + 28 + bob, 7, 12);
  ctx.fillStyle = "#43A047";
  ctx.beginPath(); ctx.roundRect(cx - 10, y + 14 + bob, 20, 16, 3); ctx.fill();
  ctx.fillStyle = "#FFD700"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.fillText("★", cx, y + 26 + bob);
  ctx.fillStyle = "#FFCC80";
  const arm = Math.sin(frame * 0.2) * 8;
  ctx.fillRect(cx - 14, y + 16 + bob + arm * 0.3, 5, 10);
  ctx.fillRect(cx + 9, y + 16 + bob - arm * 0.3, 5, 10);
  ctx.fillStyle = "#FFCC80";
  ctx.beginPath(); ctx.arc(cx, y + 10 + bob, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5D4037";
  ctx.beginPath(); ctx.arc(cx, y + 5 + bob, 11, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx - 11, y + 3 + bob, 22, 4);
  ctx.beginPath(); ctx.arc(cx - 5 * f, y + 4 + bob, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(cx - 10, y + 6 + bob, 9, 7, 2); ctx.stroke();
  ctx.fillStyle = "rgba(200,230,255,0.4)"; ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 1, y + 6 + bob, 9, 7, 2); ctx.stroke();
  ctx.fillStyle = "rgba(200,230,255,0.4)"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 1, y + 9 + bob); ctx.lineTo(cx + 1, y + 9 + bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 10, y + 9 + bob); ctx.lineTo(cx - 13, y + 8 + bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 10, y + 9 + bob); ctx.lineTo(cx + 13, y + 8 + bob); ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.beginPath(); ctx.arc(cx - 5.5, y + 10 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5.5, y + 10 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(cx - 5.5 + f * 0.5, y + 10 + bob, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5.5 + f * 0.5, y + 10 + bob, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#C62828"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, y + 14 + bob, 3, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.restore();
}

function drawStar(ctx, x, y, size, frame, golden = false) {
  const s = size * (1 + Math.sin(frame * 0.08 + x) * 0.15);
  ctx.save();
  ctx.shadowColor = golden ? "rgba(255,215,0,0.4)" : "rgba(255,255,100,0.3)"; ctx.shadowBlur = 12;
  ctx.fillStyle = golden ? "#FFD700" : "#FFEB3B";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    ctx[i === 0 ? "moveTo" : "lineTo"](x + Math.cos(a) * s, y + Math.sin(a) * s);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a2) * s * 0.4, y + Math.sin(a2) * s * 0.4);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = golden ? "#FFA000" : "#FFC107"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawCloud(ctx, x, y, size) {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(x, y, 18 * size, 0, Math.PI * 2);
  ctx.arc(x + 20 * size, y - 5 * size, 22 * size, 0, Math.PI * 2);
  ctx.arc(x + 40 * size, y, 16 * size, 0, Math.PI * 2);
  ctx.fill();
}

function drawFirefly(ctx, x, y, frame) {
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1 + x * 0.5) * 0.5;
  ctx.shadowColor = "#FFFF00"; ctx.shadowBlur = 15;
  ctx.fillStyle = "#FFFF88";
  ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTree(ctx, x, y, size, variant) {
  const s = size || 1;
  // trunk
  ctx.fillStyle = variant === 1 ? "#5D4037" : "#4E342E";
  ctx.fillRect(x - 6 * s, y - 20 * s, 12 * s, 40 * s);
  ctx.fillStyle = variant === 1 ? "#3E2723" : "#4E342E";
  ctx.fillRect(x - 2 * s, y - 20 * s, 4 * s, 40 * s);
  // foliage layers
  const colors = variant === 1
    ? ["#1B5E20", "#2E7D32", "#388E3C"]
    : ["#0D3B0D", "#1A5C1A", "#2E7D32"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(x - (28 - i * 6) * s, y - (20 + i * 22) * s);
    ctx.lineTo(x + (28 - i * 6) * s, y - (20 + i * 22) * s);
    ctx.lineTo(x, y - (50 + i * 22) * s);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDog(ctx, x, y, dir, frame, happy) {
  const bob = Math.sin(frame * 0.12) * 1.5;
  // body
  ctx.fillStyle = "#D7A86E";
  ctx.beginPath(); ctx.ellipse(x + 17, y + 14 + bob, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  // belly
  ctx.fillStyle = "#F5DEB3";
  ctx.beginPath(); ctx.ellipse(x + 17, y + 18 + bob, 10, 6, 0, 0, Math.PI); ctx.fill();
  // head
  ctx.fillStyle = "#C4944A";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 30 : 4), y + 8 + bob, 9, 0, Math.PI * 2); ctx.fill();
  // ear
  ctx.fillStyle = "#8B6914";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 36 : -2), y + 2 + bob, 4, 7, dir > 0 ? 0.3 : -0.3, 0, Math.PI * 2); ctx.fill();
  // snout
  ctx.fillStyle = "#F5DEB3";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 37 : -3), y + 12 + bob, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  // nose
  ctx.fillStyle = "#333";
  ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 40 : -6), y + 11 + bob, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  // eye
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 32 : 2), y + 6 + bob, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5D4037";
  ctx.beginPath(); ctx.arc(x + (dir > 0 ? 33 : 1), y + 6 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
  // happy mouth
  if (happy) {
    ctx.strokeStyle = "#8B4513"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x + (dir > 0 ? 37 : -3), y + 13 + bob, 3, 0.1, Math.PI - 0.1); ctx.stroke();
    // tongue
    ctx.fillStyle = "#FF8A80";
    ctx.beginPath(); ctx.ellipse(x + (dir > 0 ? 38 : -4), y + 16 + bob, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // legs
  ctx.fillStyle = "#C4944A";
  const lo = Math.sin(frame * 0.18) * 3;
  ctx.fillRect(x + 6, y + 22 + bob, 5, 7 + lo);
  ctx.fillRect(x + 22, y + 22 + bob, 5, 7 - lo);
  // tail (wagging)
  const tailWag = Math.sin(frame * 0.25) * 0.6;
  ctx.save();
  ctx.strokeStyle = "#C4944A"; ctx.lineWidth = 3; ctx.lineCap = "round";
  const tailX = dir > 0 ? x + 3 : x + 31;
  ctx.beginPath();
  ctx.moveTo(tailX, y + 8 + bob);
  ctx.quadraticCurveTo(tailX + (dir > 0 ? -10 : 10), y - 2 + bob + Math.sin(tailWag) * 8, tailX + (dir > 0 ? -6 : 6), y - 6 + bob + Math.cos(tailWag) * 6);
  ctx.stroke();
  ctx.restore();
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function MarioGame() {
  const canvasRef = useRef(null);
  const gs = useRef({
    player: { x: 50, y: 380, vx: 0, vy: 0, onGround: false, facingRight: true },
    keys: {}, frame: 0, score: 0, lives: 3, level: 0,
    collectedStars: [], collectedMoving: [], collectedMushrooms: [], particles: [], enemies: [], dogs: [],
    petted: [], invincibleTimer: 0, mushroomTimer: 0, shrinkTimer: 0, gameState: "menu",
    brokenBlocks: [], fallingItems: [],
    touchLeft: false, touchRight: false, touchJump: false, musicOn: true,
  });
  const [ui, setUi] = useState({ score: 0, lives: 3, level: 0, gameState: "menu", levelName: "", musicOn: true });
  const animRef = useRef(null);

  const resetLevel = useCallback((li) => {
    const g = gs.current;
    g.player = { x: 50, y: 380, vx: 0, vy: 0, onGround: false, facingRight: true };
    g.level = li; g.collectedStars = []; g.collectedMoving = []; g.collectedMushrooms = []; g.particles = [];
    g.enemies = createEnemies(li); g.invincibleTimer = 0; g.mushroomTimer = 0; g.shrinkTimer = 0;
    g.brokenBlocks = []; g.fallingItems = []; g.gameState = "playing";
    music.setMode("normal");
    const lvDogs = LEVELS[li].dogs || [];
    g.dogs = lvDogs.map(d => ({ ...d, dir: 1, frame: Math.random() * 100, happy: false, happyTimer: 0 }));
    g.petted = [];
    const lv = LEVELS[li];
    if (lv.movingStars) lv.movingStars.forEach(ms => { ms.x = ms.minX + (ms.maxX - ms.minX) / 2; ms.y = ms.minY + (ms.maxY - ms.minY) / 2; });
    setUi({ score: g.score, lives: g.lives, level: li, gameState: "playing", levelName: lv.name, musicOn: g.musicOn });
  }, []);

  const startGame = useCallback(() => {
    const g = gs.current; g.score = 0; g.lives = 3;
    music.init(); if (g.musicOn) music.start();
    requestFullscreen();
    resetLevel(0);
  }, [resetLevel]);

  useEffect(() => {
    const kd = (e) => {
      gs.current.keys[e.key] = true;
      if (e.key === " " || e.key === "ArrowUp") e.preventDefault();
      const g = gs.current;
      if (e.key === "Enter" || e.key === " ") {
        if (g.gameState === "menu") startGame();
        else if (g.gameState === "levelComplete") {
          music.playSFX("levelup");
          if (g.level + 1 < LEVELS.length) resetLevel(g.level + 1);
          else { g.gameState = "gameComplete"; setUi(p => ({ ...p, gameState: "gameComplete" })); }
        } else if (g.gameState === "gameComplete" || g.gameState === "gameOver") {
          g.score = 0; g.lives = 3; if (g.musicOn) music.start(); resetLevel(0);
        }
      }
      if (e.key === "m" || e.key === "M") { g.musicOn = music.toggle(); setUi(p => ({ ...p, musicOn: g.musicOn })); }
    };
    const ku = (e) => { gs.current.keys[e.key] = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [startGame, resetLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      const g = gs.current; g.frame++;
      const lv = LEVELS[g.level] || LEVELS[0];

      if (g.gameState === "playing") {
        const p = g.player;
        if (g.invincibleTimer > 0) g.invincibleTimer--;
        if (g.keys["ArrowLeft"] || g.keys["a"] || g.touchLeft) { p.vx = -MOVE_SPEED; p.facingRight = false; }
        else if (g.keys["ArrowRight"] || g.keys["d"] || g.touchRight) { p.vx = MOVE_SPEED; p.facingRight = true; }
        else { p.vx *= 0.8; if (Math.abs(p.vx) < 0.1) p.vx = 0; }

        if ((g.keys["ArrowUp"] || g.keys["w"] || g.keys[" "] || g.touchJump) && p.onGround) {
          p.vy = JUMP_FORCE; p.onGround = false; music.playSFX("jump");
        }
        p.vy += GRAVITY; p.x += p.vx; p.y += p.vy;

        p.onGround = false;
        for (const pl of lv.platforms) {
          if (p.x + PW > pl.x && p.x < pl.x + pl.w && p.y + PH > pl.y && p.y + PH < pl.y + pl.h + 12 && p.vy >= 0) {
            p.y = pl.y - PH; p.vy = 0; p.onGround = true;
          }
        }

        // Breakable blocks – hit from below
        lv.platforms.forEach((pl, i) => {
          if (!pl.breakable || g.brokenBlocks.includes(i)) return;
          if (p.x + PW > pl.x && p.x < pl.x + pl.w &&
              p.y >= pl.y - 4 && p.y <= pl.y + pl.h + 4 &&
              p.vy < 0) {
            p.vy = 2;
            g.brokenBlocks.push(i);
            music.playSFX("break");
            for (let j = 0; j < 14; j++) g.particles.push({ x: pl.x + pl.w / 2, y: pl.y, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 2) * 5, life: 40, color: ["#8B4513", "#A0522D", "#DEB887", "#D2691E", "#C4A06D"][j % 5] });
            if (pl.drop) g.fallingItems.push({ x: pl.x + pl.w / 2 - 12, y: pl.y - 26, vy: -5, type: pl.drop });
          }
        });

        // Shrink timer
        if (g.shrinkTimer > 0) g.shrinkTimer--;

        // Falling items physics + collection
        g.fallingItems = g.fallingItems.filter(item => {
          item.vy += GRAVITY * 0.7;
          item.y += item.vy;
          // Land on platforms
          for (const pl of lv.platforms) {
            if (item.x + 24 > pl.x && item.x < pl.x + pl.w &&
                item.y + 24 >= pl.y && item.y + 24 < pl.y + pl.h + 8 &&
                item.vy > 0) {
              item.y = pl.y - 24; item.vy = 0;
            }
          }
          // Player collects item
          const dx = p.x + PW / 2 - (item.x + 12), dy = p.y + PH / 2 - (item.y + 12);
          if (Math.sqrt(dx * dx + dy * dy) < 38) {
            if (item.type === "star") {
              g.score += 20; music.playSFX("star");
              for (let j = 0; j < 16; j++) g.particles.push({ x: item.x + 12, y: item.y + 12, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, life: 40, color: ["#FFD700", "#FFEB3B", "#FFF176", "#FF8F00"][j % 4] });
              setUi(prev => ({ ...prev, score: g.score }));
            } else if (item.type === "growMushroom") {
              g.mushroomTimer = 500; g.shrinkTimer = 0;
              music.playSFX("mushroom");
              if (g.musicOn) music.setMode("power");
              for (let j = 0; j < 18; j++) g.particles.push({ x: item.x + 12, y: item.y + 12, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 1.5) * 5, life: 50, maxLife: 50, color: ["#D32F2F", "#FF5252", "#FFFFFF", "#FF8A65", "#FFD700"][j % 5] });
            } else if (item.type === "shrinkMushroom") {
              g.shrinkTimer = 400; g.mushroomTimer = 0;
              music.playSFX("shrink");
              music.setMode("normal");
              for (let j = 0; j < 18; j++) g.particles.push({ x: item.x + 12, y: item.y + 12, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 1.5) * 5, life: 50, maxLife: 50, color: ["#1565C0", "#42A5F5", "#FFFFFF", "#0D47A1", "#29B6F6"][j % 5] });
            }
            return false;
          }
          return item.y < GH + 100;
        });

        if (p.x < 0) p.x = 0; if (p.x + PW > GW) p.x = GW - PW;
        if (p.y > GH + 50) { p.x = 50; p.y = 380; p.vx = 0; p.vy = 0; }

        // Enemies
        g.enemies.forEach(en => {
          if (en.flyingAway) {
            en.x += en.flyVx; en.y += en.flyVy; en.flyVy += 0.3; en.flyRot += 0.15;
            if (en.y > GH + 100) en.flyingAway = false;
            return;
          }
          if (!en.alive) return;
          en.frame++; en.x += en.speed * en.dir;
          if (en.x <= en.patrolMin || en.x >= en.patrolMax) en.dir *= -1;

          if (p.x + PW > en.x && p.x < en.x + ENEMY_W && p.y + PH > en.y && p.y < en.y + ENEMY_H) {
            if (p.vy > 0 && p.y + PH < en.y + ENEMY_H * 0.6) {
              en.alive = false; en.flyingAway = true;
              en.flyVx = en.dir * 5; en.flyVy = -9; en.flyRot = 0;
              p.vy = JUMP_FORCE * 0.65; g.score += 50;
              music.playSFX("stomp");
              for (let j = 0; j < 10; j++) g.particles.push({ x: en.x + ENEMY_W / 2, y: en.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 1) * 5, life: 35, color: ["#FFD700", "#FF5722", "#FF9800", "#FFEB3B"][j % 4] });
              setUi(prev => ({ ...prev, score: g.score }));
            } else if (g.invincibleTimer <= 0) {
              g.invincibleTimer = 40;
              p.vy = -5; p.vx = p.x < en.x ? -3 : 3;
            }
          }
        });

        // Stars
        lv.stars.forEach((star, i) => {
          if (g.collectedStars.includes(i)) return;
          const dx = p.x + PW / 2 - star.x, dy = p.y + PH / 2 - star.y;
          if (Math.sqrt(dx * dx + dy * dy) < 42) {
            g.collectedStars.push(i); g.score += 10; music.playSFX("star");
            for (let j = 0; j < 16; j++) g.particles.push({ x: star.x, y: star.y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, life: 40, color: ["#FFD700", "#FFEB3B", "#FFF176", "#FF8F00", "#FF4081", "#FF80AB"][j % 6] });
            setUi(prev => ({ ...prev, score: g.score }));
          }
        });
        if (lv.movingStars) lv.movingStars.forEach((ms, i) => {
          if (g.collectedMoving.includes(i)) return;
          ms.x += ms.dx; ms.y += ms.dy;
          if (ms.x <= ms.minX || ms.x >= ms.maxX) ms.dx *= -1;
          if (ms.y <= ms.minY || ms.y >= ms.maxY) ms.dy *= -1;
          const dx = p.x + PW / 2 - ms.x, dy = p.y + PH / 2 - ms.y;
          if (Math.sqrt(dx * dx + dy * dy) < 42) {
            g.collectedMoving.push(i); g.score += 25; music.playSFX("star");
            for (let j = 0; j < 20; j++) g.particles.push({ x: ms.x, y: ms.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 50, color: ["#FF4081", "#E040FB", "#7C4DFF", "#448AFF", "#FFD700", "#69F0AE"][j % 6] });
            setUi(prev => ({ ...prev, score: g.score }));
          }
        });

        // Dogs (friendly)
        g.dogs.forEach((dog, i) => {
          dog.frame++;
          dog.x += dog.speed * dog.dir;
          if (dog.x <= dog.patrolMin || dog.x >= dog.patrolMax) dog.dir *= -1;
          if (dog.happyTimer > 0) dog.happyTimer--;
          else dog.happy = false;

          if (!g.petted.includes(i) && p.x + PW > dog.x && p.x < dog.x + ENEMY_W && p.y + PH > dog.y && p.y < dog.y + ENEMY_H) {
            g.petted.push(i); dog.happy = true; dog.happyTimer = 120;
            g.score += 15; music.playSFX("star");
            for (let j = 0; j < 6; j++) g.particles.push({ x: dog.x + ENEMY_W / 2, y: dog.y - 5, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3 - 1, life: 40, color: ["#FF4081", "#E91E63", "#F48FB1", "#FF80AB"][j % 4] });
            setUi(prev => ({ ...prev, score: g.score }));
          }
        });

        // Mushroom power-up timer
        if (g.mushroomTimer > 0) { g.mushroomTimer--; if (g.mushroomTimer === 0) music.setMode("normal"); }

        // Mushroom collection
        lv.mushrooms?.forEach((mush, i) => {
          if (g.collectedMushrooms.includes(i)) return;
          const dx = p.x + PW / 2 - mush.x, dy = p.y + PH / 2 - mush.y;
          if (Math.sqrt(dx * dx + dy * dy) < 40) {
            g.collectedMushrooms.push(i);
            g.mushroomTimer = 600;
            music.playSFX("mushroom");
            if (g.musicOn) music.setMode("power");
            for (let j = 0; j < 20; j++) g.particles.push({ x: mush.x, y: mush.y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 1.5) * 5, life: 50, maxLife: 50, color: ["#D32F2F", "#FF5252", "#FFFFFF", "#FF8A65", "#FFD700"][j % 5] });
          }
        });

        g.particles = g.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--; return pt.life > 0; });

        const total = lv.stars.length + (lv.movingStars ? lv.movingStars.length : 0);
        if (g.collectedStars.length + g.collectedMoving.length >= total) {
          g.gameState = "levelComplete"; music.playSFX("levelup");
          setUi(prev => ({ ...prev, gameState: "levelComplete", score: g.score }));
        }
      }

      // ── DRAW ──
      const bgParts = lv.bg.match(/linear-gradient\(([^)]+)\)/);
      if (bgParts) {
        const grad = ctx.createLinearGradient(0, 0, 0, GH);
        bgParts[1].split(",").slice(1).forEach(s => { const pts = s.trim().split(/\s+/); const pos = parseInt(pts[1]) / 100; if (!isNaN(pos)) grad.addColorStop(pos, pts[0]); });
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, GW, GH);
      if (lv.clouds) lv.clouds.forEach(c => drawCloud(ctx, (c.x + g.frame * 0.2) % (GW + 100) - 50, c.y, c.size));
      if (lv.fireflies) lv.fireflies.forEach(ff => drawFirefly(ctx, ff.x + Math.sin(g.frame * 0.02 + ff.x) * 20, ff.y + Math.cos(g.frame * 0.03 + ff.y) * 15, g.frame));
      if (lv.trees) lv.trees.forEach(t => drawTree(ctx, t.x, t.y, t.size, t.variant));

      if (lv.platforms[0]) {
        ctx.fillStyle = "#2d8c1f";
        for (let gx = 0; gx < GW; gx += 20) { const gh = 5 + Math.sin(gx * 0.3) * 3; ctx.beginPath(); ctx.moveTo(gx, lv.platforms[0].y); ctx.lineTo(gx + 5, lv.platforms[0].y - gh); ctx.lineTo(gx + 10, lv.platforms[0].y); ctx.fill(); }
      }
      lv.platforms.forEach((pl, i) => {
        if (pl.breakable && g.brokenBlocks.includes(i)) return;
        if (i === 0) { ctx.fillStyle = pl.color; ctx.fillRect(pl.x, pl.y, pl.w, pl.h); return; }
        if (pl.breakable) {
          // Brick block style
          ctx.fillStyle = "#A0522D";
          ctx.beginPath(); ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 3); ctx.fill();
          ctx.strokeStyle = "#5D2906"; ctx.lineWidth = 1.5;
          ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
          // Brick mortar lines
          ctx.beginPath(); ctx.moveTo(pl.x, pl.y + pl.h / 2); ctx.lineTo(pl.x + pl.w, pl.y + pl.h / 2); ctx.stroke();
          const bw = 22;
          for (let bx = pl.x + bw; bx < pl.x + pl.w; bx += bw) { ctx.beginPath(); ctx.moveTo(bx, pl.y); ctx.lineTo(bx, pl.y + pl.h / 2); ctx.stroke(); }
          for (let bx = pl.x + bw / 2; bx < pl.x + pl.w; bx += bw) { ctx.beginPath(); ctx.moveTo(bx, pl.y + pl.h / 2); ctx.lineTo(bx, pl.y + pl.h); ctx.stroke(); }
          ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(pl.x + 2, pl.y + 1, pl.w - 4, 3);
          // "?" indicator if has drop
          if (pl.drop) {
            const pulse = 0.85 + Math.sin(g.frame * 0.08) * 0.15;
            ctx.save();
            ctx.translate(pl.x + pl.w / 2, pl.y + pl.h / 2 + 3);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = "#FFD700"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("?", 0, 0);
            ctx.restore();
          }
        } else {
          ctx.fillStyle = pl.color;
          ctx.beginPath(); ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 4); ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(pl.x + 2, pl.y + 1, pl.w - 4, 3);
          ctx.fillStyle = "#4CAF50";
          for (let gx = pl.x; gx < pl.x + pl.w; gx += 8) { ctx.beginPath(); ctx.moveTo(gx, pl.y); ctx.lineTo(gx + 3, pl.y - 4); ctx.lineTo(gx + 6, pl.y); ctx.fill(); }
        }
      });

      // Falling items from broken blocks
      g.fallingItems.forEach(item => {
        if (item.type === "star") drawStar(ctx, item.x + 12, item.y + 12, 14, g.frame, true);
        else if (item.type === "growMushroom") drawMushroom(ctx, item.x, item.y, g.frame);
        else if (item.type === "shrinkMushroom") drawShrinkMushroom(ctx, item.x, item.y, g.frame);
      });

      lv.mushrooms?.forEach((mush, i) => { if (!g.collectedMushrooms.includes(i)) drawMushroom(ctx, mush.x - 16, mush.y - 17, g.frame); });
      lv.stars.forEach((star, i) => { if (!g.collectedStars.includes(i)) drawStar(ctx, star.x, star.y, 15, g.frame); });
      if (lv.movingStars) lv.movingStars.forEach((ms, i) => {
        if (g.collectedMoving.includes(i)) return;
        ctx.save(); ctx.globalAlpha = 0.3; drawStar(ctx, ms.x - ms.dx * 3, ms.y - ms.dy * 3, 7, g.frame, true); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.15; drawStar(ctx, ms.x - ms.dx * 6, ms.y - ms.dy * 6, 5, g.frame, true); ctx.restore();
        drawStar(ctx, ms.x, ms.y, 17, g.frame, true);
      });

      g.enemies.forEach(en => drawEnemy(ctx, en));
      g.dogs.forEach(dog => {
        drawDog(ctx, dog.x, dog.y, dog.dir, dog.frame, dog.happy);
        if (dog.happy) {
          ctx.fillStyle = "#FF4081"; ctx.font = "14px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("\u2764\uFE0F", dog.x + ENEMY_W / 2, dog.y - 10 - Math.sin(dog.frame * 0.1) * 4);
        }
      });
      g.particles.forEach(pt => {
        const maxLife = pt.maxLife || 40;
        ctx.save(); ctx.globalAlpha = pt.life / maxLife;
        ctx.shadowColor = pt.color; ctx.shadowBlur = 8;
        ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, 5 * (pt.life / maxLife), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });

      if (g.gameState === "playing" || g.gameState === "levelComplete")
        drawPlayer(ctx, g.player.x, g.player.y, g.player.facingRight, g.frame, g.invincibleTimer > 0, g.mushroomTimer > 0, g.shrinkTimer > 0);

      // HUD
      if (g.gameState === "playing") {
        const total = lv.stars.length + (lv.movingStars ? lv.movingStars.length : 0);
        const collected = g.collectedStars.length + g.collectedMoving.length;
        // Big star counter top-left
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(10, 8, 180, 44, 12); ctx.fill();
        ctx.font = "bold 26px 'Segoe UI', sans-serif"; ctx.textAlign = "left";
        ctx.fillStyle = "#FFD700";
        ctx.fillText("\u2B50 " + collected + " / " + total, 22, 40);
      }

      // Score top-right
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.roundRect(GW - 170, 8, 160, 44, 12); ctx.fill();
      ctx.fillStyle = "#FFD700"; ctx.font = "bold 20px 'Segoe UI', sans-serif"; ctx.textAlign = "right";
      ctx.fillText("\uD83C\uDF1F " + g.score, GW - 16, 38);

      // Music toggle
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.roundRect(GW - 42, 58, 32, 24, 6); ctx.fill();
      ctx.fillStyle = "#FFF"; ctx.font = "15px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(g.musicOn ? "\uD83D\uDD0A" : "\uD83D\uDD07", GW - 26, 76);

      // Overlays
      if (g.gameState === "menu") {
        ctx.fillStyle = "rgba(0,20,80,0.72)"; ctx.fillRect(0, 0, GW, GH);
        // Title
        ctx.fillStyle = "#FFD700"; ctx.font = "bold 48px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.shadowColor = "#FF8F00"; ctx.shadowBlur = 24;
        ctx.fillText("\uD83C\uDF1F Super Silv\u00EDk \uD83C\uDF1F", GW / 2, 110); ctx.shadowBlur = 0;
        // Characters
        drawPlayer(ctx, GW / 2 - 18, 135, true, g.frame, false);
        drawTurtle(ctx, GW / 2 - 130, 192, 1, g.frame);
        drawBoar(ctx, GW / 2 - 50, 190, -1, g.frame);
        drawHippo(ctx, GW / 2 + 28, 188, 1, g.frame);
        drawDog(ctx, GW / 2 + 110, 190, -1, g.frame, true);
        // Simple instruction for kids
        ctx.fillStyle = "#FFEB3B"; ctx.font = "bold 22px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Sbírej v\u0161echny hv\u011Bzdi\u010Dky! \u2B50\u2B50\u2B50", GW / 2, 258);
        ctx.fillStyle = "#E1F5FE"; ctx.font = "18px 'Segoe UI', sans-serif";
        ctx.fillText("\uD83D\uDC46 Pohybuj se a ska\u010Dej!", GW / 2, 292);
        // Big bouncy play button
        const sp = 1 + Math.sin(g.frame * 0.06) * 0.07;
        ctx.save(); ctx.translate(GW / 2, 385); ctx.scale(sp, sp);
        ctx.shadowColor = "#00E676"; ctx.shadowBlur = 20;
        ctx.fillStyle = "#43A047"; ctx.beginPath(); ctx.roundRect(-120, -28, 240, 56, 28); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFF"; ctx.font = "bold 26px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.fillText("\u25B6  HR\u00C1T!", 0, 9); ctx.restore();
      }
      if (g.gameState === "levelComplete") {
        ctx.fillStyle = "rgba(0,0,50,0.6)"; ctx.fillRect(0, 0, GW, GH);
        // Animated stars celebration
        for (let i = 0; i < 12; i++) {
          const sx = GW / 2 + Math.cos(g.frame * 0.04 + i * (Math.PI * 2 / 12)) * 180;
          const sy = 230 + Math.sin(g.frame * 0.04 + i * (Math.PI * 2 / 12)) * 80;
          drawStar(ctx, sx, sy, 8 + (i % 3) * 2, g.frame);
        }
        ctx.fillStyle = "#FFD700"; ctx.font = "bold 44px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.shadowColor = "#FF8F00"; ctx.shadowBlur = 20;
        ctx.fillText("\uD83C\uDF89 Výborně! \uD83C\uDF89", GW / 2, 175); ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFEB3B"; ctx.font = "bold 26px 'Segoe UI', sans-serif";
        ctx.fillText(lv.name + " hotovo! \uD83C\uDFC6", GW / 2, 220);
        ctx.fillStyle = "#FFF"; ctx.font = "22px 'Segoe UI', sans-serif";
        ctx.fillText("\u2B50 Hvězdy: " + g.score, GW / 2, 260);
        const sp2 = 1 + Math.sin(g.frame * 0.06) * 0.06;
        ctx.save(); ctx.translate(GW / 2, 320); ctx.scale(sp2, sp2);
        ctx.fillStyle = "#4CAF50"; ctx.beginPath(); ctx.roundRect(-120, -26, 240, 52, 26); ctx.fill();
        ctx.fillStyle = "#FFF"; ctx.font = "bold 22px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.fillText(g.level + 1 < LEVELS.length ? "D\u00E1l! \u25B6" : "V\u00FDsledky \u25B6", 0, 8); ctx.restore();
      }
      if (g.gameState === "gameOver") {
        ctx.fillStyle = "rgba(50,0,0,0.8)"; ctx.fillRect(0, 0, GW, GH);
        ctx.fillStyle = "#FF5252"; ctx.font = "bold 38px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.fillText("\uD83D\uDC94 Jejda! \uD83D\uDC94", GW / 2, 190);
        ctx.fillStyle = "#FFF"; ctx.font = "20px 'Segoe UI', sans-serif";
        ctx.fillText("Nevadí, zkus to znovu!", GW / 2, 240);
        ctx.fillText("Skóre: " + g.score + " \u2B50", GW / 2, 275);
        ctx.fillStyle = "#FF7043"; ctx.beginPath(); ctx.roundRect(GW / 2 - 100, 310, 200, 44, 22); ctx.fill();
        ctx.fillStyle = "#FFF"; ctx.font = "bold 18px 'Segoe UI', sans-serif";
        ctx.fillText("Znovu \uD83D\uDD04", GW / 2, 338);
      }
      if (g.gameState === "gameComplete") {
        ctx.fillStyle = "rgba(0,0,50,0.75)"; ctx.fillRect(0, 0, GW, GH);
        for (let i = 0; i < 20; i++) {
          const sx = (GW / 20) * i + Math.sin(g.frame * 0.02 + i) * 30;
          const sy = 50 + Math.cos(g.frame * 0.03 + i * 2) * 30 + (i % 3) * 40;
          drawStar(ctx, sx, sy, 6 + (i % 3) * 2, g.frame);
        }
        ctx.fillStyle = "#FFD700"; ctx.font = "bold 40px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
        ctx.fillText("\uD83C\uDFC6 Jsi ŠAMPION! \uD83C\uDFC6", GW / 2, 220);
        ctx.fillStyle = "#FFF"; ctx.font = "24px 'Segoe UI', sans-serif";
        ctx.fillText("Celkové skóre: " + g.score + " \u2B50", GW / 2, 270);
        ctx.fillStyle = "#81C784"; ctx.font = "16px 'Segoe UI', sans-serif";
        ctx.fillText("Tvé oči jsou teď silnější! \uD83D\uDCAA\uD83D\uDC40", GW / 2, 310);
        ctx.fillStyle = "#FF7043"; ctx.beginPath(); ctx.roundRect(GW / 2 - 100, 345, 200, 44, 22); ctx.fill();
        ctx.fillStyle = "#FFF"; ctx.font = "bold 18px 'Segoe UI', sans-serif";
        ctx.fillText("Hrát znovu \uD83D\uDD04", GW / 2, 373);
      }

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const handleClick = (e) => {
    const g = gs.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (GW / rect.width), y = (e.clientY - rect.top) * (GH / rect.height);
    if (x > GW - 42 && x < GW - 10 && y > 44 && y < 66) { g.musicOn = music.toggle(); setUi(p => ({ ...p, musicOn: g.musicOn })); return; }
    if (g.gameState === "menu") { if (y > 357 && y < 413 && x > GW / 2 - 120 && x < GW / 2 + 120) startGame(); }
    else if (g.gameState === "levelComplete") { if (x > GW / 2 - 120 && x < GW / 2 + 120 && y > 294 && y < 346) { music.playSFX("levelup"); if (g.level + 1 < LEVELS.length) resetLevel(g.level + 1); else { g.gameState = "gameComplete"; setUi(p => ({ ...p, gameState: "gameComplete" })); } } }
    else if (g.gameState === "gameComplete" || g.gameState === "gameOver") { if (x > GW / 2 - 100 && x < GW / 2 + 100 && y > 300 && y < 420) { g.score = 0; g.lives = 3; if (g.musicOn) music.start(); resetLevel(0); } }
  };

  const tS = (a) => (e) => { e.preventDefault(); gs.current[a] = true; };
  const tE = (a) => (e) => { e.preventDefault(); gs.current[a] = false; };
  const btn = (accent) => ({ width: accent ? 72 : 64, height: accent ? 72 : 64, borderRadius: "50%", border: `2px solid ${accent ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.3)"}`, background: accent ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.12)", color: accent ? "#FFD700" : "#FFF", fontSize: accent ? 14 : 28, fontWeight: accent ? "bold" : "normal", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", touchAction: "none", userSelect: "none" });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", fontFamily: "'Segoe UI', sans-serif", overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas ref={canvasRef} width={GW} height={GH} onClick={handleClick} style={{ display: "block", maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none", pointerEvents: "none" }}>
          <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
            <button onTouchStart={tS("touchLeft")} onTouchEnd={tE("touchLeft")} onMouseDown={() => gs.current.touchLeft = true} onMouseUp={() => gs.current.touchLeft = false} onMouseLeave={() => gs.current.touchLeft = false} style={btn(false)}>◀</button>
            <button onTouchStart={tS("touchRight")} onTouchEnd={tE("touchRight")} onMouseDown={() => gs.current.touchRight = true} onMouseUp={() => gs.current.touchRight = false} onMouseLeave={() => gs.current.touchRight = false} style={btn(false)}>▶</button>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", pointerEvents: "none" }}>{ui.gameState === "playing" && ui.levelName}</div>
          <div style={{ pointerEvents: "auto" }}>
            <button onTouchStart={tS("touchJump")} onTouchEnd={tE("touchJump")} onMouseDown={() => gs.current.touchJump = true} onMouseUp={() => gs.current.touchJump = false} onMouseLeave={() => gs.current.touchJump = false} style={btn(true)}>SKOK</button>
          </div>
        </div>
      </div>
    </div>
  );
}
