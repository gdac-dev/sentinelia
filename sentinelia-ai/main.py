# ============================================================
# SentinelIA — Service d'analyse IA (FastAPI)
#
# Système d'ensemble multi-modèles :
#   • Image : 3 modèles experts (prithiv généraliste,
#     Organika diffusion, dima806 visage)
#   • Voix  : 2 modèles experts (garystafford, MelodyMachine)
#   • Vidéo : mêmes 3 modèles image appliqués par frame
# ============================================================

import io
import math
import os
import tempfile
import time
import traceback
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
import cv2
import requests
from dotenv import load_dotenv
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

load_dotenv()


# ── Variables globales pour les modèles ────────────────────
# Chargés une seule fois au démarrage via le lifespan

# Image — Modèle expert (visage) et API (globale)
image_clf_dima806: Any = None     # dima806/deepfake_vs_real_image_detection (spécialisé visage)

# Voix — 2 modèles experts
voice_clf_gary: Any = None        # garystafford/wav2vec2-deepfake-voice-detector
voice_clf_melody: Any = None      # MelodyMachine/Deepfake-audio-detection-V2

# Face detection (mediapipe)
mp_face_detection: Any = None


def charger_modele_avec_retry(nom: str, task: str, model: str, max_retries: int = 3):
    """
    Charge un modèle HuggingFace avec plusieurs tentatives en cas d'erreur réseau.
    Retourne le pipeline ou None si le chargement échoue.
    Affiche id2label du modèle pour vérifier le mapping des labels.
    """
    for tentative in range(1, max_retries + 1):
        try:
            print(f"[IA] Chargement de {nom} (tentative {tentative}/{max_retries})...")
            clf = pipeline(task, model=model, trust_remote_code=True)
            # ── Log du mapping id2label pour vérification ──
            try:
                id2label = clf.model.config.id2label
                print(f"[IA]   id2label: {id2label}")
            except AttributeError:
                print(f"[IA]   id2label: (non disponible pour ce modèle)")
            print(f"[IA] OK — {nom} chargé avec succès")
            return clf
        except Exception as e:
            print(f"[IA] ERREUR tentative {tentative} pour {nom}: {e}")
            if tentative < max_retries:
                delai = tentative * 5
                print(f"[IA] Nouvelle tentative dans {delai}s...")
                time.sleep(delai)
    print(f"[IA] AVERTISSEMENT: {nom} n'a pas pu être chargé après {max_retries} tentatives")
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Chargement des modèles au démarrage du serveur.
    5 modèles chargés indépendamment : si l'un échoue,
    les autres restent disponibles et le serveur démarre quand même.
    """
    global image_clf_dima806
    global voice_clf_gary, voice_clf_melody
    global cv2_face_cascade

    # ── Modèle Image (1 HuggingFace local, l'autre est API) ──

    image_clf_dima806 = charger_modele_avec_retry(
        "Image — Dima806 (visage deepfake)",
        "image-classification",
        "dima806/deepfake_vs_real_image_detection",
    )

    # ── Modèles Voix (2) ──────────────────────────────────
    voice_clf_gary = charger_modele_avec_retry(
        "Voix — GaryStafford (wav2vec2)",
        "audio-classification",
        "garystafford/wav2vec2-deepfake-voice-detector",
    )

    voice_clf_melody = charger_modele_avec_retry(
        "Voix — MelodyMachine (Deepfake-V2)",
        "audio-classification",
        "MelodyMachine/Deepfake-audio-detection-V2",
    )

    # ── Face detection (OpenCV Haar Cascade) ───────────────
    try:
        import cv2
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        cv2_face_cascade = cv2.CascadeClassifier(cascade_path)
        if cv2_face_cascade.empty():
            print("[IA] AVERTISSEMENT: Impossible de charger le modèle OpenCV Face Cascade")
            cv2_face_cascade = None
        else:
            print("[IA] OK — Détecteur de visage OpenCV chargé")
    except Exception as e:
        print(f"[IA] AVERTISSEMENT: OpenCV non chargé: {e}")
        cv2_face_cascade = None

    # Résumé
    modeles = [
        image_clf_dima806,
        voice_clf_gary, voice_clf_melody,
    ]
    modeles_ok = sum(1 for m in modeles if m is not None)
    print(f"[IA] {modeles_ok}/3 modèles locaux prêts — Serveur démarré")
    yield

    # Nettoyage à l'arrêt
    print("[IA] Arrêt du service")


# ── Création de l'application FastAPI ──────────────────────
app = FastAPI(
    title="SentinelIA — Service IA",
    description="Détection de voix synthétiques, deepfakes images et vidéos (ensemble multi-modèles)",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS pour le backend Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════
# FONCTIONS UTILITAIRES
# ══════════════════════════════════════════════════════════════

def determiner_verdict(score: float) -> str:
    """
    Détermine le verdict en fonction du score (0-100).
    - score < 35      → authentique
    - 35 ≤ score ≤ 55 → non_concluant
    - score > 55      → suspect
    """
    if score < 35:
        return "authentique"
    elif score <= 55:
        return "non_concluant"
    else:
        return "suspect"


def generer_label(score: float, type_media: str) -> str:
    """Génère un libellé lisible pour l'utilisateur final."""
    if type_media == "voice":
        if score < 35:
            return "Voix probablement authentique"
        elif score <= 55:
            return "Analyse vocale non concluante"
        else:
            return "Signes de voix synthétique détectés"
    else:  # image ou vidéo
        if score < 35:
            return "Contenu probablement authentique"
        elif score <= 55:
            return "Analyse visuelle non concluante"
        else:
            return "Signes de manipulation détectés"


