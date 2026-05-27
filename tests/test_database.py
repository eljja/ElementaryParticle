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

def test_gut_proton_decay():
    """Test that proton decay B-L conservation is only allowed under gut_mode=True."""
    db = ParticleDatabase()
    
    # 1. Standard Model proton decay is forbidden (Q=1, spin=0.5 but B and L violate)
    # Reaction: p (B=1, L=0) -> positron (B=0, L=-1) + pi0 (B=0, L=0)
    res_sm = db.verify_reaction(reactants=["p"], products=["e+", "pi0"], gut_mode=False)
    assert res_sm["is_physically_allowed"] is False
    assert res_sm["conservations"]["baryon_number"]["conserved"] is False
    
    # 2. GUT mode proton decay is ALLOWED because B-L is strictly conserved (1 - 0 = 1, and 0 - (-1) = 1)
    res_gut = db.verify_reaction(reactants=["p"], products=["e+", "pi0"], gut_mode=True)
    assert res_gut["is_physically_allowed"] is True
    assert res_gut["conservations"]["b_minus_l"]["conserved"] is True
    
    # 3. Double violation: p -> e- + pi0 (B-L is 1 - 0 = 1, while 0 - 1 = -1. B-L violates!)
    # Even under GUT mode, this reaction is mathematically FORBIDDEN.
    res_forbidden_gut = db.verify_reaction(reactants=["p"], products=["e-", "pi0"], gut_mode=True)
    assert res_forbidden_gut["is_physically_allowed"] is False
    assert res_forbidden_gut["conservations"]["b_minus_l"]["conserved"] is False


def test_ckm_unitarity():
    r"""Test that CKM matrix satisfies unitary conditions V^\dagger * V = I."""
    import math
    from database.particles import compute_ckm_matrix, verify_ckm_unitarity
    
    # Standard PDG parameters: theta12 = 13.04°, theta23 = 2.38°, theta13 = 0.201°, delta_cp = 68.8°
    theta12 = math.radians(13.04)
    theta23 = math.radians(2.38)
    theta13 = math.radians(0.201)
    delta_cp = math.radians(68.8)
    
    V = compute_ckm_matrix(theta12, theta23, theta13, delta_cp)
    assert verify_ckm_unitarity(V) is True
    
    # Test with arbitrary values
    V_arb = compute_ckm_matrix(0.5, 0.2, 0.05, 1.2)
    assert verify_ckm_unitarity(V_arb) is True


def test_jarlskog_invariant():
    """Test that Jarlskog invariant is computed correctly and is around 3e-5 for PDG values."""
    import math
    from database.particles import compute_ckm_matrix, compute_jarlskog_invariant
    
    theta12 = math.radians(13.04)
    theta23 = math.radians(2.38)
    theta13 = math.radians(0.201)
    delta_cp = math.radians(68.8)
    
    V = compute_ckm_matrix(theta12, theta23, theta13, delta_cp)
    J = compute_jarlskog_invariant(V)
    
    # Analytical Jarlskog: J = c12*s12*c23*s23*c13^2*s13*sin(delta)
    c12 = math.cos(theta12)
    s12 = math.sin(theta12)
    c23 = math.cos(theta23)
    s23 = math.sin(theta23)
    c13 = math.cos(theta13)
    s13 = math.sin(theta13)
    J_theory = c12 * s12 * c23 * s23 * (c13 ** 2) * s13 * math.sin(delta_cp)
    
    assert J == pytest.approx(J_theory, abs=1e-12)
    assert J == pytest.approx(3.08e-5, abs=1e-5) # PDG value is roughly around 3e-5


def test_ckm_cp_violation_vanishes():
    """Test that J = 0 when delta_cp = 0 or when any mixing angle is 0."""
    import math
    from database.particles import compute_ckm_matrix, compute_jarlskog_invariant
    
    # delta_cp = 0
    V1 = compute_ckm_matrix(0.2, 0.1, 0.05, 0.0)
    J1 = compute_jarlskog_invariant(V1)
    assert J1 == pytest.approx(0.0, abs=1e-15)
    
    # theta13 = 0
    V2 = compute_ckm_matrix(0.2, 0.1, 0.0, 1.2)
    J2 = compute_jarlskog_invariant(V2)
    assert J2 == pytest.approx(0.0, abs=1e-15)


