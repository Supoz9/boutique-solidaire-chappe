/* ============================================================
   BOUTIQUE SOLIDAIRE — Lycée Claude Chappe (Projet E3D)
   Fichier : app.js
   Rôle    : FONCTIONNEMENT de l'application.

   Plan du fichier :
     1. Listes de référence (familles, catégories, tailles...)
     2. Stockage local (localStorage)
     3. Fonctions utiles (dates, sécurité, messages)
     4. Logique métier (ajout d'article, don, retour en stock)
     5. Navigation entre les onglets
     6. Onglet 1 : scan caméra
     7. Onglet 2 : ajout d'article et étiquettes
     8. Onglet 3 : stock actuel
     9. Onglet 4 : historique, bilans, exports
    10. Démarrage de l'application

   RGPD : AUCUNE donnée personnelle (nom, prénom, classe) n'est
   demandée ni enregistrée. Uniquement des données matérielles.
   ============================================================ */

"use strict";   // mode strict : le navigateur signale plus d'erreurs de programmation


/* ============================================================
   1. LISTES DE RÉFÉRENCE
   Toutes les listes déroulantes sont remplies à partir d'ici.
   Pour ajouter une catégorie, il suffit de modifier ces listes.
   ============================================================ */

// Chaque famille a un CODE (utilisé dans l'identifiant) et un LIBELLÉ (affiché)
const FAMILLES = [
  { code: "H", libelle: "Homme" },
  { code: "F", libelle: "Femme" },
  { code: "M", libelle: "Mixte" }
];

const CATEGORIES = [
  { code: "VEST", libelle: "Veste" },
  { code: "PANT", libelle: "Pantalon" },
  { code: "CHEM", libelle: "Chemise" },
  { code: "PULL", libelle: "Pull" },
  { code: "CHAU", libelle: "Chaussures" },
  { code: "ACCE", libelle: "Accessoire" }
];

// Les tailles sont rangées par groupes (affichés avec <optgroup>)
const TAILLES = {
  "Tailles lettres": ["XS", "S", "M", "L", "XL", "XXL"],
  "Tailles chiffrées / pointures": [
    "34", "35", "36", "37", "38", "39", "40", "41", "42", "43",
    "44", "45", "46", "47", "48", "50", "52"
  ],
  "Autre": ["TU"]   // TU = Taille Unique (ceintures, cravates...)
};

const USAGES = ["Tenue de stage (PFMP)", "Quotidien"];

// Les deux statuts possibles d'un article
const STATUT_EN_STOCK = "EN_STOCK";
const STATUT_DONNE = "DONNE";

// Les deux types de mouvements possibles dans l'historique
const MVT_ENTREE = "ENTREE";
const MVT_SORTIE = "SORTIE";

// Nombre d'étiquettes sur une planche A4 (3 colonnes × 8 lignes)
const ETIQUETTES_PAR_PAGE = 24;

// Première année scolaire de l'application (pour le sélecteur d'année)
const PREMIERE_ANNEE_SCOLAIRE = 2026;


/* ============================================================
   2. STOCKAGE LOCAL (localStorage)
   Le navigateur garde les données même après fermeture.
   Attention : localStorage ne stocke que du TEXTE, on convertit
   donc nos tableaux en texte JSON (JSON.stringify) et inversement
   (JSON.parse).

   Pourquoi un préfixe "boutique_solidaire_" ? Sur GitHub Pages,
   tous les sites d'un même compte (supoz9.github.io/...) partagent
   le même localStorage. Le préfixe évite qu'un autre projet écrase
   nos tables "stock" et "historique".
   ============================================================ */

const CLE_STOCK = "boutique_solidaire_stock";
const CLE_HISTORIQUE = "boutique_solidaire_historique";

/**
 * Lit une table dans le localStorage.
 * @param {string} cle - le nom de la table
 * @returns {Array} le contenu de la table (tableau vide si rien n'est enregistré)
 */
function chargerTable(cle) {
  try {
    const texte = localStorage.getItem(cle);
    if (texte === null) {
      return [];                     // première utilisation : table vide
    }
    const donnees = JSON.parse(texte);
    return Array.isArray(donnees) ? donnees : [];
  } catch (erreur) {
    console.error("Lecture impossible de la table " + cle, erreur);
    return [];
  }
}

/**
 * Enregistre une table dans le localStorage.
 * @returns {boolean} true si l'enregistrement a réussi
 */
function sauvegarderTable(cle, donnees) {
  try {
    localStorage.setItem(cle, JSON.stringify(donnees));
    return true;
  } catch (erreur) {
    // Cela arrive si la mémoire du navigateur est pleine, ou en navigation privée
    console.error("Enregistrement impossible de la table " + cle, erreur);
    afficherMessage("⚠️ Enregistrement impossible : mémoire du navigateur pleine ?", "erreur");
    return false;
  }
}

// Les deux tables de l'application, chargées au démarrage
let stock = chargerTable(CLE_STOCK);            // articles enregistrés
let historique = chargerTable(CLE_HISTORIQUE);  // journal des mouvements

function enregistrerTout() {
  sauvegarderTable(CLE_STOCK, stock);
  sauvegarderTable(CLE_HISTORIQUE, historique);
}


/* ============================================================
   3. FONCTIONS UTILES
   ============================================================ */

