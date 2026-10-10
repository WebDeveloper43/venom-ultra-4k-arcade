/* ========================================================= */
/* GAME 1: CYBER NITRO RACING ENGINE (3D / Canvas Arcade)    */
/* ========================================================= */

class CarRacingGame {
    constructor() {
        this.canvas = document.getElementById('car-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.mode = 'ai';
        this.difficulty = 'normal';

        // Player Car State
        this.player = {
            x: 0, // -1 (left lane) to 1 (right lane)
            y: 480,
            width: 48,
            height: 84,
            speed: 0,
            maxSpeed: 240,
            nitroMaxSpeed: 340,
            accel: 1.2,
            handling: 0.05,
            nitro: 100,
            isNitro: false,
            color: '#00f2fe'
        };

        // Game Environment & Road
        this.roadOffset = 0;
        this.roadWidth = 460;
        this.distance = 0;
        this.score = 0;
        this.coins = 0;
        this.traffic = [];
        this.collectibles = [];
        this.particles = [];

        // Controls State
        this.keys = { left: false, right: false, up: false, down: false, nitro: false };
        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
            if (e.key === ' ' || e.key === 'Shift') this.keys.nitro = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
            if (e.key === ' ' || e.key === 'Shift') this.keys.nitro = false;
        });

        // Touch button bindings
        const touchLeft = document.getElementById('touch-car-left');
        const touchRight = document.getElementById('touch-car-right');
        const touchNitro = document.getElementById('touch-car-nitro');

