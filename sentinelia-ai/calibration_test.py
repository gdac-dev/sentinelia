#!/usr/bin/env python3
"""
SentinelIA — Script de calibration multi-modèles
=================================================

Ce script télécharge (ou réutilise) un échantillon de :
  • 5 images RÉELLES (photos naturelles, domaine public)
  • 5 images FAUSSES (générées par IA)

Il fait tourner l'ensemble des 3 modèles image sur chaque image,
affiche un tableau récapitulatif, et calcule les taux d'erreur
(faux positifs / faux négatifs) pour identifier quel(s) modèle(s)
contribuent aux scores aberrants.

Usage :
    cd sentinelia-ai
    venv\\Scripts\\python calibration_test.py
"""

import os
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from transformers import pipeline

# ── Configuration ──────────────────────────────────────────

BASE_DIR = Path(__file__).parent
REAL_DIR = BASE_DIR / "test_samples" / "real"
FAKE_DIR = BASE_DIR / "test_samples" / "fake"

# Images réelles (Unsplash — photos naturelles, libres de droit)
REAL_URLS = {
    "real_portrait_01.jpg": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&q=80",
    "real_portrait_02.jpg": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=512&q=80",
    "real_landscape_03.jpg": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=512&q=80",
    "real_street_04.jpg": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=512&q=80",
    "real_nature_05.jpg": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=512&q=80",
}

# Les images fausses sont téléchargées depuis le dataset HuggingFace
# "dima806/ai_vs_real_image_detection" (split "fake")
NB_FAKE_IMAGES = 5


MIN_IMAGES_PER_FOLDER = 5


# ── Téléchargement ─────────────────────────────────────────

def telecharger_images_url(urls: dict[str, str], dossier: Path):
    """Télécharge les images depuis des URLs si elles n'existent pas déjà."""
    dossier.mkdir(parents=True, exist_ok=True)
    for nom, url in urls.items():
        chemin = dossier / nom
        if chemin.exists():
            print(f"  ✓ {nom} (déjà téléchargé)")
            continue
        try:
            print(f"  ⬇ Téléchargement {nom}...")
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
            chemin.write_bytes(data)
            Image.open(chemin).verify()
            print(f"  ✓ {nom} ({len(data) / 1024:.0f} KB)")
        except Exception as e:
            print(f"  ✗ Erreur {nom}: {e}")
            if chemin.exists():
                chemin.unlink()


def telecharger_fausses_images_hf(dossier: Path, nb_images: int = 5):
    """
    Télécharge des images générées par IA depuis le dataset HuggingFace
    dima806/ai_vs_real_image_detection (catégorie 'fake').
    Utilise le mode streaming pour ne pas télécharger tout le dataset.
    """
    dossier.mkdir(parents=True, exist_ok=True)

    # Vérifier si on a déjà assez d'images
    existantes = list(dossier.glob("*.jpg")) + list(dossier.glob("*.png"))
    if len(existantes) >= nb_images:
        print(f"  ✓ {len(existantes)} images fausses déjà présentes (>= {nb_images})")
        return

    try:
        from datasets import load_dataset
        print(f"  ⬇ Téléchargement de {nb_images} images IA depuis HuggingFace...")
        print(f"    Dataset: dima806/ai_vs_real_image_detection (streaming)")

        # Charger en streaming pour ne pas tout télécharger
        ds = load_dataset(
            "dima806/ai_vs_real_image_detection",
            split="train",
            streaming=True,
        )

        count = 0
        for i, sample in enumerate(ds):
            if count >= nb_images:
                break

            # Le dataset a une colonne 'label' : 0=real, 1=fake
            # Ou selon la structure, filtrer sur le label 'fake'
            label = sample.get("label", None)

            # Accepter les images labellisées comme fake/AI (label=1)
            # Certains datasets utilisent 0=fake, d'autres 1=fake
            # On prend les premières images indépendamment du label
            # car ce dataset est spécifiquement "ai_vs_real" et on veut des fakes
            if label == 1:  # fake/AI generated
                img = sample.get("image", None)
                if img is None:
                    continue

                nom = f"fake_hf_{count + 1:02d}.jpg"
                chemin = dossier / nom
                if not chemin.exists():
                    # Convertir en RGB et sauvegarder
                    if not isinstance(img, Image.Image):
                        continue
                    img = img.convert("RGB")
                    img.save(chemin, "JPEG", quality=90)
                    print(f"  ✓ {nom} ({img.size[0]}x{img.size[1]})")
                count += 1

        # Si aucune image label=1 trouvée, essayer label=0
        if count == 0:
            print("  ⚠ Aucune image label=1, tentative avec les premières images...")
            ds = load_dataset(
                "dima806/ai_vs_real_image_detection",
                split="train",
                streaming=True,
            )
            for i, sample in enumerate(ds):
                if count >= nb_images:
                    break
                img = sample.get("image", None)
                if img is None or not isinstance(img, Image.Image):
                    continue
                nom = f"fake_hf_{count + 1:02d}.jpg"
                chemin = dossier / nom
                if not chemin.exists():
                    img = img.convert("RGB")
                    img.save(chemin, "JPEG", quality=90)
                    print(f"  ✓ {nom} ({img.size[0]}x{img.size[1]})")
                count += 1

        if count == 0:
            print("  ❌ Impossible de télécharger des images fausses depuis HuggingFace")
        else:
            print(f"  ✅ {count} images fausses téléchargées")

    except ImportError:
        print("  ❌ Librairie 'datasets' non installée.")
        print("     Installez-la : pip install datasets")
    except Exception as e:
        print(f"  ❌ Erreur lors du téléchargement HF: {e}")
        import traceback
        traceback.print_exc()