/**
 * Raccourci pour récupérer un élément HTML par son id.
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * SÉCURITÉ : transforme les caractères spéciaux HTML (< > & " ')
 * en texte inoffensif. Indispensable avant d'insérer avec innerHTML
 * une donnée qui pourrait venir d'un fichier JSON restauré.
 * (Protection contre les failles XSS.)
 */
function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Ajoute un 0 devant les nombres à un chiffre : 7 -> "07"
 */
function deuxChiffres(nombre) {
  return String(nombre).padStart(2, "0");
}

/**
 * Date au format ISO "AAAA-MM-JJ" (heure locale française).
 * @param {Date} [d] - la date à convertir (par défaut : aujourd'hui)
 */
function dateIso(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate());
}

/**
 * Calcule l'année scolaire d'une date.
 * Une année scolaire va du 1er septembre au 31 août.
 *   - 15 octobre 2026 -> "2026-2027"
 *   - 10 mars 2027    -> "2026-2027"
 *   - 1er sept. 2027  -> "2027-2028"
 */
function calculerAnneeScolaire(date) {
  const annee = date.getFullYear();
  const mois = date.getMonth();      // ATTENTION : 0 = janvier ... 8 = septembre ... 11 = décembre
  if (mois >= 8) {
    return annee + "-" + (annee + 1);
  }
  return (annee - 1) + "-" + annee;
}

/**
 * Transforme un horodatage ISO en texte lisible : "20/11/2026 09:48"
 */
function formaterDateHeure(horodatageIso) {
  const d = new Date(horodatageIso);
  if (isNaN(d)) {
    return horodatageIso;
  }
  return deuxChiffres(d.getDate()) + "/" + deuxChiffres(d.getMonth() + 1) + "/" + d.getFullYear()
    + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes());
}

/**
 * Transforme "2026-11-20" en "20/11/2026"
 */
function formaterDate(texteDate) {
  const morceaux = String(texteDate).split("-");
  if (morceaux.length !== 3) {
    return texteDate;
  }
  return morceaux[2] + "/" + morceaux[1] + "/" + morceaux[0];
}

/**
 * Affiche un petit message en bas de l'écran pendant 3 secondes.
 * @param {string} texte
 * @param {string} type - "succes", "erreur", "alerte" ou "" (neutre)
 */
let minuteurMessage = null;
function afficherMessage(texte, type) {
  const zone = $("message");
  zone.textContent = texte;
  zone.className = "message visible " + (type || "");
  clearTimeout(minuteurMessage);
  minuteurMessage = setTimeout(function () {
    zone.className = "message";
  }, 3000);
}

/**
 * Fait vibrer le téléphone (si l'appareil le permet) : retour tactile après un scan.
 */
function vibrer(duree) {
  if (navigator.vibrate) {
    navigator.vibrate(duree);
  }
}

/**
 * Remplit une liste déroulante <select>.
 * @param {HTMLSelectElement} select
 * @param {Array} options - tableau de { valeur, texte }
 * @param {string} [texteTous] - si présent, ajoute en premier un choix "Tous" (valeur vide)
 */
function remplirSelect(select, options, texteTous) {
  select.innerHTML = "";
  if (texteTous) {
    select.add(new Option(texteTous, ""));
  }
  options.forEach(function (opt) {
    select.add(new Option(opt.texte, opt.valeur));
  });
}

/**
 * Remplit un <select> de tailles, avec des groupes (<optgroup>).
 */
function remplirSelectTailles(select, texteTous) {
  select.innerHTML = "";
  if (texteTous) {
    select.add(new Option(texteTous, ""));
  }
  for (const nomGroupe in TAILLES) {
    const groupe = document.createElement("optgroup");
    groupe.label = nomGroupe;
    TAILLES[nomGroupe].forEach(function (taille) {
      const texte = (taille === "TU") ? "TU (taille unique)" : taille;
      groupe.appendChild(new Option(texte, taille));
    });
    select.appendChild(groupe);
  }
}

/**
 * Dessine un QR code dans un élément HTML grâce à la bibliothèque qrcode.js.
 */
function dessinerQrCode(element, texte) {
  if (typeof QRCode === "undefined") {
    element.textContent = "(bibliothèque QR code non chargée)";
    return;
  }
  new QRCode(element, {
    text: texte,
    width: 256,                         // grande résolution : net à l'impression
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M // correction d'erreur moyenne (~15 %)
  });
}


/* ============================================================
   4. LOGIQUE MÉTIER
   ============================================================ */

/**
 * Cherche un article dans le stock grâce à son identifiant.
 * @returns {object|undefined} l'article, ou undefined s'il n'existe pas
 */
function trouverArticle(idUnique) {
  return stock.find(function (article) {
    return article.id_unique === idUnique;
  });
}

/**
 * Génère l'identifiant unique d'un nouvel article.
 * Format : [FAMILLE]-[CATEGORIE]-[TAILLE]-[NUMERO]   ex : H-VEST-L-001
 * Le numéro est le plus grand numéro déjà utilisé pour ce préfixe, + 1.
 * Comme les articles ne sont jamais supprimés, un numéro n'est jamais réutilisé.
 */
function genererIdUnique(codeFamille, codeCategorie, taille) {
  const prefixe = codeFamille + "-" + codeCategorie + "-" + taille + "-";
  let numeroMax = 0;

  stock.forEach(function (article) {
    if (article.id_unique.startsWith(prefixe)) {
      const numero = parseInt(article.id_unique.slice(prefixe.length), 10);
      if (numero > numeroMax) {
        numeroMax = numero;
      }
    }
  });

  // padStart(3, "0") : 1 -> "001", 12 -> "012"
  return prefixe + String(numeroMax + 1).padStart(3, "0");
}

