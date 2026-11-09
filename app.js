/**
 * Main Application Controller for Huawei MatePad 12 X AR Hand Tracker
 */

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('webcam');
  const canvas = document.getElementById('ar-canvas');
  const fpsBadge = document.getElementById('fps-badge');
  const scoreVal = document.getElementById('score-val');
  const livesBox = document.getElementById('lives-box');
  const livesVal = document.getElementById('lives-val');
  const modalOverlay = document.getElementById('modal-overlay');
  const btnStart = document.getElementById('btn-start-app');
  const spinner = document.getElementById('loading-spinner');

  // Control Buttons
  const btnCamera = document.getElementById('btn-camera');
  const btnMirror = document.getElementById('btn-mirror');
  const btnSkeleton = document.getElementById('btn-skeleton');
  const btnSound = document.getElementById('btn-sound');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const gameTabs = document.querySelectorAll('.game-tab');

  let tracker = null;
  let gameEngine = null;
  let isRunning = false;

  // Responsive Canvas Sizing (Supporting Huawei MatePad 12 X 2.8K display)
  function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    if (gameEngine && gameEngine.currentMode === 'synth') {
      gameEngine.initSynthPads();
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Initialize Game Engine
  gameEngine = new ARGameEngine(canvas);

  // Results callback from Hand Tracker
  function onHandResults(activeHands) {
    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update FPS
    if (tracker) {
      fpsBadge.textContent = `FPS: ${tracker.fps}`;
    }

    // Update Game State
    gameEngine.updateAndRender(activeHands);

    // Update HUD Stats
    scoreVal.textContent = gameEngine.score;
    if (gameEngine.currentMode === 'slicer') {
      livesBox.style.display = 'flex';
      let hearts = '';
      for (let i = 0; i < gameEngine.lives; i++) hearts += '❤️';
      livesVal.textContent = hearts || '💀 KONIEC!';
    } else {
      livesBox.style.display = 'none';
    }
  }

  // Start Camera and Tracking
  btnStart.addEventListener('click', async () => {
    btnStart.style.display = 'none';
    spinner.style.display = 'inline-block';

    // Init Audio Context on user gesture
    window.sounds.init();
    window.sounds.playPop(750);

    try {
      tracker = new HandTracker(canvas, video, onHandResults);
      await tracker.init();

      modalOverlay.style.opacity = '0';
      setTimeout(() => {
        modalOverlay.style.display = 'none';
      }, 400);

      isRunning = true;
    } catch (err) {
      console.error('Camera initialization error:', err);
      alert('Nie udało się uzyskać dostępu do kamery. Upewnij się, że zezwoliłeś przeglądarce na dostęp do kamery lub otwórz stronę przez protokół HTTPS!');
      btnStart.style.display = 'inline-block';
      spinner.style.display = 'none';
    }
  });

  // Switch Camera
  btnCamera.addEventListener('click', async () => {
    if (!tracker) return;
    window.sounds.playUiClick();
    const mode = await tracker.switchCamera();
    if (mode === 'user') {
      video.classList.add('mirrored');
      btnMirror.classList.add('active');
    } else {
      video.classList.remove('mirrored');
      btnMirror.classList.remove('active');
    }
  });

  // Toggle Mirror
  btnMirror.addEventListener('click', () => {
    if (!tracker) return;
    window.sounds.playUiClick();
    const mirrored = tracker.toggleMirror();
    video.classList.toggle('mirrored', mirrored);
    btnMirror.classList.toggle('active', mirrored);
  });

  // Toggle Skeleton
  btnSkeleton.addEventListener('click', () => {
    if (!tracker) return;
    window.sounds.playUiClick();
    tracker.showSkeleton = !tracker.showSkeleton;
    btnSkeleton.classList.toggle('active', tracker.showSkeleton);
  });

  // Toggle Sound
  btnSound.addEventListener('click', () => {
    window.sounds.playUiClick();
    const enabled = window.sounds.toggle();
    btnSound.classList.toggle('active', enabled);
    btnSound.textContent = enabled ? '🔊' : '🔇';
  });

  // Toggle Fullscreen
  btnFullscreen.addEventListener('click', () => {
    window.sounds.playUiClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Game Mode Selection
  gameTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      window.sounds.playUiClick();
      gameTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      gameEngine.setMode(mode);
    });
  });

  // Register PWA Service Worker for offline capability
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.log('SW registration skipped:', err);
      });
    });
  }
});
