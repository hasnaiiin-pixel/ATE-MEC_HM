/* AT-MEC_HM_4.16A_APP_JS_SPLIT - extracted from legacy app.js.
 * Compatibility mode: classic script, shares window/global scope with app.js.
 */

/* AT-MEC_HM_4.13O - Profilo operatore e statistiche personali */
function getOperatorProfileRows413O(){
  const rows=[];
  try { if (Array.isArray(auditCache)) rows.push(...auditCache); } catch(_e) {}
  try {
    const db = JSON.parse(localStorage.getItem('atmec_local_results') || '[]');
    if (Array.isArray(db)) rows.push(...db);
  } catch(_e) {}
  return rows;
}
function rowMatchesCurrentOperator413O(r, u){
  const keys=[r?.operator, r?.operator_name, r?.operatorName, r?.username, r?.user, r?.operator_code, r?.operatorCode, r?.created_by];
  const wanted=[u?.operator, u?.username, u?.operatorCode].map(x=>String(x||'').toLowerCase()).filter(Boolean);
  return keys.some(k=>wanted.includes(String(k||'').toLowerCase()));
}
function computeOperatorStats413O(){
  const u=currentUser||{}; const rows=getOperatorProfileRows413O().filter(r=>rowMatchesCurrentOperator413O(r,u));
  const total=rows.length;
  const pass=rows.filter(r=>String(r?.result||r?.status||r?.esito||'').toUpperCase().includes('PASS')).length;
  const fail=rows.filter(r=>String(r?.result||r?.status||r?.esito||'').toUpperCase().includes('FAIL')).length;
  const fp = total ? Math.round((pass/total)*1000)/10 : 0;
  const durations=rows.map(r=>Number(r?.duration_ms||r?.durationMs||r?.elapsed_ms||0)).filter(n=>n>0);
  const avg=durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length/1000) : 0;
  return {total, pass, fail, fp, avg, rows};
}
function refreshOperatorProfile413O(){
  const box=document.getElementById('operator-profile-content'); if(!box) return;
  const u=currentUser||{}; const st=computeOperatorStats413O();
  const initials=String(u.operator||u.username||'?').slice(0,1).toUpperCase();
  box.innerHTML=`<div class="profile-hero-413o"><div class="profile-avatar-413o">${u.photoDataUrl?`<img src="${escapeHtml(u.photoDataUrl)}">`:escapeHtml(initials)}</div><div><h2>${escapeHtml(u.operator||u.username||'Operatore')}</h2><div class="profile-sub-413o">Codice operatore: <b>${escapeHtml(u.operatorCode||u.username||'N/D')}</b> · Ruolo: <b>${escapeHtml(u.role||'N/D')}</b> · Livello ${Number(u.level||0)}</div><div class="profile-perms-413o">${(u.permissions||[]).map(p=>`<span>${escapeHtml(p)}</span>`).join('')||'<span>Nessun permesso</span>'}</div></div></div><div class="profile-kpis-413o"><div><b>${st.total}</b><span>Test registrati</span></div><div><b>${st.pass}</b><span>PASS</span></div><div><b>${st.fail}</b><span>FAIL</span></div><div><b>${st.fp}%</b><span>First Pass Yield</span></div><div><b>${st.avg}s</b><span>Tempo medio</span></div></div><div class="hint">Le statistiche vengono calcolate sui risultati disponibili localmente per nome utente/codice operatore. Quando collegheremo il database centrale, questa pagina diventerà lo storico completo dell’operatore.</div>`;
}
window.refreshOperatorProfile413O=refreshOperatorProfile413O;


