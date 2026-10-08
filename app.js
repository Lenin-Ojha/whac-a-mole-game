
class AudioEngine {
  constructor() {
    this.ctx = null;

    this.fxMuted = false;
    this.musicMuted = false;

    this.music = new Audio('assets/music.mp3');
    this.click = new Audio('assets/click.mp3');

    this.music.loop = true;
    this.music.volume = 0.20;
    this.click.volume = .3;
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tone(freq, duration = 0.08, type = 'sine', volume = 0.05, slideTo = null, when = 0) {
    if (this.fxMuted) return;

    this.ensureContext();

    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        t + duration
      );
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain).connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  clickSound() {
    if (this.fxMuted) return;

    this.click.currentTime = 0;
    this.click.play().catch(() => {});
  }

  whack() {
    this.tone(220, .075, 'square', .08, 90);
    this.tone(120, .06, 'triangle', .06, 65, .015);
  }

  miss() {
this.tone(500, .045, 'square', .05, 250);  }

  golden() {
    [740, 988, 1318].forEach((f, i) =>
      this.tone(f, .12, 'sine', .04, null, i * .07)
    );
  }

  bomb() {
    this.tone(110, .35, 'sawtooth', .045, 42);
    this.tone(72, .28, 'square', .025, 48, .02);
  }

  levelUp() {
    [392, 523, 659, 784].forEach((f, i) =>
      this.tone(f, .14, 'square', .03, null, i * .09)
    );
  }

  startMusic() {
    if (this.musicMuted) return;

    this.music.play().catch(() => {});
  }

  stopMusic() {
    this.music.pause();
    this.music.currentTime = 0;
  }

  toggleFx() {
    this.fxMuted = !this.fxMuted;
    return this.fxMuted;
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;

    if (this.musicMuted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }

    return this.musicMuted;
  }
}

class WhacAMole {
  static ROUND_MS = 30_000;
  static STORAGE_KEY = 'neonWhacSessionHighScore';

  constructor() {
    this.audio = new AudioEngine();
    this.els = {
      shell: document.getElementById('appShell'), viewport: document.getElementById('gameViewport'), board: document.getElementById('gameBoard'),
      score: document.getElementById('scoreValue'), high: document.getElementById('highScoreValue'), level: document.getElementById('levelValue'), turn: document.getElementById('turnValue'), combo: document.getElementById('comboValue'),
      timer: document.getElementById('timerValue'), timerProgress: document.getElementById('timerProgress'), difficulty: document.getElementById('difficultyLabel'), target: document.getElementById('targetLabel'),
      startPause: document.getElementById('startPauseBtn'), reset: document.getElementById('resetBtn'), fx: document.getElementById('fxToggle'), music: document.getElementById('musicToggle'),
      hammer: document.getElementById('hammerCursor'), announcement: document.getElementById('announcement'), freeze: document.getElementById('freezeBanner'),
      modal: document.getElementById('modalOverlay'), modalTitle: document.getElementById('modalTitle'), modalBadge: document.getElementById('modalBadge'), modalSubtitle: document.getElementById('modalSubtitle'), modalStats: document.getElementById('modalStats'), modalActions: document.getElementById('modalActions'), highBanner: document.getElementById('highScoreBanner'), confetti: document.getElementById('confettiLayer')
    };

    this.timeouts = new Set();
    this.intervals = new Set();
    this.activeCreatures = new Map();
    this.holes = [];
    this.lastTouchAt = 0;
    this.resetRuntimeState();
    this.sessionHigh = Number(sessionStorage.getItem(WhacAMole.STORAGE_KEY) || 0);
    this.bindEvents();
    this.buildGrid();
    this.renderAll();
  }

  resetRuntimeState() {
    this.score = 0; this.level = 1; this.turn = 1; this.combo = 0; this.bestCombo = 0;
    this.levelStartScore = 0; this.levelHits = 0; this.levelAttempts = 0; this.roundStartingHigh = 0;
    this.remainingMs = WhacAMole.ROUND_MS; this.isRunning = false; this.isPaused = false; this.isFrozen = false;
    this.roundEndsAt = null; this.pausedRemaining = WhacAMole.ROUND_MS; this.timerRaf = null; this.spawnLoopToken = 0;
  }

