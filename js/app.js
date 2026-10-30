// Coquille commune : navigation, thème, mode, indicateur n8n.
(function(){
  const root=document.body.dataset.root===undefined?'../':document.body.dataset.root,page=document.body.dataset.page;
  const icon=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I={
    dashboard:icon('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    students:icon('<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'),
    companies:icon('<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 13v.01M9 17v.01"/>'),
    search:icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    matching:icon('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'),
    history:icon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
    settings:icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
    sun:icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon:icon('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>')
  };
  const sections=[
    ['Pilotage',[['dashboard','Dashboard','index.html']]],
    ['Données',[['students','Étudiants','pages/students.html'],['companies','Entreprises','pages/companies.html'],['search','Recherche entreprises','pages/search.html']]],
    ['Analyse',[['matching','Matching','pages/matching.html'],['history','Historique','pages/history.html']]],
    ['Système',[['settings','Paramètres','pages/settings.html']]]
  ];
  const subtitles={
    dashboard:'Vue d’ensemble des étudiants, des entreprises et des derniers matchings.',
    students:'Importez, filtrez et consultez les profils étudiants.',
    companies:'Les entreprises enregistrées depuis la recherche ou saisies manuellement.',
    search:'Trouvez des entreprises tunisiennes par domaine, avec leur site et leur page LinkedIn.',
    matching:'Comparez les profils étudiants aux entreprises enregistrées.',
    history:'Retrouvez vos recherches et vos calculs de matching.',
    settings:'Webhooks n8n, domaines et journal des erreurs.'
  };

  document.getElementById('nav').innerHTML=sections.map(([label,links])=>`<div class="nav-label">${label}</div>`+links.map(l=>`<a href="${root}${l[2]}" class="${l[0]===page?'active':''}"${l[0]===page?' aria-current="page"':''}>${I[l[0]]}<span>${l[1]}</span></a>`).join('')).join('');

  const sidebar=document.getElementById('sidebar');
  sidebar.insertAdjacentHTML('beforeend','<div class="sidebar-foot"><b>Recherche en direct</b>Les entreprises sont trouvées sur le web à chaque recherche, puis enregistrées dans ce navigateur.</div>');
  sidebar.insertAdjacentHTML('afterend','<div class="sidebar-backdrop" id="sidebarBackdrop"></div>');
  const backdrop=document.getElementById('sidebarBackdrop');
  const menu=document.getElementById('menuBtn');
  const setMenu=open=>{sidebar.classList.toggle('open',open);backdrop.classList.toggle('show',open);menu.setAttribute('aria-expanded',String(open))};
  menu.onclick=()=>setMenu(!sidebar.classList.contains('open'));
  backdrop.onclick=()=>setMenu(false);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});

  // Titre de page + sous-titre
  const head=document.querySelector('.page-head');
  const h1=head&&head.querySelector('h1');
  if(h1&&subtitles[page]){const wrap=document.createElement('div');wrap.className='page-title';h1.replaceWith(wrap);wrap.append(h1);wrap.insertAdjacentHTML('beforeend',`<p class="page-sub">${subtitles[page]}</p>`)}

  // Recherche globale : raccourci « / »
  const g=document.getElementById('globalSearch');
  if(g){const wrap=document.createElement('div');wrap.className='search-wrap';g.replaceWith(wrap);wrap.append(g);wrap.insertAdjacentHTML('beforeend','<span class="kbd" aria-hidden="true">/</span>');
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){e.preventDefault();g.focus()}})}

  // Thème clair / sombre (préférence du navigateur par défaut)
  const topbar=document.querySelector('.topbar');
  const avatar=topbar&&topbar.querySelector('.avatar');
  const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)};
  if(avatar){
    avatar.insertAdjacentHTML('beforebegin','<span class="topbar-spacer"></span><button class="icon-btn" id="themeBtn" type="button"></button>');
    const btn=document.getElementById('themeBtn');
    const paint=()=>{const dark=isDark();btn.innerHTML=dark?I.sun:I.moon;btn.title=dark?'Passer en thème clair':'Passer en thème sombre';btn.setAttribute('aria-label',btn.title)};
    btn.onclick=()=>{const next=isDark()?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('tm_theme',next)}catch(e){}paint()};
    paint();
  }

  const mb=document.getElementById('modeBadge');
  function mode(){const m=Store.mode();mb.textContent=m==='demo'?'Mode démo':'Mode connecté';mb.title=m==='demo'?'Mode démo (données fictives)':'Mode connecté n8n';mb.className='badge '+(m==='demo'?'warn':'ok')}
  mode();
  N8N.ping().then(ok=>{const b=document.getElementById('n8nStatus');b.textContent=ok?'n8n connecté':'n8n injoignable';b.className='badge '+(ok?'ok':'err')});
  window.App={refreshMode:mode,icon:I};
})();
(function(){const g=document.getElementById('globalSearch');if(!g)return;const root=document.body.dataset.root===undefined?'../':document.body.dataset.root;
  g.addEventListener('keydown',e=>{if(e.key==='Enter'&&g.value.trim())location.href=root+'pages/students.html?q='+encodeURIComponent(g.value.trim())})})();