/* AT-MEC_HM_4.13Q - Permission Profile UI PRO: profilo selezionabile, permessi leggibili, ruoli robusti */
(function(){
  function $p(id){ return document.getElementById(id); }
  function escP(v){ try { return escapeHtml(v); } catch(_e){ return String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); } }
  function logP(msg,type='info'){ try{ addLog(document.getElementById('sys-log'), msg, type); }catch(_e){ console.log(msg); } }
  const PERMISSION_CATALOG_413P = [
    ['run_test','Test Mode','Avviare ed eseguire test produzione'],
    ['debug_mode','Debug test','Usare funzioni debug/step-by-step'],
    ['view_reports','Report','Visualizzare report di collaudo'],
    ['approve_reports','Approvazione report','Approvare report e revisioni qualità'],
    ['sign_quality','Firma qualità','Firmare/verificare qualità'],
    ['edit_recipe','Ricette','Creare e modificare ricette'],
    ['config_hardware','Hardware','Configurare ESP32, PL303 e strumenti'],
    ['view_traceability','Tracciabilità','Vedere storico seriali e scheda unità'],
    ['view_kpi','KPI produzione','Vedere analisi produzione e statistiche'],
    ['manage_data','Database / Sync','Gestire archivio, export, backup e sincronizzazione'],
    ['manage_users','Utenti e ruoli','Creare utenti, ruoli e permessi'],
    ['manage_branding','Branding','Modificare loghi e identità grafica'],
    ['edit_layout','Layout Editor','Modificare layout HMI'],
    ['show_ui_ids','ID UI','Mostrare ID elementi interfaccia'],
    ['test_elements','Test UI','Usare strumenti test elementi UI']
  ];
  window.PERMISSION_CATALOG_413P = PERMISSION_CATALOG_413P;
  function permLabel413P(p){ const row=PERMISSION_CATALOG_413P.find(x=>x[0]===p); return row?row[1]:p; }
  function permDesc413P(p){ const row=PERMISSION_CATALOG_413P.find(x=>x[0]===p); return row?row[2]:p; }
  function normalizeApiArray413P(v){ return Array.isArray(v)?v:[]; }
  function getRoles413P(){ return normalizeApiArray413P(window.__rolesCache); }
  function getUsers413P(){ return normalizeApiArray413P(window.__usersCache); }
  function currentPermSet413P(user){ return new Set((user?.permissions||[]).map(x=>x==='manage_archive'?'manage_data':x)); }
  function userByUsername413P(username){ return getUsers413P().find(u=>String(u.username).toLowerCase()===String(username||'').toLowerCase()); }
  function roleByName413P(role){ return getRoles413P().find(r=>String(r.role)===String(role)); }
  function readablePermGrid413P(perms){
    const set=new Set((perms||[]).map(p=>p==='manage_archive'?'manage_data':p));
    const groups=[
      ['Produzione e qualità',['run_test','debug_mode','sign_quality','approve_reports']],
      ['Report e analisi',['view_reports','view_traceability','view_kpi','manage_data']],
      ['Configurazione tecnica',['edit_recipe','config_hardware','edit_layout','show_ui_ids','test_elements']],
      ['Amministrazione',['manage_users','manage_branding']]
    ];
    const enabled=PERMISSION_CATALOG_413P.filter(([id])=>set.has(id)).length;
    const total=PERMISSION_CATALOG_413P.length;
    const cards=(ids)=>ids.map(id=>{
      const row=PERMISSION_CATALOG_413P.find(x=>x[0]===id); if(!row) return '';
      const [,label,desc]=row; const active=set.has(id);
      return `<div class="perm-readable-card-413p ${active?'can':'cant'}"><div class="perm-state-413p"><span class="perm-dot-413q"></span>${active?'Autorizzato':'Non assegnato'}</div><b>${escP(label)}</b><span>${escP(desc)}</span><code>${escP(id)}</code></div>`;
    }).join('');
    return `<div class="permission-summary-413q"><div><b>${enabled}/${total}</b><span>autorizzazioni assegnate</span></div><div><b>${total-enabled}</b><span>funzioni riservate/non assegnate</span></div></div><div class="permission-readable-matrix-413q">${groups.map(([title,ids])=>`<section class="permission-group-413q"><h4>${escP(title)}</h4><div class="permission-readable-grid-413p">${cards(ids)}</div></section>`).join('')}</div>`;
  }
  function compactPermBadges413P(perms){
    const set=new Set((perms||[]).map(p=>p==='manage_archive'?'manage_data':p));
    return '<div class="profile-perms-413o">'+PERMISSION_CATALOG_413P.filter(x=>set.has(x[0])).map(([id,label])=>`<span title="${escP(id)}">${escP(label)}</span>`).join('')+'</div>';
  }
  window.renderReadablePermissions413P = readablePermGrid413P;

  const oldRefreshRolesUsers413P = window.refreshRolesUsers || (typeof refreshRolesUsers==='function'?refreshRolesUsers:null);
  async function refreshRolesUsers413P(){
    if (!api) return;
    try{
      const previousRoleValue = $p('new-user-role')?.value || '';
      const previousRoleEditor = $p('existing-role-select')?.value || '';
      const rolesRaw = await api.listRoles();
      const roles = Array.isArray(rolesRaw) ? rolesRaw : [];
      const canManage = (typeof userCanManageUsers==='function') ? userCanManageUsers() : false;
      let users=[];
      if(canManage){ const usersRaw=await api.listUsers(); users=Array.isArray(usersRaw)?usersRaw:[]; }
      window.__rolesCache=roles; window.__usersCache=users;
      const roleOptions = roles.map(r=>`<option value="${escP(r.role)}">${escP(r.role)} — livello ${Number(r.level||0)}</option>`).join('');
      const userRoleSel=$p('new-user-role');
      if(userRoleSel){
        userRoleSel.innerHTML=roleOptions;
        const selectedUser = selectedUserName ? userByUsername413P(selectedUserName) : null;
        const desired = selectedUser?.role || previousRoleValue || 'Operator';
        if([...userRoleSel.options].some(o=>o.value===desired)) userRoleSel.value=desired;
      }
      const roleSel=$p('existing-role-select');
      if(roleSel){
        roleSel.innerHTML='<option value="">➕ Nuovo ruolo</option>'+roleOptions;
        const desired=previousRoleEditor || $p('new-role-name')?.value || '';
        if([...roleSel.options].some(o=>o.value===desired)) roleSel.value=desired;
      }
      const userSel=$p('users-select');
      if(userSel){
        const prevUser = selectedUserName || userSel.value || '';
        userSel.innerHTML='<option value="">➕ Nuovo utente</option>'+users.map(u=>`<option value="${escP(u.username)}">${escP(u.displayName||u.username)} — ${escP(u.operatorCode||u.username)} — ${escP(u.role)} ${u.enabled===false?'(OFF)':''}</option>`).join('');
        if([...userSel.options].some(o=>o.value===prevUser)) userSel.value=prevUser;
      }
      const opSel=$p('operator-profile-select-413p');
      if(opSel){
        const prev=opSel.value || currentUser?.username || '';
        const currentOpt = currentUser ? `<option value="${escP(currentUser.username||'__current')}">Utente corrente — ${escP(currentUser.operator||currentUser.username||'')}</option>` : '<option value="">Utente corrente</option>';
        opSel.innerHTML=currentOpt + users.map(u=>`<option value="${escP(u.username)}">${escP(u.displayName||u.username)} — ${escP(u.operatorCode||u.username)} — ${escP(u.role)}</option>`).join('');
        if([...opSel.options].some(o=>o.value===prev)) opSel.value=prev;
      }
      const roleRows = roles.map(r=>`<div class="role-card-413p" onclick="loadRoleIntoEditor('${String(r.role).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')"><div><b>${escP(r.role)}</b><span>Livello ${Number(r.level||0)}</span></div>${compactPermBadges413P(r.permissions||[])}</div>`).join('') || '<div class="hint">Nessun ruolo configurato.</div>';
      const userRows = canManage ? (users.map(u=>{
        const role=roleByName413P(u.role); const perms=role?.permissions||u.permissions||[];
        return `<div class="user-row-modern-413o" onclick="selectUserFromList('${String(u.username).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')"><div class="avatar-mini-413o">${u.photoDataUrl?`<img src="${escP(u.photoDataUrl)}">`:escP(String(u.displayName||u.username||'?').slice(0,1).toUpperCase())}</div><div><b>${escP(u.displayName||u.username)}</b><div class="detail-line">${escP(u.username)} · codice ${escP(u.operatorCode||u.username)} · ruolo ${escP(u.role)} · livello ${Number(u.level||role?.level||0)} · ${u.enabled===false?'DISABILITATO':'attivo'}</div>${compactPermBadges413P(perms)}</div></div>`;
      }).join('') || '<div class="hint">Nessun utente creato.</div>') : '<div class="hint">Elenco utenti nascosto: serve il permesso <b>manage_users</b>.</div>';
      const list=$p('roles-users-list');
      if(list) list.innerHTML=`<div class="roles-users-dashboard-413p"><section><h4>Ruoli disponibili</h4>${roleRows}</section><section><h4>Credenziali utenti</h4>${userRows}</section></div>`;
      if(typeof applyUserAdminLock==='function') applyUserAdminLock(canManage);
      if(typeof refreshOperatorProfile413O==='function') setTimeout(()=>refreshOperatorProfile413O(), 50);
    }catch(e){ logP('❌ Errore lettura utenti/ruoli: '+escP((e&&e.message)||e),'fail'); }
  }
  window.refreshRolesUsers = refreshRolesUsers = refreshRolesUsers413P;

  window.loadRoleIntoEditor = loadRoleIntoEditor = function(roleName){
    const roles=getRoles413P(); const role=roles.find(r=>r.role===roleName);
    const nameEl=$p('new-role-name'), levelEl=$p('new-role-level'), sel=$p('existing-role-select');
    if(sel && roleName && sel.value!==roleName) sel.value=roleName;
    if(!role){ if(nameEl){ nameEl.value=''; nameEl.readOnly=false; nameEl.placeholder='Scrivi nome solo per nuovo ruolo'; } return; }
    if(nameEl){ nameEl.value=role.role||''; nameEl.readOnly=true; nameEl.title='Nome rilevato dalla selezione ruolo'; }
    if(levelEl) levelEl.value=String(role.level||10);
    const perms=new Set((role.permissions||[]).map(p=>p==='manage_archive'?'manage_data':p));
    document.querySelectorAll('.perm-check').forEach(ch=>{ ch.checked=perms.has(ch.value); });
    const hint=$p('role-editor-hint-413p'); if(hint) hint.innerHTML=`Modifica ruolo selezionato: <b>${escP(role.role)}</b>. Il nome è rilevato automaticamente dalla selezione.`;
  };

  window.createRoleFromUi = createRoleFromUi = async function(){
    if(typeof userCanManageUsers==='function' && !userCanManageUsers()){ logP('⛔ Solo Admin può modificare ruoli.','fail'); return; }
    const selected=$p('existing-role-select')?.value || '';
    const typed=$p('new-role-name')?.value?.trim() || '';
    const role=(selected || typed).trim();
    if(!role){ alert('Seleziona un ruolo esistente o scrivi il nome del nuovo ruolo.'); return; }
    const permissions=[...document.querySelectorAll('.perm-check:checked')].map(x=>x.value==='manage_archive'?'manage_data':x.value);
    const level=parseInt($p('new-role-level')?.value || '10',10);
    const res=await api.createRole(role, permissions, level);
    logP(res?.ok ? `Ruolo salvato: <b>${escP(role)}</b>` : `❌ ${escP(res?.error||'Errore salvataggio ruolo')}`, res?.ok?'info':'fail');
    await refreshRolesUsers413P();
    if(res?.ok){ const sel=$p('existing-role-select'); if(sel) sel.value=role; await (window.syncCurrentUserFromBackend413O?.('ruolo salvato') || Promise.resolve()); }
  };

  window.selectUserFromList = selectUserFromList = function(username){
    selectedUserName=username || '';
    const users=getUsers413P(); const u=userByUsername413P(username);
    const us=$p('users-select'); if(us) us.value=username||'';
    if(!u){ if(typeof clearUserForm==='function') clearUserForm(); return; }
    const set=(id,v)=>{ const el=$p(id); if(el) el.value=v||''; };
    set('new-user-name',u.username); set('new-user-display',u.displayName||u.username); set('new-user-code',u.operatorCode||u.username); set('new-user-pass','');
    selectedUserOperatorCode=u.operatorCode||u.username||''; selectedUserPhotoDataUrl=u.photoDataUrl||'';
    if(typeof updateUserPhotoPreview413O==='function') updateUserPhotoPreview413O(selectedUserPhotoDataUrl);
    const rs=$p('new-user-role'); if(rs){ if(![...rs.options].some(o=>o.value===u.role) && u.role) rs.insertAdjacentHTML('beforeend',`<option value="${escP(u.role)}">${escP(u.role)}</option>`); rs.value=u.role||''; }
    const opSel=$p('operator-profile-select-413p'); if(opSel && [...opSel.options].some(o=>o.value===u.username)) opSel.value=u.username;
    if(typeof refreshOperatorProfile413O==='function') refreshOperatorProfile413O();
  };

  window.createUserFromUi = createUserFromUi = async function(){
    if(typeof userCanManageUsers==='function' && !userCanManageUsers()){ logP('⛔ Solo Admin può creare o modificare utenti.','fail'); return; }
    const username=$p('new-user-name')?.value||'';
    const role=$p('new-user-role')?.value||'';
    if(!username.trim()){ alert('Inserisci username.'); return; }
    if(!role){ alert('Seleziona ruolo.'); return; }
    const res=await api.createUser(username, $p('new-user-display')?.value||'', role, $p('new-user-pass')?.value||'', $p('new-user-code')?.value||selectedUserOperatorCode||'', selectedUserPhotoDataUrl||'');
    logP(res?.ok ? `Utente salvato: <b>${escP(username)}</b> con ruolo <b>${escP(role)}</b>` : `❌ ${escP(res?.error||'Errore salvataggio utente')}`, res?.ok?'info':'fail');
    if(res?.ok) selectedUserName=username.trim();
    await refreshRolesUsers413P();
    if(res?.ok){ selectUserFromList(selectedUserName); await (window.syncCurrentUserFromBackend413O?.('utente salvato') || Promise.resolve()); }
  };

  function getSelectedProfileUser413P(){
    const selected=$p('operator-profile-select-413p')?.value || '';
    const users=getUsers413P();
    if(selected){ const u=userByUsername413P(selected); if(u) return u; }
    if(currentUser) return {username:currentUser.username, displayName:currentUser.operator, role:currentUser.role, operatorCode:currentUser.operatorCode, photoDataUrl:currentUser.photoDataUrl, enabled:true, permissions:currentUser.permissions, level:currentUser.level};
    return null;
  }
  function allRows413P(){
    const rows=[]; try{ if(Array.isArray(auditCache)) rows.push(...auditCache); }catch(_e){}
    try{ const db=JSON.parse(localStorage.getItem('atmec_local_results')||'[]'); if(Array.isArray(db)) rows.push(...db); }catch(_e){}
    try{ const db=JSON.parse(localStorage.getItem('atmec_test_history')||'[]'); if(Array.isArray(db)) rows.push(...db); }catch(_e){}
    return rows;
  }
  function rowDate413P(r){ const raw=r?.date||r?.datetime||r?.timestamp||r?.startedAt||r?.createdAt||r?.endTime||''; const d=raw?new Date(raw):null; return d && !Number.isNaN(d.getTime()) ? d : null; }
  function rowResult413P(r){ const s=String(r?.result||r?.status||r?.esito||r?.outcome||'').toUpperCase(); if(s.includes('PASS')||s==='OK') return 'PASS'; if(s.includes('FAIL')||s.includes('KO')||s.includes('NOK')) return 'FAIL'; return s||'N/D'; }
  function rowMatchesOperator413P(r,u){
    const keys=[r?.operator,r?.operator_name,r?.operatorName,r?.username,r?.user,r?.operator_code,r?.operatorCode,r?.created_by,r?.createdBy];
    const wanted=[u?.displayName,u?.operator,u?.username,u?.operatorCode].map(x=>String(x||'').toLowerCase()).filter(Boolean);
    return keys.some(k=>wanted.includes(String(k||'').toLowerCase()));
  }
  function filteredRows413P(u){
    let rows=allRows413P().filter(r=>rowMatchesOperator413P(r,u));
    const rf=$p('operator-profile-result-filter-413p')?.value||'all';
    if(rf==='pass') rows=rows.filter(r=>rowResult413P(r)==='PASS');
    if(rf==='fail') rows=rows.filter(r=>rowResult413P(r)==='FAIL');
    const from=$p('operator-profile-date-from-413p')?.value; const to=$p('operator-profile-date-to-413p')?.value;
    if(from){ const fd=new Date(from+'T00:00:00'); rows=rows.filter(r=>{const d=rowDate413P(r); return !d || d>=fd;}); }
    if(to){ const td=new Date(to+'T23:59:59'); rows=rows.filter(r=>{const d=rowDate413P(r); return !d || d<=td;}); }
    const q=String($p('operator-profile-search-413p')?.value||'').trim().toLowerCase();
    if(q) rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
    return rows;
  }
  window.refreshOperatorProfile413O = refreshOperatorProfile413O = function(){
    const box=$p('operator-profile-content'); if(!box) return;
    const u=getSelectedProfileUser413P();
    if(!u){ box.innerHTML='<div class="hint">Esegui login per vedere il profilo operatore.</div>'; return; }
    const role=roleByName413P(u.role) || {level:u.level||0, permissions:u.permissions||[]};
    const perms=role.permissions||u.permissions||[]; const rows=filteredRows413P(u);
    const total=rows.length, pass=rows.filter(r=>rowResult413P(r)==='PASS').length, fail=rows.filter(r=>rowResult413P(r)==='FAIL').length;
    const fp=total?Math.round((pass/total)*1000)/10:0;
    const durations=rows.map(r=>Number(r?.duration_ms||r?.durationMs||r?.elapsed_ms||r?.elapsedMs||r?.time_ms||0)).filter(n=>n>0);
    const avg=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length/1000):0;
    const last=rows.map(rowDate413P).filter(Boolean).sort((a,b)=>b-a)[0];
    const recipes=new Set(rows.map(r=>r?.recipe||r?.recipeName||r?.recipe_name).filter(Boolean));
    const initials=String(u.displayName||u.operator||u.username||'?').slice(0,1).toUpperCase();
    const recent=rows.slice(-12).reverse().map(r=>`<tr><td>${rowDate413P(r)?rowDate413P(r).toLocaleString('it-IT'):'N/D'}</td><td>${escP(r?.serial||r?.serialNumber||r?.sn||'N/D')}</td><td>${escP(r?.recipe||r?.recipeName||'N/D')}</td><td><b class="${rowResult413P(r)==='PASS'?'ok413p':'ko413p'}">${escP(rowResult413P(r))}</b></td></tr>`).join('') || '<tr><td colspan="4">Nessun test trovato con i filtri attuali.</td></tr>';
    box.innerHTML=`<div class="social-profile-413p"><div class="social-cover-413p"><div class="profile-avatar-413o social-avatar-413p">${u.photoDataUrl?`<img src="${escP(u.photoDataUrl)}">`:escP(initials)}</div><div class="social-title-413p"><h1>${escP(u.displayName||u.operator||u.username)}</h1><p>${escP(u.username)} · Codice <b>${escP(u.operatorCode||u.username||'N/D')}</b> · Ruolo <b>${escP(u.role||'N/D')}</b> · Livello ${Number(role.level||u.level||0)} · ${u.enabled===false?'DISABILITATO':'attivo'}</p></div></div><div class="profile-kpis-413o social-kpis-413p"><div><b>${total}</b><span>Test filtrati</span></div><div><b>${pass}</b><span>PASS</span></div><div><b>${fail}</b><span>FAIL</span></div><div><b>${fp}%</b><span>FPY</span></div><div><b>${avg}s</b><span>Tempo medio</span></div><div><b>${recipes.size}</b><span>Ricette</span></div><div><b>${last?last.toLocaleDateString('it-IT'):'N/D'}</b><span>Ultimo test</span></div></div><h3>Permessi ruolo: ${escP(u.role||'N/D')}</h3>${readablePermGrid413P(perms)}<h3>Storico recente filtrato</h3><div class="profile-table-wrap-413p"><table class="profile-table-413p"><thead><tr><th>Data</th><th>Seriale</th><th>Ricetta</th><th>Esito</th></tr></thead><tbody>${recent}</tbody></table></div></div>`;
  };

  setTimeout(()=>{ try{ refreshRolesUsers413P(); }catch(_e){} }, 500);
})();

