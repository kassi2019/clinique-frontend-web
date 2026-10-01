// Valeurs saisies des fiches d'échographie : encadrées en gras et dans une
// police différente à l'affichage/impression (comme écrites à la main sur la
// fiche papier). Utilisé par l'aperçu A4 (ImagerieView) et les résultats
// visibles par le médecin (ConsultationView).

const CAR = '0-9A-Za-zÀ-ÖØ-öø-ÿ';

/** Échappe une chaîne pour l'utiliser dans une RegExp littérale. */
function echapperRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remplace dans le texte les occurrences « autonomes » de chaque valeur
 * (non collées à une lettre ou un chiffre : « 7 » dans « → 7 SA » oui,
 * « 20 » dans « 2026 » non) par un jeton unique.
 */
function appliquerJetons(texte, valeurs) {
  const vals = [];
  try {
    const v = typeof valeurs === 'string' ? JSON.parse(valeurs) : valeurs;
    if (v && typeof v === 'object') {
      for (const x of Object.values(v)) {
        const s = x != null ? String(x).trim() : '';
        if (s.length >= 1) vals.push(s);
      }
    }
  } catch {
    return { texte: texte ?? '', marqueurs: [] };
  }
  // Tri par longueur décroissante pour éviter les chevauchements de valeurs
  vals.sort((a, b) => b.length - a.length);
  const marqueurs = [];
  let texte2 = texte ?? '';
  vals.forEach((val, i) => {
    if (!texte2.includes(val)) return;
    const token = `\u0000V${i}\u0000`;
    // Garde : la valeur doit être entourée de caractères non alphanumériques
    const regex = new RegExp(
      `(^|[^${CAR}])(${echapperRegex(val)})(?![${CAR}])`,
      'g',
    );
    let trouve = false;
    texte2 = texte2.replace(regex, (tout, avant) => {
      trouve = true;
      return avant + token;
    });
    if (trouve) marqueurs.push({ token, val });
  });
  return { texte: texte2, marqueurs };
}

/**
 * Retourne le texte de la fiche en HTML : chaque valeur saisie (valeurs JSON
 * enregistrées avec la fiche) est encadrée par <b class="val">…</b>.
 */
export function marquerValeurs(texte, valeurs) {
  const { texte: t, marqueurs } = appliquerJetons(texte, valeurs);
  let html = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const m of marqueurs) {
    const esc = m.val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.split(m.token).join(`<b class="val">${esc}</b>`);
  }
  return html;
}

/**
 * Variante « segments » (React Native) : renvoie [{ t, val }] où val = true
 * pour les valeurs saisies (à rendre en gras).
 */
export function decouperValeurs(texte, valeurs) {
  const { texte: t, marqueurs } = appliquerJetons(texte, valeurs);
  const segments = [];
  let reste = t;
  while (reste.length) {
    let prochain = -1;
    let prochainToken = null;
    for (const m of marqueurs) {
      const idx = reste.indexOf(m.token);
      if (idx !== -1 && (prochain === -1 || idx < prochain)) {
        prochain = idx;
        prochainToken = m;
      }
    }
    if (prochain === -1) {
      segments.push({ t: reste, val: false });
      break;
    }
    if (prochain > 0) segments.push({ t: reste.slice(0, prochain), val: false });
    segments.push({ t: prochainToken.val, val: true });
    reste = reste.slice(prochain + prochainToken.token.length);
  }
  return segments;
}
