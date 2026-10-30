(function(){const $=id=>document.getElementById(id);
  const TS=U.table($('tS'),[{k:'searchedAt',l:'Date',r:x=>U.fmtDate(x.searchedAt)},{k:'domain',l:'Domaine'},{k:'p',l:'Paramètres',r:x=>U.esc([x.params?.city,x.params?.keywords,x.params?.opportunityType].filter(Boolean).join(' · ')||'—')},{k:'count',l:'Résultats'}]);
  const TR=U.table($('tR'),[{k:'at',l:'Date',r:x=>U.fmtDate(x.at)},{k:'mode',l:'Mode'},{k:'domain',l:'Domaine',r:x=>U.esc(x.domain||'Tous')},{k:'processed',l:'Traités'},{k:'resultsCount',l:'Résultats'},{k:'rejected',l:'Invalides'},{k:'_',l:'',r:()=>'<button class="btn" data-act="r">Relancer</button>'}],{onAction:(a,x)=>location.href='matching.html?rerun='+encodeURIComponent(x.id)});
  const draw=()=>{TS.set(Store.get('searches'));TR.set(Store.get('runs'))};
  $('clrS').onclick=()=>{if(confirm('Vider l\'historique des recherches ?')){Store.set('searches',[]);draw()}};
  $('clrR').onclick=()=>{if(confirm('Vider l\'historique des calculs ?')){Store.set('runs',[]);draw()}};draw();
})();
