/* ========================================================= */
/* GAME 1: CYBER SUBWAY SURFERS 3D ENDLESS RUNNER ENGINE     */
/* 3-Lane 3D Physics, Trains, Hoverboards & Powerups        */
/* ========================================================= */

class SubwayRunnerGame {
    constructor() {
        this.canvas = document.getElementById('subway-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 500;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.isRunning = false;
        this.isPaused = false;
        this.mode = 'ai';
        this.difficulty = 'normal';

        // Player 3D State
        this.player = {
            lane: 0, // -1: Left, 0: Center, 1: Right
            targetLane: 0,
            x: 0, // interpolated screen X
            y: 0, // jump height (0 = ground)
            vy: 0,
            isJumping: false,
            isSliding: false,
            slideTimer: 0,
            hasHoverboard: false,
            magnetTimer: 0,
            jetpackTimer: 0,
            multiplierTimer: 0,
            multiplier: 1
        };

        // Game World & Track
        this.speed = 12;
        this.distance = 0;
        this.score = 0;
        this.coins = 0;
        this.obstacles = [];
        this.collectibles = [];
        this.trackOffset = 0;

        // Touch Swipe Variables
        this.touchStartX = 0;
        this.touchStartY = 0;

        this.setupControls();
    }

    setupControls() {
        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isPaused) return;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.moveLeft();
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.moveRight();
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.jump();
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.slide();
            if (e.key === ' ' || e.key === 'Shift') this.activateHoverboard();
        });

        // Touch Swipe Gestures on Canvas
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.isRunning || !e.touches[0]) return;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isRunning || !e.changedTouches[0]) return;
            const dx = e.changedTouches[0].clientX - this.touchStartX;
            const dy = e.changedTouches[0].clientY - this.touchStartY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (Math.max(absX, absY) > 20) {
                if (absX > absY) {
                    if (dx > 0) this.moveRight();
                    else this.moveLeft();
                } else {
                    if (dy < 0) this.jump();
                    else this.slide();
                }
            }
        }, { passive: true });

        // Touch On-Screen Buttons
        const leftBtn = document.getElementById('touch-subway-left');
        const rightBtn = document.getElementById('touch-subway-right');
        const jumpBtn = document.getElementById('touch-subway-jump');
        const slideBtn = document.getElementById('touch-subway-slide');
        const boardBtn = document.getElementById('touch-subway-board');

        if (leftBtn) leftBtn.onclick = () => this.moveLeft();
        if (rightBtn) rightBtn.onclick = () => this.moveRight();
        if (jumpBtn) jumpBtn.onclick = () => this.jump();
        if (slideBtn) slideBtn.onclick = () => this.slide();
        if (boardBtn) boardBtn.onclick = () => this.activateHoverboard();
    }

    moveLeft() {
        if (this.player.targetLane > -1) {
            this.player.targetLane--;
            window.audioEngine.playHover();
        }
    }

    moveRight() {
        if (this.player.targetLane < 1) {
            this.player.targetLane++;
            window.audioEngine.playHover();
        }
    }

    jump() {
        if (!this.player.isJumping && this.player.jetpackTimer <= 0) {
            this.player.isJumping = true;
            this.player.vy = 14;
            this.player.isSliding = false;
            window.audioEngine.playJump();
        }
    }

    slide() {
        this.player.isSliding = true;
        this.player.slideTimer = 32;
        if (this.player.isJumping) {
            this.player.vy = -14; // Fast dive
        }
        window.audioEngine.playSlide();
    }

    activateHoverboard() {
        if (!this.player.hasHoverboard) {
            this.player.hasHoverboard = true;
            window.audioEngine.playHoverboard();
            this.updatePowerupHUD();
        }
    }

    init(mode = 'ai', difficulty = 'normal') {
        this.mode = mode;
        this.difficulty = difficulty;
        this.speed = difficulty === 'hard' ? 15 : (difficulty === 'normal' ? 12 : 9);
        this.distance = 0;
        this.score = 0;
        this.coins = 0;
        this.obstacles = [];
        this.collectibles = [];
        this.trackOffset = 0;

        this.player = {
            lane: 0,
            targetLane: 0,
            x: 0,
            y: 0,
            vy: 0,
            isJumping: false,
            isSliding: false,
            slideTimer: 0,
            hasHoverboard: false,
            magnetTimer: 0,
            jetpackTimer: 0,
            multiplierTimer: 0,
            multiplier: 1
        };

        this.isRunning = true;
        this.isPaused = false;
        this.updateHUD();
        this.loop();
    }

    spawnTrackSegment() {
        const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        const r = Math.random();

        if (r < 0.35) {
            // Low Road Hurdle (Jump over)
            this.obstacles.push({
                lane: lane,
                z: 1000,
                type: 'hurdle',
                height: 40,
                width: 70
            });
        } else if (r < 0.62) {
            // High Barrier Arch (Slide under)
            this.obstacles.push({
                lane: lane,
                z: 1000,
                type: 'barrier',
                height: 90,
                width: 80
            });
        } else {
            // Cyber Train (Blocks entire lane)
            this.obstacles.push({
                lane: lane,
                z: 1000,
                type: 'train',
                height: 120,
                width: 85,
                depth: 250
            });
        }

        // Spawn Coins or Powerups in another lane
        const coinLane = (lane + 1 > 1 ? -1 : lane + 1);
        if (Math.random() > 0.3) {
            for (let k = 0; k < 4; k++) {
                this.collectibles.push({
                    lane: coinLane,
                    z: 1000 + k * 60,
                    type: 'coin',
                    y: 20
                });
            }
        } else {
            const powerups = ['magnet', 'jetpack', 'multiplier', 'hoverboard'];
            const pType = powerups[Math.floor(Math.random() * powerups.length)];
            this.collectibles.push({
                lane: coinLane,
                z: 1000,
                type: pType,
                y: 30
            });
        }
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        // Speed progression
        this.speed += 0.0008;
        this.distance += this.speed * 0.005;
        this.score += Math.floor(this.speed * 0.1 * this.player.multiplier);
        this.trackOffset += this.speed;

        // Smooth Lane Transition
        this.player.x += (this.player.targetLane - this.player.x) * 0.2;

        // Jump & Gravity Physics
        if (this.player.jetpackTimer > 0) {
            this.player.y = 160;
            this.player.jetpackTimer--;
        } else if (this.player.isJumping || this.player.y > 0) {
            this.player.y += this.player.vy;
            this.player.vy -= 0.85; // Gravity
            if (this.player.y <= 0) {
                this.player.y = 0;
                this.player.vy = 0;
                this.player.isJumping = false;
            }
        }

        // Slide Timer
        if (this.player.isSliding) {
            this.player.slideTimer--;
            if (this.player.slideTimer <= 0) {
                this.player.isSliding = false;
            }
        }

        // Powerup Timers
        if (this.player.magnetTimer > 0) this.player.magnetTimer--;
        if (this.player.multiplierTimer > 0) {
            this.player.multiplierTimer--;
            this.player.multiplier = 2;
        } else {
            this.player.multiplier = 1;
        }

        // Spawn track segments
        if (Math.floor(this.trackOffset) % 115 === 0) {
            this.spawnTrackSegment();
        }

        // Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.z -= this.speed;

            // Player collision check at z ~ 50
            if (obs.z < 80 && obs.z > 20) {
                const laneMatch = Math.abs(this.player.x - obs.lane) < 0.6;
                if (laneMatch && this.player.jetpackTimer <= 0) {
                    let hit = false;
                    if (obs.type === 'hurdle' && this.player.y < 35) hit = true;
                    if (obs.type === 'barrier' && !this.player.isSliding) hit = true;
                    if (obs.type === 'train' && this.player.y < 100) hit = true;

                    if (hit) {
                        if (this.player.hasHoverboard) {
                            // Hoverboard shield protects against 1 crash!
                            this.player.hasHoverboard = false;
                            window.audioEngine.playCrash();
                            this.obstacles.splice(i, 1);
                            continue;
                        } else {
                            window.audioEngine.playCrash();
                            this.gameOver();
                            return;
                        }
                    }
                }
            }

            if (obs.z < -100) {
                this.obstacles.splice(i, 1);
            }
        }

        // Update Collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const col = this.collectibles[i];
            col.z -= this.speed;

            // Coin Magnet Attraction
            if (this.player.magnetTimer > 0 && col.type === 'coin' && col.z < 600) {
                col.lane += (this.player.x - col.lane) * 0.16;
            }

            // Pickup check
            if (col.z < 90 && col.z > 10) {
                const laneMatch = Math.abs(this.player.x - col.lane) < 0.7;
                if (laneMatch) {
                    if (col.type === 'coin') {
                        this.coins++;
                        this.score += 50 * this.player.multiplier;
                        window.audioEngine.playCoin();
                    } else if (col.type === 'magnet') {
                        this.player.magnetTimer = 350;
                        window.audioEngine.playPowerup();
                    } else if (col.type === 'jetpack') {
                        this.player.jetpackTimer = 300;
                        window.audioEngine.playPowerup();
                    } else if (col.type === 'multiplier') {
                        this.player.multiplierTimer = 400;
                        window.audioEngine.playPowerup();
                    } else if (col.type === 'hoverboard') {
                        this.player.hasHoverboard = true;
                        window.audioEngine.playHoverboard();
                    }
                    this.collectibles.splice(i, 1);
                    continue;
                }
            }

            if (col.z < -100) {
                this.collectibles.splice(i, 1);
            }
        }

        this.updateHUD();
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Cyber Skyline & Neon Tunnel Horizon
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#060814');
        sky.addColorStop(0.5, '#121832');
        sky.addColorStop(1, '#05070d');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        const vanishY = 160;
        const vanishX = w / 2;

        // 3D 3-Lane Track Perspective Projection
        const trackBaseW = 420;
        const trackTopW = 60;

        ctx.fillStyle = '#0f1426';
        ctx.beginPath();
        ctx.moveTo(vanishX - trackTopW / 2, vanishY);
        ctx.lineTo(vanishX + trackTopW / 2, vanishY);
        ctx.lineTo(vanishX + trackBaseW / 2, h);
        ctx.lineTo(vanishX - trackBaseW / 2, h);
        ctx.fill();

        // Neon Lane Divider Rails
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f2fe';

        [-1, -0.33, 0.33, 1].forEach(pos => {
            ctx.beginPath();
            ctx.moveTo(vanishX + pos * (trackTopW / 2), vanishY);
            ctx.lineTo(vanishX + pos * (trackBaseW / 2), h);
            ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // Moving Track Ties
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let z = 1000; z > 0; z -= 80) {
            const currentZ = (z - (this.trackOffset % 80));
            const scale = 300 / (currentZ + 300);
            const y = vanishY + (h - vanishY) * scale;
            const tieW = trackTopW + (trackBaseW - trackTopW) * scale;
            ctx.fillRect(vanishX - tieW / 2, y, tieW, 4 * scale);
        }

        // 2. Draw 3D Obstacles (Sorted back to front)
        const renderList = [
            ...this.obstacles.map(o => ({ type: 'obstacle', data: o, z: o.z })),
            ...this.collectibles.map(c => ({ type: 'collectible', data: c, z: c.z })),
            { type: 'player', data: this.player, z: 50 }
        ];
        renderList.sort((a, b) => b.z - a.z);

        renderList.forEach(item => {
            if (item.type === 'obstacle') this.drawObstacle(ctx, item.data, vanishX, vanishY, trackBaseW, trackTopW);
            if (item.type === 'collectible') this.drawCollectible(ctx, item.data, vanishX, vanishY, trackBaseW, trackTopW);
            if (item.type === 'player') this.drawPlayer(ctx, vanishX, vanishY, trackBaseW, trackTopW);
        });
    }

    drawObstacle(ctx, obs, vanishX, vanishY, trackBaseW, trackTopW) {
        const scale = 300 / (obs.z + 300);
        const laneW = (trackTopW + (trackBaseW - trackTopW) * scale) / 3;
        const x = vanishX + obs.lane * laneW;
        const groundY = vanishY + (this.height - vanishY) * scale;

        const w = obs.width * scale;
        const h = obs.height * scale;

        ctx.save();
        if (obs.type === 'hurdle') {
            ctx.fillStyle = '#ff3366';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3366';
            ctx.fillRect(x - w / 2, groundY - h, w, h);
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - w / 2, groundY - h, w, 6 * scale);
        } else if (obs.type === 'barrier') {
            ctx.fillStyle = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ffd700';
            ctx.fillRect(x - w / 2, groundY - h, 8 * scale, h);
            ctx.fillRect(x + w / 2 - 8 * scale, groundY - h, 8 * scale, h);
            ctx.fillRect(x - w / 2, groundY - h, w, 24 * scale);
        } else if (obs.type === 'train') {
            ctx.fillStyle = '#4facfe';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2fe';
            ctx.fillRect(x - w / 2, groundY - h, w, h);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x - w / 2 + 6 * scale, groundY - 20 * scale, 12 * scale, 8 * scale);
            ctx.fillRect(x + w / 2 - 18 * scale, groundY - 20 * scale, 12 * scale, 8 * scale);
            ctx.fillStyle = '#0a1020';
            ctx.fillRect(x - w / 2 + 8 * scale, groundY - h + 10 * scale, w - 16 * scale, 25 * scale);
        }
        ctx.restore();
    }

    drawCollectible(ctx, col, vanishX, vanishY, trackBaseW, trackTopW) {
        const scale = 300 / (col.z + 300);
        const laneW = (trackTopW + (trackBaseW - trackTopW) * scale) / 3;
        const x = vanishX + col.lane * laneW;
        const groundY = vanishY + (this.height - vanishY) * scale;
        const y = groundY - col.y * scale;

        ctx.save();
        if (col.type === 'coin') {
            ctx.fillStyle = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ffd700';
            ctx.beginPath();
            ctx.arc(x, y, 12 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${10 * scale}px Orbitron`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🪙', x, y);
        } else {
            const icons = { magnet: '🧲', jetpack: '🚀', multiplier: '⭐', hoverboard: '🛹' };
            ctx.font = `${22 * scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icons[col.type] || '⚡', x, y);
        }
        ctx.restore();
    }

    drawPlayer(ctx, vanishX, vanishY, trackBaseW, trackTopW) {
        const scale = 300 / (50 + 300);
        const laneW = (trackTopW + (trackBaseW - trackTopW) * scale) / 3;
        const x = vanishX + this.player.x * laneW;
        const groundY = vanishY + (this.height - vanishY) * scale;
        const y = groundY - this.player.y;

        ctx.save();

        // Shadow under player
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x, groundY - 4, 24 * (1 - this.player.y / 200), 8 * (1 - this.player.y / 200), 0, 0, Math.PI * 2);
        ctx.fill();

        // Hoverboard
        if (this.player.hasHoverboard) {
            ctx.fillStyle = '#f857a6';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f857a6';
            ctx.beginPath();
            ctx.roundRect(x - 26, y - 6, 52, 12, 6);
            ctx.fill();
        }

        // Player Body
        const pH = this.player.isSliding ? 35 : 65;
        ctx.fillStyle = '#00f2fe';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f2fe';
        ctx.beginPath();
        ctx.roundRect(x - 16, y - pH, 32, pH, 8);
        ctx.fill();

        // Cap / Visor
        ctx.fillStyle = '#ff3366';
        ctx.fillRect(x - 14, y - pH + 4, 28, 12);

        // Jetpack Flames
        if (this.player.jetpackTimer > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffd700';
            ctx.fillRect(x - 14, y, 6, 20 + Math.random() * 10);
            ctx.fillRect(x + 8, y, 6, 20 + Math.random() * 10);
        }

        ctx.restore();
    }

    updateHUD() {
        const scoreEl = document.getElementById('subway-score-val');
        const coinsEl = document.getElementById('subway-coins-val');
        const distEl = document.getElementById('subway-dist-val');
        const multiEl = document.getElementById('subway-multiplier-val');

        if (scoreEl) scoreEl.innerText = this.score;
        if (coinsEl) coinsEl.innerText = this.coins;
        if (distEl) distEl.innerText = this.distance.toFixed(1) + ' KM';
        if (multiEl) multiEl.innerText = `${this.player.multiplier}X`;

        this.updatePowerupHUD();
    }

    updatePowerupHUD() {
        const tray = document.getElementById('subway-powerup-tray');
        if (!tray) return;

        let html = '';
        if (this.player.hasHoverboard) html += `<div class="powerup-pill">🛹 HOVERBOARD SHIELD</div>`;
        if (this.player.magnetTimer > 0) html += `<div class="powerup-pill">🧲 MAGNET (${Math.ceil(this.player.magnetTimer / 60)}s)</div>`;
        if (this.player.jetpackTimer > 0) html += `<div class="powerup-pill">🚀 JETPACK (${Math.ceil(this.player.jetpackTimer / 60)}s)</div>`;
        if (this.player.multiplierTimer > 0) html += `<div class="powerup-pill">⭐ 2X BOOST (${Math.ceil(this.player.multiplierTimer / 60)}s)</div>`;

        tray.innerHTML = html;
    }

    gameOver() {
        this.isRunning = false;
        window.audioEngine.playWinFanfare();
        window.particleEngine.triggerConfetti();

        window.hubManager.showGameOver({
            title: "SUBWAY SURFERS RUN COMPLETE!",
            msg: `Surfed ${this.distance.toFixed(1)} KM with ${this.coins} 🪙 Coins!`,
            xp: Math.floor(this.score * 0.1) + 120,
            coins: this.coins + 30
        });
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    pause() {
        this.isPaused = !this.isPaused;
    }

    destroy() {
        this.isRunning = false;
    }
}

window.subwayRunnerGame = new SubwayRunnerGame();
window.subwayGame = window.subwayRunnerGame;

