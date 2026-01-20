/* SIMIOS Next Gen - Logic Core */

const state = {
  serverOnline: true,
  tops: { pk: [], pvp: [] }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// --- Utilities ---
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const escapeHtml = (str) => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);

// --- Animate Numbers ---
function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

// --- Generators (Dummy Data) ---
function genServerStats() {
  const onlineNow = randInt(150, 800);
  animateValue($("#statOnlineNow"), 0, onlineNow, 2000);
  $("#statUptime").textContent = `${randInt(2, 10)}d ${randInt(1, 23)}h`;
}

function genTopList(kind) {
  const names = ["Kael", "Nyx", "Viper", "Ghost", "Zero", "Revenant"];
  const clans = ["System", "Glitch", "Root", "Admin"];
  return Array.from({ length: 6 }, (_, i) => ({
    pos: i + 1, name: pick(names), clan: pick(clans),
    score: (kind === 'pk' ? 1000 : 2000) - (i * 150) - randInt(0,50)
  }));
}

function renderTop(containerId, rows) {
  $(containerId).innerHTML = rows.map(r => `
    <div class="table__row">
      <div class="cell"><span class="rank__pos">#${r.pos}</span> <span class="rank__name">${escapeHtml(r.name)}</span></div>
      <div class="cell rank__clan">${escapeHtml(r.clan)}</div>
      <div class="cell mono" style="text-align:right">${r.score}</div>
    </div>
  `).join('');
}

// --- Visual FX: Background Particles ---
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, particles = [];

  const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
  window.addEventListener('resize', resize); resize();

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * width; this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
      this.size = Math.random() * 2; this.alpha = Math.random() * 0.5;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
      this.alpha = 0.3 + Math.sin(Date.now() * 0.005 + this.x) * 0.2;
    }
    draw() {
      ctx.fillStyle = `rgba(100, 200, 255, ${this.alpha})`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (let i = 0; i < 60; i++) particles.push(new Particle());
  const animate = () => { ctx.clearRect(0, 0, width, height); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); };
  animate();
}

// --- Visual FX: 3D Tilt ---
function initTilt() {
  $$('[data-tilt]').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      const yPct = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
      el.style.transform = `perspective(1000px) rotateX(${yPct}deg) rotateY(${xPct}deg) scale(1.01)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`; });
  });
}

function refreshAll() {
  genServerStats();
  renderTop("#topPK", genTopList('pk'));
  renderTop("#topPVP", genTopList('pvp'));
  $("#pkUpdatedAt").textContent = "NOW"; $("#pvpUpdatedAt").textContent = "NOW";
}