  configForLevel(level = this.level) {
    let cols = 3, rows = 3;
    if (level >= 7) [cols, rows] = [5, 5];
    else if (level >= 5) [cols, rows] = [4, 4];
    else if (level >= 3) [cols, rows] = [4, 3];

    const windows = {1:1200, 2:1000, 3:850, 4:700};
    const popupMs = level <= 4 ? windows[level] : Math.max(450, 700 - (level - 4) * 90);
    const spawnEvery = Math.max(250, popupMs * .72);
    const passTarget = Math.round((110 + level * 55) / 10) * 10;
    return { cols, rows, count: cols * rows, popupMs, spawnEvery, passTarget };
  }

  buildGrid() {
    const cfg = this.configForLevel();
    this.els.board.classList.add('resizing');
    this.setTimeout(() => this.els.board.classList.remove('resizing'), 360);
    this.els.board.style.setProperty('--cols', cfg.cols);
    this.els.board.style.setProperty('--rows', cfg.rows);
    this.els.board.innerHTML = '';
    this.holes = [];
    for (let i = 0; i < cfg.count; i++) {
      const hole = document.createElement('button');
      hole.className = 'hole'; hole.type = 'button'; hole.dataset.index = String(i); hole.setAttribute('role', 'gridcell'); hole.setAttribute('aria-label', `Hole ${i + 1}`);
      hole.innerHTML = `<span class="hole-rim"></span><span class="hole-mask"></span>`;
      this.els.board.appendChild(hole); this.holes.push(hole);
    }
  }

