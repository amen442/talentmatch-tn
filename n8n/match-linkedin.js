// n8n Code node « Associer LinkedIn » (Run Once for All Items), placé après « Recherche LinkedIn (Tavily) ».
// Le nœud HTTP Request ne renvoie que la réponse Tavily : chaque réponse est rattachée à son entreprise
// via pairedItem (même index que « Filtrer les entreprises »), puis les champs d'origine sont recopiés.
// Seules les pages linkedin.com/company/ sont acceptées ; aucun accès direct à LinkedIn n'est fait.
const params = $('Normaliser la requête').first().json;
const companies = $('Filtrer les entreprises').all().map(item => item.json);
const responses = $input.all();

const normalize = value => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘`]/g, "'").toLowerCase();
const compact = value => normalize(value).replace(/[^a-z0-9]/g, '');
const words = value => normalize(value).split(/[^a-z0-9]+/).filter(word => word.length >= 2 && !STOP_WORDS.has(word));
const STOP_WORDS = new Set(['the', 'and', 'et', 'de', 'des', 'du', 'la', 'le', 'les', 'sa', 'sarl', 'suarl', 'group', 'groupe', 'company', 'tunisia', 'tunisie', 'linkedin']);
// /company/<slug> uniquement ; /in/ (profils), /jobs/, /posts/, /pulse/, /school/, /showcase/ sont rejetés.
const COMPANY_URL = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/company\/([^/?#]+)(\/[^?#]*)?/i;
const REJECTED_SUBPATH = /^\/(jobs|posts|events)(\/|$)/i;

function pagesFor(response) {
  const results = Array.isArray(response && response.results) ? response.results : [];
  const pages = [];
  for (const result of results) {
    const match = COMPANY_URL.exec(String(result.url || ''));
    if (!match) continue;
    if (REJECTED_SUBPATH.test(match[2] || '')) continue;
    const slug = decodeURIComponent(match[1]).toLowerCase();
    pages.push({
      url: `https://www.linkedin.com/company/${encodeURIComponent(slug)}/`,
      slug,
      // Titres LinkedIn : « Acme | LinkedIn », « Acme: Overview | LinkedIn »
      title: String(result.title || '').split(/\s*[|:]\s*/)[0].trim(),
      text: normalize(`${result.title || ''} ${result.content || ''}`)
    });
  }
  return pages;
}

function matchScore(company, page) {
  const name = compact(company.name);
  const brand = compact(company.siteKey.split('.')[0]);
  const slug = compact(page.slug);
  const title = compact(page.title);
  let score = 0;
  // Le site officiel cité sur la page LinkedIn est l'indice le plus fiable.
  if (page.text.includes(company.siteKey)) score += 3;
  if (title && (title === name || title === brand)) score += 2;
  else if (slug === name || slug === brand) score += 2;
  else if (brand.length >= 4 && (slug.startsWith(brand) || title.startsWith(brand))) score += 1;
  const nameWords = words(company.name);
  const pageWords = new Set(words(page.title + ' ' + page.slug.replace(/-/g, ' ')));
  if (nameWords.length) {
    const overlap = nameWords.filter(word => pageWords.has(word)).length / nameWords.length;
    if (overlap >= 0.6) score += 1;
  }
  if (/\b(tunisia|tunisie|tunis|sfax|sousse|ariana)\b/.test(page.text)) score += 0.5;
  return score;
}

const results = companies.map(company => ({
  ...company,
  linkedinUrl: null,
  linkedinStatus: 'Not found',
  linkedinScore: 0
}));

responses.forEach((item, index) => {
  const paired = Array.isArray(item.pairedItem) ? item.pairedItem[0] : item.pairedItem;
  const target = results[paired && Number.isInteger(paired.item) ? paired.item : index];
  if (!target) return;
  if (item.json && item.json.error) {
    target.linkedinStatus = 'Needs verification';
    target.linkedinError = 'Recherche LinkedIn impossible pour cette entreprise.';
    return;
  }
  const best = pagesFor(item.json)
    .map(page => ({ page, score: matchScore(target, page) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 1.5) return;
  target.linkedinUrl = best.page.url;
  // Un sigle court (« ANCS ») peut désigner plusieurs organisations : sans le site officiel sur la page LinkedIn,
  // la correspondance reste à vérifier.
  const websiteCited = best.page.text.includes(target.siteKey);
  const reliable = websiteCited || (best.score >= 3 && compact(target.name).length >= 6);
  target.linkedinStatus = reliable ? 'Found' : 'Needs verification';
  target.linkedinScore = best.score;
});

// Une même page LinkedIn ne peut appartenir qu'à une entreprise : on la laisse à la meilleure correspondance.
const owner = new Map();
for (const company of results) {
  if (!company.linkedinUrl) continue;
  const current = owner.get(company.linkedinUrl);
  if (!current || company.linkedinScore > current.linkedinScore) owner.set(company.linkedinUrl, company);
}
for (const company of results) {
  if (company.linkedinUrl && owner.get(company.linkedinUrl) !== company) {
    company.linkedinUrl = null;
    company.linkedinStatus = 'Needs verification';
  }
}

const output = results.map(({ done, siteKey, linkedinScore, ...company }) => ({
  ...company,
  verificationStatus: 'Needs verification'
}));

return [{
  json: {
    done: true,
    response: {
      success: true,
      domain: params.domain,
      country: params.country,
      total: output.length,
      companies: output
    }
  }
}];