// ================= MODULO DEL JUEGO (CYBER RUNNER) =================
const runnerGame = (() => {
    const canvas = $("#runnerCanvas");
    if(!canvas) return { init: () => {} }; // Exit if canvas missing

    const ctx = canvas.getContext("2d");
    const UI = $("#gameUI");
    const hudDistance = $("#gameDistance");
    
    // Configuración del juego
    let gameState = 'start'; // start, playing, gameover, win
    let animationFrameId;
    let score = 0;
    const TARGET_SCORE = 1000; // Meta para ganar la TV
    let gameSpeed = 5;
    let obstacles = [];

    // El jugador (Cyber Runner)
    const player = {
        x: 50, y: 0, width: 30, height: 50, color: '#00f0ff',
        vy: 0, jumpForce: -12, gravity: 0.6, grounded: false,
        draw() {
            // Cuerpo brillante
            ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // "Ojo" visor
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
            ctx.fillRect(this.x + 20, this.y + 10, 8, 4);
        },
        update(groundLevel) {
            if (gameState !== 'playing') return;
            this.vy += this.gravity;
            this.y += this.vy;
            if (this.y + this.height >= groundLevel) {
                this.y = groundLevel - this.height;
                this.vy = 0; this.grounded = true;
            } else { this.grounded = false; }
        },
        jump() { if (this.grounded && gameState === 'playing') this.vy = this.jumpForce; }
    };

    // Clase para los obstáculos (Firewall Glitches)
    class Obstacle {
        constructor(cw, ch, groundLevel) {
            this.width = randInt(20, 40);
            this.height = randInt(30, 60);
            this.x = cw + this.width;
            this.y = groundLevel - this.height;
            this.color = '#ff2a2a';
        }
        draw() {
             // Efecto de fuego/glitch parpadeante
            ctx.shadowBlur = 20 + Math.random() * 10;
            ctx.shadowColor = this.color; ctx.fillStyle = this.color;
            // Dibujar un polígono irregular para que parezca un glitch
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.lineTo(this.x + this.width - randInt(0,10), this.y + randInt(0,20));
            ctx.lineTo(this.x + randInt(0,10), this.y);
            ctx.fill();
        }
        update() { this.x -= gameSpeed; }
    }

    function resizeGame() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    function spawnObstacle(cw, ch, groundLevel) {
        if(gameState !== 'playing') return;
        obstacles.push(new Obstacle(cw, ch, groundLevel));
         // Tiempo aleatorio para el próximo obstáculo (entre 1 y 2.5 segundos)
        setTimeout(() => spawnObstacle(canvas.width, canvas.height, canvas.height - 20), randInt(1000, 2500));
    }

    function checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    function endGame(type) {
        gameState = type;
        cancelAnimationFrame(animationFrameId);
        UI.style.display = 'flex';
        $$('.game-screen').forEach(s => s.classList.remove('is-active'));
        
        if (type === 'gameover') {
            $("#screenFail").classList.add('is-active');
            $("#finalScoreFail").textContent = Math.floor(score);
        } else if (type === 'win') {
            $("#screenWin").classList.add('is-active');
        }
    }

    function gameLoop() {
        if(gameState !== 'playing') return;
        const cw = canvas.width; const ch = canvas.height;
        const groundLevel = ch - 20; // El suelo está 20px arriba del fondo

        ctx.clearRect(0, 0, cw, ch);

        // Dibujar Suelo Digital
        ctx.shadowBlur = 10; ctx.shadowColor = '#00f0ff'; ctx.strokeStyle = '#00f0ff';
        ctx.beginPath(); ctx.moveTo(0, groundLevel); ctx.lineTo(cw, groundLevel); ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Actualizar lógica
        score += gameSpeed * 0.05;
        hudDistance.textContent = Math.floor(score);
        if (score >= TARGET_SCORE) { endGame('win'); return; }
        gameSpeed = 5 + (score / 200); // Aumentar velocidad progresivamente

        player.update(groundLevel);
        player.draw();

        // Manejar obstáculos
        obstacles.forEach((obs, index) => {
            obs.update(); obs.draw();
            if (checkCollision(player, obs)) { endGame('gameover'); return; }
            if (obs.x + obs.width < 0) obstacles.splice(index, 1); // Eliminar si sale de pantalla
        });

        if(gameState === 'playing') animationFrameId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        gameState = 'playing';
        score = 0; gameSpeed = 5; obstacles = [];
        UI.style.display = 'none';
        resizeGame();
        player.y = canvas.height - 20 - player.height; // Reset posición jugador
        
        // Iniciar bucles
        spawnObstacle(canvas.width, canvas.height, canvas.height - 20);
        gameLoop();
    }

    // Inicialización de controles y eventos
    function init() {
        window.addEventListener('resize', resizeGame);
        resizeGame();

        // Controles (Espacio o Click/Touch)
        document.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); player.jump(); } });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); player.jump(); }, {passive: false});
        canvas.addEventListener('mousedown', (e) => { e.preventDefault(); player.jump(); });

        // Botones de UI
        $("#btnGameStart").addEventListener("click", startGame);
        $("#btnGameRetry").addEventListener("click", startGame);
        $("#btnGameClaim").addEventListener("click", () => {
            alert("Premio reclamado! (Simulación)");
            startGame(); // Reiniciar para demo
        });
        
        // Dibujar estado inicial estático en el canvas
        const groundLevel = canvas.height - 20;
        ctx.shadowBlur = 10; ctx.shadowColor = '#00f0ff'; ctx.strokeStyle = '#00f0ff';
        ctx.beginPath(); ctx.moveTo(0, groundLevel); ctx.lineTo(canvas.width, groundLevel); ctx.stroke();
        player.y = groundLevel - player.height; player.draw();
    }

    return { init };
})();

// --- Main Init ---
function main() {
  initParticles();
  initTilt();
  $("#btnRefreshAll").addEventListener("click", refreshAll);
  refreshAll();
  // Inicializar el juego
  runnerGame.init();
}

document.addEventListener("DOMContentLoaded", main);
