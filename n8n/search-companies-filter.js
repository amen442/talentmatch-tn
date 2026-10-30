// n8n Code node « Filtrer les entreprises » (Run Once for All Items), placé après « Recherche entreprises (Tavily) ».
// Le nœud HTTP Request remplace les données reçues par la réponse Tavily : les paramètres de recherche
// sont donc relus depuis « Normaliser la requête ». Ce nœud ne crée aucune entreprise : il garde ou écarte
// les résultats Tavily, puis renvoie un élément par entreprise pour la recherche LinkedIn.
const params = $('Normaliser la requête').first().json;
// Une réponse Tavily par requête (français, anglais) : on fusionne leurs résultats.
const responses = $input.all().map(item => item.json || {});
const { domain, country, limit } = params;

const emptyResponse = extra => [{ json: { done: true, response: { success: true, domain, country, total: 0, companies: [], ...extra } } }];

const failed = responses.filter(response => response.error);
if (failed.length === responses.length) {
  const error = failed[0] && failed[0].error;
  const message = typeof error === 'string' ? error : ((error && error.message) || 'erreur inconnue');
  return [{ json: { done: true, response: { success: false, error: 'Recherche Tavily impossible : ' + message, domain, country, total: 0, companies: [] } } }];
}
const results = responses.flatMap(response => Array.isArray(response.results) ? response.results : []);
if (!results.length) return emptyResponse({ message: 'Aucun résultat Tavily pour ce domaine.' });