def test_qcd_critical_line():
    """Test the QCD critical temperature line calculation."""
    from database.particles import compute_qcd_critical_temp
    
    # At mu_b = 0, Tc should be 155
    assert compute_qcd_critical_temp(0.0) == pytest.approx(155.0, abs=1e-5)
    
    # At mu_b = 400 (approx CEP), Tc should be lower
    tc_400 = compute_qcd_critical_temp(400.0)
    assert tc_400 < 155.0
    assert tc_400 == pytest.approx(155.0 * (1.0 - 0.013 * (400.0 / 155.0)**2), abs=1e-5)

def test_chiral_transition():
    """Test the chiral condensate ratio across the phase transition."""
    from database.particles import compute_qcd_critical_temp, compute_chiral_condensate
    
    mu_b = 0.0
    T_c = compute_qcd_critical_temp(mu_b)
    
    # T << T_c
    ratio_low = compute_chiral_condensate(50.0, mu_b)
    assert ratio_low > 0.99
    
    # T = T_c
    ratio_mid = compute_chiral_condensate(T_c, mu_b)
    assert ratio_mid == pytest.approx(0.5, abs=1e-5)
    
    # T >> T_c
    ratio_high = compute_chiral_condensate(250.0, mu_b)
    assert ratio_high < 0.01

def test_mit_bag_deconfinement():
    """Test the MIT bag model pressure comparison and deconfinement threshold."""
    from database.particles import compute_qcd_pressures
    
    # Low temperature (below deconfinement threshold)
    low_T_res = compute_qcd_pressures(100.0, 0.0)
    assert low_T_res["P_QGP"] < low_T_res["P_had"]
    assert low_T_res["deconfined"] is False
    
    # High temperature (above deconfinement threshold)
    high_T_res = compute_qcd_pressures(250.0, 0.0)
    assert high_T_res["P_QGP"] > high_T_res["P_had"]
    assert high_T_res["deconfined"] is True


def test_mandelstam_kinematics():
    """Test Mandelstam variable conservation s + t + u = 0 (massless limit)."""
    from database.particles import compute_mandelstam
    import math
    
    # Check for various angles and energies
    for s in [100.0, 10000.0, 1e6]:
        for theta in [0.1, math.pi/4, math.pi/2, math.pi - 0.1]:
            vars = compute_mandelstam(s, theta)
            assert vars["s"] + vars["t"] + vars["u"] == pytest.approx(0.0, abs=1e-5)

def test_qed_amplitude_sq():
    """Test QED tree-level amplitude calculations."""
    from database.particles import compute_qed_amplitude_sq, compute_mandelstam
    import math
    
    s = 1000.0
    theta = math.pi / 2
    vars = compute_mandelstam(s, theta)
    
    # At theta = pi/2, t = -s/2, u = -s/2
    # Annihilation: e- e+ -> mu- mu+
    # M^2 = 2 e^4 (t^2 + u^2) / s^2 = 2 e^4 (s^2/4 + s^2/4) / s^2 = e^4
    e_charge_sq = 4 * math.pi * (1/137.036)
    amp_anni = compute_qed_amplitude_sq("e- e+ -> mu- mu+", vars["s"], vars["t"], vars["u"], e_charge_sq)
    assert amp_anni == pytest.approx(e_charge_sq**2, rel=1e-4)

def test_differential_cross_section():
    """Test the unpolarized differential cross section."""
    from database.particles import compute_differential_cross_section
    import math
    
    s = 1000.0
    theta = math.pi / 2
    ds_dOmega = compute_differential_cross_section("e- e+ -> mu- mu+", s, theta)
    
    # ds/dOmega = M^2 / (64 pi^2 s)
    e_charge_sq = 4 * math.pi * (1/137.036)
    expected_M2 = e_charge_sq**2
    expected_ds = expected_M2 / (64.0 * math.pi**2 * s)
    
    assert ds_dOmega == pytest.approx(expected_ds, rel=1e-4)


def test_cosmology_hubble():
    """Test Hubble expansion rate computation in early universe."""
    from database.particles import compute_hubble_rate
    
    # At T=100 GeV, g*=106.75
    # H = 1.66 * sqrt(106.75) * 10^4 / 1.22e19 = 1.66 * 10.33 * 10^4 / 1.22e19 ~ 1.4e-14 GeV
    H = compute_hubble_rate(100.0, 106.75)
    assert H == pytest.approx(1.405e-14, rel=1e-3)


