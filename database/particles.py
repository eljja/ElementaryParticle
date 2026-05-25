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
