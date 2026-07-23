# SentinelIA — Service d'analyse IA

Service FastAPI de détection de deepfakes pour SentinelIA.

## Modèles utilisés

| Route | Modèle HuggingFace | Tâche |
|---|---|---|
| `/analyze/voice` | `garystafford/wav2vec2-deepfake-voice-detector` | Détection de voix synthétique |
| `/analyze/image` | `prithivMLmods/Deep-Fake-Detector-v2-Model` | Détection de deepfake image |
| `/analyze/video` | Même modèle image × 10 frames | Détection de deepfake vidéo |

## Installation

```bash
# Créer un environnement virtuel
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt
```

## Lancement

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Le service sera accessible sur `http://localhost:8000`.  
Documentation interactive : `http://localhost:8000/docs`

## Format de réponse

Toutes les routes retournent le même format JSON :

```json
{
  "score": 73.45,
  "verdict": "suspect",
  "label": "Signes de manipulation détectés",
  "explanation": "Notre analyse détecte des signatures...",
  "details": {
    "model": "...",
    "raw_results": [...]
  }
}
```

## Verdicts

| Score | Verdict | Signification |
|---|---|---|
| `< 30` | `authentique` | Contenu probablement authentique |
| `30 – 70` | `non_concluant` | Analyse ambiguë, vérification recommandée |
| `> 70` | `suspect` | Signes de manipulation par IA détectés |
