import os
import json
from typing import List, Dict, Any, Optional

class Particle:
    """Represents a fundamental or conjectured subatomic particle and its physical properties."""
    
    def __init__(self, data: Dict[str, Any]):
        self.name: str = data["name"]
        self.symbol: str = data["symbol"]
        self.category: str = data["category"]  # "Standard Model" or "Beyond Standard Model"
        self.type: str = data["type"]          # "lepton", "quark", "gauge_boson", "scalar_boson", etc.
        self.generation: Optional[int] = data.get("generation")
        self.mass_mev: float = data["mass_mev"]
        self.charge: float = data["charge"]
        self.spin: float = data["spin"]
        self.baryon_number: float = data["baryon_number"]
        self.lepton_number_e: float = data["lepton_number_e"]
        self.lepton_number_mu: float = data["lepton_number_mu"]
        self.lepton_number_tau: float = data["lepton_number_tau"]
        self.weak_isospin_3: float = data["weak_isospin_3"]
        self.weak_hypercharge: float = data["weak_hypercharge"]
        self.color_charge: str = data["color_charge"]  # "none", "triplet", "anti-triplet", "octet"
        self.stable: bool = data["stable"]
        self.lifetime_s: Optional[float] = data.get("lifetime_s")
        self.decay_width_gev: float = data["decay_width_gev"]
        self.decay_modes: List[Dict[str, Any]] = data.get("decay_modes", [])
        self.is_antiparticle: bool = data["is_antiparticle"]
        self.antiparticle_symbol: str = data["antiparticle_symbol"]
        
        # Optional BSM properties
        self.magnetic_charge: float = data.get("magnetic_charge", 0.0)
        self.mass_note: Optional[str] = data.get("mass_note")
        self.lifetime_note: Optional[str] = data.get("lifetime_note")

    @property
    def lepton_number(self) -> float:
        """Total lepton number L = L_e + L_mu + L_tau."""
        return self.lepton_number_e + self.lepton_number_mu + self.lepton_number_tau

    @property
    def strong_isospin_3(self) -> float:
        """
        Returns the 3rd component of strong isospin (I_3) for quarks and hadrons.
        For quarks: u = +0.5, d = -0.5, s = 0.
        For hadrons: Proton = +0.5, Neutron = -0.5, Pion+ = +1.0, Pion- = -1.0, Pion0 = 0.0.
        """
        sym = self.symbol
        if sym == 'u': return 0.5
        if sym == 'd': return -0.5
        if sym == 's': return 0.0
        if sym == 'anti_u': return -0.5
        if sym == 'anti_d': return 0.5
        if sym == 'anti_s': return 0.0
        
        if self.type not in ['quark', 'hadron', 'baryon', 'meson']:
            return 0.0
            
        if sym == 'p': return 0.5
        if sym == 'anti_p': return -0.5
        if sym == 'n': return -0.5
        if sym == 'anti_n': return 0.5
        if sym == 'pi+': return 1.0
        if sym == 'pi-': return -1.0
        if sym == 'pi0': return 0.0
        
        return 0.0

    @property
    def strangeness(self) -> float:
        """
        Strangeness (S) quantum number.
        S = -(n_s - n_anti_s)
        """
        sym = self.symbol
        if sym == 's': return -1.0
        if sym == 'anti_s': return 1.0
        return 0.0

    @property
    def hypercharge(self) -> float:
        """
        Hypercharge (Y) quantum number.
        Y = B + S.
        """
        return self.baryon_number + self.strangeness

    def verify_gell_mann_nishijima(self) -> bool:
        """
        Verifies the Gell-Mann–Nishijima formula:
        Q = I_3 + Y / 2
        """
        if self.type not in ['quark', 'hadron', 'baryon', 'meson']:
            return True
        return abs(self.charge - (self.strong_isospin_3 + self.hypercharge / 2.0)) < 1e-5

    def is_fermion(self) -> bool:
        """Returns True if the particle is a fermion (half-integer spin)."""
        return (self.spin % 1.0) == 0.5

    def is_boson(self) -> bool:
        """Returns True if the particle is a boson (integer spin)."""
        return (self.spin % 1.0) == 0.0

    @property
    def uncertainty_lifetime_s(self) -> Optional[float]:
        """
        Computes the theoretical lifetime in seconds using Heisenberg's Uncertainty Principle:
        tau = hbar / Gamma
        where hbar = 6.582119569e-25 GeV.s
        """
        if self.stable or self.decay_width_gev <= 0.0:
            return None
        hbar = 6.582119569e-25
        return hbar / self.decay_width_gev

    def verify_uncertainty_lifetime(self) -> bool:
        """
        Verifies if the stored lifetime matches the one computed from the decay width
        within a 10% threshold (due to rounding differences in stored values).
        """
        theory_lifetime = self.uncertainty_lifetime_s
        if theory_lifetime is None or self.lifetime_s is None:
            return True
        return abs(theory_lifetime - self.lifetime_s) / self.lifetime_s < 0.10

    def verify_higgs_mass_derivation(self) -> bool:
        """
        Verifies the gauge boson mass derivation from spontaneous symmetry breaking (SSB)
        of the Higgs mechanism.
        MW = 1/2 * g * v
        MZ = 1/2 * sqrt(g^2 + g'^2) * v
        where v = 246.22 GeV, g = 0.6517, g' = 0.3572.
        Only valid for gauge bosons W+, W-, Z0.
        """
        if self.symbol not in ['W+', 'W-', 'Z0']:
            return True
            
        v = 246.22 * 1000.0  # GeV to MeV/c^2
        g = 0.6517
        g_prime = 0.3572
        
        if self.symbol in ['W+', 'W-']:
            theory_mass = 0.5 * g * v
        else:  # Z0
            import math
            theory_mass = 0.5 * math.sqrt(g*g + g_prime*g_prime) * v
            
        # Check within 5% error margin
        return abs(theory_mass - self.mass_mev) / self.mass_mev < 0.05

    @property
    def r_parity(self) -> float:
        """
        Returns the R-parity quantum number of the particle.
        R = (-1)^(3*(B - L) + 2*S)
        where B is the baryon number, L is the total lepton number, and S is the spin.
        For all Standard Model particles, R = +1.
        For all Supersymmetric particles, R = -1.
        """
        if self.type == "supersymmetric_particle" or self.symbol.startswith("~"):
            return -1.0
        
        # Calculate theoretically
        power = int(round(3.0 * (self.baryon_number - self.lepton_number) + 2.0 * self.spin))
        return 1.0 if (power % 2 == 0) else -1.0

    def verify_antiparticle_conjugation(self, other: 'Particle') -> bool:
        """
        Verifies if another particle is the mathematically correct antiparticle of this one.
        CPT theorem dictates:
        - Mass must be equal
        - Spin must be equal
        - Charges/quantum numbers (electric charge, baryon number, lepton numbers, weak isospin, etc.) must be opposite
        """
        if self.antiparticle_symbol != other.symbol:
            return False
            
        # Self-conjugate check (e.g., Photon, Z0, Higgs)
        if self.symbol == other.symbol:
            return (
                self.charge == 0.0 and
                self.baryon_number == 0.0 and
                self.lepton_number == 0.0 and
                self.magnetic_charge == 0.0
            )

        # Opposite quantum numbers check
        return (
            abs(self.mass_mev - other.mass_mev) < 1e-5 and
            self.spin == other.spin and
            self.charge == -other.charge and
            self.baryon_number == -other.baryon_number and
            self.lepton_number_e == -other.lepton_number_e and
            self.lepton_number_mu == -other.lepton_number_mu and
            self.lepton_number_tau == -other.lepton_number_tau and
            self.weak_isospin_3 == -other.weak_isospin_3 and
            self.weak_hypercharge == -other.weak_hypercharge and
            self.magnetic_charge == -other.magnetic_charge
        )

    def __repr__(self) -> str:
        generation_str = f" Gen {self.generation}" if self.generation else ""
        antiparticle_str = " (Anti)" if self.is_antiparticle else ""
        return f"Particle({self.name} [{self.symbol}], Type: {self.type}{generation_str}{antiparticle_str}, Mass: {self.mass_mev:.3f} MeV)"


