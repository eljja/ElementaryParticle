import pytest
from database.particles import ParticleDatabase

def test_database_loading():
    """Test that the database loads correctly and has the expected number of particles."""
    db = ParticleDatabase()
    particles = db.all_particles()
    
    assert len(particles) >= 40, f"Expected at least 40 particles, but got {len(particles)}"
    
    # Test standard particle retrieval
    electron = db.get_particle("e-")
    assert electron.name == "Electron"
    assert electron.charge == -1.0
    assert electron.spin == 0.5
    assert electron.category == "Standard Model"
    
    # Test BSM particle retrieval
    graviton = db.get_particle("G")
    assert graviton.name == "Graviton"
    assert graviton.spin == 2.0
    assert graviton.category == "Beyond Standard Model"

def test_antiparticle_conjugation():
    """
    Test that every particle's designated antiparticle satisfies physical CPT-like requirements:
    - Same mass and spin
    - Exactly opposite electric charge, baryon number, lepton numbers, weak isospin, and magnetic charge.
    """
    db = ParticleDatabase()
    
    for particle in db.all_particles():
        antiparticle = db.get_particle(particle.antiparticle_symbol)
        
        # Verify conjugation logic using our Particle API
        assert particle.verify_antiparticle_conjugation(antiparticle), \
            f"CPT Violation! Conjugation verification failed between {particle.symbol} and {antiparticle.symbol}."
            
        # Ensure symmetry holds both ways
        assert antiparticle.verify_antiparticle_conjugation(particle), \
            f"CPT Violation! Conjugation verification failed in reverse between {antiparticle.symbol} and {particle.symbol}."

def test_physical_reactions():
    """Test that physical conservation laws correctly classify valid and invalid subatomic reactions."""
    db = ParticleDatabase()
    
    # 1. Valid standard model muon decay: mu- -> e- + anti_nu_e + nu_mu
    res1 = db.verify_reaction(reactants=["mu-"], products=["e-", "anti_nu_e", "nu_mu"])
    assert res1["is_physically_allowed"] is True
    
    # 2. Invalid muon decay (lepton flavor violation): mu- -> e- + gamma
    # (Conserves electric charge and spin, but violates L_e and L_mu conservation)
    res2 = db.verify_reaction(reactants=["mu-"], products=["e-", "gamma"])
    assert res2["is_physically_allowed"] is False
    assert res2["conservations"]["lepton_e"]["conserved"] is False
    assert res2["conservations"]["lepton_mu"]["conserved"] is False
    
    # 3. Valid quark decay: t -> b + W+
    res3 = db.verify_reaction(reactants=["t"], products=["b", "W+"])
    assert res3["is_physically_allowed"] is True
    
    # 4. Charge-violating quark decay: t -> b + W-
    res4 = db.verify_reaction(reactants=["t"], products=["b", "W-"])
    assert res4["is_physically_allowed"] is False
    assert res4["conservations"]["electric_charge"]["conserved"] is False
    
    # 5. Fermion Parity violating decay: n -> p + e-
    # (Conserves charge [0 -> 1 - 1 = 0], but violates fermion parity [1 fermion -> 2 fermions])
    res5 = db.verify_reaction(reactants=["n"], products=["p", "e-"])
    assert res5["is_physically_allowed"] is False
    assert res5["conservations"]["fermion_parity"]["conserved"] is False

    # 6. Correct beta decay with anti-neutrino: n -> p + e- + anti_nu_e
    # (Conserves charge, baryon number, lepton number, and fermion parity [1 fermion -> 3 fermions])
    res6 = db.verify_reaction(reactants=["n"], products=["p", "e-", "anti_nu_e"])
    assert res6["is_physically_allowed"] is True

def test_bsm_reactions():
    """Test that BSM reactions behave correctly under conservation laws."""
    db = ParticleDatabase()
    
    # 1. Valid Selectron decay: ~e- -> e- + ~chi1_0 (Selectron -> Electron + Neutralino LSP)
    # Masses: ~e- (200 GeV) -> e- (0.51 MeV) + ~chi1_0 (100 GeV)
    # Conservations: Q=-1 -> -1+0 (Yes), Le=1 -> 1+0 (Yes)
    res1 = db.verify_reaction(reactants=["~e-"], products=["e-", "~chi1_0"])
    assert res1["is_physically_allowed"] is True
    
    # 2. Invalid Selectron decay (energy conservation): ~chi1_0 -> ~e- + e+
    # Mass of Neutralino LSP (100 GeV) < mass of selectron (200 GeV) + positron (0.51 MeV)
    res2 = db.verify_reaction(reactants=["~chi1_0"], products=["~e-", "e+"])
    assert res2["is_physically_allowed"] is False
    assert res2["conservations"]["mass_energy"]["conserved"] is False
    
    # 3. Monopole-antimonopole annihilation: M + anti_M -> gamma + gamma (Conserves magnetic charge)
    res3 = db.verify_reaction(reactants=["M", "anti_M"], products=["gamma", "gamma"])
    assert res3["is_physically_allowed"] is True
    assert res3["conservations"]["magnetic_charge"]["conserved"] is True