const normalize = value => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘`]/g, "'").toLowerCase();
const clean = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, words, plural = false) => words.some(word => new RegExp(`(^|[^a-z0-9])${escapeRegex(normalize(word))}${plural ? 's?' : ''}([^a-z0-9]|$)`).test(text));

// Annuaires, réseaux sociaux, plateformes d'emploi/freelance, formation, édition : jamais une entreprise.
const EXCLUDED_HOSTS = [
  'linkedin.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'youtube.com', 'x.com', 'twitter.com', 'wikipedia.org', 'google.com',
  'clutch.co', 'goodfirms.co', 'sortlist.com', 'sortlist.fr', 'themanifest.com', 'techbehemoths.com', 'designrush.com', 'tracxn.com',
  'crunchbase.com', 'f6s.com', 'cbinsights.com', 'zoominfo.com', 'rocketreach.co', 'apollo.io', 'dnb.com', 'kompass.com', 'europages.com',
  'pagesjaunes.tn', 'pagesjaunes.fr', 'yellowpages.com', 'goafricaonline.com', 'tunisieindustrie.nat.tn', 'annuaire-entreprises.tn',
  'glassdoor.com', 'indeed.com', 'tanitjobs.com', 'keejob.com', 'optioncarriere.tn', 'emploi.nat.tn', 'bayt.com', 'welcometothejungle.com', 'jobi.tn', 'farojob.net',
  'tunisiefreelance.tn', 'malt.fr', 'upwork.com', 'fiverr.com', 'freelancer.com',
  'coursera.org', 'udemy.com', 'edx.org', 'learnersink.com', 'simplilearn.com', 'datacamp.com',
  'frontiersin.org', 'researchgate.net', 'sciencedirect.com', 'springer.com', 'mdpi.com', 'medium.com', 'scribd.com', 'slideshare.net',
  'cybersecurityintelligence.com', 'revenuebase.ai', 'owler.com', 'craft.co', 'lusha.com', 'growjo.com', 'datanyze.com', 'leadiq.com',
  'tunisienumerique.com', 'businessnews.com.tn', 'webdo.tn', 'kapitalis.com', 'lapresse.tn', 'leaders.com.tn', 'ilboursa.com', 'webmanagercenter.com',
  'realites.com.tn', 'mosaiquefm.net', 'espacemanager.com', 'tap.info.tn', 'africanmanager.com', 'managers.tn', 'gnet.tn', 'tekiano.com',
  'universite.tn', 'rnu.tn', 'ac.tn', 'edu', 'gov.tn'
];
const EXCLUDED_PATH = /\/(blog|news|actualites?|articles?|journals?|press|jobs?|careers?|carrieres?|emplois?|offres?-d-emploi|recrutement|candidat\w*|directory|annuaire|rankings?|classements?|top-\d+|compare|courses?|formations?|training|certification\w*|events?|evenements?|tag|category|browse|companies|(?:masters?|masteres?|licences?|programmes?|fiche-metier|degrees?)[\w-]*)(\/|$|\.html?)/i;
const EXCLUDED_TITLE = [
  'universite', 'university', 'faculte', 'faculty', 'school', 'ecole', 'institut', 'institute', 'campus', 'etudiant', 'student',
  'formation', 'training', 'course', 'cours', 'certification', 'bootcamp', 'tutorial', 'tutoriel', 'masterclass',
  'freelance', 'freelancer', 'profile', 'profil', 'cv', 'resume',
  'job', 'jobs', 'emploi', 'offre d\'emploi', 'offres d\'emploi', 'recrute', 'hiring', 'career', 'careers', 'stage',
  'master', 'mastere', 'licence', 'bachelor', 'degree', 'msc', 'mba', 'diplome', 'admission', 'fiche metier',
  'directory', 'annuaire', 'ranking', 'classement', 'top companies', 'best companies', 'list of', 'liste des', 'liste d\'entreprises',
  'alternatives', 'competitors', 'concurrents', 'comparatif', 'comparison',
  'article', 'blog', 'news', 'actualite', 'journal', 'thesis', 'memoire', 'pdf', 'webinar', 'podcast'
];
// « Top 75 Data Mining Companies in Tunisia », « Les meilleures agences digitales »…
const TOP_LIST_TITLE = /\b(top|best|meilleur\w*|\d+)\s+(?:[\w&-]+\s+){0,4}(companies|entreprises|societes|agencies|agences|startups|firms|providers|prestataires)\b/;
// Pages d'écoles : plusieurs termes pédagogiques dans le titre ou l'extrait (un menu « Formations » seul ne suffit pas).
const EDUCATION_TERMS = ['master', 'mastere', 'licence', 'bachelor', 'diplome', 'admission', 'cursus', 'etudiant', 'universite', 'university', 'bac+3', 'bac+5', 'semestre', 'inscription', 'programme', 'formation', 'bootcamp'];
const BUSINESS_EVIDENCE = ['services', 'service', 'solutions', 'solution', 'products', 'produits', 'clients', 'customers', 'company', 'entreprise', 'societe', 'agency', 'agence', 'consulting', 'cabinet', 'expert', 'expertise', 'we help', 'we provide', 'our team', 'notre equipe', 'nous accompagnons', 'nous proposons', 'contactez-nous', 'contact us', 'devis', 'partenaire', 'partner', 'leader', 'sarl', 'suarl'];
// Hors .tn, le seul mot « Tunisia » ne suffit pas (listes de pays des sites internationaux) :
// il faut une ville, un quartier d'affaires ou un numéro +216.
const TUNISIA_EVIDENCE = ['tunis', 'ariana', 'sfax', 'sousse', 'monastir', 'nabeul', 'bizerte', 'ben arous', 'manouba', 'lac 1', 'lac 2', 'les berges du lac', 'charguia', 'el ghazala', 'mahdia', 'gabes', 'kairouan', '+216'];
const GENERIC_SEGMENTS = new Set(['home', 'accueil', 'homepage', 'welcome', 'bienvenue', 'about', 'about us', 'a propos', 'qui sommes-nous', 'services', 'nos services', 'solutions', 'contact', 'page d\'accueil', 'site officiel', 'official website']);
const SECOND_LEVEL = new Set(['com', 'net', 'org', 'gov', 'edu', 'ens', 'nat', 'ind', 'info', 'co']);

// Le bac à sable du nœud Code n'expose pas toujours la classe URL : analyse par expression régulière.
function parseUrl(value) {
  const match = /^(https?):\/\/([^/?#\s:@]+)(?::\d+)?([^?#\s]*)?(\?[^#\s]*)?/i.exec(String(value || '').trim());
  if (!match) return null;
  const origin = `${match[1].toLowerCase()}://${match[2].toLowerCase()}`;
  return { href: String(value).trim(), origin, hostname: match[2].toLowerCase(), pathname: match[3] || '/' };
}
function siteKey(host) {
  // acme.com.tn → acme.com.tn ; blog.acme.tn → acme.tn
  const labels = host.split('.');
  const keep = labels.length >= 3 && SECOND_LEVEL.has(labels[labels.length - 2]) ? 3 : 2;
  return labels.slice(-keep).join('.');
}
const brandOf = key => key.split('.')[0];
const compact = value => normalize(value).replace(/[^a-z0-9]/g, '');
const titleCase = value => value.split(/[-_]+/).filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join(' ');

function companyName(title, brand) {
  const segments = clean(title).split(/\s+[|–—:·•]\s+|\s+-\s+/).map(segment => segment.trim()).filter(Boolean);
  const brandCompact = compact(brand);
  const byBrand = segments.find(segment => {
    const value = compact(segment);
    return value.length >= 3 && brandCompact.length >= 3 && (value.includes(brandCompact) || brandCompact.includes(value)) && segment.split(/\s+/).length <= 6;
  });
  if (byBrand) return byBrand;
  const named = segments.find(segment => !GENERIC_SEGMENTS.has(normalize(segment)) && segment.split(/\s+/).length <= 5);
  return named || titleCase(brand);
}