def generer_explication(score: float, type_media: str, nb_modeles: int = 1) -> str:
    """Génère une phrase d'explication simple pour accompagner le score."""
    noms = {"voice": "l'audio", "image": "l'image", "video": "la vidéo"}
    media = noms.get(type_media, "le contenu")
    ensemble_str = f"{nb_modeles} modèles experts ont analysé {media}. " if nb_modeles > 1 else ""

    if score < 35:
        return (
            f"{ensemble_str}"
            f"Notre analyse indique que {media} ne présente pas de signes "
            f"significatifs de génération ou de manipulation par IA. "
            f"Score de confiance : {100 - score:.1f}%."
        )
    elif score <= 55:
        return (
            f"{ensemble_str}"
            f"Notre analyse de {media} présente des indicateurs mixtes. "
            f"Nous recommandons une vérification complémentaire. "
            f"Score de suspicion : {score:.1f}%."
        )
    else:
        return (
            f"{ensemble_str}"
            f"Notre analyse détecte des signatures caractéristiques "
            f"de contenu généré ou manipulé par IA dans {media}. "
            f"Score de suspicion : {score:.1f}%."
        )


# Mots-clés universels pour détecter le label "fake" (insensible à la casse)
FAKE_KEYWORDS = ["fake", "deepfake", "ai", "generated", "synthetic", "artificial"]
# Mots-clés universels pour détecter le label "real"
REAL_KEYWORDS = ["real", "authentic", "genuine", "original", "human", "realism"]