/* AT-MEC HM 4.13R - Roles & Collaborator UI refinement
   UI-only refinement: compact permission matrix, professional role levels,
   Collaboratore terminology in visible profile/users/roles areas. */
(function(){
  const api = window.atmecAPI || window.api;
  const $r = (id)=>document.getElementById(id);
  const escR = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const jsR = (v)=>String(v ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');
  const normRoleR = (role)=>String(role||'').trim().toLowerCase();
  function roleMeta413R(role, level){
    const r=normRoleR(role); const l=Number(level||0);
    if(r==='admin' || r.includes('amministr')) return {label:'Amministratore', badge:'◈', level:'L5', levelNo:5, tone:'admin', color:'Oro', desc:'Controllo completo del sistema, utenti, ruoli, sicurezza e configurazioni.'};
    if(r==='developer' || r==='engineer' || r.includes('ingegner') || r.includes('svilupp')) return {label:'Ingegnere', badge:'◉', level:'L4', levelNo:4, tone:'engineer', color:'Blu', desc:'Sviluppo, ricette, diagnostica, configurazione tecnica e manutenzione della stazione.'};
    if(r.includes('qualit') || r==='quality') return {label:'Qualità', badge:'⬡', level:'L3', levelNo:3, tone:'quality', color:'Viola', desc:'Validazione prodotto, firma qualità, report, tracciabilità, riparazioni e KPI qualità.'};
    if(r.includes('technician') || r.includes('tecnico')) return {label:'Tecnico', badge:'⬢', level:'L2', levelNo:2, tone:'tech', color:'Arancione', desc:'Supporto tecnico, diagnostica strumenti, hardware e controlli di manutenzione.'};
    if(r==='operator' || r.includes('operatore') || r.includes('collaboratore')) return {label:'Collaboratore', badge:'●', level:'L1', levelNo:1, tone:'collab', color:'Verde', desc:'Esecuzione attività operative, test e consultazione risultati autorizzati.'};
    if(l>=90) return {label:String(role||'Ruolo'), badge:'◈', level:'L5', levelNo:5, tone:'admin', color:'Oro', desc:'Ruolo personalizzato con privilegi elevati.'};
    if(l>=70) return {label:String(role||'Ruolo'), badge:'◉', level:'L4', levelNo:4, tone:'engineer', color:'Blu', desc:'Ruolo tecnico avanzato personalizzato.'};
    if(l>=55) return {label:String(role||'Ruolo'), badge:'⬡', level:'L3', levelNo:3, tone:'quality', color:'Viola', desc:'Ruolo di controllo, validazione o supervisione.'};
    if(l>=30) return {label:String(role||'Ruolo'), badge:'⬢', level:'L2', levelNo:2, tone:'tech', color:'Arancione', desc:'Ruolo tecnico operativo personalizzato.'};
    return {label:String(role||'Collaboratore'), badge:'●', level:'L1', levelNo:1, tone:'collab', color:'Verde', desc:'Ruolo operativo personalizzato.'};
  }
  window.atmecRoleMeta413R = roleMeta413R;
  function getRolesR(){ return Array.isArray(window.__rolesCache)?window.__rolesCache:[]; }
  function getUsersR(){ return Array.isArray(window.__usersCache)?window.__usersCache:[]; }
  function roleByNameR(role){ return getRolesR().find(r=>String(r.role)===String(role)); }
  function userByNameR(username){ return getUsersR().find(u=>String(u.username).toLowerCase()===String(username||'').toLowerCase()); }
  const PERMS_R = window.PERMISSION_CATALOG_413P || [
    ['run_test','Esecuzione test','Avvio, stop e gestione operativa dei test'],
    ['debug_mode','Debug test','Controllo step-by-step e funzioni di diagnostica'],
    ['view_reports','Report','Consultazione report di collaudo e risultati'],
    ['approve_reports','Approvazione report','Validazione finale report e revisione qualità'],
    ['sign_quality','Firma qualità','Firma e verifica qualità con credenziali autorizzate'],
    ['edit_recipe','Ricette','Creazione, modifica e gestione ricette di test'],
    ['config_hardware','Hardware','Configurazione ESP32, alimentatori, multimetri e strumenti'],
    ['view_traceability','Tracciabilità','Storico seriali, scheda unità e riparazioni'],
    ['view_kpi','KPI produzione','Analisi produzione, qualità, tempi e trend'],
    ['manage_data','Database / Sync','Backup, export, sincronizzazione e gestione dati'],
    ['manage_users','Utenti e ruoli','Amministrazione collaboratori, ruoli e autorizzazioni'],
    ['manage_branding','Branding','Gestione loghi, identità visiva e immagini'],
    ['edit_layout','Layout Editor','Modifica layout HMI e interfacce operative'],
    ['show_ui_ids','ID UI','Visualizzazione ID elementi interfaccia'],
    ['test_elements','Test UI','Strumenti di verifica elementi interfaccia']
  ];
  function permRowR(id, active){
    const row=PERMS_R.find(x=>x[0]===id) || [id,id,id];
    return `<div class="perm-line-413r ${active?'active':'inactive'}"><div class="perm-line-main-413r"><b>${escR(row[1])}</b><span>${escR(row[2])}</span></div><div class="perm-line-state-413r">${active?'✓ Attivo':'○ Non assegnato'}</div></div>`;
  }
  function permissionsMatrix413R(perms){
    const set=new Set((perms||[]).map(p=>p==='manage_archive'?'manage_data':p));
    const groups=[
      ['Produzione e qualità',['run_test','debug_mode','sign_quality','approve_reports']],
      ['Report, KPI e tracciabilità',['view_reports','view_traceability','view_kpi','manage_data']],
      ['Configurazione tecnica',['edit_recipe','config_hardware','edit_layout','show_ui_ids','test_elements']],
      ['Amministrazione sistema',['manage_users','manage_branding']]
    ];
    const total=PERMS_R.length, enabled=PERMS_R.filter(([id])=>set.has(id)).length;
    return `<div class="permission-summary-413r"><div><b>${enabled}/${total}</b><span>Autorizzazioni attive</span></div><div><b>${total-enabled}</b><span>Non assegnate</span></div></div><div class="permission-matrix-413r">${groups.map(([title,ids])=>`<section class="permission-group-413r"><h4>${escR(title)}</h4>${ids.map(id=>permRowR(id,set.has(id))).join('')}</section>`).join('')}</div>`;
  }
  window.renderReadablePermissions413P = permissionsMatrix413R;
  function compactPermsR(perms){
    const set=new Set((perms||[]).map(p=>p==='manage_archive'?'manage_data':p));
    const enabled=PERMS_R.filter(([id])=>set.has(id)).slice(0,6);
    return `<div class="compact-perms-413r">${enabled.map(([id,label])=>`<span title="${escR(id)}">${escR(label)}</span>`).join('') || '<span>Nessuna autorizzazione</span>'}</div>`;
  }
  async function refreshRolesUsers413R(){
    if(!api) return;
    try{
      const previousUserRole=$r('new-user-role')?.value||'';
      const previousRoleEditor=$r('existing-role-select')?.value||'';
      const rolesRaw=await api.listRoles(); const roles=Array.isArray(rolesRaw)?rolesRaw:[];
      const canManage=(typeof userCanManageUsers==='function')?userCanManageUsers():false;
      let users=[]; if(canManage){ const usersRaw=await api.listUsers(); users=Array.isArray(usersRaw)?usersRaw:[]; }
      window.__rolesCache=roles; window.__usersCache=users;
      const roleOptions=roles.map(r=>{ const m=roleMeta413R(r.role,r.level); return `<option value="${escR(r.role)}">${m.badge} ${escR(m.label)} — ${m.level} — ${escR(m.desc)}</option>`; }).join('');
      const userRoleSel=$r('new-user-role');
      if(userRoleSel){
        const selectedUser=window.selectedUserName?userByNameR(window.selectedUserName):null;
        const desired=selectedUser?.role || previousUserRole || 'Operator';
        userRoleSel.innerHTML=roleOptions;
        if([...userRoleSel.options].some(o=>o.value===desired)) userRoleSel.value=desired;
      }
      const roleSel=$r('existing-role-select');
      if(roleSel){
        roleSel.innerHTML='<option value="">➕ Nuovo ruolo</option>'+roleOptions;
        const desired=previousRoleEditor || $r('new-role-name')?.value || '';
        if([...roleSel.options].some(o=>o.value===desired)) roleSel.value=desired;
      }
      const userSel=$r('users-select');
      if(userSel){
        const prev=(typeof selectedUserName!=='undefined' && selectedUserName) || userSel.value || '';
        userSel.innerHTML='<option value="">➕ Nuovo collaboratore</option>'+users.map(u=>{ const role=roleByNameR(u.role); const m=roleMeta413R(u.role,role?.level||u.level); return `<option value="${escR(u.username)}">${m.badge} ${escR(u.displayName||u.username)} — ${escR(u.operatorCode||u.username)} — ${escR(m.label)} ${m.level}</option>`; }).join('');
        if([...userSel.options].some(o=>o.value===prev)) userSel.value=prev;
      }
      const opSel=$r('operator-profile-select-413p');
      if(opSel){
        const prev=opSel.value || currentUser?.username || '';
        const currentOpt=currentUser ? `<option value="${escR(currentUser.username||'')}">Collaboratore corrente — ${escR(currentUser.operator||currentUser.username||'')}</option>` : '<option value="">Collaboratore corrente</option>';
        opSel.innerHTML=currentOpt + users.map(u=>{ const role=roleByNameR(u.role); const m=roleMeta413R(u.role,role?.level||u.level); return `<option value="${escR(u.username)}">${m.badge} ${escR(u.displayName||u.username)} — ${escR(u.operatorCode||u.username)} — ${escR(m.label)} ${m.level}</option>`; }).join('');
        if([...opSel.options].some(o=>o.value===prev)) opSel.value=prev;
      }
      const roleRows=roles.map(r=>{ const m=roleMeta413R(r.role,r.level); return `<div class="role-card-413r ${m.tone}" onclick="loadRoleIntoEditor('${jsR(r.role)}')"><div class="role-symbol-413r">${m.badge}</div><div class="role-main-413r"><div><b>${escR(m.label)}</b><span>${m.level} · ${escR(m.color)}</span></div><p>${escR(m.desc)}</p>${compactPermsR(r.permissions||[])}</div></div>`; }).join('') || '<div class="hint">Nessun ruolo configurato.</div>';
      const userRows=canManage ? (users.map(u=>{ const role=roleByNameR(u.role); const m=roleMeta413R(u.role,role?.level||u.level); const perms=role?.permissions||u.permissions||[]; return `<div class="user-card-413r ${m.tone}" onclick="selectUserFromList('${jsR(u.username)}')"><div class="avatar-mini-413o user-avatar-413r">${u.photoDataUrl?`<img src="${escR(u.photoDataUrl)}">`:escR(String(u.displayName||u.username||'?').slice(0,1).toUpperCase())}</div><div class="user-main-413r"><div class="user-head-413r"><b>${escR(u.displayName||u.username)}</b><span class="role-pill-413r ${m.tone}">${m.badge} ${m.level} ${escR(m.label)}</span></div><div class="detail-line">Username ${escR(u.username)} · Codice collaboratore ${escR(u.operatorCode||u.username)} · ${u.enabled===false?'Disabilitato':'Attivo'}</div>${compactPermsR(perms)}</div></div>`; }).join('') || '<div class="hint">Nessun collaboratore creato.</div>') : '<div class="hint">Elenco collaboratori nascosto: serve il permesso <b>manage_users</b>.</div>';
      const list=$r('roles-users-list');
      if(list) list.innerHTML=`<div class="roles-users-dashboard-413r"><section><h4>Livelli ruolo</h4><div class="hint">Ruoli con badge professionali, livello accesso e responsabilità principali.</div>${roleRows}</section><section><h4>Collaboratori disponibili</h4><div class="hint">Seleziona un collaboratore per vedere ruolo, codice, foto e autorizzazioni.</div>${userRows}</section></div>`;
      if(typeof applyUserAdminLock==='function') applyUserAdminLock(canManage);
      if(typeof refreshOperatorProfile413O==='function') setTimeout(()=>refreshOperatorProfile413O(), 50);
    }catch(e){ try{ addLog(document.getElementById('sys-log'),'❌ Errore lettura utenti/ruoli: '+escR(e?.message||e),'fail'); }catch(_e){} }
  }
  window.refreshRolesUsers = refreshRolesUsers413R;
  if(typeof refreshRolesUsers!=='undefined') refreshRolesUsers = refreshRolesUsers413R;
  function rowDateR(r){ const raw=r?.date||r?.datetime||r?.timestamp||r?.startedAt||r?.createdAt||r?.endTime||''; const d=raw?new Date(raw):null; return d && !Number.isNaN(d.getTime())?d:null; }
  function rowResultR(r){ const s=String(r?.result||r?.status||r?.esito||r?.outcome||r?.final_result||'').toUpperCase(); if(s.includes('PASS')||s==='OK') return 'PASS'; if(s.includes('FAIL')||s.includes('KO')||s.includes('NOK')) return 'FAIL'; return s||'N/D'; }
  function allRowsR(){ const rows=[]; try{ if(Array.isArray(auditCache)) rows.push(...auditCache); }catch(_e){}; for(const k of ['atmec_local_results','atmec_test_history']){ try{ const v=JSON.parse(localStorage.getItem(k)||'[]'); if(Array.isArray(v)) rows.push(...v); }catch(_e){} } return rows; }
  function matchesUserR(r,u){ const keys=[r?.operator,r?.operator_name,r?.operatorName,r?.username,r?.user,r?.operator_code,r?.operatorCode,r?.created_by,r?.createdBy]; const wanted=[u?.displayName,u?.operator,u?.username,u?.operatorCode].map(x=>String(x||'').toLowerCase()).filter(Boolean); return keys.some(k=>wanted.includes(String(k||'').toLowerCase())); }
  function selectedProfileUserR(){ const selected=$r('operator-profile-select-413p')?.value || ''; if(selected){ const u=userByNameR(selected); if(u) return u; } if(currentUser) return {username:currentUser.username, displayName:currentUser.operator, operator:currentUser.operator, role:currentUser.role, operatorCode:currentUser.operatorCode, photoDataUrl:currentUser.photoDataUrl, enabled:true, permissions:currentUser.permissions, level:currentUser.level}; return null; }
  function profileRowsR(u){ let rows=allRowsR().filter(r=>matchesUserR(r,u)); const rf=$r('operator-profile-result-filter-413p')?.value||'all'; if(rf==='pass') rows=rows.filter(r=>rowResultR(r)==='PASS'); if(rf==='fail') rows=rows.filter(r=>rowResultR(r)==='FAIL'); const from=$r('operator-profile-date-from-413p')?.value; const to=$r('operator-profile-date-to-413p')?.value; if(from){ const fd=new Date(from+'T00:00:00'); rows=rows.filter(r=>{const d=rowDateR(r); return !d || d>=fd;}); } if(to){ const td=new Date(to+'T23:59:59'); rows=rows.filter(r=>{const d=rowDateR(r); return !d || d<=td;}); } const q=String($r('operator-profile-search-413p')?.value||'').trim().toLowerCase(); if(q) rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q)); return rows; }
  window.refreshOperatorProfile413O = function(){
    const box=$r('operator-profile-content'); if(!box) return;
    const u=selectedProfileUserR();
    if(!u){ box.innerHTML='<div class="hint">Esegui login per vedere profilo, autorizzazioni e statistiche personali.</div>'; return; }
    const role=roleByNameR(u.role)||{level:u.level||0,permissions:u.permissions||[]}; const m=roleMeta413R(u.role,role.level||u.level); const perms=role.permissions||u.permissions||[];
    const rows=profileRowsR(u); const total=rows.length; const pass=rows.filter(r=>rowResultR(r)==='PASS').length; const fail=rows.filter(r=>rowResultR(r)==='FAIL').length; const fp=total?Math.round((pass/total)*1000)/10:0; const durations=rows.map(r=>Number(r?.duration_ms||r?.durationMs||r?.elapsed_ms||r?.elapsedMs||r?.execution_time_ms||r?.time_ms||0)).filter(n=>n>0); const avg=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length/1000):0; const last=rows.map(rowDateR).filter(Boolean).sort((a,b)=>b-a)[0]; const recipes=new Set(rows.map(r=>r?.recipe||r?.recipeName||r?.recipe_name).filter(Boolean)); const initials=String(u.displayName||u.operator||u.username||'?').slice(0,1).toUpperCase();
    const recent=rows.slice(-12).reverse().map(r=>`<tr><td>${rowDateR(r)?rowDateR(r).toLocaleString('it-IT'):'N/D'}</td><td>${escR(r?.serial||r?.serialNumber||r?.serial_dut||r?.sn||'N/D')}</td><td>${escR(r?.recipe||r?.recipeName||r?.recipe_name||'N/D')}</td><td><b class="${rowResultR(r)==='PASS'?'ok413p':'ko413p'}">${escR(rowResultR(r))}</b></td></tr>`).join('') || '<tr><td colspan="4">Nessun test trovato con i filtri attuali.</td></tr>';
    box.innerHTML=`<div class="social-profile-413p profile-413r"><div class="social-cover-413p profile-cover-413r ${m.tone}"><div class="profile-avatar-413o social-avatar-413p">${u.photoDataUrl?`<img src="${escR(u.photoDataUrl)}">`:escR(initials)}</div><div class="social-title-413p"><h1>${escR(u.displayName||u.operator||u.username)}</h1><p>Username ${escR(u.username)} · Codice collaboratore <b>${escR(u.operatorCode||u.username||'N/D')}</b></p><div class="role-identity-413r"><span class="role-symbol-inline-413r ${m.tone}">${m.badge}</span><b>${escR(m.label)}</b><span>${m.level} · ${escR(m.color)}</span><em>${escR(m.desc)}</em></div></div></div><div class="profile-kpis-413o social-kpis-413p profile-kpis-413r"><div><b>${total}</b><span>Test filtrati</span></div><div><b>${pass}</b><span>PASS</span></div><div><b>${fail}</b><span>FAIL</span></div><div><b>${fp}%</b><span>FPY</span></div><div><b>${avg}s</b><span>Tempo medio</span></div><div><b>${recipes.size}</b><span>Ricette</span></div><div><b>${last?last.toLocaleDateString('it-IT'):'N/D'}</b><span>Ultimo test</span></div></div><h3>Autorizzazioni ruolo: ${m.badge} ${escR(m.label)} ${m.level}</h3>${permissionsMatrix413R(perms)}<h3>Storico recente filtrato</h3><div class="profile-table-wrap-413p"><table class="profile-table-413p"><thead><tr><th>Data</th><th>Seriale</th><th>Ricetta</th><th>Esito</th></tr></thead><tbody>${recent}</tbody></table></div></div>`;
  };
  try{
    const profileBtn=[...document.querySelectorAll('button')].filter(b=>/Profilo operatore/i.test(b.textContent||''));
    profileBtn.forEach(b=>b.textContent=(b.textContent||'').replace(/Profilo operatore/ig,'Profilo collaboratore'));
    const title=$r('operator-profile-tab')?.querySelector('h2'); if(title) title.textContent='👤 Profilo collaboratore';
    const selLbl=$r('operator-profile-select-413p')?.closest('label'); if(selLbl && selLbl.childNodes[0]) selLbl.childNodes[0].nodeValue='Collaboratore\n              ';
  }catch(_e){}
  setTimeout(()=>{ try{ refreshRolesUsers413R(); window.refreshOperatorProfile413O(); }catch(_e){} }, 350);
})();