// Rejets définitifs : la page n'est jamais une entreprise, quel que soit le domaine recherché.
function hardRejectReason(result, url, host) {
  if (EXCLUDED_HOSTS.some(excluded => host === excluded || host.endsWith('.' + excluded))) return 'annuaire, réseau social, plateforme ou établissement';
  if (/\.pdf$/i.test(url.pathname)) return 'document PDF';
  if (EXCLUDED_PATH.test(url.pathname)) return 'page d’article, d’emploi, de formation ou d’annuaire';
  if (/freelanc/i.test(host + url.pathname)) return 'plateforme de freelances';
  const title = normalize(clean(result.title));
  if (hasWord(title, EXCLUDED_TITLE, true) || TOP_LIST_TITLE.test(title)) return 'titre d’article, de liste, de formation ou d’emploi';
  const snippet = normalize(`${clean(result.title)} ${clean(result.content)}`);
  if (EDUCATION_TERMS.filter(term => hasWord(snippet, [term], true)).length >= 2) return 'contenu d’école ou de formation';
  if (hasWord(snippet, ['republique tunisienne'])) return 'organisme public';
  if (/\b(lire aussi|sujets connexes)\b/.test(snippet)) return 'article de presse';
  return '';
}

// Rejets heuristiques (pertinence domaine/géo) : utiles pour classer, mais trop stricts pour garantir
// un résultat sur chaque domaine. Servent de repli si le filtre strict ne retient rien (voir plus bas) :
// on préfère une entreprise réelle mais mal classée à aucune entreprise.
function softRejectReason(result, url, host) {
  const text = normalize(`${clean(result.title)} ${clean(result.content)} ${clean(result.raw_content).slice(0, 15000)}`);
  if (!hasWord(text, params.terms || [])) return 'activité non liée au domaine sélectionné';
  if (!hasWord(text, BUSINESS_EVIDENCE)) return 'aucun indice d’activité commerciale';
  if (!host.endsWith('.tn')) {
    if (!hasWord(text, TUNISIA_EVIDENCE)) return 'aucun indice de présence en Tunisie';
    // Page « services à Tunis » d'une société étrangère : sans numéro +216, ce n'est pas une entreprise locale.
    if (/tunis/i.test(url.pathname) && !text.includes('+216') && !/\(\+?216\)/.test(text)) return 'page de ciblage géographique d’une société étrangère';
  }
  return '';
}

const byKey = new Map(), fallbackByKey = new Map();
const rejected = [];
for (const result of results) {
  if (!result || typeof result !== 'object') continue;
  const url = parseUrl(result.url);
  if (!url) continue;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const hardReason = hardRejectReason(result, url, host);
  if (hardReason) {
    rejected.push({ url: url.href, reason: hardReason });
    continue;
  }
  const key = siteKey(host);
  const score = Number.isFinite(Number(result.score)) ? Math.max(0, Math.min(1, Number(result.score))) : null;
  const softReason = softRejectReason(result, url, host);
  const bucket = softReason ? fallbackByKey : byKey;
  const current = bucket.get(key);
  if (current && (current.relevanceScore ?? -1) >= (score ?? -1)) continue;
  // Un titre réduit au nom du domaine (« cybersécurité ») n'est pas un nom d'entreprise : on prend la marque du site.
  let name = companyName(result.title, brandOf(key));
  if ((params.terms || []).some(term => compact(term) === compact(name)) || compact(name) === compact(domain)) name = titleCase(brandOf(key));
  bucket.set(key, {
    name,
    website: url.origin + '/',
    sourceUrl: url.href,
    description: clean(result.content).slice(0, 600),
    relevanceScore: score,
    domain,
    country,
    siteKey: key
  });
  if (softReason) rejected.push({ url: url.href, reason: softReason, relaxable: true });
}

// Deux sites différents portant le même nom : on garde le mieux classé.
function finalize(map) {
  const seenNames = new Set();
  return [...map.values()]
    .sort((a, b) => (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1))
    .filter(company => {
      const name = compact(company.name);
      if (seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    })
    .slice(0, limit);
}

let companies = finalize(byKey), relaxed = false;
// Le filtre strict n'a rien gardé : mieux vaut une entreprise réelle mal classée que zéro résultat
// (ex. matching), donc on retombe sur les candidats écartés seulement par les heuristiques de pertinence.
if (!companies.length && fallbackByKey.size) {
  companies = finalize(fallbackByKey);
  relaxed = true;
}

if (!companies.length) return emptyResponse({ rawTotal: results.length, rejected, message: 'Aucune entreprise retenue après filtrage.' });
return companies.map((company, index) => ({ json: { done: false, id: index + 1, relaxedMatch: relaxed, ...company } }));
