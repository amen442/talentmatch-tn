// Configuration centrale. Les Webhooks métier doivent être créés dans n8n.
// Renseignez-les ici ou dans la page Paramètres (stockés en localStorage). Aucun secret ici.
window.TM_CONFIG = {
  N8N_BASE_URL: 'http://localhost:5678',
  STUDENTS_IMPORT_WEBHOOK: '',   // ex. /webhook/<votre-chemin> (à créer dans n8n)
  COMPANY_SEARCH_WEBHOOK: 'http://localhost:5678/webhook/search-companies',
  MATCHING_WEBHOOK: 'http://localhost:5678/webhook/match-student',
  MATCH_TIMEOUT_MS: 300000,      // lecture du CV + recherche entreprises + classement par l'IA locale
  HEALTHCHECK_WEBHOOK: '',
  TIMEOUT_MS: 30000,
  SEARCH_TIMEOUT_MS: 90000,      // recherche entreprises + une recherche LinkedIn par entreprise
  DOMAINS: ['Informatique et développement logiciel','Data Science, Data Analytics et Business Intelligence','Intelligence artificielle et Machine Learning','Cybersécurité','Réseaux, Cloud et DevOps','ERP, systèmes d\'information et consulting','Finance, banque et assurance','Marketing digital et communication','Commerce, gestion et ressources humaines','Industrie, électronique et ingénierie','Télécommunications','Logistique et supply chain']
};
(function(){try{Object.assign(TM_CONFIG,JSON.parse(localStorage.getItem('tm_config')||'{}'))}catch(e){}if(!TM_CONFIG.COMPANY_SEARCH_WEBHOOK)TM_CONFIG.COMPANY_SEARCH_WEBHOOK='http://localhost:5678/webhook/search-companies';if(!TM_CONFIG.MATCHING_WEBHOOK)TM_CONFIG.MATCHING_WEBHOOK='http://localhost:5678/webhook/match-student'})();