def verifier_echantillons(real_dir: Path, fake_dir: Path, minimum: int = 5):
    """
    Vérifie que les dossiers de test contiennent assez d'images.
    Affiche un avertissement clair si ce n'est pas le cas.
    Retourne (real_files, fake_files).
    """
    real_files = sorted(real_dir.glob("*.jpg")) + sorted(real_dir.glob("*.png"))
    fake_files = sorted(fake_dir.glob("*.jpg")) + sorted(fake_dir.glob("*.png"))

    print(f"\n  📊 Bilan : {len(real_files)} réelles + {len(fake_files)} fausses")

    warning = False
    if len(real_files) < minimum:
        print(f"\n  ⚠️  ATTENTION : Seulement {len(real_files)} images réelles "
              f"dans {real_dir}")
        print(f"  ⚠️  Minimum recommandé : {minimum}")
        print(f"  ⚠️  Les résultats de calibration seront PEU FIABLES !")
        warning = True

    if len(fake_files) < minimum:
        print(f"\n  ⚠️  ATTENTION : Seulement {len(fake_files)} images fausses "
              f"dans {fake_dir}")
        print(f"  ⚠️  Minimum recommandé : {minimum}")
        print(f"  ⚠️  Les résultats de calibration seront PEU FIABLES !")
        warning = True

    if not real_files and not fake_files:
        print("\n  ❌ AUCUNE image trouvée. Impossible de continuer.")
        sys.exit(1)

    if warning:
        print(f"\n  💡 Ajoutez des images manuellement dans les dossiers ci-dessus,")
        print(f"     ou vérifiez votre connexion internet.")
        print()

    return real_files, fake_files


# Import de la fonction unique de scoring depuis main.py
# (pas de duplication de logique — une seule source de vérité)
from main import get_fake_score, analyze_with_sightengine


# ── Détection de visage (MediaPipe) ────────────────────────

