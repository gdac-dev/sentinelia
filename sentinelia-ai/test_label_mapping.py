#!/usr/bin/env python3
"""
SentinelIA — Test unitaire de vérification des labels
======================================================

Charge chaque modèle individuellement, l'exécute sur une image de test,
et affiche le label brut ET le score extrait par get_fake_score(),
pour vérifier visuellement que le mapping est correct AVANT de lancer
la calibration complète.

Usage :
    cd sentinelia-ai
    venv\\Scripts\\python test_label_mapping.py
"""

import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from transformers import pipeline

# ── Réutiliser get_fake_score depuis main.py ───────────────

# Mots-clés universels (dupliqués ici pour que le test soit autonome)
FAKE_KEYWORDS = ["fake", "deepfake", "ai", "generated", "synthetic", "artificial"]
REAL_KEYWORDS = ["real", "authentic", "genuine", "original", "human", "realism"]


def get_fake_score(pipeline_output: list[dict], model_name: str = "unknown") -> float:
    """
    Extrait la probabilité de 'fake' (0-100) depuis la sortie d'un pipeline.
    NE SUPPOSE JAMAIS un index fixe.
    """
    all_labels = [r["label"] for r in pipeline_output]

    for r in pipeline_output:
        label_lower = r["label"].lower().strip()
        for keyword in FAKE_KEYWORDS:
            if keyword in label_lower:
                score = round(r["score"] * 100, 2)
                print(f"    → Label fake trouvé: '{r['label']}' "
                      f"(mot-clé: '{keyword}') → score = {score}%")
                return score

    for r in pipeline_output:
        label_lower = r["label"].lower().strip()
        for keyword in REAL_KEYWORDS:
            if keyword in label_lower:
                score = round((1.0 - r["score"]) * 100, 2)
                print(f"    → Label real trouvé: '{r['label']}' "
                      f"(mot-clé: '{keyword}') → score inversé = {score}%")
                return score

    print(f"    ⚠️  AUCUN LABEL RECONNU parmi {all_labels}")
    return 50.0


# ── Télécharger une image de test ──────────────────────────

def obtenir_image_test() -> Image.Image:
    """Télécharge une photo de portrait réel (Unsplash) pour le test."""
    test_path = Path(__file__).parent / "test_samples" / "test_label_check.jpg"
    if not test_path.exists():
        test_path.parent.mkdir(parents=True, exist_ok=True)
        print("⬇  Téléchargement d'une image de test (portrait réel)...")
        url = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&q=80"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            test_path.write_bytes(resp.read())
        print(f"   ✓ Sauvegardé: {test_path}")
    return Image.open(test_path).convert("RGB")


# ── Test d'un modèle ──────────────────────────────────────

def tester_modele(nom: str, model_id: str, task: str, image_or_path, is_image: bool = True):
    """Charge un modèle, affiche id2label, exécute sur l'image, et vérifie get_fake_score."""
    sep = "─" * 60
    print(f"\n{sep}")
    print(f"🔬 TEST: {nom}")
    print(f"   Modèle: {model_id}")
    print(sep)

    # Charger
    try:
        print("  Chargement...")
        clf = pipeline(task, model=model_id, trust_remote_code=True)
    except Exception as e:
        print(f"  ❌ Impossible de charger: {e}")
        return

    # Afficher id2label
    try:
        id2label = clf.model.config.id2label
        print(f"  id2label: {id2label}")
    except AttributeError:
        print(f"  id2label: (non disponible)")

    # Exécuter
    print(f"  Inférence...")
    try:
        results = clf(image_or_path)
    except Exception as e:
        print(f"  ❌ Erreur d'inférence: {e}")
        return

    # Afficher les labels bruts
    print(f"\n  📋 LABELS BRUTS retournés par le pipeline:")
    for i, r in enumerate(results):
        pct = r["score"] * 100
        bar = "█" * int(pct / 2) + "░" * (50 - int(pct / 2))
        print(f"    [{i}] label='{r['label']}'  score={r['score']:.6f}  ({pct:.2f}%)")
        print(f"        {bar}")

    # Appliquer get_fake_score
    print(f"\n  🎯 RÉSULTAT de get_fake_score():")
    fake_score = get_fake_score(results, nom)

    # Vérification visuelle
    print(f"\n  📊 RÉSUMÉ:")
    print(f"    Score fake extrait : {fake_score:.2f}%")
    if is_image:
        # C'est une photo réelle → le score devrait être bas
        if fake_score < 35:
            print(f"    ✅ CORRECT — Image réelle détectée comme authentique")
        elif fake_score <= 55:
            print(f"    🟡 AMBIGU — Image réelle dans la zone grise")
        else:
            print(f"    ❌ FAUX POSITIF — Image réelle détectée comme fake !")
    print(sep)


# ── Main ───────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("🧪 SentinelIA — Test de vérification du mapping des labels")
    print("=" * 60)
    print()
    print("Ce test charge chaque modèle, affiche son id2label,")
    print("exécute une inférence sur une vraie photo, et vérifie")
    print("que get_fake_score() extrait le bon score.")
    print()

    image = obtenir_image_test()

    # ── Test des 3 modèles image ───────────────────────────
    tester_modele(
        "Prithiv (ViT généraliste)",
        "prithivMLmods/Deep-Fake-Detector-v2-Model",
        "image-classification",
        image,
    )

    tester_modele(
        "Organika (SDXL detector)",
        "Organika/sdxl-detector",
        "image-classification",
        image,
    )

    tester_modele(
        "Dima806 (visage deepfake)",
        "dima806/deepfake_vs_real_image_detection",
        "image-classification",
        image,
    )

    print("\n" + "=" * 60)
    print("✅ Test terminé. Vérifiez visuellement ci-dessus que :")
    print("   1. id2label affiche bien les labels attendus")
    print("   2. get_fake_score() extrait le BON label (fake, pas real)")
    print("   3. Une photo réelle donne un score BAS (< 35%)")
    print("=" * 60)


if __name__ == "__main__":
    main()
