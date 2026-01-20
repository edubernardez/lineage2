/* SIMIOS Next Gen - Logic Core */

const state = {
  serverOnline: true,
  filter: "all",
  raids: [],
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

// --- Generators ---
function genServerStats() {
  const onlineNow = randInt(150, 800);
  const el = $("#statOnlineNow");
  animateValue(el, 0, onlineNow, 2000);
  
  const uptime = `${randInt(2, 10)}d ${randInt(1, 23)}h`;
  const siege = pick(["PEACE_MODE", "REG_OPEN", "SIEGE_ACTIVE"]);
  
  $("#statUptime").textContent = uptime;
  $("#statSiege").textContent = siege;
}

function genTopList(kind) {
  const names = ["Kael", "Nyx", "Viper", "Ghost", "Zero", "Revenant", "Frost", "Cipher", "Echo", "Dusk"];
  const clans = ["System", "Glitch", "Root", "Admin", "Null", "Void"];
  
  return Array.from({ length: 8 }, (_, i) => ({
    pos: i + 1,
    name: pick(names),
    clan: pick(clans),
    score: (kind === 'pk' ? 1000 : 2000) - (i * 100) - randInt(0,50)
  }));
}

function renderTop(containerId, rows) {
  const target = $(containerId);
  target.innerHTML = rows.map(r => `
    <div class="table__row">
      <div class="cell"><span class="rank__pos">#${r.pos}</span> <span class="rank__name">${escapeHtml(r.name)}</span></div>
      <div class="cell rank__clan">${escapeHtml(r.clan)}</div>
      <div class="cell"></div>
      <div class="cell mono" style="text-align:right">${r.score}</div>
    </div>
  `).join('');
}

function genRaids() {
  const bosses = ["Queen Ant", "Core", "Orfen", "Baium", "Antharas", "Valakas", "Frintezza", "Beleth"];
  return bosses.map(name => {
    const alive = Math.random() > 0.4;
    return { name, alive, zone: "Chaotic Zone", respawn: alive ? "ACTIVE" : `T-${randInt(1,12)}H` };
  });
}

function renderRaids() {
  const body = $("#raidTableBody");
  const filtered = state.raids.filter(r => state.filter === "all" || (state.filter === "alive" ? r.alive : !r.alive));
  
  body.innerHTML = filtered.map(r => `
    <div class="table__row">
      <div class="cell font-bold" style="color:var(--text-main)">${escapeHtml(r.name)}</div>
      <div class="cell">
        <span class="pillstate ${r.alive ? 'pillstate--alive' : 'pillstate--dead'}">
          ${r.alive ? 'SIGNAL_FOUND' : 'NO_SIGNAL'}
        </span>
      </div>
      <div class="cell muted micro">${escapeHtml(r.zone)}</div>
      <div class="cell mono neon-blue">${escapeHtml(r.respawn)}</div>
    </div>
  `).join('') || '<div class="table__row"><div class="cell muted">NO DATA FOUND</div></div>';
}

// --- Visual FX: Particles ---
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

  const resize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.size = Math.random() * 2;
      this.alpha = Math.random() * 0.5;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
      this.alpha = 0.3 + Math.sin(Date.now() * 0.005 + this.x) * 0.2;
    }
    draw() {
      ctx.fillStyle = `rgba(100, 200, 255, ${this.alpha})`; // Cyan dust
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < 60; i++) particles.push(new Particle());

  const animate = () => {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  };
  animate();
}

// --- Visual FX: 3D Tilt ---
function initTilt() {
  $$('[data-tilt]').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xPct = (x / rect.width - 0.5) * 10; // Max rotation deg
      const yPct = (y / rect.height - 0.5) * -10;
      
      el.style.transform = `perspective(1000px) rotateX(${yPct}deg) rotateY(${xPct}deg) scale(1.01)`;
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
    });
  });
}

function refreshAll() {
  genServerStats();
  state.tops.pk = genTopList('pk');
  state.tops.pvp = genTopList('pvp');
  renderTop("#topPK", state.tops.pk);
  renderTop("#topPVP", state.tops.pvp);
  $("#pkUpdatedAt").textContent = "NOW";
  $("#pvpUpdatedAt").textContent = "NOW";
  state.raids = genRaids();
  renderRaids();
}

function main() {
  initParticles();
  initTilt();
  
  $$(".seg__btn").forEach(btn => btn.addEventListener("click", () => {
    $$(".seg__btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.filter = btn.dataset.filter;
    renderRaids();
  }));

  $("#btnRefreshAll").addEventListener("click", refreshAll);
  $("#btnRefreshRaids").addEventListener("click", () => { state.raids = genRaids(); renderRaids(); });
  
  refreshAll();
}

document.addEventListener("DOMContentLoaded", main);