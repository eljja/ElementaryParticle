import sys
from database.particles import ParticleDatabase

def print_header(title: str):
    print("=" * 70)
    print(f" {title.center(68)} ")
    print("=" * 70)

def print_particle_profile(p):
    print_header(f"PARTICLE PROFILE: {p.name} ({p.symbol})")
    print(f"  * Category      : {p.category}")
    print(f"  * Type          : {p.type}")
    print(f"  * Generation    : {p.generation if p.generation is not None else 'N/A'}")
    print(f"  * Mass          : {p.mass_mev:.8f} MeV/c^2")
    if p.mass_note:
        print(f"    (Note: {p.mass_note})")
    print(f"  * Electric Chg  : {p.charge:+.3f} e")
    print(f"  * Spin          : {p.spin} hbar ({'Fermion' if p.is_fermion() else 'Boson'})")
    print(f"  * Color Charge  : {p.color_charge.upper()}")
    print("-" * 70)
    print(f"  * Baryon Number : {p.baryon_number:+.3f}")
    print(f"  * Lepton Numbers: L_e = {p.lepton_number_e:+.1f} | L_mu = {p.lepton_number_mu:+.1f} | L_tau = {p.lepton_number_tau:+.1f}")
    print(f"  * Weak Quantum  : Isospin T3 = {p.weak_isospin_3:+.1f} | Hypercharge Yw = {p.weak_hypercharge:+.1f}")
    if p.magnetic_charge != 0.0:
        print(f"  * Magnetic Chg  : {p.magnetic_charge:+.3f} (Dirac charge unit)")
    print("-" * 70)
    print(f"  * Stability     : {'STABLE' if p.stable else 'UNSTABLE'}")
    if not p.stable:
        lifetime_str = f"{p.lifetime_s:.4e} seconds" if p.lifetime_s else "unknown"
        print(f"  * Mean Lifetime : {lifetime_str}")
        print(f"  * Decay Width   : {p.decay_width_gev:.4e} GeV")
        if p.decay_modes:
            print("  * Decay Channels:")
            for idx, mode in enumerate(p.decay_modes, 1):
                ch_str = " + ".join(mode["channels"])
                note_str = f" ({mode['note']})" if "note" in mode else ""
                print(f"    [{idx}] {p.symbol} -> {ch_str}  (BR: {mode['branching_ratio'] * 100:.2f}%){note_str}")
    print(f"  * Antiparticle  : {p.antiparticle_symbol} ({'Self-conjugate' if p.symbol == p.antiparticle_symbol else 'Distinct'})")
    print("=" * 70)

def handle_reaction_test(db: ParticleDatabase):
    print("\n--- [PHYSICS REACTION AUDITOR] ---")
    print("Example 1: mu- -> e- + anti_nu_e + nu_mu")
    print("Example 2: ~e- -> e- + ~chi1_0")
    print("Example 3: t -> b + W- (Invalid)")
    
    reaction_str = input("\nEnter reaction (Format: reactant1 + ... -> product1 + ...): ").strip()
    if not reaction_str or "->" not in reaction_str:
        print("[-] Invalid format. Use '->' to separate reactants and products.")
        return
        
    try:
        left, right = reaction_str.split("->")
        reactants = [sym.strip() for sym in left.split("+") if sym.strip()]
        products = [sym.strip() for sym in right.split("+") if sym.strip()]
        
        # Verify symbols exist
        for sym in reactants + products:
            db.get_particle(sym)  # will raise KeyError if missing
            
        result = db.verify_reaction(reactants, products)
        
        print("\n" + "="*70)
        print("  REACTION AUDIT RESULTS  ".center(70, "#"))
        print("="*70)
        print(f" Reaction: {' + '.join(reactants)} ----> {' + '.join(products)}")
        print(f" Status  : {'[ALLOWED] (Physically Feasible)' if result['is_physically_allowed'] else '[FORBIDDEN] (Violates Physics Laws)'}")
        print("-" * 70)
        
        for law, audit in result["conservations"].items():
            if law == "mass_energy":
                in_val = f"{audit['mass_in']:.4f} MeV"
                out_val = f"{audit['mass_out']:.4f} MeV"
                status = "[OK]" if audit["conserved"] else "[FAIL]"
                note = f" | {audit['note']}"
            else:
                in_val = f"{audit['in']:+.2f}"
                out_val = f"{audit['out']:+.2f}"
                status = "[OK]" if audit["conserved"] else "[FAIL]"
                note = ""
                
            print(f"  * {law.replace('_', ' ').title():<20}: {in_val:<12} -> {out_val:<12} {status:<7}{note}")
            
        print("="*70)
    except KeyError as e:
        print(f"[-] Physics Error: {e}")
    except Exception as e:
        print(f"[-] Error parsing reaction: {e}")

def main():
    try:
        db = ParticleDatabase()
    except Exception as e:
        print(f"Failed to load particle database: {e}")
        sys.exit(1)
        
    all_p = db.all_particles()
    sm_p = db.list_particles(category="Standard Model")
    bsm_p = db.list_particles(category="Beyond Standard Model")
    
    while True:
        print("\n" + "=" * 70)
        print("   SUBATOMIC PARTICLE DATABASE & SIMULATION ENGINE - DEMO CLI   ".center(70, "#"))
        print("=" * 70)
        print(f"  Database Version: 1.0.0 | Total Particles: {len(all_p)}")
        print(f"  * Standard Model (SM)    : {len(sm_p)} particles & antiparticles")
        print(f"  * Beyond Standard Model  : {len(bsm_p)} conjectured/hypothetical particles")
        print("-" * 70)
        print("  1. Search for a Particle by Symbol (e.g. 'e-', 'nu_e', 'W+', '~chi1_0')")
        print("  2. View Particle Directory (SM & BSM lists)")
        print("  3. Audit Subatomic Reaction Conservation Laws (Decay / Collision)")
        print("  4. Exit")
        print("=" * 70)
        
        choice = input("Select an option (1-4): ").strip()
        
        if choice == "1":
            sym = input("Enter particle symbol (e.g., e-, t, gamma, ~chi1_0, M): ").strip()
            try:
                p = db.get_particle(sym)
                print_particle_profile(p)
            except KeyError:
                print(f"[-] Symbol '{sym}' not found. Check the directory for valid symbols.")
        elif choice == "2":
            print("\n" + "-" * 70)
            print("STANDARD MODEL PARTICLES:")
            print("-" * 70)
            for p in sorted(sm_p, key=lambda x: (x.type, x.mass_mev)):
                anti_str = " (antiparticle)" if p.is_antiparticle else ""
                print(f"  [{p.symbol:<12}] {p.name:<25} | Type: {p.type:<12} | Mass: {p.mass_mev:.3f} MeV{anti_str}")
                
            print("\n" + "-" * 70)
            print("BEYOND STANDARD MODEL (BSM) PARTICLES:")
            print("-" * 70)
            for p in sorted(bsm_p, key=lambda x: (x.type, x.mass_mev)):
                anti_str = " (antiparticle)" if p.is_antiparticle else ""
                print(f"  [{p.symbol:<12}] {p.name:<25} | Type: {p.type:<12} | Mass: {p.mass_mev:.3f} MeV{anti_str}")
        elif choice == "3":
            handle_reaction_test(db)
        elif choice == "4":
            print("\nExiting. Good luck building your subatomic particle simulator!")
            break
        else:
            print("[-] Invalid choice. Please select between 1 and 4.")

if __name__ == "__main__":
    main()