def get_fake_score(pipeline_output: list[dict[str, Any]], model_name: str = "unknown") -> float:
    """
    Extrait la probabilité de "fake" (0-100) depuis la sortie d'un pipeline
    image-classification ou audio-classification.

    NE SUPPOSE JAMAIS un index fixe. Cherche parmi TOUS les labels retournés
    celui qui contient un mot-clé "fake" ou "real" (insensible à la casse).

    Stratégie :
    1. Chercher un label contenant un mot-clé fake → retourner son score × 100
    2. Sinon, chercher un label contenant un mot-clé real → retourner (1 - score) × 100
    3. Sinon, logger un avertissement explicite et retourner 50 (non concluant)
    """
    all_labels = [r["label"] for r in pipeline_output]

    # Étape 1 : Chercher un label "fake"
    for r in pipeline_output:
        label_lower = r["label"].lower().strip()
        for keyword in FAKE_KEYWORDS:
            if keyword in label_lower:
                score = round(r["score"] * 100, 2)
                print(f"    [{model_name}] Label fake trouvé: '{r['label']}' "
                      f"(mot-clé: '{keyword}') → score = {score}%")
                return score

    # Étape 2 : Chercher un label "real" et inverser
    for r in pipeline_output:
        label_lower = r["label"].lower().strip()
        for keyword in REAL_KEYWORDS:
            if keyword in label_lower:
                score = round((1.0 - r["score"]) * 100, 2)
                print(f"    [{model_name}] Label real trouvé: '{r['label']}' "
                      f"(mot-clé: '{keyword}') → score inversé = {score}%")
                return score

    # Étape 3 : Aucun label reconnu → avertissement
    print(f"    ⚠️  [{model_name}] AUCUN LABEL RECONNU parmi {all_labels}")
    print(f"    ⚠️  Mots-clés fake cherchés : {FAKE_KEYWORDS}")
    print(f"    ⚠️  Mots-clés real cherchés : {REAL_KEYWORDS}")
    print(f"    ⚠️  → Retour fallback 50% (non concluant). "
          f"Ajoutez le bon mot-clé dans FAKE_KEYWORDS ou REAL_KEYWORDS.")
    return 50.0


# ══════════════════════════════════════════════════════════════
# DÉTECTION DE VISAGE (MediaPipe)
# ══════════════════════════════════════════════════════════════

def detecter_visages(image_pil: Image.Image) -> list[tuple[int, int, int, int]]:
    """
    Détecte les visages dans une image PIL.
    Essaie d'abord OpenCV (Haar Cascade). Si aucun visage n'est détecté,
    fait un fallback sur face_recognition (basé sur dlib).
    Retourne une liste de bounding boxes (x, y, w, h) en pixels.
    """
    img_np = np.array(image_pil)
    print(f"  [Visage] Image numpy: shape={img_np.shape}, dtype={img_np.dtype}")

    bboxes = []

    # ── 1er ESSAI : OpenCV Haar Cascade ──────────────────────────
    if cv2_face_cascade is not None:
        try:
            # Convertir en niveaux de gris pour OpenCV
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            # scaleFactor=1.1, minNeighbors=4 : plus sensible pour attraper plus de visages
            faces = cv2_face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(20, 20))
            if len(faces) > 0:
                for i, (x, y, w, h) in enumerate(faces):
                    print(f"  [Visage] Détection OpenCV #{i}: bbox_px=(x={x}, y={y}, w={w}, h={h})")
                    bboxes.append((int(x), int(y), int(w), int(h)))
                if bboxes:
                    print("  [Visage] ✅ Méthode utilisée : OpenCV Haar Cascade (sensibilité élevée)")
                    return bboxes
            else:
                print("  [Visage] OpenCV n'a trouvé aucun visage valide.")
        except Exception as e:
            print(f"[IA] ❌ Erreur détection visage OpenCV :")
            traceback.print_exc()
    else:
        print("  [Visage] OpenCV non disponible.")

    # ── 2ème ESSAI : face_recognition (Fallback) ──────────────────
    print("  [Visage] ⚠️ Fallback sur face_recognition...")
    try:
        import face_recognition
        # face_recognition travaille sur des images numpy RGB
        face_locations = face_recognition.face_locations(img_np)
        if face_locations:
            for i, (top, right, bottom, left) in enumerate(face_locations):
                x = left
                y = top
                w = right - left
                h = bottom - top
                print(f"  [Visage] Détection face_recognition #{i} → bbox_px=(x={x}, y={y}, w={w}, h={h})")
                if w > 20 and h > 20:
                    bboxes.append((x, y, w, h))
            if bboxes:
                print("  [Visage] ✅ Méthode utilisée : face_recognition (fallback)")
                return bboxes
        else:
            print("  [Visage] face_recognition n'a trouvé aucun visage non plus.")
    except ImportError:
        print("  [Visage] Librairie face_recognition non installée.")
    except Exception as e:
        print(f"[IA] ❌ Erreur détection visage face_recognition :")
        traceback.print_exc()

    print("  [Visage] ❌ Méthode utilisée : AUCUNE (0 visage détecté)")
    return bboxes


