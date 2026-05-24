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

  let quarkContentHtml = '';
  if (p.quark_content) {
    quarkContentHtml = `
      <div class="prop-card" style="grid-column: 1/-1; background: rgba(99, 102, 241, 0.05); border-color: rgba(99,102,241,0.2);">
        <span class="prop-label" style="color: #a5b4fc;">Quark Composition (구성 쿼크)</span>
        <span class="prop-val" style="font-size: 1.15rem; color: #fff;">${p.quark_content.join(' + ')}</span>
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
  
  const q_ok = Math.abs(total_q_in - total_q_out) < 1e-4;
  const b_ok = Math.abs(total_b_in - total_b_out) < 1e-4;
  const le_ok = Math.abs(total_le_in - total_le_out) < 1e-4;
  const lmu_ok = Math.abs(total_lmu_in - total_lmu_out) < 1e-4;
  const ltau_ok = Math.abs(total_ltau_in - total_ltau_out) < 1e-4;
  const mag_ok = Math.abs(total_mag_in - total_mag_out) < 1e-4;
  
  // Color confinement check:
  // Macroscopically free particles cannot carry color charge
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

  const all_ok = q_ok && b_ok && le_ok && lmu_ok && ltau_ok && mag_ok && energy_ok && confinement_ok;
  
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
  // Check if we can offer an auto-hadronize shortcut
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
  // Let's analyze products list. If they are quarks, map them to hadrons:
  const sortedProds = [...products].sort();
  let mapped = [];
  
  // Define simple quark configuration combinations to Hadrons
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
    // If we have complex multiple quarks, scan and bundle them
    let upCount = products.filter(s => s === 'u').length;
    let downCount = products.filter(s => s === 'd').length;
    let antiUpCount = products.filter(s => s === 'anti_u').length;
    let antiDownCount = products.filter(s => s === 'anti_d').length;
    
    // Bundle Baryons (uud -> p, udd -> n)
    while (upCount >= 2 && downCount >= 1) {
      mapped.push('p');
      upCount -= 2; downCount -= 1;
    }
    while (upCount >= 1 && downCount >= 2) {
      mapped.push('n');
      upCount -= 1; downCount -= 2;
    }
    // Anti-baryons
    while (antiUpCount >= 2 && antiDownCount >= 1) {
      mapped.push('anti_p');
      antiUpCount -= 2; antiDownCount -= 1;
    }
    while (antiUpCount >= 1 && antiDownCount >= 2) {
      mapped.push('anti_n');
      antiUpCount -= 1; antiDownCount -= 2;
    }
    // Mesons (u anti-d -> pi+, d anti-u -> pi-)
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

    // Add any leftover particles that couldn't be hadronized
    const leftOvers = [
      ...Array(upCount).fill('u'),
      ...Array(downCount).fill('d'),
      ...Array(antiUpCount).fill('anti_u'),
      ...Array(antiDownCount).fill('anti_d')
    ];
    
    // Non-up/down quarks that might remain
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
    runReactionAudit(); // Re-run with valid products!
  } else {
    alert("자동 강입자화(Auto-Hadronize) 조합을 찾지 못했습니다. 쿼크 결합 상태를 다시 확인해 주세요. (예: u + u + d -> p)");
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

  // Detect if reaction involves colored particles (quarks or gluons)
  const involvesColor = [...reactants, ...products].some(sym => {
    const p = particlesBySymbol[sym];
    return p && (p.type === 'quark' || p.symbol === 'g');
  });

  // 1. Create Reactant tracks (Entering from the left)
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
      speed: 0.012 + Math.random() * 0.006,
      color: getParticleColors(p.type).color,
      life: 0
    });
  });

  let frameCount = 0;
  const maxFrames = 300; // 5 seconds at 60fps
  
  // Hadronization state variables
  const stringStretchStart = 50; // frames when quarks start to pull apart
  const stringSnapFrame = 110;
  let sparkParticles = [];

  function animate() {
    frameCount++;
    
    // Draw trail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'; 
    ctx.fillRect(0, 0, w, h);
    
    // Draw grids
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
    
    // 1. Update Reactants
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

    // 2. HADRONIZATION: Wavy Color-Confinement Strings Animation
    let showProducts = true;
    
    if (involvesColor && reactantsMet) {
      if (frameCount < stringSnapFrame) {
        showProducts = false; // Delay actual products until string snaps
        
        // Draw the stretching color flux tube/string
        const stretchDist = (frameCount - stringStretchStart) * 1.2;
        if (stretchDist > 0) {
          const leftX = vertexX - stretchDist;
          const rightX = vertexX + stretchDist;
          
          // Draw endpoints (virtual separating colored quarks)
          ctx.fillStyle = '#ff3366'; // Red Quark node
          ctx.beginPath(); ctx.arc(leftX, vertexY, 4, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#00f0ff'; // Blue Quark node
          ctx.beginPath(); ctx.arc(rightX, vertexY, 4, 0, Math.PI*2); ctx.fill();
          
          // Wavy string (the color flux tube)
          ctx.beginPath();
          ctx.moveTo(leftX, vertexY);
          
          const segments = 25;
          const tension = Math.min(10, (frameCount - stringStretchStart) * 0.15);
          for (let i = 0; i <= segments; i++) {
            const segX = leftX + (rightX - leftX) * (i / segments);
            const waveY = vertexY + Math.sin(i * 0.8 + frameCount * 0.6) * tension;
            ctx.lineTo(segX, waveY);
          }
          
          // Glow and style based on tension
          ctx.shadowBlur = 10;
          if (frameCount < stringSnapFrame - 25) {
            ctx.strokeStyle = '#ec4899'; // Pink string
            ctx.shadowColor = '#ec4899';
            ctx.lineWidth = 3;
          } else {
            // Highly unstable tension: turns glowing red/orange and wiggles furiously
            const r = Math.sin(frameCount * 0.9) > 0;
            ctx.strokeStyle = r ? '#f97316' : '#ef4444'; 
            ctx.shadowColor = '#ef4444';
            ctx.lineWidth = 4.5;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset glow
          
          // Label them
          ctx.fillStyle = '#9ca3af';
          ctx.font = '8px Space Grotesk';
          ctx.fillText('colored q', leftX - 15, vertexY - 10);
          ctx.fillText('colored anti-q', rightX - 25, vertexY - 10);
        }
      } else if (frameCount === stringSnapFrame) {
        // SNAP! Generate burst of explosion sparks (Vacuum quark creation)
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

    // 3. Update Products (after reactants met, and after hadronization snap if color involves)
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
      
      // If it was a high-energy colored collision, draw multiple tiny Jet tracks (spray)!
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
      
      // Update jet tracks
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

    // 4. Draw tracks
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
        
        // Symbols floating next to main heads
        if (track.type !== 'jet_track' && track.symbol && track.path.length > 0 && (track.phase === 'reactant' || showProducts)) {
          const head = track.path[track.path.length - 1];
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '9px Space Grotesk';
          ctx.fillText(track.symbol, head.x + 5, head.y - 5);
        }
      }
    });

    ctx.setLineDash([]);

    // 5. Draw vacuum sparks
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

    // 6. Draw central vertex explosion/flash
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
      
      // Draw SNAP burst flash separately at snap frame
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
