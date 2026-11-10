/**
 * Main Application Controller for Huawei MatePad 12 X AR Hand Tracker & Multiplayer Duels
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
  const cameraErrorMsg = document.getElementById('camera-error-msg');

  // Control Buttons
  const btnCamera = document.getElementById('btn-camera');
  const btnMirror = document.getElementById('btn-mirror');
  const btnSkeleton = document.getElementById('btn-skeleton');
  const btnSound = document.getElementById('btn-sound');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnSwapHands = document.getElementById('btn-swap-hands');
  const btnDensity = document.getElementById('btn-density');
  const btnMultiplayer = document.getElementById('btn-multiplayer');
  const gameTabs = document.querySelectorAll('.game-tab');

  // Multiplayer Modals & Elements
  const mpModal = document.getElementById('multiplayer-modal');
  const btnCloseMp = document.getElementById('btn-close-mp');
  const tabHost = document.getElementById('tab-host');
  const tabJoin = document.getElementById('tab-join');
  const viewHost = document.getElementById('view-host');
  const viewJoin = document.getElementById('view-join');
  const displayRoomCode = document.getElementById('display-room-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const hostStatus = document.getElementById('host-status');
  const btnStartDuel = document.getElementById('btn-start-duel');
  const mpSelectGame = document.getElementById('mp-select-game');
  const inputRoomCode = document.getElementById('input-room-code');
  const btnDoJoin = document.getElementById('btn-do-join');
  const joinStatus = document.getElementById('join-status');

  // Live Duel Elements
  const duelHudBar = document.getElementById('duel-hud-bar');
  const duelMyScore = document.getElementById('duel-my-score');
  const duelOppScore = document.getElementById('duel-opp-score');
  const duelTimer = document.getElementById('duel-timer');

  // Duel End Modal
  const duelEndModal = document.getElementById('duel-end-modal');
  const duelResultTitle = document.getElementById('duel-result-title');
  const duelFinalMy = document.getElementById('duel-final-my');
  const duelFinalOpp = document.getElementById('duel-final-opp');
  const btnCloseDuelEnd = document.getElementById('btn-close-duel-end');

  let tracker = null;
  let gameEngine = null;
  let mpManager = null;
  let isRunning = false;

  // Responsive Canvas Sizing (Huawei MatePad 12 X)
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameEngine && gameEngine.currentMode === 'synth') {
      gameEngine.initSynthPads();
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Initialize Game & Multiplayer Engines safely
  gameEngine = new ARGameEngine(canvas);
  try {
    mpManager = new MultiplayerManager(gameEngine);
  } catch (err) {
    console.warn('Multiplayer initialization deferred:', err);
  }

  // Setup Multiplayer Callbacks
  if (mpManager) {
    mpManager.onStatusChange = (status, code) => {
      if (status === 'waiting_for_player') {
        displayRoomCode.textContent = code;
        hostStatus.textContent = '🟢 Lobby aktywne! Czekam na przeciwnika...';
        btnStartDuel.disabled = true;
      } else if (status === 'connecting') {
        joinStatus.textContent = '🟡 Łączenie z lobby ' + code + '...';
      } else if (status === 'connected') {
        hostStatus.textContent = '🟢 Przeciwnik połączony! Możesz zacząć!';
        joinStatus.textContent = '🟢 Połączono z gospodarzem!';
        btnStartDuel.disabled = false;
        window.sounds.playPop(800);
      } else if (status === 'disconnected') {
        hostStatus.textContent = '🔴 Przeciwnik rozłączony';
        joinStatus.textContent = '🔴 Połączenie utracone';
        btnStartDuel.disabled = true;
        duelHudBar.style.display = 'none';
      } else if (status === 'error') {
        hostStatus.textContent = '⚠️ ' + code;
        joinStatus.textContent = '⚠️ ' + code;
      }
    };

    mpManager.onScoreUpdate = (stats) => {
      duelHudBar.style.display = 'flex';
      duelMyScore.textContent = stats.myScore;
      duelOppScore.textContent = stats.opponentScore;
      duelTimer.textContent = stats.timeLeft + 's';
    };

    mpManager.onOpponentHand = (handData) => {
      gameEngine.setOpponentHand(handData);
    };

    mpManager.onDuelEnd = (results) => {
      duelHudBar.style.display = 'none';
      gameEngine.setOpponentHand(null);

      duelFinalMy.textContent = results.myScore;
      duelFinalOpp.textContent = results.opponentScore;

      if (results.result === 'win') {
        duelResultTitle.textContent = '🏆 ZWYCIĘSTWO!';
        duelResultTitle.style.color = '#00f7ff';
        window.sounds.playStarChime(4);
      } else if (results.result === 'lose') {
        duelResultTitle.textContent = '💀 PRZEGRANA!';
        duelResultTitle.style.color = '#ff3366';
        window.sounds.playExplosion();
      } else {
        duelResultTitle.textContent = '🤝 REMIS!';
        duelResultTitle.style.color = '#ffd700';
      }

      duelEndModal.style.display = 'flex';
    };
  }

  // Results callback from Hand Tracker
  function onHandResults(activeHands) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tracker) {
      fpsBadge.textContent = `FPS: ${tracker.fps}`;
    }

    gameEngine.updateAndRender(activeHands);

    if (activeHands.length > 0 && mpManager && mpManager.isDuelActive) {
      mpManager.syncHand(activeHands[0]);
    }

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

  // Start Camera and Tracking (Bulletproof Click Handler)
  async function handleStartCamera() {
    btnStart.disabled = true;
    btnStart.textContent = 'ŁĄCZENIE Z KAMERĄ...';
    spinner.style.display = 'inline-block';
    cameraErrorMsg.style.display = 'none';

    try {
      window.sounds.init();
      window.sounds.playPop(750);
    } catch (e) {
      console.warn('Audio start note:', e);
    }

    try {
      tracker = new HandTracker(canvas, video, onHandResults);
      await tracker.init();

      modalOverlay.style.opacity = '0';
      setTimeout(() => {
        modalOverlay.style.display = 'none';
      }, 350);

      isRunning = true;
    } catch (err) {
      console.error('Błąd uruchomienia kamery:', err);
      const errorText = err.message || 'Nie udało się połączyć z kamerą.';
      cameraErrorMsg.textContent = '⚠️ ' + errorText;
      cameraErrorMsg.style.display = 'block';

      btnStart.disabled = false;
      btnStart.textContent = 'SPRÓBUJ PONOWNIE';
      spinner.style.display = 'none';
    }
  }

  btnStart.addEventListener('click', handleStartCamera);
  btnStart.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleStartCamera();
  });

  // Switch Camera (Front / Back)
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

  // Toggle Hand Inversion (Lewa/Prawa)
  btnSwapHands.addEventListener('click', () => {
    if (!tracker) return;
    window.sounds.playUiClick();
    const isInverted = tracker.toggleHandInversion();
    btnSwapHands.classList.toggle('active', isInverted);
  });

  // Toggle Point Density (21 Standard vs 56+ Biometric)
  btnDensity.addEventListener('click', () => {
    if (!tracker) return;
    window.sounds.playUiClick();
    const density = tracker.togglePointDensity();
    btnDensity.classList.toggle('active', density === 'dense');
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
      document.documentElement.requestFullscreen().catch(() => {});
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

  // Multiplayer Modal Controls
  btnMultiplayer.addEventListener('click', () => {
    window.sounds.playUiClick();
    mpModal.style.display = 'flex';
    if (mpManager && !mpManager.isHost && !mpManager.isConnected) {
      mpManager.createLobby();
    }
  });

  btnCloseMp.addEventListener('click', () => {
    window.sounds.playUiClick();
    mpModal.style.display = 'none';
  });

  tabHost.addEventListener('click', () => {
    tabHost.classList.add('active');
    tabJoin.classList.remove('active');
    viewHost.style.display = 'block';
    viewJoin.style.display = 'none';
    if (mpManager && !mpManager.isHost && !mpManager.isConnected) {
      mpManager.createLobby();
    }
  });

  tabJoin.addEventListener('click', () => {
    tabJoin.classList.add('active');
    tabHost.classList.remove('active');
    viewJoin.style.display = 'block';
    viewHost.style.display = 'none';
  });

  btnCopyCode.addEventListener('click', () => {
    if (mpManager && mpManager.roomCode) {
      navigator.clipboard.writeText(mpManager.roomCode).then(() => {
        btnCopyCode.textContent = 'SKOPIOWANO! ✓';
        setTimeout(() => { btnCopyCode.textContent = 'KOPIUJ KOD'; }, 2000);
      });
    }
  });

  btnStartDuel.addEventListener('click', () => {
    window.sounds.playPop(900);
    const selectedMode = mpSelectGame.value;
    if (mpManager) {
      mpManager.startDuel(selectedMode);
    }
    mpModal.style.display = 'none';
  });

  btnDoJoin.addEventListener('click', () => {
    const code = inputRoomCode.value.trim();
    if (code.length >= 4) {
      window.sounds.playUiClick();
      if (mpManager) {
        mpManager.joinLobby(code);
      }
      setTimeout(() => {
        if (mpManager && mpManager.isConnected) {
          mpModal.style.display = 'none';
        }
      }, 1500);
    } else {
      alert('Wpisz 4-cyfrowy kod pokoju!');
    }
  });

  btnCloseDuelEnd.addEventListener('click', () => {
    window.sounds.playUiClick();
    duelEndModal.style.display = 'none';
  });

  // Check URL parameters for direct room join
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    mpModal.style.display = 'flex';
    tabJoin.click();
    inputRoomCode.value = roomParam;
    if (mpManager) {
      mpManager.joinLobby(roomParam);
    }
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.log('SW registration skipped:', err);
      });
    });
  }
});
