/* ========================================================= */
/* ULTRA 4K PARTICLE & VISUAL EFFECTS ENGINE                 */
/* ========================================================= */

class ParticleEngine {
    constructor() {
        this.bgCanvas = document.getElementById('bg-particles-canvas');
        if (!this.bgCanvas) return;
        this.ctx = this.bgCanvas.getContext('2d');
        this.particles = [];
        this.confetti = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.qualityUltra = true;

        this.initResize();
        this.spawnBackgroundParticles();
        this.animate();
    }

    initResize() {
        const resize = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.bgCanvas.width = this.width;
            this.bgCanvas.height = this.height;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    spawnBackgroundParticles() {
        const count = this.qualityUltra ? 65 : 25;
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 2.5 + 0.8,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -Math.random() * 0.6 - 0.2,
                color: Math.random() > 0.5 ? 'rgba(0, 242, 254,' : 'rgba(248, 87, 166,',
                alpha: Math.random() * 0.7 + 0.2,
                pulse: Math.random() * Math.PI
            });
        }
    }

    // Trigger Victory Confetti Explosion
    triggerConfetti(x = window.innerWidth / 2, y = window.innerHeight / 3) {
        const colors = ['#00f2fe', '#f857a6', '#ffd700', '#00f5a0', '#9b51e0', '#ffffff'];
        for (let i = 0; i < 120; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 4;
            this.confetti.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 15,
                gravity: 0.22,
                alpha: 1,
                decay: Math.random() * 0.012 + 0.008
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Render Background Floating Glow Embers
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.pulse += 0.02;

            if (p.y < -10) {
                p.y = this.height + 10;
                p.x = Math.random() * this.width;
            }
            if (p.x < -10) p.x = this.width + 10;
            if (p.x > this.width + 10) p.x = -10;

            const currentAlpha = Math.abs(Math.sin(p.pulse)) * p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `${p.color} ${currentAlpha})`;
            if (this.qualityUltra) {
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = p.color.replace('rgba', 'rgb').replace(',', ')');
            }
            this.ctx.fill();
        }

        // Render Confetti
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.vy += c.gravity;
            c.vx *= 0.98;
            c.rotation += c.rotSpeed;
            c.alpha -= c.decay;

            if (c.alpha <= 0 || c.y > this.height + 50) {
                this.confetti.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.rotate((c.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = Math.max(0, c.alpha);
            this.ctx.fillStyle = c.color;
            this.ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
            this.ctx.restore();
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

// Global Particle Singleton
window.particleEngine = new ParticleEngine();