def recadrer_visage(image_pil: Image.Image, bbox: tuple[int, int, int, int]) -> Image.Image | None:
    """
    Recadre un visage depuis l'image. Ajoute une marge de 20% autour du visage
    pour capturer le contexte (cheveux, fond) utile à la détection.
    Retourne None si le recadrage produit une image invalide.
    """
    x, y, w, h = bbox
    img_w, img_h = image_pil.size

    # Ajouter 20% de marge
    marge_x = int(w * 0.2)
    marge_y = int(h * 0.2)

    x1 = max(0, x - marge_x)
    y1 = max(0, y - marge_y)
    x2 = min(img_w, x + w + marge_x)
    y2 = min(img_h, y + h + marge_y)

    # Valider que le recadrage a des dimensions non nulles
    crop_w = x2 - x1
    crop_h = y2 - y1
    print(f"  [Recadrage] Coords: ({x1}, {y1}) → ({x2}, {y2}) = {crop_w}x{crop_h}px")

    if crop_w < 10 or crop_h < 10:
        print(f"  [Recadrage] ❌ Recadrage trop petit ({crop_w}x{crop_h}), ignoré")
        return None

    cropped = image_pil.crop((x1, y1, x2, y2))
    print(f"  [Recadrage] ✅ Image recadrée: {cropped.size}, mode={cropped.mode}")
    return cropped


# ══════════════════════════════════════════════════════════════
# ANALYSE IMAGE — ENSEMBLE MULTI-MODÈLES
# ══════════════════════════════════════════════════════════════