def detecter_et_recadrer_visage(image_pil: Image.Image, nom_fichier: str = ""):
    """Détecte le plus grand visage et retourne le recadrage, ou None."""
    try:
        img_np = np.array(image_pil)
        bboxes = []

        import cv2
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        
        if not face_cascade.empty():
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(20, 20))
            if len(faces) > 0:
                for x, y, w, h in faces:
                    bboxes.append((int(x), int(y), int(w), int(h)))
                if bboxes:
                    print(f"  [{nom_fichier}] [Visage] OpenCV Haar Cascade utilisé")

        if not bboxes:
            try:
                import face_recognition
                face_locations = face_recognition.face_locations(img_np)
                for (top, right, bottom, left) in face_locations:
                    x = left
                    y = top
                    w = right - left
                    h = bottom - top
                    if w > 20 and h > 20:
                        bboxes.append((x, y, w, h))
                if bboxes:
                    print(f"  [{nom_fichier}] [Visage] face_recognition utilisé (fallback)")
            except ImportError:
                pass

        if not bboxes:
            return None

        # Prendre le plus grand visage
        best_bbox = max(bboxes, key=lambda b: b[2] * b[3])
        x, y, w, h = best_bbox

        # Marge 20%
        mx, my = int(w * 0.2), int(h * 0.2)
        h_img, w_img = img_np.shape[:2]
        x1 = max(0, x - mx)
        y1 = max(0, y - my)
        x2 = min(w_img, x + w + mx)
        y2 = min(h_img, y + h + my)
        
        if (x2 - x1) < 10 or (y2 - y1) < 10:
            return None
            
        return image_pil.crop((x1, y1, x2, y2)).convert("RGB")

    except Exception:
        import traceback
        traceback.print_exc()
        return None


# ── Analyse d'une image avec l'ensemble ────────────────────

def analyser_image(
    image_pil: Image.Image,
    clf_dima806,
    nom_fichier: str = "",
) -> dict:
    """
    Analyse une image avec les 2 modèles et retourne les scores individuels + le score final.
    """
    global calls_sightengine
    scores = {}

    # Modèle 1 : Sightengine (GenAI)
    try:
        score_se = analyze_with_sightengine(image_pil)
        if score_se is not None:
            calls_sightengine += 1
        scores["sightengine"] = score_se
        print(f"  [{nom_fichier}] [Sightengine] probabilité IA -> score extrait: {score_se}%")
    except Exception as e:
        scores["sightengine"] = None
        print(f"  [{nom_fichier}] [Sightengine]   ERREUR: {e}")

    # Modèle 2 : Dima806 (visage) — seulement si un visage est trouvé
    visage_detecte = False
    if clf_dima806 is not None:
        visage = detecter_et_recadrer_visage(image_pil, nom_fichier)
        if visage is not None:
            visage_detecte = True
            try:
                res = clf_dima806(visage)
                labels_bruts = [{"label": r["label"], "score": round(r["score"], 4)} for r in res]
                score = get_fake_score(res, "Dima806")
                scores["dima806"] = score
                print(f"  [{nom_fichier}] [Dima806]   labels bruts: {labels_bruts} -> score extrait: {score}% (visage)")
            except Exception as e:
                scores["dima806"] = None
                print(f"  [{nom_fichier}] [Dima806]   ERREUR: {e}")
        else:
            scores["dima806"] = None
            print(f"  [{nom_fichier}] [Dima806]   visage: non détecté -> ignoré")

    score_se = scores.get("sightengine")
    score_dima = scores.get("dima806")

    if score_se is not None and score_dima is not None:
        score_final = round((score_se * 0.7) + (score_dima * 0.3), 2)
    elif score_se is not None:
        score_final = round(score_se, 2)
    elif score_dima is not None:
        score_final = round(score_dima, 2)
    else:
        score_final = 50.0

    # Désaccord (écart-type à titre informatif)
    vals = [s for s in [score_se, score_dima] if s is not None]
    if len(vals) == 2:
        desaccord = round(abs(score_se - score_dima), 2)
    else:
        desaccord = 0.0

    return {
        "score_final": score_final,
        "verdict": None,
        "sightengine": scores.get("sightengine"),
        "dima806": scores.get("dima806"),
        "visage": visage_detecte,
        "desaccord": desaccord,
    }

