let particlesData = [];
let particlesBySymbol = {};
let currentTab = 'standard-model';
let viewAntiparticles = false;

// Simulator Slots
let reactants = [];
let products = [];
let activeSlot = 'reactants'; // 'reactants' or 'products'

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
    })
    .catch(err => {
      console.error("Failed to load particle database:", err);
      document.querySelector('.particle-grid').innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 2rem;">Failed to load database: ${err.message}</div>`;
    });
});

function resizeCanvas() {
  if (canvas) {
    // Get actual bounding size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
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
  document.getElementById('btn-run-sim').addEventListener('click', runReactionAudit);
  document.getElementById('btn-clear-sim').addEventListener('click', clearSimulator);
}

function renderParticleMatrix() {
  const grid = document.getElementById('matrix-grid');
  grid.innerHTML = '';
  
  // Filter particles based on category/type tab
  let filtered = particlesData.filter(p => {
    // Standard Model filtering
    if (currentTab === 'standard-model') {
      return p.category === 'Standard Model' && p.is_antiparticle === viewAntiparticles;
    }
    // Beyond Standard Model filtering
    if (currentTab === 'bsm') {
      return p.category === 'Beyond Standard Model' && p.is_antiparticle === viewAntiparticles;
    }
    // All
    return p.is_antiparticle === viewAntiparticles;
  });

  // Group by type for visual clarity
  const groups = {};
  filtered.forEach(p => {
    if (!groups[p.type]) groups[p.type] = [];
    groups[p.type].push(p);
  });

  // Clear slots render, then create sections
  const groupOrder = ['quark', 'lepton', 'gauge_boson', 'scalar_boson', 'supersymmetric_particle', 'topological_defect'];
  const groupTitles = {
    quark: 'Quarks (쿼크 군)',
    lepton: 'Leptons (렙톤 군)',
    gauge_boson: 'Gauge Bosons (게이지 보손)',
    scalar_boson: 'Scalar Bosons (스칼라 보손)',
    supersymmetric_particle: 'Supersymmetric Sparticles (초대칭 입자)',
    topological_defect: 'Topological Defects (위상 기하학적 결함)'
  };

  groupOrder.forEach(type => {
    if (groups[type] && groups[type].length > 0) {
      // Create section
      const section = document.createElement('div');
      section.className = 'matrix-section';
      
      const label = document.createElement('div');
      label.className = 'section-label';
      label.innerHTML = `<span>●</span> ${groupTitles[type] || type.toUpperCase()}`;
      section.appendChild(label);
      
      const pGrid = document.createElement('div');
      pGrid.className = 'particle-grid';
      
      // Sort by mass
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
  
  // Highlight if already in simulator slots
  if (reactants.includes(p.symbol)) {
    card.classList.add('selected-react');
  } else if (products.includes(p.symbol)) {
    card.classList.add('selected-prod');
  }

  card.addEventListener('click', (e) => {
    // If Shift or click in simulator mode, add to slots
    if (e.ctrlKey || activeSlot) {
      addToSimulator(p.symbol);
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
        <div class="prop-card">
          <span class="prop-label">Rest Mass</span>
          <span class="prop-val">${p.mass_mev.toLocaleString()} MeV/c²</span>
          ${p.mass_note ? `<span style="font-size:0.7rem; color:var(--color-text-muted); margin-top:0.25rem;">${p.mass_note}</span>` : ''}
        </div>
        <div class="prop-card">
          <span class="prop-label">Electric Charge</span>
          <span class="prop-val">${p.charge > 0 ? '+' : ''}${p.charge} e</span>
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
  
  // Reactants
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

  // Products
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
  
  const q_ok = Math.abs(total_q_in - total_q_out) < 1e-4;
  const b_ok = Math.abs(total_b_in - total_b_out) < 1e-4;
  const le_ok = Math.abs(total_le_in - total_le_out) < 1e-4;
  const lmu_ok = Math.abs(total_lmu_in - total_lmu_out) < 1e-4;
  const ltau_ok = Math.abs(total_ltau_in - total_ltau_out) < 1e-4;
  const mag_ok = Math.abs(total_mag_in - total_mag_out) < 1e-4;
  
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

  const all_ok = q_ok && b_ok && le_ok && lmu_ok && ltau_ok && mag_ok && energy_ok;
  
  return {
    is_physically_allowed: all_ok,
    conservations: {
      electric_charge: { conserved: q_ok, in: total_q_in, out: total_q_out },
      baryon_number: { conserved: b_ok, in: total_b_in, out: total_b_out },
      lepton_e: { conserved: le_ok, in: total_le_in, out: total_le_out },
      lepton_mu: { conserved: lmu_ok, in: total_lmu_in, out: total_lmu_out },
      lepton_tau: { conserved: ltau_conserved = ltau_ok, in: total_ltau_in, out: total_ltau_out },
      magnetic_charge: { conserved: mag_ok, in: total_mag_in, out: total_mag_out },
      mass_energy: { conserved: energy_ok, mass_in, mass_out, note: kinematics_note }
    }
  };
}

function runReactionAudit() {
  if (reactants.length === 0 || products.length === 0) {
    alert("Simulator slots are empty! Please choose at least one Reactant and one Product.");
    return;
  }
  
  const reportContainer = document.getElementById('audit-report-container');
  const result = verifyReactionJS(reactants, products);
  
  // Render report
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
    </div>
  `;
  
  reportContainer.innerHTML = auditHtml;

  // Trigger bubble chamber visualization!
  animateReactionTracks(result.is_physically_allowed);
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

// Visualizer Track Logic
function animateReactionTracks(isAllowed) {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  tracks = [];
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  const vertexX = w / 2;
  const vertexY = h / 2;

  // 1. Create Reactant tracks (Entering from the left, converging on vertex)
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

  // 2. Create Product tracks (Exiting vertex to the right)
  products.forEach((sym, idx) => {
    const p = particlesBySymbol[sym];
    const offsetAngle = (idx - (products.length - 1) / 2) * 0.5;
    
    tracks.push({
      symbol: sym,
      type: p.type,
      charge: p.charge,
      mass: p.mass_mev,
      phase: 'product',
      path: [],
      startX: vertexX, startY: vertexY,
      angle: offsetAngle,
      progress: 0,
      speed: 0.015 + Math.random() * 0.008,
      color: getParticleColors(p.type).color,
      life: 0
    });
  });

  let frameCount = 0;
  const maxFrames = 240; // 4 seconds at 60fps

  function animate() {
    frameCount++;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // trails effect
    ctx.fillRect(0, 0, w, h);
    
    // Draw bubble chamber grids underneath
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.02)';
    ctx.lineWidth = 0.5;
    const gridSize = 25;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    let collisionTriggered = true;
    
    // Draw and update reactant tracks
    tracks.forEach(track => {
      if (track.phase === 'reactant') {
        if (track.progress < 1) {
          track.progress += track.speed;
          if (track.progress > 1) track.progress = 1;
          collisionTriggered = false;
        }
        
        // Calculate current position (straight line with subtle wave)
        const curX = track.startX + (track.endX - track.startX) * track.progress;
        const wave = Math.sin(track.progress * Math.PI * 6) * (track.charge === 0 ? 0 : 4);
        const curY = track.startY + (track.endY - track.startY) * track.progress + wave;
        
        track.path.push({x: curX, y: curY});
        if (track.path.length > 30) track.path.shift();
      } else if (track.phase === 'product') {
        // Only start products once reactants have met
        const reactantsMet = tracks.filter(t => t.phase === 'reactant').every(t => t.progress >= 0.95);
        
        if (reactantsMet) {
          track.progress += track.speed;
          track.life += 1;
          
          // Physics track path:
          // Charged particles spiral in B-field.
          // Positives bend up, negatives bend down.
          // Neutral particles go straight.
          // Gluons/Gauge bosons wiggle.
          const r = track.life * 1.5;
          const theta = track.angle + (track.charge * track.life * 0.035);
          
          let curX = vertexX + Math.cos(theta) * r;
          let curY = vertexY + Math.sin(theta) * r;
          
          if (track.type === 'gauge_boson' && track.charge === 0) {
            // Wavy photon/gluon
            const wiggle = Math.sin(track.life * 0.4) * 3;
            curX += Math.cos(track.angle + Math.PI/2) * wiggle;
            curY += Math.sin(track.angle + Math.PI/2) * wiggle;
          }
          
          track.path.push({x: curX, y: curY});
          if (track.path.length > 40) track.path.shift();
        }
      }
      
      // Draw track
      if (track.path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(track.path[0].x, track.path[0].y);
        for(let i = 1; i < track.path.length; i++) {
          ctx.lineTo(track.path[i].x, track.path[i].y);
        }
        
        // Style based on physical traits
        ctx.strokeStyle = track.color;
        
        // High mass track is thicker, zero mass photon is thin
        ctx.lineWidth = track.mass === 0 ? 1 : Math.min(4, 1.5 + Math.log10(track.mass + 1) * 0.5);
        
        if (track.charge === 0 && track.type !== 'gauge_boson') {
          ctx.setLineDash([4, 4]); // Dashed tracks for neutral particles (neutrinos/LSP)
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        
        // Draw little text symbol floating next to the track head
        if (track.path.length > 0) {
          const head = track.path[track.path.length - 1];
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '9px Space Grotesk';
          ctx.fillText(track.symbol, head.x + 5, head.y - 5);
        }
      }
    });

    // Reset dash pattern
    ctx.setLineDash([]);

    // Draw vertex explosion when reactants collide!
    const reactantsMet = tracks.filter(t => t.phase === 'reactant').every(t => t.progress >= 0.95);
    if (reactantsMet && frameCount < 100) {
      const radius = (100 - frameCount) * 0.4;
      const gradient = ctx.createRadialGradient(vertexX, vertexY, 0, vertexX, vertexY, Math.max(1, radius));
      
      if (isAllowed) {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.2, '#00f0ff');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(vertexX, vertexY, Math.max(1, radius), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Angry red warning flash for forbidden collisions!
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, '#ff3366');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(vertexX, vertexY, Math.max(1, radius), 0, Math.PI * 2);
        ctx.fill();
        
        // Draw standard warning symbol in the vertex
        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 12px Space Grotesk';
        ctx.fillText('⚡ PHYS LAW VIOLATION', vertexX - 60, vertexY - 15);
      }
    }

    if (frameCount < maxFrames) {
      animationId = requestAnimationFrame(animate);
    } else {
      // Loop ends, draw stable trace
      animationId = null;
    }
  }

  animate();
}
