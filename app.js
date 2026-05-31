let particlesData = [];
let particlesBySymbol = {};
let currentTab = 'standard-model';
let viewAntiparticles = false;
let currentLang = 'en'; // 'en' or 'ko'

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ko' : 'en';
  document.body.setAttribute('data-lang', currentLang);
  const btn = document.getElementById('btn-lang-toggle');
  if (btn) btn.innerHTML = currentLang === 'en' ? '🌐 EN / KO' : '🌐 KO / EN';
  
  // Re-render the whole UI
  renderParticleMatrix();
  renderReactionSlots();
  if (document.getElementById('audit-report-container').innerHTML !== '') {
    runReactionAudit(); // Re-audit to translate report
  }
}

// Initialize lang
document.addEventListener('DOMContentLoaded', () => {
  document.body.setAttribute('data-lang', currentLang);
});

// Right Panel Active Tab
let rightPanelTab = 'collision'; // 'collision', 'builder', or 'neutrino'

// Higgs SSB State
let higgsMu2 = 2.0;
let higgsLambda = 0.5;
let isSSBTriggered = false;
let higgsBall = {
  phi1: 0.0, // Re(Phi)
  phi2: 0.0, // Im(Phi)
  v1: 0.0,   // velocity along phi1
  v2: 0.0,   // velocity along phi2
  trail: []  // trajectory path
};
let higgsLoopId = null;
let canvasHiggsSsb = null;
let ctxHiggsSsb = null;
let higgsRotationAngle = 0; // for 3D rotation view of the Mexican Hat

// SUSY & MET State
let susyGluinoMass = 2.0;
let susyLSPMass = 200;
let isRParityConserved = true;
let canvasSusyDetector = null;
let ctxSusyDetector = null;
let susyLoopId = null;
let susyParticles = [];
let susyLSPParticles = [];
let susyCollisionActive = false;
let susyCollisionFrame = 0;
let susyMETVector = {x: 0, y: 0, magnitude: 0};

// GUT & Proton Decay State
let gutMXScale = 15.0; // log10 of M_X in GeV
let gutAlpha = 0.041;  // ~1/24 coupling strength
let isGUTModeActive = false;
let canvasGUTDetector = null;
let ctxGUTDetector = null;
let gutLoopId = null;
let protonDecayParticles = [];
let cherenkovRings = [];
let gutCollisionActive = false;
let gutCollisionFrame = 0;

// CKM Matrix Lab State
let ckmTheta12 = 13.04; // in degrees
let ckmTheta23 = 2.38;  // in degrees
let ckmTheta13 = 0.201; // in degrees
let ckmDelta = 68.8;    // in degrees
let canvasCKMTriangle = null;
let ctxCKMTriangle = null;
let ckmLoopId = null;   // for micro-animation of CP violation

// RGE Unification Lab State
let isRGEMSSM = false;  // false for SM, true for MSSM
let canvasRGEGraph = null;
let ctxRGEGraph = null;
let rgeLoopId = null;   // for micro-animation of coupling running waves

// QCD Phase Diagram & QGP Lab State
let qcdTemperature = 0; // MeV
let qcdMuB = 0; // MeV
let canvasQCDPhase = null;
let ctxQCDPhase = null;
let canvasQCDMicro = null;
let ctxQCDMicro = null;
let qcdLoopId = null;
let qcdMicroParticles = []; // For rendering quarks and gluons

// Feynman QFT Lab State
let feynmanProcess = "e- e+ -> mu- mu+";
let feynmanEnergy = 1000; // sqrt(s) in GeV
let canvasFeynmanDiagram = null;
let ctxFeynmanDiagram = null;
let canvasFeynmanScattering = null;
let ctxFeynmanScattering = null;
let feynmanLoopId = null;

// Cosmology Lab State
let cosmoMass = 100.0;
let cosmoSigmaVLog = -25.5228;
let cosmoXf = 25.0;
let cosmoOmega = 0.12;
let canvasCosmoEvol = null;
let ctxCosmoEvol = null;
let canvasCosmoMicro = null;
let ctxCosmoMicro = null;
let cosmoLoopId = null;
let cosmoMicroParticles = [];

// Neutrino Oscillation Lab State
let nuOscFrom = 'nu_mu';
let nuOscTo = 'nu_tau';
let nuOscEnergy = 1.0;
let nuOscDensityLog = 26.0;
let canvasNuOsc = null;
let ctxNuOsc = null;
let canvasMSW = null;
let ctxMSW = null;
let nuOscLoopId = null;

// Sphaleron & Baryogenesis Lab State
let sphalTemp = 250.0;
let sphalCpPhase = 1.57;
let sphalOutEq = 1.0;
let canvasSphalPot = null;
let ctxSphalPot = null;
let canvasBaryon = null;
let ctxBaryon = null;
let sphalLoopId = null;
let baryonHistory = [];

// Axion & Strong CP Lab State
let axionFaExp = 12.0; // 10^12 GeV
let axionBField = 8.0; // Tesla
let axionQFactorExp = 5.0; // 10^5
let canvasAxionTheta = null;
let ctxAxionTheta = null;
let canvasAxionHaloscope = null;
let ctxAxionHaloscope = null;
let axionLoopId = null;
let haloscopeTime = 0;

// Simulator Slots (Collision Lab)
let reactants = [];
let products = [];
let activeSlot = 'reactants'; // 'reactants' or 'products'

// Hadron Builder State
let builderSlots = [null, null, null]; // Quarks inside slots
let builderColors = [null, null, null]; // Color charges inside slots
let selectedSlotIdx = 0; // Current slot selected for editing

// Neutrino Oscillation State
let initialNeutrinoFlavor = 'nu_e'; // 'nu_e', 'nu_mu', 'nu_tau'

// Canvas Animation
let canvas, ctx;
let animationId = null;
let tracks = [];

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('canvas-visualizer');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Clear canvas initially
  drawEmptyCanvas();

  // Load Database
  fetch('./particles.json')
    .then(res => res.json())
    .then(data => {
      particlesData = data.particles;
      
      // Index by symbol
      particlesData.forEach(p => {
        particlesBySymbol[p.symbol] = p;
      });
      
      // Render
      renderParticleMatrix();
      setupEventListeners();
      
      // Init Hadron Builder UI
      selectBuilderSlot(0);
      
      // Init Decay Cascade
      initDecayCascadeSelector();
    })
    .catch(err => {
      console.error("Failed to load particle database:", err);
      document.querySelector('.particle-grid').innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 2rem;">Failed to load database: ${err.message}</div>`;
    });
});

function resizeCanvas() {
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasHiggsSsb) {
    const rect = canvasHiggsSsb.getBoundingClientRect();
    canvasHiggsSsb.width = rect.width * window.devicePixelRatio;
    canvasHiggsSsb.height = rect.height * window.devicePixelRatio;
    ctxHiggsSsb.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasSusyDetector) {
    const rect = canvasSusyDetector.getBoundingClientRect();
    canvasSusyDetector.width = rect.width * window.devicePixelRatio;
    canvasSusyDetector.height = rect.height * window.devicePixelRatio;
    ctxSusyDetector.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasGUTDetector) {
    const rect = canvasGUTDetector.getBoundingClientRect();
    canvasGUTDetector.width = rect.width * window.devicePixelRatio;
    canvasGUTDetector.height = rect.height * window.devicePixelRatio;
    ctxGUTDetector.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasCKMTriangle) {
    const rect = canvasCKMTriangle.getBoundingClientRect();
    canvasCKMTriangle.width = rect.width * window.devicePixelRatio;
    canvasCKMTriangle.height = rect.height * window.devicePixelRatio;
    ctxCKMTriangle.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasRGEGraph) {
    const rect = canvasRGEGraph.getBoundingClientRect();
    canvasRGEGraph.width = rect.width * window.devicePixelRatio;
    canvasRGEGraph.height = rect.height * window.devicePixelRatio;
    ctxRGEGraph.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasQCDPhase) {
    const rect = canvasQCDPhase.getBoundingClientRect();
    canvasQCDPhase.width = rect.width * window.devicePixelRatio;
    canvasQCDPhase.height = rect.height * window.devicePixelRatio;
    ctxQCDPhase.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasQCDMicro) {
    const rect = canvasQCDMicro.getBoundingClientRect();
    canvasQCDMicro.width = rect.width * window.devicePixelRatio;
    canvasQCDMicro.height = rect.height * window.devicePixelRatio;
    ctxQCDMicro.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasFeynmanDiagram) {
    const rect = canvasFeynmanDiagram.getBoundingClientRect();
    canvasFeynmanDiagram.width = rect.width * window.devicePixelRatio;
    canvasFeynmanDiagram.height = rect.height * window.devicePixelRatio;
    ctxFeynmanDiagram.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasFeynmanScattering) {
    const rect = canvasFeynmanScattering.getBoundingClientRect();
    canvasFeynmanScattering.width = rect.width * window.devicePixelRatio;
    canvasFeynmanScattering.height = rect.height * window.devicePixelRatio;
    ctxFeynmanScattering.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasCosmoEvol) {
    const rect = canvasCosmoEvol.getBoundingClientRect();
    canvasCosmoEvol.width = rect.width * window.devicePixelRatio;
    canvasCosmoEvol.height = rect.height * window.devicePixelRatio;
    ctxCosmoEvol.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasCosmoMicro) {
    const rect = canvasCosmoMicro.getBoundingClientRect();
    canvasCosmoMicro.width = rect.width * window.devicePixelRatio;
    canvasCosmoMicro.height = rect.height * window.devicePixelRatio;
    ctxCosmoMicro.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasNuOsc) {
    const rect = canvasNuOsc.getBoundingClientRect();
    canvasNuOsc.width = rect.width * window.devicePixelRatio;
    canvasNuOsc.height = rect.height * window.devicePixelRatio;
    ctxNuOsc.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasMSW) {
    const rect = canvasMSW.getBoundingClientRect();
    canvasMSW.width = rect.width * window.devicePixelRatio;
    canvasMSW.height = rect.height * window.devicePixelRatio;
    ctxMSW.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasSphalPot) {
    const rect = canvasSphalPot.getBoundingClientRect();
    canvasSphalPot.width = rect.width * window.devicePixelRatio;
    canvasSphalPot.height = rect.height * window.devicePixelRatio;
    ctxSphalPot.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasBaryon) {
    const rect = canvasBaryon.getBoundingClientRect();
    canvasBaryon.width = rect.width * window.devicePixelRatio;
    canvasBaryon.height = rect.height * window.devicePixelRatio;
    ctxBaryon.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasAxionTheta) {
    const rect = canvasAxionTheta.getBoundingClientRect();
    canvasAxionTheta.width = rect.width * window.devicePixelRatio;
    canvasAxionTheta.height = rect.height * window.devicePixelRatio;
    ctxAxionTheta.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  if (canvasAxionHaloscope) {
    const rect = canvasAxionHaloscope.getBoundingClientRect();
    canvasAxionHaloscope.width = rect.width * window.devicePixelRatio;
    canvasAxionHaloscope.height = rect.height * window.devicePixelRatio;
    ctxAxionHaloscope.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
}

let bubbleChamberEvents = [];
window.pushBubbleChamberEvent = function(desc) {
  const time = (Date.now() % 10000 / 1000).toFixed(2);
  bubbleChamberEvents.push(`[${time} ns] ${desc.toUpperCase()}`);
  if (bubbleChamberEvents.length > 5) {
    bubbleChamberEvents.shift();
  }
};

function resolveColor(c) {
  if (c && typeof c === 'string' && c.startsWith('var(')) {
    if (c.includes('--color-quark')) return '#ff3366';
    if (c.includes('--color-lepton')) return '#00f0ff';
    if (c.includes('--color-gauge')) return '#ffaa00';
    if (c.includes('--color-scalar')) return '#a855f7';
    if (c.includes('--color-bsm')) return '#3b82f6';
  }
  return c || '#ffffff';
}

function hexToRgba(hex, alpha) {
  let resolved = resolveColor(hex);
  if (resolved.startsWith('rgba')) {
    return resolved.replace(/[\d\.]+\)$/, alpha + ')');
  }
  resolved = resolved.replace('#', '');
  if (resolved.length === 3) {
    resolved = resolved[0] + resolved[0] + resolved[1] + resolved[1] + resolved[2] + resolved[2];
  }
  let r = parseInt(resolved.substring(0, 2), 16);
  let g = parseInt(resolved.substring(2, 4), 16);
  let b = parseInt(resolved.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawEmptyCanvas() {
  if (!ctx) return;
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  
  // Draw subtle grid lines like a bubble chamber detector
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 25;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  // Concentric magnetic detector rings
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.03)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 80, 0, Math.PI * 2);
  ctx.stroke();
}

function setupEventListeners() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderParticleMatrix();
    });
  });

  // Antiparticle toggle
  const antiToggle = document.getElementById('antiparticle-toggle');
  antiToggle.addEventListener('change', (e) => {
    viewAntiparticles = e.target.checked;
    renderParticleMatrix();
  });

  // Simulator Slots Active Switch
  document.getElementById('slot-reactants').addEventListener('click', () => {
    activeSlot = 'reactants';
    document.getElementById('slot-reactants').classList.add('active-slot');
    document.getElementById('slot-products').classList.remove('active-slot');
  });

  document.getElementById('slot-products').addEventListener('click', () => {
    activeSlot = 'products';
    document.getElementById('slot-products').classList.add('active-slot');
    document.getElementById('slot-reactants').classList.remove('active-slot');
  });

  // Action Buttons
  document.getElementById('btn-predict-sim').addEventListener('click', predictReactionProducts);
  document.getElementById('btn-run-sim').addEventListener('click', runReactionAudit);
  document.getElementById('btn-clear-sim').addEventListener('click', clearSimulator);
}

function renderParticleMatrix() {
  const grid = document.getElementById('matrix-grid');
  grid.innerHTML = '';
  
  // Filter particles based on category/type tab
  let filtered = particlesData.filter(p => {
    if (currentTab === 'standard-model') {
      return p.category === 'Standard Model' && p.is_antiparticle === viewAntiparticles;
    }
    if (currentTab === 'composite-hadron') {
      return p.category === 'Composite Hadron' && p.is_antiparticle === viewAntiparticles;
    }
    if (currentTab === 'bsm') {
      return p.category === 'Beyond Standard Model' && p.is_antiparticle === viewAntiparticles;
    }
    return p.is_antiparticle === viewAntiparticles;
  });

  // Group by type for visual clarity
  const groups = {};
  filtered.forEach(p => {
    if (!groups[p.type]) groups[p.type] = [];
    groups[p.type].push(p);
  });

  const groupOrder = ['quark', 'lepton', 'baryon', 'meson', 'gauge_boson', 'scalar_boson', 'supersymmetric_particle', 'topological_defect'];
  const groupTitles = {
    quark: currentLang === 'ko' ? 'Fundamental Quarks (기본 쿼크)' : 'Fundamental Quarks',
    lepton: currentLang === 'ko' ? 'Fundamental Leptons (기본 렙톤)' : 'Fundamental Leptons',
    baryon: currentLang === 'ko' ? 'Baryons (3쿼크 복합 강입자)' : 'Baryons',
    meson: currentLang === 'ko' ? 'Mesons (쿼크-반쿼크 중간자)' : 'Mesons',
    gauge_boson: currentLang === 'ko' ? 'Gauge Bosons (게이지 보손)' : 'Gauge Bosons',
    scalar_boson: currentLang === 'ko' ? 'Scalar Bosons (스칼라 보손)' : 'Scalar Bosons',
    supersymmetric_particle: currentLang === 'ko' ? 'Supersymmetric Sparticles (초대칭 입자)' : 'Supersymmetric Sparticles',
    topological_defect: currentLang === 'ko' ? 'Topological Defects (위상 기하학적 결함)' : 'Topological Defects'
  };

  groupOrder.forEach(type => {
    if (groups[type] && groups[type].length > 0) {
      const section = document.createElement('div');
      section.className = 'matrix-section';
      
      const label = document.createElement('div');
      label.className = 'section-label';
      label.innerHTML = `<span>●</span> ${groupTitles[type] || type.toUpperCase()}`;
      section.appendChild(label);
      
      const pGrid = document.createElement('div');
      pGrid.className = 'particle-grid';
      
      groups[type].sort((a,b) => a.mass_mev - b.mass_mev);
      
      groups[type].forEach(p => {
        const card = createParticleCard(p);
        pGrid.appendChild(card);
      });
      
      section.appendChild(pGrid);
      grid.appendChild(section);
    }
  });
}

function getParticleColors(type) {
  switch(type) {
    case 'quark': return { color: 'var(--color-quark)', glow: 'var(--glow-quark)' };
    case 'lepton': return { color: 'var(--color-lepton)', glow: 'var(--glow-lepton)' };
    case 'baryon': return { color: '#a5b4fc', glow: '0 0 15px rgba(165, 180, 252, 0.3)' };
    case 'meson': return { color: '#ec4899', glow: '0 0 15px rgba(236, 72, 153, 0.3)' };
    case 'gauge_boson': return { color: 'var(--color-gauge)', glow: 'var(--glow-gauge)' };
    case 'scalar_boson': return { color: 'var(--color-scalar)', glow: 'var(--glow-scalar)' };
    default: return { color: 'var(--color-bsm)', glow: 'var(--glow-bsm)' };
  }
}

function createParticleCard(p) {
  const card = document.createElement('div');
  card.className = 'particle-card';
  
  const colors = getParticleColors(p.type);
  card.style.setProperty('--type-color', colors.color);
  card.style.setProperty('--type-glow', colors.glow);
  
  card.innerHTML = `
    <div class="card-symbol">${p.symbol}</div>
    <div class="card-name">${p.name}</div>
    <div class="card-meta">
      <span class="card-charge">${p.charge > 0 ? '+' : ''}${parseFloat(p.charge.toFixed(2))}e</span>
      <span class="card-mass">${p.mass_mev === 0 ? '0' : formatMass(p.mass_mev)}</span>
    </div>
  `;
  
  if (reactants.includes(p.symbol)) {
    card.classList.add('selected-react');
  } else if (products.includes(p.symbol)) {
    card.classList.add('selected-prod');
  }

  card.addEventListener('click', (e) => {
    if (rightPanelTab === 'builder') {
      if (p.type === 'quark') {
        addQuarkToBuilder(p.symbol);
      } else {
        alert("Hadron Builder는 기본 쿼크(Up, Down, Charm 등)와 반쿼크들만 조합할 수 있습니다!");
      }
    } else {
      if (e.ctrlKey || activeSlot) {
        addToSimulator(p.symbol);
      }
    }
    showParticleDetails(p);
  });
  
  return card;
}

function formatMass(mass) {
  if (mass < 1e-3) return (mass * 1e6).toFixed(1) + ' eV';
  if (mass < 1) return (mass * 1e3).toFixed(2) + ' keV';
  if (mass > 1000) return (mass / 1000).toFixed(2) + ' GeV';
  return mass.toFixed(3) + ' MeV';
}

function formatLifetime(s) {
  if (s === null) return 'Stable (안정)';
  if (s > 1e10) return s.toExponential(2) + ' seconds (Cosmologically Stable)';
  return s.toExponential(4) + ' s';
}

// CKM Matrix transition probabilities (V_ij^2)
const ckmMatrix = {
  "u": { "d": 0.949, "s": 0.051, "b": 0.00001, "note": "V_ud, V_us, V_ub" },
  "c": { "d": 0.051, "s": 0.947, "b": 0.0017, "note": "V_cd, V_cs, V_cb" },
  "t": { "d": 0.00008, "s": 0.0016, "b": 0.998, "note": "V_td, V_ts, V_tb" },
  "anti_u": { "anti_d": 0.949, "anti_s": 0.051, "anti_b": 0.00001 },
  "anti_c": { "anti_d": 0.051, "anti_s": 0.947, "anti_b": 0.0017 },
  "anti_t": { "anti_d": 0.00008, "anti_s": 0.0016, "anti_b": 0.998 }
};

function showParticleDetails(p) {
  const details = document.getElementById('particle-details-panel');
  const colors = getParticleColors(p.type);
  
  let decayHtml = '';
  if (!p.stable && p.decay_modes && p.decay_modes.length > 0) {
    decayHtml = `
      <div class="decay-list-wrap">
        <div class="decay-title">
          <svg style="width:16px;height:16px;stroke:#a5b4fc" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          Decay Channels (예상 붕괴 방식):
        </div>
        ${p.decay_modes.map((mode, i) => {
          const expr = `${p.symbol} &rarr; ${mode.channels.join(' + ')}`;
          const br = (mode.branching_ratio * 100).toFixed(2) + '%';
          return `
            <div class="decay-row">
              <span class="decay-expr">${expr}</span>
              <span class="decay-br">${br}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (p.stable) {
    decayHtml = `<div class="decay-list-wrap" style="color: var(--color-success); font-weight: 500; font-size: 0.9rem; text-align: center;">✓ 이 입자는 안정되어 붕괴하지 않습니다.</div>`;
  }

  let quarkContentHtml = '';
  if (p.quark_content) {
    quarkContentHtml = `
      <div class="prop-card" style="grid-column: 1/-1; background: rgba(99, 102, 241, 0.05); border-color: rgba(99,102,241,0.2);">
        <span class="prop-label" style="color: #a5b4fc;">Quark Composition (구성 쿼크)</span>
        <span class="prop-val" style="font-size: 1.15rem; color: #fff;">${p.quark_content.join(' + ')}</span>
      </div>
    `;
  }

  let ckmHtml = '';
  if (p.type === 'quark' && ckmMatrix[p.symbol]) {
    const transitions = ckmMatrix[p.symbol];
    ckmHtml = `
      <div class="decay-list-wrap" style="margin-top: 1rem; border-color: rgba(255, 170, 0, 0.2); background: rgba(255, 170, 0, 0.01);">
        <div class="decay-title" style="color: var(--color-gauge);">
          ⚡ CKM Flavor Transitions (약력 맛깔 전이 확률):
        </div>
        <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: -0.25rem; margin-bottom: 0.5rem;">
          W± 보손 방출 시 타 쿼크로 맛깔이 바뀔 확률(|V_ij|² 가중치)입니다.
        </p>
        ${Object.entries(transitions).map(([target, prob]) => {
          if (target === 'note') return '';
          return `
            <div class="decay-row">
              <span class="decay-expr">${p.symbol} &rarr; ${target} + W</span>
              <span class="ckm-prob-badge">${(prob * 100).toFixed(4)}%</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  details.innerHTML = `
    <div class="details-content" style="--type-color: ${colors.color}; animation: fadeIn 0.3s ease-out;">
      <div class="details-header">
        <div class="details-title-wrap">
          <h2 class="details-name">${p.name}</h2>
          <span class="details-tag">${p.category} | ${p.type.replace('_', ' ')}</span>
        </div>
        <div class="details-badge-symbol" style="border-color: ${colors.color}; box-shadow: 0 0 20px ${colors.color}22;">${p.symbol}</div>
      </div>
      
      <div class="prop-grid">
        ${quarkContentHtml}
        <div class="prop-card">
          <span class="prop-label">Rest Mass</span>
          <span class="prop-val">${p.mass_mev.toLocaleString()} MeV/c²</span>
          ${p.mass_note ? `<span style="font-size:0.7rem; color:var(--color-text-muted); margin-top:0.25rem;">${p.mass_note}</span>` : ''}
        </div>
        <div class="prop-card">
          <span class="prop-label">Electric Charge</span>
          <span class="prop-val">${p.charge > 0 ? '+' : ''}${parseFloat(p.charge.toFixed(3))} e</span>
        </div>
        <div class="prop-card">
          <span class="prop-label">Spin Quantum</span>
          <span class="prop-val">${p.spin} ℏ (${(p.spin % 1.0) === 0.5 ? 'Fermion' : 'Boson'})</span>
        </div>
        <div class="prop-card">
          <span class="prop-label">Baryon Number (B)</span>
          <span class="prop-val">${parseFloat(p.baryon_number.toFixed(3))}</span>
        </div>
        <div class="prop-card">
          <span class="prop-label">Lepton Number (Le)</span>
          <span class="prop-val">L_e: ${p.lepton_number_e} | L_μ: ${p.lepton_number_mu} | L_τ: ${p.lepton_number_tau}</span>
        </div>
        <div class="prop-card">
          <span class="prop-label">Weak Isospin (T3)</span>
          <span class="prop-val">${p.weak_isospin_3 > 0 ? '+' : ''}${p.weak_isospin_3}</span>
        </div>
        <div class="prop-card">
          <span class="prop-label">Weak Hypercharge (Yw)</span>
          <span class="prop-val">${p.weak_hypercharge > 0 ? '+' : ''}${p.weak_hypercharge}</span>
        </div>
        <div class="prop-card">
          <span class="prop-label">Color Charge</span>
          <span class="prop-val" style="text-transform: uppercase;">${p.color_charge}</span>
        </div>
        <div class="prop-card" style="grid-column: 1/-1;">
          <span class="prop-label">Stability / Mean Lifetime</span>
          <span class="prop-val">${formatLifetime(p.lifetime_s)}</span>
        </div>
      </div>
      
      ${decayHtml}
      ${ckmHtml}
    </div>
  `;
}

function addToSimulator(symbol) {
  if (activeSlot === 'reactants') {
    reactants.push(symbol);
  } else {
    products.push(symbol);
  }
  renderSimulatorSlots();
  renderParticleMatrix();
}

function removeFromSimulator(type, index) {
  if (type === 'reactants') {
    reactants.splice(index, 1);
  } else {
    products.splice(index, 1);
  }
  renderSimulatorSlots();
  renderParticleMatrix();
}

function renderSimulatorSlots() {
  const reactSlot = document.getElementById('slot-reactants');
  const prodSlot = document.getElementById('slot-products');
  
  if (reactants.length === 0) {
    reactSlot.innerHTML = '';
    reactSlot.setAttribute('data-placeholder', 'Click particles to add Reactants');
  } else {
    reactSlot.innerHTML = reactants.map((sym, i) => `
      <div class="slot-token" onclick="event.stopPropagation(); removeFromSimulator('reactants', ${i})">
        ${sym} <span>×</span>
      </div>
    `).join('');
    reactSlot.removeAttribute('data-placeholder');
  }

  if (products.length === 0) {
    prodSlot.innerHTML = '';
    prodSlot.setAttribute('data-placeholder', 'Click particles to add Products');
  } else {
    prodSlot.innerHTML = products.map((sym, i) => `
      <div class="slot-token" onclick="event.stopPropagation(); removeFromSimulator('products', ${i})">
        ${sym} <span>×</span>
      </div>
    `).join('');
    prodSlot.removeAttribute('data-placeholder');
  }
  
  if (typeof updateReactionSuggestions === 'function') {
    updateReactionSuggestions();
  }
}

function clearSimulator() {
  reactants = [];
  products = [];
  renderSimulatorSlots();
  renderParticleMatrix();
  document.getElementById('audit-report-container').innerHTML = '';
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  drawEmptyCanvas();
}

function verifyReactionJS(reactList, prodList) {
  const rObjs = reactList.map(sym => particlesBySymbol[sym]);
  const pObjs = prodList.map(sym => particlesBySymbol[sym]);
  
  const sumProp = (list, prop) => list.reduce((sum, obj) => sum + (obj[prop] || 0), 0);
  
  const total_q_in = sumProp(rObjs, 'charge');
  const total_q_out = sumProp(pObjs, 'charge');
  
  const total_b_in = sumProp(rObjs, 'baryon_number');
  const total_b_out = sumProp(pObjs, 'baryon_number');
  
  const total_le_in = sumProp(rObjs, 'lepton_number_e');
  const total_le_out = sumProp(pObjs, 'lepton_number_e');
  
  const total_lmu_in = sumProp(rObjs, 'lepton_number_mu');
  const total_lmu_out = sumProp(pObjs, 'lepton_number_mu');
  
  const total_ltau_in = sumProp(rObjs, 'lepton_number_tau');
  const total_ltau_out = sumProp(pObjs, 'lepton_number_tau');
  
  const total_mag_in = sumProp(rObjs, 'magnetic_charge');
  const total_mag_out = sumProp(pObjs, 'magnetic_charge');
  
  const mass_in = sumProp(rObjs, 'mass_mev');
  const mass_out = sumProp(pObjs, 'mass_mev');
  
  // Calculate fermion counts (spin is half-integer)
  const isFermion = p => (p.spin % 1.0) === 0.5;
  const fermions_in = rObjs.filter(isFermion).length;
  const fermions_out = pObjs.filter(isFermion).length;
  
  const q_ok = Math.abs(total_q_in - total_q_out) < 1e-4;
  const b_ok = Math.abs(total_b_in - total_b_out) < 1e-4;
  const le_ok = Math.abs(total_le_in - total_le_out) < 1e-4;
  const lmu_ok = Math.abs(total_lmu_in - total_lmu_out) < 1e-4;
  const ltau_ok = Math.abs(total_ltau_in - total_ltau_out) < 1e-4;
  const mag_ok = Math.abs(total_mag_in - total_mag_out) < 1e-4;
  const fermion_parity_ok = (fermions_in % 2) === (fermions_out % 2);
  
  const has_colored_outputs = pObjs.some(p => p.color_charge !== 'none');
  const confinement_ok = !has_colored_outputs;
  
  let energy_ok = true;
  let kinematics_note = "Kinematically allowed (허용됨)";
  if (reactList.length === 1) {
    energy_ok = mass_in >= mass_out;
    if (!energy_ok) {
      kinematics_note = `비보존: 모입자 질량 (${mass_in.toFixed(2)} MeV) < 딸입자 합 (${mass_out.toFixed(2)} MeV)`;
    }
  } else {
    kinematics_note = mass_out > mass_in 
      ? `산란 역치: 정지 반응 불가, 최소 ${formatMass(mass_out - mass_in)}의 에너지가 추가로 요구됨`
      : "정지 질량 반응 허용 (충돌 속도가 없어도 자발 반응 가능)";
  }

  const all_ok = q_ok && b_ok && le_ok && lmu_ok && ltau_ok && mag_ok && fermion_parity_ok && energy_ok && confinement_ok;
  
  return {
    is_physically_allowed: all_ok,
    confinement_violated: has_colored_outputs,
    conservations: {
      electric_charge: { conserved: q_ok, in: total_q_in, out: total_q_out },
      baryon_number: { conserved: b_ok, in: total_b_in, out: total_b_out },
      lepton_e: { conserved: le_ok, in: total_le_in, out: total_le_out },
      lepton_mu: { conserved: lmu_ok, in: total_lmu_in, out: total_lmu_out },
      lepton_tau: { conserved: ltau_ok, in: total_ltau_in, out: total_ltau_out },
      magnetic_charge: { conserved: mag_ok, in: total_mag_in, out: total_mag_out },
      fermion_parity: { conserved: fermion_parity_ok, in: fermions_in, out: fermions_out },
      color_confinement: { conserved: confinement_ok, in: rObjs.some(p => p.color_charge !== 'none') ? "Colored" : "White", out: has_colored_outputs ? "Colored Quarks" : "White Hadrons" },
      mass_energy: { conserved: energy_ok, mass_in, mass_out, note: kinematics_note }
    }
  };
}

function findValidCombinations(reactList, maxCount = 5) {
  const commonProducts = particlesData.filter(p => {
    return p.mass_mev <= 200000 && !p.name.includes("Squark") && !p.name.includes("Slepton") && !p.name.includes("GUT") && !p.name.includes("Axion") && !p.name.includes("Monopole");
  });
  
  let results = [];
  
  // 1. 2-body 탐색
  for (let i = 0; i < commonProducts.length; i++) {
    for (let j = i; j < commonProducts.length; j++) {
      let p1 = commonProducts[i].symbol;
      let p2 = commonProducts[j].symbol;
      if (verifyReactionJS(reactList, [p1, p2]).is_physically_allowed) {
        results.push([p1, p2]);
        if (results.length >= maxCount) return results;
      }
    }
  }
  
  // 2. 3-body 탐색
  if (results.length < maxCount) {
    const veryCommon = commonProducts.filter(p => p.mass_mev < 100000); 
    for (let i = 0; i < veryCommon.length; i++) {
      for (let j = i; j < veryCommon.length; j++) {
        for (let k = j; k < veryCommon.length; k++) {
          let p1 = veryCommon[i].symbol;
          let p2 = veryCommon[j].symbol;
          let p3 = veryCommon[k].symbol;
          if (verifyReactionJS(reactList, [p1, p2, p3]).is_physically_allowed) {
            results.push([p1, p2, p3]);
            if (results.length >= maxCount) return results;
          }
        }
      }
    }
  }
  return results;
}

function updateReactionSuggestions() {
  const container = document.getElementById('reaction-suggestions');
  if (!container) return;
  
  if (reactants.length === 0 || reactants.length > 2 || products.length > 0) {
    container.style.display = 'none';
    return;
  }
  
  const combos = findValidCombinations(reactants, 6);
  
  if (combos.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'flex';
  
  let titleHTML = currentLang === 'ko' ? `<div style="font-size:0.8rem; color:var(--color-text-muted); width:100%;">추천 생성물 조합 (클릭하여 적용):</div>` : `<div style="font-size:0.8rem; color:var(--color-text-muted); width:100%;">Suggested Products (Click to apply):</div>`;
  
  let buttonsHTML = combos.map(combo => {
    return `<button class="suggestion-chip" onclick="applySuggestion('${combo.join(',')}')">${combo.join(' + ')}</button>`;
  }).join('');
  
  container.innerHTML = titleHTML + buttonsHTML;
}

window.applySuggestion = function(comboStr) {
  products = comboStr.split(',');
  renderSimulatorSlots();
  runReactionAudit();
};

function predictReactionProducts() {
  if (reactants.length === 0) {
    alert("예측할 반응물(Reactant)을 하나 이상 슬롯에 넣어주세요.");
    return;
  }
  
  const combos = findValidCombinations(reactants, 1);
  if (combos.length > 0) {
    products = combos[0];
    renderSimulatorSlots();
    runReactionAudit();
  } else {
    alert("물리학적 보존 법칙을 만족하는 흔한 생성물 조합을 찾지 못했습니다. 입자가 안정하거나 아주 이례적인 반응이 필요합니다.");
  }
}

function runReactionAudit() {
  if (reactants.length === 0 || products.length === 0) {
    alert("Simulator slots are empty! Please choose at least one Reactant and one Product.");
    return;
  }
  
  const reportContainer = document.getElementById('audit-report-container');
  const result = verifyReactionJS(reactants, products);
  
  let hadronizeBtn = '';
  if (result.confinement_violated) {
    hadronizeBtn = `
      <div style="margin-top: 1rem; padding: 1rem; border-radius: 12px; background: rgba(255, 51, 102, 0.08); border: 1px dashed var(--color-danger); display: flex; flex-direction: column; gap: 0.75rem;">
        <span style="font-size: 0.85rem; color: #fca5a5;">⚠️ <b>색가둠 법칙 경보!</b> 격리된 단일 쿼크는 독립적으로 존재할 수 없습니다. 이들을 강력의 구속을 받는 백색(무색)의 강입자(양성자, 중성자, 파이온 등) 형태로 묶어주어야 합니다.</span>
        <button class="action-btn" id="btn-hadronize" style="background: var(--color-quark); font-size: 0.85rem; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; box-shadow: 0 0 10px rgba(255, 51, 102, 0.2);" onclick="autoHadronize()">
          ⚡ Auto-Hadronize (강입자화 자동 해결)
        </button>
      </div>
    `;
  }

  let auditHtml = `
    <div class="audit-report">
      <div class="audit-verdict ${result.is_physically_allowed ? 'allowed' : 'forbidden'}">
        ${result.is_physically_allowed 
          ? '✓ 반응성 허용: 제반 물리 법칙을 충족하는 정상적인 반응입니다!' 
          : '✗ 반응성 불가: 물리 법칙 위반이 발견되었습니다.'}
      </div>
      <div class="audit-laws-grid">
        ${renderLawRow('전하 보존 (Electric Charge)', result.conservations.electric_charge, 'e')}
        ${renderLawRow('바리온수 보존 (Baryon Number B)', result.conservations.baryon_number, '')}
        ${renderLawRow('렙톤수-전자 맛깔 (Le)', result.conservations.lepton_e, '')}
        ${renderLawRow('렙톤수-뮤온 맛깔 (Lμ)', result.conservations.lepton_mu, '')}
        ${renderLawRow('렙톤수-타우 맛깔 (Lτ)', result.conservations.lepton_tau, '')}
        ${renderLawRow('자기전하 보존 (Magnetic Chg)', result.conservations.magnetic_charge, 'g')}
        ${renderLawRow('페르미온 패리티 (Fermion Parity)', result.conservations.fermion_parity, '')}
        
        <div class="audit-law-row">
          <span class="law-name">강력 색가둠 (Color Confinement)</span>
          <span class="law-math">${result.conservations.color_confinement.in} &rarr; ${result.conservations.color_confinement.out}</span>
          <span class="law-status ${result.conservations.color_confinement.conserved ? 'pass' : 'fail'}">
            ${result.conservations.color_confinement.conserved ? '✓ PASS' : '✗ FAIL'}
          </span>
        </div>

        <div class="audit-law-row" style="flex-direction: column; align-items: flex-start; gap: 0.25rem;">
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span class="law-name">에너지-질량 문턱 (Mass-Energy Threshold)</span>
            <span class="law-status ${result.conservations.mass_energy.conserved ? 'pass' : 'fail'}">
              ${result.conservations.mass_energy.conserved ? '✓ PASS' : '✗ FAIL'}
            </span>
          </div>
          <div class="law-math">
            Reactant mass: ${result.conservations.mass_energy.mass_in.toFixed(3)} MeV &rarr; Product mass: ${result.conservations.mass_energy.mass_out.toFixed(3)} MeV
          </div>
          <div class="mass-energy-note">${result.conservations.mass_energy.note}</div>
        </div>
      </div>
      ${hadronizeBtn}
    </div>
  `;
  
  reportContainer.innerHTML = auditHtml;

  // Trigger bubble chamber visualization!
  animateReactionTracks(result.is_physically_allowed);
}

function autoHadronize() {
  const sortedProds = [...products].sort();
  let mapped = [];
  
  const quarkMap = {
    "anti_d,u": "pi+",
    "anti_u,d": "pi-",
    "anti_u,u": "pi0",
    "anti_d,d": "pi0",
    "d,u,u": "p",
    "anti_d,anti_u,anti_u": "anti_p",
    "d,d,u": "n",
    "anti_d,anti_d,anti_u": "anti_n"
  };

  const key = sortedProds.join(',');
  if (quarkMap[key]) {
    mapped = [quarkMap[key]];
  } else {
    let upCount = products.filter(s => s === 'u').length;
    let downCount = products.filter(s => s === 'd').length;
    let antiUpCount = products.filter(s => s === 'anti_u').length;
    let antiDownCount = products.filter(s => s === 'anti_d').length;
    
    while (upCount >= 2 && downCount >= 1) {
      mapped.push('p');
      upCount -= 2; downCount -= 1;
    }
    while (upCount >= 1 && downCount >= 2) {
      mapped.push('n');
      upCount -= 1; downCount -= 2;
    }
    while (antiUpCount >= 2 && antiDownCount >= 1) {
      mapped.push('anti_p');
      antiUpCount -= 2; antiDownCount -= 1;
    }
    while (antiUpCount >= 1 && antiDownCount >= 2) {
      mapped.push('anti_n');
      antiUpCount -= 1; antiDownCount -= 2;
    }
    while (upCount >= 1 && antiDownCount >= 1) {
      mapped.push('pi+');
      upCount -= 1; antiDownCount -= 1;
    }
    while (downCount >= 1 && antiUpCount >= 1) {
      mapped.push('pi-');
      downCount -= 1; antiUpCount -= 1;
    }
    while (upCount >= 1 && antiUpCount >= 1) {
      mapped.push('pi0');
      upCount -= 1; antiUpCount -= 1;
    }
    while (downCount >= 1 && antiDownCount >= 1) {
      mapped.push('pi0');
      downCount -= 1; antiDownCount -= 1;
    }

    const leftOvers = [
      ...Array(upCount).fill('u'),
      ...Array(downCount).fill('d'),
      ...Array(antiUpCount).fill('anti_u'),
      ...Array(antiDownCount).fill('anti_d')
    ];
    
    products.forEach(sym => {
      if (!['u', 'd', 'anti_u', 'anti_d'].includes(sym)) {
        leftOvers.push(sym);
      }
    });

    mapped = [...mapped, ...leftOvers];
  }
  
  if (mapped.length > 0) {
    products = mapped;
    renderSimulatorSlots();
    renderParticleMatrix();
    runReactionAudit();
  } else {
    alert("자동 강입자화(Auto-Hadronize) 조합을 찾지 못했습니다. 쿼크 결합 상태를 다시 확인해 주세요.");
  }
}

function renderLawRow(label, conservation, unit) {
  const inVal = conservation.in > 0 ? `+${conservation.in.toFixed(2)}` : conservation.in.toFixed(2);
  const outVal = conservation.out > 0 ? `+${conservation.out.toFixed(2)}` : conservation.out.toFixed(2);
  return `
    <div class="audit-law-row">
      <span class="law-name">${label}</span>
      <span class="law-math">${inVal}${unit} &rarr; ${outVal}${unit}</span>
      <span class="law-status ${conservation.conserved ? 'pass' : 'fail'}">
        ${conservation.conserved ? '✓ PASS' : '✗ FAIL'}
      </span>
    </div>
  `;
}

// Visualizer Track Logic with Hadronization and Jets
function animateReactionTracks(isAllowed) {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  tracks = [];
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  const vertexX = w / 2;
  const vertexY = h / 2;

  const involvesColor = [...reactants, ...products].some(sym => {
    const p = particlesBySymbol[sym];
    return p && (p.type === 'quark' || p.symbol === 'g');
  });

  reactants.forEach((sym, idx) => {
    const p = particlesBySymbol[sym];
    const offsetAngle = (idx - (reactants.length - 1) / 2) * 0.4;
    const startX = 0;
    const startY = vertexY + Math.sin(offsetAngle) * (h / 3);
    
    tracks.push({
      symbol: sym,
      type: p.type,
      charge: p.charge,
      mass: p.mass_mev,
      phase: 'reactant',
      path: [],
      startX, startY,
      endX: vertexX, endY: vertexY,
      progress: 0,
      speed: 0.02 + Math.random() * 0.01,
      color: getParticleColors(p.type).color,
      angle: offsetAngle
    });
  });

  bubbleChamberEvents = [];
  window.pushBubbleChamberEvent("Collision event triggered");
  if (isAllowed) {
    window.pushBubbleChamberEvent(`${reactants.join(' + ')} collision successful`);
  } else {
    window.pushBubbleChamberEvent("Conservation law violation alert");
  }

  products.forEach((sym, idx) => {
    const p = particlesBySymbol[sym];
    const offsetAngle = (idx - (products.length - 1) / 2) * 0.5;
    
    let startingMomentum = p.mass_mev === 0 ? 300 : Math.max(80, 800 - p.mass_mev * 0.4); 
    if (p.symbol === 'W+' || p.symbol === 'W-' || p.symbol === 'Z0' || p.symbol === 'H0') {
      startingMomentum = 50 + Math.random() * 50; 
    }
    
    let decayFrame = 300; 
    if (!p.stable) {
      if (p.type === 'gauge_boson' || p.type === 'scalar_boson') {
        decayFrame = 25 + Math.random() * 35; 
      } else {
        decayFrame = 90 + Math.random() * 100; 
      }
    }
    
    tracks.push({
      symbol: sym,
      type: p.type,
      charge: p.charge,
      mass: p.mass_mev,
      phase: 'product',
      path: [],
      startX: vertexX, startY: vertexY,
      currentX: vertexX, currentY: vertexY,
      angle: offsetAngle,
      momentum: startingMomentum,
      maxMomentum: startingMomentum,
      decayFrame: decayFrame,
      decayed: false,
      speed: 0,
      color: getParticleColors(p.type).color,
      life: 0
    });
  });

  let frameCount = 0;
  const maxFrames = 300; 
  
  const stringStretchStart = 50; 
  const stringSnapFrame = 110;
  let sparkParticles = [];

  function animate() {
    frameCount++;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'; 
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.02)';
    ctx.lineWidth = 0.5;
    const gridSize = 25;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const reactantsMet = tracks.filter(t => t.phase === 'reactant').every(t => t.progress >= 0.95);
    
    tracks.forEach(track => {
      if (track.phase === 'reactant') {
        if (track.progress < 1) {
          track.progress += track.speed;
          if (track.progress > 1) track.progress = 1;
        }
        
        const curX = track.startX + (track.endX - track.startX) * track.progress;
        const wave = Math.sin(track.progress * Math.PI * 6) * (track.charge === 0 ? 0 : 4);
        const curY = track.startY + (track.endY - track.startY) * track.progress + wave;
        
        track.path.push({x: curX, y: curY});
        if (track.path.length > 300) track.path.shift();
      }
    });

    let showProducts = true;
    
    if (involvesColor && reactantsMet) {
      if (frameCount < stringSnapFrame) {
        showProducts = false;
        
        const stretchDist = (frameCount - stringStretchStart) * 1.2;
        if (stretchDist > 0) {
          const leftX = vertexX - stretchDist;
          const rightX = vertexX + stretchDist;
          
          ctx.fillStyle = '#ff3366'; 
          ctx.beginPath(); ctx.arc(leftX, vertexY, 4, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#00f0ff'; 
          ctx.beginPath(); ctx.arc(rightX, vertexY, 4, 0, Math.PI*2); ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(leftX, vertexY);
          
          const segments = 25;
          const tension = Math.min(10, (frameCount - stringStretchStart) * 0.15);
          for (let i = 0; i <= segments; i++) {
            const segX = leftX + (rightX - leftX) * (i / segments);
            const waveY = vertexY + Math.sin(i * 0.8 + frameCount * 0.6) * tension;
            ctx.lineTo(segX, waveY);
          }
          
          ctx.shadowBlur = 10;
          if (frameCount < stringSnapFrame - 25) {
            ctx.strokeStyle = '#ec4899'; 
            ctx.shadowColor = '#ec4899';
            ctx.lineWidth = 3;
          } else {
            const r = Math.sin(frameCount * 0.9) > 0;
            ctx.strokeStyle = r ? '#f97316' : '#ef4444'; 
            ctx.shadowColor = '#ef4444';
            ctx.lineWidth = 4.5;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; 
          
          ctx.fillStyle = '#9ca3af';
          ctx.font = '8px Space Grotesk';
          ctx.fillText('colored q', leftX - 15, vertexY - 10);
          ctx.fillText('colored anti-q', rightX - 25, vertexY - 10);
        }
      } else if (frameCount === stringSnapFrame) {
        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 1.5 + Math.random() * 3;
          sparkParticles.push({
            x: vertexX,
            y: vertexY,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 60 + Math.random() * 30,
            maxLife: 60 + Math.random() * 30,
            color: Math.random() > 0.5 ? '#ff3366' : '#00ffaa'
          });
        }
      }
    }

    if (reactantsMet && showProducts) {
      tracks.forEach(track => {
        if (track.phase === 'product') {
          if (track.decayed) return;
          
          track.life += 1;
          
          // 1. Relativistic mechanics (Lorentz + Bethe-Bloch + Synchrotron loss)
          const q = Math.abs(track.charge);
          if (q > 0) {
            const beta = Math.min(0.99, track.momentum / Math.sqrt(track.momentum * track.momentum + track.mass * track.mass + 1e-5));
            const ionizationLoss = 0.5 * (q * q) / (beta * beta);
            const massFactor = track.mass === 0 ? 0.5 : Math.max(0.5, track.mass);
            const synchrotronLoss = 0.00003 * (q * q) * (track.momentum * track.momentum) / (massFactor * massFactor);
            
            track.momentum = Math.max(1, track.momentum - (ionizationLoss + synchrotronLoss) * 0.4);
          }
          
          const B = 2.8; 
          const dTheta = (track.charge * B) / Math.max(0.5, track.momentum);
          track.angle += dTheta;
          
          const beta = track.mass === 0 ? 1.0 : (track.momentum / Math.sqrt(track.momentum * track.momentum + track.mass * track.mass));
          track.speed = beta * 2.8;
          
          let curX = track.currentX + Math.cos(track.angle) * track.speed;
          let curY = track.currentY + Math.sin(track.angle) * track.speed;
          
          if (track.charge === 0 && (track.type === 'gauge_boson' || track.type === 'scalar_boson')) {
            const wiggle = Math.sin(track.life * 0.5) * 2;
            curX += Math.cos(track.angle + Math.PI/2) * wiggle;
            curY += Math.sin(track.angle + Math.PI/2) * wiggle;
          }
          
          track.currentX = curX;
          track.currentY = curY;
          track.path.push({x: curX, y: curY});
          if (track.path.length > 300) track.path.shift();
          
          // 2. In-Flight Decay Cascade Trigger
          if (track.life >= track.decayFrame) {
            track.decayed = true;
            const pData = particlesBySymbol[track.symbol];
            if (pData && pData.decay_modes && pData.decay_modes.length > 0) {
              const channel = pData.decay_modes[Math.floor(Math.random() * pData.decay_modes.length)].channels;
              
              channel.forEach((prodSym, idx) => {
                const prodPart = particlesBySymbol[prodSym];
                if (prodPart) {
                  const outAngle = track.angle + (idx - (channel.length - 1) / 2) * 0.6 + (Math.random() - 0.5) * 0.15;
                  const prodMomentum = track.momentum / channel.length + (Math.random() - 0.5) * 10;
                  
                  tracks.push({
                    symbol: prodSym,
                    type: prodPart.type,
                    charge: prodPart.charge,
                    mass: prodPart.mass_mev,
                    phase: 'product',
                    path: [],
                    startX: curX, startY: curY,
                    currentX: curX, currentY: curY,
                    angle: outAngle,
                    momentum: Math.max(5, prodMomentum),
                    maxMomentum: Math.max(5, prodMomentum),
                    decayFrame: 300, 
                    decayed: false,
                    speed: 0,
                    color: getParticleColors(prodPart.type).color,
                    life: 0
                  });
                }
              });
              
              if (window.pushBubbleChamberEvent) {
                window.pushBubbleChamberEvent(`${track.symbol} decayed -> [${channel.join(', ')}]`);
              }
            }
          }
          
          // 3. Spontaneous Delta Ray Spawning (0.35% chance per frame for fast charged particles)
          if (Math.abs(track.charge) > 0 && track.momentum > 80 && Math.random() < 0.0035 && !track.isDeltaRay) {
            const sideAngle = track.angle + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2) + (Math.random() - 0.5) * 0.3;
            tracks.push({
              symbol: 'e-',
              type: 'lepton',
              charge: -1,
              mass: 0.511,
              phase: 'product',
              path: [],
              startX: curX, startY: curY,
              currentX: curX, currentY: curY,
              angle: sideAngle,
              momentum: 15 + Math.random() * 15, 
              maxMomentum: 30,
              decayFrame: 300,
              decayed: false,
              isDeltaRay: true,
              speed: 0,
              color: '#00f0ff',
              life: 0
            });
            
            if (window.pushBubbleChamberEvent) {
              window.pushBubbleChamberEvent("Spontaneous δ-ray emitted");
            }
          }
        }
      });
      
      if (involvesColor && isAllowed && frameCount > stringSnapFrame && frameCount % 3 === 0 && frameCount < stringSnapFrame + 60) {
        const jetAngle = (Math.random() - 0.5) * 0.8;
        const jColor = 'rgba(156, 163, 175, 0.2)';
        tracks.push({
          symbol: '',
          type: 'jet_track',
          charge: 0,
          mass: 0,
          phase: 'jet',
          path: [],
          startX: vertexX, startY: vertexY,
          currentX: vertexX, currentY: vertexY,
          angle: jetAngle,
          speed: 0.03 + Math.random() * 0.02,
          progress: 0,
          color: jColor,
          life: 0
        });
      }
      
      tracks.forEach(track => {
        if (track.phase === 'jet') {
          track.progress += track.speed;
          track.life += 1;
          const r = track.life * 2.5;
          const curX = vertexX + Math.cos(track.angle) * r;
          const curY = vertexY + Math.sin(track.angle) * r;
          track.path.push({x: curX, y: curY});
          if (track.path.length > 150) track.path.shift();
        }
      });
    }

    tracks.forEach(track => {
      if (track.path.length > 1) {
        const len = track.path.length;
        for (let i = 1; i < len; i++) {
          ctx.beginPath();
          ctx.moveTo(track.path[i-1].x, track.path[i-1].y);
          ctx.lineTo(track.path[i].x, track.path[i].y);
          
          const ratio = i / len;
          let alpha = ratio * 0.85 + 0.15;
          if (track.charge === 0 && track.symbol && track.type !== 'gauge_boson') {
            alpha = ratio * 0.08 + 0.02; 
          }
          ctx.strokeStyle = hexToRgba(track.color, alpha);
          
          if (track.type === 'jet_track') {
            ctx.lineWidth = 0.5 * ratio;
            ctx.strokeStyle = `rgba(156, 163, 175, ${0.4 * ratio})`;
            ctx.setLineDash([2, 4]);
          } else {
            const baseWidth = track.mass === 0 ? 1.2 : Math.min(4, 1.5 + Math.log10(track.mass + 1) * 0.5);
            ctx.lineWidth = baseWidth * (0.3 + 0.7 * ratio);
            if (track.charge === 0 && track.type !== 'gauge_boson') {
              ctx.setLineDash([4, 4]);
            } else {
              ctx.setLineDash([]);
            }
          }
          ctx.stroke();
        }
        
        if (track.type !== 'jet_track' && track.symbol && track.path.length > 0 && (track.phase === 'reactant' || showProducts)) {
          const head = track.path[track.path.length - 1];
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '9px Space Grotesk';
          ctx.fillText(track.symbol, head.x + 5, head.y - 5);
        }
      }
    });

    ctx.setLineDash([]);

    sparkParticles.forEach((spk, idx) => {
      spk.x += spk.vx;
      spk.y += spk.vy;
      spk.life--;
      
      const ratio = spk.life / spk.maxLife;
      ctx.fillStyle = spk.color;
      ctx.beginPath();
      ctx.arc(spk.x, spk.y, 2 * ratio, 0, Math.PI*2);
      ctx.fill();
      
      if (spk.life <= 0) {
        sparkParticles.splice(idx, 1);
      }
    });

    if (reactantsMet) {
      if (frameCount < 100) {
        const radius = (100 - frameCount) * 0.5;
        const gradient = ctx.createRadialGradient(vertexX, vertexY, 0, vertexX, vertexY, Math.max(1, radius));
        
        if (isAllowed) {
          gradient.addColorStop(0, '#fff');
          gradient.addColorStop(0.2, '#00f0ff');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath(); ctx.arc(vertexX, vertexY, Math.max(1, radius), 0, Math.PI * 2); ctx.fill();
        } else {
          gradient.addColorStop(0, '#fff');
          gradient.addColorStop(0.3, '#ff3366');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath(); ctx.arc(vertexX, vertexY, Math.max(1, radius), 0, Math.PI * 2); ctx.fill();
          
          ctx.fillStyle = '#ff3366';
          ctx.font = 'bold 11px Space Grotesk';
          ctx.fillText('⚡ PHYS LAW VIOLATION', vertexX - 58, vertexY - 15);
        }
      }
      
      if (involvesColor && isAllowed && frameCount >= stringSnapFrame && frameCount < stringSnapFrame + 30) {
        const snapRadius = (30 - (frameCount - stringSnapFrame)) * 1.5;
        const grad = ctx.createRadialGradient(vertexX, vertexY, 0, vertexX, vertexY, Math.max(1, snapRadius));
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#ff007f');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(vertexX, vertexY, Math.max(1, snapRadius), 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = '#ff007f';
        ctx.font = 'bold 11px Space Grotesk';
        ctx.fillText('💥 HADRONIZATION (강입자화) SNAP!', vertexX - 85, vertexY - 20);
      }
    }

    // Render Futuristic Live HUD
    renderLiveHUD(w, h, isAllowed);

    if (frameCount < maxFrames) {
      animationId = requestAnimationFrame(animate);
    } else {
      animationId = null;
    }
  }

  animate();
}

// ----------------------------------------------------
// HADRON BUILDER INTERACTIVE LOGIC (Theoretical synthesis)
// ----------------------------------------------------

function switchRightTab(tab) {
  rightPanelTab = tab;
  
  const collisionBtn = document.getElementById('btn-tab-collision');
  const builderBtn = document.getElementById('btn-tab-builder');
  const neutrinoBtn = document.getElementById('btn-tab-neutrino');
  const cascadeBtn = document.getElementById('btn-tab-cascade');
  const angularBtn = document.getElementById('btn-tab-angular');
  const colliderLabBtn = document.getElementById('btn-tab-collider-lab');
  const higgsSsbBtn = document.getElementById('btn-tab-higgs-ssb');
  const susyBtn = document.getElementById('btn-tab-susy');
  const gutBtn = document.getElementById('btn-tab-gut');
  const ckmBtn = document.getElementById('btn-tab-ckm');
  const rgeBtn = document.getElementById('btn-tab-rge');
  const qcdBtn = document.getElementById('btn-tab-qcd');
  const feynmanBtn = document.getElementById('btn-tab-feynman');
  const cosmologyBtn = document.getElementById('btn-tab-cosmology');
  const nuOscBtn = document.getElementById('btn-tab-neutrino-osc');
  const sphaleronBtn = document.getElementById('btn-tab-sphaleron');
  const axionBtn = document.getElementById('btn-tab-axion');
  
  const collisionContent = document.getElementById('tab-collision');
  const builderContent = document.getElementById('tab-builder');
  const neutrinoContent = document.getElementById('tab-neutrino');
  const cascadeContent = document.getElementById('tab-cascade');
  const angularContent = document.getElementById('tab-angular');
  const colliderLabContent = document.getElementById('tab-collider-lab');
  const higgsSsbContent = document.getElementById('tab-higgs-ssb');
  const susyContent = document.getElementById('tab-susy');
  const gutContent = document.getElementById('tab-gut');
  const ckmContent = document.getElementById('tab-ckm');
  const rgeContent = document.getElementById('tab-rge');
  const qcdContent = document.getElementById('tab-qcd');
  const feynmanContent = document.getElementById('tab-feynman');
  const cosmologyContent = document.getElementById('tab-cosmology');
  const nuOscContent = document.getElementById('tab-neutrino-osc');
  const sphaleronContent = document.getElementById('tab-sphaleron');
  const axionContent = document.getElementById('tab-axion');
  
  // Reset tab button statuses
  [collisionBtn, builderBtn, neutrinoBtn, cascadeBtn, angularBtn, colliderLabBtn, higgsSsbBtn, susyBtn, gutBtn, ckmBtn, rgeBtn, qcdBtn, feynmanBtn, cosmologyBtn, nuOscBtn, sphaleronBtn, axionBtn].forEach(b => {
    if (b) b.classList.remove('active');
  });
  
  // Reset tab contents
  [collisionContent, builderContent, neutrinoContent, cascadeContent, angularContent, colliderLabContent, higgsSsbContent, susyContent, gutContent, ckmContent, rgeContent, qcdContent, feynmanContent, cosmologyContent, nuOscContent, sphaleronContent, axionContent].forEach(c => {
    if (c) c.classList.remove('active');
  });
  
  // Stop ongoing 3D polarization loop if switching away from angular
  if (tab !== 'angular' && ang3DAnimationId) {
    cancelAnimationFrame(ang3DAnimationId);
    ang3DAnimationId = null;
  }
  
  // Stop ongoing collider resonance loops
  if (tab !== 'collider-lab' && colliderLoopId) {
    cancelAnimationFrame(colliderLoopId);
    colliderLoopId = null;
  }

  // Stop ongoing higgs loops
  if (tab !== 'higgs-ssb' && higgsLoopId) {
    cancelAnimationFrame(higgsLoopId);
    higgsLoopId = null;
  }

  // Stop ongoing susy loops
  if (tab !== 'susy' && susyLoopId) {
    cancelAnimationFrame(susyLoopId);
    susyLoopId = null;
  }

  // Stop ongoing gut loops
  if (tab !== 'gut' && gutLoopId) {
    cancelAnimationFrame(gutLoopId);
    gutLoopId = null;
  }

  // Stop ongoing ckm loops
  if (tab !== 'ckm' && ckmLoopId) {
    cancelAnimationFrame(ckmLoopId);
    ckmLoopId = null;
  }

  // Stop ongoing rge loops
  if (tab !== 'rge' && rgeLoopId) {
    cancelAnimationFrame(rgeLoopId);
    rgeLoopId = null;
  }
  
  // Stop ongoing qcd loops
  if (tab !== 'qcd' && qcdLoopId) {
    cancelAnimationFrame(qcdLoopId);
    qcdLoopId = null;
  }
  
  // Stop ongoing feynman loops
  if (tab !== 'feynman' && feynmanLoopId) {
    cancelAnimationFrame(feynmanLoopId);
    feynmanLoopId = null;
  }
  
  // Stop ongoing cosmology loops
  if (tab !== 'cosmology' && cosmoLoopId) {
    cancelAnimationFrame(cosmoLoopId);
    cosmoLoopId = null;
  }
  
  // Stop ongoing neutrino oscillation loops
  if (tab !== 'neutrino-osc' && nuOscLoopId) {
    cancelAnimationFrame(nuOscLoopId);
    nuOscLoopId = null;
  }
  
  // Stop ongoing sphaleron loops
  if (tab !== 'sphaleron' && sphalLoopId) {
    cancelAnimationFrame(sphalLoopId);
    sphalLoopId = null;
  }
  
  // Stop ongoing axion loops
  if (tab !== 'axion' && axionLoopId) {
    cancelAnimationFrame(axionLoopId);
    axionLoopId = null;
  }
  
  if (tab === 'collision') {
    collisionBtn.classList.add('active');
    collisionContent.classList.add('active');
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    drawEmptyCanvas();
  } else if (tab === 'builder') {
    builderBtn.classList.add('active');
    builderContent.classList.add('active');
    renderBuilderSlots();
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    drawEmptyCanvas();
    updateHadronBuilderMultiplet();
  } else if (tab === 'neutrino') {
    neutrinoBtn.classList.add('active');
    neutrinoContent.classList.add('active');
    updateNeutrinoOscillation(); 
  } else if (tab === 'cascade') {
    cascadeBtn.classList.add('active');
    cascadeContent.classList.add('active');
    initDecayCascadeSelector();
    runDecayCascade(); 
  } else if (tab === 'angular') {
    angularBtn.classList.add('active');
    angularContent.classList.add('active');
    selectAngularBoson(selectedAngularBoson); 
  } else if (tab === 'collider-lab') {
    colliderLabBtn.classList.add('active');
    colliderLabContent.classList.add('active');
    selectColliderTarget(selectedColliderTargetSymbol);
  } else if (tab === 'higgs-ssb') {
    if (higgsSsbBtn) higgsSsbBtn.classList.add('active');
    if (higgsSsbContent) higgsSsbContent.classList.add('active');
    initHiggsSSBLab();
  } else if (tab === 'susy') {
    if (susyBtn) susyBtn.classList.add('active');
    if (susyContent) susyContent.classList.add('active');
    initSUSYLab();
  } else if (tab === 'gut') {
    if (gutBtn) gutBtn.classList.add('active');
    if (gutContent) gutContent.classList.add('active');
    initGUTLab();
  } else if (tab === 'ckm') {
    if (ckmBtn) ckmBtn.classList.add('active');
    if (ckmContent) ckmContent.classList.add('active');
    initCKMLab();
  } else if (tab === 'rge') {
    if (rgeBtn) rgeBtn.classList.add('active');
    if (rgeContent) rgeContent.classList.add('active');
    initRGELab();
  } else if (tab === 'qcd') {
    if (qcdBtn) qcdBtn.classList.add('active');
    if (qcdContent) qcdContent.classList.add('active');
    initQCDLab();
  } else if (tab === 'feynman') {
    if (feynmanBtn) feynmanBtn.classList.add('active');
    if (feynmanContent) feynmanContent.classList.add('active');
    initFeynmanLab();
  } else if (tab === 'cosmology') {
    if (cosmologyBtn) cosmologyBtn.classList.add('active');
    if (cosmologyContent) cosmologyContent.classList.add('active');
    initCosmologyLab();
  } else if (tab === 'neutrino-osc') {
    if (nuOscBtn) nuOscBtn.classList.add('active');
    if (nuOscContent) nuOscContent.classList.add('active');
    initNeutrinoOscLab();
  } else if (tab === 'sphaleron') {
    if (sphaleronBtn) sphaleronBtn.classList.add('active');
    if (sphaleronContent) sphaleronContent.classList.add('active');
    initSphaleronLab();
  } else if (tab === 'axion') {
    if (axionBtn) axionBtn.classList.add('active');
    if (axionContent) axionContent.classList.add('active');
    initAxionLab();
  }
}

function selectBuilderSlot(idx) {
  selectedSlotIdx = idx;
  
  for (let i = 0; i < 3; i++) {
    const slotEl = document.getElementById(`quark-slot-${i}`);
    if (i === idx) {
      slotEl.style.borderColor = '#6366f1';
      slotEl.style.background = 'rgba(99, 102, 241, 0.07)';
      slotEl.classList.add('selected');
    } else {
      slotEl.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      slotEl.style.background = 'rgba(255, 255, 255, 0.01)';
      slotEl.classList.remove('selected');
    }
  }
  
  updateColorButtons();
}

function addQuarkToBuilder(symbol) {
  builderSlots[selectedSlotIdx] = symbol;
  
  if (!builderColors[selectedSlotIdx]) {
    const isAnti = symbol.startsWith('anti_');
    if (selectedSlotIdx === 0) builderColors[selectedSlotIdx] = isAnti ? 'anti_red' : 'red';
    else if (selectedSlotIdx === 1) builderColors[selectedSlotIdx] = isAnti ? 'anti_green' : 'green';
    else builderColors[selectedSlotIdx] = isAnti ? 'anti_blue' : 'blue';
  }
  
  renderBuilderSlots();
  updateColorButtons();
  updateHadronBuilderMultiplet();
  
  if (selectedSlotIdx < 2) {
    selectBuilderSlot(selectedSlotIdx + 1);
  }
}

function assignColorToSlot(color) {
  if (!builderSlots[selectedSlotIdx]) {
    alert("먼저 해당 슬롯에 입자 격자판의 쿼크를 클릭하여 배치해 주세요!");
    return;
  }
  
  builderColors[selectedSlotIdx] = color;
  renderBuilderSlots();
  updateColorButtons();
}

function renderBuilderSlots() {
  for (let i = 0; i < 3; i++) {
    const sym = builderSlots[i];
    const color = builderColors[i];
    
    const slotEl = document.getElementById(`quark-slot-${i}`);
    const symbolEl = slotEl.querySelector('.slot-quark-symbol');
    const dotEl = document.getElementById(`color-dot-${i}`);
    
    slotEl.classList.remove('red-charge', 'green-charge', 'blue-charge', 'anti-red-charge', 'anti-green-charge');
    dotEl.className = 'color-dot-indicator';
    
    if (sym) {
      symbolEl.textContent = sym.replace('anti_', 'anti-');
      
      if (color) {
        dotEl.classList.add(color);
        if (color === 'red') slotEl.classList.add('red-charge');
        else if (color === 'green') slotEl.classList.add('green-charge');
        else if (color === 'blue') slotEl.classList.add('blue-charge');
        else if (color === 'anti_red') slotEl.classList.add('anti-red-charge');
        else if (color === 'anti_green') slotEl.classList.add('anti-green-charge');
      }
    } else {
      symbolEl.textContent = '?';
    }
  }
}

function updateColorButtons() {
  const color = builderColors[selectedSlotIdx];
  
  const btns = ['red', 'green', 'blue', 'anti_red', 'anti_green', 'anti_blue'];
  btns.forEach(c => {
    const btn = document.getElementById(`btn-pick-${c}`);
    if (btn) btn.className = `color-pick-btn pick-${c.replace('anti_', '')}`;
  });
  
  if (color) {
    const activeBtn = document.getElementById(`btn-pick-${color}`);
    if (activeBtn) activeBtn.classList.add(`active-${color.replace('anti_', '')}`);
  }
}

function clearHadronBuilder() {
  builderSlots = [null, null, null];
  builderColors = [null, null, null];
  renderBuilderSlots();
  selectBuilderSlot(0);
  document.getElementById('hadron-synthesis-report').innerHTML = '';
  updateHadronBuilderMultiplet();
}

function synthesizeHadron() {
  const filledSlots = builderSlots.filter(s => s !== null);
  if (filledSlots.length < 2) {
    alert("강입자를 조립하려면 최소 2개 이상의 쿼크 슬롯을 채워야 합니다! (중간자는 2개, 바리온은 3개)");
    return;
  }
  
  const reportContainer = document.getElementById('hadron-synthesis-report');
  
  const qObjs = builderSlots.map((sym, idx) => {
    if (!sym) return null;
    const p = particlesBySymbol[sym];
    return {
      symbol: sym,
      charge: p.charge,
      baryon: p.baryon_number,
      mass: p.mass_mev,
      isAnti: p.is_antiparticle,
      color: builderColors[idx]
    };
  }).filter(o => o !== null);
  
  const total_q = qObjs.reduce((sum, o) => sum + o.charge, 0);
  const total_b = qObjs.reduce((sum, o) => sum + o.baryon, 0);
  
  let color_confinement_passed = false;
  let color_notes = "색 미보존: 색전하 합이 흰색(White)이 되지 않습니다.";
  
  if (qObjs.length === 2) {
    const [q1, q2] = qObjs;
    const hasAntiparticlePair = (q1.isAnti && !q2.isAnti) || (!q1.isAnti && q2.isAnti);
    
    if (hasAntiparticlePair) {
      const colors = [q1.color, q2.color];
      const redAntiRed = colors.includes('red') && colors.includes('anti_red');
      const greenAntiGreen = colors.includes('green') && colors.includes('anti_green');
      const blueAntiBlue = colors.includes('blue') && colors.includes('anti_blue');
      
      if (redAntiRed || greenAntiGreen || blueAntiBlue || (q1.color && q1.color.startsWith('anti') && q2.color && !q2.color.startsWith('anti') && q1.color.replace('anti_', '') === q2.color)) {
        color_confinement_passed = true;
        color_notes = "중간자 색상 평형 달성: Color + Anti-Color 소멸 및 무색 상태 충족";
      } else {
        color_notes = `색가둠 위배: 중간자 조립을 위해서는 짝을 이루는 색상과 보색(예: Red + Anti-Red)을 할당해야 합니다.`;
      }
    } else {
      color_notes = "강력 법칙 위배: 중간자(Meson)는 쿼크와 반쿼크 조합으로만 형성될 수 있습니다.";
    }
  } else if (qObjs.length === 3) {
    const isAllQuarks = qObjs.every(o => !o.isAnti);
    const isAllAntiquarks = qObjs.every(o => o.isAnti);
    
    if (isAllQuarks || isAllAntiquarks) {
      const colors = qObjs.map(o => o.color);
      const hasRed = colors.includes('red') || colors.includes('anti_red');
      const hasGreen = colors.includes('green') || colors.includes('anti_green');
      const hasBlue = colors.includes('blue') || colors.includes('anti_blue');
      
      const isUnique = new Set(colors).size === 3;
      
      if (hasRed && hasGreen && hasBlue && isUnique) {
        color_confinement_passed = true;
        color_notes = isAllQuarks
          ? "바리온 색상 평형 달성: Red + Green + Blue 삼원색의 결합으로 무색 상태 충족"
          : "반바리온 색상 평형 달성: Anti-Red + Anti-Green + Anti-Blue 삼보색 결합으로 무색 상태 충족";
      } else {
        color_notes = "색가둠 위배: 바리온 조립을 위해서는 세 슬롯에 고르게 R, G, B 삼원색(또는 보색)을 할당해야 합니다.";
      }
    } else {
      color_notes = "강력 법칙 위배: 바리온(Baryon)은 3개의 쿼크 또는 3개의 반쿼크로만 형성될 수 있습니다.";
    }
  }
  
  let possible_spins = "";
  if (qObjs.length === 2) possible_spins = "0 ℏ (Pseudoscalar) 또는 1 ℏ (Vector Meson)";
  else if (qObjs.length === 3) possible_spins = "1/2 ℏ (Octet Baryon) 또는 3/2 ℏ (Decuplet Baryon)";
  
  const quarkMassesSum = qObjs.reduce((sum, o) => sum + o.mass, 0);
  const bindingEnergy = qObjs.length === 2 ? 140 : 310;
  const estimatedMass = quarkMassesSum + bindingEnergy;
  
  let matchName = "이종 가상 강입자 (Exotic Hadron)";
  let matchSymbol = "X";
  let isKnown = false;
  
  const searchQuarks = qObjs.map(o => o.symbol).sort().join(',');
  
  particlesData.forEach(p => {
    if (p.quark_content) {
      const pQuarks = [...p.quark_content].sort().join(',');
      if (pQuarks === searchQuarks) {
        matchName = p.name;
        matchSymbol = p.symbol;
        isKnown = true;
      }
    }
  });

  if (!isKnown) {
    const qCount = {};
    qObjs.forEach(o => {
      qCount[o.symbol] = (qCount[o.symbol] || 0) + 1;
    });
    const subNames = Object.entries(qCount).map(([sym, count]) => `${sym.replace('anti_', 'anti-')}${count > 1 ? count : ''}`);
    
    if (qObjs.length === 2) {
      matchName = `임시 중간자 [${subNames.join('')}]`;
      matchSymbol = `M(${subNames.join('')})`;
    } else {
      matchName = `임시 바리온 [${subNames.join('')}]`;
      matchSymbol = `B(${subNames.join('')})`;
    }
  }

  const allowed = color_confinement_passed;
  
  let reportHtml = `
    <div class="hologram-synthesis" style="border-color: ${allowed ? 'var(--color-success)' : 'var(--color-danger)'}; box-shadow: 0 0 25px ${allowed ? 'rgba(0, 255, 170, 0.08)' : 'rgba(255, 51, 102, 0.08)'};">
      <div class="hologram-success-header" style="border-color: ${allowed ? 'rgba(0, 255, 170, 0.2)' : 'rgba(255, 51, 102, 0.2)'};">
        <span class="hologram-success-title" style="color: ${allowed ? 'var(--color-success)' : 'var(--color-danger)'}; text-shadow: 0 0 10px ${allowed ? 'rgba(0, 255, 170, 0.3)' : 'rgba(255, 51, 102, 0.3)'};">
          ${allowed ? '✓ SYNTHESIS SUCCESS (합성 성공)' : '✗ SYNTHESIS FORBIDDEN (합성 불가)'}
        </span>
        <span class="hologram-success-badge" style="color: ${allowed ? 'var(--color-success)' : 'var(--color-danger)'}; border-color: ${allowed ? 'rgba(0, 255, 170, 0.2)' : 'rgba(255, 51, 102, 0.2)'};">
          ${qObjs.length === 2 ? 'Meson 중간자' : 'Baryon 강입자'}
        </span>
      </div>
      
      <div class="audit-laws-grid">
        <div class="audit-law-row">
          <span class="law-name">합성 입자 명칭</span>
          <span class="law-math" style="color: #fff; font-weight: 700;">${matchName} [ ${matchSymbol} ]</span>
          <span class="law-status ${isKnown ? 'pass' : 'fail'}" style="font-size:0.75rem;">
            ${isKnown ? 'Registered' : 'Hypothetical'}
          </span>
        </div>
        <div class="audit-law-row">
          <span class="law-name">합산 전기 전하 (Charge Q)</span>
          <span class="law-math" style="color: #fff;">${total_q > 0 ? '+' : ''}${total_q.toFixed(3)} e</span>
          <span class="law-status ${Number.isInteger(Math.round(total_q * 3) / 3) ? 'pass' : 'fail'}">
            [OK]
          </span>
        </div>
        <div class="audit-law-row">
          <span class="law-name">합산 바리온 수 (Baryon B)</span>
          <span class="law-math" style="color: #fff;">${total_b > 0 ? '+' : ''}${total_b.toFixed(3)}</span>
          <span class="law-status pass">[OK]</span>
        </div>
        <div class="audit-law-row" style="flex-direction: column; align-items: flex-start; gap: 0.25rem;">
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span class="law-name">양자 스핀 결합 (Angular Spin Coupling)</span>
            <span class="law-status pass" style="color: #a5b4fc;">ℏ</span>
          </div>
          <div class="law-math" style="font-size: 0.8rem; margin-top: 0.15rem;">
            ${possible_spins}
          </div>
        </div>
        <div class="audit-law-row" style="flex-direction: column; align-items: flex-start; gap: 0.25rem;">
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span class="law-name">질량 예측 연산 (Mass Estimation)</span>
            <span class="law-status pass" style="color: var(--color-gauge);">Estimated</span>
          </div>
          <div class="law-math" style="font-size: 0.8rem; margin-top: 0.15rem; color: #f3f4f6;">
            Quarks Rest Mass (${quarkMassesSum.toFixed(2)} MeV) + QCD Binding Energy (~${bindingEnergy} MeV) 
            <br>
            <b style="color: #fff; font-size:0.9rem;">&approx; ${estimatedMass.toFixed(2)} MeV/c²</b>
          </div>
        </div>
        <div class="audit-law-row" style="flex-direction: column; align-items: flex-start; gap: 0.25rem;">
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span class="law-name">강력 색가둠 오디트 (QCD Color Confinement)</span>
            <span class="law-status ${allowed ? 'pass' : 'fail'}">
              ${allowed ? '✓ 무색 충족' : '✗ 결함 상태'}
            </span>
          </div>
          <div class="mass-energy-note" style="color: ${allowed ? 'var(--color-text-muted)' : '#fca5a5'}; width:100%;">
            ${color_notes}
          </div>
        </div>
      </div>
    </div>
  `;
  
  reportContainer.innerHTML = reportHtml;

  if (allowed) {
    animateHadronBuilderSynthesis(qObjs);
    const stats = calculateSU3FlavorNumbers(builderSlots.filter(s => s !== null));
    updateHadronBuilderMultiplet(stats.I3, stats.Y, matchSymbol);
  } else {
    updateHadronBuilderMultiplet();
  }
}

function animateHadronBuilderSynthesis(qObjs) {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  tracks = [];
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  const vertexX = w / 2;
  const vertexY = h / 2;

  qObjs.forEach((q, idx) => {
    const angle = (idx * Math.PI * 2) / qObjs.length - Math.PI / 2;
    const startX = vertexX + Math.cos(angle) * (w / 3);
    const startY = vertexY + Math.sin(angle) * (h / 3);
    
    let trackColor = '#ff3366';
    if (q.color === 'green') trackColor = '#00ffaa';
    else if (q.color === 'blue') trackColor = '#00f0ff';
    else if (q.color === 'anti_red') trackColor = '#ffaa00';
    else if (q.color === 'anti_green') trackColor = '#d400ff';
    
    tracks.push({
      symbol: q.symbol,
      type: 'quark',
      charge: q.charge,
      mass: q.mass,
      phase: 'reactant',
      path: [],
      startX, startY,
      endX: vertexX, endY: vertexY,
      progress: 0,
      speed: 0.015,
      color: trackColor,
      angle
    });
  });

  let frameCount = 0;
  const maxFrames = 200;

  function animate() {
    frameCount++;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.02)';
    ctx.lineWidth = 0.5;
    const gridSize = 25;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    let merged = true;
    
    tracks.forEach(track => {
      if (track.progress < 1) {
        track.progress += track.speed;
        if (track.progress > 1) track.progress = 1;
        merged = false;
      }
      
      const curX = track.startX + (track.endX - track.startX) * track.progress;
      const wiggle = Math.sin(track.progress * Math.PI * 6) * 5;
      const curY = track.startY + (track.endY - track.startY) * track.progress + wiggle;
      
      track.path.push({x: curX, y: curY});
      if (track.path.length > 25) track.path.shift();
      
      if (track.path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(track.path[0].x, track.path[0].y);
        for(let i = 1; i < track.path.length; i++) {
          ctx.lineTo(track.path[i].x, track.path[i].y);
        }
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        const head = track.path[track.path.length - 1];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 9px Space Grotesk';
        ctx.fillText(track.symbol, head.x + 5, head.y - 5);
      }
    });

    if (merged) {
      const synthesisAge = frameCount - 67;
      
      const radius = Math.min(60, synthesisAge * 3);
      const gradient = ctx.createRadialGradient(vertexX, vertexY, 0, vertexX, vertexY, Math.max(1, radius));
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#00ffaa');
      gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.2)');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(vertexX, vertexY, Math.max(1, radius), 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 12]);
      ctx.beginPath();
      ctx.arc(vertexX, vertexY, radius * 0.8, synthesisAge * 0.04, synthesisAge * 0.04 + Math.PI*2);
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(vertexX, vertexY, radius * 0.5, -synthesisAge * 0.06, -synthesisAge * 0.06 + Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      if (synthesisAge < 40) {
        ctx.fillStyle = '#00ffaa';
        ctx.font = 'bold 10px Space Grotesk';
        ctx.fillText('⚛️ COLOR NEUTRAL STATE ESTABLISHED', vertexX - 100, vertexY - 10);
      }
    }

    // Render Futuristic Live HUD
    renderLiveHUD(w, h, isAllowed);

    if (frameCount < maxFrames) {
      animationId = requestAnimationFrame(animate);
    } else {
      animationId = null;
    }
  }

  animate();
}

// ----------------------------------------------------
// NEUTRINO OSCILLATION LAB (Quantum PMNS Matrix Calculations)
// ----------------------------------------------------

function selectInitialNeutrino(flavor) {
  initialNeutrinoFlavor = flavor;
  
  // Highlight buttons
  document.getElementById('btn-nu-e').className = 'color-pick-btn';
  document.getElementById('btn-nu-e').style.background = 'rgba(255,255,255,0.02)';
  document.getElementById('btn-nu-e').style.borderColor = 'rgba(255,255,255,0.05)';
  
  document.getElementById('btn-nu-mu').className = 'color-pick-btn';
  document.getElementById('btn-nu-mu').style.background = 'rgba(255,255,255,0.02)';
  document.getElementById('btn-nu-mu').style.borderColor = 'rgba(255,255,255,0.05)';
  
  document.getElementById('btn-nu-tau').className = 'color-pick-btn';
  document.getElementById('btn-nu-tau').style.background = 'rgba(255,255,255,0.02)';
  document.getElementById('btn-nu-tau').style.borderColor = 'rgba(255,255,255,0.05)';

  const activeBtn = document.getElementById(`btn-nu-${flavor.replace('nu_', '')}`);
  activeBtn.className = 'color-pick-btn active-lepton';
  activeBtn.style.background = 'rgba(0, 240, 255, 0.15)';
  activeBtn.style.borderColor = 'var(--color-lepton)';
  activeBtn.style.color = '#fff';

  updateNeutrinoOscillation();
}

// 3-Flavor Neutrino Oscillation Quantum Math Loader
function calculate3FlavorOscillation(alphaIdx, E_gev, L_km) {
  // PMNS mixing angles in radians
  const t12 = 33.82 * Math.PI / 180;
  const t23 = 48.3 * Math.PI / 180;
  const t13 = 8.61 * Math.PI / 180;

  const s12 = Math.sin(t12), c12 = Math.cos(t12);
  const s23 = Math.sin(t23), c23 = Math.cos(t23);
  const s13 = Math.sin(t13), c13 = Math.cos(t13);

  // PMNS 3x3 mixing matrix U (completely real approximation, CP phase delta = 0)
  const U = [
    [ c12 * c13, s12 * c13, s13 ],
    [ -s12 * c23 - c12 * s23 * s13, c12 * c23 - s12 * s23 * s13, s23 * c13 ],
    [ s12 * s23 - c12 * c23 * s13, -c12 * s23 - s12 * c23 * s13, c23 * c13 ]
  ];

  // Mass differences squared in eV^2
  const dm21 = 7.53e-5; 
  const dm31 = 2.52e-3; 
  const dm32 = dm31 - dm21;

  // Quantum phases
  const arg21 = 1.267 * dm21 * L_km / E_gev;
  const arg31 = 1.267 * dm31 * L_km / E_gev;
  const arg32 = 1.267 * dm32 * L_km / E_gev;

  const p = [0, 0, 0]; // Electron, Muon, Tau probabilities

  for (let beta = 0; beta < 3; beta++) {
    const term1 = U[alphaIdx][0] * U[beta][0] * U[alphaIdx][1] * U[beta][1] * Math.sin(arg21)**2;
    const term2 = U[alphaIdx][0] * U[beta][0] * U[alphaIdx][2] * U[beta][2] * Math.sin(arg31)**2;
    const term3 = U[alphaIdx][1] * U[beta][1] * U[alphaIdx][2] * U[beta][2] * Math.sin(arg32)**2;

    const delta = (alphaIdx === beta) ? 1 : 0;
    p[beta] = delta - 4 * (term1 + term2 + term3);
    p[beta] = Math.max(0, Math.min(1, p[beta])); // Clamp
  }

  return p;
}

function updateNeutrinoOscillation() {
  if (rightPanelTab !== 'neutrino') return;

  const energy = parseFloat(document.getElementById('slider-nu-energy').value);
  const distance = parseFloat(document.getElementById('slider-nu-distance').value);

  document.getElementById('label-nu-energy').textContent = `${energy.toFixed(2)} GeV`;
  document.getElementById('label-nu-distance').textContent = `${distance} km`;

  // Mapped indexes: nu_e = 0, nu_mu = 1, nu_tau = 2
  const alphaIdx = initialNeutrinoFlavor === 'nu_e' ? 0 : (initialNeutrinoFlavor === 'nu_mu' ? 1 : 2);
  const probs = calculate3FlavorOscillation(alphaIdx, energy, distance);

  // Render bars
  const pContainer = document.getElementById('neutrino-probability-panel');
  pContainer.innerHTML = `
    <div class="nu-probabilities-container" style="animation: fadeIn 0.3s ease-out;">
      <span style="font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted); font-weight:600; letter-spacing:0.05em; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.4rem; margin-bottom:0.25rem;">
        🌀 Quantum Flavor Superposition Probability
      </span>
      
      <!-- Electron Neutrino -->
      <div class="nu-probability-item">
        <div class="nu-label-row">
          <span>Electron Neutrino (ν_e 수득률)</span>
          <span style="color: #00f0ff;">${(probs[0]*100).toFixed(2)}%</span>
        </div>
        <div class="nu-bar-track">
          <div class="nu-bar-fill e-flavor" style="width: ${probs[0]*100}%;"></div>
        </div>
      </div>

      <!-- Muon Neutrino -->
      <div class="nu-probability-item">
        <div class="nu-label-row">
          <span>Muon Neutrino (ν_μ 수득률)</span>
          <span style="color: #a5b4fc;">${(probs[1]*100).toFixed(2)}%</span>
        </div>
        <div class="nu-bar-track">
          <div class="nu-bar-fill mu-flavor" style="width: ${probs[1]*100}%;"></div>
        </div>
      </div>

      <!-- Tau Neutrino -->
      <div class="nu-probability-item">
        <div class="nu-label-row">
          <span>Tau Neutrino (ν_τ 수득률)</span>
          <span style="color: #ec4899;">${(probs[2]*100).toFixed(2)}%</span>
        </div>
        <div class="nu-bar-track">
          <div class="nu-bar-fill tau-flavor" style="width: ${probs[2]*100}%;"></div>
        </div>
      </div>
    </div>
  `;

  // Run wave chameleon animation!
  animateNeutrinoOscillation(alphaIdx, energy, distance);
}

function animateNeutrinoOscillation(alphaIdx, E_gev, L_max_km) {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  let offset = 0;

  function animate() {
    offset += 0.08;
    ctx.fillStyle = '#020308';
    ctx.fillRect(0, 0, w, h);

    // Draw detector grid lines
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 25;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Propagate wave across canvas
    // Each x coordinate maps to a fractional propagation distance L_eff
    ctx.lineWidth = 4.5;
    
    // Draw propagating wave in segments
    const pointsCount = 180;
    const paddingX = 40;
    const waveLength = w - paddingX * 2;
    
    ctx.beginPath();
    
    for (let i = 0; i < pointsCount; i++) {
      const x = paddingX + (i / (pointsCount - 1)) * waveLength;
      
      // Calculate effective distance at this point along the propagation path
      const L_eff = (i / (pointsCount - 1)) * L_max_km;
      const probs = calculate3FlavorOscillation(alphaIdx, E_gev, L_eff);
      
      // Chameleon blending: Mix colors based on flavor probabilities
      // ν_e = Cyan (0, 240, 255)
      // ν_μ = Purple (99, 102, 241)
      // ν_τ = Magenta (212, 0, 255)
      const r = Math.round(probs[0]*0 + probs[1]*99 + probs[2]*212);
      const g = Math.round(probs[0]*240 + probs[1]*102 + probs[2]*0);
      const b = Math.round(probs[0]*255 + probs[1]*241 + probs[2]*255);
      
      const curY = h / 2 + Math.sin(i * 0.12 - offset) * 20;
      
      // Draw small line segments to change strokeStyle continuously
      if (i > 0) {
        ctx.beginPath();
        const prevX = paddingX + ((i - 1) / (pointsCount - 1)) * waveLength;
        const prevL = ((i - 1) / (pointsCount - 1)) * L_max_km;
        const prevProbs = calculate3FlavorOscillation(alphaIdx, E_gev, prevL);
        const prevY = h / 2 + Math.sin((i - 1) * 0.12 - offset) * 20;
        
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, curY);
        
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.stroke();
      }
    }
    
    ctx.shadowBlur = 0; // Reset shadow

    // Draw source and detector badges
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath(); ctx.arc(paddingX, h/2, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px Space Grotesk';
    ctx.fillText('SOURCE ν', paddingX - 18, h/2 - 10);

    ctx.fillStyle = '#ec4899';
    ctx.beginPath(); ctx.arc(w - paddingX, h/2, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillText('DETECTOR', w - paddingX - 22, h/2 - 10);

    // Overlay text showing distance grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '8px Space Grotesk';
    ctx.fillText('0 km', paddingX - 8, h/2 + 35);
    ctx.fillText(`${(L_max_km / 2).toFixed(0)} km`, w/2 - 15, h/2 + 35);
    ctx.fillText(`${L_max_km.toFixed(0)} km`, w - paddingX - 18, h/2 + 35);

    animationId = requestAnimationFrame(animate);
  }

  animate();
}

// ----------------------------------------------------
// ADVANCED MONTE CARLO DECAY CASCADE LAB
// ----------------------------------------------------

let selectDecayParentEl;
let cascadeCanvas, cascadeCtx;
let cascadeAnimationId = null;

function initDecayCascadeSelector() {
  selectDecayParentEl = document.getElementById('select-decay-parent');
  if (!selectDecayParentEl) return;
  
  selectDecayParentEl.innerHTML = '';
  
  // Find particles that are unstable and have decay modes
  const unstableParticles = particlesData.filter(p => !p.stable && p.decay_modes && p.decay_modes.length > 0);
  
  // Sort by mass descending
  unstableParticles.sort((a, b) => b.mass_mev - a.mass_mev);
  
  unstableParticles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.symbol;
    opt.textContent = `${p.name} (${p.symbol}) - ${formatMass(p.mass_mev)}`;
    selectDecayParentEl.appendChild(opt);
  });
}

function simulateDecayChain(symbol, depth = 0, parentBranching = 1.0) {
  const p = particlesBySymbol[symbol];
  if (!p) {
    return { symbol, name: symbol, stable: true, children: [], mass_mev: 0, branching: parentBranching };
  }
  
  const node = {
    symbol: p.symbol,
    name: p.name,
    stable: p.stable,
    mass_mev: p.mass_mev,
    branching: parentBranching,
    children: []
  };
  
  if (p.stable || !p.decay_modes || p.decay_modes.length === 0 || depth >= 7) {
    return node;
  }
  
  // Select a decay mode using Monte Carlo (weighted random)
  const r = Math.random();
  let cumulative = 0;
  let selectedMode = null;
  
  const totalBR = p.decay_modes.reduce((s, m) => s + m.branching_ratio, 0);
  
  for (const mode of p.decay_modes) {
    const normBR = mode.branching_ratio / (totalBR || 1.0);
    cumulative += normBR;
    if (r <= cumulative) {
      selectedMode = mode;
      break;
    }
  }
  
  if (!selectedMode && p.decay_modes.length > 0) {
    selectedMode = p.decay_modes[0];
  }
  
  if (selectedMode) {
    node.decayChannelName = selectedMode.channel;
    node.channelBR = selectedMode.branching_ratio;
    
    selectedMode.products.forEach(prodSymbol => {
      const childNode = simulateDecayChain(prodSymbol, depth + 1, parentBranching * selectedMode.branching_ratio);
      node.children.push(childNode);
    });
  }
  
  return node;
}

function renderDecayTreeHTML(node) {
  let html = `<div class="decay-tree-wrapper">`;
  
  const categoryColor = getParticleCategoryColor(node.symbol);
  html += `
    <div class="decay-node-card" style="box-shadow: 0 0 15px ${categoryColor}30; border-color: ${categoryColor}60;">
      <span class="decay-node-symbol" style="color: ${categoryColor};">${node.symbol}</span>
      <span class="decay-node-name">${node.name}</span>
      ${node.channelBR ? `<span class="decay-probability-tag">BR: ${(node.channelBR * 100).toFixed(1)}%</span>` : ''}
    </div>
  `;
  
  if (node.children && node.children.length > 0) {
    html += `<div class="decay-branch-arrow">↳ 붕괴: ${node.decayChannelName || ''}</div>`;
    html += `<div class="decay-children-container">`;
    node.children.forEach(child => {
      html += renderDecayTreeHTML(child);
    });
    html += `</div>`;
  }
  
  html += `</div>`;
  return html;
}

function getParticleCategoryColor(symbol) {
  const p = particlesBySymbol[symbol];
  if (!p) return '#fff';
  if (p.category === 'Beyond Standard Model') return 'var(--color-bsm)';
  if (p.type === 'quark') return 'var(--color-quark)';
  if (p.type === 'lepton') return 'var(--color-lepton)';
  if (p.type === 'gauge_boson') return 'var(--color-boson)';
  if (p.type === 'scalar_boson') return 'var(--color-scalar)';
  return '#10b981'; // Composite Hadrons / default
}

function runDecayCascade() {
  const selectEl = document.getElementById('select-decay-parent');
  if (!selectEl) return;
  const parentSymbol = selectEl.value;
  if (!parentSymbol) return;
  
  const decayTree = simulateDecayChain(parentSymbol);
  
  const outputEl = document.getElementById('decay-tree-output');
  outputEl.innerHTML = `
    <div style="font-size: 0.9rem; color: #fff; font-weight: 700; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; display: flex; justify-content: space-between;">
      <span>🔮 Monte Carlo 붕괴 계통도 (Decay Tree)</span>
      <span style="color: var(--color-text-muted); font-size: 0.75rem;">(분기 가중치에 따른 자발적 붕괴 체인 시각화)</span>
    </div>
    ${renderDecayTreeHTML(decayTree)}
  `;
  
  animateCascadeTracks(decayTree);
}

function animateCascadeTracks(tree) {
  cascadeCanvas = document.getElementById('canvas-cascade-visualizer');
  if (!cascadeCanvas) return;
  cascadeCtx = cascadeCanvas.getContext('2d');
  
  const rect = cascadeCanvas.getBoundingClientRect();
  cascadeCanvas.width = rect.width * window.devicePixelRatio;
  cascadeCanvas.height = rect.height * window.devicePixelRatio;
  cascadeCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  const w = rect.width;
  const h = rect.height;
  
  if (cascadeAnimationId) {
    cancelAnimationFrame(cascadeAnimationId);
    cascadeAnimationId = null;
  }
  
  const tracksList = [];
  
  function buildTracks(node, startX, startY, startAngle, timeOffset, parentColor) {
    const color = getParticleCategoryColor(node.symbol);
    const length = node.stable ? 120 : (40 + Math.random() * 30);
    const endX = startX + Math.cos(startAngle) * length;
    const endY = startY + Math.sin(startAngle) * length;
    
    const isNeutral = (particlesBySymbol[node.symbol]?.charge || 0) === 0;
    
    tracksList.push({
      symbol: node.symbol,
      startX, startY, endX, endY,
      color,
      isNeutral,
      timeOffset,
      duration: node.stable ? 80 : 35,
      progress: 0
    });
    
    if (node.children && node.children.length > 0) {
      const childrenCount = node.children.length;
      const spread = Math.PI / 3; 
      node.children.forEach((child, idx) => {
        let childAngle = startAngle;
        if (childrenCount > 1) {
          childAngle = startAngle - spread/2 + (idx / (childrenCount - 1)) * spread;
        } else {
          childAngle = startAngle + (Math.random() - 0.5) * 0.4;
        }
        buildTracks(child, endX, endY, childAngle, timeOffset + 35, color);
      });
    }
  }
  
  buildTracks(tree, 30, h / 2, 0, 0, '#fff');
  
  let frame = 0;
  function animate() {
    cascadeCtx.fillStyle = 'rgba(5, 7, 20, 0.25)';
    cascadeCtx.fillRect(0, 0, w, h);
    
    cascadeCtx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    cascadeCtx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      cascadeCtx.beginPath(); cascadeCtx.moveTo(x, 0); cascadeCtx.lineTo(x, h); cascadeCtx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      cascadeCtx.beginPath(); cascadeCtx.moveTo(0, y); cascadeCtx.lineTo(w, y); cascadeCtx.stroke();
    }
    
    let finishedAll = true;
    
    tracksList.forEach(t => {
      if (frame >= t.timeOffset) {
        if (t.progress < t.duration) {
          t.progress++;
          finishedAll = false;
        }
        
        const p = t.progress / t.duration;
        const curX = t.startX + (t.endX - t.startX) * p;
        const curY = t.startY + (t.endY - t.startY) * p;
        
        cascadeCtx.beginPath();
        cascadeCtx.lineWidth = 2.5;
        cascadeCtx.strokeStyle = t.color;
        
        if (t.isNeutral) {
          cascadeCtx.setLineDash([3, 4]);
        } else {
          cascadeCtx.setLineDash([]);
          const charge = particlesBySymbol[t.symbol]?.charge || 0.0;
          if (charge !== 0.0) {
            cascadeCtx.arc(t.startX, t.startY + (charge * 50), charge * 50, -Math.PI/2, Math.PI/2);
          }
        }
        
        cascadeCtx.moveTo(t.startX, t.startY);
        cascadeCtx.lineTo(curX, curY);
        cascadeCtx.stroke();
        cascadeCtx.setLineDash([]);
        
        if (t.progress >= t.duration) {
          cascadeCtx.fillStyle = '#fff';
          cascadeCtx.font = 'bold 9px Space Grotesk';
          cascadeCtx.fillText(t.symbol, t.endX + 3, t.endY + 3);
        }
      } else {
        finishedAll = false;
      }
    });
    
    frame++;
    if (!finishedAll) {
      cascadeAnimationId = requestAnimationFrame(animate);
    }
  }
  
  animate();
}

// ----------------------------------------------------
// ELECTROWEAK POLARIZATION & ANGULAR LAB
// ----------------------------------------------------

let selectedAngularBoson = 'Z0';
let selectedPolarization = 'unpolarized';
let angCanvas2D, angCtx2D;
let angCanvas3D, angCtx3D;
let ang3DAnimationId = null;

function selectAngularBoson(symbol) {
  selectedAngularBoson = symbol;
  
  const ZBtn = document.getElementById('btn-ang-z');
  const WBtn = document.getElementById('btn-ang-w');
  const HBtn = document.getElementById('btn-ang-h');
  
  if (ZBtn && WBtn && HBtn) {
    [ZBtn, WBtn, HBtn].forEach(b => {
      b.classList.remove('active-lepton');
      b.style.borderColor = 'rgba(255, 255, 255, 0.05)';
      b.style.background = 'transparent';
      b.style.color = 'var(--color-text-muted)';
    });
    
    let targetBtn = ZBtn;
    if (symbol === 'W+') targetBtn = WBtn;
    if (symbol === 'H0') targetBtn = HBtn;
    
    const accentColor = symbol === 'H0' ? 'var(--color-scalar)' : 'var(--color-boson)';
    targetBtn.classList.add('active-lepton');
    targetBtn.style.borderColor = accentColor;
    targetBtn.style.background = symbol === 'H0' ? 'rgba(0, 255, 170, 0.15)' : 'rgba(168, 85, 247, 0.15)';
    targetBtn.style.color = '#fff';
  }
  
  updateAngularLab();
}

function selectPolarization(mode) {
  selectedPolarization = mode;
  
  const unpolBtn = document.getElementById('btn-pol-unpol');
  const transBtn = document.getElementById('btn-pol-trans');
  const longBtn = document.getElementById('btn-pol-long');
  
  if (unpolBtn && transBtn && longBtn) {
    [unpolBtn, transBtn, longBtn].forEach(b => {
      b.classList.remove('active-lepton');
      b.style.borderColor = 'rgba(255, 255, 255, 0.05)';
      b.style.background = 'transparent';
      b.style.color = 'var(--color-text-muted)';
    });
    
    let targetBtn = unpolBtn;
    if (mode === 'transverse') targetBtn = transBtn;
    if (mode === 'longitudinal') targetBtn = longBtn;
    
    const accentColor = 'var(--color-boson)';
    targetBtn.classList.add('active-lepton');
    targetBtn.style.borderColor = accentColor;
    targetBtn.style.background = 'rgba(168, 85, 247, 0.15)';
    targetBtn.style.color = '#fff';
  }
  
  const descEl = document.getElementById('label-pol-desc');
  if (descEl) {
    if (mode === 'unpolarized') {
      descEl.textContent = "무편광: 고전적인 무작위 또는 앙상블 평균화 상태를 모사합니다. 각도에 구애받지 않는 표준 분포를 보입니다.";
    } else if (mode === 'transverse') {
      descEl.textContent = "횡편광 (Transverse): 스핀 방향이 보손 진행 방향에 수직(m_s = ±1)인 빔입니다. 분포가 양쪽 극단(0도 및 180도) 부근으로 강화됩니다.";
    } else if (mode === 'longitudinal') {
      descEl.textContent = "종편광 (Longitudinal): 질량을 획득한 게이지 보손(W, Z)에만 관찰되는 모드로, 진행 축에 완전 수직 방향(90도)으로 지향성을 가집니다.";
    }
  }
  
  updateAngularLab();
}

function getAngularProbabilityDensity(thetaRad, boson, polarization) {
  if (boson === 'H0') {
    return 1.0; 
  }
  
  if (polarization === 'unpolarized') {
    return 0.375 * (1 + Math.cos(thetaRad) * Math.cos(thetaRad));
  } else if (polarization === 'transverse') {
    return 0.375 * (1 + Math.cos(thetaRad) * Math.cos(thetaRad));
  } else if (polarization === 'longitudinal') {
    return 0.75 * Math.sin(thetaRad) * Math.sin(thetaRad);
  }
  
  return 1.0;
}

function updateAngularLab() {
  angCanvas2D = document.getElementById('canvas-angular-plot');
  angCanvas3D = document.getElementById('canvas-polarization-3d');
  if (!angCanvas2D || !angCanvas3D) return;
  
  angCtx2D = angCanvas2D.getContext('2d');
  angCtx3D = angCanvas3D.getContext('2d');
  
  const w2D = angCanvas2D.clientWidth;
  const h2D = angCanvas2D.clientHeight;
  angCanvas2D.width = w2D * window.devicePixelRatio;
  angCanvas2D.height = h2D * window.devicePixelRatio;
  angCtx2D.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  const w3D = angCanvas3D.clientWidth;
  const h3D = angCanvas3D.clientHeight;
  angCanvas3D.width = w3D * window.devicePixelRatio;
  angCanvas3D.height = h3D * window.devicePixelRatio;
  angCtx3D.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  draw2DAngularChart(w2D, h2D);
  start3DAngularSimulation(w3D, h3D);
  renderAngularPhysicalFormulas();
}

function draw2DAngularChart(w, h) {
  angCtx2D.clearRect(0, 0, w, h);
  
  const padX = 40;
  const padY = 30;
  const graphW = w - padX * 2;
  const graphH = h - padY * 2;
  
  angCtx2D.strokeStyle = 'rgba(255,255,255,0.1)';
  angCtx2D.lineWidth = 1;
  angCtx2D.beginPath();
  angCtx2D.moveTo(padX, padY);
  angCtx2D.lineTo(padX, h - padY);
  angCtx2D.lineTo(w - padX, h - padY);
  angCtx2D.stroke();
  
  angCtx2D.fillStyle = 'rgba(255,255,255,0.4)';
  angCtx2D.font = '8px Space Grotesk';
  angCtx2D.textAlign = 'center';
  
  const tickAngles = [0, 45, 90, 135, 180];
  tickAngles.forEach(deg => {
    const x = padX + (deg / 180) * graphW;
    angCtx2D.beginPath();
    angCtx2D.moveTo(x, h - padY);
    angCtx2D.lineTo(x, h - padY + 4);
    angCtx2D.stroke();
    angCtx2D.fillText(`${deg}°`, x, h - padY + 12);
  });
  
  angCtx2D.textAlign = 'right';
  angCtx2D.fillText("0.8", padX - 8, padY + 5);
  angCtx2D.fillText("0.4", padX - 8, padY + graphH/2 + 5);
  angCtx2D.fillText("0", padX - 8, h - padY + 2);
  
  const points = [];
  const pointsCount = 100;
  let maxVal = 0.8;
  
  for (let i = 0; i <= pointsCount; i++) {
    const deg = (i / pointsCount) * 180;
    const rad = deg * Math.PI / 180;
    const val = getAngularProbabilityDensity(rad, selectedAngularBoson, selectedPolarization);
    points.push({ deg, val });
  }
  
  angCtx2D.beginPath();
  points.forEach((pt, idx) => {
    const x = padX + (pt.deg / 180) * graphW;
    const y = (h - padY) - (pt.val / maxVal) * graphH;
    if (idx === 0) angCtx2D.moveTo(x, y);
    else angCtx2D.lineTo(x, y);
  });
  
  const accentColor = selectedAngularBoson === 'H0' ? '#00ffaa' : '#a855f7';
  
  angCtx2D.strokeStyle = accentColor;
  angCtx2D.lineWidth = 2.5;
  angCtx2D.shadowBlur = 10;
  angCtx2D.shadowColor = accentColor;
  angCtx2D.stroke();
  angCtx2D.shadowBlur = 0;
  
  angCtx2D.fillStyle = '#fff';
  angCtx2D.font = 'bold 9px Space Grotesk';
  angCtx2D.textAlign = 'left';
  angCtx2D.fillText(`PDF Curve: ${selectedAngularBoson} Decay (Polarization: ${selectedPolarization})`, padX + 5, padY - 10);
}

function start3DAngularSimulation(w, h) {
  if (ang3DAnimationId) {
    cancelAnimationFrame(ang3DAnimationId);
    ang3DAnimationId = null;
  }
  
  const particles = [];
  const centerX = w / 2;
  const centerY = h / 2;
  
  function spawnParticle() {
    let thetaRad, pdfValue;
    let attempts = 0;
    
    do {
      thetaRad = Math.random() * Math.PI; 
      pdfValue = getAngularProbabilityDensity(thetaRad, selectedAngularBoson, selectedPolarization);
      attempts++;
    } while (Math.random() * 1.0 > pdfValue && attempts < 100);
    
    const sign = Math.random() > 0.5 ? 1 : -1;
    const finalAngle = Math.PI / 2 + sign * thetaRad; 
    
    const speed = 2.0 + Math.random() * 1.5;
    const color = selectedAngularBoson === 'H0' ? '#00ffaa' : '#a855f7';
    
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(finalAngle) * speed,
      vy: Math.sin(finalAngle) * speed,
      size: 2.0 + Math.random() * 1.5,
      color,
      alpha: 1.0,
      decayTime: 50 + Math.random() * 40
    });
  }
  
  let frame = 0;
  
  function draw() {
    angCtx3D.fillStyle = 'rgba(5, 7, 20, 0.2)';
    angCtx3D.fillRect(0, 0, w, h);
    
    const pulse = 12 + Math.sin(frame * 0.1) * 3;
    const color = selectedAngularBoson === 'H0' ? 'rgba(0, 255, 170, 0.4)' : 'rgba(168, 85, 247, 0.4)';
    const coreColor = selectedAngularBoson === 'H0' ? '#00ffaa' : '#a855f7';
    
    angCtx3D.shadowBlur = 15;
    angCtx3D.shadowColor = coreColor;
    
    angCtx3D.fillStyle = color;
    angCtx3D.beginPath();
    angCtx3D.arc(centerX, centerY, pulse, 0, Math.PI * 2);
    angCtx3D.fill();
    
    angCtx3D.fillStyle = coreColor;
    angCtx3D.beginPath();
    angCtx3D.arc(centerX, centerY, 4, 0, Math.PI * 2);
    angCtx3D.fill();
    
    angCtx3D.shadowBlur = 0;
    
    if (selectedPolarization !== 'unpolarized' && selectedAngularBoson !== 'H0') {
      angCtx3D.strokeStyle = 'rgba(255,255,255,0.15)';
      angCtx3D.lineWidth = 1;
      angCtx3D.setLineDash([4, 4]);
      angCtx3D.beginPath();
      angCtx3D.moveTo(centerX, centerY - h/2.5);
      angCtx3D.lineTo(centerX, centerY + h/2.5);
      angCtx3D.stroke();
      angCtx3D.setLineDash([]);
      
      angCtx3D.fillStyle = '#fff';
      angCtx3D.font = 'bold 8px Space Grotesk';
      angCtx3D.fillText('SPIN AXIS (Z)', centerX - 25, centerY - h/2.5 - 5);
    }
    
    if (frame % 3 === 0) spawnParticle();
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 1.0 / p.decayTime;
      
      if (p.alpha <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
        particles.splice(i, 1);
        continue;
      }
      
      angCtx3D.fillStyle = p.color;
      angCtx3D.globalAlpha = p.alpha;
      angCtx3D.beginPath();
      angCtx3D.arc(p.x, p.y, p.size, 0, Math.PI*2);
      angCtx3D.fill();
      angCtx3D.globalAlpha = 1.0; 
    }
    
    frame++;
    ang3DAnimationId = requestAnimationFrame(draw);
  }
  
  draw();
}

function renderAngularPhysicalFormulas() {
  const container = document.getElementById('polarization-physics-details');
  if (!container) return;
  
  let html = '';
  
  if (selectedAngularBoson === 'H0') {
    html = `
      <div class="physics-formula-title">
        <span>⚛️ 힉스 보손 (Spin-0 Scalar Higgs) 양자 각분포</span>
        <span style="color: var(--color-scalar); font-weight: bold;">J = 0</span>
      </div>
      <p style="margin-bottom: 0.5rem;">
        힉스 보손($H^0$)은 양자장론에서 <b>스핀 0</b>인 대표적인 스칼라 필드입니다. 스핀이 존재하지 않으므로 어떠한 물리적 편광 축도 정의되지 않습니다.
      </p>
      <div class="physics-formula-math">
        \\frac{d\\Gamma}{d\\cos\\theta} \\propto \\text{Isotropic (상수)}
      </div>
      <p style="font-size: 0.75rem;">
        따라서 힉스가 $H^0 \\to W^+ W^-$ 또는 $H^0 \\to f\\bar{f}$ 등으로 붕괴될 때 방출각 $\\theta$에 대한 확률밀도곡선은 완벽한 <b>등방성(Isotropic)</b>을 보입니다. 즉, 방향 선택이 완전히 균일합니다.
      </p>
    `;
  } else {
    let polMath = '';
    let polDesc = '';
    
    if (selectedPolarization === 'unpolarized') {
      polMath = '\\frac{d\\Gamma}{d\\cos\\theta} \\propto 1 + \\cos^2\\theta';
      polDesc = '무편광 앙상블 상태는 여러 횡편광 스핀 상태들이 중첩된 평균값으로, $\\cos\\theta$의 제곱에 비례하는 넓고 완벽한 2차 쌍곡선 각분포를 이룹니다.';
    } else if (selectedPolarization === 'transverse') {
      polMath = '\\frac{d\\Gamma}{d\\cos\\theta} \\propto 1 + \\cos^2\\theta';
      polDesc = '횡편광($m_s = \\pm 1$) 상태는 전자기 횡파와 유사하게 스핀 대칭축에 평행한 방향($0^\\circ$와 $180^\\circ$)으로 극대 방출강도를 보입니다.';
    } else if (selectedPolarization === 'longitudinal') {
      polMath = '\\frac{d\\Gamma}{d\\cos\\theta} \\propto \\sin^2\\theta';
      polDesc = '종편광($m_s = 0$) 상태는 질량을 획득한 게이지 보손(W, Z)에만 관찰되는 모드로, 진행 축에 완전 수직 방향($90^\\circ$)으로 솟구치는 분포를 형성합니다.';
    }
    
    let extraZPhysics = '';
    if (selectedAngularBoson === 'Z0') {
      extraZPhysics = `
        <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.08); font-size: 0.75rem; color: #a5b4fc;">
          🧪 <b>Z 보손 전약력 비대칭 보정 (Parity Violation)</b>: Z 보손은 좌/우반신 맛깔과의 결합도가 달라 약한 중성전류 붕괴 시 미세한 전방-후방 비대칭성($A_{FB} \\approx 2 A_e A_f \\cos\\theta$)을 유발합니다. 이는 와인버그 각 $\\sin^2\\theta_W \\approx 0.231$에 기인합니다.
        </div>
      `;
    }
    
    html = `
      <div class="physics-formula-title">
        <span>🌀 벡터 보손 (${selectedAngularBoson}, Spin-1) 각도 확률밀도</span>
        <span style="color: var(--color-boson); font-weight: bold;">J = 1</span>
      </div>
      <p style="margin-bottom: 0.5rem;">
        스핀-1인 벡터 게이지 보손의 양자역학적 붕괴는 입자의 스핀 자영 상태 $m_s$에 따라 서로 다른 구면 조화 텐서 결합을 보입니다.
      </p>
      <div class="physics-formula-math">
        ${polMath}
      </div>
      <p style="font-size: 0.75rem;">
        ${polDesc}
      </p>
      ${extraZPhysics}
    `;
  }
  
  container.innerHTML = html;
}

// ----------------------------------------------------
// SU(3) FLAVOR MULTIPLETS & GELL-MANN-NISHIJIMA LAB
// ----------------------------------------------------

function calculateSU3FlavorNumbers(quarksList) {
  let I3 = 0.0;
  let S = 0.0;
  let B = 0.0;
  
  quarksList.forEach(q => {
    if (!q) return;
    const isAnti = q.startsWith('anti_');
    const baseQuark = isAnti ? q.replace('anti_', '') : q;
    
    let q_I3 = 0.0;
    let q_S = 0.0;
    let q_B = 1.0/3.0;
    
    if (baseQuark === 'u') q_I3 = 0.5;
    else if (baseQuark === 'd') q_I3 = -0.5;
    else if (baseQuark === 's') q_S = -1.0;
    
    if (isAnti) {
      q_I3 = -q_I3;
      q_S = -q_S;
      q_B = -q_B;
    }
    
    I3 += q_I3;
    S += q_S;
    B += q_B;
  });
  
  return { I3, S, B, Y: B + S };
}

let su3CanvasLoopId = null;

function drawSU3MultipletPlot(activeI3 = null, activeY = null, activeSymbol = null) {
  const canvas = document.getElementById('canvas-su3-multiplet');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  const w = rect.width;
  const h = rect.height;
  
  ctx.clearRect(0, 0, w, h);
  
  // Margins and scaling
  const padX = 50;
  const padY = 40;
  const graphW = w - padX * 2;
  const graphH = h - padY * 2;
  
  const minI3 = -1.5, maxI3 = 1.5;
  const minY = -1.5, maxY = 1.5;
  
  const mapX = (i3) => padX + ((i3 - minI3) / (maxI3 - minI3)) * graphW;
  const mapY = (y) => h - padY - ((y - minY) / (maxY - minY)) * graphH;
  
  // 1. Draw grid background & coordinate axes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let val = -1.5; val <= 1.5; val += 0.5) {
    // vertical grids
    ctx.beginPath();
    ctx.moveTo(mapX(val), padY);
    ctx.lineTo(mapX(val), h - padY);
    ctx.stroke();
    
    // horizontal grids
    ctx.beginPath();
    ctx.moveTo(padX, mapY(val));
    ctx.lineTo(w - padX, mapY(val));
    ctx.stroke();
  }
  
  // Coordinate Axes (I_3 and Y)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  
  // X-axis (Y = 0)
  ctx.beginPath(); ctx.moveTo(padX, mapY(0)); ctx.lineTo(w - padX, mapY(0)); ctx.stroke();
  // Y-axis (I_3 = 0)
  ctx.beginPath(); ctx.moveTo(mapX(0), padY); ctx.lineTo(mapX(0), h - padY); ctx.stroke();
  
  // Axes Arrow / Labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = 'bold 8px Space Grotesk';
  ctx.textAlign = 'center';
  ctx.fillText('I₃ (등방스핀)', w - padX + 22, mapY(0) + 3);
  ctx.fillText('Y (초전하)', mapX(0), padY - 10);
  
  // Axis values
  ctx.font = '7px Space Grotesk';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  [-1.0, -0.5, 0.5, 1.0].forEach(val => {
    ctx.fillText(val.toFixed(1), mapX(val), mapY(0) + 10);
    ctx.fillText(val.toFixed(1), mapX(0) - 15, mapY(val) + 3);
  });
  
  // 2. Draw standard SU(3) Multiplet grids (Baryon Octet & Meson Nonet grid structure)
  // Let's draw the standard hex outline representing Baryon Octet / Meson Nonet
  const hexPoints = [
    { i3: -0.5, y: 1.0 },  // n, K0
    { i3: 0.5, y: 1.0 },   // p, K+
    { i3: 1.0, y: 0.0 },   // Sigma+, pi+
    { i3: 0.5, y: -1.0 },  // Xi0, K-
    { i3: -0.5, y: -1.0 }, // Xi-, Kbar0
    { i3: -1.0, y: 0.0 }   // Sigma-, pi-
  ];
  
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  hexPoints.forEach((pt, idx) => {
    const x = mapX(pt.i3);
    const y = mapY(pt.y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Add some dotted connection lines inside hexagon to Lambda/Sigma0 center (0,0)
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.beginPath();
  hexPoints.forEach(pt => {
    ctx.moveTo(mapX(pt.i3), mapY(pt.y));
    ctx.lineTo(mapX(0), mapY(0));
  });
  ctx.stroke();
  
  // Plot reference multiplet standard particles
  const refParticles = [
    { i3: 0.5, y: 1.0, sym: 'p/K⁺' },
    { i3: -0.5, y: 1.0, sym: 'n/K⁰' },
    { i3: 1.0, y: 0.0, sym: 'Σ⁺/π⁺' },
    { i3: -1.0, y: 0.0, sym: 'Σ⁻/π⁻' },
    { i3: 0.5, y: -1.0, sym: 'Ξ⁰/K⁻' },
    { i3: -0.5, y: -1.0, sym: 'Ξ⁻/K̄⁰' },
    { i3: 0.0, y: 0.0, sym: 'Λ/π⁰' }
  ];
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = '7px Space Grotesk';
  ctx.textAlign = 'center';
  refParticles.forEach(rp => {
    ctx.beginPath();
    ctx.arc(mapX(rp.i3), mapY(rp.y), 2.5, 0, Math.PI*2);
    ctx.fill();
    ctx.fillText(rp.sym, mapX(rp.i3), mapY(rp.y) - 6);
  });
  
  // 3. Render active composition dot (if exists)
  if (activeI3 !== null && activeY !== null) {
    const actX = mapX(activeI3);
    const actY = mapY(activeY);
    
    // Draw pulsing neon glow ring
    const pulse = 10 + Math.sin(Date.now() * 0.008) * 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ffaa';
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(actX, actY, pulse, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
    
    // Draw solid core
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.arc(actX, actY, 4, 0, Math.PI*2);
    ctx.fill();
    
    // Draw active symbol text banner
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Space Grotesk';
    ctx.fillText(activeSymbol || 'Composed', actX, actY - 14);
  }
}

function updateHadronBuilderMultiplet(customI3 = null, customY = null, customSymbol = null) {
  if (customI3 !== null && customY !== null) {
    drawSU3MultipletPlot(customI3, customY, customSymbol);
    return;
  }
  
  // Calculate from builder slots
  const nonNullQuarks = builderSlots.filter(q => q !== null);
  if (nonNullQuarks.length === 0) {
    drawSU3MultipletPlot(null, null, null);
    
    const formulaCard = document.getElementById('gell-mann-nishijima-equation-card');
    if (formulaCard) formulaCard.style.display = 'none';
    return;
  }
  
  const stats = calculateSU3FlavorNumbers(nonNullQuarks);
  const tempSym = nonNullQuarks.length === 3 ? "Baryon Space" : (nonNullQuarks.length === 2 ? "Meson Space" : "Quark State");
  
  drawSU3MultipletPlot(stats.I3, stats.Y, tempSym);
  
  // Render Gell-Mann-Nishijima equation Card
  const formulaCard = document.getElementById('gell-mann-nishijima-equation-card');
  if (formulaCard) {
    formulaCard.style.display = 'block';
    
    // Compute total charge Q
    const totalQ = nonNullQuarks.reduce((sum, q) => {
      const isAnti = q.startsWith('anti_');
      const baseQuark = isAnti ? q.replace('anti_', '') : q;
      let chg = baseQuark === 'u' ? 2.0/3.0 : -1.0/3.0;
      return sum + (isAnti ? -chg : chg);
    }, 0.0);
    
    const isVerified = Math.abs(totalQ - (stats.I3 + stats.Y / 2.0)) < 1e-4;
    
    formulaCard.innerHTML = `
      <div style="font-weight: 700; color: #00ffaa; margin-bottom: 0.25rem; display: flex; justify-content: space-between;">
        <span>🧪 Gell-Mann–Nishijima 공식 입증 성공</span>
        <span>${isVerified ? '✓ VERIFIED' : '✗ SYSTEM UNSTABLE'}</span>
      </div>
      <div style="font-family: var(--font-mono); font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 0.4rem; border-radius: 5px; text-align: center; border: 1px solid rgba(0,255,170,0.1); margin: 0.35rem 0;">
        Q = I₃ + Y/2 &rArr; ${totalQ.toFixed(2)} = ${stats.I3.toFixed(1)} + (${stats.Y.toFixed(2)})/2
      </div>
      <div style="font-size: 0.72rem; color: var(--color-text-muted);">
        <b>수식 해설</b>: 전하량 Q(${totalQ.toFixed(2)}e)는 강력 등방스핀 성분 I₃(${stats.I3.toFixed(1)})와 쿼크 초전하 Y(${stats.Y.toFixed(2)}, 바리온수 B + 기묘도 S)의 합산으로 양자역학계에 철저히 일치합니다.
      </div>
    `;
  }
}

// ----------------------------------------------------
// COLLIDER BREIT-WIGNER RESONANCE LAB
// ----------------------------------------------------

let selectedColliderTargetSymbol = 'Z0';
let colliderLoopId = null;
let colliderCanvas2D, colliderCtx2D;
let colliderCanvasEvent, colliderCtxEvent;

function selectColliderTarget(symbol) {
  selectedColliderTargetSymbol = symbol;
  
  const ZBtn = document.getElementById('btn-col-z');
  const HBtn = document.getElementById('btn-col-h');
  
  if (ZBtn && HBtn) {
    [ZBtn, HBtn].forEach(b => {
      b.classList.remove('active-lepton');
      b.style.borderColor = 'rgba(255, 255, 255, 0.05)';
      b.style.background = 'transparent';
      b.style.color = 'var(--color-text-muted)';
    });
    
    const targetBtn = symbol === 'Z0' ? ZBtn : HBtn;
    const accentColor = symbol === 'H0' ? 'var(--color-scalar)' : 'var(--color-boson)';
    targetBtn.classList.add('active-lepton');
    targetBtn.style.borderColor = accentColor;
    targetBtn.style.background = symbol === 'H0' ? 'rgba(0, 255, 170, 0.15)' : 'rgba(168, 85, 247, 0.15)';
    targetBtn.style.color = '#fff';
  }
  
  // Set slider attributes dynamically based on mass and width
  const energySlider = document.getElementById('slider-collider-energy');
  if (energySlider) {
    if (symbol === 'Z0') {
      energySlider.min = "75.0";
      energySlider.max = "105.0";
      energySlider.step = "0.1";
      energySlider.value = "80.0";
    } else {
      // Higgs width is extremely narrow, need high precision slider around 125 GeV
      energySlider.min = "124.00";
      energySlider.max = "126.50";
      energySlider.step = "0.01";
      energySlider.value = "124.20";
    }
  }
  
  updateColliderLab();
}

function updateColliderLab() {
  colliderCanvas2D = document.getElementById('canvas-cross-section');
  colliderCanvasEvent = document.getElementById('canvas-collider-event');
  if (!colliderCanvas2D || !colliderCanvasEvent) return;
  
  colliderCtx2D = colliderCanvas2D.getContext('2d');
  colliderCtxEvent = colliderCanvasEvent.getContext('2d');
  
  const w2D = colliderCanvas2D.clientWidth;
  const h2D = colliderCanvas2D.clientHeight;
  colliderCanvas2D.width = w2D * window.devicePixelRatio;
  colliderCanvas2D.height = h2D * window.devicePixelRatio;
  colliderCtx2D.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  const wEvent = colliderCanvasEvent.clientWidth;
  const hEvent = colliderCanvasEvent.clientHeight;
  colliderCanvasEvent.width = wEvent * window.devicePixelRatio;
  colliderCanvasEvent.height = hEvent * window.devicePixelRatio;
  colliderCtxEvent.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  const slider = document.getElementById('slider-collider-energy');
  if (!slider) return;
  const sqrtS = parseFloat(slider.value);
  
  // Update labels
  const labelVal = document.getElementById('label-collider-energy');
  if (labelVal) labelVal.textContent = `${sqrtS.toFixed(2)} GeV`;
  
  // 1. Draw Breit-Wigner curve
  draw2DBreitWignerChart(w2D, h2D, sqrtS);
  
  // 2. Start/Restart detector simulation
  startColliderDetectorSimulation(wEvent, hEvent, sqrtS);
  
  // 3. Render physical descriptions
  renderColliderPhysicsMath();
}

function draw2DBreitWignerChart(w, h, currentS) {
  colliderCtx2D.clearRect(0, 0, w, h);
  
  const padX = 45;
  const padY = 30;
  const graphW = w - padX * 2;
  const graphH = h - padY * 2;
  
  // Axes
  colliderCtx2D.strokeStyle = 'rgba(255,255,255,0.1)';
  colliderCtx2D.lineWidth = 1;
  colliderCtx2D.beginPath();
  colliderCtx2D.moveTo(padX, padY);
  colliderCtx2D.lineTo(padX, h - padY);
  colliderCtx2D.lineTo(w - padX, h - padY);
  colliderCtx2D.stroke();
  
  // Set parameters based on selection
  let M = 91.1876;
  let Gamma = 2.4952;
  let minE = 75.0, maxE = 105.0;
  
  if (selectedColliderTargetSymbol === 'H0') {
    M = 125.25;
    Gamma = 0.0041; // Extremely narrow peak
    minE = 124.0;
    maxE = 126.5;
  }
  
  // Breit-Wigner formula
  function getBreitWignerCrossSection(E) {
    const sVal = E * E;
    const mVal = M * M;
    const gamVal = Gamma * Gamma;
    
    if (selectedColliderTargetSymbol === 'H0') {
      // Scale Higgs peak to be visually outstanding
      const widthDamping = 0.05; // artificially wide width for plot visibility, otherwise Higgs needle is completely invisible on 2D resolution!
      const denom = (E - M) * (E - M) + widthDamping * widthDamping;
      return (widthDamping * widthDamping) / (denom || 1);
    }
    
    // Z0 relativistic Breit-Wigner
    const num = sVal * gamVal;
    const denom = (sVal - mVal) * (sVal - mVal) + mVal * gamVal;
    return num / (denom || 1);
  }
  
  // Draw curve
  const points = [];
  const steps = 150;
  for (let i = 0; i <= steps; i++) {
    const E = minE + (i / steps) * (maxE - minE);
    const val = getBreitWignerCrossSection(E);
    points.push({ E, val });
  }
  
  // Find max val for normalization
  const maxVal = Math.max(...points.map(pt => pt.val)) || 1.0;
  
  colliderCtx2D.beginPath();
  points.forEach((pt, idx) => {
    const x = padX + ((pt.E - minE) / (maxE - minE)) * graphW;
    const y = (h - padY) - (pt.val / maxVal) * graphH;
    if (idx === 0) colliderCtx2D.moveTo(x, y);
    else colliderCtx2D.lineTo(x, y);
  });
  
  const accentColor = selectedColliderTargetSymbol === 'H0' ? '#00ffaa' : '#a855f7';
  
  colliderCtx2D.strokeStyle = accentColor;
  colliderCtx2D.lineWidth = 2.5;
  colliderCtx2D.shadowBlur = 10;
  colliderCtx2D.shadowColor = accentColor;
  colliderCtx2D.stroke();
  colliderCtx2D.shadowBlur = 0;
  
  // Draw current energy vertical marker bar
  const curX = padX + ((currentS - minE) / (maxE - minE)) * graphW;
  colliderCtx2D.strokeStyle = '#00f0ff';
  colliderCtx2D.lineWidth = 1.5;
  colliderCtx2D.setLineDash([3, 3]);
  colliderCtx2D.beginPath();
  colliderCtx2D.moveTo(curX, padY - 5);
  colliderCtx2D.lineTo(curX, h - padY);
  colliderCtx2D.stroke();
  colliderCtx2D.setLineDash([]);
  
  // Draw marker pointer
  colliderCtx2D.fillStyle = '#00f0ff';
  colliderCtx2D.beginPath();
  colliderCtx2D.moveTo(curX, padY - 8);
  colliderCtx2D.lineTo(curX - 4, padY - 14);
  colliderCtx2D.lineTo(curX + 4, padY - 14);
  colliderCtx2D.fill();
  
  // Add labels and title
  colliderCtx2D.fillStyle = '#fff';
  colliderCtx2D.font = 'bold 8px Space Grotesk';
  colliderCtx2D.textAlign = 'center';
  colliderCtx2D.fillText(`${minE} GeV`, padX, h - padY + 12);
  colliderCtx2D.fillText(`${M.toFixed(1)} GeV (Peak)`, padX + ((M - minE) / (maxE - minE)) * graphW, h - padY + 12);
  colliderCtx2D.fillText(`${maxE} GeV`, w - padX, h - padY + 12);
  
  colliderCtx2D.textAlign = 'right';
  colliderCtx2D.fillText('σ (Cross-section)', padX - 8, padY + 5);
  
  colliderCtx2D.textAlign = 'left';
  colliderCtx2D.font = 'bold 9px Space Grotesk';
  colliderCtx2D.fillText(`Breit-Wigner Curve: ${selectedColliderTargetSymbol} Resonance Profile`, padX + 5, padY - 12);
}

function startColliderDetectorSimulation(w, h, currentS) {
  if (colliderLoopId) {
    cancelAnimationFrame(colliderLoopId);
    colliderLoopId = null;
  }
  
  // Target mass and width
  let M = 91.1876;
  let errorMargin = 2.0; // GeV margin for Z0 resonance trigger
  
  if (selectedColliderTargetSymbol === 'H0') {
    M = 125.25;
    errorMargin = 0.08; // extremely narrow margin for Higgs resonance trigger
  }
  
  const resonanceDistance = Math.abs(currentS - M);
  const isResonanceActive = resonanceDistance <= errorMargin;
  
  const alertEl = document.getElementById('collider-resonance-status-alert');
  if (alertEl) {
    if (isResonanceActive) {
      alertEl.textContent = `✨ RESONANCE ACTIVE (공명 생성 활성화: ΔE = ${resonanceDistance.toFixed(2)} GeV) ✨`;
      alertEl.style.background = 'rgba(0, 255, 170, 0.12)';
      alertEl.style.borderColor = '#00ffaa';
      alertEl.style.color = '#00ffaa';
      alertEl.style.textShadow = '0 0 10px rgba(0, 255, 170, 0.4)';
    } else {
      alertEl.textContent = `OFF RESONANCE (비공명 상태: ΔE = ${resonanceDistance.toFixed(2)} GeV)`;
      alertEl.style.background = 'rgba(255, 255, 255, 0.02)';
      alertEl.style.borderColor = 'var(--border-color)';
      alertEl.style.color = 'var(--color-text-muted)';
      alertEl.style.textShadow = 'none';
    }
  }
  
  const centerX = w / 2;
  const centerY = h / 2;
  
  // Particle streams (colliding beams)
  const leftBeam = [];
  const rightBeam = [];
  
  // Resonance explosion particles
  const jets = [];
  
  function triggerResonanceExplosion() {
    const jetsCount = selectedColliderTargetSymbol === 'H0' ? 4 : (18 + Math.floor(Math.random() * 12));
    const jetColor = selectedColliderTargetSymbol === 'H0' ? '#00ffaa' : '#a855f7';
    
    if (selectedColliderTargetSymbol === 'H0') {
      // Higgs golden channel: 4-muon decay (straight neon tracks)
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + (Math.random() - 0.5) * 0.2;
        const speed = 3.5;
        jets.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: '#00ffaa',
          size: 2.0,
          decay: 0.012,
          alpha: 1.0,
          isHiggsMuon: true
        });
      }
    } else {
      // Z0 Standard hadronic/leptonic jet curves
      for (let i = 0; i < jetsCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        const curve = (Math.random() - 0.5) * 0.06; // magnetic curve
        jets.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: i % 2 === 0 ? '#a855f7' : '#00f0ff',
          size: 1.5 + Math.random() * 1.5,
          decay: 0.015 + Math.random() * 0.015,
          alpha: 1.0,
          curve
        });
      }
    }
  }
  
  let frame = 0;
  
  function draw() {
    colliderCtxEvent.fillStyle = 'rgba(5, 7, 20, 0.2)';
    colliderCtxEvent.fillRect(0, 0, w, h);
    
    // Draw detector crosshairs
    colliderCtxEvent.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    colliderCtxEvent.lineWidth = 1;
    colliderCtxEvent.beginPath();
    colliderCtxEvent.arc(centerX, centerY, h / 3.5, 0, Math.PI*2);
    colliderCtxEvent.arc(centerX, centerY, h / 2.0, 0, Math.PI*2);
    colliderCtxEvent.stroke();
    
    colliderCtxEvent.beginPath();
    colliderCtxEvent.moveTo(0, centerY); colliderCtxEvent.lineTo(w, centerY);
    colliderCtxEvent.moveTo(centerX, 0); colliderCtxEvent.lineTo(centerX, h);
    colliderCtxEvent.stroke();
    
    // Spawn incoming beam packets
    if (frame % 4 === 0) {
      leftBeam.push({ x: 30, y: centerY, vx: 5, color: '#00f0ff' });
      rightBeam.push({ x: w - 30, y: centerY, vx: -5, color: '#ec4899' });
    }
    
    // Update and draw left beam
    colliderCtxEvent.fillStyle = '#00f0ff';
    for (let i = leftBeam.length - 1; i >= 0; i--) {
      const b = leftBeam[i];
      b.x += b.vx;
      colliderCtxEvent.beginPath();
      colliderCtxEvent.arc(b.x, b.y, 2, 0, Math.PI*2);
      colliderCtxEvent.fill();
      
      if (b.x >= centerX) {
        // Impact!
        if (isResonanceActive && Math.random() > 0.4) {
          triggerResonanceExplosion();
        }
        leftBeam.splice(i, 1);
      }
    }
    
    // Update and draw right beam
    colliderCtxEvent.fillStyle = '#ec4899';
    for (let i = rightBeam.length - 1; i >= 0; i--) {
      const b = rightBeam[i];
      b.x += b.vx;
      colliderCtxEvent.beginPath();
      colliderCtxEvent.arc(b.x, b.y, 2, 0, Math.PI*2);
      colliderCtxEvent.fill();
      
      if (b.x <= centerX) {
        rightBeam.splice(i, 1);
      }
    }
    
    // Update and draw resonance jets
    for (let i = jets.length - 1; i >= 0; i--) {
      const j = jets[i];
      
      if (j.curve) {
        // Curve track under magnetic field
        const originalSpeed = Math.sqrt(j.vx*j.vx + j.vy*j.vy);
        const currentAngle = Math.atan2(j.vy, j.vx) + j.curve;
        j.vx = Math.cos(currentAngle) * originalSpeed;
        j.vy = Math.sin(currentAngle) * originalSpeed;
      }
      
      j.x += j.vx;
      j.y += j.vy;
      j.alpha -= j.decay;
      
      if (j.alpha <= 0 || j.x < 0 || j.x > w || j.y < 0 || j.y > h) {
        jets.splice(i, 1);
        continue;
      }
      
      colliderCtxEvent.fillStyle = j.color;
      colliderCtxEvent.globalAlpha = j.alpha;
      colliderCtxEvent.beginPath();
      
      if (j.isHiggsMuon) {
        // Draw golden straight four muon lines
        colliderCtxEvent.strokeStyle = '#00ffaa';
        colliderCtxEvent.lineWidth = 2.5;
        colliderCtxEvent.shadowBlur = 12;
        colliderCtxEvent.shadowColor = '#00ffaa';
        colliderCtxEvent.beginPath();
        colliderCtxEvent.moveTo(centerX, centerY);
        colliderCtxEvent.lineTo(j.x, j.y);
        colliderCtxEvent.stroke();
        colliderCtxEvent.shadowBlur = 0; // reset
      } else {
        colliderCtxEvent.arc(j.x, j.y, j.size, 0, Math.PI*2);
        colliderCtxEvent.fill();
      }
      colliderCtxEvent.globalAlpha = 1.0;
    }
    
    // Highlight central collision point
    if (isResonanceActive) {
      const glow = 5 + Math.sin(frame * 0.2) * 2.5;
      colliderCtxEvent.strokeStyle = selectedColliderTargetSymbol === 'H0' ? 'rgba(0, 255, 170, 0.4)' : 'rgba(168, 85, 247, 0.4)';
      colliderCtxEvent.lineWidth = 1.5;
      colliderCtxEvent.beginPath();
      colliderCtxEvent.arc(centerX, centerY, glow, 0, Math.PI*2);
      colliderCtxEvent.stroke();
    }
    
    frame++;
    colliderLoopId = requestAnimationFrame(draw);
  }
  
  draw();
}

function renderColliderPhysicsMath() {
  const container = document.getElementById('collider-physics-details');
  if (!container) return;
  
  let html = '';
  
  if (selectedColliderTargetSymbol === 'H0') {
    html = `
      <div class="physics-formula-title">
        <span>🎯 힉스 보손 ($H^0$) 가속기 공명 생성 및 황금 채널 (Golden Channel)</span>
        <span style="color: var(--color-scalar); font-weight: bold;">M = 125.25 GeV</span>
      </div>
      <p style="margin-bottom: 0.5rem;">
        힉스 보손($H^0$)은 붕괴 폭 $\\Gamma_H \\approx 4.1 \\text{ MeV}$ ($0.0041 \\text{ GeV}$)로 극도로 좁은 에너지 피크를 갖는 정교한 양자 상태입니다.
      </p>
      <div class="physics-formula-math">
        \\Gamma_H \\cdot \\tau_H \\approx \\hbar \\quad \\Rightarrow \\quad \\tau_H \\approx 1.6 \\times 10^{-22} \\text{ s}
      </div>
      <p style="font-size: 0.75rem;">
        <b>황금 채널 (Golden Channel) 시뮬레이션</b>: 힉스의 공명 에너지인 $125.25 \\text{ GeV}$ 근처에 빔 에너지를 정확히 조율하면, 힉스 보손 생성과 함께 $H^0 \\to Z^0 Z^0 \\to \\mu^+\\mu^-\\mu^+\\mu^-$ (4-Muon) 형태의 선명한 골든 트랙 폭발이 검출기 상에 에메랄드 네온 광채로 실시간 드로잉됩니다!
      </p>
    `;
  } else {
    // Z0
    html = `
      <div class="physics-formula-title">
        <span>⚡ Z 보손 ($Z^0$) 상대론적 Breit-Wigner 공명 공식</span>
        <span style="color: var(--color-boson); font-weight: bold;">M = 91.19 GeV</span>
      </div>
      <p style="margin-bottom: 0.5rem;">
        가속 충돌 중심 에너지 $\\sqrt{s}$에 대한 Z 보손 생성 단면적 $\\sigma$은 <b>상대론적 브라이트-위그너(Relativistic Breit-Wigner)</b> 공식을 엄격히 따릅니다.
      </p>
      <div class="physics-formula-math">
        \\sigma(s) = \\sigma_{\\text{peak}} \\frac{s \\Gamma_Z^2}{(s - M_Z^2)^2 + M_Z^2 \\Gamma_Z^2}
      </div>
      <p style="font-size: 0.75rem;">
        여기서 $M_Z \\approx 91.19 \\text{ GeV}$, $\\Gamma_Z \\approx 2.495 \\text{ GeV}$ 이며, 붕괴 폭 $\\Gamma_Z$에 의해 공명 피크의 반가폭(FWHM)이 넓은 종 모양(Bell shape) 곡선을 나타내어, 에너지가 피크 근방 $\\pm 2 \\text{ GeV}$ 범위에 있을 때 가속기 충돌 중심에서 격렬한 하드론 다중 제트(Hadronic Jets) 공명 생성 이벤트가 터져나옵니다.
      </p>
    `;
  }
  
  container.innerHTML = html;
}

// ----------------------------------------------------
// HIGGS SSB & MEXICAN HAT SIMULATOR LOGIC
// ----------------------------------------------------

function initHiggsSSBLab() {
  canvasHiggsSsb = document.getElementById('canvas-higgs-ssb');
  if (!canvasHiggsSsb) return;
  
  ctxHiggsSsb = canvasHiggsSsb.getContext('2d');
  
  // Set explicit dimensions based on bounds
  const rect = canvasHiggsSsb.getBoundingClientRect();
  canvasHiggsSsb.width = rect.width * window.devicePixelRatio;
  canvasHiggsSsb.height = rect.height * window.devicePixelRatio;
  ctxHiggsSsb.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  // Reset state
  isSSBTriggered = false;
  higgsBall.phi1 = 0.0;
  higgsBall.phi2 = 0.0;
  higgsBall.v1 = 0.0;
  higgsBall.v2 = 0.0;
  higgsBall.trail = [];
  higgsRotationAngle = 0;
  
  // Apply slider configurations
  updateHiggsPotential();
  
  // Start animation loop
  if (higgsLoopId) {
    cancelAnimationFrame(higgsLoopId);
  }
  
  function play() {
    if (rightPanelTab !== 'higgs-ssb') return;
    
    // Physics Step
    updateHiggsPhysics();
    
    // Draw
    drawHiggsSSBChamber();
    
    higgsRotationAngle += 0.005; // slowly rotate the potential
    higgsLoopId = requestAnimationFrame(play);
  }
  
  play();
}

function updateHiggsPotential() {
  const mu2Slider = document.getElementById('slider-higgs-mu2');
  const lambdaSlider = document.getElementById('slider-higgs-lambda');
  
  if (mu2Slider) {
    higgsMu2 = parseFloat(mu2Slider.value);
    document.getElementById('label-higgs-mu2').innerText = higgsMu2.toFixed(1);
  }
  
  if (lambdaSlider) {
    higgsLambda = parseFloat(lambdaSlider.value);
    document.getElementById('label-higgs-lambda').innerText = higgsLambda.toFixed(2);
  }
  
  // Update theoretical verification math card
  renderHiggsPhysicsMath();
}

function triggerSSB() {
  isSSBTriggered = true;
  
  // Inject tiny random thermal fluctuation to break meta-stable symmetric state at origin (Phi=0)
  const angle = Math.random() * Math.PI * 2;
  const epsilon = 0.02; // seed displacement
  
  higgsBall.phi1 = epsilon * Math.cos(angle);
  higgsBall.phi2 = epsilon * Math.sin(angle);
  higgsBall.v1 = 0.0;
  higgsBall.v2 = 0.0;
  higgsBall.trail = [];
  
  // Update status UI
  const alertEl = document.getElementById('higgs-ssb-status-alert');
  if (alertEl) {
    alertEl.innerHTML = `⚡ SPONTANEOUS SYMMETRY BROKEN (대칭성 자발적 깨짐 진행 중)`;
    alertEl.style.color = '#00ffa0';
    alertEl.style.borderColor = 'rgba(0, 255, 160, 0.3)';
    alertEl.style.background = 'rgba(0, 255, 160, 0.05)';
  }
}

function restoreSymmetry() {
  isSSBTriggered = false;
  
  // Reset ball position
  higgsBall.phi1 = 0.0;
  higgsBall.phi2 = 0.0;
  higgsBall.v1 = 0.0;
  higgsBall.v2 = 0.0;
  higgsBall.trail = [];
  
  // Update status UI
  const alertEl = document.getElementById('higgs-ssb-status-alert');
  if (alertEl) {
    alertEl.innerHTML = `SYMMETRIC STATE (대칭 상태, &Phi; = 0)`;
    alertEl.style.color = 'var(--color-text-muted)';
    alertEl.style.borderColor = 'var(--border-color)';
    alertEl.style.background = 'rgba(255, 255, 255, 0.02)';
  }
  
  renderHiggsPhysicsMath();
}

function updateHiggsPhysics() {
  const dt = 0.05;
  const damping = 0.07;
  
  if (isSSBTriggered) {
    const r2 = higgsBall.phi1 * higgsBall.phi1 + higgsBall.phi2 * higgsBall.phi2;
    
    // Pot: V = -mu^2*|Phi|^2 + lambda*|Phi|^4
    // F = -grad V = (2 * mu^2 - 4 * lambda * |Phi|^2) * Phi
    const f1 = (2 * higgsMu2 - 4 * higgsLambda * r2) * higgsBall.phi1;
    const f2 = (2 * higgsMu2 - 4 * higgsLambda * r2) * higgsBall.phi2;
    
    const a1 = f1 - damping * higgsBall.v1;
    const a2 = f2 - damping * higgsBall.v2;
    
    higgsBall.v1 += a1 * dt;
    higgsBall.v2 += a2 * dt;
    higgsBall.phi1 += higgsBall.v1 * dt;
    higgsBall.phi2 += higgsBall.v2 * dt;
    
    // Accumulate trajectory
    higgsBall.trail.push({phi1: higgsBall.phi1, phi2: higgsBall.phi2});
    if (higgsBall.trail.length > 150) {
      higgsBall.trail.shift();
    }
    
    // Check if settled in the valley
    const valleyR = higgsMu2 > 0 ? Math.sqrt(higgsMu2 / (2 * higgsLambda)) : 0;
    const currentR = Math.sqrt(r2);
    const speed = Math.sqrt(higgsBall.v1 * higgsBall.v1 + higgsBall.v2 * higgsBall.v2);
    
    if (valleyR > 0 && Math.abs(currentR - valleyR) < 0.05 && speed < 0.1) {
      const alertEl = document.getElementById('higgs-ssb-status-alert');
      if (alertEl) {
        alertEl.innerHTML = `🏆 SSB SETTLED // VACUUM EXPECTATION VALUE (VEV) ACQUIRED`;
        alertEl.style.color = '#38bdf8';
        alertEl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        alertEl.style.background = 'rgba(56, 189, 248, 0.08)';
      }
    }
  } else {
    // Restoring to symmetric state origin (spring force bowl)
    const k = 4.0;
    const f1 = -k * higgsBall.phi1;
    const f2 = -k * higgsBall.phi2;
    
    const a1 = f1 - 0.12 * higgsBall.v1;
    const a2 = f2 - 0.12 * higgsBall.v2;
    
    higgsBall.v1 += a1 * dt;
    higgsBall.v2 += a2 * dt;
    higgsBall.phi1 += higgsBall.v1 * dt;
    higgsBall.phi2 += higgsBall.v2 * dt;
    
    if (higgsBall.trail.length > 0) {
      higgsBall.trail.shift();
    }
  }
}

function projectHiggs3D(x, y, z) {
  // 1. Rotate Z
  const cosRot = Math.cos(higgsRotationAngle);
  const sinRot = Math.sin(higgsRotationAngle);
  const x1 = x * cosRot - y * sinRot;
  const y1 = x * sinRot + y * cosRot;
  const z1 = z;
  
  // 2. Pitch camera angle
  const pitch = 0.65; // ~37 degrees tilt
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  
  const x2 = x1;
  const y2 = y1 * cosPitch - z1 * sinPitch;
  const z2 = y1 * sinPitch + z1 * cosPitch;
  
  // 3. Scale and project to screen coordinates
  const perspective = 5.0 / (5.0 + y2 * 0.18);
  const scale = 50 * perspective;
  
  const w = canvasHiggsSsb.width / window.devicePixelRatio;
  const h = canvasHiggsSsb.height / window.devicePixelRatio;
  
  const centerX = w / 2;
  const centerY = h / 2 + 10;
  
  return {
    x: centerX + x2 * scale,
    y: centerY - z2 * scale,
    depth: y2
  };
}

function drawHiggsSSBChamber() {
  if (!ctxHiggsSsb) return;
  
  const w = canvasHiggsSsb.width / window.devicePixelRatio;
  const h = canvasHiggsSsb.height / window.devicePixelRatio;
  
  // Clean canvas
  ctxHiggsSsb.fillStyle = '#020308';
  ctxHiggsSsb.fillRect(0, 0, w, h);
  
  // Draw complex space grid lines (constant z=0 background grid)
  ctxHiggsSsb.strokeStyle = 'rgba(99, 102, 241, 0.04)';
  ctxHiggsSsb.lineWidth = 1;
  const step = 0.4;
  for (let g = -2.0; g <= 2.0; g += step) {
    // grid lines along X
    ctxHiggsSsb.beginPath();
    let first = true;
    for (let t = -2.0; t <= 2.0; t += 0.2) {
      const proj = projectHiggs3D(t, g, -0.6); // slight offset down
      if (first) { ctxHiggsSsb.moveTo(proj.x, proj.y); first = false; }
      else ctxHiggsSsb.lineTo(proj.x, proj.y);
    }
    ctxHiggsSsb.stroke();
    
    // grid lines along Y
    ctxHiggsSsb.beginPath();
    first = true;
    for (let t = -2.0; t <= 2.0; t += 0.2) {
      const proj = projectHiggs3D(g, t, -0.6);
      if (first) { ctxHiggsSsb.moveTo(proj.x, proj.y); first = false; }
      else ctxHiggsSsb.lineTo(proj.x, proj.y);
    }
    ctxHiggsSsb.stroke();
  }
  
  // Math constants for the potential wireframe
  const maxR = 2.0;
  const numRings = 12;
  const numRays = 16;
  
  // Draw Ray lines of the Mexican Hat
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    ctxHiggsSsb.beginPath();
    let first = true;
    
    for (let r = 0; r <= maxR; r += 0.1) {
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      
      // Potential function V_sim = -mu2 * r^2 + lambda * r^4
      // Scaling factor inside canvas: V_height = -mu2 * r^2 + lambda * r^4
      const z = -higgsMu2 * (r*r) + higgsLambda * Math.pow(r, 4);
      
      const proj = projectHiggs3D(x, y, z * 0.18); // height scaling
      if (first) {
        ctxHiggsSsb.moveTo(proj.x, proj.y);
        first = false;
      } else {
        ctxHiggsSsb.lineTo(proj.x, proj.y);
      }
    }
    
    // Depth-cueing alpha
    const midProj = projectHiggs3D(maxR * Math.cos(angle)/2, maxR * Math.sin(angle)/2, 0);
    const alpha = Math.max(0.12, Math.min(0.65, 0.65 - (midProj.depth + 1.2) / 3.5));
    ctxHiggsSsb.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
    ctxHiggsSsb.lineWidth = 1;
    ctxHiggsSsb.stroke();
  }
  
  // Draw concentric Rings of the Mexican Hat
  for (let rIdx = 1; rIdx <= numRings; rIdx++) {
    const r = (rIdx / numRings) * maxR;
    ctxHiggsSsb.beginPath();
    let first = true;
    
    for (let j = 0; j <= 64; j++) {
      const angle = (j / 64) * Math.PI * 2;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      const z = -higgsMu2 * (r*r) + higgsLambda * Math.pow(r, 4);
      
      const proj = projectHiggs3D(x, y, z * 0.18);
      if (first) {
        ctxHiggsSsb.moveTo(proj.x, proj.y);
        first = false;
      } else {
        ctxHiggsSsb.lineTo(proj.x, proj.y);
      }
    }
    
    // Check if this ring represents the VEV minimum valley
    const valleyR = higgsMu2 > 0 ? Math.sqrt(higgsMu2 / (2 * higgsLambda)) : 0;
    const isValley = valleyR > 0 && Math.abs(r - valleyR) < (maxR / numRings);
    
    const midProj = projectHiggs3D(0, r, 0);
    const alpha = Math.max(0.15, Math.min(0.7, 0.7 - (midProj.depth + 1.2) / 3.5));
    
    if (isValley && isSSBTriggered) {
      // Highlight the vacuum gold ring representing SSB degeneracy (U(1) Goldstone Boson circle)
      ctxHiggsSsb.strokeStyle = `rgba(0, 255, 160, ${alpha * 1.6})`;
      ctxHiggsSsb.lineWidth = 2.0;
    } else {
      ctxHiggsSsb.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
      ctxHiggsSsb.lineWidth = 1;
    }
    ctxHiggsSsb.stroke();
  }
  
  // Draw Vacuum Manifold marker label if symmetry is broken
  const valleyR = higgsMu2 > 0 ? Math.sqrt(higgsMu2 / (2 * higgsLambda)) : 0;
  if (valleyR > 0 && isSSBTriggered) {
    const projLabel = projectHiggs3D(valleyR * Math.cos(-higgsRotationAngle), valleyR * Math.sin(-higgsRotationAngle), -higgsMu2 * (valleyR*valleyR) + higgsLambda * Math.pow(valleyR, 4));
    ctxHiggsSsb.fillStyle = '#00ffa0';
    ctxHiggsSsb.font = 'bold 9px Space Grotesk';
    ctxHiggsSsb.fillText('✨ Vacuum Valley (VEV Minimum)', projLabel.x + 8, projLabel.y - 4);
    
    ctxHiggsSsb.fillStyle = 'rgba(0, 255, 160, 0.15)';
    ctxHiggsSsb.beginPath();
    ctxHiggsSsb.arc(projLabel.x, projLabel.y, 4, 0, Math.PI*2);
    ctxHiggsSsb.fill();
  }
  
  // Draw Higgs Ball Trail (3D overlay)
  if (higgsBall.trail.length > 1) {
    ctxHiggsSsb.beginPath();
    let first = true;
    for (let i = 0; i < higgsBall.trail.length; i++) {
      const p = higgsBall.trail[i];
      const r_p = Math.sqrt(p.phi1*p.phi1 + p.phi2*p.phi2);
      const z_p = -higgsMu2 * (r_p*r_p) + higgsLambda * Math.pow(r_p, 4);
      
      const proj_p = projectHiggs3D(p.phi1, p.phi2, z_p * 0.18);
      if (first) {
        ctxHiggsSsb.moveTo(proj_p.x, proj_p.y);
        first = false;
      } else {
        ctxHiggsSsb.lineTo(proj_p.x, proj_p.y);
      }
    }
    
    // Trail Gradient / Glow
    ctxHiggsSsb.strokeStyle = 'rgba(0, 255, 160, 0.45)';
    ctxHiggsSsb.lineWidth = 2.5;
    ctxHiggsSsb.stroke();
  }
  
  // Draw Higgs Ball (3D sphere projection)
  const r_b = Math.sqrt(higgsBall.phi1 * higgsBall.phi1 + higgsBall.phi2 * higgsBall.phi2);
  const z_b = -higgsMu2 * (r_b*r_b) + higgsLambda * Math.pow(r_b, 4);
  const projBall = projectHiggs3D(higgsBall.phi1, higgsBall.phi2, z_b * 0.18);
  
  // Glowing Neon Higgs particle representation
  ctxHiggsSsb.shadowColor = '#00ffa0';
  ctxHiggsSsb.shadowBlur = 12;
  
  ctxHiggsSsb.beginPath();
  ctxHiggsSsb.arc(projBall.x, projBall.y, 7, 0, Math.PI * 2);
  
  const ballGrad = ctxHiggsSsb.createRadialGradient(
    projBall.x - 2, projBall.y - 2, 0,
    projBall.x, projBall.y, 7
  );
  ballGrad.addColorStop(0, '#ffffff');
  ballGrad.addColorStop(0.4, '#00ffa0');
  ballGrad.addColorStop(1, '#005f3f');
  
  ctxHiggsSsb.fillStyle = ballGrad;
  ctxHiggsSsb.fill();
  
  ctxHiggsSsb.shadowBlur = 0; // reset
  
  // Label Higgs field sphere
  ctxHiggsSsb.fillStyle = '#ffffff';
  ctxHiggsSsb.font = 'bold 10px Space Grotesk';
  ctxHiggsSsb.fillText('Φ(x)', projBall.x - 12, projBall.y - 12);
}

function renderHiggsPhysicsMath() {
  const container = document.getElementById('higgs-physics-details');
  if (!container) return;
  
  const mu2 = higgsMu2;
  const lambda = higgsLambda;
  
  // Calculate simulated VEV: v = sqrt(mu2 / lambda)
  let v_sim = 0;
  if (mu2 > 0) {
    v_sim = Math.sqrt(mu2 / lambda);
  }
  
  const statusStr = isSSBTriggered 
    ? `<span style="color: #00ffa0; font-weight: bold; text-shadow: 0 0 10px rgba(0,255,160,0.3);">⚡ SPONTANEOUS SYMMETRY BROKEN (자발적 대칭성 깨짐)</span>` 
    : `<span style="color: var(--color-text-muted); font-weight: bold;">🔒 SYMMETRIC VACUUM (대칭적 진공 상태)</span>`;
    
  let html = `
    <div class="physics-formula-title">
      <span>✨ Higgs Field Vacuum & Gauge Boson Mass Generation</span>
      ${statusStr}
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      복소 힉스 이중항 필드 $\\Phi$ 의 라그랑지안 포텐셜은 다음과 같이 주어집니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0;">
        V(\\Phi) = -\\mu^2 |\\Phi|^2 + \\lambda |\\Phi|^4
      </div>
  `;
  
  if (mu2 > 0) {
    html += `
      <p style="margin-bottom: 0.5rem;">
        현재 설정된 파라미터 ($\\mu^2 = ${mu2.toFixed(1)}$, $\\lambda = ${lambda.toFixed(2)}$) 하에서, 전역 $U(1)$ 게이지 대칭성은 자발적으로 깨지며 진공 기댓값(VEV, $v$)을 획득합니다:
      </p>
      <div class="physics-formula-math" style="margin: 0.25rem 0;">
        v = \\sqrt{\\frac{\\mu^2}{\\lambda}} = \\sqrt{\\frac{${mu2.toFixed(1)}}{${lambda.toFixed(2)}}} \\approx ${v_sim.toFixed(3)} \\text{ (Simulated VEV)}
      </div>
      <p style="margin-top: 0.5rem; margin-bottom: 0.5rem;">
        <b>물리계 대응 검증 (Weinberg Electroweak Theory)</b>:<br>
        실제 자연계의 전약력(Electroweak) 진공 기대값은 $v_{\\text{physical}} = 246.22 \\text{ GeV}$ 입니다. 이 VEV와 약전자기 결합 상수들로부터 게이지 보손의 질량이 수학적으로 유도됩니다:
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0.5rem 0; font-family: var(--font-mono); font-size: 0.75rem;">
        <div style="padding: 0.4rem; border-radius: 4px; background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.15);">
          <div style="color: var(--color-boson); font-weight: bold; margin-bottom: 0.15rem;">W&sup1;, W&sup2;, W&sup3; Bosons (g = 0.6517)</div>
          <div>M_W = &frac12; g v</div>
          <div style="color: #fff; font-size: 0.8rem; margin-top: 0.2rem;">&approx; 80.23 GeV</div>
          <div style="font-size: 0.7rem; color: var(--color-text-muted);">Actual W&plusmn; Mass: 80.38 GeV (Error &lt; 0.2%)</div>
        </div>
        <div style="padding: 0.4rem; border-radius: 4px; background: rgba(0, 255, 170, 0.05); border: 1px solid rgba(0, 255, 170, 0.15);">
          <div style="color: var(--color-scalar); font-weight: bold; margin-bottom: 0.15rem;">Z&deg; Boson (g' = 0.3572)</div>
          <div>M_Z = &frac12; &radic;(g&sup2; + g'&sup2;) v</div>
          <div style="color: #fff; font-size: 0.8rem; margin-top: 0.2rem;">&approx; 91.19 GeV</div>
          <div style="font-size: 0.7rem; color: var(--color-text-muted);">Actual Z&deg; Mass: 91.19 GeV (Error &lt; 0.01%)</div>
        </div>
      </div>
      <p style="font-size: 0.75rem; color: var(--color-text-muted);">
        <b>Goldstone & Higgs Mode</b>: 대칭성이 깨진 후, 질량이 없는 회전 모드(Goldstone Boson)는 게이지 보손 $W^\\pm, Z^0$의 종편광(Longitudinal Polarization) 상태로 흡수되어 <b>질량을 부여("먹어버림")</b>하고, 반경 방향의 진동 모드는 물리적인 <b>힉스 보손($H^0$, 질량 가짐)</b>으로 남아 관측됩니다.
      </p>
    `;
  } else {
    html += `
      <p style="margin-bottom: 0.5rem; color: #ff3366;">
        $\\mu^2 = 0.0$ 이므로 자발적 대칭성 깨짐이 발생하지 않습니다. 진공 기대값(VEV) $v = 0$ 이며, 모든 게이지 보손들은 <b>질량이 없는 상태(Massless)</b>로 존재하여 전자기력과 약력이 동일한 세기로 작용합니다.
      </p>
    `;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// ----------------------------------------------------
// BSM SUPERSYMMETRY & LSP DARK MATTER MET LAB LOGIC
// ----------------------------------------------------

function initSUSYLab() {
  canvasSusyDetector = document.getElementById('canvas-susy-detector');
  if (!canvasSusyDetector) return;
  
  ctxSusyDetector = canvasSusyDetector.getContext('2d');
  
  // Set explicit dimensions based on bounds
  const rect = canvasSusyDetector.getBoundingClientRect();
  canvasSusyDetector.width = rect.width * window.devicePixelRatio;
  canvasSusyDetector.height = rect.height * window.devicePixelRatio;
  ctxSusyDetector.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  // Reset state
  susyParticles = [];
  susyLSPParticles = [];
  susyCollisionActive = false;
  susyCollisionFrame = 0;
  susyMETVector = {x: 0, y: 0, magnitude: 0};
  
  // Initialize slider states & maths
  updateSUSYParameters();
  
  // Start animation loop
  if (susyLoopId) {
    cancelAnimationFrame(susyLoopId);
  }
  
  function play() {
    if (rightPanelTab !== 'susy') return;
    
    // Physics & Frame update
    updateSUSYPhysics();
    
    // Render Detector
    drawSUSYChamber();
    
    susyLoopId = requestAnimationFrame(play);
  }
  
  play();
}

function updateSUSYParameters() {
  const gluinoSlider = document.getElementById('slider-susy-gluino');
  const lspSlider = document.getElementById('slider-susy-lsp');
  
  if (gluinoSlider) {
    susyGluinoMass = parseFloat(gluinoSlider.value);
    document.getElementById('label-susy-gluino').innerText = susyGluinoMass.toFixed(1) + " TeV";
  }
  
  if (lspSlider && gluinoSlider) {
    // Dynamic constraint: LSP mass must be strictly lighter than gluino mass for decay to be kinematically allowed
    const maxLSP = Math.floor(susyGluinoMass * 1000 - 150); // Margin of 150 GeV
    let currentLSP = parseInt(lspSlider.value);
    
    if (currentLSP > maxLSP) {
      currentLSP = maxLSP;
      lspSlider.value = currentLSP;
    }
    
    // Adjust slider range dynamically
    lspSlider.max = maxLSP;
    
    susyLSPMass = currentLSP;
    document.getElementById('label-susy-lsp').innerText = susyLSPMass + " GeV";
  }
  
  // Update real-time mathematical panel
  renderSUSYPhysicsMath();
}

function toggleRParityConservation() {
  isRParityConserved = !isRParityConserved;
  
  const toggleBtn = document.getElementById('btn-toggle-rparity');
  const descEl = document.getElementById('label-susy-rparity-desc');
  
  if (isRParityConserved) {
    toggleBtn.innerHTML = "🛡️ R-Parity ON";
    toggleBtn.style.color = "var(--color-boson)";
    toggleBtn.style.borderColor = "var(--color-boson)";
    toggleBtn.style.background = "rgba(168, 85, 247, 0.05)";
    if (descEl) descEl.innerText = "CONSERVED: LSP is perfectly stable (Dark Matter MET active)";
  } else {
    toggleBtn.innerHTML = "⚠️ R-Parity OFF (RPV)";
    toggleBtn.style.color = "#ff3366";
    toggleBtn.style.borderColor = "#ff3366";
    toggleBtn.style.background = "rgba(255, 51, 102, 0.05)";
    if (descEl) descEl.innerText = "VIOLATED: LSP decays to SM leptons (MET signature vanishes)";
  }
  
  // Re-render math card
  renderSUSYPhysicsMath();
}

function triggerSUSYCollision() {
  susyCollisionActive = true;
  susyCollisionFrame = 0;
  susyParticles = [];
  susyLSPParticles = [];
  
  // Initialize status alert
  const alertEl = document.getElementById('susy-status-alert');
  if (alertEl) {
    alertEl.innerHTML = `⚡ BEAM INJECTION ACTIVE // PP COLLISION IMMINENT`;
    alertEl.style.color = '#00f0ff';
    alertEl.style.borderColor = 'rgba(0, 240, 255, 0.3)';
    alertEl.style.background = 'rgba(0, 240, 255, 0.03)';
  }
}

function updateSUSYPhysics() {
  if (!susyCollisionActive) return;
  
  susyCollisionFrame++;
  
  // Frame 25: Beam Collide & Create Sparticle shower
  if (susyCollisionFrame === 25) {
    const alertEl = document.getElementById('susy-status-alert');
    if (alertEl) {
      alertEl.innerHTML = `💥 SUSY SPARTICLE PAIR PRODUCTION DETECTED (R-PARITY ACTIVE)`;
      alertEl.style.color = '#ff3366';
      alertEl.style.borderColor = 'rgba(255, 51, 102, 0.3)';
      alertEl.style.background = 'rgba(255, 51, 102, 0.05)';
    }
    
    // Calculate theoretical transverse missing momentum (MET) based on masses
    // Larger gluino mass creates higher energy jets, larger LSP mass changes the proportion
    const baseMET = (susyGluinoMass * 380) * (1.0 - (susyLSPMass / (susyGluinoMass * 1000)) * 0.35);
    
    // Visible Jets (biased strongly to the right: e.g. angle -45 to 45 deg)
    // 3 highly collimated visible jets to represent Quark Jets
    const visibleAngles = [-0.4, 0.1, 0.5];
    const visibleSpeeds = [2.2, 3.1, 2.5];
    
    visibleAngles.forEach((angle, idx) => {
      const speed = visibleSpeeds[idx];
      // Visible particle representing Quark Jet
      susyParticles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: idx === 1 ? '#eab308' : '#f97316', // yellow/orange
        size: 3.5,
        type: 'quark_jet',
        decayed: false,
        trail: []
      });
    });
    
    // Under R-parity conservation: LSP escapes unseen
    // Under R-parity violation: LSP decays inside tracker
    if (isRParityConserved) {
      // 2 unseen Neutralino LSPs moving to the left (violating transverse momentum balance)
      // Angle: 140 to 220 degrees
      const lspAngles = [2.6, 3.6];
      const lspSpeeds = [2.8, 2.1];
      
      lspAngles.forEach((angle, idx) => {
        const speed = lspSpeeds[idx];
        susyLSPParticles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4,
          trail: []
        });
      });
      
      // Calculate missing momentum vector (pointing opposite to visible jets)
      // Pointing towards the left (approx 180 degrees)
      susyMETVector = {
        x: -Math.cos(0.0) * baseMET, // opposite to visible jets bias
        y: -Math.sin(0.1) * baseMET * 0.2,
        magnitude: baseMET
      };
    } else {
      // RPV mode: Neutralinos are created but instantly decay inside the tracker volume
      // Creating multi-lepton symmetric tracks
      const lspAngles = [2.6, 3.6];
      const lspSpeeds = [2.8, 2.1];
      
      lspAngles.forEach((angle, idx) => {
        const speed = lspSpeeds[idx];
        // These LSPs will decay at frame 55 (inside tracking chamber)
        susyLSPParticles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4,
          willDecay: true,
          decayFrame: 50,
          trail: []
        });
      });
      
      // Since everything decays to visible particles in RPV, MET vanishes!
      susyMETVector = {
        x: 0,
        y: 0,
        magnitude: 5.0 + Math.random() * 8.0 // tiny noise only
      };
      
      if (alertEl) {
        alertEl.innerHTML = `⚠️ RPV MODE: LSP DECAY CASCADE DETECTED // MET SIGNAL VETOED`;
        alertEl.style.color = '#eab308';
        alertEl.style.borderColor = 'rgba(234, 179, 8, 0.3)';
        alertEl.style.background = 'rgba(234, 179, 8, 0.05)';
      }
    }
  }
  
  // Update normal particle positions
  susyParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.trail.push({x: p.x, y: p.y});
    if (p.trail.length > 40) p.trail.shift();
  });
  
  // Update LSP particle positions
  susyLSPParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.trail.push({x: p.x, y: p.y});
    if (p.trail.length > 40) p.trail.shift();
    
    // Handle LSP decay in R-parity Violation mode
    if (p.willDecay && susyCollisionFrame === p.decayFrame && !p.decayed) {
      p.decayed = true;
      
      // LSP decays into 3 SM particles (leptons/quarks)
      // Creating symmetrical tracks going in random directions
      const baseAngle = Math.atan2(p.vy, p.vx);
      const decayAngles = [baseAngle - 0.9, baseAngle + 0.9, baseAngle + Math.PI];
      
      decayAngles.forEach((angle, idx) => {
        susyParticles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * 2.2,
          vy: Math.sin(angle) * 2.2,
          color: idx === 0 ? '#38bdf8' : '#ff3366', // blue lepton & red lepton
          size: 2.5,
          type: 'rpv_decay_lepton',
          trail: []
        });
      });
    }
  });
  
  // End of collision animation
  if (susyCollisionFrame > 140) {
    susyCollisionActive = false;
    const alertEl = document.getElementById('susy-status-alert');
    if (alertEl) {
      if (isRParityConserved) {
        alertEl.innerHTML = `🏆 AMH DM SIGNATURE CONFIRMED // MET = ${susyMETVector.magnitude.toFixed(1)} GeV`;
        alertEl.style.color = '#00ffa0';
        alertEl.style.borderColor = 'rgba(0, 255, 160, 0.4)';
        alertEl.style.background = 'rgba(0, 255, 160, 0.08)';
      } else {
        alertEl.innerHTML = `🔒 SYMMETRIC SHOWER COMPLETE // NO DARK MATTER CAPTURED`;
        alertEl.style.color = 'var(--color-text-muted)';
        alertEl.style.borderColor = 'var(--border-color)';
        alertEl.style.background = 'rgba(255, 255, 255, 0.02)';
      }
    }
  }
  
  // Sync live math calculations on card
  renderSUSYPhysicsMath();
}

function drawSUSYChamber() {
  if (!ctxSusyDetector) return;
  
  const w = canvasSusyDetector.width / window.devicePixelRatio;
  const h = canvasSusyDetector.height / window.devicePixelRatio;
  const cx = w / 2;
  const cy = h / 2;
  
  // Clean canvas
  ctxSusyDetector.fillStyle = '#03040a';
  ctxSusyDetector.fillRect(0, 0, w, h);
  
  // Draw radar-like grid detector lines
  ctxSusyDetector.strokeStyle = 'rgba(99, 102, 241, 0.03)';
  ctxSusyDetector.lineWidth = 1;
  const maxRadius = Math.min(w, h) / 2.2;
  
  for (let r = maxRadius / 5; r <= maxRadius; r += maxRadius / 5) {
    ctxSusyDetector.beginPath();
    ctxSusyDetector.arc(cx, cy, r, 0, Math.PI * 2);
    ctxSusyDetector.stroke();
  }
  
  // Angular dividers
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    ctxSusyDetector.beginPath();
    ctxSusyDetector.moveTo(cx, cy);
    ctxSusyDetector.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius);
    ctxSusyDetector.stroke();
  }
  
  // Draw outer calorimeter circle (LHC hardware)
  ctxSusyDetector.strokeStyle = 'rgba(0, 240, 255, 0.12)';
  ctxSusyDetector.lineWidth = 2;
  ctxSusyDetector.beginPath();
  ctxSusyDetector.arc(cx, cy, maxRadius, 0, Math.PI*2);
  ctxSusyDetector.stroke();
  
  // Outer calorimeter ticks
  ctxSusyDetector.strokeStyle = 'rgba(0, 240, 255, 0.07)';
  for (let d = 0; d < 360; d += 10) {
    const rad = (d * Math.PI) / 180;
    const len = d % 30 === 0 ? 8 : 4;
    ctxSusyDetector.beginPath();
    ctxSusyDetector.moveTo(cx + Math.cos(rad) * maxRadius, cy + Math.sin(rad) * maxRadius);
    ctxSusyDetector.lineTo(cx + Math.cos(rad) * (maxRadius - len), cy + Math.sin(rad) * (maxRadius - len));
    ctxSusyDetector.stroke();
  }
  
  // 1. Draw Incoming proton beams before collide
  if (susyCollisionActive && susyCollisionFrame < 25) {
    const beamDist = (25 - susyCollisionFrame) * 8; // move inwards
    
    // Left proton beam
    ctxSusyDetector.shadowColor = '#00f0ff';
    ctxSusyDetector.shadowBlur = 10;
    ctxSusyDetector.fillStyle = '#00f0ff';
    ctxSusyDetector.beginPath();
    ctxSusyDetector.arc(cx - beamDist, cy, 3, 0, Math.PI*2);
    ctxSusyDetector.fill();
    
    // Right proton beam
    ctxSusyDetector.beginPath();
    ctxSusyDetector.arc(cx + beamDist, cy, 3, 0, Math.PI*2);
    ctxSusyDetector.fill();
    
    // Beam trace lines
    ctxSusyDetector.shadowBlur = 0;
    ctxSusyDetector.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctxSusyDetector.lineWidth = 1;
    ctxSusyDetector.beginPath();
    ctxSusyDetector.moveTo(0, cy);
    ctxSusyDetector.lineTo(cx - beamDist, cy);
    ctxSusyDetector.moveTo(w, cy);
    ctxSusyDetector.lineTo(cx + beamDist, cy);
    ctxSusyDetector.stroke();
  }
  
  // 2. Collide burst flash
  if (susyCollisionActive && susyCollisionFrame >= 24 && susyCollisionFrame <= 28) {
    const burstSize = (susyCollisionFrame - 23) * 15;
    const flashGrad = ctxSusyDetector.createRadialGradient(cx, cy, 0, cx, cy, burstSize);
    flashGrad.addColorStop(0, '#ffffff');
    flashGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.8)');
    flashGrad.addColorStop(1, 'transparent');
    
    ctxSusyDetector.fillStyle = flashGrad;
    ctxSusyDetector.beginPath();
    ctxSusyDetector.arc(cx, cy, burstSize, 0, Math.PI*2);
    ctxSusyDetector.fill();
  }
  
  // 3. Draw Visible Particle Trails (Quark Jets and RPV Leptons)
  if (susyCollisionActive && susyCollisionFrame > 25) {
    susyParticles.forEach(p => {
      if (p.trail.length > 1) {
        ctxSusyDetector.beginPath();
        ctxSusyDetector.moveTo(cx + p.trail[0].x, cy + p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctxSusyDetector.lineTo(cx + p.trail[i].x, cy + p.trail[i].y);
        }
        ctxSusyDetector.strokeStyle = p.color;
        ctxSusyDetector.lineWidth = p.type === 'quark_jet' ? 2.5 : 1.5;
        ctxSusyDetector.stroke();
      }
      
      // Draw lead particle sphere
      ctxSusyDetector.beginPath();
      ctxSusyDetector.arc(cx + p.x, cy + p.y, p.size, 0, Math.PI*2);
      ctxSusyDetector.fillStyle = p.color;
      ctxSusyDetector.fill();
    });
    
    // 4. Draw Unseen LSP (Neutralino) paths (Rendered very faintly for educational view)
    susyLSPParticles.forEach(p => {
      const isLSPDecayed = p.decayed;
      
      if (!isLSPDecayed) {
        if (p.trail.length > 1) {
          ctxSusyDetector.save();
          // Set dashed lines for "Invisible Ghost" LSP
          ctxSusyDetector.setLineDash([4, 4]);
          ctxSusyDetector.beginPath();
          ctxSusyDetector.moveTo(cx + p.trail[0].x, cy + p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctxSusyDetector.lineTo(cx + p.trail[i].x, cy + p.trail[i].y);
          }
          ctxSusyDetector.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctxSusyDetector.lineWidth = 1.5;
          ctxSusyDetector.stroke();
          ctxSusyDetector.restore();
        }
        
        // Faint ghost sphere representing stable LSP Dark Matter escaping
        ctxSusyDetector.beginPath();
        ctxSusyDetector.arc(cx + p.x, cy + p.y, p.size, 0, Math.PI*2);
        ctxSusyDetector.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctxSusyDetector.fill();
        
        // Faint label
        ctxSusyDetector.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctxSusyDetector.font = '9px monospace';
        ctxSusyDetector.fillText('~χ₁⁰ (LSP)', cx + p.x - 22, cy + p.y - 8);
      }
    });
    
    // 5. Draw Missing Transverse Energy (MET) vector arrow
    // Only overlay when collision frame has evolved and MET is significant
    if (susyCollisionFrame > 40 && susyMETVector.magnitude > 15.0) {
      const scaleFactor = 0.55; // Map GeV scale to screen pixel length
      const endX = susyMETVector.x * scaleFactor;
      const endY = susyMETVector.y * scaleFactor;
      
      // Pulse glow effect
      const glowBlur = 8 + Math.sin(susyCollisionFrame * 0.15) * 3;
      ctxSusyDetector.shadowColor = '#00ffa0';
      ctxSusyDetector.shadowBlur = glowBlur;
      
      // Draw Cyan-Green dashed line arrow representing Missing Momentum Vector
      ctxSusyDetector.strokeStyle = '#00ffa0';
      ctxSusyDetector.lineWidth = 3.0;
      ctxSusyDetector.save();
      ctxSusyDetector.setLineDash([6, 3]);
      
      ctxSusyDetector.beginPath();
      ctxSusyDetector.moveTo(cx, cy);
      ctxSusyDetector.lineTo(cx + endX, cy + endY);
      ctxSusyDetector.stroke();
      ctxSusyDetector.restore();
      
      // Draw arrow head
      const arrowAngle = Math.atan2(endY, endX);
      const headLength = 12;
      
      ctxSusyDetector.fillStyle = '#00ffa0';
      ctxSusyDetector.beginPath();
      ctxSusyDetector.moveTo(cx + endX, cy + endY);
      ctxSusyDetector.lineTo(
        cx + endX - headLength * Math.cos(arrowAngle - 0.4),
        cy + endY - headLength * Math.sin(arrowAngle - 0.4)
      );
      ctxSusyDetector.lineTo(
        cx + endX - headLength * Math.cos(arrowAngle + 0.4),
        cy + endY - headLength * Math.sin(arrowAngle + 0.4)
      );
      ctxSusyDetector.closePath();
      ctxSusyDetector.fill();
      
      ctxSusyDetector.shadowBlur = 0; // reset
      
      // Write MET textual label at the tip of the arrow
      ctxSusyDetector.fillStyle = '#ffffff';
      ctxSusyDetector.font = 'bold 11px Space Grotesk';
      ctxSusyDetector.fillText(
        `MET (Missing E_T): ${susyMETVector.magnitude.toFixed(1)} GeV`,
        cx + endX + 8,
        cy + endY + (endY > 0 ? 12 : -4)
      );
    }
  }
}

function renderSUSYPhysicsMath() {
  const container = document.getElementById('susy-physics-details');
  if (!container) return;
  
  const m_g = susyGluinoMass;
  const m_lsp = susyLSPMass;
  
  // Real-time live MET calculations based on mass variables
  const baseMET = (m_g * 380) * (1.0 - (m_lsp / (m_g * 1000)) * 0.35);
  
  const rParityStatus = isRParityConserved
    ? `<span style="color: var(--color-boson); font-weight: bold; text-shadow: 0 0 10px rgba(168,85,247,0.3);">🛡️ R-PARITY CONSERVED (대칭성 보존)</span>`
    : `<span style="color: #ff3366; font-weight: bold; text-shadow: 0 0 10px rgba(255,51,102,0.3);">⚠️ R-PARITY VIOLATED (RPV 대칭성 붕괴)</span>`;
    
  let html = `
    <div class="physics-formula-title">
      <span>🌌 Supersymmetric R-Parity & Missing Transverse Momentum</span>
      ${rParityStatus}
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      입자 물리학 표준모형(SM) 입자와 초대칭 파트너 입자(Sparticle)를 구별하는 <b>R-패리티(R-parity)</b> 공식은 다음과 같이 산출됩니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0;">
        P_R = (-1)^{3(B - L) + 2S}
      </div>
      여기서 $B$는 바리온수, $L$은 렙톤수, $S$는 입자의 스핀(Spin)입니다. 
      공식에 따라 표준모형 입자는 항상 $P_R = +1$을 획득하고, 초대칭 파트너 입자들은 스핀 반정수 차이에 의해 $P_R = -1$을 가집니다.
  `;
  
  if (isRParityConserved) {
    html += `
      <p style="margin-bottom: 0.5rem; margin-top: 0.5rem;">
        <b>R-패리티 보존 조건 ($P_R$ Conserved)</b>:<br>
        라그랑지안 내에서 R-패리티 곱이 보존되므로, 초대칭 입자는 항상 <b>쌍생성(Pair Production)</b>되어야 하며, 가장 가벼운 초대칭 입자인 <b>LSP(Lightest Supersymmetric Particle)</b> 뉴트랄리노 $\\tilde{\\chi}_1^0$은 다른 표준모형 입자로 단독 붕괴할 수 없어 **완벽하게 안정**합니다.
      </p>
      <div style="padding: 0.5rem; border-radius: 6px; background: rgba(0, 255, 160, 0.04); border: 1px solid rgba(0, 255, 160, 0.15); font-size: 0.78rem; margin: 0.5rem 0;">
        <div style="color: #00ffa0; font-weight: bold; margin-bottom: 0.2rem;">LSP 암흑물질 검출 역산 (Missing Transverse Energy, MET)</div>
        전하가 없고 안정한 뉴트랄리노($\\tilde{\\chi}_1^0$)는 검출기 챔버를 관통하여 소실됩니다. 횡방향 운동량 보존법칙에 따라, 가시적 입자 제트들의 불균형을 역산하여 결손 에너지 벡터를 도출합니다:
        <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; background: rgba(0,0,0,0.4);">
          \\not\\vec{E}_T = -\\sum \\vec{p}_{T, \\text{visible}} \\approx ${baseMET.toFixed(1)} \\text{ GeV}
        </div>
        설정된 질량 매개변수 ($m_{\\tilde{g}} = ${m_g.toFixed(1)} \\text{ TeV}$, $m_{\\tilde{\\chi}_1^0} = ${m_lsp} \\text{ GeV}$) 하에서, 뉴트랄리노가 가져간 암흑물질 결손 횡에너지는 이론적으로 약 **${baseMET.toFixed(1)} GeV**로 검출됩니다.
      </div>
    `;
  } else {
    html += `
      <p style="margin-bottom: 0.5rem; margin-top: 0.5rem;">
        <b>R-패리티 위반 조건 ($P_R$ Violated - RPV)</b>:<br>
        R-패리티 대칭성을 인위적으로 붕괴시키면, 가장 가벼운 초대칭 입자인 LSP 뉴트랄리노가 더 이상 안정하지 못하고 가속기 챔버 내부에서 매우 빠르게 표준모형의 가시적인 렙톤과 쿼크로 즉시 붕괴하게 됩니다:
      </p>
      <div style="padding: 0.5rem; border-radius: 6px; background: rgba(255, 51, 102, 0.04); border: 1px solid rgba(255, 51, 102, 0.15); font-size: 0.78rem; margin: 0.5rem 0;">
        <div style="color: #ff3366; font-weight: bold; margin-bottom: 0.2rem;">결손 횡에너지(MET) 신호 소거 및 다중 렙톤 대칭 방출</div>
        $$\\tilde{\\chi}_1^0 \\to e^- + \\mu^+ + \\nu_{\\tau} \\quad \\text{(LSP 비정상 붕괴)}$$
        이로 인해 보이지 않는 암흑물질의 이탈 신호가 제거되고, 챔버 사방으로 렙톤 트랙들이 대칭적으로 분산 방출되어 결손 횡운동량 벡터가 상쇄됩니다:
        <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; background: rgba(0,0,0,0.4);">
          \\not\\vec{E}_T \\approx 0 \\text{ GeV (횡방향 에너지 균형)}
        </div>
        암흑물질 결손 에너지가 잡히지 않으므로, 초대칭 입자의 존재를 간접 증명하는 유력한 채널인 MET 신호가 완전히 상쇄됨을 입증합니다.
      </div>
    `;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// ==========================================
// 9. Grand Unified Theory (GUT) & Proton Decay Lab
// ==========================================

let gutPMTs = [];

function initGUTLab() {
  canvasGUTDetector = document.getElementById('canvas-gut-detector');
  if (!canvasGUTDetector) return;
  
  ctxGUTDetector = canvasGUTDetector.getContext('2d');
  
  const rect = canvasGUTDetector.getBoundingClientRect();
  canvasGUTDetector.width = rect.width * window.devicePixelRatio;
  canvasGUTDetector.height = rect.height * window.devicePixelRatio;
  ctxGUTDetector.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  // Initialize PMT sensors inside the 3D cylinder
  gutPMTs = [];
  
  // 1. Cylinder wall PMT Grid
  const cylinderRadius = 80;
  const cylinderHeight = 180;
  const numLayers = 10;
  const numPMTsPerLayer = 24;
  
  for (let i = 0; i < numLayers; i++) {
    const y = -cylinderHeight / 2 + (i / (numLayers - 1)) * cylinderHeight;
    for (let j = 0; j < numPMTsPerLayer; j++) {
      const angle = (j / numPMTsPerLayer) * Math.PI * 2;
      const x = cylinderRadius * Math.cos(angle);
      const z = cylinderRadius * Math.sin(angle);
      gutPMTs.push({
        x: x, y: y, z: z,
        baseIntensity: 0.08 + Math.random() * 0.05,
        intensity: 0.0,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
  }
  
  // 2. Top and Bottom cap PMTs
  const capRadii = [20, 42, 64, 76];
  const capCounts = [6, 12, 18, 24];
  
  for (let c = 0; c < capRadii.length; c++) {
    const r = capRadii[c];
    const count = capCounts[c];
    for (let j = 0; j < count; j++) {
      const angle = (j / count) * Math.PI * 2;
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      
      // Top Cap
      gutPMTs.push({
        x: x, y: -cylinderHeight / 2, z: z,
        baseIntensity: 0.08 + Math.random() * 0.05,
        intensity: 0.0,
        pulseOffset: Math.random() * Math.PI * 2
      });
      
      // Bottom Cap
      gutPMTs.push({
        x: x, y: cylinderHeight / 2, z: z,
        baseIntensity: 0.08 + Math.random() * 0.05,
        intensity: 0.0,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
  }
  
  // Update state description and formulas
  updateGUTParameters();
  
  // Loop initialization
  if (gutLoopId) {
    cancelAnimationFrame(gutLoopId);
  }
  
  function gutAnimationStep() {
    updateGUTPhysics();
    drawGUTChamber();
    gutLoopId = requestAnimationFrame(gutAnimationStep);
  }
  gutLoopId = requestAnimationFrame(gutAnimationStep);
}

function updateGUTParameters() {
  const mxSlider = document.getElementById('slider-gut-mx');
  const alphaSlider = document.getElementById('slider-gut-alpha');
  
  if (mxSlider) gutMXScale = parseFloat(mxSlider.value);
  if (alphaSlider) gutAlpha = parseFloat(alphaSlider.value);
  
  // Update labels
  const mxLabel = document.getElementById('label-gut-mx');
  if (mxLabel) {
    mxLabel.textContent = `1.0e${gutMXScale.toFixed(1)} GeV`;
  }
  
  const alphaLabel = document.getElementById('label-gut-alpha');
  if (alphaLabel) {
    alphaLabel.textContent = `${gutAlpha.toFixed(3)} (1/${Math.round(1 / gutAlpha)})`;
  }
  
  renderGUTPhysicsMath();
}

function toggleGUTMode() {
  isGUTModeActive = !isGUTModeActive;
  
  const btn = document.getElementById('btn-toggle-gutmode');
  const desc = document.getElementById('label-gut-mode-desc');
  const alertBox = document.getElementById('gut-status-alert');
  
  if (isGUTModeActive) {
    if (btn) {
      btn.textContent = '🔮 GUT Active';
      btn.style.borderColor = 'var(--color-boson)';
      btn.style.color = '#fff';
      btn.style.background = 'rgba(168, 85, 247, 0.25)';
      btn.style.boxShadow = '0 0 12px rgba(168, 85, 247, 0.4)';
    }
    if (desc) {
      desc.textContent = 'Grand Unified Theory: B-L conserving decays (p → e⁺ + π⁰) allowed!';
      desc.style.color = 'var(--color-boson)';
    }
    if (alertBox) {
      alertBox.textContent = 'GUT COUPLING CONNECTED // PROTON INSTABILITY DETECTED';
      alertBox.style.color = 'var(--color-boson)';
      alertBox.style.borderColor = 'rgba(168, 85, 247, 0.4)';
      alertBox.style.background = 'rgba(168, 85, 247, 0.05)';
    }
  } else {
    if (btn) {
      btn.textContent = '🛡️ Standard Model';
      btn.style.borderColor = 'var(--border-color)';
      btn.style.color = 'var(--color-text-muted)';
      btn.style.background = 'rgba(255, 255, 255, 0.02)';
      btn.style.boxShadow = 'none';
    }
    if (desc) {
      desc.textContent = 'Standard Model: Lepton/Baryon violating decays strictly blocked';
      desc.style.color = 'var(--color-text-muted)';
    }
    if (alertBox) {
      alertBox.textContent = 'PROTON IN WATER TANK // DETECTOR STABLE';
      alertBox.style.color = 'var(--color-text-muted)';
      alertBox.style.borderColor = 'var(--border-color)';
      alertBox.style.background = 'rgba(255, 255, 255, 0.02)';
    }
    
    // Reset collision state if SM is turned back on
    gutCollisionActive = false;
  }
  
  renderGUTPhysicsMath();
}

function triggerProtonDecay() {
  const alertBox = document.getElementById('gut-status-alert');
  
  if (!isGUTModeActive) {
    if (alertBox) {
      alertBox.textContent = '🔴 [DECAY BLOCKED] SM PREVENTS BARYON VIOLATION! ENABLE GUT MODE.';
      alertBox.style.color = 'var(--color-danger)';
      alertBox.style.borderColor = 'rgba(255, 51, 102, 0.5)';
      alertBox.style.background = 'rgba(255, 51, 102, 0.08)';
      
      // Add a quick visual shake to the alert box
      alertBox.style.animation = 'none';
      setTimeout(() => {
        alertBox.style.animation = 'shake 0.4s ease';
      }, 10);
    }
    return;
  }
  
  // Start proton decay animation
  gutCollisionActive = true;
  gutCollisionFrame = 0;
  protonDecayParticles = [];
  cherenkovRings = [];
  
  if (alertBox) {
    alertBox.textContent = '💥 [DECAY TRIGGERED] p → e⁺ + π⁰ // CHERENKOV EMISSION ACTIVE';
    alertBox.style.color = '#00f0ff';
    alertBox.style.borderColor = 'rgba(0, 240, 255, 0.5)';
    alertBox.style.background = 'rgba(0, 240, 255, 0.08)';
  }
  
  // 1. Define direction vector for Positron (e+)
  // We point it in a nice diagonal 3D direction
  const theta = 0.8; // Angle in X-Z
  const phi = 0.5;   // Angle in Y
  const dirX = Math.cos(theta) * Math.sin(phi);
  const dirY = Math.cos(phi);
  const dirZ = Math.sin(theta) * Math.sin(phi);
  
  // Positron (e+)
  protonDecayParticles.push({
    x: 0, y: 0, z: 0,
    vx: dirX * 3.6,
    vy: dirY * 3.6,
    vz: dirZ * 3.6,
    type: 'positron',
    active: true,
    trail: [],
    color: '#00f0ff',
    size: 3.5
  });
  
  // Neutral Pion (pi0) - travels in exact opposite direction
  protonDecayParticles.push({
    x: 0, y: 0, z: 0,
    vx: -dirX * 3.2,
    vy: -dirY * 3.2,
    vz: -dirZ * 3.2,
    type: 'pion',
    active: true,
    trail: [],
    color: '#a855f7',
    size: 3.0
  });
  
  // Trigger a central flash
  cherenkovRings.push({
    x: 0, y: 0, z: 0,
    dirX: 0, dirY: 1, dirZ: 0,
    radius: 0,
    maxRadius: 40,
    type: 'flash',
    alpha: 1.0,
    color: '#ffffff'
  });
}

function updateGUTPhysics() {
  if (!gutCollisionActive) {
    // Normal state: slowly dissipate any leftover active PMT intensities
    gutPMTs.forEach(pmt => {
      pmt.intensity *= 0.95;
    });
    return;
  }
  
  gutCollisionFrame++;
  
  // 1. Update Particles
  protonDecayParticles.forEach(p => {
    if (!p.active) return;
    
    // Save trail
    p.trail.push({ x: p.x, y: p.y, z: p.z });
    if (p.trail.length > 25) {
      p.trail.shift();
    }
    
    // Move
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    
    // Check for pion decay at frame 15
    if (p.type === 'pion' && gutCollisionFrame === 15) {
      p.active = false;
      
      // Pion decays into two photons: pi0 -> gamma + gamma
      // We deflect their vectors by roughly 40 degrees from the original pion line
      const baseDirX = -p.vx / 3.2;
      const baseDirY = -p.vy / 3.2;
      const baseDirZ = -p.vz / 3.2;
      
      // Deflect photon 1
      const p1X = baseDirX * Math.cos(0.7) - baseDirZ * Math.sin(0.7);
      const p1Z = baseDirX * Math.sin(0.7) + baseDirZ * Math.cos(0.7);
      const p1Y = baseDirY + 0.3; // tilt upwards
      const len1 = Math.sqrt(p1X*p1X + p1Y*p1Y + p1Z*p1Z);
      
      // Deflect photon 2
      const p2X = baseDirX * Math.cos(-0.7) - baseDirZ * Math.sin(-0.7);
      const p2Z = baseDirX * Math.sin(-0.7) + baseDirZ * Math.cos(-0.7);
      const p2Y = baseDirY - 0.3; // tilt downwards
      const len2 = Math.sqrt(p2X*p2X + p2Y*p2Y + p2Z*p2Z);
      
      // Add photons (photons travel at speed of light, so slightly faster vx,vy,vz)
      protonDecayParticles.push({
        x: p.x, y: p.y, z: p.z,
        vx: (p1X / len1) * 4.0,
        vy: (p1Y / len1) * 4.0,
        vz: (p1Z / len1) * 4.0,
        type: 'photon1',
        active: true,
        trail: [],
        color: 'rgba(255,255,255,0.8)',
        size: 1.5
      });
      
      protonDecayParticles.push({
        x: p.x, y: p.y, z: p.z,
        vx: (p2X / len2) * 4.0,
        vy: (p2Y / len2) * 4.0,
        vz: (p2Z / len2) * 4.0,
        type: 'photon2',
        active: true,
        trail: [],
        color: 'rgba(255,255,255,0.8)',
        size: 1.5
      });
      
      // Add small decay star flash
      cherenkovRings.push({
        x: p.x, y: p.y, z: p.z,
        dirX: 0, dirY: 1, dirZ: 0,
        radius: 0,
        maxRadius: 15,
        type: 'flash',
        alpha: 0.9,
        color: '#a855f7'
      });
    }
    
    // Check if particles hit the cylinder boundary (Radius 80, height 180)
    const distSq = p.x * p.x + p.z * p.z;
    const isOutOfBounds = distSq >= 80 * 80 || Math.abs(p.y) >= 90;
    
    if (isOutOfBounds) {
      p.active = false;
      
      // Trigger Cherenkov ring at the boundary intersection point
      // We clamp the collision point to cylinder boundary
      let px = p.x;
      let py = p.y;
      let pz = p.z;
      
      if (distSq >= 80 * 80) {
        const factor = 80 / Math.sqrt(distSq);
        px *= factor;
        pz *= factor;
      }
      py = Math.max(-90, Math.min(90, py));
      
      // Normalize velocity vector
      const vLen = Math.sqrt(p.vx*p.vx + p.vy*p.vy + p.vz*p.vz);
      const ndx = p.vx / vLen;
      const ndy = p.vy / vLen;
      const ndz = p.vz / vLen;
      
      if (p.type === 'positron') {
        // Sharp Cherenkov Ring representing muon-like or electron-like track
        // Electron-like is slightly fuzzy but distinct, muon-like is extremely sharp.
        // We render a vibrant aqua-blue distinct circular cone ring!
        cherenkovRings.push({
          x: px, y: py, z: pz,
          dirX: ndx, dirY: ndy, dirZ: ndz,
          radius: 0,
          maxRadius: 36,
          type: 'sharp',
          alpha: 1.0,
          color: '#00f0ff'
        });
      } else if (p.type === 'photon1' || p.type === 'photon2') {
        // Gamma photons trigger an electromagnetic shower in water, resulting in multiple fuzzy, overlapping rings.
        // We spawn multiple fuzzy sub-rings to capture the high-fidelity physics of EM showers!
        for (let k = 0; k < 3; k++) {
          const shift = (k - 1) * 6;
          const rx = px + (Math.random() - 0.5) * 8;
          const ry = py + (Math.random() - 0.5) * 8;
          const rz = pz + (Math.random() - 0.5) * 8;
          
          cherenkovRings.push({
            x: rx, y: ry, z: rz,
            dirX: ndx + (Math.random() - 0.5) * 0.1,
            dirY: ndy + (Math.random() - 0.5) * 0.1,
            dirZ: ndz + (Math.random() - 0.5) * 0.1,
            radius: 0,
            maxRadius: 28 + Math.random() * 8,
            type: 'fuzzy',
            alpha: 0.8,
            color: 'rgba(0, 140, 255, 0.6)'
          });
        }
      }
    }
  });
  
  // 2. Update Cherenkov Rings Expansion
  cherenkovRings.forEach(ring => {
    if (ring.type === 'flash') {
      ring.radius += 2.2;
      ring.alpha -= 0.04;
    } else {
      ring.radius += 1.8;
      ring.alpha -= 0.016;
    }
  });
  
  // Clean finished rings
  cherenkovRings = cherenkovRings.filter(r => r.alpha > 0 && r.radius < r.maxRadius);
  
  // 3. Compute PMT photodiode sensor charge from Cherenkov Cones
  // We use strict physics: PMT light intensity is dependent on the Cherenkov angle (approx 42 degrees)
  gutPMTs.forEach(pmt => {
    // Frictional decay of intensity
    pmt.intensity *= 0.94;
    
    // We check all active particles and active rings
    protonDecayParticles.forEach(p => {
      if (!p.active) return;
      
      // Direction vector of the particle from the origin
      const dx = p.x;
      const dy = p.y;
      const dz = p.z;
      const dLen = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dLen < 5) return;
      
      // Vector from origin to PMT
      const px = pmt.x;
      const py = pmt.y;
      const pz = pmt.z;
      const pLen = Math.sqrt(px*px + py*py + pz*pz);
      
      // Calculate dot product to find angle
      const dot = (dx*px + dy*py + dz*pz) / (dLen * pLen);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      
      // Standard Cherenkov angle in water is 42 degrees (~0.733 radians)
      const cherenkovAngle = 42 * Math.PI / 180;
      const angleDiff = Math.abs(angle - cherenkovAngle);
      
      // If the PMT lies directly in the cone field of the moving particle
      if (angleDiff < 0.08) {
        // High fidelity excitation: light travels at c, so it gets illuminated based on proximity
        const intensityInc = (0.02 / (angleDiff * 8 + 0.1)) * (p.type === 'positron' ? 1.0 : 0.4);
        pmt.intensity = Math.min(1.0, pmt.intensity + intensityInc);
      }
    });
    
    // Extra boost when ring shockwaves hit the wall
    cherenkovRings.forEach(ring => {
      if (ring.type === 'flash') return;
      
      const rx = pmt.x - ring.x;
      const ry = pmt.y - ring.y;
      const rz = pmt.z - ring.z;
      const dist = Math.sqrt(rx*rx + ry*ry + rz*rz);
      
      // If PMT is close to the expanding ring shockwave boundary
      const ringWidth = ring.type === 'sharp' ? 4 : 10;
      if (Math.abs(dist - ring.radius) < ringWidth) {
        const ringFactor = ring.type === 'sharp' ? 0.35 : 0.18;
        pmt.intensity = Math.min(1.0, pmt.intensity + ringFactor * ring.alpha);
      }
    });
  });
  
  // End decay if all active particles and rings are finished
  const anyActive = protonDecayParticles.some(p => p.active) || cherenkovRings.length > 0;
  if (!anyActive && gutCollisionFrame > 50) {
    gutCollisionActive = false;
    const alertBox = document.getElementById('gut-status-alert');
    if (alertBox) {
      alertBox.textContent = 'PROTON DECAY SOLVED // PMT SHOWER COMPLETE // CHAMBER READY';
      alertBox.style.color = 'var(--color-boson)';
      alertBox.style.borderColor = 'var(--border-color)';
      alertBox.style.background = 'rgba(255, 255, 255, 0.02)';
    }
  }
}

function drawGUTChamber() {
  if (!ctxGUTDetector) return;
  
  const w = canvasGUTDetector.width / window.devicePixelRatio;
  const h = canvasGUTDetector.height / window.devicePixelRatio;
  const cx = w / 2;
  const cy = h / 2;
  
  // 1. Clear background with premium deep-water dark-blue glow
  ctxGUTDetector.fillStyle = '#020309';
  ctxGUTDetector.fillRect(0, 0, w, h);
  
  // Water scattering ambient glow
  const waterGlow = ctxGUTDetector.createRadialGradient(cx, cy, 10, cx, cy, w * 0.7);
  waterGlow.addColorStop(0, 'rgba(0, 40, 100, 0.07)');
  waterGlow.addColorStop(0.5, 'rgba(0, 15, 45, 0.04)');
  waterGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctxGUTDetector.fillStyle = waterGlow;
  ctxGUTDetector.fillRect(0, 0, w, h);
  
  // 3D rotation angle based on time
  const rotAngle = Date.now() * 0.0002;
  const tiltAngle = 0.45; // tilt view for 3D depth
  
  // 3D Projection Helpers
  function project(x, y, z) {
    // Rotate Y
    const xRot = x * Math.cos(rotAngle) - z * Math.sin(rotAngle);
    const zRot = x * Math.sin(rotAngle) + z * Math.cos(rotAngle);
    // Tilt X
    const yRot = y * Math.cos(tiltAngle) - zRot * Math.sin(tiltAngle);
    const zFinal = y * Math.sin(tiltAngle) + zRot * Math.cos(tiltAngle);
    
    // Perspective
    const d = 260; // Camera distance
    const scale = d / (d + zFinal);
    return {
      x: cx + xRot * scale * 1.3,
      y: cy + yRot * scale * 1.3,
      z: zFinal,
      scale: scale
    };
  }
  
  // 2. Draw Cylinder Wireframe Structure
  const cylinderRadius = 80;
  const cylinderHeight = 180;
  
  ctxGUTDetector.strokeStyle = 'rgba(0, 160, 255, 0.04)';
  ctxGUTDetector.lineWidth = 1;
  
  // Draw top/bottom caps rings and vertical grids
  const steps = 32;
  
  // Bottom Cap Ring
  ctxGUTDetector.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const pt = project(cylinderRadius * Math.cos(a), -cylinderHeight/2, cylinderRadius * Math.sin(a));
    if (i === 0) ctxGUTDetector.moveTo(pt.x, pt.y);
    else ctxGUTDetector.lineTo(pt.x, pt.y);
  }
  ctxGUTDetector.stroke();
  
  // Top Cap Ring
  ctxGUTDetector.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const pt = project(cylinderRadius * Math.cos(a), cylinderHeight/2, cylinderRadius * Math.sin(a));
    if (i === 0) ctxGUTDetector.moveTo(pt.x, pt.y);
    else ctxGUTDetector.lineTo(pt.x, pt.y);
  }
  ctxGUTDetector.stroke();
  
  // Vertical support columns (8 lines)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pt1 = project(cylinderRadius * Math.cos(a), -cylinderHeight/2, cylinderRadius * Math.sin(a));
    const pt2 = project(cylinderRadius * Math.cos(a), cylinderHeight/2, cylinderRadius * Math.sin(a));
    ctxGUTDetector.beginPath();
    ctxGUTDetector.moveTo(pt1.x, pt1.y);
    ctxGUTDetector.lineTo(pt2.x, pt2.y);
    ctxGUTDetector.stroke();
  }
  
  // 3. Sort and Draw PMT Sensors (draw back-most PMTs first, then front PMTs for correct overlapping)
  const projectedPMTs = gutPMTs.map(pmt => {
    const proj = project(pmt.x, pmt.y, pmt.z);
    return {
      proj: proj,
      intensity: pmt.baseIntensity + pmt.intensity,
      pulseOffset: pmt.pulseOffset
    };
  });
  
  // Sort by depth (z-coordinate desc, so larger z is in the background and rendered first)
  projectedPMTs.sort((a, b) => b.proj.z - a.proj.z);
  
  // Draw PMTs
  projectedPMTs.forEach(p => {
    const pulse = Math.sin(Date.now() * 0.003 + p.pulseOffset) * 0.015;
    const finalInt = Math.max(0.01, Math.min(1.0, p.intensity + pulse));
    
    // Color depends on excitation level
    let fillColor;
    let size;
    
    if (finalInt > 0.3) {
      // Excited by Cherenkov photon: brilliant neon light cyan/blue
      const alpha = 0.5 + (finalInt - 0.3) * 0.7;
      fillColor = `rgba(0, 240, 255, ${alpha.toFixed(2)})`;
      size = (1.8 + finalInt * 4.2) * p.proj.scale;
      
      // Draw small glow ring
      ctxGUTDetector.shadowColor = '#00f0ff';
      ctxGUTDetector.shadowBlur = 8 * finalInt;
    } else {
      // Rest state: faint dark blue PMT
      fillColor = `rgba(0, 100, 255, ${(finalInt * 0.9).toFixed(2)})`;
      size = (1.5 + finalInt * 1.5) * p.proj.scale;
      ctxGUTDetector.shadowBlur = 0;
    }
    
    ctxGUTDetector.fillStyle = fillColor;
    ctxGUTDetector.beginPath();
    ctxGUTDetector.arc(p.proj.x, p.proj.y, Math.max(0.4, size), 0, Math.PI * 2);
    ctxGUTDetector.fill();
  });
  
  ctxGUTDetector.shadowBlur = 0; // Reset shadow
  
  // 4. Draw Particle Beams and Trails
  if (gutCollisionActive) {
    protonDecayParticles.forEach(p => {
      // Draw trail
      if (p.trail.length > 1) {
        ctxGUTDetector.beginPath();
        const ptStart = project(p.trail[0].x, p.trail[0].y, p.trail[0].z);
        ctxGUTDetector.moveTo(ptStart.x, ptStart.y);
        
        for (let i = 1; i < p.trail.length; i++) {
          const pt = project(p.trail[i].x, p.trail[i].y, p.trail[i].z);
          ctxGUTDetector.lineTo(pt.x, pt.y);
        }
        
        ctxGUTDetector.strokeStyle = p.color;
        
        if (p.type === 'positron') {
          ctxGUTDetector.shadowColor = '#00f0ff';
          ctxGUTDetector.shadowBlur = 6;
          ctxGUTDetector.lineWidth = 2.0;
          ctxGUTDetector.stroke();
        } else if (p.type === 'pion') {
          ctxGUTDetector.shadowColor = '#a855f7';
          ctxGUTDetector.shadowBlur = 6;
          ctxGUTDetector.lineWidth = 1.8;
          ctxGUTDetector.stroke();
        } else {
          // Photons are neutral, show as faint dotted trace
          ctxGUTDetector.save();
          ctxGUTDetector.setLineDash([3, 3]);
          ctxGUTDetector.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctxGUTDetector.lineWidth = 1.0;
          ctxGUTDetector.stroke();
          ctxGUTDetector.restore();
        }
        ctxGUTDetector.shadowBlur = 0;
      }
      
      // Draw lead particle
      if (p.active) {
        const pt = project(p.x, p.y, p.z);
        ctxGUTDetector.beginPath();
        ctxGUTDetector.arc(pt.x, pt.y, p.size * pt.scale, 0, Math.PI * 2);
        ctxGUTDetector.fillStyle = p.color;
        
        if (p.type === 'positron') {
          ctxGUTDetector.shadowColor = '#00f0ff';
          ctxGUTDetector.shadowBlur = 10;
        } else if (p.type === 'pion') {
          ctxGUTDetector.shadowColor = '#a855f7';
          ctxGUTDetector.shadowBlur = 10;
        }
        
        ctxGUTDetector.fill();
        ctxGUTDetector.shadowBlur = 0;
        
        // Faint physics labels
        ctxGUTDetector.fillStyle = '#ffffff';
        ctxGUTDetector.font = '9px Space Grotesk';
        if (p.type === 'positron') {
          ctxGUTDetector.fillText('e⁺ (positron)', pt.x + 6, pt.y - 4);
        } else if (p.type === 'pion') {
          ctxGUTDetector.fillText('π⁰ (pion)', pt.x - 48, pt.y + 10);
        }
      }
    });
  }
  
  // 5. Draw 3D Cherenkov Projected Rings Shockwaves
  cherenkovRings.forEach(ring => {
    if (ring.type === 'flash') {
      // Central flash sphere
      const pt = project(ring.x, ring.y, ring.z);
      const rad = ring.radius * pt.scale;
      
      const flashGrad = ctxGUTDetector.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rad);
      flashGrad.addColorStop(0, '#ffffff');
      flashGrad.addColorStop(0.3, ring.color);
      flashGrad.addColorStop(1, 'transparent');
      
      ctxGUTDetector.fillStyle = flashGrad;
      ctxGUTDetector.beginPath();
      ctxGUTDetector.arc(pt.x, pt.y, rad, 0, Math.PI*2);
      ctxGUTDetector.fill();
      return;
    }
    
    // Draw 3D Circle Orthogonal to its direction vector!
    // We compute perpendicular axes a and b in 3D
    const ux = ring.dirX;
    const uy = ring.dirY;
    const uz = ring.dirZ;
    
    let ax, ay, az;
    if (Math.abs(ux) < 0.001 && Math.abs(uz) < 0.001) {
      ax = 1.0; ay = 0.0; az = 0.0;
    } else {
      const len = Math.sqrt(ux*ux + uz*uz);
      ax = uz / len;
      ay = 0.0;
      az = -ux / len;
    }
    
    // b = u x a
    const bx = uy * az - uz * ay;
    const by = uz * ax - ux * az;
    const bz = ux * ay - uy * ax;
    
    // Draw 32 segments ring
    ctxGUTDetector.beginPath();
    const ringSteps = 32;
    for (let s = 0; s <= ringSteps; s++) {
      const angle = (s / ringSteps) * Math.PI * 2;
      const cosA = Math.cos(angle) * ring.radius;
      const sinA = Math.sin(angle) * ring.radius;
      
      const rx = ring.x + cosA * ax + sinA * bx;
      const ry = ring.y + cosA * ay + sinA * by;
      const rz = ring.z + cosA * az + sinA * bz;
      
      // project
      const pt = project(rx, ry, rz);
      if (s === 0) ctxGUTDetector.moveTo(pt.x, pt.y);
      else ctxGUTDetector.lineTo(pt.x, pt.y);
    }
    
    ctxGUTDetector.strokeStyle = ring.color;
    ctxGUTDetector.shadowColor = ring.color;
    
    if (ring.type === 'sharp') {
      ctxGUTDetector.lineWidth = 2.0;
      ctxGUTDetector.shadowBlur = 12 * ring.alpha;
      ctxGUTDetector.globalAlpha = ring.alpha;
      ctxGUTDetector.stroke();
      
      // Label the Cherenkov ring
      ctxGUTDetector.globalAlpha = 1.0;
      ctxGUTDetector.fillStyle = '#00f0ff';
      ctxGUTDetector.font = 'bold 9px Space Grotesk';
      const ptLabel = project(ring.x, ring.y, ring.z);
      ctxGUTDetector.fillText('Sharp e⁺ Ring (θc ≈ 42°)', ptLabel.x + 10, ptLabel.y - 12);
    } else {
      ctxGUTDetector.lineWidth = 1.2;
      ctxGUTDetector.shadowBlur = 6 * ring.alpha;
      ctxGUTDetector.globalAlpha = ring.alpha * 0.6;
      ctxGUTDetector.stroke();
      
      // Spanning electron shower
      ctxGUTDetector.globalAlpha = 1.0;
    }
    
    ctxGUTDetector.shadowBlur = 0;
    ctxGUTDetector.globalAlpha = 1.0;
  });
}

function renderGUTPhysicsMath() {
  const container = document.getElementById('gut-physics-details');
  if (!container) return;
  
  // Calculate real-time proton lifetime based on slider values
  // Formula: tau_p = C * (M_X^4) / (alpha_GUT^2 * m_p^5)
  // factor scale C adjusted so that M_X = 10^15 GeV and alpha = 0.041 yields ~8.3 * 10^32 years
  const mxGeV = Math.pow(10, gutMXScale);
  const mpGeV = 0.938; // proton mass
  const cConstant = 1.0e-29;
  const lifetimeYears = cConstant * Math.pow(mxGeV, 4) / (Math.pow(gutAlpha, 2) * Math.pow(mpGeV, 5));
  
  // Scientific notation formatting
  const exponent = Math.floor(Math.log10(lifetimeYears));
  const mantissa = lifetimeYears / Math.pow(10, exponent);
  const formattedLifetime = `${mantissa.toFixed(2)} × 10<sup>${exponent}</sup> years`;
  
  // Super-K limits comparison (approx 2.4e34 years for p -> e+ pi0)
  const skLimit = 2.4e34;
  let statusBadge = '';
  
  if (lifetimeYears < skLimit) {
    statusBadge = `
      <div style="padding: 0.5rem; border-radius: 6px; background: rgba(255, 51, 102, 0.06); border: 1px solid rgba(255, 51, 102, 0.25); font-size: 0.78rem; margin: 0.5rem 0;">
        <span style="color: #ff3366; font-weight: bold;">🚨 EXCLUDED REGION (실험적 하한 기각 영역)</span><br>
        현재 설정된 양성자 수명(${formattedLifetime})은 <b>Super-Kamiokande 실험 하한선(${skLimit.toExponential(1)}년)</b>보다 짧습니다. 
        이 통합 모델 스케일은 이미 실험적으로 기각되었으므로 게이지 보손 질량 $M_X$를 높여 튜닝해야 합니다.
      </div>
    `;
  } else {
    statusBadge = `
      <div style="padding: 0.5rem; border-radius: 6px; background: rgba(0, 255, 160, 0.06); border: 1px solid rgba(0, 255, 160, 0.25); font-size: 0.78rem; margin: 0.5rem 0;">
        <span style="color: #00ffa0; font-weight: bold;">✅ VIABLE GUT REGION (물리학적 생존 가능 영역)</span><br>
        현재 양성자 수명(${formattedLifetime})은 실험적 제약을 우회하며, 차세대 <b>Hyper-Kamiokande 검출기</b>의 탐색 범위에 해당하는 생존 가능한 물리 매개변수 공간입니다.
      </div>
    `;
  }
  
  const gutStatus = isGUTModeActive
    ? `<span style="color: var(--color-boson); font-weight: bold; text-shadow: 0 0 10px rgba(168,85,247,0.3);">🔮 GUT MODEL ACTIVE (대통일 이론 가동)</span>`
    : `<span style="color: var(--color-text-muted); font-weight: bold;">🛡️ STANDARD MODEL STRICT (렙톤수/바리온수 개별 보존)</span>`;
    
  let html = `
    <div class="physics-formula-title">
      <span>🌊 Georgi-Glashow SU(5) GUT & Proton Decay Physics</span>
      ${gutStatus}
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      대통일 이론(GUT) 하에서는 표준모형의 $SU(3)_C \times SU(2)_L \times U(1)_Y$ 게이지 대칭이 더 큰 단일 게이지 대칭군인 <b>$SU(5)$</b> 등으로 병합됩니다. 
      이에 따라 표준모형에서 보존되던 바리온수($B$)와 렙톤수($L$)가 깨지고 초대형 질량을 가진 게이지 보손 $X, Y$ 가 반응을 매개하게 되지만, <b>$B - L$ 대칭성은 여전히 엄격하게 보존</b>됩니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0;">
        \\Delta(B - L) = 0 \\quad \\text{so} \\quad p \\to e^+ + \\pi^0 \\quad (\\Delta B = -1, \\Delta L = -1)
      </div>
      대통일 게이지 보손 질량 $M_X$ 와 결합 상수 $\\alpha_{GUT}$ 에 다른 양성자의 이론적 수명 공식은 다음과 같습니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0;">
        \\tau_p \\approx \\frac{1}{\\alpha_{GUT}^2} \\frac{M_X^4}{m_p^5}
      </div>
      이 공식에 맞춰 연산한 현재 양성자의 수명 예측치는 약 <b style="color: var(--color-boson); font-family: var(--font-mono);">${formattedLifetime}</b> 입니다.
      ${statusBadge}
      
      <p style="margin-top: 0.4rem; font-size: 0.76rem; color: var(--color-text-muted);">
        <b>물 수중 체렌코프 복사 기하학 (Cherenkov Cone Geometry)</b>:<br>
        붕괴 부산물로 사출된 고에너지 양전자($e^+$)는 물의 굴절률 $n_{\\text{water}} = 1.33$ 환경에서 매질 내 광속 $c/n$ 보다 빠르게 질주하며 $\\cos\\theta_c = 1/n\\beta$ 조건에 의해 진행 방향 기준 정확히 <b>$\\theta_c \\approx 42^\\circ$</b> 각도의 Cherenkov 방사 원추를 형성합니다.
        이 원추가 원통형 실린더 PMT 벽면에 부딪힐 때의 구면 및 원통 교선 각도를 매 60FPS마다 3D 벡터 내적으로 정밀 계산하여 투영한 물리 시각화 신호입니다.
      </p>
    </div>
  `;
  
  container.innerHTML = html;
}


// ============================================================================
// PART J: CKM Matrix & CP Violation Lab
// ============================================================================

function initCKMLab() {
  canvasCKMTriangle = document.getElementById('canvas-ckm-triangle');
  if (canvasCKMTriangle) {
    ctxCKMTriangle = canvasCKMTriangle.getContext('2d');
  }
  
  // Set initial slider values
  document.getElementById('slider-ckm-theta12').value = ckmTheta12;
  document.getElementById('slider-ckm-theta23').value = ckmTheta23;
  document.getElementById('slider-ckm-theta13').value = ckmTheta13;
  document.getElementById('slider-ckm-delta').value = ckmDelta;
  
  resizeCanvas();
  updateCKMParameters();
  
  // Micro-animation loop to make CP Violation visualizer "responsive and alive"
  if (ckmLoopId) cancelAnimationFrame(ckmLoopId);
  
  let animFrame = 0;
  function loop() {
    if (rightPanelTab !== 'ckm') return;
    animFrame++;
    
    // Draw unitarity triangle with a subtle breath animation representing CP quantum phase rotation
    drawUnitarityTriangle(animFrame);
    
    ckmLoopId = requestAnimationFrame(loop);
  }
  loop();
}

function updateCKMParameters() {
  ckmTheta12 = parseFloat(document.getElementById('slider-ckm-theta12').value);
  ckmTheta23 = parseFloat(document.getElementById('slider-ckm-theta23').value);
  ckmTheta13 = parseFloat(document.getElementById('slider-ckm-theta13').value);
  ckmDelta = parseFloat(document.getElementById('slider-ckm-delta').value);
  
  // Update labels
  const r12 = (ckmTheta12 * Math.PI) / 180;
  const r23 = (ckmTheta23 * Math.PI) / 180;
  const r13 = (ckmTheta13 * Math.PI) / 180;
  const rDelta = (ckmDelta * Math.PI) / 180;
  
  document.getElementById('label-ckm-theta12').innerHTML = `${ckmTheta12.toFixed(2)}° (${r12.toFixed(4)} rad)`;
  document.getElementById('label-ckm-theta23').innerHTML = `${ckmTheta23.toFixed(2)}° (${r23.toFixed(4)} rad)`;
  document.getElementById('label-ckm-theta13').innerHTML = `${ckmTheta13.toFixed(3)}° (${r13.toFixed(4)} rad)`;
  document.getElementById('label-ckm-delta').innerHTML = `${ckmDelta.toFixed(1)}° (${rDelta.toFixed(4)} rad)`;
  
  // Compute CKM Matrix
  const V = computeCKMMatrixJS(r12, r23, r13, rDelta);
  
  // Display matrix elements in UI
  updateCKMMatrixUI(V);
  
  // Compute Jarlskog Invariant
  const J = computeJarlskogJS(V);
  const jarlskogBadge = document.getElementById('ckm-jarlskog-badge');
  if (jarlskogBadge) {
    jarlskogBadge.innerHTML = `JARLSKOG J: ${(J * 1e5).toFixed(3)} &times; 10<sup>-5</sup>`;
    if (Math.abs(J) < 1e-7) {
      jarlskogBadge.style.background = 'rgba(255, 255, 255, 0.05)';
      jarlskogBadge.style.borderColor = 'var(--border-color)';
      jarlskogBadge.style.color = 'var(--color-text-muted)';
      jarlskogBadge.innerHTML = `JARLSKOG J: 0.00 (CP CONSERVED)`;
    } else {
      jarlskogBadge.style.background = 'rgba(255, 51, 102, 0.08)';
      jarlskogBadge.style.borderColor = 'var(--color-danger)';
      jarlskogBadge.style.color = 'var(--color-danger)';
    }
  }
  
  // Verify Unitarity
  const unitarityVerified = verifyCKMUnitarityJS(V);
  const unitarityBadge = document.getElementById('ckm-unitarity-badge');
  if (unitarityBadge) {
    if (unitarityVerified) {
      unitarityBadge.innerHTML = `UNITARITY: V<sup>&dagger;</sup>V = I (100.0% VERIFIED)`;
      unitarityBadge.style.background = 'rgba(0, 240, 255, 0.08)';
      unitarityBadge.style.borderColor = 'var(--color-lepton)';
      unitarityBadge.style.color = 'var(--color-lepton)';
    } else {
      unitarityBadge.innerHTML = `UNITARITY VIOLATION DETECTED`;
      unitarityBadge.style.background = 'rgba(255, 51, 102, 0.1)';
      unitarityBadge.style.borderColor = 'var(--color-danger)';
      unitarityBadge.style.color = 'var(--color-danger)';
    }
  }
  
  // Draw triangle statically once (in case loop isn't active)
  drawUnitarityTriangle(0);
  
  // Render Math Board
  renderCKMPhysicsMath();
}

function computeCKMMatrixJS(t12, t23, t13, delta) {
  const c12 = Math.cos(t12);
  const s12 = Math.sin(t12);
  const c23 = Math.cos(t23);
  const s23 = Math.sin(t23);
  const c13 = Math.cos(t13);
  const s13 = Math.sin(t13);
  
  const cosD = Math.cos(delta);
  const sinD = Math.sin(delta);
  
  return {
    ud: { re: c12 * c13, im: 0 },
    us: { re: s12 * c13, im: 0 },
    ub: { re: s13 * cosD, im: -s13 * sinD },
    
    cd: { re: -s12 * c23 - c12 * s23 * s13 * cosD, im: -c12 * s23 * s13 * sinD },
    cs: { re: c12 * c23 - s12 * s23 * s13 * cosD, im: -s12 * s23 * s13 * sinD },
    cb: { re: s23 * c13, im: 0 },
    
    td: { re: s12 * s23 - c12 * c23 * s13 * cosD, im: -c12 * c23 * s13 * sinD },
    ts: { re: -c12 * s23 - s12 * c23 * s13 * cosD, im: -s12 * c23 * s13 * sinD },
    tb: { re: c23 * c13, im: 0 }
  };
}

function computeJarlskogJS(V) {
  const V_us = V.us.re;
  const V_cb = V.cb.re;
  const V_ub_conj = { re: V.ub.re, im: -V.ub.im };
  const V_cs_conj = { re: V.cs.re, im: -V.cs.im };
  
  const prod_im = V_ub_conj.re * V_cs_conj.im + V_ub_conj.im * V_cs_conj.re;
  return V_us * V_cb * prod_im;
}

function verifyCKMUnitarityJS(V) {
  const cols = [
    [V.ud, V.cd, V.td],
    [V.us, V.cs, V.ts],
    [V.ub, V.cb, V.tb]
  ];
  
  let maxError = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let re = 0, im = 0;
      for (let k = 0; k < 3; k++) {
        const z1 = cols[i][k];
        const z2 = cols[j][k];
        re += z1.re * z2.re + z1.im * z2.im;
        im += z1.re * z2.im - z1.im * z2.re;
      }
      
      const target_re = (i === j) ? 1.0 : 0.0;
      const error = Math.sqrt((re - target_re)**2 + im**2);
      if (error > maxError) maxError = error;
    }
  }
  return maxError < 1e-5;
}

function updateCKMMatrixUI(V) {
  const elements = ['ud', 'us', 'ub', 'cd', 'cs', 'cb', 'td', 'ts', 'tb'];
  
  elements.forEach(el => {
    const valEl = document.getElementById(`ckm-v${el}-val`);
    const phaseEl = document.getElementById(`ckm-v${el}-phase`);
    if (valEl && phaseEl) {
      const z = V[el];
      const magnitude = Math.sqrt(z.re * z.re + z.im * z.im);
      let phase = Math.atan2(z.im, z.re) * 180 / Math.PI;
      if (Math.abs(magnitude) < 1e-6) phase = 0;
      
      valEl.innerHTML = magnitude.toFixed(el === 'ub' || el === 'td' ? 5 : 4);
      phaseEl.innerHTML = `${phase.toFixed(1)}°`;
      if (Math.abs(phase) > 1e-2) {
        phaseEl.style.color = 'var(--color-danger)';
      } else {
        phaseEl.style.color = 'var(--color-text-muted)';
      }
    }
  });
}

function drawUnitarityTriangle(animFrame) {
  if (!canvasCKMTriangle || !ctxCKMTriangle) return;
  
  const w = canvasCKMTriangle.width / window.devicePixelRatio;
  const h = canvasCKMTriangle.height / window.devicePixelRatio;
  
  ctxCKMTriangle.fillStyle = '#050714';
  ctxCKMTriangle.fillRect(0, 0, w, h);
  
  const cx = w * 0.55;
  const cy = h * 0.65;
  
  ctxCKMTriangle.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctxCKMTriangle.lineWidth = 1;
  for (let x = 0; x < w; x += 30) {
    ctxCKMTriangle.beginPath();
    ctxCKMTriangle.moveTo(x, 0);
    ctxCKMTriangle.lineTo(x, h);
    ctxCKMTriangle.stroke();
  }
  for (let y = 0; y < h; y += 30) {
    ctxCKMTriangle.beginPath();
    ctxCKMTriangle.moveTo(0, y);
    ctxCKMTriangle.lineTo(w, y);
    ctxCKMTriangle.stroke();
  }
  
  ctxCKMTriangle.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctxCKMTriangle.beginPath();
  ctxCKMTriangle.moveTo(10, cy);
  ctxCKMTriangle.lineTo(w - 10, cy);
  ctxCKMTriangle.stroke();
  ctxCKMTriangle.beginPath();
  ctxCKMTriangle.moveTo(cx, 10);
  ctxCKMTriangle.lineTo(cx, h - 10);
  ctxCKMTriangle.stroke();
  
  ctxCKMTriangle.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctxCKMTriangle.font = '9px var(--font-mono)';
  ctxCKMTriangle.fillText('Re', w - 25, cy - 6);
  ctxCKMTriangle.fillText('Im', cx + 6, 20);
  
  const r12 = (ckmTheta12 * Math.PI) / 180;
  const r23 = (ckmTheta23 * Math.PI) / 180;
  const r13 = (ckmTheta13 * Math.PI) / 180;
  const rDelta = (ckmDelta * Math.PI) / 180;
  
  const V = computeCKMMatrixJS(r12, r23, r13, rDelta);
  
  const V_cb_conj = { re: V.cb.re, im: -V.cb.im };
  const z1 = {
    re: V.cd.re * V_cb_conj.re - V.cd.im * V_cb_conj.im,
    im: V.cd.re * V_cb_conj.im + V.cd.im * V_cb_conj.re
  };
  
  const V_tb_conj = { re: V.tb.re, im: -V.tb.im };
  const z2 = {
    re: V.td.re * V_tb_conj.re - V.td.im * V_tb_conj.im,
    im: V.td.re * V_tb_conj.im + V.td.im * V_tb_conj.re
  };
  
  const V_ub_conj = { re: V.ub.re, im: -V.ub.im };
  const z3 = {
    re: V.ud.re * V_ub_conj.re - V.ud.im * V_ub_conj.im,
    im: V.ud.re * V_ub_conj.im + V.ud.im * V_ub_conj.re
  };
  
  const scale = 16000;
  
  const p0 = { x: cx, y: cy };
  const p1 = { x: cx + z1.re * scale, y: cy - z1.im * scale };
  const p2 = { x: p1.x + z2.re * scale, y: p1.y - z2.im * scale };
  
  ctxCKMTriangle.fillStyle = 'rgba(99, 102, 241, 0.04)';
  ctxCKMTriangle.beginPath();
  ctxCKMTriangle.moveTo(p0.x, p0.y);
  ctxCKMTriangle.lineTo(p1.x, p1.y);
  ctxCKMTriangle.lineTo(p2.x, p2.y);
  ctxCKMTriangle.closePath();
  ctxCKMTriangle.fill();
  
  const breath = Math.sin(animFrame * 0.05) * 4;
  
  drawGlowingVector(ctxCKMTriangle, p0, p1, 'rgba(0, 240, 255, 0.85)', 'rgba(0, 240, 255, 0.3)', 3, 6 + breath);
  drawGlowingVector(ctxCKMTriangle, p1, p2, 'rgba(212, 0, 255, 0.85)', 'rgba(212, 0, 255, 0.3)', 3, 6 + breath);
  drawGlowingVector(ctxCKMTriangle, p2, p0, 'rgba(255, 51, 102, 0.9)', 'rgba(255, 51, 102, 0.3)', 3, 6 + breath);
  
  [p0, p1, p2].forEach((pt) => {
    ctxCKMTriangle.fillStyle = '#fff';
    ctxCKMTriangle.shadowColor = '#fff';
    ctxCKMTriangle.shadowBlur = 10;
    ctxCKMTriangle.beginPath();
    ctxCKMTriangle.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctxCKMTriangle.fill();
    ctxCKMTriangle.shadowBlur = 0;
  });
  
  ctxCKMTriangle.font = '10px var(--font-sans)';
  ctxCKMTriangle.fillStyle = 'rgba(0, 240, 255, 0.9)';
  ctxCKMTriangle.fillText('V_cd V_cb*', (p0.x + p1.x)/2 - 20, (p0.y + p1.y)/2 + 15);
  
  ctxCKMTriangle.fillStyle = 'rgba(212, 0, 255, 0.9)';
  ctxCKMTriangle.fillText('V_td V_tb*', (p1.x + p2.x)/2 + 10, (p1.y + p2.y)/2 - 5);
  
  ctxCKMTriangle.fillStyle = 'rgba(255, 51, 102, 0.95)';
  ctxCKMTriangle.fillText('V_ud V_ub*', (p2.x + p0.x)/2 - 40, (p2.y + p0.y)/2 - 10);
  
  const J = computeJarlskogJS(V);
  if (Math.abs(J) > 1e-7) {
    ctxCKMTriangle.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctxCKMTriangle.font = '11px var(--font-mono)';
    ctxCKMTriangle.fillText('γ', p0.x - 12, p0.y - 12);
    ctxCKMTriangle.fillText('β', p1.x + 8, p1.y + 12);
    ctxCKMTriangle.fillText('α', p2.x - 15, p2.y + 8);
  } else {
    ctxCKMTriangle.fillStyle = 'rgba(255, 51, 102, 0.6)';
    ctxCKMTriangle.font = 'bold 11px var(--font-sans)';
    ctxCKMTriangle.fillText('DEGENERATE TRIANGLE (J = 0 // NO CP VIOLATION)', 15, 30);
  }
}

function drawGlowingVector(ctx, from, to, color, shadowColor, width, glow) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = glow;
  
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const arrowSize = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - arrowSize * Math.cos(angle - Math.PI / 6), to.y - arrowSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - arrowSize * Math.cos(angle + Math.PI / 6), to.y - arrowSize * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function renderCKMPhysicsMath() {
  const container = document.getElementById('ckm-physics-details');
  if (!container) return;
  
  const r12 = (ckmTheta12 * Math.PI) / 180;
  const r23 = (ckmTheta23 * Math.PI) / 180;
  const r13 = (ckmTheta13 * Math.PI) / 180;
  const rDelta = (ckmDelta * Math.PI) / 180;
  const V = computeCKMMatrixJS(r12, r23, r13, rDelta);
  const J = computeJarlskogJS(V);
  
  let cpViolationStatus = "";
  if (Math.abs(J) < 1e-7) {
    cpViolationStatus = `<b style="color: var(--color-text-muted);">[ CP CONSERVED (CP 대칭성 보존) ]</b><br>
    CP 위상 위상 &delta;<sub>CP</sub> 또는 결합각 중 하나가 0이 되어 Jarlskog 불변량이 0이 되었습니다. 유니터리 삼각형이 직선으로 완전히 접히고(Degenerate), 물질과 반물질 사이의 반응 비대칭성이 소멸합니다.`;
  } else {
    cpViolationStatus = `<b style="color: var(--color-danger);">[ CP VIOLATED (CP 대칭성 위반 활성화) ]</b><br>
    복소 위상인 &delta;<sub>CP</sub>에 의해 CKM 행렬에 복소 허수 성분이 존재하여 양의 Jarlskog 불변량($J \\approx ${(J * 1e5).toFixed(2)} \\times 10^{-5}$)이 산출되었습니다. 이는 우주 초기에 물질이 반물질보다 더 많이 남게 된 <b>사하로프 조건(Sakharov Conditions)</b>의 핵심 요소인 CP 대칭성 위반의 크기를 뜻합니다.`;
  }
  
  const html = `
    <div class="physics-formula-title">
      <span>🔀 CKM Matrix & CP Violation Physics Board</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      카비보-고바야시-마스카와(CKM) 행렬은 소립자 물리학에서 <b>약한 전류 상호작용(Weak Charge Current)</b> 하에서의 쿼크 맛깔 전환 세기를 결정하는 유니터리 복소 혼합 행렬입니다.
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        V_{CKM} = \\begin{pmatrix} V_{ud} & V_{us} & V_{ub} \\\\ V_{cd} & V_{cs} & V_{cb} \\\\ V_{td} & V_{ts} & V_{tb} \\end{pmatrix}
      </div>
      세 가지 혼합 오일러 각 $\\theta_{12}, \\theta_{23}, \\theta_{13}$과 CP 위반을 야기하는 단 하나의 Dirac CP 위상 $\\delta_{CP}$에 의해 완전히 매개변수화됩니다.
      
      <p style="margin-top: 0.4rem;">
        <b>유니터리 삼각형 무결성 증명 (Unitarity Triangle)</b>:<br>
        행렬의 유니터리성($V_{CKM}^\\dagger V_{CKM} = I$) 중 대표적인 아래 직교 조건식은 복소평면 위에서 닫힌 삼각형을 형성합니다:
      </p>
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        V_{ud}V_{ub}^* + V_{cd}V_{cb}^* + V_{td}V_{tb}^* = 0
      </div>
      이 삼각형의 면적은 임의의 쿼크 맛깔 재정의에 불변인 <b>Jarlskog 불변량 $J$</b>의 절반과 정확히 일치하며 다음과 같이 표현됩니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        J = c_{12}s_{12}c_{23}s_{23}c_{13}^2 s_{13}\\sin\\delta_{CP} \\approx ${(J * 1e5).toFixed(3)} \\times 10^{-5}
      </div>
      <p style="margin-top: 0.4rem; font-size: 0.78rem; color: var(--color-text-muted);">
        ${cpViolationStatus}
      </p>
    </div>
  `;
  
  container.innerHTML = html;
}


// ============================================================================
// PART K: RGE Running Coupling & Gauge Unification Lab
// ============================================================================

function initRGELab() {
  canvasRGEGraph = document.getElementById('canvas-rge-graph');
  if (canvasRGEGraph) {
    ctxRGEGraph = canvasRGEGraph.getContext('2d');
  }
  
  updateRGEModelButtonUI();
  resizeCanvas();
  
  // Initial draw
  drawRGEGraph(0);
  
  if (rgeLoopId) cancelAnimationFrame(rgeLoopId);
  
  let animFrame = 0;
  function loop() {
    if (rightPanelTab !== 'rge') return;
    animFrame++;
    
    drawRGEGraph(animFrame);
    rgeLoopId = requestAnimationFrame(loop);
  }
  loop();
}

function toggleRGEModel() {
  isRGEMSSM = !isRGEMSSM;
  updateRGEModelButtonUI();
  
  const unification = findGUTIntersectionJS();
  const scaleVal = document.getElementById('rge-scale-val');
  const alphaVal = document.getElementById('rge-alpha-val');
  
  if (scaleVal && alphaVal) {
    if (isRGEMSSM) {
      scaleVal.innerHTML = `~ ${unification.MX.toExponential(2)} GeV`;
      alphaVal.innerHTML = `~ ${unification.alphaGUTInv.toFixed(1)} (${(1/unification.alphaGUTInv).toFixed(4)})`;
      scaleVal.style.color = 'var(--color-bsm)';
      alphaVal.style.color = 'var(--color-scalar)';
    } else {
      scaleVal.innerHTML = `No Unification (발산)`;
      alphaVal.innerHTML = `M_X spreads by 10^4`;
      scaleVal.style.color = 'var(--color-danger)';
      alphaVal.style.color = 'var(--color-text-muted)';
    }
  }
  
  drawRGEGraph(0);
  renderRGEPhysicsMath();
}

function updateRGEModelButtonUI() {
  const btn = document.getElementById('btn-toggle-rgemodel');
  const desc = document.getElementById('label-rge-model-desc');
  if (btn && desc) {
    if (isRGEMSSM) {
      btn.innerHTML = '🌌 MSSM (초대칭 대통일)';
      btn.style.borderColor = 'var(--color-bsm)';
      btn.style.color = 'var(--color-bsm)';
      btn.style.background = 'rgba(0, 255, 170, 0.08)';
      desc.innerHTML = 'MSSM: Supersymmetric partners converge couplings at GUT scale';
    } else {
      btn.innerHTML = '🛡️ Standard Model (SM)';
      btn.style.borderColor = 'var(--color-lepton)';
      btn.style.color = 'var(--color-lepton)';
      btn.style.background = 'rgba(0, 240, 255, 0.05)';
      desc.innerHTML = 'Standard Model: Couplings do not meet at a single energy point';
    }
  }
}

function computeRunningCouplingJS(alphaInvMZ, b, log10_Q) {
  const log10_MZ = Math.log10(91.1876);
  const factor = (b * Math.log(10)) / (2 * Math.PI);
  return alphaInvMZ - factor * (log10_Q - log10_MZ);
}

function findGUTIntersectionJS() {
  const alpha1_MZ = 58.98;
  const alpha2_MZ = 29.57;
  
  const b1 = isRGEMSSM ? 6.6 : 4.1;
  const b2 = isRGEMSSM ? 1.0 : -19/6;
  
  const log10_MZ = Math.log10(91.1876);
  const log10_MX = log10_MZ + (2 * Math.PI / Math.log(10)) * (alpha1_MZ - alpha2_MZ) / (b2 - b1);
  const MX = Math.pow(10, log10_MX);
  const alphaGUTInv = computeRunningCouplingJS(alpha1_MZ, b1, log10_MX);
  
  return {
    log10_MX,
    MX,
    alphaGUTInv
  };
}

function drawRGEGraph(animFrame) {
  if (!canvasRGEGraph || !ctxRGEGraph) return;
  
  const w = canvasRGEGraph.width / window.devicePixelRatio;
  const h = canvasRGEGraph.height / window.devicePixelRatio;
  
  ctxRGEGraph.fillStyle = '#050714';
  ctxRGEGraph.fillRect(0, 0, w, h);
  
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;
  
  const graphWidth = w - paddingLeft - paddingRight;
  const graphHeight = h - paddingTop - paddingBottom;
  
  ctxRGEGraph.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctxRGEGraph.lineWidth = 1;
  
  const minX = 2.0;
  const maxX = 18.0;
  const minY = 0.0;
  const maxY = 65.0;
  
  function getCanvasX(logQ) {
    return paddingLeft + ((logQ - minX) / (maxX - minX)) * graphWidth;
  }
  
  function getCanvasY(alphaInv) {
    return paddingTop + graphHeight - ((alphaInv - minY) / (maxY - minY)) * graphHeight;
  }
  
  ctxRGEGraph.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctxRGEGraph.font = '8px var(--font-mono)';
  
  for (let logQ = 2; logQ <= 18; logQ += 2) {
    const x = getCanvasX(logQ);
    ctxRGEGraph.beginPath();
    ctxRGEGraph.moveTo(x, paddingTop);
    ctxRGEGraph.lineTo(x, paddingTop + graphHeight);
    ctxRGEGraph.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctxRGEGraph.stroke();
    
    ctxRGEGraph.fillText(`10^${logQ}`, x - 10, paddingTop + graphHeight + 12);
  }
  
  for (let val = 10; val <= 60; val += 10) {
    const y = getCanvasY(val);
    ctxRGEGraph.beginPath();
    ctxRGEGraph.moveTo(paddingLeft, y);
    ctxRGEGraph.lineTo(w - paddingRight, y);
    ctxRGEGraph.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctxRGEGraph.stroke();
    
    ctxRGEGraph.fillText(val, paddingLeft - 18, y + 3);
  }
  
  ctxRGEGraph.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctxRGEGraph.lineWidth = 1;
  ctxRGEGraph.beginPath();
  ctxRGEGraph.moveTo(paddingLeft, paddingTop);
  ctxRGEGraph.lineTo(paddingLeft, paddingTop + graphHeight);
  ctxRGEGraph.lineTo(w - paddingRight, paddingTop + graphHeight);
  ctxRGEGraph.stroke();
  
  ctxRGEGraph.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctxRGEGraph.font = '8px var(--font-sans)';
  ctxRGEGraph.fillText('Energy Scale Q (GeV)', w - 100, paddingTop + graphHeight + 25);
  
  ctxRGEGraph.save();
  ctxRGEGraph.translate(12, paddingTop + 60);
  ctxRGEGraph.rotate(-Math.PI / 2);
  ctxRGEGraph.fillText('Coupling Strength α_i^-1(Q)', 0, 0);
  ctxRGEGraph.restore();
  
  const alpha1_MZ = 58.98;
  const alpha2_MZ = 29.57;
  const alpha3_MZ = 8.47;
  
  const b1 = isRGEMSSM ? 6.6 : 4.1;
  const b2 = isRGEMSSM ? 1.0 : -19/6;
  const b3 = isRGEMSSM ? -3.0 : -7.0;
  
  const curves = [
    { alphaInvMZ: alpha1_MZ, b: b1, color: 'rgba(255, 170, 0, 0.9)', name: 'α_1^-1 (U(1)_Y)', glow: 'rgba(255, 170, 0, 0.25)' },
    { alphaInvMZ: alpha2_MZ, b: b2, color: 'rgba(0, 240, 255, 0.9)', name: 'α_2^-1 (SU(2)_L)', glow: 'rgba(0, 240, 255, 0.25)' },
    { alphaInvMZ: alpha3_MZ, b: b3, color: 'rgba(255, 51, 102, 0.9)', name: 'α_3^-1 (SU(3)_C)', glow: 'rgba(255, 51, 102, 0.25)' }
  ];
  
  curves.forEach(curve => {
    ctxRGEGraph.beginPath();
    let first = true;
    for (let logQ = 2.0; logQ <= 18.0; logQ += 0.1) {
      const alphaInv = computeRunningCouplingJS(curve.alphaInvMZ, curve.b, logQ);
      const cx = getCanvasX(logQ);
      const cy = getCanvasY(alphaInv);
      
      if (first) {
        ctxRGEGraph.moveTo(cx, cy);
        first = false;
      } else {
        ctxRGEGraph.lineTo(cx, cy);
      }
    }
    
    ctxRGEGraph.save();
    ctxRGEGraph.strokeStyle = curve.color;
    ctxRGEGraph.lineWidth = 2.5;
    ctxRGEGraph.shadowColor = curve.glow;
    ctxRGEGraph.shadowBlur = 6;
    ctxRGEGraph.stroke();
    ctxRGEGraph.restore();
    
    const endVal = computeRunningCouplingJS(curve.alphaInvMZ, curve.b, 17.5);
    ctxRGEGraph.fillStyle = curve.color;
    ctxRGEGraph.font = 'bold 8px var(--font-mono)';
    ctxRGEGraph.fillText(curve.name, getCanvasX(17.5) - 30, getCanvasY(endVal) - 6);
  });
  
  const intersection = findGUTIntersectionJS();
  
  const wavePosition = 2.0 + (animFrame * 0.08) % 16.0;
  curves.forEach(curve => {
    const waveY = computeRunningCouplingJS(curve.alphaInvMZ, curve.b, wavePosition);
    ctxRGEGraph.fillStyle = '#fff';
    ctxRGEGraph.shadowColor = curve.color;
    ctxRGEGraph.shadowBlur = 10;
    ctxRGEGraph.beginPath();
    ctxRGEGraph.arc(getCanvasX(wavePosition), getCanvasY(waveY), 3.5, 0, Math.PI * 2);
    ctxRGEGraph.fill();
    ctxRGEGraph.shadowBlur = 0;
  });
  
  if (isRGEMSSM) {
    const ix = getCanvasX(intersection.log10_MX);
    const iy = getCanvasY(intersection.alphaGUTInv);
    
    const pulseBlur = 10 + Math.sin(animFrame * 0.1) * 6;
    ctxRGEGraph.fillStyle = 'rgba(0, 255, 170, 0.95)';
    ctxRGEGraph.shadowColor = 'rgba(0, 255, 170, 0.7)';
    ctxRGEGraph.shadowBlur = pulseBlur;
    
    ctxRGEGraph.beginPath();
    ctxRGEGraph.arc(ix, iy, 6, 0, Math.PI * 2);
    ctxRGEGraph.fill();
    
    ctxRGEGraph.strokeStyle = 'rgba(0, 255, 170, 0.4)';
    ctxRGEGraph.lineWidth = 1.5;
    ctxRGEGraph.beginPath();
    ctxRGEGraph.arc(ix, iy, 6 + (animFrame % 25) * 0.6, 0, Math.PI * 2);
    ctxRGEGraph.stroke();
    ctxRGEGraph.shadowBlur = 0;
    
    ctxRGEGraph.fillStyle = 'rgba(0, 255, 170, 0.95)';
    ctxRGEGraph.font = 'bold 9px var(--font-sans)';
    ctxRGEGraph.fillText('SUSY GUT Unification!', ix - 50, iy - 24);
    ctxRGEGraph.fillStyle = '#fff';
    ctxRGEGraph.font = '8px var(--font-mono)';
    ctxRGEGraph.fillText(`MX = ${intersection.MX.toExponential(2)} GeV`, ix - 50, iy - 14);
    ctxRGEGraph.fillText(`α_GUT^-1 = ${intersection.alphaGUTInv.toFixed(1)}`, ix - 50, iy - 5);
  } else {
    ctxRGEGraph.strokeStyle = 'rgba(255, 51, 102, 0.35)';
    ctxRGEGraph.lineWidth = 1;
    ctxRGEGraph.setLineDash([2, 2]);
    
    ctxRGEGraph.beginPath();
    ctxRGEGraph.moveTo(getCanvasX(12.8), getCanvasY(42));
    ctxRGEGraph.lineTo(getCanvasX(16.5), getCanvasY(33));
    ctxRGEGraph.lineTo(getCanvasX(14.8), getCanvasY(26));
    ctxRGEGraph.closePath();
    ctxRGEGraph.stroke();
    ctxRGEGraph.setLineDash([]);
    
    ctxRGEGraph.fillStyle = 'rgba(255, 51, 102, 0.85)';
    ctxRGEGraph.font = '8px var(--font-sans)';
    ctxRGEGraph.fillText('No Unification (발산)', getCanvasX(12.8) - 10, getCanvasY(42) - 10);
  }
}

function renderRGEPhysicsMath() {
  const container = document.getElementById('rge-physics-details');
  if (!container) return;
  
  let modelPhysicsDesc = "";
  if (isRGEMSSM) {
    modelPhysicsDesc = `<b style="color: var(--color-bsm);">[ MSSM Unification (초대칭 대통일 극적 수렴) ]</b><br>
    초대칭 대칭성이 가미된 최소 초대칭 표준모형(MSSM) 베타 계수($b_1 = 33/5, b_2 = 1, b_3 = -3$) 하에서는 세 커플링 라인이 거의 정확히 <b>$M_X \\approx 2.1 \\times 10^{16}$ GeV</b> 및 <b>$\\alpha_{GUT} \\approx 1/24.3$</b> 스케일의 한 지점에서 수렴합니다. 이는 양성자 붕괴와 완벽히 얽혀있어, 대통일 게이지 보손 매개 양성자 수명 예측을 높은 정밀도로 뒷받침합니다.`;
  } else {
    modelPhysicsDesc = `<b style="color: var(--color-danger);">[ Standard Model Divergence (표준모형 통합 실패) ]</b><br>
    표준모형(SM)의 1-루프 베타 계수($b_1 = 41/10, b_2 = -19/6, b_3 = -7$) 하에서는 세 가지 힘의 결합상수 라인이 한 점에 모이지 않고 약 $10^{13}$ ~ $10^{17}$ GeV 범위에서 넓게 퍼져버립니다. 이는 초대칭과 같은 추가 자유도 없이는 단순한 $SU(5)$ 대통일 이론이 성립할 수 없음을 물리적으로 증명합니다.`;
  }
  
  const html = `
    <div class="physics-formula-title">
      <span>📈 Renormalization Group (RGE) Physics Board</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      양자장론에서 게이지 대칭의 결합 상수는 상수가 아니라 에너지 스케일 $Q$에 따라 진화하는 <b>"달림(Running)"</b> 특성을 나타냅니다. 
      이 진화는 다음과 같은 1-루프 재규격화 군 진화 방정식(RGE)으로 완벽하게 연산됩니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        \\alpha_i^{-1}(Q) = \\alpha_i^{-1}(M_Z) - \\frac{b_i}{2\\pi}\\ln\\left(\\frac{Q}{M_Z}\\right)
      </div>
      여기서 세 결합 상수는 각각 다음과 같습니다:
      <ul>
        <li><b>$\\alpha_1$</b>: $U(1)_Y$ 약한 하이퍼전하 결합상수 (GUT 정규화: $\\alpha_1 = \\frac{5}{3}\\alpha_Y$)</li>
        <li><b>$\\alpha_2$</b>: $SU(2)_L$ 약한 등스핀 결합상수</li>
        <li><b>$\\alpha_3$</b>: $SU(3)_C$ 강한 색전하 결합상수 ($\\alpha_s$)</li>
      </ul>
      
      <p style="margin-top: 0.4rem; font-size: 0.78rem; color: var(--color-text-muted);">
        ${modelPhysicsDesc}
      </p>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================================
// 12. QCD Phase Diagram & QGP Deconfinement Lab
// ============================================================================

function initQCDLab() {
  canvasQCDPhase = document.getElementById('canvas-qcd-phase');
  ctxQCDPhase = canvasQCDPhase.getContext('2d');
  canvasQCDMicro = document.getElementById('canvas-qcd-micro');
  ctxQCDMicro = canvasQCDMicro.getContext('2d');
  
  resizeCanvas();
  
  // Initialize parameters
  document.getElementById('slider-qcd-temperature').value = 0;
  document.getElementById('slider-qcd-mub').value = 0;
  qcdTemperature = 0;
  qcdMuB = 0;
  
  // Initialize micro particles for rendering
  qcdMicroParticles = [];
  for (let i = 0; i < 40; i++) {
    qcdMicroParticles.push({
      x: Math.random() * canvasQCDMicro.width,
      y: Math.random() * canvasQCDMicro.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      color: ['#ff0055', '#00ffaa', '#3e4e94'][Math.floor(Math.random() * 3)], // RGB
      type: 'quark',
      pairedIndex: -1, // for hadron grouping or CFL pairing
      phaseOff: Math.random() * Math.PI * 2
    });
  }
  for (let i = 0; i < 15; i++) {
    qcdMicroParticles.push({
      x: Math.random() * canvasQCDMicro.width,
      y: Math.random() * canvasQCDMicro.height,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      color: '#fff',
      type: 'gluon',
      phaseOff: Math.random() * Math.PI * 2
    });
  }
  
  updateQCDParameters();
  renderQCDPhysicsMath();
  
  if (qcdLoopId) {
    cancelAnimationFrame(qcdLoopId);
  }
  
  let animFrame = 0;
  function qcdLoop() {
    drawQCDPhaseDiagram();
    drawQCDMicroSimulation(animFrame);
    animFrame++;
    qcdLoopId = requestAnimationFrame(qcdLoop);
  }
  
  qcdLoop();
}

function computeQCDCriticalTemp(muB) {
  const T0 = 155.0;
  const kappa = 0.013;
  return T0 * (1.0 - kappa * Math.pow(muB / T0, 2));
}

function updateQCDParameters() {
  qcdTemperature = parseFloat(document.getElementById('slider-qcd-temperature').value);
  qcdMuB = parseFloat(document.getElementById('slider-qcd-mub').value);
  
  document.getElementById('label-qcd-temperature').innerText = `${qcdTemperature} MeV`;
  document.getElementById('label-qcd-mub').innerText = `${qcdMuB} MeV`;
  
  const Tc = computeQCDCriticalTemp(qcdMuB);
  
  // Calculate Chiral Condensate
  const deltaT = 10.0;
  let chiralCondensate = 0.5 * (1.0 - Math.tanh((qcdTemperature - Tc) / deltaT));
  if (chiralCondensate < 0.001) chiralCondensate = 0;
  
  const chiralBadge = document.getElementById('qcd-chiral-badge');
  chiralBadge.innerText = `CHIRAL CONDENSATE: ${chiralCondensate.toFixed(2)}`;
  if (chiralCondensate < 0.5) {
    chiralBadge.style.color = '#ffaa00';
    chiralBadge.style.borderColor = '#ffaa00';
    chiralBadge.style.background = 'rgba(255, 170, 0, 0.08)';
  } else {
    chiralBadge.style.color = '#fff';
    chiralBadge.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    chiralBadge.style.background = 'rgba(255, 255, 255, 0.05)';
  }
  
  // Calculate Pressures (MIT Bag Model)
  const B = Math.pow(200.0, 4);
  const g_pi = 3.0;
  const g_QGP = 37.0;
  const Phad = g_pi * (Math.pow(Math.PI, 2) * Math.pow(qcdTemperature, 4)) / 90.0;
  const PQGP = g_QGP * (Math.pow(Math.PI, 2) * Math.pow(qcdTemperature, 4)) / 90.0 - B;
  
  const isDeconfined = PQGP > Phad;
  
  const confBadge = document.getElementById('qcd-deconfinement-badge');
  if (qcdTemperature > 20 && qcdMuB > 800 && qcdTemperature < Tc) {
    // CFL Phase approx
    confBadge.innerText = 'COLOR SUPERCONDUCTIVITY (CFL)';
    confBadge.style.color = '#a855f7';
    confBadge.style.borderColor = '#a855f7';
    confBadge.style.background = 'rgba(168, 85, 247, 0.15)';
  } else if (isDeconfined) {
    confBadge.innerText = 'P_QGP > P_had (DECONFINED QGP)';
    confBadge.style.color = '#ff3366';
    confBadge.style.borderColor = '#ff3366';
    confBadge.style.background = 'rgba(255, 51, 102, 0.15)';
  } else {
    confBadge.innerText = 'P_QGP < P_had (CONFINED HADRON GAS)';
    confBadge.style.color = '#00f0ff';
    confBadge.style.borderColor = '#00f0ff';
    confBadge.style.background = 'rgba(0, 240, 255, 0.08)';
  }
}

function drawQCDPhaseDiagram() {
  if (!ctxQCDPhase) return;
  const w = canvasQCDPhase.width / window.devicePixelRatio;
  const h = canvasQCDPhase.height / window.devicePixelRatio;
  
  ctxQCDPhase.clearRect(0, 0, w, h);
  
  // Draw Grid
  ctxQCDPhase.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctxQCDPhase.lineWidth = 1;
  for(let i=0; i<=10; i++) {
    let x = (i/10) * w;
    let y = (i/10) * h;
    ctxQCDPhase.beginPath(); ctxQCDPhase.moveTo(x, 0); ctxQCDPhase.lineTo(x, h); ctxQCDPhase.stroke();
    ctxQCDPhase.beginPath(); ctxQCDPhase.moveTo(0, y); ctxQCDPhase.lineTo(w, y); ctxQCDPhase.stroke();
  }
  
  // Map values to canvas coordinates
  // muB: 0 to 1200
  // T: 0 to 300
  const mapX = (muB) => (muB / 1200) * w;
  const mapY = (T) => h - (T / 300) * h;
  
  // Draw Critical Line
  ctxQCDPhase.beginPath();
  ctxQCDPhase.lineWidth = 3;
  for (let muB = 0; muB <= 1200; muB += 10) {
    let T = computeQCDCriticalTemp(muB);
    if (T < 0) T = 0;
    const cx = mapX(muB);
    const cy = mapY(T);
    if (muB === 0) ctxQCDPhase.moveTo(cx, cy);
    else ctxQCDPhase.lineTo(cx, cy);
  }
  
  // Gradient for critical line (Crossover vs 1st Order)
  let grad = ctxQCDPhase.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#ffaa00'); // Crossover (yellow/orange)
  grad.addColorStop(0.35, '#ffaa00'); // CEP ~ 400 MeV
  grad.addColorStop(0.4, '#ff3366'); // 1st Order (red)
  grad.addColorStop(1, '#a855f7'); 
  
  ctxQCDPhase.strokeStyle = grad;
  ctxQCDPhase.stroke();
  
  // Draw CEP marker
  const cepMuB = 400;
  const cepT = computeQCDCriticalTemp(cepMuB);
  ctxQCDPhase.fillStyle = '#fff';
  ctxQCDPhase.beginPath();
  ctxQCDPhase.arc(mapX(cepMuB), mapY(cepT), 4, 0, Math.PI*2);
  ctxQCDPhase.fill();
  ctxQCDPhase.font = '10px var(--font-sans)';
  ctxQCDPhase.fillText('CEP', mapX(cepMuB) - 10, mapY(cepT) - 10);
  
  // Mark labels
  ctxQCDPhase.fillStyle = 'rgba(255,255,255,0.4)';
  ctxQCDPhase.fillText('Hadron Gas', mapX(100), mapY(50));
  ctxQCDPhase.fillText('Quark-Gluon Plasma', mapX(300), mapY(250));
  ctxQCDPhase.fillText('Color Superconductor', mapX(900), mapY(30));
  
  // Draw current point
  const curX = mapX(qcdMuB);
  const curY = mapY(qcdTemperature);
  
  ctxQCDPhase.fillStyle = '#00f0ff';
  ctxQCDPhase.shadowColor = '#00f0ff';
  ctxQCDPhase.shadowBlur = 10;
  ctxQCDPhase.beginPath();
  ctxQCDPhase.arc(curX, curY, 6, 0, Math.PI*2);
  ctxQCDPhase.fill();
  ctxQCDPhase.shadowBlur = 0;
  
  ctxQCDPhase.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctxQCDPhase.lineWidth = 1;
  ctxQCDPhase.setLineDash([4, 4]);
  ctxQCDPhase.beginPath();
  ctxQCDPhase.moveTo(curX, h);
  ctxQCDPhase.lineTo(curX, curY);
  ctxQCDPhase.lineTo(0, curY);
  ctxQCDPhase.stroke();
  ctxQCDPhase.setLineDash([]);
}

function drawQCDMicroSimulation(animFrame) {
  if (!ctxQCDMicro) return;
  const w = canvasQCDMicro.width / window.devicePixelRatio;
  const h = canvasQCDMicro.height / window.devicePixelRatio;
  
  ctxQCDMicro.clearRect(0, 0, w, h);
  
  const Tc = computeQCDCriticalTemp(qcdMuB);
  const isDeconfined = qcdTemperature > Tc;
  const isCFL = qcdTemperature < Tc && qcdMuB > 800 && qcdTemperature > 20;
  
  // Velocity multiplier based on Temperature
  const speed = 0.5 + (qcdTemperature / 100);
  
  // Group logic for confined state
  if (!isDeconfined && !isCFL) {
    // Form hadrons (groups of 3)
    for (let i = 0; i < qcdMicroParticles.length; i++) {
      let p = qcdMicroParticles[i];
      if (p.type !== 'quark') continue;
      
      if (p.pairedIndex === -1 && Math.random() < 0.1) {
        // Find 2 other free quarks
        let group = [i];
        for (let j = i+1; j < qcdMicroParticles.length && group.length < 3; j++) {
          if (qcdMicroParticles[j].type === 'quark' && qcdMicroParticles[j].pairedIndex === -1) {
            group.push(j);
          }
        }
        if (group.length === 3) {
          group.forEach(idx => qcdMicroParticles[idx].pairedIndex = group[0]); // leader is group[0]
        }
      }
    }
  } else if (isCFL) {
    // Form Cooper pairs (groups of 2)
    for (let i = 0; i < qcdMicroParticles.length; i++) {
      let p = qcdMicroParticles[i];
      if (p.type !== 'quark') continue;
      
      if (p.pairedIndex === -1 && Math.random() < 0.2) {
        // Find 1 other free quark
        for (let j = i+1; j < qcdMicroParticles.length; j++) {
          if (qcdMicroParticles[j].type === 'quark' && qcdMicroParticles[j].pairedIndex === -1) {
            p.pairedIndex = i;
            qcdMicroParticles[j].pairedIndex = i;
            break;
          }
        }
      }
    }
  } else {
    // Deconfined, break all pairs
    qcdMicroParticles.forEach(p => p.pairedIndex = -1);
  }
  
  // Update Physics
  qcdMicroParticles.forEach((p, i) => {
    // Basic movement
    if (p.type === 'quark') {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
    } else { // Gluon
      if (isDeconfined) {
        p.x += p.vx * speed * 1.5;
        p.y += p.vy * speed * 1.5;
      } else {
        // Gluons get suppressed/absorbed in vacuum, just wiggle
        p.x += Math.sin(animFrame*0.1 + p.phaseOff) * 2;
        p.y += Math.cos(animFrame*0.1 + p.phaseOff) * 2;
      }
    }
    
    // Boundary bounce
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
    p.x = Math.max(0, Math.min(w, p.x));
    p.y = Math.max(0, Math.min(h, p.y));
    
    // Confinement Attraction (String Potential)
    if (!isDeconfined && p.type === 'quark' && p.pairedIndex !== -1) {
      const leader = qcdMicroParticles[p.pairedIndex];
      if (leader && leader !== p) {
        const dx = leader.x - p.x;
        const dy = leader.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Spring-like strong force V(r) ~ k*r
        if (dist > 15) {
          p.vx += dx * 0.01;
          p.vy += dy * 0.01;
        } else if (dist < 5) {
          p.vx -= dx * 0.05;
          p.vy -= dy * 0.05;
        }
        
        // Draw confinement flux tube
        ctxQCDMicro.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctxQCDMicro.lineWidth = 2;
        ctxQCDMicro.beginPath();
        ctxQCDMicro.moveTo(p.x, p.y);
        ctxQCDMicro.lineTo(leader.x, leader.y);
        ctxQCDMicro.stroke();
      }
    }
    
    // CFL Attraction (Cooper Pairing)
    if (isCFL && p.type === 'quark' && p.pairedIndex !== -1) {
      const leader = qcdMicroParticles[p.pairedIndex];
      if (leader && leader !== p) {
        const dx = leader.x - p.x;
        const dy = leader.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 10) {
          p.vx += dx * 0.05;
          p.vy += dy * 0.05;
        }
        // Draw cooper pair bond
        ctxQCDMicro.strokeStyle = 'rgba(168, 85, 247, 0.6)';
        ctxQCDMicro.lineWidth = 3;
        ctxQCDMicro.setLineDash([2, 2]);
        ctxQCDMicro.beginPath();
        ctxQCDMicro.moveTo(p.x, p.y);
        ctxQCDMicro.lineTo(leader.x, leader.y);
        ctxQCDMicro.stroke();
        ctxQCDMicro.setLineDash([]);
      }
    }
    
    // Apply some friction to stabilize
    p.vx *= 0.98;
    p.vy *= 0.98;
    
    // Random thermal kicks
    p.vx += (Math.random() - 0.5) * speed * 0.2;
    p.vy += (Math.random() - 0.5) * speed * 0.2;
  });
  
  // Draw particles
  qcdMicroParticles.forEach(p => {
    ctxQCDMicro.beginPath();
    if (p.type === 'quark') {
      ctxQCDMicro.fillStyle = p.color;
      ctxQCDMicro.shadowColor = p.color;
      ctxQCDMicro.shadowBlur = 8;
      ctxQCDMicro.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctxQCDMicro.fill();
    } else if (isDeconfined) {
      // Draw gluon (spiral/wavy representation)
      ctxQCDMicro.fillStyle = '#fff';
      ctxQCDMicro.shadowColor = '#fff';
      ctxQCDMicro.shadowBlur = Math.abs(Math.sin(animFrame * 0.2 + p.phaseOff)) * 10;
      ctxQCDMicro.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctxQCDMicro.fill();
    }
    ctxQCDMicro.shadowBlur = 0;
  });
}

function renderQCDPhysicsMath() {
  const container = document.getElementById('qcd-physics-details');
  if (!container) return;
  
  const html = `
    <div class="physics-formula-title">
      <span>🌡️ QCD Equation of State & Order Parameters</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      강력의 특성에 의해, 에너지가 높아지면 <b>점근적 자유성(Asymptotic Freedom)</b>으로 인해 쿼크들이 상호작용을 멈추고 풀려납니다. 반면 에너지가 낮아지면 <b>색가둠(Color Confinement)</b>에 의해 하드론 내부에 결박됩니다.
      
      <p style="margin-top: 0.5rem;"><b>1. MIT Bag Model Pressure (백 모형 압력 방정식)</b></p>
      QGP와 강입자 기체의 상전이는 두 상태의 압력 평형점($P_{QGP} = P_{had}$)에서 발생합니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        P_{had} = g_{\\pi} \\frac{\\pi^2 T^4}{90}, \\quad P_{QGP} = g_{QGP} \\frac{\\pi^2 T^4}{90} - B
      </div>
      $T$가 특정 임계점 이상으로 상승하면 $P_{QGP} > P_{had}$ 가 되어 진공 백(Bag) 압력 $B$를 이겨내고 쿼크들이 해방됩니다.
      
      <p style="margin-top: 0.5rem;"><b>2. Chiral Condensate (카이랄 응축비)</b></p>
      QGP 상전이와 함께, 입자에 동역학적 질량을 부여하던 진공 카이랄 대칭성(Chiral Symmetry)이 복원됩니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        \\frac{\\langle \\bar{q}q \\rangle_T}{\\langle \\bar{q}q \\rangle_0} \\approx \\frac{1}{2} \\left[ 1 - \\tanh\\left( \\frac{T - T_c(\\mu_B)}{\\Delta T} \\right) \\right]
      </div>
      이 값이 0으로 수렴하면 쿼크들은 더 이상 진공과 상호작용하지 않아 원래의 가벼운 맨질량(bare mass)만 남게 됩니다.
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================================
// 13. QFT Feynman Diagram & Scattering Amplitude Lab
// ============================================================================

function initFeynmanLab() {
  canvasFeynmanDiagram = document.getElementById('canvas-feynman-diagram');
  ctxFeynmanDiagram = canvasFeynmanDiagram.getContext('2d');
  canvasFeynmanScattering = document.getElementById('canvas-feynman-scattering');
  ctxFeynmanScattering = canvasFeynmanScattering.getContext('2d');
  
  resizeCanvas();
  
  document.getElementById('select-feynman-process').value = "e- e+ -> mu- mu+";
  document.getElementById('slider-feynman-energy').value = 1000;
  
  updateFeynmanParameters();
  
  if (feynmanLoopId) {
    cancelAnimationFrame(feynmanLoopId);
  }
  
  let animFrame = 0;
  function feynmanLoop() {
    drawFeynmanDiagram(animFrame);
    drawScatteringPolarPlot(animFrame);
    animFrame++;
    feynmanLoopId = requestAnimationFrame(feynmanLoop);
  }
  
  feynmanLoop();
}

function computeMandelstamJS(s_cm, theta) {
  const t = - (s_cm / 2.0) * (1.0 - Math.cos(theta));
  const u = - (s_cm / 2.0) * (1.0 + Math.cos(theta));
  return {s: s_cm, t: t, u: u};
}

function computeQEDAmplitudeSqJS(process, s, t, u) {
  const e_charge_sq = 4 * Math.PI * (1/137.036); // e^2
  let M2 = 0;
  
  if (process === "e- e+ -> mu- mu+") {
    if (s === 0) return 0;
    M2 = 2.0 * Math.pow(e_charge_sq, 2) * (t*t + u*u) / (s*s);
  } else if (process === "e- e+ -> e- e+") {
    if (s === 0 || t === 0) return 0;
    M2 = 2.0 * Math.pow(e_charge_sq, 2) * ( (s*s + u*u)/(t*t) + (t*t + u*u)/(s*s) + 2*u*u/(s*t) );
  } else if (process === "e- e- -> e- e-") {
    if (t === 0 || u === 0) return 0;
    M2 = 2.0 * Math.pow(e_charge_sq, 2) * ( (s*s + u*u)/(t*t) + (s*s + t*t)/(u*u) + 2*s*s/(t*u) );
  }
  return M2;
}

function computeDifferentialCrossSectionJS(process, s, theta) {
  if (s <= 0) return 0;
  let th = theta;
  if (th < 1e-4) th = 1e-4;
  if (th > Math.PI - 1e-4) th = Math.PI - 1e-4;
  
  const m = computeMandelstamJS(s, th);
  const M2 = computeQEDAmplitudeSqJS(process, m.s, m.t, m.u);
  return M2 / (64.0 * Math.PI * Math.PI * s);
}

function updateFeynmanParameters() {
  feynmanProcess = document.getElementById('select-feynman-process').value;
  feynmanEnergy = parseFloat(document.getElementById('slider-feynman-energy').value);
  
  document.getElementById('label-feynman-energy').innerText = `${feynmanEnergy} GeV`;
  
  // Numerical integration for total cross section
  const s = feynmanEnergy * feynmanEnergy;
  let sigma_total = 0;
  const steps = 100;
  const d_theta = Math.PI / steps;
  
  for (let i = 1; i < steps; i++) {
    const theta = i * d_theta;
    const ds_dOmega = computeDifferentialCrossSectionJS(feynmanProcess, s, theta);
    const dOmega = 2 * Math.PI * Math.sin(theta) * d_theta;
    sigma_total += ds_dOmega * dOmega;
  }
  
  // Convert from GeV^-2 to pb (1 GeV^-2 approx 0.3894 x 10^9 pb)
  const pb_conv = 0.3894e9;
  const sigma_pb = sigma_total * pb_conv;
  
  document.getElementById('feynman-sigma-badge').innerText = `TOTAL CROSS SECTION: ${sigma_pb.toExponential(3)} pb`;
  
  renderFeynmanPhysicsMath();
}

function drawFeynmanDiagram(animFrame) {
  if (!ctxFeynmanDiagram) return;
  const w = canvasFeynmanDiagram.width / window.devicePixelRatio;
  const h = canvasFeynmanDiagram.height / window.devicePixelRatio;
  ctxFeynmanDiagram.clearRect(0, 0, w, h);
  
  const cx = w / 2;
  const cy = h / 2;
  
  ctxFeynmanDiagram.lineWidth = 2;
  ctxFeynmanDiagram.font = '12px var(--font-mono)';
  
  // Draw diagram based on process
  if (feynmanProcess === "e- e+ -> mu- mu+") {
    // s-channel only
    
    // Virtual photon
    ctxFeynmanDiagram.strokeStyle = '#fff';
    ctxFeynmanDiagram.beginPath();
    ctxFeynmanDiagram.moveTo(cx - 30, cy);
    for (let x = cx - 30; x <= cx + 30; x += 5) {
      ctxFeynmanDiagram.lineTo(x, cy + Math.sin(x * 0.5 - animFrame * 0.2) * 5);
    }
    ctxFeynmanDiagram.stroke();
    
    // Initial state (left) e- (top), e+ (bottom)
    ctxFeynmanDiagram.strokeStyle = '#00f0ff';
    drawArrowLine(ctxFeynmanDiagram, cx - 80, cy - 50, cx - 30, cy);
    drawArrowLine(ctxFeynmanDiagram, cx - 30, cy, cx - 80, cy + 50); // e+ arrow reversed
    ctxFeynmanDiagram.fillStyle = '#00f0ff';
    ctxFeynmanDiagram.fillText('e⁻', cx - 95, cy - 50);
    ctxFeynmanDiagram.fillText('e⁺', cx - 95, cy + 55);
    
    // Final state (right) mu- (top), mu+ (bottom)
    ctxFeynmanDiagram.strokeStyle = '#ff3366';
    drawArrowLine(ctxFeynmanDiagram, cx + 30, cy, cx + 80, cy - 50);
    drawArrowLine(ctxFeynmanDiagram, cx + 80, cy + 50, cx + 30, cy); // mu+ arrow reversed
    ctxFeynmanDiagram.fillStyle = '#ff3366';
    ctxFeynmanDiagram.fillText('μ⁻', cx + 90, cy - 50);
    ctxFeynmanDiagram.fillText('μ⁺', cx + 90, cy + 55);
    
    // Labels
    ctxFeynmanDiagram.fillStyle = '#fff';
    ctxFeynmanDiagram.fillText('γ (s-channel)', cx - 40, cy - 15);
    
  } else if (feynmanProcess === "e- e+ -> e- e+") {
    // Show t-channel dominant for Bhabha
    ctxFeynmanDiagram.strokeStyle = '#fff';
    ctxFeynmanDiagram.beginPath();
    ctxFeynmanDiagram.moveTo(cx, cy - 30);
    for (let y = cy - 30; y <= cy + 30; y += 5) {
      ctxFeynmanDiagram.lineTo(cx + Math.sin(y * 0.5 - animFrame * 0.2) * 5, y);
    }
    ctxFeynmanDiagram.stroke();
    
    // e- (top)
    ctxFeynmanDiagram.strokeStyle = '#00f0ff';
    drawArrowLine(ctxFeynmanDiagram, cx - 70, cy - 30, cx, cy - 30);
    drawArrowLine(ctxFeynmanDiagram, cx, cy - 30, cx + 70, cy - 30);
    
    // e+ (bottom)
    drawArrowLine(ctxFeynmanDiagram, cx, cy + 30, cx - 70, cy + 30);
    drawArrowLine(ctxFeynmanDiagram, cx + 70, cy + 30, cx, cy + 30);
    
    ctxFeynmanDiagram.fillStyle = '#00f0ff';
    ctxFeynmanDiagram.fillText('e⁻', cx - 85, cy - 25);
    ctxFeynmanDiagram.fillText('e⁻', cx + 80, cy - 25);
    ctxFeynmanDiagram.fillText('e⁺', cx - 85, cy + 35);
    ctxFeynmanDiagram.fillText('e⁺', cx + 80, cy + 35);
    
    ctxFeynmanDiagram.fillStyle = '#fff';
    ctxFeynmanDiagram.fillText('γ (t-channel)', cx + 10, cy + 5);
    
  } else if (feynmanProcess === "e- e- -> e- e-") {
    // Show t-channel
    ctxFeynmanDiagram.strokeStyle = '#fff';
    ctxFeynmanDiagram.beginPath();
    ctxFeynmanDiagram.moveTo(cx, cy - 30);
    for (let y = cy - 30; y <= cy + 30; y += 5) {
      ctxFeynmanDiagram.lineTo(cx + Math.sin(y * 0.5 - animFrame * 0.2) * 5, y);
    }
    ctxFeynmanDiagram.stroke();
    
    ctxFeynmanDiagram.strokeStyle = '#00f0ff';
    drawArrowLine(ctxFeynmanDiagram, cx - 70, cy - 30, cx, cy - 30);
    drawArrowLine(ctxFeynmanDiagram, cx, cy - 30, cx + 70, cy - 30);
    
    drawArrowLine(ctxFeynmanDiagram, cx - 70, cy + 30, cx, cy + 30);
    drawArrowLine(ctxFeynmanDiagram, cx, cy + 30, cx + 70, cy + 30);
    
    ctxFeynmanDiagram.fillStyle = '#00f0ff';
    ctxFeynmanDiagram.fillText('e⁻', cx - 85, cy - 25);
    ctxFeynmanDiagram.fillText('e⁻', cx + 80, cy - 25);
    ctxFeynmanDiagram.fillText('e⁻', cx - 85, cy + 35);
    ctxFeynmanDiagram.fillText('e⁻', cx + 80, cy + 35);
    
    ctxFeynmanDiagram.fillStyle = '#fff';
    ctxFeynmanDiagram.fillText('γ (t-channel)', cx + 10, cy + 5);
  }
}

function drawArrowLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(midX - 8 * Math.cos(angle - Math.PI/6), midY - 8 * Math.sin(angle - Math.PI/6));
  ctx.lineTo(midX - 8 * Math.cos(angle + Math.PI/6), midY - 8 * Math.sin(angle + Math.PI/6));
  ctx.fill();
}

function drawScatteringPolarPlot(animFrame) {
  if (!ctxFeynmanScattering) return;
  const w = canvasFeynmanScattering.width / window.devicePixelRatio;
  const h = canvasFeynmanScattering.height / window.devicePixelRatio;
  ctxFeynmanScattering.clearRect(0, 0, w, h);
  
  const cx = w / 2;
  const cy = h / 2;
  
  // Draw polar grid
  ctxFeynmanScattering.strokeStyle = 'rgba(255,255,255,0.05)';
  ctxFeynmanScattering.beginPath(); ctxFeynmanScattering.arc(cx, cy, 30, 0, Math.PI*2); ctxFeynmanScattering.stroke();
  ctxFeynmanScattering.beginPath(); ctxFeynmanScattering.arc(cx, cy, 60, 0, Math.PI*2); ctxFeynmanScattering.stroke();
  ctxFeynmanScattering.beginPath(); ctxFeynmanScattering.arc(cx, cy, 90, 0, Math.PI*2); ctxFeynmanScattering.stroke();
  
  ctxFeynmanScattering.beginPath(); ctxFeynmanScattering.moveTo(cx - 100, cy); ctxFeynmanScattering.lineTo(cx + 100, cy); ctxFeynmanScattering.stroke();
  ctxFeynmanScattering.beginPath(); ctxFeynmanScattering.moveTo(cx, cy - 100); ctxFeynmanScattering.lineTo(cx, cy + 100); ctxFeynmanScattering.stroke();
  
  const s = feynmanEnergy * feynmanEnergy;
  const points = [];
  let max_val = 0;
  
  // Calculate polar values
  for (let theta = 0; theta < Math.PI * 2; theta += 0.05) {
    let t_val = theta;
    if (t_val > Math.PI) t_val = Math.PI*2 - t_val; // symmetry
    let val = computeDifferentialCrossSectionJS(feynmanProcess, s, t_val);
    if (val > max_val && t_val > 0.05 && t_val < Math.PI - 0.05) max_val = val; // ignore strict forward peaks for scaling
    points.push({th: theta, r: val});
  }
  
  if (max_val === 0) max_val = 1;
  const scale = 90 / max_val;
  
  ctxFeynmanScattering.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let r_scaled = p.r * scale;
    if (r_scaled > 100) r_scaled = 100; // cap for forward peaks
    const px = cx + r_scaled * Math.cos(p.th);
    const py = cy - r_scaled * Math.sin(p.th); // y inverted on canvas
    if (i === 0) ctxFeynmanScattering.moveTo(px, py);
    else ctxFeynmanScattering.lineTo(px, py);
  }
  ctxFeynmanScattering.closePath();
  
  let grad = ctxFeynmanScattering.createRadialGradient(cx, cy, 0, cx, cy, 100);
  grad.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
  grad.addColorStop(1, 'rgba(0, 240, 255, 0.1)');
  
  ctxFeynmanScattering.fillStyle = grad;
  ctxFeynmanScattering.fill();
  ctxFeynmanScattering.strokeStyle = '#00f0ff';
  ctxFeynmanScattering.lineWidth = 2;
  ctxFeynmanScattering.stroke();
  
  // Incoming beam indicator
  ctxFeynmanScattering.strokeStyle = '#ffaa00';
  ctxFeynmanScattering.setLineDash([4, 4]);
  drawArrowLine(ctxFeynmanScattering, cx - 110, cy, cx - 20, cy);
  ctxFeynmanScattering.setLineDash([]);
  ctxFeynmanScattering.fillStyle = '#ffaa00';
  ctxFeynmanScattering.font = '10px var(--font-sans)';
  ctxFeynmanScattering.fillText('Beam Axis', cx - 110, cy - 10);
  
  // Animated scattered particles
  const numParticles = 8;
  ctxFeynmanScattering.fillStyle = '#fff';
  for (let i = 0; i < numParticles; i++) {
    const r_anim = (animFrame * 2 + i * 20) % 100;
    const th_anim = (i * Math.PI * 2) / numParticles;
    
    // Probability weighting: particles should appear more where cross-section is high
    let th_sym = th_anim;
    if (th_sym > Math.PI) th_sym = Math.PI*2 - th_sym;
    const prob = computeDifferentialCrossSectionJS(feynmanProcess, s, th_sym) * scale;
    const cap_prob = Math.min(prob / 100.0, 1.0);
    
    ctxFeynmanScattering.globalAlpha = 0.2 + cap_prob * 0.8;
    ctxFeynmanScattering.beginPath();
    ctxFeynmanScattering.arc(cx + r_anim * Math.cos(th_anim), cy - r_anim * Math.sin(th_anim), 2, 0, Math.PI*2);
    ctxFeynmanScattering.fill();
  }
  ctxFeynmanScattering.globalAlpha = 1.0;
}

function renderFeynmanPhysicsMath() {
  const container = document.getElementById('feynman-physics-details');
  if (!container) return;
  
  let formula = "";
  if (feynmanProcess === "e- e+ -> mu- mu+") {
    formula = `|\\mathcal{M}|^2 = 2e^4 \\frac{t^2 + u^2}{s^2}`;
  } else if (feynmanProcess === "e- e+ -> e- e+") {
    formula = `|\\mathcal{M}|^2 = 2e^4 \\left( \\frac{s^2+u^2}{t^2} + \\frac{t^2+u^2}{s^2} + \\frac{2u^2}{st} \\right)`;
  } else {
    formula = `|\\mathcal{M}|^2 = 2e^4 \\left( \\frac{s^2+u^2}{t^2} + \\frac{s^2+t^2}{u^2} + \\frac{2s^2}{tu} \\right)`;
  }
  
  const html = `
    <div class="physics-formula-title">
      <span>📐 QED Scattering Cross Section & Mandelstam Variables</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      양자장론(QFT)에서 산란 진폭(Amplitude, $\\mathcal{M}$)은 **파인만 다이어그램(Feynman Diagram)** 의 각 정점(Vertex)과 전파인자(Propagator)에 대응되는 파인만 규칙(Feynman Rules)을 곱하여 얻어집니다.
      
      <p style="margin-top: 0.5rem;"><b>1. Mandelstam Variables (만델스탐 변수)</b></p>
      로렌츠 불변량인 만델스탐 변수는 질량이 무시되는 고에너지 한계($\\sqrt{s} \\gg m$)에서 다음과 같습니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        s = 4E^2, \\quad t = -\\frac{s}{2}(1-\\cos\\theta), \\quad u = -\\frac{s}{2}(1+\\cos\\theta)
      </div>
      
      <p style="margin-top: 0.5rem;"><b>2. Tree-level Amplitude & Cross Section</b></p>
      선택된 반응에 대한 행렬식의 절댓값 제곱($|\\mathcal{M}|^2$)은 다음과 같습니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #ffaa00;">
        ${formula}
      </div>
      이를 통해 위쪽 캔버스에 시각화된 미분 단면적(Differential Cross Section) 극좌표 분포는 다음 공식에 의해 결정됩니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        \\frac{d\\sigma}{d\\Omega} = \\frac{|\\mathcal{M}|^2}{64\\pi^2 s}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================================
// 14. Cosmology & Dark Matter Freeze-out Lab
// ============================================================================

function initCosmologyLab() {
  canvasCosmoEvol = document.getElementById('canvas-cosmology-evolution');
  ctxCosmoEvol = canvasCosmoEvol.getContext('2d');
  canvasCosmoMicro = document.getElementById('canvas-cosmology-micro');
  ctxCosmoMicro = canvasCosmoMicro.getContext('2d');
  
  resizeCanvas();
  
  updateCosmologyParameters();
  
  if (cosmoLoopId) {
    cancelAnimationFrame(cosmoLoopId);
  }
  
  // Initialize micro particles
  cosmoMicroParticles = [];
  for(let i=0; i<100; i++) {
    cosmoMicroParticles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.02,
      active: true
    });
  }
  
  let animFrame = 0;
  function cosmoLoop() {
    drawCosmoEvolutionGraph(animFrame);
    drawCosmoMicroSimulation(animFrame);
    animFrame++;
    cosmoLoopId = requestAnimationFrame(cosmoLoop);
  }
  
  cosmoLoop();
}

function updateCosmologyParameters() {
  cosmoMass = parseFloat(document.getElementById('slider-cosmology-mass').value);
  cosmoSigmaVLog = parseFloat(document.getElementById('slider-cosmology-sigma').value);
  
  const sigmaV = Math.pow(10, cosmoSigmaVLog);
  
  document.getElementById('label-cosmology-mass').innerText = `${cosmoMass.toFixed(1)} GeV`;
  document.getElementById('label-cosmology-sigma').innerText = `${sigmaV.toExponential(2)} cm³/s`;
  
  // Calculate freeze-out
  // 1 cm^3/s = 8.5e16 GeV^-2
  const g = 2.0;
  const g_star = 106.75;
  const M_Pl = 1.22e19;
  const sigmaV_GeV = sigmaV * 8.5e16;
  
  let C = 0.038 * (g / Math.sqrt(g_star)) * cosmoMass * M_Pl * sigmaV_GeV;
  let x_f = 1.0;
  if (C > 1.0) {
    let guess = Math.log(C);
    x_f = Math.log(C) - 0.5 * Math.log(guess);
    x_f = Math.log(C) - 0.5 * Math.log(x_f);
  }
  
  let omega_h2 = (1.07e9 * x_f) / (Math.sqrt(g_star) * M_Pl * sigmaV_GeV);
  if (C <= 1.0) {
     omega_h2 = Infinity; // Overclose
  }
  
  cosmoXf = x_f;
  cosmoOmega = omega_h2;
  
  let badge = document.getElementById('cosmology-relic-badge');
  if (omega_h2 > 100) {
    badge.innerText = `RELIC DENSITY Ω_χ h²: UNIVERSE OVERCLOSED`;
    badge.style.color = '#ff3366';
    badge.style.borderColor = '#ff3366';
    badge.style.background = 'rgba(255, 51, 102, 0.08)';
  } else {
    badge.innerText = `RELIC DENSITY Ω_χ h²: ${omega_h2.toFixed(4)}`;
    if (omega_h2 >= 0.11 && omega_h2 <= 0.13) {
       badge.style.color = '#00ffaa';
       badge.style.borderColor = '#00ffaa';
       badge.style.background = 'rgba(0, 255, 170, 0.08)';
    } else {
       badge.style.color = '#a855f7';
       badge.style.borderColor = '#a855f7';
       badge.style.background = 'rgba(168, 85, 247, 0.08)';
    }
  }
  
  renderCosmologyPhysicsMath();
}

function drawCosmoEvolutionGraph(animFrame) {
  if (!ctxCosmoEvol) return;
  const w = canvasCosmoEvol.width / window.devicePixelRatio;
  const h = canvasCosmoEvol.height / window.devicePixelRatio;
  ctxCosmoEvol.clearRect(0, 0, w, h);
  
  // Axes
  ctxCosmoEvol.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxCosmoEvol.beginPath();
  ctxCosmoEvol.moveTo(40, 10); ctxCosmoEvol.lineTo(40, h-20); ctxCosmoEvol.lineTo(w-10, h-20);
  ctxCosmoEvol.stroke();
  
  ctxCosmoEvol.fillStyle = 'rgba(255,255,255,0.5)';
  ctxCosmoEvol.font = '10px var(--font-sans)';
  ctxCosmoEvol.fillText('Y', 20, 20);
  ctxCosmoEvol.fillText('x = m/T', w - 40, h - 5);
  
  // log x from 1 to 1000
  // log y from 1e-15 to 1
  const mapX = (x) => 40 + (Math.log10(x) / 3.0) * (w - 50);
  const mapY = (y) => {
    if (y < 1e-15) y = 1e-15;
    if (y > 1) y = 1;
    return (h - 20) - ((Math.log10(y) + 15) / 15.0) * (h - 30);
  };
  
  // Draw Y_eq curve
  ctxCosmoEvol.beginPath();
  ctxCosmoEvol.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctxCosmoEvol.setLineDash([4, 4]);
  for (let x = 1.0; x <= 1000; x *= 1.1) {
    let Y_eq = 0.145 * (2.0 / 106.75) * Math.pow(x, 1.5) * Math.exp(-x);
    if (x === 1.0) ctxCosmoEvol.moveTo(mapX(x), mapY(Y_eq));
    else ctxCosmoEvol.lineTo(mapX(x), mapY(Y_eq));
  }
  ctxCosmoEvol.stroke();
  ctxCosmoEvol.setLineDash([]);
  
  // Draw actual Y curve
  ctxCosmoEvol.beginPath();
  ctxCosmoEvol.strokeStyle = '#00f0ff';
  ctxCosmoEvol.lineWidth = 2;
  
  let currentY = 0.145 * (2.0 / 106.75) * Math.pow(1.0, 1.5) * Math.exp(-1.0);
  let freezeOutY = 0.145 * (2.0 / 106.75) * Math.pow(cosmoXf, 1.5) * Math.exp(-cosmoXf);
  if (cosmoXf <= 1.0) freezeOutY = currentY;
  
  for (let x = 1.0; x <= 1000; x *= 1.05) {
    let y_val = 0.145 * (2.0 / 106.75) * Math.pow(x, 1.5) * Math.exp(-x);
    if (x >= cosmoXf) {
      y_val = freezeOutY; // Freezes out
    }
    if (x === 1.0) ctxCosmoEvol.moveTo(mapX(x), mapY(y_val));
    else ctxCosmoEvol.lineTo(mapX(x), mapY(y_val));
  }
  ctxCosmoEvol.stroke();
  ctxCosmoEvol.lineWidth = 1;
  
  // Draw marker
  const markerX = mapX(cosmoXf);
  const markerY = mapY(freezeOutY);
  ctxCosmoEvol.fillStyle = '#ffaa00';
  ctxCosmoEvol.beginPath();
  ctxCosmoEvol.arc(markerX, markerY, 4, 0, Math.PI*2);
  ctxCosmoEvol.fill();
  ctxCosmoEvol.fillText('Freeze-out', markerX + 8, markerY - 8);
}

function drawCosmoMicroSimulation(animFrame) {
  if (!ctxCosmoMicro) return;
  const w = canvasCosmoMicro.width / window.devicePixelRatio;
  const h = canvasCosmoMicro.height / window.devicePixelRatio;
  ctxCosmoMicro.clearRect(0, 0, w, h);
  
  // Simulate expansion of the universe. Scale factor a(t) increases over time.
  // We represent this by expanding the coordinates of particles.
  // Let animFrame go from 0 to 600, mapping roughly to x from 1 to 50
  let progress = (animFrame % 600) / 600; 
  let currentX = 1.0 + progress * 49.0;
  
  let scaleFactor = Math.sqrt(currentX); // Radiation era a ~ sqrt(t) ~ sqrt(x)
  let maxScale = Math.sqrt(50.0);
  let renderScale = scaleFactor / maxScale; // 0.1 to 1.0
  
  // Draw expanding grid
  ctxCosmoMicro.strokeStyle = 'rgba(255,255,255,0.05)';
  const gridSpacing = 20 * renderScale;
  const cx = w/2; const cy = h/2;
  for(let i=0; i<w/2; i+=gridSpacing) {
    ctxCosmoMicro.beginPath(); ctxCosmoMicro.moveTo(cx+i, 0); ctxCosmoMicro.lineTo(cx+i, h); ctxCosmoMicro.stroke();
    ctxCosmoMicro.beginPath(); ctxCosmoMicro.moveTo(cx-i, 0); ctxCosmoMicro.lineTo(cx-i, h); ctxCosmoMicro.stroke();
  }
  for(let j=0; j<h/2; j+=gridSpacing) {
    ctxCosmoMicro.beginPath(); ctxCosmoMicro.moveTo(0, cy+j); ctxCosmoMicro.lineTo(w, cy+j); ctxCosmoMicro.stroke();
    ctxCosmoMicro.beginPath(); ctxCosmoMicro.moveTo(0, cy-j); ctxCosmoMicro.lineTo(w, cy-j); ctxCosmoMicro.stroke();
  }
  
  ctxCosmoMicro.fillStyle = 'rgba(255,255,255,0.5)';
  ctxCosmoMicro.font = '10px var(--font-mono)';
  ctxCosmoMicro.fillText(`Time (x=m/T): ${currentX.toFixed(1)}`, 10, 20);
  ctxCosmoMicro.fillText(`Scale Factor a: ${scaleFactor.toFixed(2)}`, 10, 35);
  
  // Interaction cross-section mapped to radius
  const sigmaRadius = Math.max(2, (cosmoSigmaVLog + 28) * 3);
  
  // Update particles
  let activeCount = 0;
  for (let i = 0; i < cosmoMicroParticles.length; i++) {
    let p = cosmoMicroParticles[i];
    if (progress < 0.01) p.active = true; // reset
    if (!p.active) continue;
    activeCount++;
    
    // Thermal motion decreases as temperature drops (x increases)
    let thermalV = 0.05 / Math.sqrt(currentX);
    p.x += p.vx * thermalV;
    p.y += p.vy * thermalV;
    
    // Hubble expansion drag (particles move away from center relative to comoving grid)
    p.x = (p.x - 0.5) * 1.001 + 0.5;
    p.y = (p.y - 0.5) * 1.001 + 0.5;
    
    // Bounce bounds (comoving box)
    if(p.x < 0) { p.x = 0; p.vx *= -1; }
    if(p.x > 1) { p.x = 1; p.vx *= -1; }
    if(p.y < 0) { p.y = 0; p.vy *= -1; }
    if(p.y > 1) { p.y = 1; p.vy *= -1; }
  }
  
  // Annihilation logic
  for (let i = 0; i < cosmoMicroParticles.length; i++) {
    let p1 = cosmoMicroParticles[i];
    if (!p1.active) continue;
    for (let j = i+1; j < cosmoMicroParticles.length; j++) {
      let p2 = cosmoMicroParticles[j];
      if (!p2.active) continue;
      
      let dx = (p1.x - p2.x) * w;
      let dy = (p1.y - p2.y) * h;
      let dist = Math.sqrt(dx*dx + dy*dy);
      
      // If within annihilation radius, they destroy each other
      if (dist < sigmaRadius / renderScale) { // effective radius shrinks as universe expands
         p1.active = false;
         p2.active = false;
         // Draw flash
         ctxCosmoMicro.fillStyle = '#ff3366';
         ctxCosmoMicro.beginPath(); ctxCosmoMicro.arc(p1.x*w, p1.y*h, 10, 0, Math.PI*2); ctxCosmoMicro.fill();
         break;
      }
    }
  }
  
  // Draw active particles
  for (let i = 0; i < cosmoMicroParticles.length; i++) {
    let p = cosmoMicroParticles[i];
    if (!p.active) continue;
    ctxCosmoMicro.fillStyle = '#00f0ff';
    ctxCosmoMicro.shadowColor = '#00f0ff';
    ctxCosmoMicro.shadowBlur = 5;
    ctxCosmoMicro.beginPath();
    ctxCosmoMicro.arc(p.x * w, p.y * h, 3, 0, Math.PI*2);
    ctxCosmoMicro.fill();
    ctxCosmoMicro.shadowBlur = 0;
  }
  
  ctxCosmoMicro.fillStyle = 'rgba(255,255,255,0.7)';
  ctxCosmoMicro.fillText(`Comoving Density: ${activeCount} / 100`, 10, h - 10);
  
  if (currentX > cosmoXf && activeCount > 0) {
    ctxCosmoMicro.fillStyle = '#ffaa00';
    ctxCosmoMicro.fillText(`FROZEN OUT`, w - 80, 20);
  }
}

function renderCosmologyPhysicsMath() {
  const container = document.getElementById('cosmology-physics-details');
  if (!container) return;
  
  const html = `
    <div class="physics-formula-title">
      <span>🌌 Friedmann & Boltzmann Equations</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      우주가 팽창하면서 암흑물질 입자가 열역학적 평형을 유지하다가, 쌍소멸(Annihilation) 반응률($\\Gamma$)이 허블 팽창률($H$)보다 작아지는 순간 밀도가 <b>동결(Freeze-out)</b>됩니다.
      
      <p style="margin-top: 0.5rem;"><b>1. Hubble Expansion (허블 팽창률)</b></p>
      방사선 우세 우주에서 프리드만 방정식에 의한 허블 상수:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        H(T) \\simeq 1.66 \\sqrt{g_*} \\frac{T^2}{M_{Pl}}
      </div>
      
      <p style="margin-top: 0.5rem;"><b>2. Boltzmann Equation (볼츠만 진화 방정식)</b></p>
      공변 수 밀도(Comoving Number Density) $Y = n/s$ 의 진화:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        \\frac{dY}{dx} = -\\frac{s(x)}{H(x) x} \\langle \\sigma v \\rangle \\left( Y^2 - Y_{eq}^2 \\right)
      </div>
      $x = m/T$ 가 증가함에 따라 $Y$는 $Y_{eq}$를 따라 감소하다가, $Y \\simeq Y_{eq}$ 교차점인 $x_f$ 에서 동결됩니다.
      
      <p style="margin-top: 0.5rem;"><b>3. Relic Density (잔존 밀도)</b></p>
      오늘날 우주의 암흑물질 잔존 밀도 $\\Omega_\\chi h^2$ 의 근사해:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #ffaa00;">
        \\Omega_\\chi h^2 \\simeq \\frac{1.07 \\times 10^9 \\text{ GeV}^{-1}}{M_{Pl} \\sqrt{g_*} J(x_f)} \\approx \\frac{1.07 \\times 10^9 x_f}{M_{Pl} \\sqrt{g_*} \\langle \\sigma v \\rangle}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================================
// 15. Neutrino Oscillation & MSW Effect Lab
// ============================================================================

// PMNS mixing parameters (PDG 2024 best-fit, Normal Ordering)
const PMNS_PARAMS = {
  theta12: 33.44 * Math.PI / 180,
  theta23: 49.2 * Math.PI / 180,
  theta13: 8.57 * Math.PI / 180,
  delta_cp: 197 * Math.PI / 180,
  dm21_sq: 7.42e-5, // eV^2
  dm31_sq: 2.515e-3  // eV^2
};

function getNuOscParams(flavorFrom, flavorTo) {
  // Returns {theta, dm_sq} for the dominant 2-flavor channel
  if ((flavorFrom === 'nu_e' && flavorTo === 'nu_mu') ||
      (flavorFrom === 'nu_mu' && flavorTo === 'nu_e')) {
    return { theta: PMNS_PARAMS.theta13, dm_sq: PMNS_PARAMS.dm31_sq };
  } else if ((flavorFrom === 'nu_e' && flavorTo === 'nu_tau') ||
             (flavorFrom === 'nu_tau' && flavorTo === 'nu_e')) {
    return { theta: PMNS_PARAMS.theta13, dm_sq: PMNS_PARAMS.dm31_sq };
  } else if ((flavorFrom === 'nu_mu' && flavorTo === 'nu_tau') ||
             (flavorFrom === 'nu_tau' && flavorTo === 'nu_mu')) {
    return { theta: PMNS_PARAMS.theta23, dm_sq: PMNS_PARAMS.dm31_sq };
  }
  return { theta: 0, dm_sq: 0 };
}

function computeNuOscProbJS(flavorFrom, flavorTo, E, L) {
  // P(a->b) = sin^2(2*theta) * sin^2(1.267 * dm^2 * L / E)
  // E in GeV, L in km, dm^2 in eV^2
  if (flavorFrom === flavorTo) {
    // Survival probability: sum over all disappearance channels
    let p_disapp = 0;
    const flavors = ['nu_e', 'nu_mu', 'nu_tau'];
    for (const f of flavors) {
      if (f !== flavorFrom) {
        p_disapp += computeNuOscProbJS(flavorFrom, f, E, L);
      }
    }
    return Math.max(0, 1.0 - p_disapp);
  }
  
  const params = getNuOscParams(flavorFrom, flavorTo);
  const sin2_2theta = Math.pow(Math.sin(2 * params.theta), 2);
  const phase = 1.267 * params.dm_sq * L / E;
  return sin2_2theta * Math.pow(Math.sin(phase), 2);
}

function initNeutrinoOscLab() {
  canvasNuOsc = document.getElementById('canvas-neutrino-osc');
  ctxNuOsc = canvasNuOsc.getContext('2d');
  canvasMSW = document.getElementById('canvas-msw-effect');
  ctxMSW = canvasMSW.getContext('2d');
  
  resizeCanvas();
  updateNeutrinoOscParameters();
  
  if (nuOscLoopId) {
    cancelAnimationFrame(nuOscLoopId);
  }
  
  let animFrame = 0;
  function nuOscLoop() {
    drawNuOscProbGraph(animFrame);
    drawMSWEffectPlot(animFrame);
    animFrame++;
    nuOscLoopId = requestAnimationFrame(nuOscLoop);
  }
  nuOscLoop();
}

function updateNeutrinoOscParameters() {
  nuOscFrom = document.getElementById('select-nu-from').value;
  nuOscTo = document.getElementById('select-nu-to').value;
  nuOscEnergy = parseFloat(document.getElementById('slider-nu-energy').value);
  nuOscDensityLog = parseFloat(document.getElementById('slider-nu-density').value);
  
  document.getElementById('label-nu-energy').innerText = `${nuOscEnergy.toFixed(1)} GeV`;
  const ne = Math.pow(10, nuOscDensityLog);
  document.getElementById('label-nu-density').innerText = `${ne.toExponential(1)} cm\u207b\u00b3`;
  
  // Update PMNS badge
  const params = getNuOscParams(nuOscFrom, nuOscTo);
  const sin2_2theta = Math.pow(Math.sin(2 * params.theta), 2);
  const badge = document.getElementById('neutrino-pmns-badge');
  
  if (nuOscFrom === nuOscTo) {
    badge.innerText = `SURVIVAL: P(\u03bd_\u03b1 \u2192 \u03bd_\u03b1) | sin\u00b2(2\u03b8) = ${sin2_2theta.toFixed(4)}`;
    badge.style.color = '#ffaa00';
    badge.style.borderColor = 'rgba(255, 170, 0, 0.3)';
  } else {
    badge.innerText = `TRANSITION: sin\u00b2(2\u03b8) = ${sin2_2theta.toFixed(4)} | \u0394m\u00b2 = ${(params.dm_sq * 1e3).toFixed(2)}\u00d710\u207b\u00b3 eV\u00b2`;
    badge.style.color = '#00f0ff';
    badge.style.borderColor = 'rgba(0, 240, 255, 0.3)';
  }
  
  renderNeutrinoOscPhysicsMath();
}

function drawNuOscProbGraph(animFrame) {
  if (!ctxNuOsc) return;
  const w = canvasNuOsc.width / window.devicePixelRatio;
  const h = canvasNuOsc.height / window.devicePixelRatio;
  ctxNuOsc.clearRect(0, 0, w, h);
  
  const padL = 45, padR = 10, padT = 15, padB = 25;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  
  // Axes
  ctxNuOsc.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxNuOsc.beginPath();
  ctxNuOsc.moveTo(padL, padT);
  ctxNuOsc.lineTo(padL, h - padB);
  ctxNuOsc.lineTo(w - padR, h - padB);
  ctxNuOsc.stroke();
  
  ctxNuOsc.fillStyle = 'rgba(255,255,255,0.5)';
  ctxNuOsc.font = '10px var(--font-sans)';
  ctxNuOsc.fillText('P', 10, padT + 5);
  ctxNuOsc.fillText('L (km)', w - 40, h - 5);
  
  // Y-axis labels
  ctxNuOsc.fillText('1.0', 22, padT + 5);
  ctxNuOsc.fillText('0.5', 22, padT + plotH / 2 + 3);
  ctxNuOsc.fillText('0', 28, h - padB - 2);
  
  // Compute oscillation length for auto-scaling
  const params = getNuOscParams(nuOscFrom, nuOscTo);
  let L_osc = (nuOscEnergy * Math.PI) / (1.267 * params.dm_sq); // half oscillation length
  if (L_osc <= 0 || !isFinite(L_osc)) L_osc = 1000;
  const L_max = L_osc * 4; // Show 2 full oscillations
  
  const mapX = (L) => padL + (L / L_max) * plotW;
  const mapY = (P) => padT + plotH - P * plotH;
  
  // Draw grid lines
  ctxNuOsc.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i <= 4; i++) {
    const lx = padL + (i / 4) * plotW;
    ctxNuOsc.beginPath(); ctxNuOsc.moveTo(lx, padT); ctxNuOsc.lineTo(lx, h - padB); ctxNuOsc.stroke();
  }
  ctxNuOsc.setLineDash([2, 2]);
  ctxNuOsc.strokeStyle = 'rgba(255,255,255,0.1)';
  ctxNuOsc.beginPath(); ctxNuOsc.moveTo(padL, mapY(0.5)); ctxNuOsc.lineTo(w - padR, mapY(0.5)); ctxNuOsc.stroke();
  ctxNuOsc.beginPath(); ctxNuOsc.moveTo(padL, mapY(1.0)); ctxNuOsc.lineTo(w - padR, mapY(1.0)); ctxNuOsc.stroke();
  ctxNuOsc.setLineDash([]);
  
  // Draw P(transition) curve
  ctxNuOsc.beginPath();
  ctxNuOsc.strokeStyle = '#00f0ff';
  ctxNuOsc.lineWidth = 2;
  const steps = 500;
  for (let i = 0; i <= steps; i++) {
    const L = (i / steps) * L_max;
    const P = computeNuOscProbJS(nuOscFrom, nuOscTo, nuOscEnergy, L);
    if (i === 0) ctxNuOsc.moveTo(mapX(L), mapY(P));
    else ctxNuOsc.lineTo(mapX(L), mapY(P));
  }
  ctxNuOsc.stroke();
  ctxNuOsc.lineWidth = 1;
  
  // Draw survival probability (complement)
  if (nuOscFrom !== nuOscTo) {
    ctxNuOsc.beginPath();
    ctxNuOsc.strokeStyle = 'rgba(255, 170, 0, 0.4)';
    ctxNuOsc.setLineDash([4, 4]);
    for (let i = 0; i <= steps; i++) {
      const L = (i / steps) * L_max;
      const P_surv = computeNuOscProbJS(nuOscFrom, nuOscFrom, nuOscEnergy, L);
      if (i === 0) ctxNuOsc.moveTo(mapX(L), mapY(P_surv));
      else ctxNuOsc.lineTo(mapX(L), mapY(P_surv));
    }
    ctxNuOsc.stroke();
    ctxNuOsc.setLineDash([]);
  }
  
  // Animated traveling neutrino dot
  const travDist = (animFrame * 3) % steps;
  const travL = (travDist / steps) * L_max;
  const travP = computeNuOscProbJS(nuOscFrom, nuOscTo, nuOscEnergy, travL);
  
  ctxNuOsc.fillStyle = '#00f0ff';
  ctxNuOsc.shadowColor = '#00f0ff';
  ctxNuOsc.shadowBlur = 8;
  ctxNuOsc.beginPath();
  ctxNuOsc.arc(mapX(travL), mapY(travP), 4, 0, Math.PI * 2);
  ctxNuOsc.fill();
  ctxNuOsc.shadowBlur = 0;
  
  // X-axis labels
  ctxNuOsc.fillStyle = 'rgba(255,255,255,0.4)';
  ctxNuOsc.font = '9px var(--font-mono)';
  for (let i = 0; i <= 4; i++) {
    const lVal = (i / 4) * L_max;
    ctxNuOsc.fillText(lVal >= 1000 ? `${(lVal/1000).toFixed(0)}k` : lVal.toFixed(0), padL + (i / 4) * plotW - 8, h - 5);
  }
  
  // Legend
  ctxNuOsc.fillStyle = '#00f0ff';
  ctxNuOsc.font = '9px var(--font-sans)';
  ctxNuOsc.fillText(`P(${nuOscFrom.replace('nu_','\u03bd_')}\u2192${nuOscTo.replace('nu_','\u03bd_')})`, w - 100, padT + 15);
  if (nuOscFrom !== nuOscTo) {
    ctxNuOsc.fillStyle = 'rgba(255, 170, 0, 0.6)';
    ctxNuOsc.fillText(`P(survival)`, w - 100, padT + 28);
  }
}

function drawMSWEffectPlot(animFrame) {
  if (!ctxMSW) return;
  const w = canvasMSW.width / window.devicePixelRatio;
  const h = canvasMSW.height / window.devicePixelRatio;
  ctxMSW.clearRect(0, 0, w, h);
  
  const padL = 45, padR = 10, padT = 15, padB = 25;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  
  // Axes
  ctxMSW.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxMSW.beginPath();
  ctxMSW.moveTo(padL, padT);
  ctxMSW.lineTo(padL, h - padB);
  ctxMSW.lineTo(w - padR, h - padB);
  ctxMSW.stroke();
  
  ctxMSW.fillStyle = 'rgba(255,255,255,0.5)';
  ctxMSW.font = '10px var(--font-sans)';
  ctxMSW.fillText('sin\u00b22\u03b8_M', 2, padT + 5);
  ctxMSW.fillText('A parameter', w - 60, h - 5);
  
  // sin^2(2*theta_12) in vacuum
  const theta12 = PMNS_PARAMS.theta12;
  const sin2_2th = Math.pow(Math.sin(2 * theta12), 2);
  const cos2th = Math.cos(2 * theta12);
  
  // Compute MSW effective mixing angle vs A
  // sin^2(2*theta_M) = sin^2(2*theta) / sqrt((cos(2*theta) - A)^2 + sin^2(2*theta))
  // Actually the formula is:
  // sin^2(2*theta_M) = sin^2(2*theta) / [(cos(2*theta) - A)^2 + sin^2(2*theta)]
  // This peaks at A = cos(2*theta) where sin^2(2*theta_M) = 1
  
  const A_max = 3.0;
  const mapX_msw = (A) => padL + (A / A_max) * plotW;
  const mapY_msw = (v) => padT + plotH - v * plotH;
  
  // Grid
  ctxMSW.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let i = 1; i <= 5; i++) {
    const ax = padL + (i / 5) * plotW;
    ctxMSW.beginPath(); ctxMSW.moveTo(ax, padT); ctxMSW.lineTo(ax, h - padB); ctxMSW.stroke();
  }
  ctxMSW.setLineDash([2, 2]);
  ctxMSW.strokeStyle = 'rgba(255,255,255,0.1)';
  ctxMSW.beginPath(); ctxMSW.moveTo(padL, mapY_msw(0.5)); ctxMSW.lineTo(w - padR, mapY_msw(0.5)); ctxMSW.stroke();
  ctxMSW.beginPath(); ctxMSW.moveTo(padL, mapY_msw(1.0)); ctxMSW.lineTo(w - padR, mapY_msw(1.0)); ctxMSW.stroke();
  ctxMSW.setLineDash([]);
  
  // Draw MSW curve
  ctxMSW.beginPath();
  ctxMSW.strokeStyle = '#a855f7';
  ctxMSW.lineWidth = 2;
  
  for (let i = 0; i <= 500; i++) {
    const A = (i / 500) * A_max;
    const denom = Math.pow(cos2th - A, 2) + sin2_2th;
    const sin2_2thM = sin2_2th / denom;
    const clamped = Math.min(sin2_2thM, 1.0);
    if (i === 0) ctxMSW.moveTo(mapX_msw(A), mapY_msw(clamped));
    else ctxMSW.lineTo(mapX_msw(A), mapY_msw(clamped));
  }
  ctxMSW.stroke();
  ctxMSW.lineWidth = 1;
  
  // Draw vacuum value line
  ctxMSW.strokeStyle = 'rgba(255,255,255,0.3)';
  ctxMSW.setLineDash([4, 4]);
  ctxMSW.beginPath();
  ctxMSW.moveTo(padL, mapY_msw(sin2_2th));
  ctxMSW.lineTo(w - padR, mapY_msw(sin2_2th));
  ctxMSW.stroke();
  ctxMSW.setLineDash([]);
  
  ctxMSW.fillStyle = 'rgba(255,255,255,0.4)';
  ctxMSW.font = '9px var(--font-sans)';
  ctxMSW.fillText('vacuum', w - 50, mapY_msw(sin2_2th) - 4);
  
  // Mark resonance point A = cos(2*theta)
  const A_res = cos2th;
  ctxMSW.fillStyle = '#ff3366';
  ctxMSW.beginPath();
  ctxMSW.arc(mapX_msw(A_res), mapY_msw(1.0), 5, 0, Math.PI * 2);
  ctxMSW.fill();
  ctxMSW.fillStyle = '#ff3366';
  ctxMSW.font = '10px var(--font-sans)';
  ctxMSW.fillText('MSW Resonance', mapX_msw(A_res) + 8, mapY_msw(1.0) + 4);
  
  // Current user density marker
  const ne = Math.pow(10, nuOscDensityLog);
  const GF = 1.1664e-5; // GeV^-2
  const hbarc3 = Math.pow(0.197e-13, 3); // cm^3 * GeV^3
  const V_CC = Math.sqrt(2) * GF * ne * hbarc3;
  const dm21_GeV2 = PMNS_PARAMS.dm21_sq * 1e-18;
  let A_current = 0;
  if (dm21_GeV2 > 0) {
    A_current = 2 * nuOscEnergy * V_CC / dm21_GeV2;
  }
  
  if (A_current <= A_max && A_current >= 0) {
    const denom_cur = Math.pow(cos2th - A_current, 2) + sin2_2th;
    const sin2_2thM_cur = Math.min(sin2_2th / denom_cur, 1.0);
    
    ctxMSW.fillStyle = '#00f0ff';
    ctxMSW.shadowColor = '#00f0ff';
    ctxMSW.shadowBlur = 8;
    ctxMSW.beginPath();
    ctxMSW.arc(mapX_msw(A_current), mapY_msw(sin2_2thM_cur), 4, 0, Math.PI * 2);
    ctxMSW.fill();
    ctxMSW.shadowBlur = 0;
    
    ctxMSW.font = '9px var(--font-mono)';
    ctxMSW.fillText(`A=${A_current.toFixed(2)}`, mapX_msw(A_current) + 8, mapY_msw(sin2_2thM_cur) - 8);
  }
  
  // X-axis labels
  ctxMSW.fillStyle = 'rgba(255,255,255,0.4)';
  ctxMSW.font = '9px var(--font-mono)';
  for (let i = 0; i <= 3; i++) {
    ctxMSW.fillText((i).toFixed(0), padL + (i / 3) * plotW - 3, h - 5);
  }
}

function renderNeutrinoOscPhysicsMath() {
  const container = document.getElementById('neutrino-osc-physics-details');
  if (!container) return;
  
  const html = `
    <div class="physics-formula-title">
      <span>\ud83d\udd2e Neutrino Oscillation & MSW Effect</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      \uc911\uc131\ubbf8\uc790\uc758 <b>\ub9db \uace0\uc720\uc0c1\ud0dc(Flavor Eigenstate)</b>\uc640 <b>\uc9c8\ub7c9 \uace0\uc720\uc0c1\ud0dc(Mass Eigenstate)</b>\uac00 \uc11c\ub85c \ub2e4\ub974\uae30 \ub54c\ubb38\uc5d0, \ud55c \ub9db\uc73c\ub85c \uc0dd\uc131\ub41c \uc911\uc131\ubbf8\uc790\uac00 \uc2dc\uac04\uc774 \uc9c0\ub0a8\uc5d0 \ub530\ub77c \ub2e4\ub978 \ub9db\uc73c\ub85c \uc804\ud658(\uc9c4\ub3d9)\ub429\ub2c8\ub2e4.
      
      <p style="margin-top: 0.5rem;"><b>1. PMNS Mixing Matrix (PMNS \ud63c\ud569 \ud589\ub82c)</b></p>
      CKM \ud589\ub82c\uc774 \ucffc\ud06c\uc758 \ud63c\ud569\uc744 \uae30\uc220\ud558\ub294 \uac83\ucc98\ub7fc, PMNS \ud589\ub82c\uc740 \uc911\uc131\ubbf8\uc790\uc758 \ud63c\ud569\uc744 \uae30\uc220\ud569\ub2c8\ub2e4:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem;">
        |\\\\nu_\\\\alpha \\\\rangle = \\\\sum_{i=1}^{3} U_{\\\\alpha i}^* |\\\\nu_i \\\\rangle
      </div>
      
      <p style="margin-top: 0.5rem;"><b>2. Vacuum Oscillation Probability (\uc9c4\uacf5 \uc9c4\ub3d9 \ud655\ub960)</b></p>
      2\ub9db \uadfc\uc0ac\uc5d0\uc11c\uc758 \uc804\ud658 \ud655\ub960:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #00f0ff;">
        P(\\\\nu_\\\\alpha \\\\to \\\\nu_\\\\beta) = \\\\sin^2(2\\\\theta) \\\\cdot \\\\sin^2\\\\left( \\\\frac{1.267 \\\\Delta m^2 [\\\\text{eV}^2] \\\\cdot L[\\\\text{km}]}{E[\\\\text{GeV}]} \\\\right)
      </div>
      
      <p style="margin-top: 0.5rem;"><b>3. MSW Effect (Mikheyev-Smirnov-Wolfenstein \ubb3c\uc9c8 \ud6a8\uacfc)</b></p>
      \ubb3c\uc9c8 \ub0b4\ubd80(\ud0dc\uc591, \uc9c0\uad6c \ub4f1)\ub97c \ud1b5\uacfc\ud560 \ub54c, \uc804\uc790 \uc911\uc131\ubbf8\uc790($\\\\nu_e$)\ub294 \uc804\uc790\uc640\uc758 CC \uc0c1\ud638\uc791\uc6a9\uc73c\ub85c \uc778\ud574 \uc720\ud6a8 \ud63c\ud569\uac01\uc774 \ubcc0\uacbd\ub429\ub2c8\ub2e4:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #a855f7;">
        \\\\sin^2(2\\\\theta_M) = \\\\frac{\\\\sin^2(2\\\\theta)}{(\\\\cos 2\\\\theta - A)^2 + \\\\sin^2(2\\\\theta)}
      </div>
      $A = \\\\frac{2\\\\sqrt{2} G_F n_e E}{\\\\Delta m^2}$ \uc774\uba70, $A = \\\\cos(2\\\\theta)$ \uc77c \ub54c <b>MSW \uacf5\uba85(\uc9c4\ub3d9 \ucd5c\ub300\ud654)</b>\uc774 \ubc1c\uc0dd\ud569\ub2c8\ub2e4.
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================================
// 16. Sphaleron & Baryogenesis Lab
// ============================================================================

function initSphaleronLab() {
  canvasSphalPot = document.getElementById('canvas-sphaleron-potential');
  ctxSphalPot = canvasSphalPot ? canvasSphalPot.getContext('2d') : null;
  canvasBaryon = document.getElementById('canvas-baryon-asymmetry');
  ctxBaryon = canvasBaryon ? canvasBaryon.getContext('2d') : null;
  
  baryonHistory = [];
  
  resizeCanvas();
  updateSphaleronParameters();
  
  if (sphalLoopId) {
    cancelAnimationFrame(sphalLoopId);
  }
  
  let animFrame = 0;
  function sphalLoop() {
    drawSphaleronPotential(animFrame);
    drawBaryonEvolution(animFrame);
    animFrame++;
    sphalLoopId = requestAnimationFrame(sphalLoop);
  }
  sphalLoop();
}

function computeSphaleronRateJS(T) {
  const T_c = 160.0;
  const alpha_W = 0.033;
  const E_sph = 9000.0;
  
  if (T > T_c) {
    return { T: T, phase: 'symmetric', rate: 25.0 * Math.pow(alpha_W, 5) * Math.pow(T, 4) };
  } else {
    let rate = 0;
    if (E_sph / T < 500) {
      rate = Math.pow(T, 4) * Math.exp(-E_sph / T);
    }
    return { T: T, phase: 'broken', rate: rate };
  }
}

function updateSphaleronParameters() {
  const elTemp = document.getElementById('slider-sphal-temp');
  const elCp = document.getElementById('slider-sphal-cp');
  const elOutEq = document.getElementById('slider-sphal-outeq');
  
  if (!elTemp || !elCp || !elOutEq) return;
  
  sphalTemp = parseFloat(elTemp.value);
  sphalCpPhase = parseFloat(elCp.value);
  sphalOutEq = parseFloat(elOutEq.value);
  
  document.getElementById('label-sphal-temp').innerText = `${sphalTemp.toFixed(1)} GeV`;
  document.getElementById('label-sphal-cp').innerText = `${sphalCpPhase.toFixed(2)} rad`;
  document.getElementById('label-sphal-outeq').innerText = `${sphalOutEq.toFixed(2)} (Strong)`;
  
  const sphalInfo = computeSphaleronRateJS(sphalTemp);
  const badge = document.getElementById('badge-sphal-phase');
  if (badge) {
    if (sphalInfo.phase === 'symmetric') {
      badge.innerText = 'SYMMETRIC PHASE (High T)';
      badge.style.color = '#ff3366';
      badge.style.borderColor = '#ff3366';
      badge.style.background = 'rgba(255, 51, 102, 0.2)';
    } else {
      badge.innerText = 'BROKEN PHASE (Low T)';
      badge.style.color = '#00f0ff';
      badge.style.borderColor = '#00f0ff';
      badge.style.background = 'rgba(0, 240, 255, 0.2)';
    }
  }
  
  renderSphaleronPhysicsMath();
}

function drawSphaleronPotential(animFrame) {
  if (!ctxSphalPot) return;
  const w = canvasSphalPot.width / window.devicePixelRatio;
  const h = canvasSphalPot.height / window.devicePixelRatio;
  ctxSphalPot.clearRect(0, 0, w, h);
  
  const padL = 40, padR = 20, padT = 20, padB = 25;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  
  // Axes
  ctxSphalPot.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxSphalPot.beginPath();
  ctxSphalPot.moveTo(padL, padT);
  ctxSphalPot.lineTo(padL, h - padB);
  ctxSphalPot.lineTo(w - padR, h - padB);
  ctxSphalPot.stroke();
  
  ctxSphalPot.fillStyle = 'rgba(255,255,255,0.5)';
  ctxSphalPot.font = '10px var(--font-sans)';
  ctxSphalPot.fillText('V', 10, padT + 5);
  ctxSphalPot.fillText('N_CS', w - 30, h - 5);
  
  const sphalInfo = computeSphaleronRateJS(sphalTemp);
  const isSymmetric = sphalInfo.phase === 'symmetric';
  
  // Potential parameters
  // V(n) = V0 * (1 - cos(2*pi*n)) in broken phase, flat in symmetric phase
  const V0 = isSymmetric ? 0 : 9000.0;
  
  const mapX = (n) => padL + (n + 1.5) / 3.0 * plotW;
  const mapY = (v) => padT + plotH - (v / 10000.0) * plotH;
  
  // Grid
  ctxSphalPot.strokeStyle = 'rgba(255,255,255,0.05)';
  ctxSphalPot.setLineDash([2, 2]);
  for (let i = -1; i <= 1; i++) {
    ctxSphalPot.beginPath(); ctxSphalPot.moveTo(mapX(i), padT); ctxSphalPot.lineTo(mapX(i), h - padB); ctxSphalPot.stroke();
    ctxSphalPot.fillStyle = 'rgba(255,255,255,0.4)';
    ctxSphalPot.fillText(i.toString(), mapX(i) - 3, h - 5);
  }
  ctxSphalPot.beginPath(); ctxSphalPot.moveTo(padL, mapY(9000)); ctxSphalPot.lineTo(w - padR, mapY(9000)); ctxSphalPot.stroke();
  ctxSphalPot.setLineDash([]);
  
  // Draw Potential Curve
  ctxSphalPot.beginPath();
  ctxSphalPot.strokeStyle = isSymmetric ? '#ff3366' : '#00f0ff';
  ctxSphalPot.lineWidth = 2;
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const n = -1.5 + (i / steps) * 3.0;
    const v = isSymmetric ? 0 : (V0 / 2) * (1 - Math.cos(2 * Math.PI * n));
    if (i === 0) ctxSphalPot.moveTo(mapX(n), mapY(v));
    else ctxSphalPot.lineTo(mapX(n), mapY(v));
  }
  ctxSphalPot.stroke();
  
  // Thermal excitation / tunneling animation
  // Represents field configurations jumping over the barrier
  const tRate = Math.min(sphalInfo.rate / Math.pow(sphalTemp, 4), 1.0); // Normalized jump frequency
  const rateFactor = isSymmetric ? 0.2 : tRate;
  
  if (Math.random() < rateFactor * 0.5) {
    const fromN = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
    const toN = fromN + (Math.random() > 0.5 ? 1 : -1);
    
    // Draw an arc showing a jump
    ctxSphalPot.beginPath();
    ctxSphalPot.strokeStyle = 'rgba(255, 170, 0, 0.8)';
    ctxSphalPot.lineWidth = 2;
    const cX = (mapX(fromN) + mapX(toN)) / 2;
    const radius = Math.abs(mapX(toN) - mapX(fromN)) / 2;
    ctxSphalPot.arc(cX, mapY(0), radius, Math.PI, 0, false);
    ctxSphalPot.stroke();
  }
  
  // Current Temperature line
  ctxSphalPot.strokeStyle = 'rgba(255, 51, 102, 0.5)';
  ctxSphalPot.setLineDash([4, 4]);
  ctxSphalPot.beginPath();
  const thermalY = mapY(Math.min(sphalTemp * 40, 10000)); // Just a visual proxy for thermal energy
  ctxSphalPot.moveTo(padL, thermalY);
  ctxSphalPot.lineTo(w - padR, thermalY);
  ctxSphalPot.stroke();
  ctxSphalPot.setLineDash([]);
  ctxSphalPot.fillStyle = 'rgba(255, 51, 102, 0.8)';
  ctxSphalPot.fillText('Thermal Energy (T)', w - 90, thermalY - 5);
}

function drawBaryonEvolution(animFrame) {
  if (!ctxBaryon) return;
  const w = canvasBaryon.width / window.devicePixelRatio;
  const h = canvasBaryon.height / window.devicePixelRatio;
  ctxBaryon.clearRect(0, 0, w, h);
  
  const padL = 40, padR = 10, padT = 15, padB = 20;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  
  // Axes
  ctxBaryon.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxBaryon.beginPath();
  ctxBaryon.moveTo(padL, padT);
  ctxBaryon.lineTo(padL, h - padB);
  ctxBaryon.lineTo(w - padR, h - padB);
  ctxBaryon.stroke();
  
  // Calculate current eta_B
  const sphalInfo = computeSphaleronRateJS(sphalTemp);
  const B_viol = sphalInfo.rate / Math.pow(sphalTemp, 4);
  const eta_B = 1e-8 * B_viol * Math.sin(sphalCpPhase) * sphalOutEq;
  
  const badge = document.getElementById('badge-baryon-asym');
  if (badge) {
    badge.innerText = `\u03b7_B = ${eta_B.toExponential(2)}`;
    if (Math.abs(eta_B) > 1e-12) {
      badge.style.color = '#00f0ff';
    } else {
      badge.style.color = 'var(--color-text-muted)';
    }
  }
  
  baryonHistory.push(eta_B);
  if (baryonHistory.length > plotW) {
    baryonHistory.shift();
  }
  
  ctxBaryon.fillStyle = 'rgba(255,255,255,0.5)';
  ctxBaryon.font = '10px var(--font-sans)';
  ctxBaryon.fillText('\u03b7_B', 15, padT + 5);
  ctxBaryon.fillText('Time (t)', w - 40, h - 5);
  
  const maxAbsEta = 1e-9; // Expected max order
  const mapX = (i) => padL + i;
  const mapY = (v) => {
    let scaled = v / maxAbsEta;
    if (scaled > 1) scaled = 1;
    if (scaled < -1) scaled = -1;
    return padT + plotH / 2 - scaled * (plotH / 2);
  };
  
  // Draw zero line
  ctxBaryon.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxBaryon.setLineDash([2, 2]);
  ctxBaryon.beginPath();
  ctxBaryon.moveTo(padL, mapY(0));
  ctxBaryon.lineTo(w - padR, mapY(0));
  ctxBaryon.stroke();
  ctxBaryon.setLineDash([]);
  
  // Draw history
  if (baryonHistory.length > 1) {
    ctxBaryon.beginPath();
    ctxBaryon.strokeStyle = '#a855f7';
    ctxBaryon.lineWidth = 2;
    for (let i = 0; i < baryonHistory.length; i++) {
      if (i === 0) ctxBaryon.moveTo(mapX(i), mapY(baryonHistory[i]));
      else ctxBaryon.lineTo(mapX(i), mapY(baryonHistory[i]));
    }
    ctxBaryon.stroke();
  }
  
  ctxBaryon.fillStyle = 'rgba(255,255,255,0.4)';
  ctxBaryon.fillText('0', 25, mapY(0) + 3);
  ctxBaryon.fillText('+1e-9', 8, mapY(maxAbsEta) + 3);
  ctxBaryon.fillText('-1e-9', 8, mapY(-maxAbsEta) + 3);
}

function renderSphaleronPhysicsMath() {
  const container = document.getElementById('sphaleron-physics-details');
  if (!container) return;
  
  const html = `
    <div class="physics-formula-title">
      <span>\ud83c\udf00 Sphaleron & Sakharov Conditions</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      <b>\uc2a4\ud314\ub808\ub860(Sphaleron)</b>\uc740 \uc804\uc790\uae30\uc57d \uc791\uc6a9\uc758 \ube44\uc12d\ub3d9\uc801 \ud6a8\uacfc\ub85c, \ubc14\ub9ac\uc628 \uc218(B)\uc640 \ub819\ud1a4 \uc218(L)\ub97c \ub3d9\uc2dc\uc5d0 \uc704\ubc18\ud569\ub2c8\ub2e4: $\\\\Delta B = \\\\Delta L = -3\\\\Delta N_{CS}$.
      
      <p style="margin-top: 0.5rem;"><b>1. Sphaleron Rate (\uc2a4\ud314\ub808\ub860 \uc804\uc774\uc728)</b></p>
      \uace0\uc628 \ub300\uce6d\uc0c1($T > T_c$)\uc5d0\uc11c\ub294 \uc5f4\uc801\uc73c\ub85c \uc7a5\ubcbd\uc744 \ub118\uc5b4 \ud65c\ubc1c\ud558\uac8c \uc77c\uc5b4\ub0a9\ub2c8\ub2e4:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #ff3366;">
        \\\\Gamma_{\\\\text{sph}} \\\\sim \\\\kappa (\\\\alpha_W T)^4
      </div>
      \uc800\uc628 \uae68\uc9d0\uc0c1($T < T_c$)\uc5d0\uc11c\ub294 \uc5f4\uc801\uc73c\ub85c \uc5b5\uc81c(Suppression)\ub429\ub2c8\ub2e4:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #00f0ff;">
        \\\\Gamma_{\\\\text{sph}} \\\\sim T^4 \\\\exp(-E_{\\\\text{sph}}/T)
      </div>
      
      <p style="margin-top: 0.5rem;"><b>2. Sakharov Conditions (\uc0ac\ud558\ub85c\ud504 3\uc870\uac74)</b></p>
      \uc6b0\uc8fc\uc5d0 \ubc14\ub9ac\uc628 \ube44\ub300\uce6d\uc131($\\\\eta_B$)\uc774 \uc0dd\uc131\ub418\uae30 \uc704\ud574 \ud544\uc694\ud55c 3\uac00\uc9c0 \uc870\uac74:
      <ul style="margin-left: 1rem; margin-top: 0.25rem;">
        <li><b>Baryon Number Violation</b> (\uc2a4\ud314\ub808\ub860\uc73c\ub85c \ucda9\uc871)</li>
        <li><b>C and CP Violation</b> ($\\delta_{CP} \\\\neq 0, \\\\pi$ \uc77c \ub54c \ucda9\uc871)</li>
        <li><b>Interactions out of Thermal Equilibrium</b> (\uc6b0\uc8fc \ud33d\ucc3d/\uc0c1\uc804\uc774 \ub4f1\uc73c\ub85c \ucda9\uc871)</li>
      </ul>
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #a855f7;">
        \\\\eta_B \\\\propto \\\\left(\\\\frac{\\\\Gamma_{\\\\text{sph}}}{T^4}\\\\right) \\\\cdot \\\\sin(\\\\delta_{CP}) \\\\cdot (\\\\text{Out of Eq})
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================================
// 17. Axion & Strong CP Problem Lab
// ============================================================================

function initAxionLab() {
  canvasAxionTheta = document.getElementById('canvas-axion-theta');
  ctxAxionTheta = canvasAxionTheta ? canvasAxionTheta.getContext('2d') : null;
  canvasAxionHaloscope = document.getElementById('canvas-axion-haloscope');
  ctxAxionHaloscope = canvasAxionHaloscope ? canvasAxionHaloscope.getContext('2d') : null;
  
  resizeCanvas();
  updateAxionParameters();
  
  if (axionLoopId) {
    cancelAnimationFrame(axionLoopId);
  }
  
  let animFrame = 0;
  function axionLoop() {
    drawAxionThetaVacuum(animFrame);
    drawAxionHaloscope(animFrame);
    animFrame++;
    haloscopeTime += 1;
    axionLoopId = requestAnimationFrame(axionLoop);
  }
  axionLoop();
}

function computeAxionPropertiesJS(f_a_GeV) {
  const m_a_eV = 5.7e6 / f_a_GeV;
  const alpha = 1.0 / 137.0;
  const C_gamma = -1.92;
  const g_ayy = (alpha / (2 * Math.PI * f_a_GeV)) * Math.abs(C_gamma);
  return { m_a_eV, g_ayy };
}

function updateAxionParameters() {
  const elFa = document.getElementById('slider-axion-fa');
  const elB = document.getElementById('slider-axion-B');
  const elQ = document.getElementById('slider-axion-Q');
  
  if (!elFa || !elB || !elQ) return;
  
  axionFaExp = parseFloat(elFa.value);
  axionBField = parseFloat(elB.value);
  axionQFactorExp = parseFloat(elQ.value);
  
  const f_a = Math.pow(10, axionFaExp);
  const Q = Math.pow(10, axionQFactorExp);
  
  document.getElementById('label-axion-fa').innerText = `1.0e+${axionFaExp.toFixed(1)} GeV`;
  document.getElementById('label-axion-B').innerText = `${axionBField.toFixed(1)} Tesla`;
  document.getElementById('label-axion-Q').innerText = `1.0e+${axionQFactorExp.toFixed(1)}`;
  
  const props = computeAxionPropertiesJS(f_a);
  let massStr = "";
  if (props.m_a_eV < 1e-3) {
    massStr = `${(props.m_a_eV * 1e6).toFixed(2)} μeV`;
  } else {
    massStr = `${(props.m_a_eV * 1e3).toFixed(2)} meV`;
  }
  
  document.getElementById('label-axion-mass').innerText = massStr;
  
  // Power P_sig ~ B^2 * V * Q * g_ayy^2
  // We use relative normalizations here
  const powerW = 1.3e-32 * Math.pow(axionBField, 2) * 0.1 * Q * Math.pow(props.g_ayy * 1e15, 2) * 0.45 * 0.69;
  
  const badgeP = document.getElementById('badge-axion-power');
  if (badgeP) {
    badgeP.innerText = `P_sig = ${powerW.toExponential(2)} W`;
  }
  
  renderAxionPhysicsMath(props.m_a_eV, props.g_ayy);
}

function drawAxionThetaVacuum(animFrame) {
  if (!ctxAxionTheta) return;
  const w = canvasAxionTheta.width / window.devicePixelRatio;
  const h = canvasAxionTheta.height / window.devicePixelRatio;
  ctxAxionTheta.clearRect(0, 0, w, h);
  
  const padL = 40, padR = 20, padT = 20, padB = 25;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  
  // Axes
  ctxAxionTheta.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxAxionTheta.beginPath();
  ctxAxionTheta.moveTo(padL, padT);
  ctxAxionTheta.lineTo(padL, h - padB);
  ctxAxionTheta.lineTo(w - padR, h - padB);
  ctxAxionTheta.stroke();
  
  ctxAxionTheta.fillStyle = 'rgba(255,255,255,0.5)';
  ctxAxionTheta.font = '10px var(--font-sans)';
  ctxAxionTheta.fillText('V(θ)', 10, padT + 5);
  ctxAxionTheta.fillText('θ (CP Phase)', w - 60, h - 5);
  
  const mapX = (t) => padL + (t + Math.PI) / (2 * Math.PI) * plotW;
  const mapY = (v) => padT + plotH - v * plotH;
  
  // Draw V(θ) = 1 - cos(θ)
  ctxAxionTheta.beginPath();
  ctxAxionTheta.strokeStyle = '#a855f7';
  ctxAxionTheta.lineWidth = 2;
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const t = -Math.PI + (i / steps) * 2 * Math.PI;
    const v = (1 - Math.cos(t)) / 2;
    if (i === 0) ctxAxionTheta.moveTo(mapX(t), mapY(v));
    else ctxAxionTheta.lineTo(mapX(t), mapY(v));
  }
  ctxAxionTheta.stroke();
  
  // Draw axion field oscillation (relaxation to 0)
  // Dynamic theta value based on f_a (higher f_a = slower relaxation in early universe, but here we just animate)
  const osc_freq = 0.05 * Math.pow(10, (15 - axionFaExp) / 2); 
  
  // Simulate an oscillating ball in the potential
  const current_theta = Math.PI * 0.8 * Math.cos(animFrame * osc_freq);
  const current_v = (1 - Math.cos(current_theta)) / 2;
  
  ctxAxionTheta.beginPath();
  ctxAxionTheta.fillStyle = '#00f0ff';
  ctxAxionTheta.arc(mapX(current_theta), mapY(current_v), 6, 0, 2*Math.PI);
  ctxAxionTheta.fill();
  ctxAxionTheta.shadowBlur = 10;
  ctxAxionTheta.shadowColor = '#00f0ff';
  ctxAxionTheta.fill();
  ctxAxionTheta.shadowBlur = 0;
  
  ctxAxionTheta.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctxAxionTheta.fillText(`Axion Field (θ = ${current_theta.toFixed(2)})`, mapX(current_theta) - 40, mapY(current_v) - 15);
}

function drawAxionHaloscope(animFrame) {
  if (!ctxAxionHaloscope) return;
  const w = canvasAxionHaloscope.width / window.devicePixelRatio;
  const h = canvasAxionHaloscope.height / window.devicePixelRatio;
  ctxAxionHaloscope.clearRect(0, 0, w, h);
  
  const padL = 40, padR = 10, padT = 15, padB = 20;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  
  // Cavity tuning frequency sweep (sweeping across the spectrum)
  const sweepPos = (haloscopeTime % 300) / 300; // 0 to 1
  
  const f_a = Math.pow(10, axionFaExp);
  const targetMassFreq = 0.5; // Let's fix the axion signal at the center of the screen
  
  // Draw noise floor
  ctxAxionHaloscope.beginPath();
  ctxAxionHaloscope.strokeStyle = 'rgba(255,255,255,0.1)';
  ctxAxionHaloscope.lineWidth = 1;
  const noiseY = padT + plotH * 0.8;
  for (let i = 0; i <= plotW; i += 2) {
    const x = padL + i;
    const y = noiseY + (Math.random() - 0.5) * 10;
    if (i === 0) ctxAxionHaloscope.moveTo(x, y);
    else ctxAxionHaloscope.lineTo(x, y);
  }
  ctxAxionHaloscope.stroke();
  
  // Calculate resonant signal peak
  // Q factor sharpens the peak
  const Q = Math.pow(10, axionQFactorExp);
  const width = 0.05 * (1e5 / Q); 
  const signalStrength = (axionBField / 8.0) * (axionBField / 8.0) * (1e12 / f_a) * 0.5; 
  
  // Draw cavity response curve at sweep position
  ctxAxionHaloscope.beginPath();
  ctxAxionHaloscope.strokeStyle = 'rgba(168, 85, 247, 0.4)';
  ctxAxionHaloscope.fillStyle = 'rgba(168, 85, 247, 0.1)';
  const sweepCenter = padL + sweepPos * plotW;
  ctxAxionHaloscope.moveTo(padL, h - padB);
  for (let i = 0; i <= plotW; i += 5) {
    const x = padL + i;
    const dist = Math.abs((i / plotW) - sweepPos);
    const response = Math.exp(-dist * dist / (2 * width * width));
    const y = (h - padB) - response * plotH * 0.9;
    ctxAxionHaloscope.lineTo(x, y);
  }
  ctxAxionHaloscope.lineTo(padL + plotW, h - padB);
  ctxAxionHaloscope.fill();
  ctxAxionHaloscope.stroke();
  
  // Check if cavity is tuned to the axion mass!
  const isResonant = Math.abs(sweepPos - targetMassFreq) < width;
  
  if (isResonant) {
    const sigX = padL + targetMassFreq * plotW;
    const sigY = (h - padB) - signalStrength * plotH * 0.8;
    
    // Draw the bright Primakoff signal peak
    ctxAxionHaloscope.beginPath();
    ctxAxionHaloscope.strokeStyle = '#00f0ff';
    ctxAxionHaloscope.lineWidth = 3;
    ctxAxionHaloscope.moveTo(sigX - 10, h - padB);
    ctxAxionHaloscope.lineTo(sigX, sigY);
    ctxAxionHaloscope.lineTo(sigX + 10, h - padB);
    ctxAxionHaloscope.stroke();
    
    ctxAxionHaloscope.fillStyle = '#00f0ff';
    ctxAxionHaloscope.font = '12px var(--font-mono)';
    ctxAxionHaloscope.fillText('AXION DETECTED!', sigX - 45, sigY - 10);
    
    // Flash the badge
    const badgeP = document.getElementById('badge-axion-power');
    if (badgeP && animFrame % 5 === 0) {
      badgeP.style.background = 'rgba(0, 240, 255, 0.3)';
      badgeP.style.borderColor = '#00f0ff';
    } else if (badgeP) {
      badgeP.style.background = 'transparent';
      badgeP.style.borderColor = 'transparent';
    }
  }
  
  // Axes
  ctxAxionHaloscope.strokeStyle = 'rgba(255,255,255,0.2)';
  ctxAxionHaloscope.lineWidth = 1;
  ctxAxionHaloscope.beginPath();
  ctxAxionHaloscope.moveTo(padL, padT);
  ctxAxionHaloscope.lineTo(padL, h - padB);
  ctxAxionHaloscope.lineTo(w - padR, h - padB);
  ctxAxionHaloscope.stroke();
  
  ctxAxionHaloscope.fillStyle = 'rgba(255,255,255,0.5)';
  ctxAxionHaloscope.font = '10px var(--font-sans)';
  ctxAxionHaloscope.fillText('Power (W)', 10, padT + 5);
  ctxAxionHaloscope.fillText('Frequency (Cavity Tuning)', w - 130, h - 5);
}

function renderAxionPhysicsMath(ma, gayy) {
  const container = document.getElementById('axion-physics-details');
  if (!container) return;
  
  const html = `
    <div class="physics-formula-title">
      <span>🧲 Axion & Primakoff Effect</span>
    </div>
    <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.5;">
      <b>Peccei-Quinn 대칭성</b>이 깨지면서 나타나는 골드스톤 보손인 액시온은 강한 상호작용의 CP 문제를 해결하며, 유력한 암흑물질 후보입니다.
      
      <p style="margin-top: 0.5rem;"><b>1. Axion Mass ($m_a$)</b></p>
      액시온의 질량은 대칭성 붕괴 척도 $f_a$에 반비례합니다:
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #ff3366;">
        m_a \\simeq 5.7 \\,\\mu\\text{eV} \\left(\\frac{10^{12} \\text{ GeV}}{f_a}\\right) = ${(ma*1e6).toFixed(2)} \\,\\mu\\text{eV}
      </div>
      
      <p style="margin-top: 0.5rem;"><b>2. Primakoff Effect & Haloscope</b></p>
      액시온은 강한 자기장 $\\vec{B}$ 하에서 광자($\\gamma$)로 변환될 수 있습니다(역 프리마코프 효과). 할로스코프(Cavity) 내부에서 공명(Resonance)을 통해 신호를 증폭합니다.
      <div class="physics-formula-math" style="margin: 0.25rem 0; font-size: 0.8rem; color: #00f0ff;">
        \\mathcal{L}_{a\\gamma\\gamma} = -\\frac{1}{4} g_{a\\gamma\\gamma} a F_{\\mu\\nu} \\tilde{F}^{\\mu\\nu} = g_{a\\gamma\\gamma} a \\vec{E} \\cdot \\vec{B}
      </div>
      <ul style="margin-left: 1rem; margin-top: 0.25rem; font-size: 0.75rem;">
        <li>결합 상수 $g_{a\\gamma\\gamma}$ $\\simeq ${gayy.toExponential(2)} GeV$^{-1}$</li>
        <li>변환 전력 $P_{\\text{sig}} \\propto g_{a\\gamma\\gamma}^2 B^2 V Q \\rho_a / m_a$</li>
      </ul>
    </div>
  `;
  container.innerHTML = html;
}

function renderLiveHUD(w, h, isAllowed) {
  // 1. Event Log in the top right
  ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
  ctx.font = 'bold 9px var(--font-mono)';
  ctx.textAlign = 'right';
  
  bubbleChamberEvents.forEach((evt, idx) => {
    ctx.fillText(evt, w - 12, 22 + idx * 13);
  });
  
  // 2. Physics Equations in the bottom left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '7.5px var(--font-mono)';
  ctx.textAlign = 'left';
  
  ctx.fillText("LORENTZ FORCE: F = q(E + v × B)", 12, h - 35);
  ctx.fillText("BETHE-BLOCH IONIZATION: -dE/dx ∝ z²/β²", 12, h - 24);
  ctx.fillText("RELATIVISTIC CURVATURE: R = p / qB", 12, h - 13);
  
  // 3. Telemetry in the bottom right
  ctx.fillStyle = 'rgba(0, 240, 255, 0.65)';
  ctx.textAlign = 'right';
  
  const activeTrack = tracks.find(t => t.phase === 'product' && !t.decayed && t.charge !== 0 && t.symbol);
  if (activeTrack) {
    const pVal = activeTrack.momentum.toFixed(1);
    const mVal = activeTrack.mass.toFixed(2);
    const gamma = (Math.sqrt(activeTrack.momentum * activeTrack.momentum + activeTrack.mass * activeTrack.mass) / Math.max(1, activeTrack.mass)).toFixed(2);
    ctx.fillText(`ACTIVE PARTICLES: ${activeTrack.symbol}`, w - 12, h - 35);
    ctx.fillText(`MOMENTUM p: ${pVal} MeV/c`, w - 12, h - 24);
    ctx.fillText(`RELATIVISTIC GAMMA γ: ${activeTrack.mass === 0 ? 'INF' : gamma}`, w - 12, h - 13);
  } else {
    ctx.fillText("DETECTOR STATE: SCANNING...", w - 12, h - 13);
  }
  
  ctx.textAlign = 'left';
}