class ParticleDatabase:
    """Database containing all registered elementary particles."""
    
    def __init__(self, json_path: Optional[str] = None):
        if json_path is None:
            # Resolve to the default path in the package
            current_dir = os.path.dirname(os.path.abspath(__file__))
            json_path = os.path.join(current_dir, "..", "particles.json")
            
        self.json_path = json_path
        self._particles_by_symbol: Dict[str, Particle] = {}
        self._particles_by_name: Dict[str, Particle] = {}
        self.load_database()

    def load_database(self) -> None:
        """Loads and parses the JSON particle database file."""
        if not os.path.exists(self.json_path):
            raise FileNotFoundError(f"Particle database file not found at: {self.json_path}")
            
        with open(self.json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for p_data in data["particles"]:
            particle = Particle(p_data)
            self._particles_by_symbol[particle.symbol] = particle
            self._particles_by_name[particle.name.lower()] = particle

    def get_particle(self, symbol: str) -> Particle:
        """Retrieves a particle by its symbol (e.g., 'e-', 'anti_u', '~chi1_0')."""
        if symbol not in self._particles_by_symbol:
            raise KeyError(f"Particle with symbol '{symbol}' not found in the database.")
        return self._particles_by_symbol[symbol]

    def get_particle_by_name(self, name: str) -> Particle:
        """Retrieves a particle by its name (case-insensitive, e.g., 'electron')."""
        name_lower = name.lower()
        if name_lower not in self._particles_by_name:
            raise KeyError(f"Particle with name '{name}' not found in the database.")
        return self._particles_by_name[name_lower]

    def all_particles(self) -> List[Particle]:
        """Returns all particles in the database."""
        return list(self._particles_by_symbol.values())

    def list_particles(self, category: Optional[str] = None, type: Optional[str] = None) -> List[Particle]:
        """Filters and lists particles by category or type."""
        results = []
        for p in self.all_particles():
            if category and p.category.lower() != category.lower():
                continue
            if type and p.type.lower() != type.lower():
                continue
            results.append(p)
        return results

    def verify_reaction(self, reactants: List[str], products: List[str], gut_mode: bool = False) -> Dict[str, Any]:
        """
        Verifies if a proposed physical reaction or decay is possible under standard or GUT conservation laws.
        Checks:
        - Electric Charge conservation
        - Baryon Number conservation (Bypassed if gut_mode=True under B-L conservation)
        - Lepton Numbers conservation (Bypassed if gut_mode=True under B-L conservation)
        - B-L Number conservation (Strictly enforced in both SM and GUT)
        - Energy conservation (mass-energy threshold for decay/at-rest reaction)
        - Magnetic Charge conservation (for BSM monopoles)
        - Fermion Parity conservation
        - R-parity conservation
        """
        reactant_objs = [self.get_particle(sym) for sym in reactants]
        product_objs = [self.get_particle(sym) for sym in products]
        
        # Calculate sums
        total_q_in = sum(p.charge for p in reactant_objs)
        total_q_out = sum(p.charge for p in product_objs)
        
        total_b_in = sum(p.baryon_number for p in reactant_objs)
        total_b_out = sum(p.baryon_number for p in product_objs)
        
        total_le_in = sum(p.lepton_number_e for p in reactant_objs)
        total_le_out = sum(p.lepton_number_e for p in product_objs)
        
        total_lmu_in = sum(p.lepton_number_mu for p in reactant_objs)
        total_lmu_out = sum(p.lepton_number_mu for p in product_objs)
        
        total_ltau_in = sum(p.lepton_number_tau for p in reactant_objs)
        total_ltau_out = sum(p.lepton_number_tau for p in product_objs)
        
        total_mag_in = sum(p.magnetic_charge for p in reactant_objs)
        total_mag_out = sum(p.magnetic_charge for p in product_objs)
        
        mass_in = sum(p.mass_mev for p in reactant_objs)
        mass_out = sum(p.mass_mev for p in product_objs)
        
        # Calculate fermion counts
        total_fermions_in = sum(1 for p in reactant_objs if p.is_fermion())
        total_fermions_out = sum(1 for p in product_objs if p.is_fermion())
        
        # Check conservations
        charge_conserved = abs(total_q_in - total_q_out) < 1e-5
        magnetic_conserved = abs(total_mag_in - total_mag_out) < 1e-5
        fermion_parity_conserved = (total_fermions_in % 2) == (total_fermions_out % 2)
        
        # B-L conservation holds in both SM and GUT, but B and L can violate only in GUT
        total_l_in = sum(p.lepton_number for p in reactant_objs)
        total_l_out = sum(p.lepton_number for p in product_objs)
        b_minus_l_in = total_b_in - total_l_in
        b_minus_l_out = total_b_out - total_l_out
        b_minus_l_conserved = abs(b_minus_l_in - b_minus_l_out) < 1e-5

        if gut_mode:
            # Under GUT, B and L individually violate, but B-L must be conserved
            baryon_conserved = True
            le_conserved = True
            lmu_conserved = True
            ltau_conserved = True
        else:
            # Standard Model: B and L must be strictly conserved individually
            baryon_conserved = abs(total_b_in - total_b_out) < 1e-5
            le_conserved = abs(total_le_in - total_le_out) < 1e-5
            lmu_conserved = abs(total_lmu_in - total_lmu_out) < 1e-5
            ltau_conserved = abs(total_ltau_in - total_ltau_out) < 1e-5
        
        # R-parity conservation (multiplicative product of R-parities)
        r_parity_in = 1.0
        for p in reactant_objs:
            r_parity_in *= p.r_parity
            
        r_parity_out = 1.0
        for p in product_objs:
            r_parity_out *= p.r_parity
            
        r_parity_conserved = abs(r_parity_in - r_parity_out) < 1e-5
        
        # Energy threshold check (Decay can only happen if reactant mass > product mass)
        energy_conserved = True
        kinematics_note = "Kinematically allowed"
        if len(reactants) == 1:
            energy_conserved = mass_in >= mass_out
            if not energy_conserved:
                kinematics_note = f"Kinematically forbidden: Decay parent mass ({mass_in:.3f} MeV) < daughter mass sum ({mass_out:.3f} MeV)"
        else:
            kinematics_note = f"Scattering threshold: Requires at least {mass_out - mass_in:.3f} MeV of kinetic energy" if mass_out > mass_in else "Kinematically allowed at rest"
            
        all_conserved = (
            charge_conserved and 
            baryon_conserved and 
            le_conserved and 
            lmu_conserved and 
            ltau_conserved and 
            magnetic_conserved and 
            fermion_parity_conserved and
            r_parity_conserved and
            b_minus_l_conserved and
            energy_conserved
        )
        
        return {
            "is_physically_allowed": all_conserved,
            "conservations": {
                "electric_charge": {"conserved": charge_conserved, "in": total_q_in, "out": total_q_out},
                "baryon_number": {"conserved": baryon_conserved, "in": total_b_in, "out": total_b_out},
                "lepton_e": {"conserved": le_conserved, "in": total_le_in, "out": total_le_out},
                "lepton_mu": {"conserved": lmu_conserved, "in": total_lmu_in, "out": total_lmu_out},
                "lepton_tau": {"conserved": ltau_conserved, "in": total_ltau_in, "out": total_ltau_out},
                "magnetic_charge": {"conserved": magnetic_conserved, "in": total_mag_in, "out": total_mag_out},
                "fermion_parity": {"conserved": fermion_parity_conserved, "in": total_fermions_in, "out": total_fermions_out},
                "r_parity": {"conserved": r_parity_conserved, "in": r_parity_in, "out": r_parity_out},
                "b_minus_l": {"conserved": b_minus_l_conserved, "in": b_minus_l_in, "out": b_minus_l_out},
                "mass_energy": {"conserved": energy_conserved, "mass_in": mass_in, "mass_out": mass_out, "note": kinematics_note}
            }
        }


def compute_ckm_matrix(theta12: float, theta23: float, theta13: float, delta_cp: float) -> List[List[complex]]:
    """
    Computes the 3x3 complex CKM matrix using the standard PDG parametrization.
    Angles are in radians.
    """
    import math
    import cmath
    
    c12 = math.cos(theta12)
    s12 = math.sin(theta12)
    c23 = math.cos(theta23)
    s23 = math.sin(theta23)
    c13 = math.cos(theta13)
    s13 = math.sin(theta13)
    
    # exp(i * delta_cp) and exp(-i * delta_cp)
    exp_i_delta = cmath.exp(1j * delta_cp)
    exp_minus_i_delta = cmath.exp(-1j * delta_cp)
    
    # 3x3 matrix calculation
    V_ud = c12 * c13
    V_us = s12 * c13
    V_ub = s13 * exp_minus_i_delta
    
    V_cd = -s12 * c23 - c12 * s23 * s13 * exp_i_delta
    V_cs = c12 * c23 - s12 * s23 * s13 * exp_i_delta
    V_cb = s23 * c13
    
    V_td = s12 * s23 - c12 * c23 * s13 * exp_i_delta
    V_ts = -c12 * s23 - s12 * c23 * s13 * exp_i_delta
    V_tb = c23 * c13
    
    return [
        [V_ud, V_us, V_ub],
        [V_cd, V_cs, V_cb],
        [V_td, V_ts, V_tb]
    ]


def compute_jarlskog_invariant(V: List[List[complex]]) -> float:
    """
    Computes the Jarlskog invariant J = Im(V_us * V_cb * V_ub^* * V_cs^*)
    which quantifies CP violation in the quark sector.
    """
    V_us = V[0][1]
    V_cb = V[1][2]
    V_ub_conj = V[0][2].conjugate()
    V_cs_conj = V[1][1].conjugate()
    
    prod = V_us * V_cb * V_ub_conj * V_cs_conj
    return prod.imag


def verify_ckm_unitarity(V: List[List[complex]], tolerance: float = 1e-10) -> bool:
    """
    Verifies that the CKM matrix is unitary, i.e., V^dagger * V = I.
    Returns True if the maximum deviation is within tolerance, False otherwise.
    """
    # Compute V^dagger * V
    for i in range(3):
        for j in range(3):
            val = 0.0j
            for k in range(3):
                # V^dagger_ik = V_ki^*
                val += V[k][i].conjugate() * V[k][j]
            
            expected = 1.0 if i == j else 0.0
            if abs(val - expected) > tolerance:
                return False
    return True


def compute_qcd_critical_temp(mu_b: float) -> float:
    """
    Computes the QCD critical temperature T_c as a function of baryon chemical potential mu_B.
    T_c(mu_B) = T_0 * [1 - kappa * (mu_B / T_0)^2]
    where T_0 = 155 MeV, kappa = 0.013.
    """
    T_0 = 155.0
    kappa = 0.013
    return T_0 * (1.0 - kappa * (mu_b / T_0)**2)


def compute_chiral_condensate(T: float, mu_b: float) -> float:
    """
    Computes the ratio of chiral condensate <q_bar q> / <q_bar q>_0.
    Using a continuous crossover model:
    Ratio = 0.5 * [1 - tanh((T - T_c) / Delta_T)]
    where Delta_T is the transition width (approx 10 MeV).
    """
    import math
    T_c = compute_qcd_critical_temp(mu_b)
    delta_T = 10.0
    return 0.5 * (1.0 - math.tanh((T - T_c) / delta_T))


def compute_qcd_pressures(T: float, mu_b: float, bag_constant: float = 200.0) -> Dict[str, Any]:
    """
    Computes the pressures of the Hadron Gas and QGP phases using the MIT Bag Model.
    P_had = g_pi * (pi^2 * T^4) / 90
    P_QGP = g_QGP * (pi^2 * T^4) / 90 - B
    B is the bag constant in MeV^4. (bag_constant is B^(1/4) in MeV).
    Returns the pressures and whether deconfinement is achieved (P_QGP > P_had).
    """
    import math
    # B in MeV^4
    B = bag_constant ** 4
    
    # g_pi = 3 for pions
    g_pi = 3.0
    P_had = g_pi * (math.pi**2 * T**4) / 90.0
    
    # g_QGP approx 37 for n_f=2 QGP
    g_QGP = 37.0
    P_QGP = g_QGP * (math.pi**2 * T**4) / 90.0 - B
    
    deconfined = P_QGP > P_had
    return {
        "P_had": P_had,
        "P_QGP": P_QGP,
        "deconfined": deconfined
    }


def compute_mandelstam(s_cm: float, theta: float) -> Dict[str, float]:
    """
    Computes Mandelstam variables (s, t, u) in the Center of Mass (CM) frame
    under the high-energy (massless) limit where p = E = sqrt(s)/2.
    s_cm: Center of mass energy squared (s)
    theta: Scattering angle in radians.
    
    Returns s, t, u.
    Note: s + t + u = 0 in massless limit.
    """
    import math
    s = float(s_cm)
    t = - (s / 2.0) * (1.0 - math.cos(theta))
    u = - (s / 2.0) * (1.0 + math.cos(theta))
    return {"s": s, "t": t, "u": u}


def compute_qed_amplitude_sq(process: str, s: float, t: float, u: float, e_charge_sq: float = 4 * 3.141592 * (1/137.036)) -> float:
    """
    Computes the Tree-level QED amplitude squared |M|^2 for basic processes
    in the high-energy limit (massless fermions).
    e_charge_sq is e^2 = 4 * pi * alpha_em.
    """
    if process == "e- e+ -> mu- mu+":
        # Annihilation
        # |M|^2 = 2 e^4 * (t^2 + u^2) / s^2
        if s == 0: return 0.0
        return 2.0 * (e_charge_sq**2) * (t**2 + u**2) / (s**2)
        
    elif process == "e- e+ -> e- e+":
        # Bhabha Scattering
        # |M|^2 = 2 e^4 * [ (s^2 + u^2)/t^2 + (t^2 + u^2)/s^2 + 2u^2/(s*t) ]
        if s == 0 or t == 0: return float('inf') # Forward scattering divergence
        term1 = (s**2 + u**2) / (t**2)
        term2 = (t**2 + u**2) / (s**2)
        term3 = 2.0 * (u**2) / (s * t)
        return 2.0 * (e_charge_sq**2) * (term1 + term2 + term3)
        
    elif process == "e- e- -> e- e-":
        # Møller Scattering
        # |M|^2 = 2 e^4 * [ (s^2 + u^2)/t^2 + (s^2 + t^2)/u^2 + 2s^2/(t*u) ]
        if t == 0 or u == 0: return float('inf')
        term1 = (s**2 + u**2) / (t**2)
        term2 = (s**2 + t**2) / (u**2)
        term3 = 2.0 * (s**2) / (t * u)
        return 2.0 * (e_charge_sq**2) * (term1 + term2 + term3)
        
    else:
        raise ValueError(f"Unknown process: {process}")


def compute_differential_cross_section(process: str, s: float, theta: float) -> float:
    """
    Computes the unpolarized differential cross-section d_sigma / d_Omega
    in the center of mass frame.
    d_sigma / d_Omega = |M|^2 / (64 * pi^2 * s)
    Note: Output is in natural units (GeV^-2). To get pb, multiply by 0.3894e9.
    """
    import math
    if s <= 0: return 0.0
    
    # Avoid exact 0 or PI to prevent division by zero in t or u for Bhabha/Moller
    if theta < 1e-5: theta = 1e-5
    if theta > math.pi - 1e-5: theta = math.pi - 1e-5
    
    mandelstam = compute_mandelstam(s, theta)
    M2 = compute_qed_amplitude_sq(process, mandelstam["s"], mandelstam["t"], mandelstam["u"])
    
    # Differential cross section formula
    ds_dOmega = M2 / (64.0 * (math.pi**2) * s)
    return ds_dOmega


def compute_hubble_rate(T: float, g_star: float = 106.75) -> float:
    """
    Computes the Hubble expansion rate H(T) in the radiation dominated era.
    H(T) = 1.66 * sqrt(g_star) * T^2 / M_Pl
    Inputs: T in GeV, g_star (effective degrees of freedom)
    Returns: H in GeV
    """
    import math
    M_Pl = 1.22e19 # Planck mass in GeV
    return 1.66 * math.sqrt(g_star) * (T**2) / M_Pl


def compute_eq_number_density(m: float, T: float, g: float = 2.0, g_star_s: float = 106.75) -> float:
    """
    Computes the equilibrium comoving number density Y_eq = n_eq / s
    for a non-relativistic particle (m >> T).
    Y_eq(x) = 0.145 * (g / g_star_s) * x^(3/2) * e^(-x)  where x = m/T
    Inputs: m, T in GeV
    Returns: Y_eq (dimensionless)
    """
    import math
    if T <= 0: return 0.0
    x = m / T
    if x > 100: return 0.0 # Prevent underflow
    
    return 0.145 * (g / g_star_s) * (x**1.5) * math.exp(-x)


def compute_dark_matter_freeze_out(m: float, sigma_v_cm3s: float, g: float = 2.0, g_star: float = 106.75) -> Dict[str, float]:
    """
    Computes the freeze-out temperature x_f = m/T_f and the present-day relic density Omega_h2.
    m: DM mass in GeV
    sigma_v_cm3s: Annihilation cross-section <sigma v> in cm^3/s
    
    Conversion: 1 cm^3/s = 8.5 x 10^16 GeV^-2
    """
    import math
    
    M_Pl = 1.22e19
    # Convert cross section to GeV^-2
    sigma_v = sigma_v_cm3s * 8.5e16
    
    if sigma_v <= 0:
        return {"x_f": float('inf'), "T_f": 0.0, "Omega_h2": float('inf')}
    
    # Iterative solution for x_f
    # x_f = ln(c(c+2) * sqrt(45/8) / (2pi^3) * g / sqrt(g_star) * m * M_Pl * sigma_v) - 0.5*ln(x_f)
    # Let c(c+2) = 1 for simplicity (matching typical approximation)
    C = 0.038 * (g / math.sqrt(g_star)) * m * M_Pl * sigma_v
    
    if C <= 1:
        # Cross-section too small, freezes out immediately or invalid
        x_f = 1.0
    else:
        x_f_guess = math.log(C)
        x_f = math.log(C) - 0.5 * math.log(x_f_guess)
        x_f = math.log(C) - 0.5 * math.log(x_f) # Iterate again for precision
        
    T_f = m / x_f
    
    # Relic density Omega_chi h^2
    # Omega h^2 approx 1.07e9 * x_f / (sqrt(g_star) * M_Pl * sigma_v)
    Omega_h2 = (1.07e9 * x_f) / (math.sqrt(g_star) * M_Pl * sigma_v)
    
    return {
        "x_f": x_f,
        "T_f": T_f,
        "Omega_h2": Omega_h2
    }


def compute_pmns_matrix() -> Dict[str, Any]:
    """
    Returns the PMNS (Pontecorvo-Maki-Nakagawa-Sakata) neutrino mixing matrix parameters
    using current best-fit values from PDG 2024 (Normal Ordering).

    The standard parametrization is:
    U = [[c12*c13, s12*c13, s13*e^(-i*delta)],
         [-s12*c23 - c12*s23*s13*e^(i*delta), c12*c23 - s12*s23*s13*e^(i*delta), s23*c13],
         [s12*s23 - c12*c23*s13*e^(i*delta), -c12*s23 - s12*c23*s13*e^(i*delta), c23*c13]]

    For the returned matrix, we compute the real parts using cos(delta_cp) for the
    complex phase terms.
    """
    import math

    # PDG 2024 best-fit values (Normal Ordering)
    theta_12_deg = 33.44   # solar angle
    theta_23_deg = 49.2    # atmospheric angle
    theta_13_deg = 8.57    # reactor angle
    delta_cp_deg = 197.0   # CP violation phase

    Delta_m21_sq = 7.42e-5   # eV^2 (solar mass splitting)
    Delta_m31_sq = 2.515e-3  # eV^2 (atmospheric mass splitting)

    # Convert to radians
    theta_12 = math.radians(theta_12_deg)
    theta_23 = math.radians(theta_23_deg)
    theta_13 = math.radians(theta_13_deg)
    delta_cp = math.radians(delta_cp_deg)

    c12 = math.cos(theta_12)
    s12 = math.sin(theta_12)
    c23 = math.cos(theta_23)
    s23 = math.sin(theta_23)
    c13 = math.cos(theta_13)
    s13 = math.sin(theta_13)
    cd = math.cos(delta_cp)

    # 3x3 PMNS matrix (real part only, using cos(delta_cp) for complex phase terms)
    U = [
        [c12 * c13,
         s12 * c13,
         s13 * cd],                                         # s13 * e^{-i delta} -> real part: s13*cos(delta)
        [-s12 * c23 - c12 * s23 * s13 * cd,
         c12 * c23 - s12 * s23 * s13 * cd,
         s23 * c13],
        [s12 * s23 - c12 * c23 * s13 * cd,
         -c12 * s23 - s12 * c23 * s13 * cd,
         c23 * c13]
    ]

    return {
        "theta_12_deg": theta_12_deg,
        "theta_23_deg": theta_23_deg,
        "theta_13_deg": theta_13_deg,
        "delta_cp_deg": delta_cp_deg,
        "theta_12_rad": theta_12,
        "theta_23_rad": theta_23,
        "theta_13_rad": theta_13,
        "delta_cp_rad": delta_cp,
        "Delta_m21_sq_eV2": Delta_m21_sq,
        "Delta_m31_sq_eV2": Delta_m31_sq,
        "PMNS_matrix_real": U
    }


def compute_neutrino_oscillation_probability(flavor_from: str, flavor_to: str, E: float, L: float) -> float:
    """
    Computes the 2-flavor vacuum neutrino oscillation probability P(nu_a -> nu_b).

    Formula:
        P(a -> b) = sin^2(2*theta) * sin^2(1.267 * Delta_m^2 * L / E)

    where E is in GeV, L is in km, and Delta_m^2 is in eV^2.

    Flavor channel mapping (effective 2-flavor approximation):
        nu_e  -> nu_mu  : theta_13, Delta_m31_sq
        nu_e  -> nu_tau : theta_13, Delta_m31_sq
        nu_mu -> nu_tau : theta_23, Delta_m31_sq

    For survival probability (same flavor): P = 1 - P(disappearance)
    """
    import math

    pmns = compute_pmns_matrix()
    theta_13 = pmns["theta_13_rad"]
    theta_23 = pmns["theta_23_rad"]
    theta_12 = pmns["theta_12_rad"]
    Delta_m31_sq = pmns["Delta_m31_sq_eV2"]
    Delta_m21_sq = pmns["Delta_m21_sq_eV2"]

    flavor_from = flavor_from.lower().replace("nu_", "").replace("v_", "")
    flavor_to = flavor_to.lower().replace("nu_", "").replace("v_", "")

    if E <= 0:
        raise ValueError("Neutrino energy E must be positive (in GeV).")

    # Determine the effective mixing angle and mass-squared splitting
    if flavor_from == flavor_to:
        # Survival probability: need to determine the dominant disappearance channel
        if flavor_from == "e":
            theta = theta_13
            dm2 = Delta_m31_sq
        elif flavor_from == "mu":
            theta = theta_23
            dm2 = Delta_m31_sq
        elif flavor_from == "tau":
            theta = theta_23
            dm2 = Delta_m31_sq
        else:
            raise ValueError(f"Unknown neutrino flavor: {flavor_from}")

        osc_arg = 1.267 * dm2 * L / E
        P_disappearance = (math.sin(2.0 * theta) ** 2) * (math.sin(osc_arg) ** 2)
        return 1.0 - P_disappearance

    else:
        # Appearance probability
        pair = tuple(sorted([flavor_from, flavor_to]))
        if pair == ("e", "mu"):
            theta = theta_13
            dm2 = Delta_m31_sq
        elif pair == ("e", "tau"):
            theta = theta_13
            dm2 = Delta_m31_sq
        elif pair == ("mu", "tau"):
            theta = theta_23
            dm2 = Delta_m31_sq
        else:
            raise ValueError(f"Unknown neutrino flavor pair: {flavor_from} -> {flavor_to}")

        osc_arg = 1.267 * dm2 * L / E
        return (math.sin(2.0 * theta) ** 2) * (math.sin(osc_arg) ** 2)


def compute_msw_effective_potential(E: float, n_e: float) -> Dict[str, Any]:
    """
    Computes the MSW (Mikheyev-Smirnov-Wolfenstein) matter effect for neutrino
    propagation through matter.

    Parameters:
        E    : Neutrino energy in GeV
        n_e  : Electron number density in cm^-3

    The charged-current potential is:
        V_CC = sqrt(2) * G_F * n_e

    The matter parameter A is computed as:
        A = 2 * E * V_CC / Delta_m21_sq

    where both numerator and denominator are in consistent units (GeV^2).

    The effective mixing angle in matter:
        sin^2(2*theta_M) = sin^2(2*theta_12) / [(cos(2*theta_12) - A)^2 + sin^2(2*theta_12)]

    MSW resonance occurs when A = cos(2*theta_12), yielding maximal mixing
    sin^2(2*theta_M) = 1.
    """
    import math

    G_F = 1.1664e-5  # GeV^-2 (Fermi constant)

    # Convert n_e from cm^-3 to GeV^3 using (hbar*c)^3
    # hbar*c = 0.197326980e-13 cm*GeV => (hbar*c)^3 in cm^3*GeV^3
    hbar_c = 0.197326980e-13  # cm * GeV
    hbar_c_cubed = hbar_c ** 3  # cm^3 * GeV^3

    # n_e in natural units (GeV^3)
    n_e_natural = n_e * hbar_c_cubed  # cm^-3 * cm^3*GeV^3 = GeV^3

    # Charged-current potential V_CC in GeV
    V_CC = math.sqrt(2.0) * G_F * n_e_natural

    # Get PMNS parameters
    pmns = compute_pmns_matrix()
    theta_12 = pmns["theta_12_rad"]
    Delta_m21_sq_eV2 = pmns["Delta_m21_sq_eV2"]

    # Convert Delta_m21_sq from eV^2 to GeV^2 (1 eV = 1e-9 GeV => 1 eV^2 = 1e-18 GeV^2)
    Delta_m21_sq_GeV2 = Delta_m21_sq_eV2 * 1e-18

    # Dimensionless matter parameter A
    A = 2.0 * E * V_CC / Delta_m21_sq_GeV2

    # Vacuum mixing
    sin2_2theta_12 = math.sin(2.0 * theta_12) ** 2
    cos_2theta_12 = math.cos(2.0 * theta_12)

    # Effective mixing angle in matter
    denominator = (cos_2theta_12 - A) ** 2 + sin2_2theta_12
    if denominator < 1e-30:
        sin2_2theta_M = 1.0  # Exact resonance
    else:
        sin2_2theta_M = sin2_2theta_12 / denominator

    # Resonance condition: A = cos(2*theta_12)
    A_resonance = cos_2theta_12
    at_resonance = abs(A - A_resonance) < 0.01 * abs(A_resonance) if abs(A_resonance) > 1e-10 else abs(A - A_resonance) < 1e-10

    return {
        "V_CC_GeV": V_CC,
        "A_parameter": A,
        "sin2_2theta_vacuum": sin2_2theta_12,
        "cos_2theta_vacuum": cos_2theta_12,
        "sin2_2theta_matter": sin2_2theta_M,
        "A_resonance": A_resonance,
        "at_resonance": at_resonance,
        "resonance_info": f"MSW resonance when A = cos(2*theta_12) = {A_resonance:.4f}. "
                          f"Current A = {A:.4f}. "
                          f"{'AT RESONANCE: maximal mixing!' if at_resonance else 'Not at resonance.'}"
    }


def compute_sphaleron_rate(T: float) -> Dict[str, Any]:
    """
    Compute the sphaleron transition rate Gamma_sph at temperature T (in GeV).
    """
    import math
    T_c = 160.0
    alpha_W = 0.033
    E_sph = 9000.0

    if T > T_c:
        # Symmetric Phase
        Gamma_sph = 25.0 * (alpha_W**5) * (T**4)
        phase = "symmetric"
    else:
        # Broken Phase
        phase = "broken"
        if T <= 0.0:
            Gamma_sph = 0.0
        else:
            exponent = E_sph / T
            if exponent > 500.0:
                Gamma_sph = 0.0
            else:
                Gamma_sph = (T**4) * math.exp(-exponent)

    return {"T": T, "phase": phase, "Gamma_sph": Gamma_sph}


def compute_baryon_asymmetry(T: float, cp_phase: float, out_of_eq: float) -> Dict[str, Any]:
    """
    Compute a simplified Baryon Asymmetry (eta_B = n_B / n_gamma) based on the Sakharov conditions.
    """
    import math
    
    sph_result = compute_sphaleron_rate(T)
    Gamma_sph = sph_result["Gamma_sph"]
    
    if T <= 0.0:
        B_viol = 0.0
    else:
        B_viol = Gamma_sph / (T**4)
        
    cp_factor = math.sin(cp_phase)
    
    eta_B = 1e-8 * B_viol * cp_factor * out_of_eq
    
    return {
        "eta_B": eta_B,
        "B_viol_factor": B_viol,
        "cp_factor": cp_factor,
        "out_of_eq_factor": out_of_eq
    }

def compute_sphaleron_rate(T: float) -> Dict[str, Any]:
    """
    Compute the sphaleron transition rate Gamma_sph at temperature T (in GeV).
    """
    import math
    T_c = 160.0
    alpha_W = 0.033
    E_sph = 9000.0

    if T > T_c:
        # Symmetric Phase
        Gamma_sph = 25.0 * (alpha_W**5) * (T**4)
        phase = "symmetric"
    else:
        if E_sph / T > 500:
            Gamma_sph = 0.0
        else:
            Gamma_sph = (T**4) * math.exp(-E_sph / T)
        phase = "broken"

    return {"T": T, "phase": phase, "Gamma_sph": Gamma_sph}


def compute_baryon_asymmetry(T: float, cp_phase: float, out_of_eq: float) -> Dict[str, Any]:
    """
    Compute simplified Baryon Asymmetry (eta_B = n_B / n_gamma) based on the Sakharov conditions.
    """
    import math
    sphaleron_info = compute_sphaleron_rate(T)
    Gamma_sph = sphaleron_info["Gamma_sph"]
    
    B_viol = Gamma_sph / (T**4) if T > 0 else 0.0
    cp_factor = math.sin(cp_phase)
    
    # eta_B is proportional to B-violation * CP-violation * Out-of-equilibrium
    eta_B = 1e-8 * B_viol * cp_factor * out_of_eq
    
    return {
        "eta_B": eta_B,
        "B_viol_factor": B_viol,
        "cp_factor": cp_factor,
        "out_of_eq_factor": out_of_eq
    }

# ============================================================================
# 13. Axion & Strong CP Problem (Phase 13)
# ============================================================================

def compute_neutron_edm(theta: float) -> float:
    """
    Compute the neutron Electric Dipole Moment (nEDM) in e*cm given the QCD theta angle.
    Experimentally, |d_n| < 1e-26 e*cm, implying theta < 1e-10.
    Theoretical relation: d_n ~ 1e-16 * theta e*cm.
    """
    import math
    # Normalize theta to [-pi, pi]
    theta = (theta + math.pi) % (2 * math.pi) - math.pi
    d_n = 1e-16 * theta
    return d_n

def compute_axion_properties(f_a_GeV: float) -> Dict[str, float]:
    """
    Compute QCD axion properties based on the Peccei-Quinn symmetry breaking scale f_a.
    f_a_GeV: PQ scale in GeV.
    Returns:
        - m_a_eV: Axion mass in eV (m_a * f_a ~ m_pi * f_pi)
        - g_ayy_GeV_inv: Axion-photon coupling in GeV^-1
    """
    # Relation: m_a = 5.7 mu_eV * (10^12 GeV / f_a) = 5.7e-6 eV * 1e12 / f_a = 5.7e6 / f_a
    m_a_eV = 5.7e6 / f_a_GeV
    
    # Coupling g_ayy ~ alpha / (2 * pi * f_a) * (E/N - 1.92)
    # Using KSVZ model (E/N = 0)
    alpha = 1.0 / 137.0
    import math
    # C_gamma = -1.92 (KSVZ)
    C_gamma = -1.92
    g_ayy = (alpha / (2 * math.pi * f_a_GeV)) * C_gamma
    
    return {
        "m_a_eV": m_a_eV,
        "g_ayy_GeV_inv": abs(g_ayy)
    }

def compute_primakoff_conversion(g_ayy: float, B_Tesla: float, V_m3: float, Q_factor: float, C_010: float = 0.69) -> float:
    """
    Compute axion-to-photon conversion power in a haloscope cavity (Sikivie's experiment).
    Using a simplified scaling law for the signal power P_sig in Watts.
    P_sig ~ g_ayy^2 * B^2 * V * Q * C * (rho_a / m_a)
    Here we return a relative power factor scaled for visualization.
    """
    # 1 Tesla = 195 eV^2 roughly, but we just use macroscopic units for a scaling factor.
    # P_sig is extremely small (~1e-22 W). We'll output a normalized signal strength.
    rho_a = 0.45 # GeV/cm^3 (local dark matter density)
    
    # Simplified normalization to return a value roughly between 1e-24 and 1e-20 W
    # B^2 * V * Q * g_ayy^2 * rho_a
    power_W = 1.3e-32 * (B_Tesla**2) * V_m3 * Q_factor * (g_ayy * 1e15)**2 * rho_a * C_010
    
    return power_W