def calculer_seuils(resultats: list[dict]):
    reels = [r for r in resultats if r["verite"] == "réel"]
    faux = [r for r in resultats if r["verite"] == "faux"]
    
    seuils = {}
    print("\n" + "="*60)
    print("📐 CALIBRATION EMPIRIQUE DES SEUILS (Échantillon test)")
    print("="*60)

    for modele in ["sightengine", "dima806"]:
        scores_reels = [r[modele] for r in reels if r[modele] is not None]
        scores_faux = [r[modele] for r in faux if r[modele] is not None]

        moy_reel = float(np.mean(scores_reels)) if scores_reels else 50.0
        moy_faux = float(np.mean(scores_faux)) if scores_faux else 50.0

        if not np.isnan(moy_reel) and not np.isnan(moy_faux):
            seuil = (moy_reel + moy_faux) / 2.0
        else:
            seuil = 55.0

        seuils[modele] = {
            "reel": round(moy_reel, 1),
            "faux": round(moy_faux, 1),
            "seuil": round(seuil, 1)
        }
        print(f"  [{modele.capitalize()}] Moy. réels: {moy_reel:.1f}% | Moy. IA: {moy_faux:.1f}% → Seuil optimal calculé: {seuil:.1f}%")

    # Seuil pour le score final (moyenne)
    scores_final_reels = [r["score_final"] for r in reels]
    scores_final_faux = [r["score_final"] for r in faux]
    moy_final_reel = float(np.mean(scores_final_reels)) if scores_final_reels else 50.0
    moy_final_faux = float(np.mean(scores_final_faux)) if scores_final_faux else 50.0
    seuil_final = (moy_final_reel + moy_final_faux) / 2.0
    
    seuils["final"] = {
        "reel": round(moy_final_reel, 1),
        "faux": round(moy_final_faux, 1),
        "seuil": round(seuil_final, 1)
    }
    print(f"  [Score Final] Moy. réels: {moy_final_reel:.1f}% | Moy. IA: {moy_final_faux:.1f}% → Seuil final optimal: {seuil_final:.1f}%")
    print("\n  ⚠️ NOTE: Ces seuils sont recalculés empiriquement sur l'échantillon test actuel.")
    print("  Il faudra les recalibrer avec un échantillon plus large (ex: 100 images) avant mise en production.")
    
    return seuils

def appliquer_verdicts(resultats: list[dict], seuils: dict):
    seuil_f = seuils["final"]["seuil"]
    for r in resultats:
        if r["score_final"] >= seuil_f:
            r["verdict"] = "suspect"
        else:
            r["verdict"] = "authentique"
        
        # En cas de gros désaccord entre modèles
        if r["desaccord"] > 25:
            se = r.get("sightengine")
            # Bypass si Sightengine est catégorique
            if se is not None and (se > 90 or se < 10):
                pass
            # Sinon, si le score final est dans la zone d'incertitude (proche du seuil)
            elif abs(r["score_final"] - seuil_f) < 15:
                r["verdict"] = "non_concluant"


# ── Affichage tableau ──────────────────────────────────────

def afficher_tableau(resultats: list[dict]):
    """Affiche un tableau récapitulatif des résultats."""
    # En-tête
    sep = "─" * 100
    print(f"\n{sep}")
    print(f"{'Fichier':<28} │ {'Vérité':^10} │ {'Score':>6} │ {'Verdict':^14} │ "
          f"{'Sightengine':>11} │ {'Dima806':>8} │ {'Visage':^7} │ {'Désacc.':>7}")
    print(f"{sep}")

    for r in resultats:
        sightengine_str = f"{r['sightengine']:.1f}" if r.get('sightengine') is not None else "  N/A"
        dima806_str = f"{r['dima806']:.1f}" if r.get('dima806') is not None else "  N/A"
        visage_str = "  Oui" if r['visage'] else "  Non"

        # Coloriser le verdict
        verdict = r['verdict']
        if verdict == "authentique":
            v_display = f"  ✅ {verdict}"
        elif verdict == "suspect":
            v_display = f"  🔴 {verdict}"
        else:
            v_display = f"  🟡 {verdict}"

        print(f"{r['fichier']:<28} │ {r['verite']:^10} │ {r['score_final']:>5.1f}% │ {v_display:<14} │ "
              f"{sightengine_str:>11} │ {dima806_str:>8} │ {visage_str:>7} │ {r['desaccord']:>6.1f}")

    print(f"{sep}\n")


