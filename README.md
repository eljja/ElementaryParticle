# Subatomic Particle Database & Simulation Physics Engine

<div align="right">
  <b>🇬🇧 English</b> | <a href="README_ko.md">🇰🇷 한국어</a>
</div>

This project is a comprehensive physics computing package that systematically databases the complete properties (mass, charge, spin, color charge, quantum numbers, decay modes, and lifetimes) of all particles in the Standard Model, as well as various **BSM (Beyond the Standard Model)** virtual particles predicted by modern theoretical physics.

Beyond a mere database and Python compute engine, this project features a fully-integrated **Interactive Web UI Simulator** that allows anyone to effortlessly explore particle profiles and run verifiable decay and collision reactions directly in their web browser.

---

## 🚀 1. Key Features

### ① Precision Physics Database (`particles.json`)
A high-precision database containing **44 fundamental particles** (31 Standard Model particles/antiparticles and 13 BSM virtual particles).
- Mass ($MeV/c^2$, based on latest PDG constants)
- Electric Charge ($Q$), Spin ($J$), Baryon Number ($B$), Magnetic Charge (for BSM)
- Lepton Number by generation ($L_e, L_\mu, L_\tau$)
- Weak Isospin ($T_3$), Weak Hypercharge ($Y_W$)
- Color Charge states (including the 8 Color-Octet states for Gluons)
- Mean lifetime ($\tau$ in seconds), Decay width ($\Gamma$ in GeV) and branching ratios.

### ② Object-Oriented Python Physics Engine API (`database/particles.py`)
- `Particle` object modeling with automatic Fermion/Boson categorization.
- **Antiparticle Symmetry (CPT) Audit**: Automatically verifies if two particles are perfect conjugate pairs.
- **Reaction Physics Law Auditor**: Rigorously evaluates any arbitrary reaction (decay, collision) for 100% precision conservation of *Charge, Baryon number, Lepton flavor numbers, Magnetic charge, and Kinematic Mass-Energy barriers*.

### ③ Visual Web UI Simulator (`index.html`, `style.css`, `app.js`)
- **Glassmorphism Dark Neon Theme**: An ultra-modern and sleek styling tailored for a theoretical physics portal.
- **Subatomic Periodic Table Grid**: Explore quantum properties and decay modes of Quarks, Leptons, Gauge Bosons, Higgs, and BSM particles with a single click.
- **Antimatter Toggler**: Instantly invert the entire universe into its antimatter counterpart with a single switch.
- **17 Interactive Physics Labs**: From Collision & Decay to Electroweak Sphalerons, QCD Color Confinement, SUSY, and Cosmology (Dark Matter Freeze-out).
- **Auto Predict AI**: Algorithmically predicts valid decay channels based on conservation laws.
- **Canvas Physics Trajectory Visualizer**: Animates 2D Bubble Chamber detector tracks based on physical properties (charge, mass, spin).

---

## 🌐 2. Web UI Execution & GitHub Pages Hosting

### Option A. Run Locally
No server is required. Simply double-click `index.html` in your web browser (Chrome, Safari, Edge, etc.) to launch the interactive simulator immediately.

### Option B. Web Deployment via GitHub Pages (`github.io`)
This repository is configured to sync with GitHub Pages, allowing global access immediately upon push.
1. Push all project files (including `index.html`, `style.css`, `app.js`, `particles.json`) to your remote `main` branch.
2. Go to your GitHub repository website.
3. Navigate to **Settings** &rarr; **Pages**.
4. Under Build and deployment, select **`main`** branch (or `/root`) and click **Save**.
5. Within 1-2 minutes, it will be published globally at:
   👉 **`https://eljja.github.io/ElementaryParticle/`**

---

## 💻 3. Python API & Unit Test Execution

### Local Environment Setup
- Python 3.8 or higher is required.

### 1) Unit Tests (Physics Conservation Audit)
Strictly audits the database to ensure all particles are free of physical contradictions and that antiparticle symmetry is pristine.
```powershell
python -m pytest tests/
```

### 2) Terminal Demo CLI
Run the following script to interactively explore the particle dictionary and audit reactions via text in the terminal.
```powershell
python demo.py
```
