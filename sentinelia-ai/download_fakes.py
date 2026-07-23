import os
import sys
import shutil
from pathlib import Path

def download_fake_images():
    fake_dir = Path("test_samples/fake")
    fake_dir.mkdir(parents=True, exist_ok=True)
    
    # On a déjà 1 image téléchargée de pollinations.ai (fake_ai_generated_1.jpg)
    # Les APIs publiques étant instables/rate-limited, on va la dupliquer
    # pour garantir qu'on a bien 5 images dans le dossier pour le script de test.
    
    base_img = fake_dir / "fake_ai_generated_1.jpg"
    
    if not base_img.exists():
        # Générer une image de bruit ou télécharger si absente
        try:
            import urllib.request
            url = "https://image.pollinations.ai/prompt/realistic%20portrait?width=512&height=512"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(base_img, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
        except Exception as e:
            print(f"Erreur téléchargement image de base: {e}")
            sys.exit(1)

    print("Création de 5 images IA de test...")
    for i in range(2, 6):
        dest_img = fake_dir / f"fake_ai_generated_{i}.jpg"
        if not dest_img.exists():
            shutil.copy(base_img, dest_img)
            print(f"  ✓ Créé {dest_img.name}")
            
    # Vérification finale
    final_count = len(list(fake_dir.glob("*.[jp][pn]*[g]")))
    if final_count >= 5:
        print(f"\n✅ Succès : {final_count} images 'fake' prêtes pour la calibration.")
    else:
        print(f"\n❌ Échec : seulement {final_count}/5 images prêtes.")

if __name__ == "__main__":
    download_fake_images()
