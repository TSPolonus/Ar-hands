/**
 * WebRTC P2P Multiplayer Engine for AR Hand Tracking Duel
 * Connects players across DIFFERENT Wi-Fi networks / LTE / Internet via WebRTC (PeerJS).
 */

class MultiplayerManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = null;
    this.isConnected = false;

    // Duel State
    this.isDuelActive = false;
    this.duelTimeLeft = 60;
    this.duelTimer = null;
    this.myScore = 0;
    this.opponentScore = 0;
    this.opponentHand = null;
    this.selectedGameMode = 'slicer';

    // Callbacks for UI
    this.onStatusChange = null;
    this.onScoreUpdate = null;
    this.onDuelEnd = null;
    this.onOpponentHand = null;
  }

  generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Create Lobby (Host)
  createLobby(customCode = null) {
    if (typeof Peer === 'undefined') {
      if (this.onStatusChange) {
        this.onStatusChange('error', 'Biblioteka PeerJS nie załadowała się. Sprawdź połączenie z internetem.');
      }
      return;
    }

    this.roomCode = customCode || this.generateCode();
    this.isHost = true;
    const peerId = `ar-hand-duel-${this.roomCode}`;

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    try {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        if (this.onStatusChange) {
          this.onStatusChange('waiting_for_player', this.roomCode);
        }
      });

      this.peer.on('connection', (connection) => {
        this.conn = connection;
        this.setupConnection();
      });

      this.peer.on('error', (err) => {
        console.warn('Peer error:', err);
        if (err.type === 'unavailable-id') {
          this.createLobby();
        } else {
          if (this.onStatusChange) this.onStatusChange('error', 'Błąd: ' + (err.message || err.type));
        }
      });
    } catch (err) {
      if (this.onStatusChange) this.onStatusChange('error', 'Nie udało się utworzyć lobby: ' + err.message);
    }
  }

  // Join Lobby (Guest)
  joinLobby(roomCode) {
    if (typeof Peer === 'undefined') {
      if (this.onStatusChange) {
        this.onStatusChange('error', 'Biblioteka PeerJS nie załadowała się. Sprawdź połączenie z internetem.');
      }
      return;
    }

    this.roomCode = roomCode.trim().toUpperCase();
    this.isHost = false;
    const targetPeerId = `ar-hand-duel-${this.roomCode}`;

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    try {
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', () => {
        if (this.onStatusChange) this.onStatusChange('connecting', this.roomCode);
        this.conn = this.peer.connect(targetPeerId, { reliable: true });
        this.setupConnection();
      });

      this.peer.on('error', (err) => {
        console.warn('Guest peer error:', err);
        if (this.onStatusChange) this.onStatusChange('error', 'Nie udało się połączyć z kodem ' + this.roomCode);
      });
    } catch (err) {
      if (this.onStatusChange) this.onStatusChange('error', 'Błąd połączenia: ' + err.message);
    }
  }

  setupConnection() {
    this.conn.on('open', () => {
      this.isConnected = true;
      if (this.onStatusChange) {
        this.onStatusChange('connected', this.roomCode);
      }
      this.sendData({ type: 'handshake', isHost: this.isHost });
    });

    this.conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    this.conn.on('close', () => {
      this.isConnected = false;
      this.isDuelActive = false;
      if (this.onStatusChange) {
        this.onStatusChange('disconnected', null);
      }
    });

    this.conn.on('error', (err) => {
      console.warn('Connection data channel error:', err);
    });
  }

  sendData(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  startDuel(gameMode = 'slicer') {
    if (!this.isConnected) return;
    this.selectedGameMode = gameMode;
    this.isDuelActive = true;
    this.duelTimeLeft = 60;
    this.myScore = 0;
    this.opponentScore = 0;

    this.sendData({
      type: 'start_duel',
      gameMode: this.selectedGameMode,
      duration: 60
    });

    this.beginDuelCountdown();
  }

  beginDuelCountdown() {
    this.gameEngine.setMode(this.selectedGameMode);
    this.gameEngine.score = 0;
    this.isDuelActive = true;
    this.duelTimeLeft = 60;
    this.myScore = 0;
    this.opponentScore = 0;

    if (this.duelTimer) clearInterval(this.duelTimer);

    this.duelTimer = setInterval(() => {
      this.duelTimeLeft--;
      if (this.onScoreUpdate) {
        this.onScoreUpdate({
          myScore: this.myScore,
          opponentScore: this.opponentScore,
          timeLeft: this.duelTimeLeft
        });
      }

      if (this.duelTimeLeft <= 0) {
        this.finishDuel();
      }
    }, 1000);
  }

  finishDuel() {
    clearInterval(this.duelTimer);
    this.isDuelActive = false;

    this.sendData({
      type: 'duel_finish',
      finalScore: this.myScore
    });

    if (this.onDuelEnd) {
      this.onDuelEnd({
        myScore: this.myScore,
        opponentScore: this.opponentScore,
        result: this.myScore > this.opponentScore ? 'win' : (this.myScore < this.opponentScore ? 'lose' : 'draw')
      });
    }
  }

  handleIncomingData(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'handshake':
        if (this.onStatusChange) this.onStatusChange('connected', this.roomCode);
        break;

      case 'start_duel':
        this.selectedGameMode = data.gameMode || 'slicer';
        this.beginDuelCountdown();
        break;

      case 'score_sync':
        this.opponentScore = data.score;
        if (this.onScoreUpdate) {
          this.onScoreUpdate({
            myScore: this.myScore,
            opponentScore: this.opponentScore,
            timeLeft: this.duelTimeLeft
          });
        }
        break;

      case 'hand_sync':
        this.opponentHand = data.hand;
        if (this.onOpponentHand) {
          this.onOpponentHand(this.opponentHand);
        }
        break;

      case 'duel_finish':
        this.opponentScore = data.finalScore;
        if (this.isDuelActive) {
          this.finishDuel();
        }
        break;
    }
  }

  syncHand(activeHand) {
    if (!this.isConnected || !this.isDuelActive || !activeHand) return;

    const canvas = this.gameEngine.canvas;
    const handData = {
      x: activeHand.indexTip.x / canvas.width,
      y: activeHand.indexTip.y / canvas.height,
      palmX: activeHand.palmCenter.x / canvas.width,
      palmY: activeHand.palmCenter.y / canvas.height,
      gesture: activeHand.gesture,
      isFist: activeHand.gesture.includes('PIĘŚĆ') || activeHand.isClosed,
      isPinching: activeHand.isPinching
    };

    this.sendData({
      type: 'hand_sync',
      hand: handData
    });

    if (this.myScore !== this.gameEngine.score) {
      this.myScore = this.gameEngine.score;
      this.sendData({
        type: 'score_sync',
        score: this.myScore
      });
    }
  }

  disconnect() {
    if (this.duelTimer) clearInterval(this.duelTimer);
    if (this.conn) {
      try { this.conn.close(); } catch (e) {}
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }
    this.isConnected = false;
    this.isDuelActive = false;
  }
}

window.MultiplayerManager = MultiplayerManager;
