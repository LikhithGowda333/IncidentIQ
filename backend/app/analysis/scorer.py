from typing import List, Dict, Any, Tuple, Optional

def compute_heuristic_score(
    base: float,
    temporal_match: float,
    error_density: float,
    causal_link: float,
    contradiction_penalty: float
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Computes an explainable, bounded heuristic support score (0.00 to 1.00).
    Not a statistically calibrated probability; reflects weighted evidence signals.
    """
    w_temporal = 0.25
    w_error = 0.30
    w_causal = 0.25
    w_penalty = 0.35
    
    raw = base + (w_temporal * temporal_match) + (w_error * error_density) + (w_causal * causal_link) - (w_penalty * contradiction_penalty)
    clamped = max(0.05, min(0.96, round(raw, 2)))
    
    if clamped >= 0.75:
        tier = "High evidence support"
    elif clamped >= 0.50:
        tier = "Moderate evidence support"
    elif clamped >= 0.25:
        tier = "Low evidence support"
    else:
        tier = "Insufficient evidence"
        
    formula = {
        "formula": "Score = Base(0.15) + (0.25 * TemporalMatch) + (0.30 * ErrorDensity) + (0.25 * CausalLink) - (0.35 * Contradictions)",
        "inputs": {
            "base": base,
            "temporal_match": round(temporal_match, 2),
            "error_density": round(error_density, 2),
            "causal_link": round(causal_link, 2),
            "contradiction_penalty": round(contradiction_penalty, 2),
            "computed_score": clamped
        },
        "interpretation": "Heuristic evidence score based on documented signal weights. Not a statistical probability distribution."
    }
    
    return clamped, tier, formula