def analyser_erreurs(resultats: list[dict], seuils: dict):
    """Analyse les faux positifs, faux négatifs, et identifie les modèles responsables basés sur les seuils empiriques."""

    reels = [r for r in resultats if r["verite"] == "réel"]
    faux = [r for r in resultats if r["verite"] == "faux"]

    # Faux positifs : images réelles classées "suspect"
    faux_positifs = [r for r in reels if r["verdict"] == "suspect"]
    # Faux négatifs : images fausses classées "authentique"
    faux_negatifs = [r for r in faux if r["verdict"] == "authentique"]

    taux_fp = (len(faux_positifs) / len(reels) * 100) if reels else 0
    taux_fn = (len(faux_negatifs) / len(faux) * 100) if faux else 0

    print("=" * 60)
    print("📊 RÉSULTATS DE CALIBRATION (Basé sur seuils empiriques)")
    print("=" * 60)
    print(f"  Images réelles testées     : {len(reels)}")
    print(f"  Images fausses testées     : {len(faux)}")
    print()
    print(f"  🔴 Faux positifs (réel → suspect)    : {len(faux_positifs)}/{len(reels)} ({taux_fp:.0f}%)")
    print(f"  🔵 Faux négatifs (faux → authentique) : {len(faux_negatifs)}/{len(faux)} ({taux_fn:.0f}%)")
    print()

    # Score moyen par modèle et par catégorie
    print("─" * 60)
    print("📈 SCORES MOYENS & SEUILS CALIBRÉS")
    print("─" * 60)
    for modele in ["sightengine", "dima806"]:
        s = seuils[modele]
        print(f"  {modele:>11} │ Réels: {s['reel']:5.1f}% │ IA: {s['faux']:5.1f}% │ Seuil appliqué: > {s['seuil']:.1f}%")

    s_fin = seuils["final"]
    print(f"  {'Score Final':>10} │ Réels: {s_fin['reel']:5.1f}% │ IA: {s_fin['faux']:5.1f}% │ Seuil appliqué: > {s_fin['seuil']:.1f}%")
    print()

    # Identifier les modèles coupables de faux positifs
    if faux_positifs:
        print("─" * 60)
        print("⚠️  MODÈLES RESPONSABLES DES FAUX POSITIFS")
        print("─" * 60)
        for r in faux_positifs:
            coupables = []
            for modele in ["sightengine", "dima806"]:
                seuil_modele = seuils[modele]["seuil"]
                if r.get(modele) is not None and r[modele] > seuil_modele:
                    coupables.append(f"{modele} ({r[modele]:.1f}%, seuil >{seuil_modele:.1f}%)")
            print(f"  {r['fichier']:<25} → Score final: {r['score_final']:.1f}% (seuil final: >{s_fin['seuil']:.1f}%)")
            if coupables:
                print(f"    Coupable(s) : {', '.join(coupables)}")
            else:
                print(f"    Aucun modèle n'a dépassé son propre seuil, mais la moyenne a dépassé {s_fin['seuil']:.1f}%")
        print()

    # Identifier les modèles coupables de faux négatifs
    if faux_negatifs:
        print("─" * 60)
        print("⚠️  MODÈLES RESPONSABLES DES FAUX NÉGATIFS")
        print("─" * 60)
        for r in faux_negatifs:
            coupables = []
            for modele in ["sightengine", "dima806"]:
                seuil_modele = seuils[modele]["seuil"]
                if r.get(modele) is not None and r[modele] < seuil_modele:
                    coupables.append(f"{modele} ({r[modele]:.1f}%, seuil <{seuil_modele:.1f}%)")
            print(f"  {r['fichier']:<25} → Score final: {r['score_final']:.1f}% (seuil final: >{s_fin['seuil']:.1f}%)")
            if coupables:
                print(f"    Coupable(s) : {', '.join(coupables)}")
            else:
                print(f"    Aucun modèle seul < à son seuil, mais la moyenne est restée sous {s_fin['seuil']:.1f}%")
        print()

    # Recommandation
    print("─" * 60)
    print("💡 RECOMMANDATION")
    print("─" * 60)
    if taux_fp == 0 and taux_fn == 0:
        print("  ✅ Excellent ! L'ensemble fonctionne parfaitement sur cet échantillon.")
    elif taux_fp > 30:
        print("  ⚠️  Taux de faux positifs élevé. Consultez les modèles coupables ci-dessus.")
        print("     → Envisagez de réduire le poids des modèles trop agressifs ou de les exclure.")
    elif taux_fn > 30:
        print("  ⚠️  Taux de faux négatifs élevé. Les modèles ne détectent pas assez les fausses images.")
        print("     → Envisagez d'ajouter un modèle plus sensible ou d'abaisser le seuil de détection.")
    else:
        print(f"  🟡 Résultats corrects mais perfectibles (FP: {taux_fp:.0f}%, FN: {taux_fn:.0f}%).")
        print("     → Ajustez les pondérations en fonction des modèles coupables identifiés.")
    print()