/**
 * Ajoute une ligne dans le journal des mouvements (historique).
 * Le journal est IMMUABLE : on ne fait qu'ajouter, jamais modifier ni supprimer.
 */
function enregistrerMouvement(typeMvt, article) {
  const maintenant = new Date();
  const mouvement = {
    // identifiant unique : "MVT-" + date en base 36 + 4 caractères aléatoires
    id_mvt: "MVT-" + maintenant.getTime().toString(36).toUpperCase()
      + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    horodatage: maintenant.toISOString(),
    type_mvt: typeMvt,
    id_unique: article.id_unique,
    categorie: article.categorie,
    taille: article.taille,
    usage: article.usage,
    annee_scolaire: calculerAnneeScolaire(maintenant)
  };
  historique.push(mouvement);
}

/**
 * Crée un nouvel article EN_STOCK et enregistre le mouvement ENTREE.
 * @returns {object} l'article créé
 */
function ajouterArticle(codeFamille, codeCategorie, taille, usage) {
  const famille = FAMILLES.find(function (f) { return f.code === codeFamille; });
  const categorie = CATEGORIES.find(function (c) { return c.code === codeCategorie; });

  const article = {
    id_unique: genererIdUnique(codeFamille, codeCategorie, taille),
    famille: famille.libelle,
    categorie: categorie.libelle,
    taille: taille,
    usage: usage,
    date_entree: dateIso(),
    statut: STATUT_EN_STOCK
  };

  stock.push(article);
  enregistrerMouvement(MVT_ENTREE, article);
  return article;
}

/**
 * Enregistre la SORTIE d'un article (don à un élève).
 * @returns {boolean} true si le don a été enregistré
 */
function donnerArticle(idUnique) {
  const article = trouverArticle(idUnique);
  if (!article || article.statut === STATUT_DONNE) {
    return false;
  }
  article.statut = STATUT_DONNE;
  enregistrerMouvement(MVT_SORTIE, article);
  enregistrerTout();
  return true;
}

/**
 * Remet en stock un article déjà donné (retour, erreur de manipulation...).
 * Le journal garde la trace : on ajoute un mouvement ENTREE.
 */
function remettreEnStock(idUnique) {
  const article = trouverArticle(idUnique);
  if (!article || article.statut === STATUT_EN_STOCK) {
    return false;
  }
  article.statut = STATUT_EN_STOCK;
  enregistrerMouvement(MVT_ENTREE, article);
  enregistrerTout();
  return true;
}

/**
 * Construit le HTML d'une fiche descriptive d'article (utilisé par le scan).
 */
function htmlDetailsArticle(article) {
  const badge = article.statut === STATUT_DONNE
    ? '<span class="badge badge-donne">DONNÉ</span>'
    : '<span class="badge badge-stock">EN STOCK</span>';

  return '<p class="fiche-id">' + echapperHtml(article.id_unique) + "</p>"
    + "<dl>"
    + "<dt>Famille</dt><dd>" + echapperHtml(article.famille) + "</dd>"
    + "<dt>Catégorie</dt><dd>" + echapperHtml(article.categorie) + "</dd>"
    + "<dt>Taille</dt><dd>" + echapperHtml(article.taille) + "</dd>"
    + "<dt>Usage</dt><dd>" + echapperHtml(article.usage) + "</dd>"
    + "<dt>Entrée le</dt><dd>" + echapperHtml(formaterDate(article.date_entree)) + "</dd>"
    + "<dt>Statut</dt><dd>" + badge + "</dd>"
    + "</dl>";
}

/**
 * Met à jour tous les écrans après un changement de données.
 */
function rafraichirTout() {
  afficherListeEtiquettes();
  afficherStock();
  afficherHistorique();
}


/* ============================================================
   5. NAVIGATION ENTRE LES ONGLETS
   ============================================================ */

function afficherOnglet(idOnglet) {
  // 1) on montre la bonne section et on cache les autres
  document.querySelectorAll(".onglet").forEach(function (section) {
    section.classList.toggle("actif", section.id === idOnglet);
  });

  // 2) on met en valeur le bon bouton de navigation
  document.querySelectorAll(".nav-bouton").forEach(function (bouton) {
    const estActif = bouton.dataset.onglet === idOnglet;
    bouton.classList.toggle("actif", estActif);
    bouton.setAttribute("aria-current", estActif ? "page" : "false");
  });

  // 3) on coupe la caméra si on quitte l'onglet Scan (économie de batterie)
  if (idOnglet !== "onglet-scan") {
    arreterCamera();
  }

  // 4) on met à jour l'écran affiché
  rafraichirTout();
  window.scrollTo(0, 0);
}


/* ============================================================
   6. ONGLET 1 : SCAN CAMÉRA (bibliothèque html5-qrcode)
   Rappel : la caméra ne fonctionne qu'en HTTPS (GitHub Pages)
   ou en local (http://localhost).
   ============================================================ */

let lecteurQr = null;      // l'objet Html5Qrcode (créé au premier usage)
let cameraActive = false;
let scanEnPause = false;   // true pendant qu'une fiche est affichée (évite les scans en rafale)

function majBoutonCamera() {
  $("btn-camera").textContent = cameraActive ? "⏹️ Arrêter la caméra" : "📷 Activer la caméra";
}

