/* ========================================================= */
/* VENOM MASTER ARCADE HUB CONTROLLER                        */
/* Handles Game Selection, Setup Modals, XP/Stats & Launcher */
/* ========================================================= */

class ArcadeHubManager {
    constructor() {
        // Player Profile State
        this.player = {
            name: "Cyber Champion",
            level: 1,
            xp: 0,
            xpNeeded: 500,
            coins: 1500,
            avatar: "🏎️"
        };

        // Active Setup Selection State
        this.selectedGame = null;
        this.selectedMode = 'ai'; // 'ai', 'local', 'online'
        this.selectedDiff = 'normal'; // 'easy', 'normal', 'hard'
        this.extraConfig = {};

        // Active Running Game Reference
        this.activeGameInstance = null;
        this.deferredPrompt = null;

        this.initDOMReferences();
        this.setupEventListeners();
        this.setupPWAInstall();
        this.updateProfileHUD();
    }

    initDOMReferences() {
        this.viewHub = document.getElementById('view-hub');
        this.viewArena = document.getElementById('view-game-arena');

        // Modals
        this.setupModal = document.getElementById('game-setup-modal');
        this.settingsModal = document.getElementById('arcade-settings-modal');
        this.gameoverModal = document.getElementById('gameover-modal');

        // Subviews for all 8 games
        this.gameContainers = {
            subway: document.getElementById('game-subway-container'),
            car: document.getElementById('game-car-container'),
            tictactoe: document.getElementById('game-tictactoe-container'),
            carrom: document.getElementById('game-carrom-container'),
            pool: document.getElementById('game-pool-container'),
            ludo: document.getElementById('game-ludo-container'),
            chess: document.getElementById('game-chess-container'),
            fruitninja: document.getElementById('game-fruitninja-container')
        };
    }

    setupPWAInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            const btn = document.getElementById('btn-pwa-install');
            if (btn) btn.style.display = 'flex';
        });

        const btn = document.getElementById('btn-pwa-install');
        if (btn) {
            btn.addEventListener('click', () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    this.deferredPrompt.userChoice.then(() => {
                        this.deferredPrompt = null;
                    });
                } else {
                    alert("📲 Mobile & Play Store App Installation:\n\n1. Chrome Menu (3 dots) par click karein.\n2. 'Add to Home Screen' ya 'Install App' par tap karein.\n\nPlay Store APK banane ke liye Capacitor ya Bubblewrap se build karein!");
                }
            });
        }
    }

    setupEventListeners() {
        // 1. Game Cards Launch Click
        const gameCards = document.querySelectorAll('.game-card, .btn-play-action');
        gameCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                window.audioEngine.playClick();
                const gameId = card.dataset.game || card.dataset.gameLaunch;
                if (gameId) {
                    this.openGameSetupModal(gameId);
                }
            });
        });

        // 2. Setup Modal: Mode Selection
        const modeCards = document.querySelectorAll('.mode-card');
        modeCards.forEach(mc => {
            mc.addEventListener('click', () => {
                window.audioEngine.playClick();
                modeCards.forEach(c => c.classList.remove('active'));
                mc.classList.add('active');
                this.selectedMode = mc.dataset.mode;

                const diffGroup = document.getElementById('difficulty-group');
                const onlineGroup = document.getElementById('online-setup-group');

                if (this.selectedMode === 'ai') {
                    if (diffGroup) diffGroup.classList.remove('hidden');
                    if (onlineGroup) onlineGroup.classList.add('hidden');
                } else if (this.selectedMode === 'online') {
                    if (diffGroup) diffGroup.classList.add('hidden');
                    if (onlineGroup) onlineGroup.classList.remove('hidden');
                    this.startOnlineSearch();
                } else {
                    if (diffGroup) diffGroup.classList.add('hidden');
                    if (onlineGroup) onlineGroup.classList.add('hidden');
                }
            });
        });

        // 3. Setup Modal: Difficulty Selection
        const diffBtns = document.querySelectorAll('.diff-btn');
        diffBtns.forEach(db => {
            db.addEventListener('click', () => {
                window.audioEngine.playClick();
                diffBtns.forEach(b => b.classList.remove('active'));
                db.classList.add('active');
                this.selectedDiff = db.dataset.diff;
            });
        });

        // 4. Modal Close / Cancel Buttons
        const closeSetupBtn = document.getElementById('btn-close-setup-modal');
        const cancelSetupBtn = document.getElementById('btn-cancel-setup');
        if (closeSetupBtn) closeSetupBtn.onclick = () => this.closeModal(this.setupModal);
        if (cancelSetupBtn) cancelSetupBtn.onclick = () => this.closeModal(this.setupModal);

        // 5. Confirm Game Launch Button
        const confirmStartBtn = document.getElementById('btn-confirm-start');
        if (confirmStartBtn) {
            confirmStartBtn.addEventListener('click', () => {
                window.audioEngine.playClick();
                this.closeModal(this.setupModal);
                this.launchGame(this.selectedGame, this.selectedMode, this.selectedDiff);
            });
        }

        // 6. Header Action Buttons
        const homeLogo = document.getElementById('btn-home-logo');
        const exitGameBtn = document.getElementById('btn-exit-game');
        if (homeLogo) homeLogo.onclick = () => this.returnToHub();
        if (exitGameBtn) exitGameBtn.onclick = () => this.returnToHub();

        // Audio & Fullscreen
        const bgmToggle = document.getElementById('btn-bgm-toggle');
        const sfxToggle = document.getElementById('btn-sfx-toggle');
        const fsToggle = document.getElementById('btn-fullscreen-toggle');
        const settingsOpen = document.getElementById('btn-settings-open');

        if (bgmToggle) {
            bgmToggle.onclick = () => {
                const on = window.audioEngine.toggleBGM();
                bgmToggle.style.color = on ? 'var(--neon-cyan)' : 'var(--text-muted)';
            };
        }
        if (sfxToggle) {
            sfxToggle.onclick = () => {
                window.audioEngine.sfxEnabled = !window.audioEngine.sfxEnabled;
                sfxToggle.style.color = window.audioEngine.sfxEnabled ? 'var(--neon-cyan)' : 'var(--text-muted)';
            };
        }
        if (fsToggle) {
            fsToggle.onclick = () => this.toggleFullscreen();
        }
        if (settingsOpen) {
            settingsOpen.onclick = () => {
                window.audioEngine.playClick();
                this.openModal(this.settingsModal);
            };
        }

        const closeSettings = document.getElementById('btn-close-settings-modal');
        const saveSettings = document.getElementById('btn-save-settings');
        if (closeSettings) closeSettings.onclick = () => this.closeModal(this.settingsModal);
        if (saveSettings) saveSettings.onclick = () => this.closeModal(this.settingsModal);

        // Reset & Pause inside game arena
        const restartBtn = document.getElementById('btn-restart-game');
        const pauseBtn = document.getElementById('btn-pause-game');
        if (restartBtn) {
            restartBtn.onclick = () => {
                window.audioEngine.playClick();
                this.launchGame(this.selectedGame, this.selectedMode, this.selectedDiff);
            };
        }
        if (pauseBtn) {
            pauseBtn.onclick = () => {
                window.audioEngine.playClick();
                if (this.activeGameInstance && this.activeGameInstance.pause) {
                    this.activeGameInstance.pause();
                }
            };
        }

        // Victory / Gameover Modal Action buttons
        const replayBtn = document.getElementById('btn-gameover-replay');
        const hubBtn = document.getElementById('btn-gameover-hub');
        if (replayBtn) {
            replayBtn.onclick = () => {
                window.audioEngine.playClick();
                this.closeModal(this.gameoverModal);
                this.launchGame(this.selectedGame, this.selectedMode, this.selectedDiff);
            };
        }
        if (hubBtn) {
            hubBtn.onclick = () => {
                window.audioEngine.playClick();
                this.closeModal(this.gameoverModal);
                this.returnToHub();
            };
        }
    }

    openGameSetupModal(gameId) {
        this.selectedGame = gameId;

        const titles = {
            subway: "🛹 Cyber Subway Surfers",
            car: "🏎️ Cyber Nitro Racing",
            tictactoe: "⚡ Neon Tic Tac Toe",
            carrom: "🎯 Carrom Board Master",
            pool: "🎱 8-Ball Luxury Pool",
            ludo: "🎲 Royal 3D Ludo",
            chess: "♟️ Grandmaster Chess",
            fruitninja: "🍉 Cyber Fruit Ninja"
        };

        const modalTitle = document.getElementById('setup-modal-title');
        const modalIcon = document.getElementById('setup-modal-icon');
        if (modalTitle) modalTitle.innerText = titles[gameId] || "Launch Game";
        if (modalIcon) modalIcon.innerText = titles[gameId] ? titles[gameId].slice(0, 2) : "🎮";

        // Dynamic extra options per game
        const extraGroup = document.getElementById('extra-options-group');
        if (extraGroup) {
            if (gameId === 'ludo') {
                extraGroup.innerHTML = `
                    <label class="group-label">3. TOTAL PLAYERS</label>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-secondary active" id="btn-ludo-2p" style="flex:1;">2 Players</button>
                        <button class="btn-secondary" id="btn-ludo-3p" style="flex:1;">3 Players</button>
                        <button class="btn-secondary" id="btn-ludo-4p" style="flex:1;">4 Players</button>
                    </div>
                `;
                this.extraConfig.ludoPlayers = 2;
                [2, 3, 4].forEach(count => {
                    const btn = document.getElementById(`btn-ludo-${count}p`);
                    if (btn) {
                        btn.onclick = () => {
                            [2, 3, 4].forEach(c => document.getElementById(`btn-ludo-${c}p`).classList.remove('active'));
                            btn.classList.add('active');
                            this.extraConfig.ludoPlayers = count;
                        };
                    }
                });
            } else {
                extraGroup.innerHTML = '';
            }
        }

        this.openModal(this.setupModal);
    }

    startOnlineSearch() {
        window.onlineEngine.findQuickMatch((opp) => {
            const statusTxt = document.getElementById('matchmaking-status-txt');
            if (statusTxt) statusTxt.innerText = `Matched with: ${opp.name} (${opp.country}) | Ping: ${opp.ping}`;
        });
    }

    launchGame(gameId, mode, difficulty) {
        // Hide Hub, show Arena
        this.viewHub.classList.remove('active-view');
        this.viewArena.classList.add('active-view');

        // Hide all game subviews
        Object.values(this.gameContainers).forEach(c => {
            if (c) c.classList.remove('active-game');
        });

        // Update Arena Header
        const titles = {
            subway: "CYBER SUBWAY SURFERS",
            car: "CYBER NITRO RACING",
            tictactoe: "NEON TIC TAC TOE",
            carrom: "CARROM BOARD MASTER",
            pool: "8-BALL LUXURY POOL",
            ludo: "ROYAL 3D LUDO",
            chess: "GRANDMASTER CHESS",
            fruitninja: "CYBER FRUIT NINJA"
        };

        const arenaTitle = document.getElementById('arena-title');
        const arenaBadge = document.getElementById('arena-badge');
        const arenaModePill = document.getElementById('arena-mode-pill');

        if (arenaTitle) arenaTitle.innerText = titles[gameId] || "Game Arena";
        if (arenaBadge) arenaBadge.innerText = gameId.toUpperCase();
        if (arenaModePill) {
            if (mode === 'ai') arenaModePill.innerText = `🤖 VS COMPUTER (${difficulty.toUpperCase()})`;
            else if (mode === 'online') arenaModePill.innerText = `🌐 ONLINE MATCH`;
            else arenaModePill.innerText = `👥 PASS & PLAY`;
        }

        // Show specific container & launch engine
        const container = this.gameContainers[gameId];
        if (container) container.classList.add('active-game');

        if (gameId === 'subway') {
            this.activeGameInstance = window.subwayGame;
            window.subwayGame.init(mode, difficulty);
        } else if (gameId === 'car') {
            this.activeGameInstance = window.carGame;
            window.carGame.init(mode, difficulty);
        } else if (gameId === 'tictactoe') {
            this.activeGameInstance = window.tttGame;
            window.tttGame.init(mode, difficulty);
        } else if (gameId === 'carrom') {
            this.activeGameInstance = window.carromGame;
            window.carromGame.init(mode, difficulty);
        } else if (gameId === 'pool') {
            this.activeGameInstance = window.poolGame;
            window.poolGame.init(mode, difficulty);
        } else if (gameId === 'ludo') {
            this.activeGameInstance = window.ludoGame;
            window.ludoGame.init(mode, difficulty, this.extraConfig.ludoPlayers || 4);
        } else if (gameId === 'chess') {
            this.activeGameInstance = window.chessGame;
            window.chessGame.init(mode, difficulty);
        } else if (gameId === 'fruitninja') {
            this.activeGameInstance = window.fruitNinjaGame;
            window.fruitNinjaGame.init(mode, difficulty);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    returnToHub() {
        window.audioEngine.playClick();
        if (this.activeGameInstance && this.activeGameInstance.destroy) {
            this.activeGameInstance.destroy();
        }
        this.activeGameInstance = null;

        this.viewArena.classList.remove('active-view');
        this.viewHub.classList.add('active-view');
    }

    showGameOver(data = {}) {
        const titleEl = document.getElementById('gameover-title');
        const descEl = document.getElementById('gameover-msg');
        const xpEl = document.getElementById('gameover-xp');
        const coinsEl = document.getElementById('gameover-coins');

        if (titleEl) titleEl.innerText = data.title || "GAME OVER";
        if (descEl) descEl.innerText = data.msg || "Great effort in the Venom arena!";
        if (xpEl) xpEl.innerText = data.xp || 100;
        if (coinsEl) coinsEl.innerText = data.coins || 50;

        // Grant XP and Coins
        this.addRewards(data.xp || 100, data.coins || 50);

        this.openModal(this.gameoverModal);
    }

    addRewards(xp, coins) {
        this.player.xp += xp;
        this.player.coins += coins;

        if (this.player.xp >= this.player.xpNeeded) {
            this.player.level++;
            this.player.xp -= this.player.xpNeeded;
            this.player.xpNeeded = Math.floor(this.player.xpNeeded * 1.5);
            window.particleEngine.triggerConfetti();
        }
        this.updateProfileHUD();
    }

    updateProfileHUD() {
        const nameEl = document.getElementById('hud-player-name');
        const lvlEl = document.getElementById('hud-player-lvl');
        const coinsEl = document.getElementById('hud-player-coins');

        if (nameEl) nameEl.innerText = this.player.name;
        if (lvlEl) lvlEl.innerText = `LVL ${this.player.level}`;
        if (coinsEl) coinsEl.innerText = this.player.coins.toLocaleString();
    }

    openModal(modal) {
        if (modal) modal.classList.add('active-modal');
    }

    closeModal(modal) {
        if (modal) modal.classList.remove('active-modal');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
        }
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.hubManager = new ArcadeHubManager();
});
