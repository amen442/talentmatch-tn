// n8n Code node « Normaliser la requête » (Run Once for All Items), placé juste après le Webhook.
// Valide le corps reçu du frontend et prépare les requêtes Tavily (une par élément). Aucun secret ici.
const body = ($input.first().json.body && typeof $input.first().json.body === 'object') ? $input.first().json.body : {};

const DOMAINS = {
  'informatique et developpement logiciel': {
    fr: "société de développement logiciel, applications web et mobiles en Tunisie",
    query: 'software development company, web and mobile app development, software publisher',
    terms: ['software', 'developpement logiciel', 'developpement web', 'developpement mobile', 'application', 'web development', 'mobile app', 'editeur de logiciel', 'saas', 'digital solutions']
  },
  'data science, data analytics et business intelligence': {
    fr: "société data science, business intelligence et data analytics en Tunisie",
    query: 'data science, data analytics and business intelligence company, big data, data engineering services',
    terms: ['data science', 'data analytics', 'business intelligence', 'big data', 'data engineering', 'analyse de donnees', 'informatique decisionnelle', 'data warehouse', 'power bi', 'tableau de bord', 'dashboards', 'machine learning', 'data & ai', 'data and ai', 'analytics']
  },
  'intelligence artificielle et machine learning': {
    fr: "entreprise intelligence artificielle et machine learning en Tunisie",
    query: 'artificial intelligence and machine learning company, AI solutions, computer vision, NLP',
    terms: ['artificial intelligence', 'intelligence artificielle', 'machine learning', 'deep learning', 'generative ai', 'ia generative', 'computer vision', 'nlp', 'ai solutions', 'solutions ia', 'apprentissage automatique']
  },
  'cybersecurite': {
    fr: "société de cybersécurité, audit de sécurité et pentest en Tunisie",
    query: 'cybersecurity company, penetration testing, security audit, SOC managed security services',
    terms: ['cybersecurity', 'cyber security', 'cybersecurite', 'securite informatique', 'information security', 'pentest', 'penetration test', 'test d\'intrusion', 'audit de securite', 'security audit', 'soc', 'siem', 'securite reseau']
  },
  'reseaux, cloud et devops': {
    fr: "entreprise cloud, DevOps, réseaux et infogérance en Tunisie",
    query: 'cloud services, DevOps, network infrastructure and managed IT services company',
    terms: ['cloud', 'devops', 'network', 'reseau', 'infrastructure', 'datacenter', 'data center', 'hebergement', 'hosting', 'infogerance', 'managed services', 'kubernetes']
  },
  'erp, systemes d\'information et consulting': {
    fr: "intégrateur ERP et conseil en systèmes d'information en Tunisie",
    query: 'ERP integrator, information systems and IT consulting company, digital transformation',
    terms: ['erp', 'odoo', 'sap', 'sage', 'systemes d\'information', 'information systems', 'it consulting', 'conseil informatique', 'integration', 'integrateur', 'transformation digitale', 'digital transformation', 'crm']
  },
  'finance, banque et assurance': {
    fr: "banque, assurance et fintech en Tunisie",
    query: 'bank, insurance company, fintech and financial services company',
    terms: ['bank', 'banque', 'bancaire', 'insurance', 'assurance', 'assureur', 'fintech', 'financial services', 'services financiers', 'paiement', 'payment', 'leasing', 'microfinance', 'investissement']
  },
  'marketing digital et communication': {
    fr: "agence de marketing digital et communication en Tunisie",
    query: 'digital marketing agency, communication agency, SEO, social media advertising',
    terms: ['digital marketing', 'marketing digital', 'agence', 'agency', 'communication', 'seo', 'social media', 'reseaux sociaux', 'publicite', 'advertising', 'branding', 'community management']
  },
  'commerce, gestion et ressources humaines': {
    fr: "cabinet de conseil RH, recrutement et gestion d'entreprise en Tunisie",
    query: 'HR consulting, recruitment agency, business management consulting, retail and e-commerce company',
    terms: ['ressources humaines', 'human resources', 'rh', 'hr', 'recrutement', 'recruitment', 'staffing', 'conseil', 'consulting', 'gestion', 'management', 'commerce', 'e-commerce', 'retail', 'distribution']
  },
  'industrie, electronique et ingenierie': {
    fr: "société industrielle, électronique et bureau d'études en ingénierie en Tunisie",
    query: 'industrial manufacturing, electronics and engineering services company',
    terms: ['industrie', 'industrial', 'industriel', 'manufacturing', 'fabrication', 'electronique', 'electronics', 'ingenierie', 'engineering', 'bureau d\'etudes', 'automatisation', 'automation', 'mecanique', 'cablage']
  },
  'telecommunications': {
    fr: "opérateur télécom et fournisseur d'accès internet en Tunisie",
    query: 'telecommunications operator, telecom services, internet service provider, fiber optic',
    terms: ['telecom', 'telecommunication', 'operateur', 'operator', 'fibre', 'fiber', 'internet', 'fournisseur d\'acces', 'isp', 'mobile', '4g', '5g', 'reseau']
  },
  'logistique et supply chain': {
    fr: "société de logistique, transport et transit en Tunisie",
    query: 'logistics company, freight forwarding, transport, warehousing and supply chain services',
    terms: ['logistique', 'logistics', 'supply chain', 'transport', 'freight', 'fret', 'transit', 'entreposage', 'warehouse', 'entrepot', 'distribution', 'shipping', 'douane']
  }
};

const normalize = value => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

if (body.test === true || body.action === 'test') {
  return [{ json: { done: true, response: { success: true, test: true, domain: '', country: 'Tunisia', total: 0, companies: [] } } }];
}

const domain = String(body.domain || '').trim();
if (!domain) {
  return [{ json: { done: true, response: { success: false, error: 'Le domaine de recherche est manquant.', domain: '', country: 'Tunisia', total: 0, companies: [] } } }];
}

const known = DOMAINS[normalize(domain)];
// Domaine ajouté dans Paramètres : on cherche avec son libellé et ses mots significatifs.
const config = known || {
  fr: domain + ' entreprise en Tunisie',
  query: domain + ' company',
  terms: normalize(domain).split(/[^a-z0-9&+'-]+/).filter(word => word.length >= 4)
};

const limit = Math.min(20, Math.max(1, Math.round(Number(body.limit) || 10)));
// Deux recherches (français puis anglais) : la plupart des sites d'entreprises tunisiennes sont en français.
const queries = [config.fr, `${config.query} in Tunisia, official company website`].map(query => query.slice(0, 380));

return queries.map(query => ({
  json: {
    done: false,
    domain,
    country: 'Tunisia',
    limit,
    query,
    terms: config.terms
  }
}));
