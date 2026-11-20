# boutique-solidaire-chappe
Application de gestion de stock par QR code pour la Boutique Solidaire — Lycée Claude Chappe (Projet E3D)

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page et navigation en 4 onglets (Scan, Ajouter, Stock, Bilans) |
| `style.css` | Apparence mobile-first, gros boutons tactiles, impression de planches A4 de 24 étiquettes (70 × 37 mm) |
| `app.js` | Logique métier : stock et historique dans le `localStorage`, scan caméra, QR codes, bilans, export CSV, sauvegarde/restauration JSON |

## Mise en ligne sur GitHub Pages

1. Dans le dépôt : **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
3. Après une ou deux minutes, l'application est disponible à l'adresse
   `https://supoz9.github.io/boutique-solidaire-chappe/` (HTTPS : la caméra fonctionne sur smartphone et tablette).

## Points importants

- **RGPD** : aucune donnée personnelle (nom, prénom, classe) n'est demandée ni enregistrée.
- **Données locales** : le stock est enregistré dans le navigateur de l'appareil utilisé. Pensez à faire régulièrement **Sauvegarder la base (JSON)** dans l'onglet Bilans.
- **Impression des étiquettes** : dans la fenêtre d'impression, choisir *Marges : aucune* et *Échelle : 100 %*.