def test_gell_mann_nishijima():
    """Test that the Gell-Mann–Nishijima formula (Q = I_3 + Y/2) holds for all quarks and hadrons."""
    db = ParticleDatabase()
    
    # Check quarks
    u = db.get_particle("u")
    assert u.verify_gell_mann_nishijima() is True
    assert u.strong_isospin_3 == 0.5
    assert abs(u.hypercharge - (1.0/3.0)) < 1e-5
    
    d = db.get_particle("d")
    assert d.verify_gell_mann_nishijima() is True
    assert d.strong_isospin_3 == -0.5
    assert abs(d.hypercharge - (1.0/3.0)) < 1e-5
    
    s = db.get_particle("s")
    assert s.verify_gell_mann_nishijima() is True
    assert s.strangeness == -1.0
    assert abs(s.hypercharge - (-2.0/3.0)) < 1e-5
    
    # Check hadrons
    proton = db.get_particle("p")
    assert proton.verify_gell_mann_nishijima() is True
    assert proton.strong_isospin_3 == 0.5
    assert proton.hypercharge == 1.0  # B=1, S=0 -> Y=1
    
    neutron = db.get_particle("n")
    assert neutron.verify_gell_mann_nishijima() is True
    assert neutron.strong_isospin_3 == -0.5
    assert neutron.hypercharge == 1.0
    
    pion = db.get_particle("pi+")
    assert pion.verify_gell_mann_nishijima() is True
    assert pion.strong_isospin_3 == 1.0
    assert pion.hypercharge == 0.0  # B=0, S=0 -> Y=0

def test_uncertainty_lifetime():
    """Test that stored lifetimes and decay widths satisfy Heisenberg's Uncertainty Principle (Gamma * tau = hbar)"""
    db = ParticleDatabase()
    
    # Check heavy bosons (W, Z) and top quark
    z = db.get_particle("Z0")
    assert z.verify_uncertainty_lifetime() is True
    
    w = db.get_particle("W+")
    assert w.verify_uncertainty_lifetime() is True
    
    top = db.get_particle("t")
    assert top.verify_uncertainty_lifetime() is True
    
    # Check that stable particles yield None for uncertainty lifetime
    photon = db.get_particle("gamma")
    assert photon.uncertainty_lifetime_s is None

def test_higgs_mass_derivation():
    """Test that W and Z gauge boson masses are correctly derived from Higgs SSB mechanism within 5%."""
    db = ParticleDatabase()
    
    w_plus = db.get_particle("W+")
    assert w_plus.verify_higgs_mass_derivation() is True
    
    z_boson = db.get_particle("Z0")
    assert z_boson.verify_higgs_mass_derivation() is True
    
    # Non-gauge bosons should return True by default
    electron = db.get_particle("e-")
    assert electron.verify_higgs_mass_derivation() is True

def test_r_parity_conservation():
    """Test that particles evaluate R-parity correctly and reaction solver checks R-parity conservation."""
    db = ParticleDatabase()
    
    # 1. Standard Model particles must have R-parity = +1
    electron = db.get_particle("e-")
    photon = db.get_particle("gamma")
    quark_u = db.get_particle("u")
    
    assert electron.r_parity == 1.0
    assert photon.r_parity == 1.0
    assert quark_u.r_parity == 1.0
    
    # 2. Supersymmetric particles must have R-parity = -1
    neutralino = db.get_particle("~chi1_0")
    selectron = db.get_particle("~e-")
    gluino = db.get_particle("~g")
    
    assert neutralino.r_parity == -1.0
    assert selectron.r_parity == -1.0
    assert gluino.r_parity == -1.0
    
    # 3. Valid SUSY decay: selectron -> electron + neutralino (converses R-parity: -1 -> 1 * -1 = -1)
    res1 = db.verify_reaction(reactants=["~e-"], products=["e-", "~chi1_0"])
    assert res1["is_physically_allowed"] is True
    assert res1["conservations"]["r_parity"]["conserved"] is True
    
    # 4. Invalid SUSY decay violating R-parity: selectron -> electron + photon (violates R-parity: -1 -> 1 * 1 = 1)
    res2 = db.verify_reaction(reactants=["~e-"], products=["e-", "gamma"])
    assert res2["is_physically_allowed"] is False
    assert res2["conservations"]["r_parity"]["conserved"] is False
    
    # 5. Gluino decay cascade step: gluino -> quark + antiquark + neutralino (converses R-parity: -1 -> 1 * 1 * -1 = -1)
    res3 = db.verify_reaction(reactants=["~g"], products=["u", "anti_u", "~chi1_0"])
    assert res3["is_physically_allowed"] is True
    assert res3["conservations"]["r_parity"]["conserved"] is True
