/**
 * MediaPipe Hand Tracker & AR Visualizer
 * Fully optimized for high-refresh-rate mobile and tablet screens (Huawei MatePad 12 X 144Hz)
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
    this.activeHands = [];
    this.trails = new Map(); // fingertip trails
    this.showSkeleton = true;
    this.showLabels = true;
    this.fps = 0;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsTimer = performance.now();
  }

  async init() {
    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1, // 1 balances high accuracy with smooth 60fps on modern mobile chipsets
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });

    this.hands.onResults((results) => this.handleResults(results));

    await this.startCamera();
  }

  async startCamera() {
    if (this.camera) {
      await this.camera.stop();
    }

    // Try modern getUserMedia directly for optimal mobile resolution
    const constraints = {
      video: {
        facingMode: this.facingMode,
        width: { ideal: 1920, max: 2560 },
        height: { ideal: 1080, max: 1600 },
        frameRate: { ideal: 60, min: 30 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });

      this.camera = new Camera(this.video, {
        onFrame: async () => {
          await this.hands.send({ image: this.video });
        },
        width: 1280,
        height: 720
      });

      await this.camera.start();
    } catch (err) {
      console.warn('Fallback standard camera initialization:', err);
      // Fallback to Camera helper
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          await this.hands.send({ image: this.video });
        },
        width: 1280,
        height: 720
      });
      await this.camera.start();
    }
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

  handleResults(results) {
    // Calculate FPS
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
        const handedness = results.multiHandedness && results.multiHandedness[i] 
          ? results.multiHandedness[i].label 
          : (i === 0 ? 'Right' : 'Left');

        // Transform landmarks to canvas coordinates taking mirror into account
        const landmarks = rawLandmarks.map((pt, idx) => {
          const x = this.isMirrored ? (1 - pt.x) * this.canvas.width : pt.x * this.canvas.width;
          const y = pt.y * this.canvas.height;
          const z = pt.z;
          return { x, y, z, rawX: pt.x, rawY: pt.y, id: idx };
        });

        // Compute Key Features
        const gesture = this.classifyGesture(landmarks);
        const palmCenter = this.getPalmCenter(landmarks);
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const pinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const isPinching = pinchDistance < (this.canvas.width * 0.055);

        // Update trail for index tip
        this.updateTrail(i, indexTip);

        this.activeHands.push({
          id: i,
          handedness,
          landmarks,
          gesture,
          palmCenter,
          indexTip,
          thumbTip,
          pinchDistance,
          isPinching
        });
      }
    }

    // Call game callback with the processed hands
    if (this.onResultsCallback) {
      this.onResultsCallback(this.activeHands, results);
    }

    // Render AR overlay
    if (this.showSkeleton) {
      this.renderSkeleton();
    }
  }

  updateTrail(handId, point) {
    if (!this.trails.has(handId)) {
      this.trails.set(handId, []);
    }
    const trail = this.trails.get(handId);
    trail.push({ x: point.x, y: point.y, time: performance.now() });

    // Keep last 15 points
    if (trail.length > 15) {
      trail.shift();
    }
  }

  classifyGesture(lm) {
    const isFingerExtended = (tipIdx, pipIdx) => {
      // Finger is extended if tip is higher (lower Y) than PIP joint when hand is upright
      // Or distance from wrist to tip is greater than wrist to PIP
      const dTip = Math.hypot(lm[tipIdx].x - lm[0].x, lm[tipIdx].y - lm[0].y);
      const dPip = Math.hypot(lm[pipIdx].x - lm[0].x, lm[pipIdx].y - lm[0].y);
      return dTip > dPip * 1.15;
    };

    const thumbExt = Math.hypot(lm[4].x - lm[2].x, lm[4].y - lm[2].y) > Math.hypot(lm[3].x - lm[2].x, lm[3].y - lm[2].y) * 1.2;
    const indexExt = isFingerExtended(8, 6);
    const middleExt = isFingerExtended(12, 10);
    const ringExt = isFingerExtended(16, 14);
    const pinkyExt = isFingerExtended(20, 18);

    const pinchDist = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);
    if (pinchDist < this.canvas.width * 0.05) {
      return 'PINCH 🤏';
    }

    if (indexExt && middleExt && ringExt && pinkyExt) {
      return 'OTWARTA DŁOŃ ✋';
    }

    if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
      return 'PIĘŚĆ ✊';
    }

    if (indexExt && !middleExt && !ringExt && !pinkyExt) {
      return 'WSKAZANIE ☝️';
    }

    if (indexExt && middleExt && !ringExt && !pinkyExt) {
      return 'POKÓJ / VICTORY ✌️';
    }

    if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      return 'KCIUK W GÓRĘ 👍';
    }

    return 'DŁOŃ';
  }

  getPalmCenter(lm) {
    const indices = [0, 5, 9, 13, 17];
    let sumX = 0;
    let sumY = 0;
    for (const idx of indices) {
      sumX += lm[idx].x;
      sumY += lm[idx].y;
    }
    return {
      x: sumX / indices.length,
      y: sumY / indices.length
    };
  }

  renderSkeleton() {
    const ctx = this.ctx;
    const connections = [
      // Palm
      [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [17, 0],
      // Thumb
      [1, 2], [2, 3], [3, 4],
      // Index
      [5, 6], [6, 7], [7, 8],
      // Middle
      [9, 10], [10, 11], [11, 12],
      // Ring
      [13, 14], [14, 15], [15, 16],
      // Pinky
      [17, 18], [18, 19], [19, 20]
    ];

    for (const hand of this.activeHands) {
      const lm = hand.landmarks;
      const isRight = hand.handedness === 'Right';
      const mainColor = isRight ? '#00f7ff' : '#ff007f';
      const glowColor = isRight ? 'rgba(0, 247, 255, 0.6)' : 'rgba(255, 0, 127, 0.6)';

      // 1. Draw glowing bones
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = mainColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.lineCap = 'round';

      for (const [start, end] of connections) {
        ctx.beginPath();
        ctx.moveTo(lm[start].x, lm[start].y);
        ctx.lineTo(lm[end].x, lm[end].y);
        ctx.stroke();
      }

      // 2. Draw Fingertip Trail (Laser)
      const trail = this.trails.get(hand.id);
      if (trail && trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let t = 1; t < trail.length; t++) {
          ctx.lineTo(trail[t].x, trail[t].y);
        }
        ctx.strokeStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      // 3. Draw Joints
      for (let i = 0; i < lm.length; i++) {
        const pt = lm[i];
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 8 : 5;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#ffffff' : mainColor;
        ctx.shadowColor = isTip ? '#ffffff' : glowColor;
        ctx.shadowBlur = isTip ? 16 : 8;
        ctx.fill();

        if (isTip) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = mainColor;
          ctx.stroke();
        }
      }

      // 4. Draw HUD Label above hand
      if (this.showLabels) {
        const topPt = lm[12]; // middle tip
        ctx.save();
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        const label = `${hand.handedness === 'Right' ? 'Prawa' : 'Lewa'} • ${hand.gesture}`;
        const textWidth = ctx.measureText(label).width;
        const boxX = topPt.x - textWidth / 2 - 12;
        const boxY = Math.max(30, topPt.y - 40);

        // Glassmorphism pill
        ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, textWidth + 24, 28, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(label, topPt.x, boxY + 19);
        ctx.restore();
      }

      // 5. Pinch Indicator
      if (hand.isPinching) {
        const midPinchX = (hand.indexTip.x + hand.thumbTip.x) / 2;
        const midPinchY = (hand.indexTip.y + hand.thumbTip.y) / 2;
        ctx.beginPath();
        ctx.arc(midPinchX, midPinchY, 20, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

window.HandTracker = HandTracker;