async function demarrerCamera() {
  if (typeof Html5Qrcode === "undefined") {
    afficherMessage("Bibliothèque de scan non chargée (connexion Internet ?)", "erreur");
    return;
  }
  if (!lecteurQr) {
    lecteurQr = new Html5Qrcode("lecteur-qr");
  }

  $("btn-camera").disabled = true;
  try {
    await lecteurQr.start(
      { facingMode: "environment" },          // caméra arrière du téléphone
      { fps: 10, qrbox: { width: 240, height: 240 } },
      quandQrCodeLu,                          // fonction appelée à chaque QR code lu
      function () { }                         // erreurs de lecture image par image : ignorées
    );
    cameraActive = true;
    scanEnPause = false;
    $("resultat-scan").innerHTML = "";
  } catch (erreur) {
    console.error(erreur);
    afficherMessage("Caméra inaccessible : autorisez-la et utilisez l'adresse en https://", "erreur");
  }
  $("btn-camera").disabled = false;
  majBoutonCamera();
}

async function arreterCamera() {
  if (lecteurQr && cameraActive) {
    try {
      await lecteurQr.stop();
    } catch (erreur) {
      console.error(erreur);
    }
  }
  cameraActive = false;
  majBoutonCamera();
}

/**
 * Appelée par html5-qrcode quand un QR code est détecté.
 */
function quandQrCodeLu(texteLu) {
  if (scanEnPause) {
    return;                // une fiche est déjà affichée : on ignore
  }
  scanEnPause = true;
  vibrer(80);
  afficherFicheScan(texteLu.trim());
}

/**
 * Permet de scanner l'article suivant.
 */
function reprendreScan() {
  scanEnPause = false;
  $("resultat-scan").innerHTML = "";
  if (!cameraActive) {
    demarrerCamera();
  }
}

/**
 * Affiche la fiche correspondant au code scanné, avec les 3 cas possibles :
 *   A) code inconnu         -> erreur
 *   B) article EN_STOCK      -> gros bouton "Valider la SORTIE (Don)"
 *   C) article déjà DONNE    -> alerte + bouton "Remettre en stock"
 */
