// Appels aux Webhooks n8n. Aucun résultat n'est jamais fabriqué : en cas d'échec on renvoie {ok:false,error}.
const N8N={
  endpoints:{import:'STUDENTS_IMPORT_WEBHOOK',search:'COMPANY_SEARCH_WEBHOOK',match:'MATCHING_WEBHOOK',health:'HEALTHCHECK_WEBHOOK'},
  required:{import:['success','importedCount'],search:['success','companies'],match:['success','matches']},
  url(key){const p=TM_CONFIG[this.endpoints[key]];if(!p)return null;return /^https?:/.test(p)?p:TM_CONFIG.N8N_BASE_URL.replace(/\/$/,'')+p},
  configured(key){return !!this.url(key)},
  async call(key,payload,method='POST'){
    const url=this.url(key);
    if(!url)return{ok:false,error:'Webhook « '+this.endpoints[key]+' » non configuré (placeholder). Créez-le dans n8n puis renseignez-le dans Paramètres.'};
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),(key==='search'&&TM_CONFIG.SEARCH_TIMEOUT_MS)||(key==='match'&&TM_CONFIG.MATCH_TIMEOUT_MS)||TM_CONFIG.TIMEOUT_MS);
    try{
      const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(payload):undefined,signal:ctl.signal});
      if(!r.ok)return{ok:false,error:'n8n a répondu avec le statut HTTP '+r.status+'.'};
      let data;try{data=await r.json()}catch(e){return{ok:false,error:'Réponse invalide : JSON attendu.'}}
      const miss=(this.required[key]||[]).filter(f=>!(f in (data||{})));
      if(miss.length)return{ok:false,error:'Réponse non conforme au contrat, champs manquants : '+miss.join(', ')};
      if(data.success===false)return{ok:false,error:typeof data.error==='string'&&data.error?data.error:'Le workflow signale un échec.',data};
      return{ok:true,data};
    }catch(e){
      return{ok:false,error:e.name==='AbortError'?'Délai dépassé.':'n8n injoignable ou requête bloquée (CORS ?). Voir le README.'};
    }finally{clearTimeout(to)}
  },
  async ping(){
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),5000);
    try{const u=this.url('health')||TM_CONFIG.N8N_BASE_URL.replace(/\/$/,'')+'/healthz';
      const r=await fetch(u,{signal:ctl.signal});return r.ok}catch(e){return false}finally{clearTimeout(to)}
  }
};
