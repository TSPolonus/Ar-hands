/**
 * AR Hand Tracker & Biometric Mesh Visualizer
 * Proven Camera Pipeline using MediaPipe Camera helper with lag-free frame dropping
 */

class HandTracker {
  constructor(canvas, videoElement, onResultsCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.video = videoElement;
    this.onResultsCallback = onResultsCallback;

    this.hands = null;
    this.camera = null;
    this.isMirrored = true;
    this.facingMode = 'user'; // 'user' (front) or 'environment' (back)
    this.invertHandedness = false;
    this.pointDensity = 'dense'; // 'dense' (56+ points) or 'standard' (21 points)
    this.showSkeleton = true;
    this.showLabels = true;
    this.isProcessing = false;

    this.activeHands = [];
    this.trails = new Map();
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = performance.now();
  }

  async init() {
    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0, // Lite model: blazing fast 60+ FPS without lag
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results) => this.handleResults(results));

    await this.startCamera();
  }

  async startCamera() {
    if (this.camera) {
      try { await this.camera.stop(); } catch (e) {}
    }

    // Set video attributes for iOS/iPadOS Safari & Android
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;

    // Use MediaPipe's Camera helper - 100% reliable across mobile and desktop
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (this.isProcessing) return; // Drop frame if still computing -> ZERO LAG!
        this.isProcessing = true;
        try {
          await this.hands.send({ image: this.video });
        } catch (err) {
          // Ignore transient frame errors
        } finally {
          this.isProcessing = false;
        }
      },
      facingMode: this.facingMode,
      width: 1280,
      height: 720
    });

    await this.camera.start();
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.isMirrored = this.facingMode === 'user';
    await this.startCamera();
    return this.facingMode;
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    return this.isMirrored;
  }

  toggleHandInversion() {
    this.invertHandedness = !this.invertHandedness;
    return this.invertHandedness;
  }

  togglePointDensity() {
    this.pointDensity = this.pointDensity === 'dense' ? 'standard' : 'dense';
    return this.pointDensity;
  }

  handleResults(results) {
    const now = performance.now();
    this.frameCount++;
    if (now - this.fpsTimer >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = now;
    }

    this.activeHands = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const rawLandmarks = results.multiHandLandmarks[i];

        // Correct Handedness:
        // In selfie/mirrored view, flip so real left hand is 'Left' (Lewa) and right is 'Right' (Prawa)
        let detected = (results.multiHandedness && results.multiHandedness[i])
          ? results.multiHandedness[i].label
          : (i === 0 ? 'Left' : 'Right');

        let handedness = (detected === 'Left') ? 'Right' : 'Left';
        if (this.invertHandedness) {
          handedness = (handedness === 'Right') ? 'Left' : 'Right';
        }

        const landmarks = rawLandmarks.map((pt, idx) => {
          const x = this.isMirrored ? (1 - pt.x) * this.canvas.width : pt.x * this.canvas.width;
          const y = pt.y * this.canvas.height;
          const z = pt.z;
          return { x, y, z, id: idx };
        });

        // Compute 56+ Biometric Nodes
        const biometricNodes = this.computeBiometricNodes(landmarks);

        // Compute Gestures & Palm Data
        const palmCenter = this.getPalmCenter(landmarks);
        const gestureData = this.classifyGesture(landmarks, palmCenter);
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const pinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const isPinching = pinchDistance < (this.canvas.width * 0.055);

        this.updateTrail(i, indexTip);

        this.activeHands.push({
          id: i,
          handedness,
          landmarks,
          biometricNodes,
          gesture: gestureData.name,
          isClosed: gestureData.isClosed,
          grabFactor: gestureData.grabFactor,
          palmCenter,
          indexTip,
          thumbTip,
          pinchDistance,
          isPinching
        });
      }
    }

    if (this.onResultsCallback) {
      this.onResultsCallback(this.activeHands, results);
    }

    if (this.showSkeleton) {
      this.renderSkeleton();
    }
  }

  computeBiometricNodes(lm) {
    const nodes = [];
    const bones = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    for (let b = 0; b < bones.length; b++) {
      const p1 = lm[bones[b][0]];
      const p2 = lm[bones[b][1]];
      nodes.push({
        id: 21 + b,
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        type: 'midpoint'
      });
    }

    // Webbing & palm mounds
    const webThumbIndex = { x: (lm[2].x + lm[5].x) / 2, y: (lm[2].y + lm[5].y) / 2, type: 'webbing' };
    const webIndexMid = { x: (lm[5].x + lm[9].x) / 2, y: (lm[5].y + lm[9].y) / 2, type: 'webbing' };
    const webMidRing = { x: (lm[9].x + lm[13].x) / 2, y: (lm[9].y + lm[13].y) / 2, type: 'webbing' };
    const webRingPinky = { x: (lm[13].x + lm[17].x) / 2, y: (lm[13].y + lm[17].y) / 2, type: 'webbing' };

    const thenar = { x: (lm[1].x + lm[2].x + lm[0].x) / 3, y: (lm[1].y + lm[2].y + lm[0].y) / 3, type: 'muscle' };
    const hypothenar = { x: (lm[17].x + lm[0].x) / 2, y: (lm[17].y + lm[0].y) / 2, type: 'muscle' };
    const palmCenter = this.getPalmCenter(lm);
    const upperPalm = { x: (lm[5].x + lm[17].x) / 2, y: (lm[5].y + lm[17].y) / 2, type: 'palm' };
    const lowerPalm = { x: (palmCenter.x + lm[0].x) / 2, y: (palmCenter.y + lm[0].y) / 2, type: 'palm' };

    nodes.push(webThumbIndex, webIndexMid, webMidRing, webRingPinky, thenar, hypothenar, palmCenter, upperPalm, lowerPalm);

    // Fingertip auras
    const tipPairs = [[3, 4], [7, 8], [11, 12], [15, 16], [19, 20]];
    for (const [pip, tip] of tipPairs) {
      const dx = lm[tip].x - lm[pip].x;
      const dy = lm[tip].y - lm[pip].y;
      nodes.push({
        x: lm[tip].x + dx * 0.35,
        y: lm[tip].y + dy * 0.35,
        type: 'aura'
      });
    }

    return nodes;
  }

  updateTrail(handId, point) {
    if (!this.trails.has(handId)) {
      this.trails.set(handId, []);
    }
    const trail = this.trails.get(handId);
    trail.push({ x: point.x, y: point.y, time: performance.now() });
    if (trail.length > 12) {
      trail.shift();
    }
  }

  classifyGesture(lm, palmCenter) {
    const isFingerExtended = (tipIdx, pipIdx) => {
      const dTip = Math.hypot(lm[tipIdx].x - lm[0].x, lm[tipIdx].y - lm[0].y);
      const dPip = Math.hypot(lm[pipIdx].x - lm[0].x, lm[pipIdx].y - lm[0].y);
      return dTip > dPip * 1.15;
    };

    const thumbExt = Math.hypot(lm[4].x - lm[2].x, lm[4].y - lm[2].y) > Math.hypot(lm[3].x - lm[2].x, lm[3].y - lm[2].y) * 1.2;
    const indexExt = isFingerExtended(8, 6);
    const middleExt = isFingerExtended(12, 10);
    const ringExt = isFingerExtended(16, 14);
    const pinkyExt = isFingerExtended(20, 18);

    const tips = [lm[8], lm[12], lm[16], lm[20]];
    let avgTipDistToPalm = 0;
    for (const t of tips) {
      avgTipDistToPalm += Math.hypot(t.x - palmCenter.x, t.y - palmCenter.y);
    }
    avgTipDistToPalm /= tips.length;

    const handScale = Math.hypot(lm[9].x - lm[0].x, lm[9].y - lm[0].y) || 100;
    const grabFactor = avgTipDistToPalm / handScale;
    const isClosed = grabFactor < 0.68 || (!indexExt && !middleExt && !ringExt && !pinkyExt);

    const pinchDist = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);
    if (pinchDist < this.canvas.width * 0.05) {
      return { name: 'PINCH 🤏', isClosed: false, grabFactor };
    }

    if (isClosed) {
      return { name: 'PIĘŚĆ ✊', isClosed: true, grabFactor };
    }

    if (indexExt && middleExt && ringExt && pinkyExt) {
      return { name: 'OTWARTA DŁOŃ ✋', isClosed: false, grabFactor };
    }

    if (indexExt && !middleExt && !ringExt && !pinkyExt) {
      return { name: 'WSKAZANIE ☝️', isClosed: false, grabFactor };
    }

    if (indexExt && middleExt && !ringExt && !pinkyExt) {
      return { name: 'POKÓJ / VICTORY ✌️', isClosed: false, grabFactor };
    }

    if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      return { name: 'KCIUK W GÓRĘ 👍', isClosed: false, grabFactor };
    }

    return { name: 'DŁOŃ', isClosed, grabFactor };
  }

  getPalmCenter(lm) {
    const indices = [0, 5, 9, 13, 17];
    let sumX = 0, sumY = 0;
    for (const idx of indices) {
      sumX += lm[idx].x;
      sumY += lm[idx].y;
    }
    return { x: sumX / indices.length, y: sumY / indices.length };
  }

  renderSkeleton() {
    const ctx = this.ctx;
    const connections = [
      [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [17, 0],
      [1, 2], [2, 3], [3, 4],
      [5, 6], [6, 7], [7, 8],
      [9, 10], [10, 11], [11, 12],
      [13, 14], [14, 15], [15, 16],
      [17, 18], [18, 19], [19, 20]
    ];

    for (const hand of this.activeHands) {
      const lm = hand.landmarks;
      const isRight = hand.handedness === 'Right';
      const mainColor = isRight ? '#00f7ff' : '#ff007f';
      const glowColor = isRight ? 'rgba(0, 247, 255, 0.28)' : 'rgba(255, 0, 127, 0.28)';

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Cyber Wireframe Palm Mesh (56+ Points)
      if (this.pointDensity === 'dense') {
        ctx.beginPath();
        const palmCenter = hand.palmCenter;
        for (const idx of [0, 1, 5, 9, 13, 17]) {
          ctx.moveTo(palmCenter.x, palmCenter.y);
          ctx.lineTo(lm[idx].x, lm[idx].y);
        }
        ctx.strokeStyle = isRight ? 'rgba(0, 247, 255, 0.35)' : 'rgba(255, 0, 127, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (let j = 0; j < hand.biometricNodes.length; j++) {
          const node = hand.biometricNodes[j];
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.type === 'aura' ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = node.type === 'aura' ? '#ffff00' : (isRight ? '#66ffff' : '#ff66b2');
          ctx.fill();
        }
      }

      // 2. High-Performance Dual-Pass Neon Bones (No shadowBlur CPU lag)
      ctx.beginPath();
      for (const [start, end] of connections) {
        ctx.moveTo(lm[start].x, lm[start].y);
        ctx.lineTo(lm[end].x, lm[end].y);
      }
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // 3. Fingertip Laser Trail
      const trail = this.trails.get(hand.id);
      if (trail && trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let t = 1; t < trail.length; t++) {
          ctx.lineTo(trail[t].x, trail[t].y);
        }
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.4)';
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.strokeStyle = '#ffff55';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // 4. Core 21 Joints
      for (let i = 0; i < lm.length; i++) {
        const pt = lm[i];
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 7 : 4;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#ffffff' : mainColor;
        ctx.fill();
      }

      // 5. Floating Cyber HUD Pill
      if (this.showLabels) {
        const topPt = lm[12];
        const handedText = isRight ? 'Prawa' : 'Lewa';
        const label = `${handedText} • ${hand.gesture}`;
        
        ctx.font = 'bold 14px system-ui, sans-serif';
        const textWidth = ctx.measureText(label).width;
        const boxX = topPt.x - textWidth / 2 - 10;
        const boxY = Math.max(25, topPt.y - 36);

        ctx.fillStyle = 'rgba(10, 16, 32, 0.82)';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, textWidth + 20, 26, 13);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(label, topPt.x, boxY + 18);
      }

      // 6. Fist Indicator Ring
      if (hand.isClosed) {
        ctx.beginPath();
        ctx.arc(hand.palmCenter.x, hand.palmCenter.y, 45, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

window.HandTracker = HandTracker;