  bindEvents() {
    this.els.startPause.addEventListener('click', () => {
  this.audio.clickSound();
  this.toggleStartPause();
});

this.els.reset.addEventListener('click', () => {
  this.audio.clickSound();
  this.resetSession();
});

this.els.fx.addEventListener('click', () => {
  this.audio.clickSound();

  const muted = this.audio.toggleFx();
  this.els.fx.setAttribute('aria-pressed', muted);
  this.els.fx.textContent = muted ? 'FX 🔇' : 'FX 🔊';
});

this.els.music.addEventListener('click', () => {
  this.audio.clickSound();

  const muted = this.audio.toggleMusic();
  this.els.music.setAttribute('aria-pressed', muted);
  this.els.music.textContent = muted ? 'Music ✕' : 'Music ♫';
});
    this.els.board.addEventListener('pointerdown', e => this.handleBoardInput(e));

document.addEventListener(
  'pointermove',
  e => this.moveHammer(e),
  { passive: true }
);
this.els.viewport.addEventListener('pointerenter', e => {
  this.moveHammer(e);
});

this.els.viewport.addEventListener('pointerleave', () => {
  this.els.hammer.style.opacity = '0';
});

this.els.viewport.addEventListener('pointerdown', e => {
  this.moveHammer(e);
  this.swingHammer();
});
this.els.modalActions.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'next') this.nextLevel();
      if (action === 'replay') this.replayLevel();
      if (action === 'restart') this.restartFromLevelOne();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.isRunning && !this.isPaused) this.pauseGame(); });
  }

  toggleStartPause() {
    if (!this.isRunning) return this.startGame();
    if (this.isPaused) return this.resumeGame();
    this.pauseGame();
  }

  startGame() {
    if (this.isRunning) return;
    this.audio.ensureContext(); this.audio.startMusic();
    this.isRunning = true; this.isPaused = false; this.remainingMs = WhacAMole.ROUND_MS; this.pausedRemaining = this.remainingMs;
    this.levelStartScore = this.score; this.levelHits = 0; this.levelAttempts = 0; this.combo = 0; this.bestCombo = 0; this.roundStartingHigh = this.sessionHigh;
    this.roundEndsAt = performance.now() + this.remainingMs;
    this.els.startPause.textContent = 'Pause Game'; this.hideModal(); this.renderAll(); this.startTimerLoop(); this.scheduleSpawnLoop();
  }

  pauseGame() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true; this.pausedRemaining = Math.max(0, this.roundEndsAt - performance.now()); this.remainingMs = this.pausedRemaining;
    this.spawnLoopToken++; this.clearActiveCreatures(false); this.els.startPause.textContent = 'Resume Game'; this.audio.stopMusic(); this.renderTimer();
  }

  resumeGame() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false; this.roundEndsAt = performance.now() + this.pausedRemaining; this.els.startPause.textContent = 'Pause Game'; this.audio.startMusic(); this.startTimerLoop(); this.scheduleSpawnLoop();
  }

  startTimerLoop() {
    cancelAnimationFrame(this.timerRaf);
    const tick = now => {
      if (!this.isRunning || this.isPaused) return;
      this.remainingMs = Math.max(0, this.roundEndsAt - now);
      this.renderTimer();
      if (this.remainingMs <= 0) return this.finishRound();
      this.timerRaf = requestAnimationFrame(tick);
    };
    this.timerRaf = requestAnimationFrame(tick);
  }

  scheduleSpawnLoop() {
    const token = ++this.spawnLoopToken;
    const loop = () => {
      if (!this.isRunning || this.isPaused || token !== this.spawnLoopToken) return;
      this.spawnWave();
      const cfg = this.configForLevel();
      const jitter = Math.random() * cfg.spawnEvery * .18;
      this.setTimeout(loop, cfg.spawnEvery + jitter);
    };
    loop();
  }

  getSpawnCount() {
    const r = Math.random();
    if (this.level <= 2) return 1;
    if (this.level <= 4) return r < .30 ? 2 : 1;
    if (this.level <= 6) return r < .20 ? 3 : r < .70 ? 2 : 1;
    return r < .18 ? 4 : r < .46 ? 3 : r < .78 ? 2 : 1;
  }

  getCreatureType() {
    if (this.level < 4) return 'normal';
    const r = Math.random();
    if (r < .10) return 'golden';
    if (r < .22) return 'bomb';
    return 'normal';
  }

  spawnWave() {
    if (!this.isRunning || this.isPaused || this.isFrozen) return;
    const available = this.holes.map((_, i) => i).filter(i => !this.activeCreatures.has(i));
    const count = Math.min(this.getSpawnCount(), available.length);
    for (let n = 0; n < count; n++) {
      const pick = Math.floor(Math.random() * available.length);
      const holeIndex = available.splice(pick, 1)[0];
      this.spawnCreature(holeIndex, this.getCreatureType());
    }
  }

  spawnCreature(index, type) {
    const hole = this.holes[index]; if (!hole) return;
    const mask = hole.querySelector('.hole-mask');
    const wrap = document.createElement('span');
    wrap.className = `creature-wrap ${type}`;
    wrap.dataset.type = type; wrap.dataset.hit = 'false';
    const symbol = type === 'golden' ? 'creature-golden' : type === 'bomb' ? 'creature-bomb' : 'creature-normal';
    wrap.innerHTML = `<svg class="creature-svg" viewBox="0 0 120 120"><use href="#${symbol}"></use></svg>`;
    mask.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('visible'));
    this.makeDust(hole);

    const cfg = this.configForLevel();
    const lifetime = type === 'golden' ? 400 : cfg.popupMs;
    const record = { element: wrap, type, hit: false, timeout: null };
    record.timeout = this.setTimeout(() => this.expireCreature(index), lifetime);
    this.activeCreatures.set(index, record);
  }

  expireCreature(index) {
    const c = this.activeCreatures.get(index); if (!c) return;
    if (!c.hit && c.type !== 'bomb') this.resetCombo(true);
    c.element.classList.remove('visible');
    this.setTimeout(() => c.element.remove(), 170);
    this.activeCreatures.delete(index);
    this.renderHUD();
  }

  handleBoardInput(e) {
    if (e.pointerType === 'touch') this.lastTouchAt = performance.now();
    if (!this.isRunning || this.isPaused || this.isFrozen) return;
    const hole = e.target.closest('.hole'); if (!hole) return;
    e.preventDefault();
    this.levelAttempts++;
    const index = Number(hole.dataset.index);
    const c = this.activeCreatures.get(index);
    if (!c || c.hit) return this.handleMiss(e.clientX, e.clientY);
    this.handleHit(index, c, e.clientX, e.clientY);
  }

  handleHit(index, c, x, y) {
    c.hit = true; clearTimeout(c.timeout); this.timeouts.delete(c.timeout);
    if (c.type === 'bomb') return this.handleBomb(index, c, x, y);

    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.levelHits++;
    const mult = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
    const base = c.type === 'golden' ? 30 : 10;
    const gained = base * mult;
    this.score += gained;
    this.audio[c.type === 'golden' ? 'golden' : 'whack']();

    c.element.classList.add('hit');
    const use = c.element.querySelector('use');
    if (use && c.type === 'normal') use.setAttribute('href', '#creature-hit');
    this.particleBurst(x, y, c.type === 'golden' ? 'golden' : 'good');
    this.floatText(x, y, `+${gained}${mult > 1 ? ` • x${mult}` : ''}`, c.type === 'golden' ? 'golden' : '');
    if (this.combo === 5) this.announce('DOUBLE POINTS!');
    if (this.combo === 10) { this.announce('FRENZY MODE!'); this.screenShake(); }
    this.setTimeout(() => { c.element.classList.remove('visible'); this.setTimeout(() => c.element.remove(), 150); this.activeCreatures.delete(index); }, 120);
    this.updateHighScoreLive(); this.renderHUD();
  }

  handleBomb(index, c, x, y) {
    this.score = Math.max(0, this.score - 15); this.resetCombo(false); this.audio.bomb(); this.particleBurst(x, y, 'bad'); this.floatText(x, y, '-15 • FROZEN', 'bad'); this.screenShake();
    c.element.classList.add('hit'); this.isFrozen = true; this.els.freeze.classList.remove('show'); void this.els.freeze.offsetWidth; this.els.freeze.classList.add('show');
    this.setTimeout(() => { this.isFrozen = false; }, 1000);
    this.setTimeout(() => { c.element.classList.remove('visible'); this.setTimeout(() => c.element.remove(), 150); this.activeCreatures.delete(index); }, 140);
    this.renderHUD();
  }

  handleMiss(x, y) {
    this.resetCombo(false); this.audio.miss(); this.floatText(x, y, 'MISS', 'bad'); this.renderHUD();
  }

  resetCombo(fromExpired) {
    if (this.combo > 0 && !fromExpired) this.announce('COMBO LOST');
    this.combo = 0;
  }

  updateHighScoreLive() {
    if (this.score > this.sessionHigh) { this.sessionHigh = this.score; sessionStorage.setItem(WhacAMole.STORAGE_KEY, String(this.sessionHigh)); }
  }

  finishRound() {
    if (!this.isRunning) return;
    this.isRunning = false; this.isPaused = false; this.remainingMs = 0; this.spawnLoopToken++; cancelAnimationFrame(this.timerRaf); this.audio.stopMusic(); this.clearActiveCreatures(true); this.els.startPause.textContent = 'Start Game'; this.renderTimer();
    const cfg = this.configForLevel();
    const levelScore = this.score - this.levelStartScore;
    const passed = levelScore >= cfg.passTarget;
    const newHigh = this.score > this.roundStartingHigh;
    if (this.score > this.sessionHigh) { this.sessionHigh = this.score; sessionStorage.setItem(WhacAMole.STORAGE_KEY, String(this.score)); }
    if (passed) this.audio.levelUp();
    this.showResultModal(passed, levelScore, newHigh);
  }

  showResultModal(passed, levelScore, newHigh) {
    const accuracy = this.levelAttempts ? Math.round((this.levelHits / this.levelAttempts) * 100) : 0;
    this.els.modalBadge.textContent = passed ? 'LEVEL COMPLETE' : 'GAME OVER';
    this.els.modalTitle.textContent = passed ? `Level ${this.level} Cleared!` : 'Forest Run Over';
    this.els.modalSubtitle.textContent = passed ? 'The forest gets faster from here.' : 'You missed the pass target. Hit restart and chase the record.';
    this.els.modalStats.innerHTML = `
      <div class="modal-stat"><span>Total Hits</span><strong>${this.levelHits}</strong></div>
      <div class="modal-stat"><span>Accuracy</span><strong>${accuracy}%</strong></div>
      <div class="modal-stat"><span>Highest Combo</span><strong>${this.bestCombo}</strong></div>
      <div class="modal-stat"><span>Level Score</span><strong>${levelScore}</strong></div>`;
    this.els.highBanner.classList.toggle('hidden', !newHigh);
    this.els.modalActions.innerHTML = passed
      ? `<button class="arcade-btn primary" data-action="next">Next Level${this.level === 2 || this.level === 4 || this.level === 6 ? ' (Expand Grid)' : ''}</button><button class="arcade-btn" data-action="replay">Replay Level</button>`
      : `<button class="arcade-btn primary" data-action="restart">Restart Level 1</button>`;
    this.els.modal.classList.remove('hidden');
    if (newHigh) this.confetti();
  }

  nextLevel() { this.level++; this.turn++; this.levelStartScore = this.score; this.remainingMs = WhacAMole.ROUND_MS; this.clearScheduled(); this.clearActiveCreatures(false); this.buildGrid(); this.renderAll(); this.hideModal(); this.setTimeout(() => this.startGame(), 430); }
  replayLevel() { this.score = this.levelStartScore; this.turn++; this.remainingMs = WhacAMole.ROUND_MS; this.clearScheduled(); this.clearActiveCreatures(false); this.renderAll(); this.hideModal(); this.startGame(); }
  restartFromLevelOne() { this.clearScheduled(); this.clearActiveCreatures(false); this.resetRuntimeState(); this.buildGrid(); this.renderAll(); this.hideModal(); this.startGame(); }

  resetSession() {
    if (!confirm('Reset the active game AND erase this tab session high score?')) return;
    this.stopEverything(); sessionStorage.removeItem(WhacAMole.STORAGE_KEY); this.sessionHigh = 0; this.resetRuntimeState(); this.buildGrid(); this.hideModal(); this.renderAll();
  }

  stopEverything() { this.isRunning = false; this.isPaused = false; this.spawnLoopToken++; cancelAnimationFrame(this.timerRaf); this.audio.stopMusic(); this.clearScheduled(); this.clearActiveCreatures(false); }

  clearActiveCreatures(resolvePending) {
    for (const [index, c] of [...this.activeCreatures]) {
      if (resolvePending && !c.hit && c.type !== 'bomb') this.combo = 0;
      clearTimeout(c.timeout); this.timeouts.delete(c.timeout); c.element.remove(); this.activeCreatures.delete(index);
    }
  }

  setTimeout(fn, ms) { const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms); this.timeouts.add(id); return id; }
  clearScheduled() { this.timeouts.forEach(clearTimeout); this.intervals.forEach(clearInterval); this.timeouts.clear(); this.intervals.clear(); }

  renderAll() { this.renderHUD(); this.renderTimer(); this.renderDifficulty(); }
  renderHUD() {
    const mult = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
    this.els.score.textContent = this.score; this.els.high.textContent = this.sessionHigh; this.els.level.textContent = this.level; this.els.turn.textContent = this.turn; this.els.combo.textContent = `x${mult}`;
  }
  renderTimer() {
    const secs = Math.max(0, this.remainingMs / 1000); this.els.timer.textContent = secs.toFixed(1);
    const circumference = 188.5; const progress = Math.min(1, Math.max(0, this.remainingMs / WhacAMole.ROUND_MS));
    this.els.timerProgress.style.strokeDashoffset = String(circumference * (1 - progress));
    this.els.timerProgress.style.stroke = secs <= 5 ? 'var(--danger)' : secs <= 10 ? 'var(--gold)' : 'var(--neon)';
  }
  renderDifficulty() {
    const c = this.configForLevel();
    const spawnText = this.level <= 2 ? '1 spawn' : this.level <= 4 ? 'up to 2' : this.level <= 6 ? 'up to 3' : 'up to 4';
    this.els.difficulty.textContent = `${c.rows}×${c.cols} • ${spawnText} • ${c.popupMs}ms window`;
    this.els.target.textContent = `Pass target: ${c.passTarget} pts`;
  }

  announce(text) { this.els.announcement.textContent = text; this.els.announcement.classList.remove('show'); void this.els.announcement.offsetWidth; this.els.announcement.classList.add('show'); }
  screenShake() { this.els.viewport.classList.remove('shake'); void this.els.viewport.offsetWidth; this.els.viewport.classList.add('shake'); }
  
  
