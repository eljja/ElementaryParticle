let particlesData = [];
let particlesBySymbol = {};
let currentTab = 'standard-model';
let viewAntiparticles = false;

// Right Panel Active Tab
let rightPanelTab = 'collision'; // 'collision', 'builder', or 'neutrino'

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
    quark: 'Fundamental Quarks (기본 쿼크)',
    lepton: 'Fundamental Leptons (기본 렙톤)',
    baryon: 'Baryons (3쿼크 복합 강입자)',
    meson: 'Mesons (쿼크-반쿼크 중간자)',
    gauge_boson: 'Gauge Bosons (게이지 보손)',
    scalar_boson: 'Scalar Bosons (스칼라 보손)',
    supersymmetric_particle: 'Supersymmetric Sparticles (초대칭 입자)',
    topological_defect: 'Topological Defects (위상 기하학적 결함)'
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
      speed: 0.012 + Math.random() * 0.006,
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
        if (track.path.length > 30) track.path.shift();
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
          track.progress += track.speed;
          track.life += 1;
          
          const r = track.life * 1.5;
          const theta = track.angle + (track.charge * track.life * 0.035);
          
          let curX = vertexX + Math.cos(theta) * r;
          let curY = vertexY + Math.sin(theta) * r;
          
          if (track.type === 'gauge_boson' && track.charge === 0) {
            const wiggle = Math.sin(track.life * 0.4) * 3;
            curX += Math.cos(track.angle + Math.PI/2) * wiggle;
            curY += Math.sin(track.angle + Math.PI/2) * wiggle;
          }
          
          track.path.push({x: curX, y: curY});
          if (track.path.length > 40) track.path.shift();
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
          if (track.path.length > 15) track.path.shift();
        }
      });
    }

    tracks.forEach(track => {
      if (track.path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(track.path[0].x, track.path[0].y);
        for(let i = 1; i < track.path.length; i++) {
          ctx.lineTo(track.path[i].x, track.path[i].y);
        }
        
        ctx.strokeStyle = track.color;
        
        if (track.type === 'jet_track') {
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)';
          ctx.setLineDash([2, 4]);
        } else {
          ctx.lineWidth = track.mass === 0 ? 1 : Math.min(4, 1.5 + Math.log10(track.mass + 1) * 0.5);
          if (track.charge === 0 && track.type !== 'gauge_boson') {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }
        }
        
        ctx.stroke();
        
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
  
  const collisionContent = document.getElementById('tab-collision');
  const builderContent = document.getElementById('tab-builder');
  const neutrinoContent = document.getElementById('tab-neutrino');
  const cascadeContent = document.getElementById('tab-cascade');
  const angularContent = document.getElementById('tab-angular');
  
  // Reset tab button statuses
  [collisionBtn, builderBtn, neutrinoBtn, cascadeBtn, angularBtn].forEach(b => {
    if (b) b.classList.remove('active');
  });
  
  // Reset tab contents
  [collisionContent, builderContent, neutrinoContent, cascadeContent, angularContent].forEach(c => {
    if (c) c.classList.remove('active');
  });
  
  // Stop ongoing 3D polarization loop if switching away from angular
  if (tab !== 'angular' && ang3DAnimationId) {
    cancelAnimationFrame(ang3DAnimationId);
    ang3DAnimationId = null;
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
  } else if (tab === 'neutrino') {
    neutrinoBtn.classList.add('active');
    neutrinoContent.classList.add('active');
    updateNeutrinoOscillation(); // Immediately render PMNS calculations and trigger wave!
  } else if (tab === 'cascade') {
    cascadeBtn.classList.add('active');
    cascadeContent.classList.add('active');
    initDecayCascadeSelector();
    runDecayCascade(); // Render initial decay cascade
  } else if (tab === 'angular') {
    angularBtn.classList.add('active');
    angularContent.classList.add('active');
    selectAngularBoson(selectedAngularBoson); // Render polarization axes and graphics!
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