def test_cosmology_eq_density():
    """Test equilibrium comoving density (Boltzmann suppression)."""
    from database.particles import compute_eq_number_density
    import math
    
    # x = m/T
    # At x = 20, Y_eq = 0.145 * (2/106.75) * (20^1.5) * e^-20
    Y_eq = compute_eq_number_density(100.0, 5.0) # x = 20
    expected_Y = 0.145 * (2.0 / 106.75) * (20**1.5) * math.exp(-20)
    assert Y_eq == pytest.approx(expected_Y, rel=1e-4)


def test_wimp_miracle():
    """Test the WIMP Miracle: Weak scale cross section gives correct relic density."""
    from database.particles import compute_dark_matter_freeze_out
    
    # Typical WIMP: m = 100 GeV, sigma_v = 3e-26 cm^3/s
    res = compute_dark_matter_freeze_out(100.0, 3e-26)
    
    # x_f should be around 20-25
    assert 20.0 < res["x_f"] < 30.0
    
    # Relic density Omega h^2 should be close to 0.12
    assert res["Omega_h2"] == pytest.approx(0.1, rel=0.5) # Allow 50% error for approximation


def test_pmns_unitarity():
    """Test that the real-part PMNS matrix is approximately unitary: U * U^T ≈ I."""
    from database.particles import compute_pmns_matrix

    result = compute_pmns_matrix()
    U = result["PMNS_matrix_real"]

    # Compute U * U^T (since we use real parts only, check orthonormality)
    for i in range(3):
        for j in range(3):
            dot = sum(U[i][k] * U[j][k] for k in range(3))
            if i == j:
                # Diagonal elements should be close to 1
                assert dot == pytest.approx(1.0, rel=0.1), \
                    f"U*U^T diagonal element [{i}][{j}] = {dot}, expected ~1.0"
            else:
                # Off-diagonal elements should be close to 0
                assert abs(dot) < 0.15, \
                    f"U*U^T off-diagonal element [{i}][{j}] = {dot}, expected ~0.0"


def test_neutrino_oscillation_probability():
    """Test neutrino oscillation probability physics constraints."""
    import math
    from database.particles import compute_neutrino_oscillation_probability, compute_pmns_matrix

    pmns = compute_pmns_matrix()

    # 1. Unitarity bound: P(nu_e -> nu_e) + P(nu_e -> nu_mu) <= 1.0 for any L, E
    E = 1.0    # GeV
    for L in [0.0, 100.0, 500.0, 1000.0, 295.0]:
        P_ee = compute_neutrino_oscillation_probability("nu_e", "nu_e", E, L)
        P_emu = compute_neutrino_oscillation_probability("nu_e", "nu_mu", E, L)
        assert P_ee + P_emu <= 1.0 + 1e-10, \
            f"P(ee) + P(emu) = {P_ee + P_emu} > 1.0 at L={L} km"

    # 2. At L=0, appearance probability must be zero
    P_zero = compute_neutrino_oscillation_probability("nu_e", "nu_mu", 1.0, 0.0)
    assert P_zero == pytest.approx(0.0, abs=1e-15), \
        f"P(nu_e -> nu_mu) at L=0 should be 0, got {P_zero}"

    # 3. At maximum oscillation for nu_mu -> nu_tau channel:
    #    sin^2(1.267 * Delta_m31_sq * L / E) = 1  =>  1.267 * dm2 * L / E = pi/2
    #    => L = pi / (2 * 1.267 * dm2) * E
    theta_23 = pmns["theta_23_rad"]
    Delta_m31_sq = pmns["Delta_m31_sq_eV2"]
    E_test = 1.0  # GeV
    L_max = math.pi / (2.0 * 1.267 * Delta_m31_sq) * E_test

    P_max = compute_neutrino_oscillation_probability("nu_mu", "nu_tau", E_test, L_max)
    expected_max = math.sin(2.0 * theta_23) ** 2

    assert P_max == pytest.approx(expected_max, rel=1e-6), \
        f"P(nu_mu -> nu_tau) at maximum oscillation = {P_max}, expected sin^2(2*theta_23) = {expected_max}"


