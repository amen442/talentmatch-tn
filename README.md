# TalentMatch TN — Étape 1
Lancer : VS Code > Live Server sur `index.html` (port 5500). n8n : http://localhost:5678.
## Organisation
- `index.html` : tableau de bord
- `pages/` : pages Étudiants, Entreprises, Recherche, Matching, Historique et Paramètres
- `js/` : logique commune et configuration; `js/pages/` et `js/services/` : scripts des pages et services
- `css/` : feuilles de style; `data/` : fichiers d'exemple
## Fonctionne maintenant
Dashboard calculé depuis localStorage, mode démo/connecté, indicateur n8n, service `N8N.call()` (timeout, JSON, validation du contrat).
## Nécessite n8n (étapes suivantes)
Import et matching : renseigner les Webhooks dans `js/config.js`. La recherche d'entreprises utilise par défaut `http://localhost:5678/webhook/search-companies` (modifiable dans Paramètres).
## CORS n8n (Windows, PowerShell, avant de lancer n8n)
`$env:N8N_CORS_ALLOWED_ORIGINS="http://127.0.0.1:5500,http://localhost:5500"` puis `n8n start`.
Alternative : option « Allowed Origins (CORS) » du nœud Webhook = `http://127.0.0.1:5500`. Répondre en JSON via « Respond to Webhook ».

## Recherche d'entreprises (workflow n8n « TalentMatch TN »)
La recherche se fait en deux temps : d'abord le web (sans LinkedIn) pour trouver de vraies entreprises tunisiennes du domaine, puis une recherche Tavily limitée à `linkedin.com` pour retrouver la page entreprise de chacune. Aucune entreprise n'est inventée et LinkedIn n'est jamais interrogé directement.

### Chaîne de nœuds
1. **Webhook** — `POST /webhook/search-companies`, réponse via **Respond to Webhook**.
2. **Normaliser la requête** (Code, [`n8n/normalize-request.js`](./n8n/normalize-request.js)) — valide `domain`, borne `limit` à 1–20, associe chacun des 12 domaines à deux requêtes (français, anglais — la plupart des sites tunisiens sont en français) et à des mots-clés ; un élément par requête. Un appel `{"action":"test"}` (bouton Tester de Paramètres) répond tout de suite sans appeler Tavily.
3. **Réponse immédiate ?** (IF sur `done`) — test ou domaine manquant → réponse directe.
4. **Recherche entreprises (Tavily)** — une recherche web `advanced` par requête, `country: tunisia`, `exclude_domains` (LinkedIn, réseaux sociaux, annuaires, sites d'emploi, freelance, formation, publications).
5. **Filtrer les entreprises** (Code, [`n8n/search-companies-filter.js`](./n8n/search-companies-filter.js)) — fusionne les deux réponses puis écarte définitivement les annuaires et bases d'entreprises, profils freelance, offres d'emploi, écoles et diplômes, formations, presse et organismes publics (rejet strict, jamais une entreprise). Les critères de pertinence (hors domaine, aucun indice d'activité commerciale, site non `.tn` sans ville tunisienne ni numéro +216) sont eux appliqués en repli : si aucun résultat ne les satisfait, le filtre retombe sur les meilleurs résultats qui ont seulement passé le rejet strict (`relaxedMatch: true`) plutôt que de renvoyer une liste vide — pour garantir au moins une entreprise par domaine quand Tavily a trouvé quelque chose d'exploitable (utile notamment pour le workflow de matching, qui réutilise ce filtre et ne doit pas se retrouver sans aucune entreprise à comparer au CV). Déduplique par site et par nom ; renvoie un élément par entreprise.
6. **Aucune entreprise ?** (IF sur `done`) — liste vide ou erreur Tavily → réponse directe.
7. **Recherche LinkedIn (Tavily)** — une recherche par entreprise, `include_domains: ["linkedin.com"]`, par lots de 5.
8. **Associer LinkedIn** (Code, [`n8n/match-linkedin.js`](./n8n/match-linkedin.js)) — le nœud HTTP ne renvoie que la réponse Tavily : chaque réponse est rattachée à son entreprise via `pairedItem`, et les champs d'origine (nom, site, description, domaine, pays, score) sont recopiés. Seules les URL `linkedin.com/company/…` sont acceptées (profils `/in/` et offres `/jobs/` rejetés).
9. **Respond to Webhook** — renvoie `{{ $json.response }}`.

Les fichiers de `n8n/` sont la copie de référence du code des nœuds Code : après modification, recopiez-les dans le nœud correspondant.

### Clé Tavily (obligatoire)
La clé n'est ni dans le frontend ni dans le workflow : elle est stockée dans un credential n8n.
1. Créez une **nouvelle** clé sur https://app.tavily.com et révoquez l'ancienne (elle a été exposée dans une ancienne version du workflow).
2. Dans n8n : **Credentials → Add credential → Bearer Auth**, nom `Tavily API`, *Bearer Token* = la nouvelle clé.
3. Sélectionnez ce credential dans les nœuds **Recherche entreprises (Tavily)** et **Recherche LinkedIn (Tavily)**, enregistrez, puis publiez le workflow.

### Réponse du webhook
```json
{
  "success": true,
  "domain": "Cybersécurité",
  "country": "Tunisia",
  "total": 1,
  "companies": [
    {
      "id": 1,
      "name": "…",
      "website": "https://…/",
      "sourceUrl": "https://…/services",
      "description": "…",
      "relevanceScore": 0.81,
      "domain": "Cybersécurité",
      "country": "Tunisia",
      "linkedinUrl": "https://www.linkedin.com/company/…/",
      "linkedinStatus": "Found",
      "verificationStatus": "Needs verification"
    }
  ]
}
```
`linkedinStatus` : `Found` (site officiel cité sur la page LinkedIn, ou nom identique), `Needs verification` (correspondance partielle ou recherche échouée), `Not found` (`linkedinUrl: null`). `verificationStatus` reste toujours `Needs verification` : une entreprise issue du web n'est jamais considérée comme vérifiée. En cas d'erreur Tavily, la réponse est `success: false` avec un champ `error`, affiché tel quel par la page Recherche.

### Vérifier
1. Depuis la page Recherche, lancez Cybersécurité puis Data Science ; dans l'exécution n8n, le POST doit contenir `action: "search_companies"`, `domain`, `country`, `limit`.
2. Le nœud **Filtrer les entreprises** liste dans `rejected` (cas vide) les URL écartées et la raison, utile pour ajuster les mots-clés.
3. Le filtre reste heuristique : vérifiez chaque site et chaque page LinkedIn avant de valider une entreprise.