moveHammer(e) {
  if (e.pointerType === 'touch') return;

  const viewport = this.els.viewport;

  if (!viewport.contains(e.target)) {
    this.els.hammer.style.opacity = '0';
    return;
  }

  const hammer = this.els.hammer;

  hammer.style.setProperty('--hammer-x', `${e.clientX}px`);
  hammer.style.setProperty('--hammer-y', `${e.clientY}px`);
  hammer.style.opacity = '1';
}
swingHammer() {
  this.els.hammer.classList.remove('swing');

  requestAnimationFrame(() => {
    this.els.hammer.classList.add('swing');
  });
}
  makeDust(hole) {
    for (let i = 0; i < 5; i++) {
      const p = document.createElement('span'); p.className = 'dust-puff'; p.style.setProperty('--dx', `${(Math.random() - .5) * 58}px`); p.style.setProperty('--dy', `${-15 - Math.random() * 28}px`); hole.appendChild(p); this.setTimeout(() => p.remove(), 430);
    }
  }

  particleBurst(x, y, mode) {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('svg'); p.className = 'particle'; p.setAttribute('viewBox', '0 0 20 20'); p.innerHTML = '<use href="#star-particle"></use>';
      p.style.left = `${x - 6}px`; p.style.top = `${y - 6}px`;
      const angle = (Math.PI * 2 * i / count) + Math.random() * .35; const dist = 34 + Math.random() * 52;
      p.style.setProperty('--px', `${Math.cos(angle) * dist}px`); p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
      p.style.color = mode === 'bad' ? 'var(--danger)' : mode === 'golden' ? 'var(--gold)' : (i % 2 ? 'var(--neon)' : 'var(--cyan)');
      document.body.appendChild(p); this.setTimeout(() => p.remove(), 700);
    }
  }

  floatText(x, y, text, cls = '') { const el = document.createElement('div'); el.className = `float-text ${cls}`; el.textContent = text; el.style.left = `${x}px`; el.style.top = `${y}px`; document.body.appendChild(el); this.setTimeout(() => el.remove(), 720); }

  confetti() {
    this.els.confetti.innerHTML = '';
    for (let i = 0; i < 42; i++) {
      const c = document.createElement('i'); c.className = 'confetti'; c.style.left = `${Math.random() * 100}%`; c.style.setProperty('--hue', String(Math.floor(Math.random() * 360))); c.style.setProperty('--fall', `${1.4 + Math.random() * 1.5}s`); c.style.setProperty('--drift', `${(Math.random() - .5) * 180}px`); c.style.animationDelay = `${Math.random() * .35}s`; this.els.confetti.appendChild(c);
    }
  }

  hideModal() { this.els.modal.classList.add('hidden'); this.els.highBanner.classList.add('hidden'); this.els.confetti.innerHTML = ''; }
}

window.addEventListener('DOMContentLoaded', () => new WhacAMole());