# ── Main ───────────────────────────────────────────────────

calls_sightengine = 0

def main():
    print("=" * 60)
    print("🧪 SentinelIA — Test de Calibration Multi-Modèles")
    print("=" * 60)

    # Étape 1 : Télécharger les images de test
    print("\n📁 Préparation des images de test...")
    print("\n  [Images RÉELLES — Unsplash]")
    telecharger_images_url(REAL_URLS, REAL_DIR)
    print("\n  [Images FAUSSES — HuggingFace dima806/ai_vs_real_image_detection]")
    telecharger_fausses_images_hf(FAKE_DIR, NB_FAKE_IMAGES)

    # Vérifier qu'on a assez d'images (avertissement si < 5)
    real_files, fake_files = verifier_echantillons(
        REAL_DIR, FAKE_DIR, MIN_IMAGES_PER_FOLDER
    )

    # Étape 2 : Charger les modèles
    print("\n🔄 Chargement des modèles (cela peut prendre quelques minutes)...\n")

    print("  [1/2] L'API Sightengine (genai) sera utilisée à la volée.")


    print("  [2/2] Chargement dima806/deepfake_vs_real_image_detection...")
    try:
        clf_dima806 = pipeline("image-classification",
                               model="dima806/deepfake_vs_real_image_detection",
                               trust_remote_code=True)
        print("  ✓ Dima806 chargé")
    except Exception as e:
        print(f"  ✗ Dima806 non disponible: {e}")
        clf_dima806 = None

    modeles_ok = sum(1 for m in [clf_dima806] if m is not None)
    print(f"\n  ✓ {modeles_ok} modèle local prêt + 1 API configurée")

    if modeles_ok == 0:
        print("❌ Aucun modèle chargé. Impossible de continuer.")
        sys.exit(1)

    # Étape 3 : Analyse
    print("\n🚀 Lancement de l'analyse...\n")

    resultats = []
    fichiers = [(f, "réel") for f in real_files] + [(f, "faux") for f in fake_files]

    total = len(fichiers)
    for i, (fichier, verite) in enumerate(fichiers):
        print(f"\n  [{i + 1}/{total}] {fichier.name}")
        try:
            image_pil = Image.open(fichier).convert("RGB")
            res = analyser_image(image_pil, clf_dima806, nom_fichier=fichier.name)
            res["fichier"] = fichier.name
            res["verite"] = verite
            resultats.append(res)
        except Exception as e:
            print(f"→ ERREUR: {e}")

    # Calcul et application des seuils optimisés
    seuils = calculer_seuils(resultats)
    appliquer_verdicts(resultats, seuils)

    # Afficher le verdict calculé pour chaque fichier
    print("\n📝 VERDICTS CALIBRÉS :")
    for r in resultats:
        print(f"→ [{r['fichier']}] Score final: {r['score_final']:.1f}% ({r['verdict']})")

    # Étape 4 : Affichage des résultats
    afficher_tableau(resultats)
    
    # Étape 5 : Analyse des erreurs
    analyser_erreurs(resultats, seuils)
    # Étape 6 : Quota Sightengine
    print("─" * 60)
    print("💳 QUOTA API")
    print("─" * 60)
    print(f"  Sightengine (GenAI) : {calls_sightengine} appels consommés sur ce test")
    print(f"  (Rappel : vous avez 2000 analyses gratuites par mois sur le plan Free)")
    print("=" * 60)


if __name__ == "__main__":
    main()
