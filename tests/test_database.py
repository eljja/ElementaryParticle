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
