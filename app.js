/**
 * Universal AR Hand Tracker Controller for Tablets, iPads & PC
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

  // Responsive Canvas Sizing
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
    console.warn('Multiplayer init notice:', err);
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

  // Guaranteed Camera Start
  async function launchCamera() {
    if (isRunning) return;

    // Immediately hide the modal so the screen is never blocked!
    if (modalOverlay) {
      modalOverlay.style.opacity = '0';
      modalOverlay.style.pointerEvents = 'none';
      setTimeout(() => {
        modalOverlay.style.display = 'none';
      }, 200);
    }

    try {
      window.sounds.init();
      window.sounds.playPop(750);
    } catch (e) {}

    try {
      if (!tracker) {
        tracker = new HandTracker(canvas, video, onHandResults);
      }
      await tracker.init();
      isRunning = true;
    } catch (err) {
      console.error('Camera launch error:', err);
      alert('Nie udało się uzyskać dostępu do kamery:\n' + (err.message || err) + '\n\nUpewnij się, że zezwoliłeś na dostęp do kamery i otwórz stronę przez HTTPS!');
      if (modalOverlay) {
        modalOverlay.style.opacity = '1';
        modalOverlay.style.pointerEvents = 'auto';
        modalOverlay.style.display = 'flex';
      }
    }
  }

  // Attach launchCamera to Start button
  if (btnStart) {
    btnStart.onclick = launchCamera;
    btnStart.addEventListener('click', launchCamera);
  }

  // Switch Camera (Also launches camera if not started!)
  btnCamera.addEventListener('click', async () => {
    if (!isRunning) {
      await launchCamera();
      return;
    }
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

  // Toggle Fullscreen (iPad & Android compatible)
  btnFullscreen.addEventListener('click', () => {
    window.sounds.playUiClick();
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen unavailable:', e);
    }
  });

  // Game Mode Selection (Also launches camera if not started!)
  gameTabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      window.sounds.playUiClick();
      gameTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.mode;
      gameEngine.setMode(mode);

      if (!isRunning) {
        await launchCamera();
      }
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

  // Register PWA Service Worker (Network-First update)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      // Unregister old service workers to prevent cache locks
      for (let reg of regs) {
        reg.update();
      }
    });
  }
});