        if (touchLeft) {
            touchLeft.onpointerdown = () => this.keys.left = true;
            touchLeft.onpointerup = () => this.keys.left = false;
        }
        if (touchRight) {
            touchRight.onpointerdown = () => this.keys.right = true;
            touchRight.onpointerup = () => this.keys.right = false;
        }
        if (touchNitro) {
            touchNitro.onpointerdown = () => this.keys.nitro = true;
            touchNitro.onpointerup = () => this.keys.nitro = false;
        }
    }

    init(mode = 'ai', difficulty = 'normal') {
        this.mode = mode;
        this.difficulty = difficulty;
        this.reset();
        this.isRunning = true;
        this.isPaused = false;
        this.loop();
    }

    reset() {
        this.player.x = 0;
        this.player.speed = 120;
        this.player.nitro = 100;
        this.distance = 0;
        this.score = 0;
        this.coins = 0;
        this.traffic = [];
        this.collectibles = [];
        this.particles = [];
        this.updateHUD();
    }

    spawnTraffic() {
        const laneX = [-0.65, -0.22, 0.22, 0.65];
        const randomLane = laneX[Math.floor(Math.random() * laneX.length)];
        
        let speedMult = 0.5;
        if (this.difficulty === 'normal') speedMult = 0.7;
        if (this.difficulty === 'hard') speedMult = 0.9;

        const colors = ['#ff3366', '#f8d800', '#9b51e0', '#00f5a0', '#ffffff'];
        this.traffic.push({
            x: randomLane,
            y: -120,
            width: 46,
            height: 80,
            speed: 80 * speedMult + Math.random() * 40,
            color: colors[Math.floor(Math.random() * colors.length)],
            laneTarget: randomLane,
            canSwitch: this.difficulty === 'hard' && Math.random() > 0.6
        });
    }

    spawnCollectible() {
        const laneX = [-0.65, -0.22, 0.22, 0.65];
        const randomLane = laneX[Math.floor(Math.random() * laneX.length)];
        const isNitroPickup = Math.random() > 0.75;

        this.collectibles.push({
            x: randomLane,
            y: -80,
            type: isNitroPickup ? 'nitro' : 'coin',
            radius: 14,
            rotation: 0
        });
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        // Nitro & Speed logic
        this.player.isNitro = this.keys.nitro && this.player.nitro > 0;
        if (this.player.isNitro) {
            this.player.nitro = Math.max(0, this.player.nitro - 0.4);
            if (this.player.speed < this.player.nitroMaxSpeed) {
                this.player.speed += 2.5;
            }
            if (Math.random() > 0.4) {
                window.audioEngine.playEngine(1.8, true);
            }
        } else {
            this.player.nitro = Math.min(100, this.player.nitro + 0.1);
            if (this.keys.up && this.player.speed < this.player.maxSpeed) {
                this.player.speed += this.player.accel;
            } else if (this.keys.down && this.player.speed > 60) {
                this.player.speed -= 2.0;
            } else if (this.player.speed > 140) {
                this.player.speed -= 0.8;
            } else if (this.player.speed < 120) {
                this.player.speed += 0.5;
            }
        }

        // Handling / Steering
        if (this.keys.left) this.player.x -= this.player.handling;
        if (this.keys.right) this.player.x += this.player.handling;
        this.player.x = Math.max(-0.85, Math.min(0.85, this.player.x));

        // Distance & Score increment
        const kmhDelta = this.player.speed * 0.0002;
        this.distance += kmhDelta;
        this.score += Math.floor(this.player.speed * 0.1);
        this.roadOffset += this.player.speed * 0.15;

        // Spawn traffic
        const spawnInterval = this.difficulty === 'hard' ? 45 : (this.difficulty === 'normal' ? 65 : 90);
        if (Math.floor(this.roadOffset) % spawnInterval === 0 && this.traffic.length < 8) {
            this.spawnTraffic();
        }

        // Spawn collectibles
        if (Math.floor(this.roadOffset) % 110 === 0 && this.collectibles.length < 5) {
            this.spawnCollectible();
        }

        // Update traffic
        const centerX = this.canvas.width / 2;
        const playerScreenX = centerX + this.player.x * (this.roadWidth / 2);
        const playerBox = {
            left: playerScreenX - this.player.width / 2,
            right: playerScreenX + this.player.width / 2,
            top: this.player.y,
            bottom: this.player.y + this.player.height
        };

        for (let i = this.traffic.length - 1; i >= 0; i--) {
            const car = this.traffic[i];
            const relativeSpeed = (this.player.speed - car.speed) * 0.1;
            car.y += relativeSpeed;

            // Lane change for Hard difficulty
            if (car.canSwitch && Math.random() > 0.98) {
                car.laneTarget += (Math.random() > 0.5 ? 0.3 : -0.3);
                car.laneTarget = Math.max(-0.7, Math.min(0.7, car.laneTarget));
            }
            car.x += (car.laneTarget - car.x) * 0.05;

            const carScreenX = centerX + car.x * (this.roadWidth / 2);
            const carBox = {
                left: carScreenX - car.width / 2,
                right: carScreenX + car.width / 2,
                top: car.y,
                bottom: car.y + car.height
            };

            // Collision check
            if (
                playerBox.left < carBox.right &&
                playerBox.right > carBox.left &&
                playerBox.top < carBox.bottom &&
                playerBox.bottom > carBox.top
            ) {
                // Crash!
                window.audioEngine.playCrash();
                this.gameOver();
                return;
            }

            // Remove off-screen traffic
            if (car.y > this.canvas.height + 150 || car.y < -300) {
                this.traffic.splice(i, 1);
            }
        }

        // Update collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const item = this.collectibles[i];
            item.y += this.player.speed * 0.1;
            item.rotation += 0.05;

            const itemScreenX = centerX + item.x * (this.roadWidth / 2);
            const dist = Math.hypot(playerScreenX - itemScreenX, (this.player.y + this.player.height / 2) - item.y);

            if (dist < 40) {
                // Picked up!
                if (item.type === 'coin') {
                    this.coins += 10;
                    this.score += 500;
                    window.audioEngine.playCoin();
                } else {
                    this.player.nitro = 100;
                    window.audioEngine.playCoin();
                }
                this.collectibles.splice(i, 1);
                continue;
            }

            if (item.y > this.canvas.height + 50) {
                this.collectibles.splice(i, 1);
            }
        }

        this.updateHUD();
    }

    updateHUD() {
        const scoreEl = document.getElementById('car-score-val');
        const distEl = document.getElementById('car-dist-val');
        const coinsEl = document.getElementById('car-coins-val');
        const speedEl = document.getElementById('car-speed-num');
        const nitroEl = document.getElementById('car-nitro-bar');

        if (scoreEl) scoreEl.innerText = this.score.toString().padStart(5, '0');
        if (distEl) distEl.innerText = this.distance.toFixed(1) + ' KM';
        if (coinsEl) coinsEl.innerText = '🪙 ' + this.coins;
        if (speedEl) speedEl.innerText = Math.floor(this.player.speed);
        if (nitroEl) nitroEl.style.width = this.player.nitro + '%';
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        // Cyber Grid Horizon Background
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#090d1f');
        grad.addColorStop(0.6, '#0f1738');
        grad.addColorStop(1, '#05070e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Road Surface
        const roadLeft = (w - this.roadWidth) / 2;
        ctx.fillStyle = '#141829';
        ctx.fillRect(roadLeft, 0, this.roadWidth, h);

        // Road Neon Borders
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f2fe';
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(roadLeft - 4, 0, 8, h);
        ctx.shadowColor = '#f857a6';
        ctx.fillStyle = '#f857a6';
        ctx.fillRect(roadLeft + this.roadWidth - 4, 0, 8, h);
        ctx.shadowBlur = 0;

        // Moving Road Dash Lines (Lane dividers)
        const laneWidth = this.roadWidth / 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let lane = 1; lane < 4; lane++) {
            const laneX = roadLeft + lane * laneWidth;
            const lineSpacing = 60;
            const lineLen = 35;
            for (let y = (this.roadOffset % lineSpacing) - lineSpacing; y < h; y += lineSpacing) {
                ctx.fillRect(laneX - 2, y, 4, lineLen);
            }
        }

        // Draw Collectibles
        const centerX = w / 2;
        this.collectibles.forEach(item => {
            const cx = centerX + item.x * (this.roadWidth / 2);
            ctx.save();
            ctx.translate(cx, item.y);
            ctx.rotate(item.rotation);
            if (item.type === 'coin') {
                ctx.fillStyle = '#ffd700';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffd700';
                ctx.beginPath();
                ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold 12px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🪙', 0, 0);
            } else {
                ctx.fillStyle = '#00f2fe';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f2fe';
                ctx.fillRect(-12, -12, 24, 24);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚡', 0, 0);
            }
            ctx.restore();
        });

        // Draw Traffic Cars
        this.traffic.forEach(car => {
            const cx = centerX + car.x * (this.roadWidth / 2);
            this.drawCar(ctx, cx, car.y, car.width, car.height, car.color, false);
        });

        // Draw Player Car
        const playerScreenX = centerX + this.player.x * (this.roadWidth / 2);
        this.drawCar(ctx, playerScreenX, this.player.y, this.player.width, this.player.height, this.player.color, true);

        // Nitro flame effect
        if (this.player.isNitro) {
            ctx.fillStyle = 'rgba(0, 242, 254, 0.8)';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00f2fe';
            ctx.beginPath();
            ctx.moveTo(playerScreenX - 14, this.player.y + this.player.height);
            ctx.lineTo(playerScreenX, this.player.y + this.player.height + 25 + Math.random() * 15);
            ctx.lineTo(playerScreenX + 14, this.player.y + this.player.height);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    drawCar(ctx, x, y, width, height, color, isPlayer) {
        ctx.save();
        ctx.translate(x, y);

        // Car Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-width / 2 + 4, 8, width - 8, height);

        // Wheels
        ctx.fillStyle = '#111';
        ctx.fillRect(-width / 2 - 4, 10, 6, 18);
        ctx.fillRect(width / 2 - 2, 10, 6, 18);
        ctx.fillRect(-width / 2 - 4, height - 28, 6, 18);
        ctx.fillRect(width / 2 - 2, height - 28, 6, 18);

        // Car Body
        ctx.fillStyle = color;
        if (isPlayer) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
        }
        ctx.beginPath();
        ctx.roundRect(-width / 2, 0, width, height, 10);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Windshield
        ctx.fillStyle = '#060a14';
        ctx.beginPath();
        ctx.roundRect(-width / 2 + 6, 20, width - 12, 18, 4);
        ctx.fill();

        // Rear window
        ctx.fillRect(-width / 2 + 8, height - 26, width - 16, 10);

        // Headlights / Taillights
        if (isPlayer) {
            ctx.fillStyle = '#00f2fe';
            ctx.fillRect(-width / 2 + 4, 2, 8, 4);
            ctx.fillRect(width / 2 - 12, 2, 8, 4);
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(-width / 2 + 6, height - 4, 8, 3);
            ctx.fillRect(width / 2 - 14, height - 4, 8, 3);
        } else {
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(-width / 2 + 6, height - 4, 8, 3);
            ctx.fillRect(width / 2 - 14, height - 4, 8, 3);
        }

        ctx.restore();
    }

    gameOver() {
        this.isRunning = false;
        window.hubManager.showGameOver({
            title: "CRASH & BURN!",
            msg: `You survived ${this.distance.toFixed(1)} KM with ${this.coins} Coins!`,
            xp: Math.floor(this.score * 0.1),
            coins: this.coins + 20
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

window.carGame = new CarRacingGame();
