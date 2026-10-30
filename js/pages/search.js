(function(){
  const $=id=>document.getElementById(id);
  const directoryHosts=['sortlist.com','clutch.co','goodfirms.co','linkedin.com','yellowpages.com','pagesjaunes.fr','kompass.com'];
  let last=null,found=[],responseData={};

  $('domainSelect').innerHTML=TM_CONFIG.DOMAINS.map(d=>`<option>${U.esc(d)}</option>`).join('');
  // Raccourcis de domaine, synchronisés avec la liste déroulante
  const chipLabel=d=>d.split(/,| et /)[0].trim();
  const paintChips=()=>$('domainChips').querySelectorAll('[data-domain]').forEach(chip=>{const on=chip.dataset.domain===$('domainSelect').value;chip.classList.toggle('active',on);chip.setAttribute('aria-pressed',String(on))});
  $('domainChips').innerHTML=TM_CONFIG.DOMAINS.map(d=>`<button type="button" class="domain-chip" data-domain="${U.esc(d)}" title="${U.esc(d)}">${U.esc(chipLabel(d))}</button>`).join('');
  $('domainChips').onclick=event=>{const chip=event.target.closest('[data-domain]');if(!chip)return;$('domainSelect').value=chip.dataset.domain;paintChips()};
  $('domainSelect').addEventListener('change',paintChips);
  paintChips();
  const skeletons=n=>Array.from({length:n},()=>'<div class="skeleton-card" aria-hidden="true"><div class="sk-row"><span class="sk sk-logo"></span><div style="flex:1;display:grid;gap:9px"><span class="sk sk-title"></span><span class="sk sk-line" style="width:35%"></span></div></div><span class="sk sk-line"></span><span class="sk sk-line" style="width:85%"></span><span class="sk sk-block"></span></div>').join('');
  let stepTimer=null;

  const params=()=>({action:'search_companies',domain:$('domainSelect').value,country:'Tunisia',subdomain:$('sub').value.trim(),city:$('city').value.trim(),keywords:$('kw').value.trim(),opportunityType:$('opp').value,limit:Math.min(20,Math.max(1,+$('limit').value||10))});
  const hostname=url=>{const safe=U.safeUrl(url);if(!safe)return'';try{return new URL(safe).hostname.replace(/^www\./,'').toLowerCase()}catch(e){return''}};
  const domainHostname=value=>hostname(value)||(/^(?:[a-z\d-]+\.)+[a-z]{2,}$/i.test(textValue(value))?hostname('https://'+textValue(value)):'');
  const isDirectory=url=>{const host=domainHostname(url);return directoryHosts.some(directory=>host===directory||host.endsWith('.'+directory))};
  const companyDomain=company=>hostname(company.website);
  const sourceLink=company=>company.sourceUrl||company.sourceURL||company.url||'';
  const jobLink=company=>company.jobsUrl||company.jobUrl||company.careersUrl||company.careerUrl||'';
  const logoLink=company=>company.logoUrl||company.logo_url||company.logoURL||company.logo||company.imageUrl||company.image||'';
  const textValue=value=>typeof value==='string'?value.trim():'';
  const listValue=value=>Array.isArray(value)?value.map(item=>typeof item==='string'?item:(item&&(item.name||item.title))||'').filter(Boolean):typeof value==='string'?value.split(/[,;|]/).map(item=>item.trim()).filter(Boolean):[];
  const specialties=company=>[...new Set(['specialties','skills','expertise','tags'].flatMap(key=>listValue(company[key])))];
  // Seules les pages entreprise LinkedIn sont affichées (jamais un profil /in/ ou une offre /jobs/).
  const linkedinLink=company=>{const url=U.safeUrl(company.linkedinUrl);return url&&/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/company\/[^/?#]+/i.test(url)?url:''};
  const linkedinLabel={Found:'LinkedIn trouvé','Needs verification':'LinkedIn à vérifier','Not found':'LinkedIn introuvable'};
  const linkedinStatus=company=>linkedinLink(company)?(company.linkedinStatus==='Found'?'Found':'Needs verification'):(company.linkedinStatus==='Needs verification'?'Needs verification':'Not found');
  const frCountry=value=>/^tunisia$/i.test(value)?'Tunisie':value;
  const dedupe=list=>{const seen=new Set();return list.filter(company=>{const key=companyDomain(company)||textValue(company.name).toLocaleLowerCase('fr');if(seen.has(key))return false;seen.add(key);return true})};
  const initials=name=>textValue(name).split(/\s+/).filter(Boolean).slice(0,2).map(part=>Array.from(part)[0].toLocaleUpperCase('fr')).join('')||'?';

  function getCompanyLogo(company){
    const logo=logoLink(company);
    const sourceHost=domainHostname(company.sourceDomain);
    const logoHost=hostname(logo);
    const logoIsDirectory=!!logoHost&&(isDirectory(logo)||sourceHost&&logoHost===sourceHost);
    if(U.safeUrl(logo)&&!logoIsDirectory)return U.safeUrl(logo);
    const website=companyDomain(company);
    if(website&&!isDirectory(company.website))return`https://www.google.com/s2/favicons?domain=${encodeURIComponent(website)}&sz=128`;
    return'';
  }

  function scoreValue(company){
    const score=Number(company.relevanceScore);
    if(!Number.isFinite(score))return null;
    return Math.round(Math.max(0,Math.min(100,score<=1?score*100:score)));
  }

  function resultCard(company){
    const companyIndex=found.indexOf(company);
    const name=textValue(company.name)||'Entreprise sans nom';
    const domain=textValue(company.domain)||textValue(responseData.domain)||last.domain;
    const country=frCountry(textValue(company.country));
    const city=textValue(company.city);
    const description=textValue(company.description);
    const officialUrl=U.safeUrl(company.website);
    const jobsUrl=U.safeUrl(jobLink(company));
    const sourceUrl=U.safeUrl(sourceLink(company));
    const tagList=specialties(company);
    const score=scoreValue(company);
    const sourceIsDirectory=isDirectory(sourceLink(company))||isDirectory(company.sourceDomain);
    const logo=getCompanyLogo(company);
    const linkedinUrl=linkedinLink(company);
    const linkedin=linkedinStatus(company);

    return `<article class="search-company-card">
      <header class="search-company-head">
        <div class="company-logo" aria-label="Logo ${U.esc(name)}">
          <span class="company-logo-fallback" aria-hidden="true">${U.esc(initials(name))}</span>
          ${logo?`<img src="${U.esc(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}
        </div>
        <div class="company-heading">
          <h3>${U.esc(name)}</h3>
          ${domain?`<span class="company-domain-badge">${U.esc(domain)}</span>`:''}
          ${city||country?`<p class="company-location">${[city,country].filter(Boolean).map(U.esc).join(', ')}</p>`:''}
        </div>
        ${score!==null?`<span class="relevance-indicator" title="Pertinence de recherche, pas une évaluation de l'entreprise"><span aria-hidden="true">●</span> Pertinence ${score}%</span>`:''}
      </header>
      <div class="search-company-body">
        ${description?`<div><p class="company-description${description.length>220?' is-collapsed':''}" data-description>${U.esc(description)}</p>${description.length>220?'<button class="text-button" data-expand aria-expanded="false">Voir plus</button>':''}</div>`:'<p class="company-description-empty">Aucune description fournie par la recherche.</p>'}
        ${tagList.length?`<div class="company-specialties" aria-label="Spécialités">${tagList.map(tag=>`<span class="specialty-badge">${U.esc(tag)}</span>`).join('')}</div>`:''}
        ${sourceIsDirectory?'<p class="directory-note">Source issue d’un annuaire : les informations de cette fiche restent à vérifier.</p>':''}
        <div class="company-links">
          ${officialUrl?`<span class="company-link-row"><b>Site</b><a href="${U.esc(officialUrl)}" target="_blank" rel="noopener noreferrer">${U.esc(companyDomain(company)||officialUrl)}</a></span>`:''}
          <span class="company-link-row"><b>LinkedIn</b>${linkedinUrl?`<a href="${U.esc(linkedinUrl)}" target="_blank" rel="noopener noreferrer">Page entreprise</a>`:'<span class="muted">Aucune page fiable</span>'}<span class="linkedin-status is-${linkedin==='Found'?'found':linkedin==='Not found'?'missing':'check'}">${U.esc(linkedinLabel[linkedin])}</span></span>
        </div>
        <p class="verification-note">Entreprise issue de la recherche web : vérifiez le site officiel avant validation.</p>
      </div>
      <footer class="search-company-actions">
        ${officialUrl?`<a class="btn primary" href="${U.esc(officialUrl)}" target="_blank" rel="noopener noreferrer">Visiter le site</a>`:''}
        ${linkedinUrl?`<a class="btn" href="${U.esc(linkedinUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`:''}
        <button class="btn" data-details="${companyIndex}">Voir les détails</button>
        ${jobsUrl?`<a class="btn" href="${U.esc(jobsUrl)}" target="_blank" rel="noopener noreferrer">Offres d’emploi</a>`:''}
        <button class="btn save-company" data-save="${companyIndex}">Enregistrer</button>
        ${sourceUrl?`<a class="source-link" href="${U.esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${sourceIsDirectory?'Voir l’annuaire':'Voir la source'}</a>`:textValue(company.sourceDomain)?`<span class="source-link source-domain-label">Source : ${U.esc(company.sourceDomain)}</span>`:''}
      </footer>
    </article>`;
  }

  function renderResults(){
    const query=$('resultsFilter').value.trim().toLocaleLowerCase('fr');
    const filtered=found.filter(company=>!query||[
      company.name,company.domain,company.country,company.city,company.description,...specialties(company)
    ].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query));
    const sort=$('resultsSort').value;
    const sorted=[...filtered];
    if(sort==='name')sorted.sort((a,b)=>textValue(a.name).localeCompare(textValue(b.name),'fr'));
    else sorted.sort((a,b)=>(scoreValue(b)??-1)-(scoreValue(a)??-1));

    $('resultsCount').textContent=`${filtered.length} résultat${filtered.length===1?'':'s'}${query?` sur ${found.length}`:''}`;
    $('res').innerHTML=sorted.map(resultCard).join('');
    if(found.length&&!filtered.length)$('res').innerHTML='<div class="results-empty"><h3>Aucun résultat pour cette recherche</h3><p>Essayez un autre nom, domaine ou mot-clé.</p></div>';
  }

  function showDetails(company){
    const name=textValue(company.name)||'Entreprise sans nom';
    const rows=[
      ['Domaine',company.domain||responseData.domain],
      ['Pays',company.country],
      ['Ville',company.city],
      ['Site officiel',U.safeUrl(company.website)?U.link(company.website,company.website):''],
      ['LinkedIn',linkedinLink(company)?U.link(linkedinLink(company),linkedinLink(company))+` (${U.esc(linkedinLabel[linkedinStatus(company)])})`:U.esc(linkedinLabel[linkedinStatus(company)])],
      ['Offres d’emploi',U.safeUrl(jobLink(company))?U.link(jobLink(company),'Consulter les offres'):''],
      ['Source',U.safeUrl(sourceLink(company))?U.link(sourceLink(company),sourceLink(company)):textValue(company.sourceDomain)||'' ]
    ].filter(([,value])=>value);
    const tags=specialties(company);
    const score=scoreValue(company);
    const modal=U.modal(`<div class="company-detail"><p class="eyebrow">FICHE ENTREPRISE</p><h2>${U.esc(name)}</h2>
      ${score!==null?`<p class="relevance-detail">Pertinence de recherche : ${score}%</p>`:''}
      ${company.description?`<section><h3>Description</h3><p>${U.esc(company.description)}</p></section>`:''}
      ${tags.length?`<section><h3>Spécialités</h3><div class="company-specialties">${tags.map(tag=>`<span class="specialty-badge">${U.esc(tag)}</span>`).join('')}</div></section>`:''}
      ${rows.length?`<section class="company-detail-links">${rows.map(([label,value])=>`<div><b>${U.esc(label)}</b><span>${value}</span></div>`).join('')}</section>`:''}
    </div>`);
    return modal;
  }

  function save(company){
    const result=Companies.save(Companies.fromWeb(company,$('domainSelect').value));
    if(result.error&&!result.dup){U.toast(result.error,'error');return false}
    U.toast(`« ${company.name} » enregistrée.`, 'success');
    return true;
  }

  async function go(payload){
    $('state').innerHTML='<div class="search-loading"><span class="loading-spinner" aria-hidden="true"></span><div><b>Recherche en cours</b><span>Recherche des entreprises tunisiennes du domaine, puis de leur page LinkedIn. Cela prend en général 15 à 30 secondes.</span><div class="search-steps" id="searchSteps"><span class="active">Recherche web</span><span>Filtrage des résultats</span><span>Pages LinkedIn</span></div></div></div>';
    $('res').innerHTML=skeletons(Math.min(4,payload.limit||4));
    $('resultsHeader').hidden=true;
    $('srcs').innerHTML='';
    [$('go'),$('refresh')].forEach(button=>button.disabled=true);
    // Progression indicative : les étapes réelles se déroulent dans n8n.
    let step=0;clearInterval(stepTimer);
    stepTimer=setInterval(()=>{const steps=document.querySelectorAll('#searchSteps span');if(!steps.length||step>=steps.length-1)return clearInterval(stepTimer);steps[step].className='done';step++;steps[step].className='active'},5000);
    const result=await N8N.call('search',payload);
    clearInterval(stepTimer);
    [$('go'),$('refresh')].forEach(button=>button.disabled=false);

    if(!result.ok){
      $('res').innerHTML='';
      U.logError('search',result.error);
      $('state').innerHTML=`<div class="search-error"><b>Impossible de charger les résultats</b><p>${U.esc(result.error)}</p><span>Vérifiez que le webhook n8n est actif, puis réessayez.</span></div>`;
      return;
    }

    last=payload;
    responseData=result.data;
    found=dedupe((Array.isArray(result.data.companies)?result.data.companies:[]).filter(company=>company&&typeof company==='object'&&textValue(company.name)));
    const resultDomain=textValue(result.data.domain)||payload.domain;
    Companies.saveWeb(found.map(company=>Companies.fromWeb(company,resultDomain)));
    const resultCountry=frCountry(textValue(result.data.country)||payload.country);
    $('resultsTitle').textContent=`Entreprises en ${resultDomain} en ${resultCountry}`;
    $('resultsSummary').textContent=`Résultats de recherche dans le domaine « ${resultDomain} »${resultCountry?` en ${resultCountry}`:''}. La pertinence indique la correspondance avec la recherche, pas la qualité de l’entreprise.`;
    $('resultsFilter').value='';
    $('resultsHeader').hidden=false;
    $('sortWrap').hidden=!found.some(company=>scoreValue(company)!==null);
    $('resultsSort').value='relevance';
    $('state').innerHTML='';

    Store.add('searches',{id:'S-'+Date.now(),domain:resultDomain,params:payload,count:found.length,searchedAt:result.searchedAt||new Date().toISOString(),sources:result.data.sources||[]});
    renderResults();
    if(!found.length)$('res').innerHTML='<div class="results-empty"><span class="empty-mark" aria-hidden="true">0</span><h3>Aucune entreprise trouvée</h3><p>Aucun résultat ne correspond à ce domaine pour le moment. Vous pouvez modifier vos critères et relancer la recherche.</p></div>';
    $('srcs').innerHTML=(Array.isArray(result.data.sources)?result.data.sources:[]).map(source=>{
      const url=typeof source==='string'?source:source.url;
      const title=typeof source==='string'?source:source.title||source.url;
      return U.safeUrl(url)?U.link(url,title):'';
    }).filter(Boolean).join(' · ');
  }

  $('res').onclick=event=>{
    const details=event.target.closest('[data-details]');
    const saveButton=event.target.closest('[data-save]');
    const expand=event.target.closest('[data-expand]');
    if(details)showDetails(found[+details.dataset.details]);
    if(saveButton&&save(found[+saveButton.dataset.save])){saveButton.classList.add('saved');saveButton.textContent='Enregistrée ✓';saveButton.disabled=true}
    if(expand){
      const description=expand.parentElement.querySelector('[data-description]');
      const expanded=expand.getAttribute('aria-expanded')==='true';
      description.classList.toggle('is-collapsed',expanded);
      expand.setAttribute('aria-expanded',String(!expanded));
      expand.textContent=expanded?'Voir plus':'Voir moins';
    }
  };
  $('resultsFilter').oninput=renderResults;
  $('resultsSort').onchange=renderResults;
  $('go').onclick=()=>go(params());
  $('refresh').onclick=()=>last?go(last):U.toast('Lancez d’abord une recherche.','error');
  $('matchAll').onclick=()=>{
    if(!found.length)return U.toast('Aucune entreprise à comparer.','error');
    found.forEach(save);
    location.href='matching.html?domain='+encodeURIComponent($('domainSelect').value);
  };
})();
