/**
 * AR Mini-Games Engine for Hand Tracker
 * Games:
 * 1. Fruit Slicer (Cięcie owoców w AR)
 * 2. Bubble Pop (Pękanie baniek)
 * 3. Catch Stars (Grawitacyjny koszyk w dłoni)
 * 4. Cyber Synth (Wirtualny syntezator / perkusja AR)
 */

class ARGameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentMode = 'sandbox'; // 'sandbox' | 'slicer' | 'bubbles' | 'stars' | 'synth'

    this.score = 0;
    this.highScore = { slicer: 0, bubbles: 0, stars: 0, synth: 0 };
    this.combo = 0;
    this.comboTimer = null;
    this.lives = 3;
    this.isGameOver = false;

    // Entities
    this.particles = [];
    this.floatingTexts = [];
    this.slicerItems = [];
    this.bubbles = [];
    this.stars = [];
    this.synthPads = [];

    this.lastSpawnTime = 0;
    this.screenShake = 0;

    this.initSynthPads();
  }

  setMode(mode) {
    this.currentMode = mode;
    this.score = 0;
    this.combo = 0;
    this.lives = 3;
    this.isGameOver = false;
    this.particles = [];
    this.floatingTexts = [];
    this.slicerItems = [];
    this.bubbles = [];
    this.stars = [];
    this.lastSpawnTime = performance.now();

    if (mode === 'synth') {
      this.initSynthPads();
    }
  }

  initSynthPads() {
    this.synthPads = [];
    const notes = ['C', 'D', 'E', 'G', 'A', 'C+'];
    const colors = ['#ff3366', '#ff9933', '#ffff33', '#33ff99', '#33ccff', '#cc33ff'];
    const padCount = 6;
    const padWidth = this.canvas.width / (padCount + 1);
    const padHeight = 85;
    const padY = this.canvas.height * 0.35;

    for (let i = 0; i < padCount; i++) {
      this.synthPads.push({
        id: i,
        note: notes[i],
        color: colors[i],
        x: (i + 0.6) * padWidth,
        y: padY,
        width: padWidth * 0.85,
        height: padHeight,
        active: false,
        cooldown: 0
      });
    }
  }

  updateAndRender(activeHands) {
    const ctx = this.ctx;
    const now = performance.now();

    // Screen Shake effect (e.g. bomb explosion)
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      this.screenShake *= 0.85;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    // Execute active mini-game
    switch (this.currentMode) {
      case 'slicer':
        this.updateSlicer(activeHands, now);
        break;
      case 'bubbles':
        this.updateBubbles(activeHands, now);
        break;
      case 'stars':
        this.updateStars(activeHands, now);
        break;
      case 'synth':
        this.updateSynth(activeHands, now);
        break;
      case 'sandbox':
      default:
        // Free AR playground
        this.renderSandboxTips();
        break;
    }

    // Update Particles & Floating Text
    this.updateParticles();
    this.updateFloatingTexts();

    if (this.screenShake > 0) {
      ctx.restore();
    }
  }

  // ===================== GRA 1: FRUIT SLICER AR =====================
  updateSlicer(activeHands, now) {
    const ctx = this.ctx;

    // Spawn fruit
    if (now - this.lastSpawnTime > 1400) {
      this.lastSpawnTime = now;
      const count = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < count; i++) {
        const isBomb = Math.random() < 0.18;
        const types = [
          { emoji: '🍉', radius: 42, points: 15, color: '#ff3b30' },
          { emoji: '🍊', radius: 32, points: 20, color: '#ff9500' },
          { emoji: '🍎', radius: 34, points: 20, color: '#ff2d55' },
          { emoji: '🍌', radius: 36, points: 25, color: '#ffcc00' }
        ];
        const selected = isBomb 
          ? { emoji: '💣', radius: 38, points: -50, color: '#444444', isBomb: true }
          : types[Math.floor(Math.random() * types.length)];

        this.slicerItems.push({
          ...selected,
          x: Math.random() * (this.canvas.width * 0.7) + this.canvas.width * 0.15,
          y: this.canvas.height + 40,
          vx: (Math.random() - 0.5) * 6,
          vy: -(Math.random() * 5 + 15),
          gravity: 0.35,
          rotation: 0,
          vRot: (Math.random() - 0.5) * 0.1,
          sliced: false
        });
      }
    }

    // Process finger cutting for each active hand
    for (const hand of activeHands) {
      const tip = hand.indexTip;
      // Check collision with items
      for (const item of this.slicerItems) {
        if (item.sliced) continue;
        const dist = Math.hypot(item.x - tip.x, item.y - tip.y);
        if (dist < item.radius + 20) {
          item.sliced = true;
          if (item.isBomb) {
            window.sounds.playExplosion();
            this.screenShake = 25;
            this.lives = Math.max(0, this.lives - 1);
            this.score = Math.max(0, this.score - 50);
            this.combo = 0;
            this.addFloatingText('BOMBA! -50', item.x, item.y, '#ff3b30');
            this.createExplosionParticles(item.x, item.y, '#ff3b30', 40);
          } else {
            window.sounds.playSlice();
            this.combo++;
            const pointsGained = item.points * (this.combo > 2 ? 2 : 1);
            this.score += pointsGained;
            this.addFloatingText(`+${pointsGained}${this.combo > 2 ? ' COMBO!' : ''}`, item.x, item.y, '#00ffcc');
            this.createSplashParticles(item.x, item.y, item.color, 25);
          }
        }
      }
    }

    // Update and draw items
    for (let i = this.slicerItems.length - 1; i >= 0; i--) {
      const it = this.slicerItems[i];
      it.x += it.vx;
      it.y += it.vy;
      it.vy += it.gravity;
      it.rotation += it.vRot;

      if (!it.sliced) {
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rotation);
        ctx.font = `${it.radius * 1.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.emoji, 0, 0);
        ctx.restore();
      }

      // Remove offscreen or sliced
      if (it.y > this.canvas.height + 80 || it.sliced) {
        this.slicerItems.splice(i, 1);
      }
    }
  }

  // ===================== GRA 2: BUBBLE POP AR =====================
  updateBubbles(activeHands, now) {
    const ctx = this.ctx;

    // Spawn bubbles
    if (now - this.lastSpawnTime > 900) {
      this.lastSpawnTime = now;
      const isGold = Math.random() < 0.2;
      this.bubbles.push({
        x: Math.random() * (this.canvas.width * 0.8) + this.canvas.width * 0.1,
        y: this.canvas.height + 50,
        radius: Math.random() * 25 + 35,
        speed: Math.random() * 2.5 + 2,
        wobble: Math.random() * Math.PI * 2,
        isGold,
        color: isGold ? 'rgba(255, 215, 0, 0.65)' : 'rgba(0, 240, 255, 0.55)',
        stroke: isGold ? '#ffd700' : '#00f0ff',
        popped: false
      });
    }

    // Check interaction with hands (Touch or Pinch)
    for (const hand of activeHands) {
      const touchPoint = hand.isPinching 
        ? { x: (hand.indexTip.x + hand.thumbTip.x) / 2, y: (hand.indexTip.y + hand.thumbTip.y) / 2 }
        : hand.indexTip;

      for (const b of this.bubbles) {
        if (b.popped) continue;
        const d = Math.hypot(b.x - touchPoint.x, b.y - touchPoint.y);
        if (d < b.radius + (hand.isPinching ? 25 : 12)) {
          b.popped = true;
          window.sounds.playPop(b.isGold ? 880 : 580);
          const pts = b.isGold ? 50 : 20;
          this.score += pts;
          this.addFloatingText(`+${pts}`, b.x, b.y, b.isGold ? '#ffd700' : '#00ffff');
          this.createBubbleBurst(b.x, b.y, b.stroke, 20);
        }
      }
    }

    // Render & update bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.speed;
      b.wobble += 0.04;
      b.x += Math.sin(b.wobble) * 1.5;

      if (!b.popped) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = b.stroke;
        ctx.shadowColor = b.stroke;
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Bubble light reflection
        ctx.beginPath();
        ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.restore();
      }

      if (b.y < -80 || b.popped) {
        this.bubbles.splice(i, 1);
      }
    }
  }

  // ===================== GRA 3: CATCH FALLING STARS =====================
  updateStars(activeHands, now) {
    const ctx = this.ctx;

    // Spawn falling stars
    if (now - this.lastSpawnTime > 1000) {
      this.lastSpawnTime = now;
      this.stars.push({
        x: Math.random() * (this.canvas.width * 0.8) + this.canvas.width * 0.1,
        y: -40,
        speed: Math.random() * 3 + 3,
        emoji: Math.random() < 0.25 ? '💎' : '⭐',
        points: 25,
        collected: false
      });
    }

    // Check collection with open hands
    for (const hand of activeHands) {
      // Glow forcefield around hand
      const palm = hand.palmCenter;
      const isOpen = hand.gesture.includes('OTWARTA') || hand.gesture.includes('DŁOŃ');
      const forceRadius = isOpen ? 95 : 55;

      ctx.save();
      ctx.beginPath();
      ctx.arc(palm.x, palm.y, forceRadius, 0, Math.PI * 2);
      ctx.fillStyle = isOpen ? 'rgba(0, 255, 180, 0.18)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = isOpen ? '#00ffb4' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.shadowColor = isOpen ? '#00ffb4' : '#ffffff';
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();

      // Attract and collect stars
      for (const s of this.stars) {
        if (s.collected) continue;
        const d = Math.hypot(s.x - palm.x, s.y - palm.y);

        // Magnetic attraction if close
        if (d < forceRadius * 1.6 && isOpen) {
          s.x += (palm.x - s.x) * 0.2;
          s.y += (palm.y - s.y) * 0.2;
        }

        if (d < forceRadius) {
          s.collected = true;
          window.sounds.playStarChime(this.score / 25);
          this.score += s.points;
          this.addFloatingText(`+${s.points}`, s.x, s.y, '#ffff00');
          this.createSplashParticles(s.x, s.y, '#ffe600', 20);
        }
      }
    }

    // Render stars
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.y += s.speed;

      if (!s.collected) {
        ctx.save();
        ctx.font = '36px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, s.x, s.y);
        ctx.restore();
      }

      if (s.y > this.canvas.height + 50 || s.collected) {
        this.stars.splice(i, 1);
      }
    }
  }

  // ===================== GRA 4: CYBER SYNTH AR =====================
  updateSynth(activeHands, now) {
    const ctx = this.ctx;

    // Check pad triggers
    for (const pad of this.synthPads) {
      let triggered = false;

      for (const hand of activeHands) {
        const tip = hand.indexTip;
        if (
          tip.x >= pad.x &&
          tip.x <= pad.x + pad.width &&
          tip.y >= pad.y &&
          tip.y <= pad.y + pad.height
        ) {
          triggered = true;
          break;
        }
      }

      if (triggered) {
        if (!pad.active && now > pad.cooldown) {
          pad.active = true;
          pad.cooldown = now + 180;
          window.sounds.playSynthNote(pad.id);
          this.score += 5;
          this.createSplashParticles(pad.x + pad.width / 2, pad.y + pad.height / 2, pad.color, 15);
        }
      } else {
        pad.active = false;
      }

      // Draw AR Pad
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pad.x, pad.y, pad.width, pad.height, 16);
      ctx.fillStyle = pad.active ? pad.color : 'rgba(20, 25, 45, 0.7)';
      ctx.fill();
      ctx.lineWidth = pad.active ? 4 : 2;
      ctx.strokeStyle = pad.color;
      ctx.shadowColor = pad.color;
      ctx.shadowBlur = pad.active ? 25 : 8;
      ctx.stroke();

      // Pad text
      ctx.fillStyle = pad.active ? '#000000' : '#ffffff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pad.note, pad.x + pad.width / 2, pad.y + pad.height / 2);
      ctx.restore();
    }
  }

  renderSandboxTips() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('⚡ Tryb Swobodny AR: Wyciągnij dłoń do kamery i testuj gesty!', this.canvas.width / 2, this.canvas.height - 30);
    ctx.restore();
  }

  // ===================== EFEKTY WIZUALNE =====================
  addFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1,
      vy: -2
    });
  }

  updateFloatingTexts() {
    const ctx = this.ctx;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  createSplashParticles(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  createBubbleBurst(x, y, color, count = 15) {
    this.createSplashParticles(x, y, color, count);
  }

  createExplosionParticles(x, y, color, count = 40) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 8 + 4,
        color,
        alpha: 1,
        decay: 0.02
      });
    }
  }

  updateParticles() {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }
}

window.ARGameEngine = ARGameEngine;