def analyze_with_sightengine(image_pil: Image.Image) -> float | None:
    """
    Appelle l'API Sightengine (modèle 'genai') pour détecter les images générées par 
    des modèles de diffusion modernes (Midjourney, Stable Diffusion, DALL-E, etc.)
    Contrairement à dima806 qui cherche des visages manipulés/échangés, Sightengine 
    analyse l'image entière pour y déceler les artefacts structurels des IAs génératives.
    """
    api_user = os.environ.get('SIGHTENGINE_API_USER')
    api_secret = os.environ.get('SIGHTENGINE_API_SECRET')
    
    if not api_user or not api_secret or api_user == "votre_api_user_ici":
        print("  [Sightengine] ⚠️ Identifiants manquants dans .env (SIGHTENGINE_API_USER), modèle ignoré.")
        return None

    try:
        print("  [Sightengine] Appel de l'API (modèle 'genai')...")
        buf = io.BytesIO()
        image_pil.convert("RGB").save(buf, format='JPEG')
        image_bytes = buf.getvalue()
        
        url = 'https://api.sightengine.com/1.0/check.json'
        
        files = {'media': ('image.jpg', image_bytes, 'image/jpeg')}
        data = {
            'models': 'genai',
            'api_user': api_user,
            'api_secret': api_secret
        }
        
        response = requests.post(url, files=files, data=data, timeout=15)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get('status') == 'success':
            # L'API Sightengine (genai) retourne les scores dans `type`
            # ex: {"type": {"ai_generated": 0.95}}
            if 'type' in result and 'ai_generated' in result['type']:
                score = result['type']['ai_generated'] * 100
                print(f"  [Sightengine] ✅ Succès, probabilité IA: {score:.2f}%")
                return score
            else:
                print(f"  [Sightengine] ⚠️ Format inattendu (pas de type.ai_generated): {result}")
                return None
        elif result.get('status') == 'failure' and result.get('error', {}).get('type') == 'quota_exceeded':
            print("  [Sightengine] ❌ Quota mensuel dépassé, requête rejetée par Sightengine.")
            return None
        else:
            print(f"  [Sightengine] ❌ Erreur API: {result.get('error', result)}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"  [Sightengine] ❌ Erreur réseau/timeout: {e}")
        return None
    except Exception as e:
        print(f"  [Sightengine] ❌ Erreur inattendue: {e}")
        return None


def analyser_image_ensemble(image_pil: Image.Image) -> dict:
    """
    Analyse une image avec un ensemble de 2 modèles experts complémentaires :
    1. Sightengine (genai) — Détection de génération IA sur l'image globale (toujours exécuté).
    2. dima806 — Détection de visage manipulé (exécuté uniquement si un visage est détecté).
    """
    scores = {}
    details_modeles = {}

    # ── Modèle 1 : Sightengine (spécialiste Diffusion/GenAI) ──
    score_sightengine = analyze_with_sightengine(image_pil)
    if score_sightengine is not None:
        scores["sightengine"] = score_sightengine
        details_modeles["sightengine"] = {
            "score": score_sightengine,
            "role": "détection de génération IA (Midjourney, Stable Diffusion, etc.)",
            "info": "Sightengine API GenAI model"
        }
    else:
        details_modeles["sightengine"] = {
            "score": None, 
            "role": "détection de génération IA",
            "raison": "Erreur réseau, quota dépassé ou API non configurée"
        }

    # ── Détection de visage ─────────────────────────────────
    visages = detecter_visages(image_pil)
    visage_detecte = len(visages) > 0
    print(f"  [Visage] {'Détecté (' + str(len(visages)) + ')' if visage_detecte else 'Non détecté'}")

    # ── Modèle 2 : Dima806 (visage manipulé) ────────────────
    score_dima806 = None
    if visage_detecte and image_clf_dima806 is not None:
        try:
            # Recadrer le visage le plus grand (le plus probable d'être le sujet)
            plus_grand = max(visages, key=lambda b: b[2] * b[3])
            print(f"  [Dima806] Visage sélectionné: bbox=(x={plus_grand[0]}, y={plus_grand[1]}, "
                  f"w={plus_grand[2]}, h={plus_grand[3]})")

            visage_img = recadrer_visage(image_pil, plus_grand)

            if visage_img is None:
                print(f"  [Dima806] ⚠️ Recadrage invalide, modèle Dima806 ignoré")
                details_modeles["dima806"] = {"score": None, "raison": "Recadrage visage invalide"}
            else:
                # Convertir en RGB au cas où (certains crops peuvent perdre le mode)
                visage_img = visage_img.convert("RGB")
                print(f"  [Dima806] Inférence sur visage {visage_img.size}...")

                res = image_clf_dima806(visage_img)
                print(f"  [Dima806] Résultat brut: {res}")

                score = get_fake_score(res, "Dima806")

                # Vérifier que le score est un nombre valide
                if math.isnan(score) or math.isinf(score):
                    print(f"  [Dima806] ❌ Score invalide (nan/inf): {score}")
                    print(f"  [Dima806]   Pipeline output: {res}")
                    details_modeles["dima806"] = {"score": None, "error": f"Score invalide: {score}"}
                else:
                    scores["dima806"] = score
                    score_dima806 = score
                    details_modeles["dima806"] = {
                        "score": score,
                        "role": "détection de visage manipulé (Face Swap, GANs)",
                        "raw": [{"label": r["label"], "score": round(r["score"], 4)} for r in res],
                    }
                    print(f"  [Dima806] ✅ Score (visage): {score}%")
        except Exception as e:
            print(f"  [Dima806] ❌ ERREUR COMPLÈTE:")
            traceback.print_exc()
            details_modeles["dima806"] = {"score": None, "role": "détection de visage manipulé", "error": str(e)}

    if not visage_detecte:
        details_modeles["dima806"] = {"score": None, "role": "détection de visage manipulé", "raison": "Aucun visage détecté"}

    # ── Calcul du score final ───────────────────────────────
    if score_sightengine is not None and score_dima806 is not None:
        # Pondération asymétrique : 70% Sightengine, 30% dima806
        score_final = round((score_sightengine * 0.7) + (score_dima806 * 0.3), 2)
    elif score_sightengine is not None:
        score_final = round(score_sightengine, 2)
    elif score_dima806 is not None:
        score_final = round(score_dima806, 2)
    else:
        raise HTTPException(status_code=503, detail="Aucun modèle d'analyse d'image n'est disponible (Sightengine échoué et pas de modèle visage).")

    # ── Calcul du désaccord (écart-type à titre informatif) ──
    scores_list = [s for s in [score_sightengine, score_dima806] if s is not None]
    if len(scores_list) == 2:
        desaccord = round(abs(score_sightengine - score_dima806), 2)
    else:
        desaccord = 0.0

    # ── Verdict ─────────────────────────────────────────────
    verdict = determiner_verdict(score_final)

    # Si désaccord trop élevé → forcer non_concluant
    if desaccord > 25:
        # Bypass si Sightengine est catégorique
        if score_sightengine is not None and (score_sightengine > 90 or score_sightengine < 10):
            print(f"  [Ensemble] Désaccord ({desaccord}) ignoré car Sightengine est catégorique ({score_sightengine}%)")
        else:
            verdict = "non_concluant"
            print(f"  [Ensemble] ⚠ Désaccord élevé ({desaccord}) → verdict forcé à non_concluant")

    nb_modeles = len(scores_list)
    label = generer_label(score_final, "image")
    explication = generer_explication(score_final, "image", nb_modeles)

    return {
        "score": score_final,
        "verdict": verdict,
        "label": label,
        "explanation": explication,
        "details": {
            "visage_detecte": visage_detecte,
            "desaccord": desaccord,
            "nb_modeles_utilises": nb_modeles,
            "modeles": details_modeles,
        },
    }


# ══════════════════════════════════════════════════════════════
# ANALYSE VOCALE — ENSEMBLE 2 MODÈLES
# ══════════════════════════════════════════════════════════════

def analyser_voix_ensemble(chemin_audio: str) -> dict:
    """
    Analyse un fichier audio avec un ensemble de 2 modèles experts :
    1. garystafford/wav2vec2-deepfake-voice-detector
    2. MelodyMachine/Deepfake-audio-detection-V2

    Retourne un dict avec score, verdict, label, explanation, details.
    """
    scores = {}
    details_modeles = {}

    # ── Modèle 1 : GaryStafford ─────────────────────────────
    if voice_clf_gary is not None:
        try:
            res = voice_clf_gary(chemin_audio)
            score = get_fake_score(res, "GaryStafford")
            scores["garystafford"] = score
            details_modeles["garystafford"] = {
                "score": score,
                "raw": [{"label": r["label"], "score": round(r["score"], 4)} for r in res],
            }
            print(f"  [GaryStafford] Score: {score}%")
        except Exception as e:
            print(f"  [GaryStafford] Erreur: {e}")
            details_modeles["garystafford"] = {"score": None, "error": str(e)}

    # ── Modèle 2 : MelodyMachine ────────────────────────────
    if voice_clf_melody is not None:
        try:
            res = voice_clf_melody(chemin_audio)
            score = get_fake_score(res, "MelodyMachine")
            scores["MelodyMachine"] = score
            details_modeles["MelodyMachine"] = {
                "score": score,
                "raw": [{"label": r["label"], "score": round(r["score"], 4)} for r in res],
            }
            print(f"  [MelodyMachine] Score: {score}%")
        except Exception as e:
            print(f"  [MelodyMachine] Erreur: {e}")
            details_modeles["MelodyMachine"] = {"score": None, "error": str(e)}

    # ── Calcul du score final ───────────────────────────────
    scores_list = list(scores.values())

    if len(scores_list) == 0:
        raise HTTPException(status_code=503, detail="Aucun modèle vocal n'est disponible")

    score_final = round(float(np.mean(scores_list)), 2)

    # ── Calcul du désaccord ─────────────────────────────────
    if len(scores_list) == 2:
        desaccord = round(abs(scores_list[0] - scores_list[1]), 2)
    else:
        desaccord = 0.0

    # ── Verdict ─────────────────────────────────────────────
    verdict = determiner_verdict(score_final)

    if desaccord > 25:
        verdict = "non_concluant"
        print(f"  [Ensemble Voix] ⚠ Désaccord élevé ({desaccord}) → verdict forcé à non_concluant")

    nb_modeles = len(scores_list)
    label = generer_label(score_final, "voice")
    explication = generer_explication(score_final, "voice", nb_modeles)

    return {
        "score": score_final,
        "verdict": verdict,
        "label": label,
        "explanation": explication,
        "details": {
            "garystafford": scores.get("garystafford"),
            "MelodyMachine": scores.get("MelodyMachine"),
            "desaccord": desaccord,
            "nb_modeles_utilises": nb_modeles,
            "modeles": details_modeles,
        },
    }


# ══════════════════════════════════════════════════════════════
# ROUTES API
# ══════════════════════════════════════════════════════════════

# ── Route 1 : Analyse vocale ──────────────────────────────

@app.post("/analyze/voice")
async def analyser_voix(file: UploadFile = File(...)):
    """
    Reçoit un fichier audio et le soumet à l'ensemble de 2 modèles vocaux.
    """
    if voice_clf_gary is None and voice_clf_melody is None:
        raise HTTPException(status_code=503, detail="Modèles vocaux non chargés")

    # Sauvegarder le fichier audio temporairement
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        contenu = await file.read()
        tmp.write(contenu)
        chemin_tmp = tmp.name

    try:
        print(f"\n{'='*50}")
        print(f"🎤 ANALYSE VOCALE — {file.filename}")
        print(f"{'='*50}")

        result = analyser_voix_ensemble(chemin_tmp)

        print(f"  [Final] Score: {result['score']}% | Verdict: {result['verdict']}")
        print(f"{'='*50}\n")

        return result

    finally:
        os.unlink(chemin_tmp)


# ── Route 2 : Analyse d'image ─────────────────────────────

@app.post("/analyze/image")
async def analyser_image(file: UploadFile = File(...)):
    """
    Reçoit une image et la soumet à l'ensemble de 2 modèles (Sightengine + dima806).
    """
    # Puisque Sightengine est une API, on ne vérifie que dima806. Mais même si dima806 est None, Sightengine peut marcher.
    # On laisse passer et l'erreur 503 sera gérée dans analyser_image_ensemble si les 2 échouent.

    # Lire l'image en mémoire avec PIL
    contenu = await file.read()
    try:
        image = Image.open(io.BytesIO(contenu)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Fichier image invalide ou corrompu")

    print(f"\n{'='*50}")
    print(f"🖼️  ANALYSE IMAGE — {file.filename}")
    print(f"{'='*50}")

    result = analyser_image_ensemble(image)

    print(f"  [Final] Score: {result['score']}% | Verdict: {result['verdict']}")
    print(f"{'='*50}\n")

    return result


# ── Route 3 : Analyse de vidéo ────────────────────────────

@app.post("/analyze/video")
async def analyser_video(file: UploadFile = File(...)):
    """
    Reçoit une vidéo, extrait 10 frames réparties uniformément,
    applique l'ensemble (Sightengine + dima806) sur chaque frame,
    et retourne la moyenne des scores.
    """
    # L'erreur 503 sera gérée par analyser_image_ensemble si nécessaire

    # Sauvegarder la vidéo temporairement
    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        contenu = await file.read()
        tmp.write(contenu)
        chemin_tmp = tmp.name

    try:
        print(f"\n{'='*50}")
        print(f"🎬 ANALYSE VIDÉO — {file.filename}")
        print(f"{'='*50}")

        # Ouvrir la vidéo et compter les frames
        cap = cv2.VideoCapture(chemin_tmp)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Impossible d'ouvrir le fichier vidéo")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames < 1:
            raise HTTPException(status_code=400, detail="Vidéo vide ou illisible")

        # Calculer les indices des 10 frames à extraire
        nb_frames = min(10, total_frames)
        indices = [math.floor(i * total_frames / nb_frames) for i in range(nb_frames)]

        # Analyser chaque frame avec l'ensemble de modèles
        resultats_frames = []

        for idx, frame_idx in enumerate(indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()

            if not ret:
                continue

            # Convertir BGR (OpenCV) → RGB (PIL)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image_pil = Image.fromarray(frame_rgb)

            print(f"\n  --- Frame {idx + 1}/{nb_frames} (index {frame_idx}) ---")

            try:
                # Appliquer l'ensemble de 3 modèles sur cette frame
                frame_result = analyser_image_ensemble(image_pil)

                resultats_frames.append({
                    "frame_index": frame_idx,
                    "frame_number": idx + 1,
                    "score": frame_result["score"],
                    "verdict": frame_result["verdict"],
                    "details": frame_result["details"],
                })
            except Exception as e:
                print(f"  [Erreur Frame {idx + 1}] {e}")
                # En cas d'échec (ex: rate limit API Sightengine et pas de visage), on l'ignore ou met un fallback
                resultats_frames.append({
                    "frame_index": frame_idx,
                    "frame_number": idx + 1,
                    "score": 50.0,
                    "verdict": "non_concluant",
                    "details": {"error": str(e)}
                })


        cap.release()

        # Calculer le score moyen sur toutes les frames
        if not resultats_frames:
            raise HTTPException(status_code=500, detail="Aucune frame n'a pu être extraite")

        scores = [f["score"] for f in resultats_frames]
        score_moyen = round(float(np.mean(scores)), 2)
        score_max = round(max(scores), 2)
        score_min = round(min(scores), 2)

        # Moyennes par modèle sur toutes les frames
        avg_sightengine = _moyenne_scores_frames(resultats_frames, "sightengine")
        avg_dima806 = _moyenne_scores_frames(resultats_frames, "dima806")

        # Désaccord global (écart-type des moyennes par modèle)
        scores_modeles = [s for s in [avg_sightengine, avg_dima806] if s is not None]
        desaccord_global = round(float(np.std(scores_modeles)), 2) if len(scores_modeles) >= 2 else 0.0

        # Verdict final
        verdict = determiner_verdict(score_moyen)
        if desaccord_global > 25:
            verdict = "non_concluant"

        nb_modeles = len(scores_modeles)
        label = generer_label(score_moyen, "video")
        explication = generer_explication(score_moyen, "video", nb_modeles)

        print(f"\n  [Final Vidéo] Score moyen: {score_moyen}% | Verdict: {verdict}")
        print(f"{'='*50}\n")

        return {
            "score": score_moyen,
            "verdict": verdict,
            "label": label,
            "explanation": explication,
            "details": {
                "sightengine": avg_sightengine,
                "dima806": avg_dima806,
                "desaccord": desaccord_global,
                "visage_detecte": any(f["details"].get("visage_detecte") for f in resultats_frames),
                "nb_modeles_utilises": nb_modeles,
                "frames_analyzed": len(resultats_frames),
                "total_frames": total_frames,
                "score_min": score_min,
                "score_max": score_max,
                "frames": resultats_frames,
            },
        }

    finally:
        os.unlink(chemin_tmp)


def _moyenne_scores_frames(frames: list[dict], nom_modele: str) -> float | None:
    """Calcule la moyenne d'un modèle particulier sur toutes les frames."""
    vals = [
        f["details"].get(nom_modele)
        for f in frames
        if f["details"].get(nom_modele) is not None
    ]
    if not vals:
        return None
    return round(float(np.mean(vals)), 2)


# ── Health check ───────────────────────────────────────────

@app.get("/health")
async def health():
    """Vérifie que le service est opérationnel et que les modèles sont chargés."""
    return {
        "status": "ok",
        "service": "sentinelia-ai",
        "version": "0.2.0",
        "models": {
            "image_sightengine": True, # Sightengine est une API web
            "image_dima806": image_clf_dima806 is not None,
            "voice_garystafford": voice_clf_gary is not None,
            "voice_melodymachine": voice_clf_melody is not None,
            "face_detection": mp_face_detection is not None,
        },
    }