function afficherFicheScan(code) {
  const zone = $("resultat-scan");
  const article = trouverArticle(code);
  let html = "";

  if (!article) {
    // Cas A : QR code inconnu
    html = '<div class="carte fiche fiche-erreur">'
      + '<p class="fiche-titre">❌ QR code inconnu</p>'
      + "<p>Le code lu ne correspond à aucun article de la boutique :</p>"
      + '<p class="fiche-id">' + echapperHtml(code) + "</p>"
      + '<button type="button" class="btn btn-secondaire btn-geant" data-action="reprendre">🔄 Scanner un autre article</button>'
      + "</div>";
    vibrer([80, 60, 80]);
  } else if (article.statut === STATUT_EN_STOCK) {
    // Cas B : article disponible -> on propose le don
    html = '<div class="carte fiche">'
      + '<p class="fiche-titre">👕 Article trouvé</p>'
      + htmlDetailsArticle(article)
      + '<button type="button" class="btn btn-succes btn-geant" data-action="donner">✅ Valider la SORTIE (Don)</button>'
      + '<button type="button" class="btn btn-secondaire btn-geant" data-action="reprendre">Annuler</button>'
      + "</div>";
  } else {
    // Cas C : article déjà donné
    html = '<div class="carte fiche fiche-alerte">'
      + '<p class="fiche-titre">⚠️ Article déjà donné</p>'
      + "<p>Cet article est marqué <strong>DONNÉ</strong>. S'il revient à la boutique, remettez-le en stock.</p>"
      + htmlDetailsArticle(article)
      + '<button type="button" class="btn btn-alerte btn-geant" data-action="retour">↩️ Remettre en stock (retour)</button>'
      + '<button type="button" class="btn btn-secondaire btn-geant" data-action="reprendre">🔄 Scanner un autre article</button>'
      + "</div>";
  }

  zone.innerHTML = html;
  zone.dataset.code = code;    // on retient le code pour les boutons de la fiche
  zone.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Gère les clics sur les boutons de la fiche de scan.
 * (Un seul écouteur sur la zone : c'est la "délégation d'événements".)
 */
function clicFicheScan(evenement) {
  const bouton = evenement.target.closest("button[data-action]");
  if (!bouton) {
    return;
  }
  const code = $("resultat-scan").dataset.code;
  const action = bouton.dataset.action;

  if (action === "donner") {
    if (donnerArticle(code)) {
      afficherMessage("🎁 Don enregistré : " + code, "succes");
      afficherConfirmationScan("✅ Sortie enregistrée", code);
    }
  } else if (action === "retour") {
    if (remettreEnStock(code)) {
      afficherMessage("↩️ Article remis en stock : " + code, "succes");
      afficherConfirmationScan("↩️ Retour en stock enregistré", code);
    }
  } else if (action === "reprendre") {
    reprendreScan();
  }
}

function afficherConfirmationScan(titre, code) {
  $("resultat-scan").innerHTML = '<div class="carte fiche fiche-succes">'
    + '<p class="fiche-titre">' + echapperHtml(titre) + "</p>"
    + '<p class="fiche-id">' + echapperHtml(code) + "</p>"
    + '<button type="button" class="btn btn-principal btn-geant" data-action="reprendre">📷 Scanner l\'article suivant</button>'
    + "</div>";
}


/* ============================================================
   7. ONGLET 2 : AJOUT D'ARTICLE ET ÉTIQUETTES
   ============================================================ */

// Identifiants des articles cochés pour l'impression (un "Set" = ensemble sans doublon)
const etiquettesSelectionnees = new Set();

function soumettreFormulaireAjout(evenement) {
  evenement.preventDefault();   // empêche le rechargement de la page

  const codeFamille = $("champ-famille").value;
  const codeCategorie = $("champ-categorie").value;
  const taille = $("champ-taille").value;
  const usage = $("champ-usage").value;
  const quantite = parseInt($("champ-quantite").value, 10) || 1;

  if (!codeFamille || !codeCategorie || !taille || !usage) {
    afficherMessage("Merci de remplir tous les champs.", "alerte");
    return;
  }

  // Création du ou des articles
  const nouveaux = [];
  for (let i = 0; i < quantite; i++) {
    const article = ajouterArticle(codeFamille, codeCategorie, taille, usage);
    nouveaux.push(article);
    etiquettesSelectionnees.add(article.id_unique);   // coché d'office pour l'impression
  }
  enregistrerTout();

  // Affichage des QR codes créés
  const zone = $("resultat-ajout");
  zone.innerHTML = '<div class="carte fiche fiche-succes">'
    + '<p class="fiche-titre">✅ ' + nouveaux.length + " article(s) ajouté(s) au stock</p>"
    + '<div class="grille-qr"></div>'
    + "</div>";
  const grille = zone.querySelector(".grille-qr");

  nouveaux.forEach(function (article) {
    const bloc = document.createElement("div");
    bloc.className = "qr-ecran";
    const qr = document.createElement("div");
    qr.className = "qr";
    bloc.appendChild(qr);
    const texteId = document.createElement("p");
    texteId.textContent = article.id_unique;
    bloc.appendChild(texteId);
    grille.appendChild(bloc);
    dessinerQrCode(qr, article.id_unique);
  });

  afficherMessage("✅ " + nouveaux.length + " article(s) ajouté(s)", "succes");
  afficherListeEtiquettes();
}

/**
 * Affiche la liste des articles en stock avec une case à cocher pour l'impression.
 */
function afficherListeEtiquettes() {
  const liste = $("liste-etiquettes");
  // les plus récents en premier : on copie le tableau ([...stock]) puis on l'inverse
  const articles = [...stock].reverse().filter(function (a) {
    return a.statut === STATUT_EN_STOCK;
  });

  // on retire de la sélection les articles qui ne sont plus en stock
  etiquettesSelectionnees.forEach(function (id) {
    const article = trouverArticle(id);
    if (!article || article.statut !== STATUT_EN_STOCK) {
      etiquettesSelectionnees.delete(id);
    }
  });

  if (articles.length === 0) {
    liste.innerHTML = '<li class="vide">Aucun article en stock pour le moment.</li>';
  } else {
    liste.innerHTML = articles.map(function (a) {
      const coche = etiquettesSelectionnees.has(a.id_unique) ? " checked" : "";
      return "<li>"
        + '<label class="element-liste">'
        + '<input type="checkbox" value="' + echapperHtml(a.id_unique) + '"' + coche + ">"
        + '<span class="element-infos">'
        + '<span class="fiche-id">' + echapperHtml(a.id_unique) + "</span><br>"
        + '<span class="element-details">' + echapperHtml(a.categorie) + " · " + echapperHtml(a.taille)
        + " · " + echapperHtml(a.usage) + "</span>"
        + "</span>"
        + "</label>"
        + "</li>";
    }).join("");
  }
  majCompteurEtiquettes();
}

function majCompteurEtiquettes() {
  const nb = etiquettesSelectionnees.size;
  const pages = Math.ceil(nb / ETIQUETTES_PAR_PAGE);
  $("compteur-etiquettes").textContent = nb === 0
    ? "0 étiquette sélectionnée"
    : nb + " étiquette(s) sélectionnée(s) → " + pages + " planche(s) A4";
}

function clicCaseEtiquette(evenement) {
  const caseACocher = evenement.target;
  if (caseACocher.type !== "checkbox") {
    return;
  }
  if (caseACocher.checked) {
    etiquettesSelectionnees.add(caseACocher.value);
  } else {
    etiquettesSelectionnees.delete(caseACocher.value);
  }
  majCompteurEtiquettes();
}

function cocherToutesEtiquettes(cocher) {
  etiquettesSelectionnees.clear();
  if (cocher) {
    stock.forEach(function (a) {
      if (a.statut === STATUT_EN_STOCK) {
        etiquettesSelectionnees.add(a.id_unique);
      }
    });
  }
  afficherListeEtiquettes();
}

/**
 * Prépare les planches A4 (24 étiquettes par page) puis lance l'impression.
 */
function imprimerPlanche() {
  // On garde l'ordre d'affichage de la liste (les plus récents d'abord)
  const ids = [...stock].reverse()
    .map(function (a) { return a.id_unique; })
    .filter(function (id) { return etiquettesSelectionnees.has(id); });

  if (ids.length === 0) {
    afficherMessage("Cochez au moins un article à imprimer.", "alerte");
    return;
  }

  const zone = $("zone-impression");
  zone.innerHTML = "";

  // On découpe la liste en paquets de 24 : un paquet = une page A4
  for (let debut = 0; debut < ids.length; debut += ETIQUETTES_PAR_PAGE) {
    const page = document.createElement("div");
    page.className = "page-a4";

    ids.slice(debut, debut + ETIQUETTES_PAR_PAGE).forEach(function (id) {
      const article = trouverArticle(id);

      const etiquette = document.createElement("div");
      etiquette.className = "etiquette";

      const qr = document.createElement("div");
      qr.className = "qr";
      etiquette.appendChild(qr);

      const texteId = document.createElement("p");
      texteId.className = "etiquette-id";
      texteId.textContent = article.id_unique;
      etiquette.appendChild(texteId);

      const texteTaille = document.createElement("p");
      texteTaille.className = "etiquette-taille";
      texteTaille.textContent = "Taille : " + article.taille + " · " + article.categorie;
      etiquette.appendChild(texteTaille);

      page.appendChild(etiquette);
      dessinerQrCode(qr, article.id_unique);
    });

    zone.appendChild(page);
  }

  // Petit délai : on laisse le temps aux images des QR codes de s'afficher
  setTimeout(function () {
    window.print();
  }, 400);
}


/* ============================================================
   8. ONGLET 3 : STOCK ACTUEL
   ============================================================ */

function afficherStock() {
  const filtreCategorie = $("filtre-categorie").value;
  const filtreTaille = $("filtre-taille").value;
  const filtreUsage = $("filtre-usage").value;

  // On garde uniquement les articles EN_STOCK qui correspondent aux filtres
  // (un filtre vide "" signifie "Tous")
  const articles = [...stock].reverse().filter(function (a) {
    return a.statut === STATUT_EN_STOCK
      && (filtreCategorie === "" || a.categorie === filtreCategorie)
      && (filtreTaille === "" || a.taille === filtreTaille)
      && (filtreUsage === "" || a.usage === filtreUsage);
  });

  $("compteur-stock").textContent = articles.length + " article(s) disponible(s)";

  const liste = $("liste-stock");
  if (articles.length === 0) {
    liste.innerHTML = '<li class="vide">Aucun article ne correspond à ces critères.</li>';
    return;
  }

  liste.innerHTML = articles.map(function (a) {
    return '<li class="element-liste">'
      + '<div class="element-infos">'
      + '<span class="fiche-id">' + echapperHtml(a.id_unique) + "</span><br>"
      + '<span class="element-details">'
      + echapperHtml(a.famille) + " · " + echapperHtml(a.categorie) + " · Taille " + echapperHtml(a.taille)
      + "<br>" + echapperHtml(a.usage) + " · entré le " + echapperHtml(formaterDate(a.date_entree))
      + "</span>"
      + "</div>"
      + '<button type="button" class="btn btn-succes" data-id="' + echapperHtml(a.id_unique) + '">🎁 Marquer comme donné</button>'
      + "</li>";
  }).join("");
}

/**
 * Bouton de secours "Marquer comme donné" (si la caméra n'est pas utilisée).
 */
function clicListeStock(evenement) {
  const bouton = evenement.target.closest("button[data-id]");
  if (!bouton) {
    return;
  }
  const id = bouton.dataset.id;
  if (!confirm("Confirmer le don de l'article " + id + " ?")) {
    return;
  }
  if (donnerArticle(id)) {
    afficherMessage("🎁 Don enregistré : " + id, "succes");
    rafraichirTout();
  }
}


/* ============================================================
   9. ONGLET 4 : HISTORIQUE, BILANS ET EXPORTS
   ============================================================ */

/**
 * Remplit le sélecteur d'années scolaires :
 * "Toutes", puis chaque année de 2026-2027 jusqu'à l'année suivante,
 * plus les éventuelles années présentes dans une sauvegarde restaurée.
 */
function remplirSelectAnnees() {
  const select = $("select-annee");
  const valeurAvant = select.value;
  const annees = new Set();

  const anneeCourante = parseInt(calculerAnneeScolaire(new Date()).slice(0, 4), 10);
  for (let a = PREMIERE_ANNEE_SCOLAIRE; a <= anneeCourante + 1; a++) {
    annees.add(a + "-" + (a + 1));
  }
  historique.forEach(function (m) {
    annees.add(m.annee_scolaire);
  });

  const options = [...annees].sort().map(function (a) {
    return { valeur: a, texte: a };
  });
  remplirSelect(select, options, "Toutes");

  // Au tout premier affichage on sélectionne l'année en cours,
  // ensuite on garde le choix de l'utilisateur
  if (select.dataset.initialise) {
    select.value = valeurAvant;
  } else {
    select.value = calculerAnneeScolaire(new Date());
    select.dataset.initialise = "oui";
  }
}

/**
 * Renvoie les mouvements de l'année choisie (ou tous si "Toutes").
 */
function mouvementsFiltres() {
  const annee = $("select-annee").value;
  return historique.filter(function (m) {
    return annee === "" || m.annee_scolaire === annee;
  });
}

function afficherHistorique() {
  remplirSelectAnnees();
  const mouvements = mouvementsFiltres();

  // --- Les 3 compteurs clés ---
  const nbEntrees = mouvements.filter(function (m) { return m.type_mvt === MVT_ENTREE; }).length;
  const nbSorties = mouvements.filter(function (m) { return m.type_mvt === MVT_SORTIE; }).length;
  // Le stock disponible est une photo d'AUJOURD'HUI (il ne dépend pas de l'année choisie)
  const nbStock = stock.filter(function (a) { return a.statut === STATUT_EN_STOCK; }).length;

  $("total-entrees").textContent = nbEntrees;
  $("total-sorties").textContent = nbSorties;
  $("total-stock").textContent = nbStock;

  // --- Bilan des dons par catégorie et par usage ---
  const lignesBilan = CATEGORIES.map(function (cat) {
    const sorties = mouvements.filter(function (m) {
      return m.type_mvt === MVT_SORTIE && m.categorie === cat.libelle;
    });
    const pfmp = sorties.filter(function (m) { return m.usage === USAGES[0]; }).length;
    const quotidien = sorties.filter(function (m) { return m.usage === USAGES[1]; }).length;
    return "<tr><td>" + echapperHtml(cat.libelle) + "</td><td>" + pfmp + "</td><td>" + quotidien
      + "</td><td><strong>" + sorties.length + "</strong></td></tr>";
  });
  $("tableau-bilan").innerHTML = lignesBilan.join("");

  // --- Journal des mouvements (le plus récent en haut) ---
  const corps = $("tableau-journal");
  if (mouvements.length === 0) {
    corps.innerHTML = '<tr><td colspan="6" class="vide">Aucun mouvement pour cette période.</td></tr>';
    return;
  }
  corps.innerHTML = [...mouvements].reverse().map(function (m) {
    const badge = m.type_mvt === MVT_SORTIE
      ? '<span class="badge badge-sortie">SORTIE</span>'
      : '<span class="badge badge-entree">ENTRÉE</span>';
    return "<tr>"
      + "<td>" + echapperHtml(formaterDateHeure(m.horodatage)) + "</td>"
      + "<td>" + badge + "</td>"
      + "<td>" + echapperHtml(m.id_unique) + "</td>"
      + "<td>" + echapperHtml(m.categorie) + "</td>"
      + "<td>" + echapperHtml(m.taille) + "</td>"
      + "<td>" + echapperHtml(m.usage) + "</td>"
      + "</tr>";
  }).join("");
}

/**
 * Déclenche le téléchargement d'un fichier créé dans le navigateur.
 */
function telechargerFichier(nomFichier, contenu, typeMime) {
  const blob = new Blob([contenu], { type: typeMime });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

/**
 * Prépare une valeur pour une cellule CSV :
 *  - entoure de guillemets si elle contient ; " ou un retour à la ligne
 *  - SÉCURITÉ : ajoute une apostrophe devant = + - @ pour qu'Excel ou Calc
 *    ne l'exécute pas comme une formule ("injection CSV")
 */
function celluleCsv(valeur) {
  let texte = String(valeur === undefined || valeur === null ? "" : valeur);
  if (/^[=+\-@]/.test(texte)) {
    texte = "'" + texte;
  }
  if (/[";\r\n]/.test(texte)) {
    texte = '"' + texte.replace(/"/g, '""') + '"';
  }
  return texte;
}

/**
 * Export CSV du journal (année sélectionnée).
 * - Encodage UTF-8 AVEC BOM (﻿) : Excel affiche correctement les accents
 * - Séparateur ";" : format attendu par LibreOffice Calc / Excel en français
 */
function exporterCsv() {
  const mouvements = mouvementsFiltres();
  if (mouvements.length === 0) {
    afficherMessage("Aucun mouvement à exporter pour cette période.", "alerte");
    return;
  }

  const entetes = ["id_mvt", "date_heure", "type_mvt", "id_unique", "categorie", "taille", "usage", "annee_scolaire"];
  const lignes = [entetes.join(";")];

  mouvements.forEach(function (m) {
    // date au format "2026-11-20 09:48:31", reconnu automatiquement par les tableurs
    const d = new Date(m.horodatage);
    const dateHeure = isNaN(d) ? m.horodatage
      : dateIso(d) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds());

    lignes.push([
      m.id_mvt, dateHeure, m.type_mvt, m.id_unique, m.categorie, m.taille, m.usage, m.annee_scolaire
    ].map(celluleCsv).join(";"));
  });

  const contenu = "﻿" + lignes.join("\r\n");
  const annee = $("select-annee").value || "toutes-annees";
  telechargerFichier("boutique-solidaire-historique-" + annee + ".csv", contenu, "text/csv;charset=utf-8");
  afficherMessage("📄 Export CSV téléchargé", "succes");
}

/**
 * Sauvegarde complète de la base dans un fichier JSON.
 */
function sauvegarderJson() {
  const sauvegarde = {
    application: "Boutique Solidaire - Lycée Claude Chappe",
    version: 1,
    date_sauvegarde: new Date().toISOString(),
    stock: stock,
    historique: historique
  };
  const contenu = JSON.stringify(sauvegarde, null, 2);   // null, 2 : texte indenté, lisible
  telechargerFichier("boutique-solidaire-sauvegarde-" + dateIso() + ".json", contenu, "application/json");
  afficherMessage("💾 Sauvegarde téléchargée", "succes");
}

/**
 * RGPD : lors d'une restauration, on ne garde QUE les champs autorisés.
 * Si quelqu'un avait ajouté un champ "nom" ou "classe" dans le fichier,
 * il serait ignoré.
 */
const CHAMPS_ARTICLE = ["id_unique", "famille", "categorie", "taille", "usage", "date_entree", "statut"];
const CHAMPS_MOUVEMENT = ["id_mvt", "horodatage", "type_mvt", "id_unique", "categorie", "taille", "usage", "annee_scolaire"];

function garderChamps(objet, champsAutorises) {
  const propre = {};
  champsAutorises.forEach(function (champ) {
    propre[champ] = String(objet[champ] === undefined || objet[champ] === null ? "" : objet[champ]);
  });
  return propre;
}

async function restaurerJson(evenement) {
  const fichier = evenement.target.files[0];
  evenement.target.value = "";          // permet de re-choisir le même fichier plus tard
  if (!fichier) {
    return;
  }

  try {
    const texte = await fichier.text();
    const donnees = JSON.parse(texte);

    // Vérifications : le fichier a-t-il la bonne structure ?
    if (!donnees || !Array.isArray(donnees.stock) || !Array.isArray(donnees.historique)) {
      throw new Error("structure invalide");
    }
    const articlesValides = donnees.stock.every(function (a) {
      return a && typeof a.id_unique === "string"
        && (a.statut === STATUT_EN_STOCK || a.statut === STATUT_DONNE);
    });
    const mouvementsValides = donnees.historique.every(function (m) {
      return m && typeof m.id_unique === "string"
        && (m.type_mvt === MVT_ENTREE || m.type_mvt === MVT_SORTIE);
    });
    if (!articlesValides || !mouvementsValides) {
      throw new Error("contenu invalide");
    }

    const ok = confirm("Restaurer cette sauvegarde ?\n\n"
      + donnees.stock.length + " article(s) et " + donnees.historique.length + " mouvement(s).\n"
      + "⚠️ Les données actuelles de ce navigateur seront REMPLACÉES.");
    if (!ok) {
      return;
    }

    stock = donnees.stock.map(function (a) { return garderChamps(a, CHAMPS_ARTICLE); });
    historique = donnees.historique.map(function (m) { return garderChamps(m, CHAMPS_MOUVEMENT); });
    enregistrerTout();
    etiquettesSelectionnees.clear();
    rafraichirTout();
    afficherMessage("📂 Base restaurée : " + stock.length + " article(s)", "succes");
  } catch (erreur) {
    console.error(erreur);
    afficherMessage("❌ Fichier de sauvegarde illisible ou invalide.", "erreur");
  }
}


/* ============================================================
   10. DÉMARRAGE DE L'APPLICATION
   Grâce à "defer" dans index.html, ce code s'exécute quand
   toute la page HTML est construite.
   ============================================================ */

function initialiser() {
  // --- Remplissage des listes déroulantes du formulaire d'ajout ---
  remplirSelect($("champ-famille"),
    FAMILLES.map(function (f) { return { valeur: f.code, texte: f.libelle }; }), "— Choisir —");
  remplirSelect($("champ-categorie"),
    CATEGORIES.map(function (c) { return { valeur: c.code, texte: c.libelle }; }), "— Choisir —");
  remplirSelectTailles($("champ-taille"), "— Choisir —");
  remplirSelect($("champ-usage"),
    USAGES.map(function (u) { return { valeur: u, texte: u }; }), "— Choisir —");

  const quantites = [];
  for (let i = 1; i <= 10; i++) {
    quantites.push({ valeur: String(i), texte: String(i) });
  }
  remplirSelect($("champ-quantite"), quantites);

  // --- Remplissage des filtres de l'onglet Stock ---
  remplirSelect($("filtre-categorie"),
    CATEGORIES.map(function (c) { return { valeur: c.libelle, texte: c.libelle }; }), "Toutes les catégories");
  remplirSelectTailles($("filtre-taille"), "Toutes les tailles");
  remplirSelect($("filtre-usage"),
    USAGES.map(function (u) { return { valeur: u, texte: u }; }), "Tous les usages");

  // --- Écouteurs d'événements ("quand on clique sur..., alors...") ---
  document.querySelectorAll(".nav-bouton").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
      afficherOnglet(bouton.dataset.onglet);
    });
  });

  // Onglet 1
  $("btn-camera").addEventListener("click", function () {
    if (cameraActive) {
      arreterCamera();
    } else {
      demarrerCamera();
    }
  });
  $("resultat-scan").addEventListener("click", clicFicheScan);

  // Onglet 2
  $("form-ajout").addEventListener("submit", soumettreFormulaireAjout);
  $("liste-etiquettes").addEventListener("change", clicCaseEtiquette);
  $("btn-tout-cocher").addEventListener("click", function () { cocherToutesEtiquettes(true); });
  $("btn-tout-decocher").addEventListener("click", function () { cocherToutesEtiquettes(false); });
  $("btn-imprimer").addEventListener("click", imprimerPlanche);

  // Onglet 3
  ["filtre-categorie", "filtre-taille", "filtre-usage"].forEach(function (id) {
    $(id).addEventListener("change", afficherStock);
  });
  $("liste-stock").addEventListener("click", clicListeStock);

  // Onglet 4
  $("select-annee").addEventListener("change", afficherHistorique);
  $("btn-export-csv").addEventListener("click", exporterCsv);
  $("btn-sauvegarder").addEventListener("click", sauvegarderJson);
  $("input-restaurer").addEventListener("change", restaurerJson);

  // Après l'impression, on vide la zone d'impression
  window.addEventListener("afterprint", function () {
    $("zone-impression").innerHTML = "";
  });

  // On demande au navigateur de ne pas effacer nos données s'il manque de place
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
  }

  // Premier affichage
  afficherOnglet("onglet-scan");
}

initialiser();