def test_msw_resonance():
    """Test MSW matter effect: at resonance A = cos(2*theta_12), sin^2(2*theta_M) ≈ 1."""
    import math
    from database.particles import compute_msw_effective_potential, compute_pmns_matrix

    pmns = compute_pmns_matrix()
    theta_12 = pmns["theta_12_rad"]
    Delta_m21_sq_eV2 = pmns["Delta_m21_sq_eV2"]
    Delta_m21_sq_GeV2 = Delta_m21_sq_eV2 * 1e-18

    cos_2theta_12 = math.cos(2.0 * theta_12)

    # To achieve resonance: A = cos(2*theta_12)
    # A = 2 * E * V_CC / Delta_m21_sq_GeV2
    # V_CC = sqrt(2) * G_F * n_e_natural
    # So we need: 2 * E * sqrt(2) * G_F * n_e * (hbar_c)^3 / Delta_m21_sq_GeV2 = cos(2*theta_12)
    # Solve for n_e given a chosen E:

    G_F = 1.1664e-5  # GeV^-2
    hbar_c = 0.197326980e-13  # cm * GeV
    hbar_c_cubed = hbar_c ** 3

    E_test = 0.01  # 10 MeV neutrino in GeV

    # n_e for resonance:
    n_e_resonance = (cos_2theta_12 * Delta_m21_sq_GeV2) / (2.0 * E_test * math.sqrt(2.0) * G_F * hbar_c_cubed)

    result = compute_msw_effective_potential(E_test, n_e_resonance)

    # At resonance, sin^2(2*theta_M) should be approximately 1.0
    assert result["sin2_2theta_matter"] == pytest.approx(1.0, rel=1e-3), \
        f"sin^2(2*theta_M) at resonance = {result['sin2_2theta_matter']}, expected ~1.0"

    # A parameter should equal cos(2*theta_12)
    assert result["A_parameter"] == pytest.approx(cos_2theta_12, rel=1e-3), \
        f"A = {result['A_parameter']}, expected cos(2*theta_12) = {cos_2theta_12}"


def test_sphaleron_suppression():
    """Test sphaleron suppression in the broken phase."""
    from database.particles import compute_sphaleron_rate
    
    res_sym = compute_sphaleron_rate(200.0)
    res_brk = compute_sphaleron_rate(100.0)
    
    assert res_sym["phase"] == "symmetric"
    assert res_brk["phase"] == "broken"
    
    # Assert Gamma_sph at T=100 is vastly smaller than at T=200
    assert res_brk["Gamma_sph"] < res_sym["Gamma_sph"] * 1e-10


def test_sakharov_conditions():
    """Test Sakharov conditions for baryogenesis."""
    from database.particles import compute_baryon_asymmetry

    # 1. No CP violation (cp_phase = 0)
    res_no_cp = compute_baryon_asymmetry(200.0, 0.0, 1.0)
    assert abs(res_no_cp["eta_B"]) < 1e-20, "eta_B should be 0 without CP violation"

    # 2. Thermal equilibrium (out_of_eq = 0)
    res_eq = compute_baryon_asymmetry(200.0, 1.0, 0.0)
    assert abs(res_eq["eta_B"]) < 1e-20, "eta_B should be 0 in thermal equilibrium"

    # 3. Successful baryogenesis
    res_success = compute_baryon_asymmetry(200.0, 1.0, 1.0)
    assert res_success["eta_B"] > 0, "eta_B should be positive for these parameters"
    assert res_success["B_viol_factor"] > 0, "B_viol should be > 0 at T=200 > T_c"

def test_strong_cp_bound():
    """Test the neutron EDM bound and theta parameter constraint."""
    from database.particles import compute_neutron_edm
    # For theta = 1e-10, d_n ~ 1e-26 e*cm
    dn = compute_neutron_edm(1e-10)
    assert abs(dn - 1e-26) < 1e-28, f"nEDM calculation incorrect, got {dn}"
    
    # Normalization check
    dn_periodic = compute_neutron_edm(3.141592653589793 * 2 + 1e-10)
    assert abs(dn_periodic - 1e-26) < 1e-28, "nEDM should be periodic in theta"

def test_axion_mass_relation():
    """Test the axion mass-coupling relation."""
    from database.particles import compute_axion_properties
    
    f_a = 1e12 # GeV
    props = compute_axion_properties(f_a)
    
    # Expected m_a ~ 5.7 micro-eV = 5.7e-6 eV
    assert abs(props["m_a_eV"] - 5.7e-6) < 1e-7, f"Axion mass calculation incorrect, got {props['m_a_eV']}"
    
    # Expected coupling roughly ~ 1e-15 GeV^-1
    assert 1e-16 < props["g_ayy_GeV_inv"] < 1e-14, f"Coupling out of expected range: {props['g_ayy_GeV_inv']}"
