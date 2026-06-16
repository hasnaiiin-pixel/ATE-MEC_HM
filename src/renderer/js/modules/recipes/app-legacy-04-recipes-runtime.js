/* AT-MEC_HM_4.16D_CORE_MODULE_SPLIT
 * Recipe editor, Recipe Pro, runtime variables, flow e sub-ricette.
 * Estratto da app-legacy-core.js preservando ordine di esecuzione.
 */
async function loadAppSettings() {
  if (!api) return;
  try {
    const cfg = await api.getAppSettings();
    const pick = (...keys) => {
      for (const k of keys) if (cfg && cfg[k]) return cfg[k];
      return '';
    };
    const setImg = (id, data) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (data) { el.src = data; el.style.display = 'inline-block'; }
      else { el.removeAttribute('src'); el.style.display = 'none'; }
    };

    const loginLarge = pick('loginLargeLogoDataUrl');
    const loginSmall = pick('loginSmallLogoDataUrl');
    const hmiLarge = pick('hmiLargeLogoDataUrl', 'appLargeLogoDataUrl');
    const developerSmall = pick('developerSmallLogoDataUrl', 'hmiSmallLogoDataUrl');
    const reportLarge = pick('reportLargeLogoDataUrl', 'companyLogoDataUrl');
    const reportSmall = pick('reportSmallLogoDataUrl', 'builderLogoDataUrl');

    setImg('loginLarge-logo-preview', loginLarge);
    setImg('loginSmall-logo-preview', loginSmall);
    setImg('hmiLarge-logo-preview', hmiLarge);
    setImg('developerSmall-logo-preview', developerSmall);
    setImg('reportLarge-logo-preview', reportLarge);
    setImg('reportSmall-logo-preview', reportSmall);

    // Vecchi preview mantenuti per compatibilità con Settings
    setImg('company-logo-preview', reportLarge);
    setImg('builder-logo-preview', reportSmall);
    setImg('appLarge-logo-preview', hmiLarge);

    // Loghi realmente visibili nell'interfaccia
    setImg('login-large-logo', loginLarge);
    setImg('login-small-logo', loginSmall);
    const fallback = document.getElementById('login-logo-fallback');
    if (fallback) fallback.style.display = loginSmall ? 'none' : 'inline';

    setImg('app-large-logo', hmiLarge);
    setImg('hmi-main-large-logo', hmiLarge);
    const title = document.getElementById('app-title-logo');
    if (title) title.style.display = hmiLarge ? 'none' : 'inline';
    setImg('developer-small-logo', developerSmall);
    setImg('login-developer-logo', developerSmall);
    setImg('prod-company-logo', hmiLarge || loginLarge || reportLarge);
    setImg('prod-dev-logo', developerSmall || reportSmall);
    
    if (cfg.keysightMode) { const el=document.getElementById('cfg-keysight-mode'); if(el) el.value=cfg.keysightMode; }
    if (cfg.keysightIp) { const el=document.getElementById('cfg-keysight-ip'); if(el) el.value=cfg.keysightIp; const mh=document.getElementById('meter-host'); if(mh) mh.value=cfg.keysightIp; const mv=document.getElementById('meter-visa'); if(mv) mv.value=cfg.keysightIp; }
    if (cfg.keysightPort) { const el=document.getElementById('cfg-keysight-port'); if(el) el.value=cfg.keysightPort; const mp=document.getElementById('meter-port'); if(mp) mp.value=cfg.keysightPort; }
    const mm=document.getElementById('meter-conn-mode'); if(mm && cfg.keysightMode) mm.value=cfg.keysightMode;
    syncKeysightMeterMode();
    updateKeysightConnectionHint();

    applyLogoBackgroundMode(cfg.logoBackgroundMode || 'transparent');
    const bg = cfg.logoBgModes || {};
    [['loginLarge','loginLarge-logo-preview'],['loginSmall','loginSmall-logo-preview'],['hmiLarge','hmiLarge-logo-preview'],['developerSmall','developerSmall-logo-preview'],['reportLarge','reportLarge-logo-preview'],['reportSmall','reportSmall-logo-preview'],['loginLarge','login-large-logo'],['developerSmall','login-developer-logo'],['hmiLarge','app-large-logo'],['hmiLarge','hmi-main-large-logo'],['developerSmall','developer-small-logo'],['hmiLarge','prod-company-logo']].forEach(([k,id]) => applyLogoBgToElement(id, bg[k] || cfg.logoBackgroundMode || 'transparent'));
    [['developerSmall','prod-dev-logo']].forEach(([k,id]) => applyLogoBgToElement(id, bg[k] || cfg.logoBackgroundMode || 'transparent'));
    ['loginLarge','loginSmall','hmiLarge','developerSmall','reportLarge','reportSmall'].forEach(k => setLogoModeSelect(k, bg[k] || cfg.logoBackgroundMode || 'transparent'));

    refreshBrandingPermissions();
  const lotEl=document.getElementById('lot-number'); if(lotEl && !lotEl.value) lotEl.value=activeLotNumber;
  const prodLot=document.getElementById('prod-lot-number'); if(prodLot && !prodLot.value) prodLot.value=activeLotNumber;
  } catch(e) {
    console.warn('loadAppSettings failed', e);
  }
}

function refreshBrandingPermissions() {
  const can = userCanManageBranding();
  document.querySelectorAll('.brand-admin-only').forEach(btn => { btn.disabled = !can; btn.title = can ? '' : 'Solo Admin'; });
  const warn = document.getElementById('branding-admin-warning');
  if (warn) warn.style.display = can ? 'none' : 'block';
}

async function refreshRolesUsers() {
  if (!api) return;
  try {
    const rolesRaw = await api.listRoles();
    const roles = Array.isArray(rolesRaw) ? rolesRaw : [];
    const canManage = userCanManageUsers();
    let users = [];
    if (canManage) {
      const usersRaw = await api.listUsers();
      users = Array.isArray(usersRaw) ? usersRaw : [];
      if (!Array.isArray(usersRaw) && usersRaw?.error) addLog(document.getElementById('sys-log'), 'ℹ️ Elenco utenti protetto: ' + escapeHtml(usersRaw.error), 'warn');
    }
    const roleOptions = roles.map(r => `<option value="${escapeHtml(r.role)}">${escapeHtml(r.role)} — livello ${r.level ?? 0}</option>`).join('');
    const sel = document.getElementById('new-user-role'); if (sel) sel.innerHTML = roleOptions;
    const roleSel = document.getElementById('existing-role-select');
    if (roleSel) {
      const prev = roleSel.value;
      roleSel.innerHTML = '<option value="">— nuovo ruolo —</option>' + roleOptions;
      if ([...roleSel.options].some(o => o.value === prev)) roleSel.value = prev;
    }
    const userSel = document.getElementById('users-select');
    if (userSel) userSel.innerHTML = '<option value="">— nuovo utente —</option>' + users.map(u => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)} — ${escapeHtml(u.operatorCode || '')} — ${escapeHtml(u.role)} ${u.enabled===false?'(disabilitato)':''}</option>`).join('');
    const roleRows = roles.map(r => `<div class="port-card"><div><b>${escapeHtml(r.role)}</b><div class="detail-line">Livello ${r.level ?? 0} · ${(r.permissions||[]).map(escapeHtml).join(', ') || 'nessun permesso'}</div></div></div>`).join('') || '<div class="hint">Nessun ruolo configurato.</div>';
    const userRows = canManage
      ? (users.map(u => `<div class="user-row-modern-413o" onclick="selectUserFromList('${escapeJs(u.username)}')"><div class="avatar-mini-413o">${u.photoDataUrl ? `<img src="${escapeHtml(u.photoDataUrl)}">` : escapeHtml(String(u.displayName||u.username||'?').slice(0,1).toUpperCase())}</div><div><b>${escapeHtml(u.displayName||u.username)}</b><div class="detail-line">${escapeHtml(u.username)} · codice ${escapeHtml(u.operatorCode||u.username)} · ${escapeHtml(u.role)} · livello ${u.level ?? 0} · ${u.enabled===false?'DISABILITATO':'attivo'}</div></div></div>`).join('') || '<div class="hint">Nessun utente creato.</div>')
      : '<div class="hint">Elenco utenti nascosto: serve il permesso <b>manage_users</b>.</div>';
    const list = document.getElementById('roles-users-list');
    if (list) list.innerHTML = `<h4>Ruoli disponibili</h4>${roleRows}<h4 style="margin-top:10px;">Credenziali utenti</h4>${userRows}`;
    window.__usersCache = users;
    window.__rolesCache = roles;
    applyUserAdminLock(canManage);
  } catch(e) { addLog(document.getElementById('sys-log'), '❌ Errore lettura utenti/ruoli: ' + escapeHtml(normalizeError(e)), 'fail'); }
}

function escapeJs(v) { return String(v ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' '); }

function applyUserAdminLock(canManage = userCanManageUsers()) {
  document.querySelectorAll('#users-tab input, #users-tab select, #users-tab button').forEach(el => {
    if (el.id === 'users-select') { el.disabled = false; return; }
    el.disabled = !canManage;
  });
  const hint = document.getElementById('user-admin-hint');
  if (hint) hint.textContent = canManage ? 'Admin abilitato: puoi creare, modificare, disabilitare ed eliminare utenti.' : 'Accesso sola lettura: solo Admin può modificare utenti e ruoli.';
}

function clearUserForm() {
  selectedUserName = '';
  ['new-user-name','new-user-display','new-user-pass','new-user-code'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  selectedUserPhotoDataUrl = ''; selectedUserOperatorCode = ''; updateUserPhotoPreview413O('');
  const us = document.getElementById('users-select'); if (us) us.value = '';
}

function selectUserFromList(username) {
  selectedUserName = username || '';
  const users = window.__usersCache || [];
  const u = users.find(x => x.username === username);
  const us = document.getElementById('users-select'); if (us) us.value = username || '';
  if (!u) { clearUserForm(); return; }
  document.getElementById('new-user-name').value = u.username || '';
  document.getElementById('new-user-display').value = u.displayName || '';
  const codeEl = document.getElementById('new-user-code'); if (codeEl) codeEl.value = u.operatorCode || u.username || '';
  selectedUserOperatorCode = u.operatorCode || u.username || '';
  selectedUserPhotoDataUrl = u.photoDataUrl || ''; updateUserPhotoPreview413O(selectedUserPhotoDataUrl);
  document.getElementById('new-user-role').value = u.role || '';
  document.getElementById('new-user-pass').value = '';
}

function applyRoleLevelPreset() {
  const level = parseInt(document.getElementById('new-role-level')?.value || '10', 10);
  const map = {
    run_test: level >= 10,
    debug_mode: level >= 30,
    edit_recipe: level >= 60,
    config_hardware: level >= 60,
    manage_branding: level >= 80,
    edit_layout: level >= 80,
    test_elements: level >= 80,
    show_ui_ids: level >= 80,
    manage_users: level >= 100,
    manage_data: level >= 60
  };
  document.querySelectorAll('.perm-check').forEach(ch => { ch.checked = !!map[ch.value]; });
}

function loadRoleIntoEditor(roleName) {
  const roles = window.__rolesCache || [];
  const role = roles.find(r => r.role === roleName);
  const nameEl = document.getElementById('new-role-name');
  const levelEl = document.getElementById('new-role-level');
  if (!role) {
    if (nameEl) nameEl.value = '';
    return;
  }
  if (nameEl) nameEl.value = role.role || '';
  if (levelEl) levelEl.value = String(role.level || 10);
  const perms = new Set((role.permissions || []).map(p => p === 'manage_archive' ? 'manage_data' : p));
  document.querySelectorAll('.perm-check').forEach(ch => { ch.checked = perms.has(ch.value); });
}
window.loadRoleIntoEditor = loadRoleIntoEditor;

async function createRoleFromUi() {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può modificare ruoli.', 'fail'); return; }
  const role = document.getElementById('new-role-name').value.trim();
  const permissions = [...document.querySelectorAll('.perm-check:checked')].map(x => x.value === 'manage_archive' ? 'manage_data' : x.value);
  const level = parseInt(document.getElementById('new-role-level')?.value || '10', 10);
  const res = await withTimeout(api.createRole(role, permissions, level), 2500, 'crea ruolo');
  addLog(document.getElementById('sys-log'), res.ok ? `Ruolo creato/aggiornato: <b>${escapeHtml(role)}</b>` : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  await withTimeout(refreshRolesUsers(), 2500, 'aggiorna ruoli');
  if (res.ok) await syncCurrentUserFromBackend413O('ruolo salvato');
  const roleSel = document.getElementById('existing-role-select'); if (roleSel && res.ok) roleSel.value = role;
}

async function createUserFromUi() {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può creare o modificare utenti.', 'fail'); return; }
  const res = await api.createUser(
    document.getElementById('new-user-name').value,
    document.getElementById('new-user-display').value,
    document.getElementById('new-user-role').value,
    document.getElementById('new-user-pass').value,
    document.getElementById('new-user-code')?.value || selectedUserOperatorCode || '',
    selectedUserPhotoDataUrl || ''
  );
  addLog(document.getElementById('sys-log'), res.ok ? 'Credenziali create/aggiornate.' : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  await refreshRolesUsers();
  if (res.ok) await syncCurrentUserFromBackend413O('utente salvato');
}

async function deleteSelectedUser() {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può eliminare utenti.', 'fail'); return; }
  const username = selectedUserName || document.getElementById('new-user-name').value.trim();
  if (!username) { alert('Seleziona un utente da eliminare.'); return; }
  if (!confirm(`Eliminare definitivamente l'utente "${username}"?`)) return;
  const res = await api.deleteUser(username);
  addLog(document.getElementById('sys-log'), res.ok ? `Utente eliminato: <b>${escapeHtml(username)}</b>` : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  clearUserForm();
  await refreshRolesUsers();
  if (res.ok) await syncCurrentUserFromBackend413O('utente eliminato');
}

async function toggleSelectedUser(enabled) {
  if (!userCanManageUsers()) { addLog(document.getElementById('sys-log'), '⛔ Solo Admin può abilitare/disabilitare utenti.', 'fail'); return; }
  const username = selectedUserName || document.getElementById('new-user-name').value.trim();
  if (!username) { alert('Seleziona un utente.'); return; }
  const res = await api.setUserEnabled(username, !!enabled);
  addLog(document.getElementById('sys-log'), res.ok ? `Utente ${enabled ? 'abilitato' : 'disabilitato'}: <b>${escapeHtml(username)}</b>` : `❌ ${escapeHtml(res.error)}`, res.ok ? 'info' : 'fail');
  await refreshRolesUsers();
  if (res.ok) await syncCurrentUserFromBackend413O('stato utente modificato');
}

function updateUserPhotoPreview413O(dataUrl) {
  const box = document.getElementById('new-user-photo-preview');
  if (!box) return;
  box.innerHTML = dataUrl ? `<img src="${escapeHtml(dataUrl)}">` : '<span>👤</span>';
}
function loadUserPhotoFromInput413O(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { selectedUserPhotoDataUrl = String(reader.result || ''); updateUserPhotoPreview413O(selectedUserPhotoDataUrl); };
  reader.readAsDataURL(file);
}
window.loadUserPhotoFromInput413O = loadUserPhotoFromInput413O;
window.updateUserPhotoPreview413O = updateUserPhotoPreview413O;


function getKeysightConnFromUi(prefixSource='meter') {
  const modeEl = document.getElementById(prefixSource === 'settings' ? 'cfg-keysight-mode' : 'meter-conn-mode');
  const mode = modeEl?.value || 'ETH';
  if (prefixSource === 'settings') {
    const raw = document.getElementById('cfg-keysight-ip')?.value || '127.0.0.1';
    const baud = Number(document.getElementById('cfg-keysight-port')?.value || (mode === 'ETH' ? 5025 : 9600));
    const conn = mode === 'USB_COM' ? 'usb://' + raw : mode === 'USB_VISA' ? 'visa://' + raw : raw;
    return { mode, conn, baud, raw };
  }
  const host = document.getElementById('meter-host')?.value || '127.0.0.1';
  const com = document.getElementById('meter-com')?.value || document.getElementById('meter-host')?.value || '';
  const visa = document.getElementById('meter-visa')?.value || '';
  const port = Number(document.getElementById('meter-port')?.value || (mode === 'ETH' ? 5025 : 9600));
  const conn = mode === 'USB_COM' ? 'usb://' + com : mode === 'USB_VISA' ? 'visa://' + visa : host;
  return { mode, conn, baud: port, raw: mode === 'USB_COM' ? com : mode === 'USB_VISA' ? visa : host };
}

function syncKeysightMeterMode() {
  const mode = document.getElementById('meter-conn-mode')?.value || 'ETH';
  const hostBox = document.getElementById('meter-host-box');
  const comBox = document.getElementById('meter-com-box');
  const visaBox = document.getElementById('meter-visa-box');
  const hostLabel = document.getElementById('meter-host-label');
  const portLabel = document.getElementById('meter-port-label');
  const port = document.getElementById('meter-port');
  if (hostBox) hostBox.style.display = mode === 'ETH' ? 'block' : 'none';
  if (comBox) comBox.style.display = mode === 'USB_COM' ? 'block' : 'none';
  if (visaBox) visaBox.style.display = mode === 'USB_VISA' ? 'block' : 'none';
  if (hostLabel) hostLabel.textContent = mode === 'ETH' ? 'IP / Host' : 'Risorsa';
  if (portLabel) portLabel.textContent = mode === 'ETH' ? 'Porta TCP' : mode === 'USB_COM' ? 'Baud USB/COM' : 'Bridge / timeout';
  if (port) { if (mode === 'ETH' && (port.value === '9600' || !port.value)) port.value = '5025'; if (mode !== 'ETH' && (port.value === '5025' || !port.value)) port.value = '9600'; }
}

async function scanKeysightUsbPorts() {
  const sel = document.getElementById('meter-com');
  if (!sel || !api?.scanSerialPorts) return;
  try {
    const ports = await withTimeout(api.scanSerialPorts(), 2500, 'scan Keysight USB');
    const opts = ['<option value="">Seleziona COM</option>'].concat((ports || []).map(p => `<option value="${escapeHtml(p.path || p)}">${escapeHtml(p.path || p)} ${escapeHtml(p.manufacturer || '')}</option>`));
    sel.innerHTML = opts.join('');
    addLog(document.getElementById('keysight-log'), `🔎 Porte USB/COM trovate: ${(ports || []).length}`, 'info');
  } catch(e) { addLog(document.getElementById('keysight-log'), `❌ Scan USB Keysight: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}


async function scanKeysightVisaResources() {
  const inp = document.getElementById('meter-visa');
  if (!api?.scanVisaResources) {
    addLog(document.getElementById('keysight-log'), '⚠️ Scan VISA non disponibile in questa build.', 'warn');
    return;
  }
  try {
    addLog(document.getElementById('keysight-log'), '🔎 Scansione VISA in corso...', 'info');
    const rows = await withTimeout(api.scanVisaResources(), 9000, 'scan VISA Keysight');
    const okRows = (rows || []).filter(r => r && r.ok && r.resource);
    if (okRows.length && inp) inp.value = okRows[0].resource;
    if (!okRows.length) {
      const err = rows?.[0]?.error || 'Nessuna risorsa VISA trovata. Verifica Keysight Connection Expert e PyVISA.';
      addLog(document.getElementById('keysight-log'), `⚠️ ${escapeHtml(err)}`, 'warn');
      return;
    }
    okRows.forEach(r => addLog(document.getElementById('keysight-log'), `✅ VISA: ${escapeHtml(r.resource)} ${r.idn ? '— ' + escapeHtml(r.idn) : ''}`, 'pass'));
  } catch(e) {
    addLog(document.getElementById('keysight-log'), `❌ Scan VISA: ${escapeHtml(normalizeError(e))}`, 'fail');
  }
}

async function connectKeysightFromPage() {
  if (!api) return;
  const cfg = getKeysightConnFromUi('meter');
  const st = document.getElementById('keysight-status');
  try {
    if (st) st.textContent = 'Connessione Keysight in corso...';
    const res = await guardedUi('Connessione Keysight 34461A', () => api.reconnectHardware([{ name:'Keysight_34461A', conn: cfg.conn, baud: cfg.baud }]), { timeoutMs: 15000, fallback: null });
    if (!res) throw new Error('Timeout connessione Keysight');
    latestHardwareStatuses = await api.getHardwareStatuses().catch(() => latestHardwareStatuses);
    const k = getHardwareStatusByName('Keysight_34461A');
    const txt = k && !k.mock ? `✅ Keysight 34461A LIVE — ${cfg.raw}` : `⚠️ Keysight 34461A non LIVE/MOCK — ${cfg.raw}. Prova *IDN? e verifica Resource VISA.`;
    if (st) st.textContent = txt;
    addLog(document.getElementById('keysight-log'), txt, k && !k.mock ? 'pass' : 'warn');
  } catch(e) { if (st) st.textContent = '❌ ' + normalizeError(e); addLog(document.getElementById('keysight-log'), `❌ Connessione: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

async function keysightIdn() {
  // AT-MEC_HM_3.5: prima assicura la connessione USB/VISA/TCP, poi interroga *IDN?.
  const k = getHardwareStatusByName('Keysight_34461A');
  if (!k || k.mock === true || k.connected === false) {
    await connectKeysightFromPage();
  }
  await queryMeter('*IDN?', 'keysight-status', '');
}

async function keysightManualQuery() {
  const cmd = document.getElementById('meter-manual-cmd')?.value || '*IDN?';
  await queryMeter(cmd, 'keysight-status', '');
}

async function saveKeysightSettingsFromPage() {
  if (!api?.saveAppSettings) return;
  const cfg = getKeysightConnFromUi('meter');
  try {
    const old = await api.getAppSettings?.() || {};
    const raw = cfg.raw;
    await api.saveAppSettings({ ...old, keysightMode: cfg.mode, keysightIp: raw, keysightPort: cfg.baud });
    addLog(document.getElementById('keysight-log'), '💾 Impostazioni Keysight salvate.', 'pass');
    const sm = document.getElementById('cfg-keysight-mode'); if (sm) sm.value = cfg.mode;
    const si = document.getElementById('cfg-keysight-ip'); if (si) si.value = raw;
    const sp = document.getElementById('cfg-keysight-port'); if (sp) sp.value = String(cfg.baud);
  } catch(e) { addLog(document.getElementById('keysight-log'), `❌ Salvataggio: ${escapeHtml(normalizeError(e))}`, 'fail'); }
}

function updateKeysightConnectionHint() {
  const mode = document.getElementById('cfg-keysight-mode')?.value || 'ETH';
  const hint = document.getElementById('keysight-conn-hint');
  const port = document.getElementById('cfg-keysight-port');
  if (mode === 'USB_COM') {
    if (hint) hint.textContent = 'USB/COM: seleziona o inserisci COMx se Windows espone il 34461A come porta virtuale.';
    if (port && port.value === '5025') port.value = '9600';
  } else if (mode === 'USB_VISA') {
    if (hint) hint.textContent = 'USB/VISA: inserisci resource USB0::...::INSTR oppure usa 🔎 VISA. Richiede Keysight IO Libraries + Python PyVISA.';
    if (port && port.value === '5025') port.value = '9600';
  } else {
    if (hint) hint.textContent = 'Ethernet consigliata: IP dello strumento e porta SCPI 5025.';
    if (port && port.value === '9600') port.value = '5025';
  }
}

async function applyHwSettings() {
  if (hwApplyInProgress) return;
  hwApplyInProgress = true;
  stopWizardLive();
  if (!api) {
    document.getElementById('hw-detail-status').textContent = '⚠️ Disponibile solo in Electron';
    hwApplyInProgress = false;
    return;
  }
  try {
    const configs = [
      { name: 'Keysight_34461A', conn: getKeysightConnFromUi('settings').conn,  baud: parseInt(document.getElementById('cfg-keysight-port').value) },
      { name: 'AimTTi_PL303',   conn: document.getElementById('cfg-tti-com').value,        baud: parseInt(document.getElementById('cfg-tti-baud').value) },
      { name: 'modbus_serial',  conn: document.getElementById('cfg-esp-com').value,        baud: parseInt(document.getElementById('cfg-esp-baud').value) }
    ];
    if (api.saveAppSettings) { try { await api.saveAppSettings({ esp32Port: document.getElementById('cfg-esp-com').value, esp32Baud: parseInt(document.getElementById('cfg-esp-baud').value), ttiPort: document.getElementById('cfg-tti-com').value, ttiBaud: parseInt(document.getElementById('cfg-tti-baud').value), keysightMode: document.getElementById('cfg-keysight-mode')?.value || 'ETH', keysightIp: document.getElementById('cfg-keysight-ip').value, keysightPort: parseInt(document.getElementById('cfg-keysight-port').value) }); } catch {} }
    const statuses = await guardedUi('Riconnessione hardware', () => api.reconnectHardware(configs), { timeoutMs: 7000, fallback: null });
    if (!statuses) throw new Error('Timeout riconnessione hardware');
    updateHwBadges(statuses);
    const msg = statuses.map(s => `${s.name}: ${s.mock ? '⚡MOCK' : '✅LIVE'}`).join('  ');
    document.getElementById('hw-detail-status').textContent = msg;
  } catch(e) {
    document.getElementById('hw-detail-status').textContent = '❌ ' + normalizeError(e);
  } finally {
    hwApplyInProgress = false;
  }
}

function syncRecipeNameInputs(source) {
  const a = document.getElementById('recipe-name-inp');
  const b = document.getElementById('recipe-name-page');
  const val = source === 'page' ? b?.value : a?.value;
  if (a && source === 'page') a.value = val;
  if (b && source !== 'page') b.value = val;
  recipe.recipe_name = val || recipe.recipe_name;
}
function getPowerSourceValue() {
  const el = document.getElementById('power-source') || document.getElementById('power-source-page');
  return el?.value || recipe.power_metadata || 'MANUAL_POWER';
}
function setPowerSourceValue(value) {
  const safeValue = value || recipe.power_metadata || 'MANUAL_POWER';
  const a = document.getElementById('power-source');
  const b = document.getElementById('power-source-page');
  if (a) a.value = safeValue;
  if (b) b.value = safeValue;
  recipe.power_metadata = safeValue;
  return safeValue;
}

function syncPowerInputs(source) {
  const a = document.getElementById('power-source');
  const b = document.getElementById('power-source-page');
  const val = source === 'page' ? (b?.value || getPowerSourceValue()) : (a?.value || getPowerSourceValue());
  setPowerSourceValue(val);
  updateRecipeHealth();
}
function syncRecipeEnabledInputs(source) {
  const a = document.getElementById('recipe-enabled');
  const b = document.getElementById('recipe-enabled-page');
  const val = source === 'page' ? !!b?.checked : !!a?.checked;
  if (a && source === 'page') a.checked = val;
  if (b && source !== 'page') b.checked = val;
  recipe.enabled = val;
  renderSteps();
}
function openStepWizardFromPage() {
  const t = document.getElementById('new-step-type-page')?.value;
  if (t && document.getElementById('new-step-type')) document.getElementById('new-step-type').value = t;
  const catByType = { DigitalOutputSet:'digital_output', DigitalInputCheck:'digital_input', AnalogInputMeasurement:'measure_analog', VoltageMeasurement:'measure_voltage', CurrentMeasurement:'measure_current', ResistanceTest:'measure_resistance', FrequencyTest:'measure_frequency', SCPICommand:'scpi', Delay:'delay', FirmwareFlash:'firmware_flash' };
  if (t && document.getElementById('w-category')) document.getElementById('w-category').value = catByType[t] || 'measure_voltage';
  openStepWizard();
}

function toggleRecipeSimpleMode(on=true) {
  document.body.classList.toggle('recipe-simple-mode', Boolean(on));
  try { localStorage.setItem('atmec_recipe_simple_mode', Boolean(on) ? '1' : '0'); } catch {}
}
function recipeStepIcon(step) {
  const t = String(step?.type || '');
  if (t.includes('PowerSupply')) return step?.ps_output_on === false || step?.value?.outputOn === false ? '🛑' : '🔋';
  if (t.includes('Current')) return '📈';
  if (t.includes('Voltage') || t.includes('Analog')) return '📏';
  if (t.includes('Resistance')) return 'Ω';
  if (t.includes('Frequency')) return 'Hz';
  if (t.includes('Manual')) return '✋';
  if (t.includes('Delay')) return '⏱';
  if (t.includes('DigitalOutput')) return '🔌';
  if (t.includes('DigitalInput')) return '👁️';
  return '🧩';
}
function describeRecipeStep(step) {
  const chips = [];
  const type = String(step?.type || '');
  const push = (k,v) => { if (v !== undefined && v !== null && v !== '') chips.push(`<span class="recipe-value-chip"><b>${escapeHtml(k)}</b> ${escapeHtml(v)}</span>`); };
  if (type === 'PowerSupplySet') { push('CH', step.ps_channel || step.channel || 1); push('V', step.ps_voltage ?? step.value?.voltage); push('I max', step.ps_current ?? step.value?.current); push('OUT', (step.ps_output_on ?? step.value?.outputOn) === false ? 'OFF' : 'ON'); }
  else if (type === 'PowerSupplyMeasureCurrent') { push('CH', step.channel || step.ps_channel || 1); push('Min', step.min); push('Max', step.max); push('Unità', step.unit || 'A'); }
  else if (type.includes('Measurement') || type.includes('Test')) { push('Device', step.device_mapping || 'Manuale'); push('Min', step.min); push('Max', step.max); push('Unità', step.unit); }
  else if (type === 'ManualMeasurement') { push('Tipo', step.manual_measure_type || (step.manual_input_enabled ? 'MANUAL_VALUE' : 'PASS_FAIL')); push('Origine', step.measurement_mode || (step.manual_input_enabled ? 'MANUALE' : 'AUTO')); push('Target', step.target); push('Tol', step.tolerance); push('Min', step.min); push('Max', step.max); push('Unità', step.unit); }
  else if (type === 'Delay') { push('Attesa', (step.timeout || 1000) + ' ms'); }
  else if (type === 'GotoIfFail') { push('Vai a step_id', step.target_step || 1); }
  else if (type === 'LoopStart') { push('Ripeti', (step.value || 1) + ' volte'); }
  if (step.save_as_variable) push('Salva var', step.save_as_variable);
  if (step.compare_variable) push('Usa var', step.compare_variable);
  else { push('Device', step.device_mapping || 'system'); push('GPIO', step.channel); push('Timeout', step.timeout ? step.timeout + ' ms' : ''); }
  return chips.join(' ');
}
function addQuickRecipeStep(kind) {
  const base = {
    ps_on:{ type:'PowerSupplySet', label:'Alimentatore ON', description:'Imposta e abilita uscita alimentatore', io_type:'SCPI', device_mapping:'AimTTi_PL303', channel:1, ps_channel:1, ps_voltage:24, ps_current:1, ps_output_on:true, value:{ voltage:24, current:1, outputOn:true }, unit:'V/A', timeout:3000 },
    ps_off:{ type:'PowerSupplySet', label:'Alimentatore OFF sicuro', description:'Disattiva uscita alimentatore', io_type:'SCPI', device_mapping:'AimTTi_PL303', channel:1, ps_channel:1, ps_voltage:0, ps_current:0, ps_output_on:false, value:{ voltage:0, current:0, outputOn:false }, unit:'V/A', timeout:3000 },
    measure_voltage:{ type:'VoltageMeasurement', label:'Misura tensione', description:'Misura tensione con limiti e tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:VOLT:DC?', target:24.0, tolerance:0.5, min:23.5, max:24.5, unit:'V', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    measure_current:{ type:'CurrentMeasurement', label:'Misura corrente', description:'Misura consumo in ampere con tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:CURR:DC?', target:0.5, tolerance:0.5, min:0, max:1, unit:'A', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    measure_ohm:{ type:'ResistanceTest', label:'Misura resistenza', description:'Misura resistenza con tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:RES?', target:500, tolerance:500, min:0, max:1000, unit:'Ω', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    multi_channel_resistance:{ type:'MultiChannelResistanceTest', label:'Test multi-canale resistenza', description:'Misura resistenza canali con uscite associate e valori separati', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:RES?', unit:'Ω', timeout:3000, stop_on_fail:false, channel_fail_policy:'continue', channels:Array.from({length:10},(_,n)=>({ name:'CH'+(n+1), output:'OUT'+(n+1), min:10, max:50, stable_ms:500, enabled:true })) },
    measure_freq:{ type:'FrequencyTest', label:'Misura frequenza', description:'Misura frequenza con tolleranza', io_type:'SCPI', device_mapping:'Keysight_34461A', command:'MEAS:FREQ?', target:1000, tolerance:10, min:990, max:1010, unit:'Hz', timeout:2500, measurement_mode:'auto_with_fallback', manual_fallback_enabled:true },
    measure_continuity:{ type:'ManualMeasurement', label:'Controllo continuità', description:'Verifica continuità circuito con valore Ohm manuale/strumento', io_type:'SCPI', device_mapping:'Keysight_34461A', manual_measure_type:'SCPI_OHM', command:'MEAS:RES?', manual_input_enabled:false, manual_fallback_enabled:true, min:0, max:10, unit:'Ω', timeout:2500 },
    measure_temp:{ type:'ManualMeasurement', label:'Misura temperatura', description:'Inserimento temperatura misurata', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'TEMPERATURE', manual_input_enabled:true, min:15, max:45, unit:'°C', timeout:0 },
    measure_power:{ type:'ManualMeasurement', label:'Misura potenza', description:'Inserimento o calcolo potenza assorbita', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'POWER', manual_input_enabled:true, min:0, max:100, unit:'W', timeout:0 },
    manual_value:{ type:'ManualMeasurement', label:'Inserimento misura manuale', description:'L’operatore inserisce manualmente il valore misurato', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'MANUAL_VALUE', manual_input_enabled:true, min:0, max:999, unit:'', timeout:0 },
    manual_passfail:{ type:'ManualMeasurement', label:'Controllo manuale PASS/FAIL', description:'L’operatore conferma esito manuale', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'CONFIRM', manual_input_enabled:false, expected_result:'PASS_FAIL', timeout:0 },
    delay:{ type:'Delay', label:'Attesa stabilizzazione', description:'Pausa prima dello step successivo', io_type:'SYSTEM', device_mapping:'system', unit:'ms', timeout:1000 },
    save_variable:{ type:'ManualMeasurement', label:'Salva variabile misura', description:'Inserisci valore e salvalo come variabile ricetta', io_type:'SYSTEM', device_mapping:'manual', manual_measure_type:'MANUAL_VALUE', manual_input_enabled:true, min:0, max:999, unit:'', save_as_variable:'VAR1', timeout:0 },
    if_fail_goto:{ type:'GotoIfFail', label:'IF FAIL vai a step', description:'Salto condizionato base in caso di FAIL', io_type:'SYSTEM', device_mapping:'system', target_step:1, timeout:0 },
    loop_3x:{ type:'LoopStart', label:'Inizio loop x3', description:'Ripeti gruppo step 3 volte, chiudi con LoopEnd', io_type:'SYSTEM', device_mapping:'system', value:3, timeout:0 }
  }[kind];
  if (!base) return;
  const step = JSON.parse(JSON.stringify(base));
  step.step_id = stepIdCounter++;
  step.enabled = true;
  recipe.steps.push(step);
  renumberRecipeSteps();
  renderSteps();
  addLog(document.getElementById('sys-log'), `🧩 Template aggiunto: <b>${escapeHtml(step.label)}</b>`, 'pass');
}



/* AT-MEC 4.14A - Recipe Variables Pro (SAFE)
 * Layer UI/local execution clone only: non modifica backend, login, ruoli, permessi o Device Manager.
 */
function ensureRecipeVariables414A() {
  try {
    if (!recipe) return {};
    if (!recipe.variables || typeof recipe.variables !== 'object' || Array.isArray(recipe.variables)) recipe.variables = {};
    return recipe.variables;
  } catch (_e) { return {}; }
}
function normalizeVariableKey414A(k) {
  return String(k || '').trim().replace(/^\$\{/, '').replace(/\}$/, '').replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
}
function getStandardRecipeVars414A(extra = {}) {
  const serial = extra.serial ?? (typeof getSerialDut === 'function' ? getSerialDut() : '') ?? '';
  const lot = extra.lotNumber ?? extra.lot ?? (typeof getLotNumber === 'function' ? getLotNumber() : '') ?? '';
  const recipeName = recipe?.recipe_name || document.getElementById('recipe-name-inp')?.value || document.getElementById('recipe-name-page')?.value || '';
  const user = window.atmecCurrentUser412K || currentUser || {};
  let dmCfg = {};
  try { dmCfg = JSON.parse(localStorage.getItem('atmec_device_config_413RL') || '{}'); } catch(_e) { dmCfg = {}; }
  return {
    SERIAL: serial,
    LOT: lot,
    COMMESSA: lot,
    COLLABORATORE: user.operator || user.username || '',
    USERNAME: user.username || user.operator || '',
    OPERATOR: user.operator || user.username || '',
    RECIPE: recipeName,
    DATETIME: new Date().toLocaleString('it-IT'),
    DATE: new Date().toLocaleDateString('it-IT'),
    TIME: new Date().toLocaleTimeString('it-IT'),
    FIRMWARE: recipe?.firmware || recipe?.firmware_version || '',
    ESP32_PORT: dmCfg?.esp32?.port || '',
    ESP32_FW: window.__atmecLastEsp32Info?.firmware?.fw || window.__atmecLastEsp32Info?.fw || '',
    PL303_PORT: dmCfg?.pl303?.port || '',
    MULTIMETER_MODEL: dmCfg?.multimeter?.model || dmCfg?.multimeter?.mode || '',
  };
}
function getRecipeVariableContext414A(extra = {}) {
  const ctx = { ...getStandardRecipeVars414A(extra) };
  const vars = ensureRecipeVariables414A();
  Object.entries(vars || {}).forEach(([k,v]) => { ctx[normalizeVariableKey414A(k)] = v; });
  try { Object.entries(window.__recipeVariables || {}).forEach(([k,v]) => { ctx[normalizeVariableKey414A(k)] = v; }); } catch(_e) {}
  return ctx;
}
function resolveRecipeTemplate414A(value, ctx) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\{\s*([A-Za-z0-9_]+)\s*\}/g, (m, key) => {
    const nk = normalizeVariableKey414A(key);
    const v = ctx[nk];
    return (v === undefined || v === null || v === '') ? m : String(v);
  });
}
function resolveRecipeObject414A(obj, ctx) {
  if (Array.isArray(obj)) return obj.map(x => resolveRecipeObject414A(x, ctx));
  if (obj && typeof obj === 'object') {
    const out = {};
    Object.entries(obj).forEach(([k,v]) => { out[k] = resolveRecipeObject414A(v, ctx); });
    return out;
  }
  return resolveRecipeTemplate414A(obj, ctx);
}
function resolveRecipeForExecution414A(srcRecipe, extra = {}) {
  const clone = JSON.parse(JSON.stringify(srcRecipe || {}));
  const ctx = getRecipeVariableContext414A(extra);
  const resolved = resolveRecipeObject414A(clone, ctx);
  resolved.__resolved_variables_414A = ctx;
  return resolved;
}
function renderRecipeVariablesPanel414A() {
  const vars = ensureRecipeVariables414A();
  const ctx = getRecipeVariableContext414A();
  const customRows = Object.entries(vars).map(([k,v]) => `<div class="recipe-var-row-414a"><input value="${escapeHtml(k)}" onchange="renameRecipeVariable414A('${escapeHtml(k)}', this.value)"><input value="${escapeHtml(v)}" onchange="setRecipeVariable414A('${escapeHtml(k)}', this.value)"><button class="btn btn-ghost btn-xs" onclick="deleteRecipeVariable414A('${escapeHtml(k)}')">✕</button></div>`).join('') || '<div class="hint">Nessuna variabile personalizzata. Aggiungi target, firmware o parametri usati negli step.</div>';
  const standard = ['SERIAL','LOT','COLLABORATORE','USERNAME','RECIPE','DATETIME','ESP32_PORT','ESP32_FW','PL303_PORT','MULTIMETER_MODEL'];
  const stdRows = standard.map(k => `<span class="recipe-var-chip-414a"><b>\${${k}}</b><em>${escapeHtml(ctx[k] || '—')}</em></span>`).join('');
  return `<section class="recipe-vars-panel-414a" id="recipe-vars-panel-414a">
    <div class="recipe-vars-head-414a"><div><h3>Recipe Variables Pro</h3><p>Variabili dinamiche usabili negli step: comandi, etichette, descrizioni, limiti testuali e messaggi.</p></div><button class="btn btn-primary btn-sm" onclick="previewRecipeVariables414A()">Anteprima variabili</button></div>
    <div class="recipe-vars-standard-414a">${stdRows}</div>
    <div class="recipe-vars-custom-414a"><div class="recipe-var-row-414a labels"><b>Nome variabile</b><b>Valore</b><b></b></div>${customRows}</div>
    <div class="recipe-vars-actions-414a"><button class="btn btn-ghost btn-sm" onclick="addRecipeVariable414A()">➕ Aggiungi variabile</button><button class="btn btn-ghost btn-sm" onclick="addRecipeVariablePreset414A()">⚙ Preset TARGET_VOLTAGE</button></div>
    <div class="recipe-vars-note-414a">Esempio: <code>SETV \${TARGET_VOLTAGE}</code> oppure <code>Test seriale \${SERIAL}</code>. La sostituzione avviene su una copia della ricetta all'avvio test.</div>
  </section>`;
}
function addRecipeVariable414A() {
  const vars = ensureRecipeVariables414A();
  let base = 'VAR_' + (Object.keys(vars).length + 1);
  while (vars[base]) base += '_1';
  vars[base] = '';
  renderRecipePage();
}
function addRecipeVariablePreset414A() {
  const vars = ensureRecipeVariables414A();
  if (!vars.TARGET_VOLTAGE) vars.TARGET_VOLTAGE = '12.0';
  if (!vars.TARGET_CURRENT) vars.TARGET_CURRENT = '1.0';
  if (!vars.FW_VERSION) vars.FW_VERSION = '1.0';
  renderRecipePage();
}
function setRecipeVariable414A(key, value) {
  const vars = ensureRecipeVariables414A();
  const nk = normalizeVariableKey414A(key);
  if (!nk) return;
  vars[nk] = value;
}
function renameRecipeVariable414A(oldKey, newKey) {
  const vars = ensureRecipeVariables414A();
  const ok = normalizeVariableKey414A(oldKey);
  const nk = normalizeVariableKey414A(newKey);
  if (!nk) { renderRecipePage(); return; }
  const val = vars[ok] ?? vars[oldKey] ?? '';
  delete vars[ok]; delete vars[oldKey];
  vars[nk] = val;
  renderRecipePage();
}
function deleteRecipeVariable414A(key) {
  const vars = ensureRecipeVariables414A();
  const nk = normalizeVariableKey414A(key);
  delete vars[nk]; delete vars[key];
  renderRecipePage();
}
function previewRecipeVariables414A() {
  const ctx = getRecipeVariableContext414A();
  const rows = Object.entries(ctx).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k} = ${v || '—'}`).join('\n');
  alert('Anteprima variabili ricetta:\n\n' + rows);
}
window.addRecipeVariable414A = addRecipeVariable414A;
window.addRecipeVariablePreset414A = addRecipeVariablePreset414A;
window.setRecipeVariable414A = setRecipeVariable414A;
window.renameRecipeVariable414A = renameRecipeVariable414A;
window.deleteRecipeVariable414A = deleteRecipeVariable414A;
window.previewRecipeVariables414A = previewRecipeVariables414A;
window.resolveRecipeForExecution414A = resolveRecipeForExecution414A;

function renderRecipePage() {
  const namePage = document.getElementById('recipe-name-page');
  const powerPage = document.getElementById('power-source-page');
  const enabledPage = document.getElementById('recipe-enabled-page');
  if (namePage) namePage.value = document.getElementById('recipe-name-inp')?.value || recipe.recipe_name || '';
  if (powerPage) powerPage.value = getPowerSourceValue();
  if (enabledPage) enabledPage.checked = recipe.enabled !== false;
  const list = document.getElementById('recipe-steps-page-list');
  if (!list) return;
  if (!recipe.steps.length) { list.innerHTML = renderRecipeVariablesPanel414A() + '<div class="hint">Nessuno step. Premi “Aggiungi step guidato”.</div>'; updateRecipeHealth(); return; }
  list.innerHTML = renderRecipeVariablesPanel414A() + recipe.steps.map((step, i) => {
    const cls = STEP_TYPE_COLORS[step.type] || 'type-color-D';
    const uiSt = stepUiStatus(step);
    const status = ` step-${uiSt}`;
    return `<div class="recipe-flow-card large-step-row${status} ${step.enabled === false ? 'disabled-step' : ''}" draggable="true" ondragstart="recipeDragStart(event, ${i})" ondragover="recipeDragOver(event, ${i})" ondragleave="recipeDragLeave(event)" ondrop="recipeDrop(event, ${i})" ondragend="recipeDragEnd(event)">
      <div class="recipe-flow-icon">${recipeStepIcon(step)}</div>
      <div>
        <div class="recipe-flow-title">#${i + 1} — ${escapeHtml(step.label || step.type)} <span class="status-pill ${uiSt}">${stepStatusLabel(uiSt)}</span></div>
        <div class="recipe-flow-desc"><span class="step-type-badge ${cls}">${escapeHtml(step.type)}</span> ${describeRecipeStep(step)} ${inlineIoStateForStep(step)}</div>
        ${renderRecipeInlineEditor(step, i)}
        ${renderStopOnFailOption331(step, i)}
      </div>
      <div class="recipe-step-actions">
        <button class="btn btn-primary btn-xs" onclick="openStepWizard(${i})">✏️ Valori</button>
        <button class="btn btn-ghost btn-xs" onclick="toggleStepEnabled(${i})">${step.enabled === false ? '✅' : '🚫'}</button>
        <button class="btn btn-ghost btn-xs" onclick="cloneStep(${i})">⧉</button>
        <button class="btn btn-ghost btn-xs" onclick="moveStep(${i}, -1)">⬆</button>
        <button class="btn btn-ghost btn-xs" onclick="moveStep(${i}, 1)">⬇</button>
        <button class="btn btn-danger btn-xs" onclick="removeStep(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
  updateRecipeHealth();
}
function recipeDeviceOptions(selected) {
  const opts = ['manual','AimTTi_PL303','Keysight_34461A','modbus_serial','ESP32','MULTIMETER_1'];
  return opts.map(o => `<option value="${escapeHtml(o)}" ${String(selected||'')===o?'selected':''}>${escapeHtml(o)}</option>`).join('');
}
function renderRecipeInlineEditor(step, i) {
  const type = String(step?.type || '');
  const isPs = type === 'PowerSupplySet';
  const isMeasure = type.includes('Measurement') || type.includes('Test') || type === 'ManualMeasurement' || type === 'PowerSupplyMeasureCurrent';
  if (!isPs && !isMeasure && type !== 'Delay') return '';
  const field = (label, html) => `<div><label>${label}</label>${html}</div>`;
  const input = (prop, value, inputType='text') => `<input type="${inputType}" value="${escapeHtml(value ?? '')}" onchange="updateRecipeStepField(${i}, '${prop}', this.value)">`;
  if (isPs) {
    return `<div class="recipe-inline-edit">
      ${field('Etichetta', input('label', step.label || 'Alimentatore'))}
      ${field('CH', `<select onchange="updateRecipeStepField(${i}, 'ps_channel', this.value)"><option value="1" ${Number(step.ps_channel||step.channel||1)===1?'selected':''}>CH1</option><option value="2" ${Number(step.ps_channel||step.channel||1)===2?'selected':''}>CH2</option></select>`)}
      ${field('Volt', input('ps_voltage', step.ps_voltage ?? step.value?.voltage ?? 24, 'number'))}
      ${field('I max A', input('ps_current', step.ps_current ?? step.value?.current ?? 1, 'number'))}
      ${field('Output', `<select onchange="updateRecipeStepField(${i}, 'ps_output_on', this.value)"><option value="true" ${(step.ps_output_on ?? step.value?.outputOn) !== false?'selected':''}>ON</option><option value="false" ${(step.ps_output_on ?? step.value?.outputOn) === false?'selected':''}>OFF</option></select>`)}
    </div>`;
  }
  if (type === 'GotoIfFail') {
    return `<div class="recipe-inline-edit">${field('Etichetta', input('label', step.label || 'IF FAIL'))}${field('Vai a step_id', input('target_step', step.target_step || 1, 'number'))}</div>`;
  }
  if (type === 'LoopStart') {
    return `<div class="recipe-inline-edit">${field('Etichetta', input('label', step.label || 'Loop'))}${field('Ripetizioni', input('value', step.value || 3, 'number'))}</div>`;
  }
  if (type === 'Delay') {
    return `<div class="recipe-inline-edit">${field('Etichetta', input('label', step.label || 'Attesa'))}${field('Attesa ms', input('timeout', step.timeout || 1000, 'number'))}</div>`;
  }
  if (type === 'MultiChannelResistanceTest') {
    const rows = Array.isArray(step.channels) ? step.channels : [];
    return `<div class="recipe-inline-edit">
      ${field('Etichetta', input('label', step.label || 'Test multi-canale resistenza'))}
      ${field('Device', `<select onchange="updateRecipeStepField(${i}, 'device_mapping', this.value)">${recipeDeviceOptions(step.device_mapping || 'Keysight_34461A')}</select>`)}
      ${field('Unità', input('unit', step.unit || 'Ω'))}
      ${field('FAIL', `<select onchange="updateRecipeStepField(${i}, 'stop_on_fail', this.value==='stop')"><option value="stop" ${step.stop_on_fail!==false?'selected':''}>Ferma test</option><option value="continue" ${step.stop_on_fail===false?'selected':''}>Continua e segnala canali</option></select>`)}
    </div>
    <div class="recipe-multichannel-336">
      <div class="recipe-multichannel-head"><span>Canale</span><span>Uscita</span><span>Min</span><span>Max</span><span>Stab ms</span><span>ON</span></div>
      ${rows.map((ch,ci)=>`<div class="recipe-multichannel-row">
        <input value="${escapeHtml(ch.name||('CH'+(ci+1)))}" onchange="updateMultiChannel336(${i},${ci},'name',this.value)">
        <input value="${escapeHtml(ch.output||('OUT'+(ci+1)))}" onchange="updateMultiChannel336(${i},${ci},'output',this.value)">
        <input type="number" value="${escapeHtml(ch.min??'')}" onchange="updateMultiChannel336(${i},${ci},'min',this.value)">
        <input type="number" value="${escapeHtml(ch.max??'')}" onchange="updateMultiChannel336(${i},${ci},'max',this.value)">
        <input type="number" value="${escapeHtml(ch.stable_ms??500)}" onchange="updateMultiChannel336(${i},${ci},'stable_ms',this.value)">
        <input type="checkbox" ${ch.enabled!==false?'checked':''} onchange="updateMultiChannel336(${i},${ci},'enabled',this.checked)">
      </div>`).join('')}
      <div class="row" style="margin-top:8px;"><button class="btn btn-ghost btn-sm" onclick="addMultiChannelRow336(${i})">➕ Canale</button><button class="btn btn-ghost btn-sm" onclick="fillMultiChannelRows336(${i},15)">↔ 15 canali</button></div>
    </div>`;
  }
  return `<div class="recipe-inline-edit">
    ${field('Etichetta', input('label', step.label || type))}
    ${field('Device', `<select onchange="updateRecipeStepField(${i}, 'device_mapping', this.value)">${recipeDeviceOptions(step.device_mapping || 'manual')}</select>`)}
    ${field('Min', input('min', step.min ?? '', 'number'))}
    ${field('Max', input('max', step.max ?? '', 'number'))}
    ${field('Target', input('target', step.target ?? '', 'number'))}
    ${field('Tol ±', input('tolerance', step.tolerance ?? '', 'number'))}
    ${field('Origine', `<select onchange="updateRecipeStepField(${i}, 'measurement_mode', this.value)"><option value="auto_with_fallback" ${(step.measurement_mode||'auto_with_fallback')==='auto_with_fallback'?'selected':''}>Auto + fallback</option><option value="automatic" ${step.measurement_mode==='automatic'?'selected':''}>Solo auto</option><option value="manual" ${step.measurement_mode==='manual'?'selected':''}>Solo manuale</option></select>`)}
    ${field('Fallback manuale', `<select onchange="updateRecipeStepField(${i}, 'manual_fallback_enabled', this.value==='true')"><option value="true" ${step.manual_fallback_enabled!==false?'selected':''}>Accettato</option><option value="false" ${step.manual_fallback_enabled===false?'selected':''}>Non accettato</option></select>`)}
    ${field('Unità', input('unit', step.unit || ''))}
    ${field('Salva variabile', input('save_as_variable', step.save_as_variable || ''))}
    ${field('Usa variabile', input('compare_variable', step.compare_variable || ''))}
    ${field('Tipo', `<select onchange="updateRecipeStepField(${i}, 'manual_measure_type', this.value)"><option value="MANUAL_VALUE" ${step.manual_measure_type==='MANUAL_VALUE'?'selected':''}>Valore</option><option value="CONFIRM" ${step.manual_measure_type==='CONFIRM'?'selected':''}>PASS/FAIL</option><option value="CONTINUITY" ${step.manual_measure_type==='CONTINUITY'?'selected':''}>Continuità</option><option value="TEMPERATURE" ${step.manual_measure_type==='TEMPERATURE'?'selected':''}>Temperatura</option><option value="POWER" ${step.manual_measure_type==='POWER'?'selected':''}>Potenza</option></select>`)}
    <div class="recipe-measure-preview-412c">${renderMeasurePreviewInline412C(step)}</div>
  </div>`;
}

function renderMeasurePreviewInline412C(step) {
  const unit = step.unit || '';
  const r = calcMeasureRange412C(step.target, step.tolerance, step.min, step.max);
  const mode = step.measurement_mode || (step.manual_input_enabled ? 'manual' : 'auto_with_fallback');
  const origin = mode === 'manual' ? 'MANUALE' : (mode === 'automatic' ? 'AUTOMATICA' : 'AUTO + MANUALE');
  const range = (r.min !== undefined && r.max !== undefined)
    ? `${formatMeasure412C(r.min, unit)} → ${formatMeasure412C(r.max, unit)}`
    : 'range non definito';
  const target = r.target !== undefined ? formatMeasure412C(r.target, unit) : '—';
  const tol = r.tolerance !== undefined ? '± ' + formatMeasure412C(r.tolerance, unit) : '—';
  const bad = (r.min !== undefined && r.max !== undefined && r.min > r.max) ? '<span class="fail">⚠️ Min > Max</span>' : '';
  return `<b>Anteprima misura:</b> atteso ${target}, tolleranza ${tol}, PASS ${range}, origine ${escapeHtml(origin)} ${bad}`;
}

function renderStopOnFailOption331(step, i) {
  const checked = step.stop_on_fail !== false;
  return `<div class="recipe-stopfail-336" data-ui-id="recipe.step.${i+1}.fail.policy"><span>Se FAIL: <b>${checked ? 'FERMA test e marca FAIL' : 'PROSEGUI e segnala guasto'}</b></span><label class="switch336"><input type="checkbox" ${checked ? 'checked' : ''} onchange="updateRecipeStepField(${i}, 'stop_on_fail', this.checked)"><span class="slider336"></span></label></div>`;
}

function updateMultiChannel336(stepIndex, chIndex, prop, value) {
  const step = recipe.steps[stepIndex]; if (!step) return;
  if (!Array.isArray(step.channels)) step.channels = [];
  if (!step.channels[chIndex]) step.channels[chIndex] = { name:'CH'+(chIndex+1), output:'OUT'+(chIndex+1), min:10, max:50, stable_ms:500, enabled:true };
  let v = value;
  if (['min','max','stable_ms'].includes(prop)) v = value === '' ? '' : Number(value);
  if (prop === 'enabled') v = Boolean(value);
  step.channels[chIndex][prop] = v;
  renderSteps();
}
function addMultiChannelRow336(stepIndex) { const step = recipe.steps[stepIndex]; if (!step) return; if (!Array.isArray(step.channels)) step.channels=[]; const n=step.channels.length+1; step.channels.push({name:'CH'+n, output:'OUT'+n, min:10, max:50, stable_ms:500, enabled:true}); renderSteps(); }
function fillMultiChannelRows336(stepIndex, count) { const step = recipe.steps[stepIndex]; if (!step) return; const old=Array.isArray(step.channels)?step.channels:[]; step.channels=Array.from({length:Number(count)||15},(_,i)=> old[i] || {name:'CH'+(i+1), output:'OUT'+(i+1), min:10, max:50, stable_ms:500, enabled:true}); renderSteps(); }


function updateRecipeStepField(i, prop, value) {
  const step = recipe.steps[i]; if (!step) return;
  let v = value;
  if (['min','max','target','tolerance','timeout','ps_voltage','ps_current','ps_channel','channel','target_step','value'].includes(prop)) v = value === '' ? '' : Number(value);
  if (prop === 'ps_output_on') v = String(value) === 'true';
  if (prop === 'stop_on_fail') v = Boolean(value);
  step[prop] = v;
  if (prop === 'ps_channel') step.channel = Number(v) || 1;
  if (prop === 'ps_voltage') step.value = { ...(step.value || {}), voltage: Number(v) || 0 };
  if (prop === 'ps_current') step.value = { ...(step.value || {}), current: Number(v) || 0 };
  if (prop === 'ps_output_on') step.value = { ...(step.value || {}), outputOn: Boolean(v) };
  if (['target','tolerance'].includes(prop) && step.target !== '' && step.target !== undefined && step.tolerance !== '' && step.tolerance !== undefined) {
    const rr = calcMeasureRange412C(step.target, step.tolerance, step.min, step.max);
    step.tolerance = Math.abs(Number(step.tolerance));
    step.min = rr.min;
    step.max = rr.max;
  }
  renderSteps();
}
let recipeDragIndex = null;
function recipeDragStart(ev, i){ recipeDragIndex = i; ev.currentTarget?.classList.add('dragging'); try{ev.dataTransfer.effectAllowed='move';}catch{} }
function recipeDragOver(ev, i){ ev.preventDefault(); ev.currentTarget?.classList.add('drop-target'); }
function recipeDragLeave(ev){ ev.currentTarget?.classList.remove('drop-target'); }
function recipeDragEnd(ev){ ev.currentTarget?.classList.remove('dragging'); document.querySelectorAll('.recipe-flow-card.drop-target').forEach(x=>x.classList.remove('drop-target')); }
function recipeDrop(ev, i){ ev.preventDefault(); document.querySelectorAll('.recipe-flow-card.drop-target').forEach(x=>x.classList.remove('drop-target')); if(recipeDragIndex===null || recipeDragIndex===i) return; const [item]=recipe.steps.splice(recipeDragIndex,1); recipe.steps.splice(i,0,item); recipeDragIndex=null; renumberRecipeSteps(); renderSteps(); }
function renderDeviceManagerMini() {
  const box = document.getElementById('device-manager-mini'); if (!box) return;
  const names = ['AimTTi_PL303','modbus_serial','Keysight_34461A'];
  box.innerHTML = names.map(n => {
    const st = latestHardwareStatuses.find(x => x.name === n) || {};
    const online = st.connected || st.live || (!st.mock && st.status === 'connected');
    const mock = st.mock;
    const cls = online ? 'device-state-online' : (mock ? 'device-state-offline' : 'device-state-error');
    const txt = online ? 'ONLINE' : (mock ? 'MOCK/OFFLINE' : 'OFFLINE');
    return `<div class="device-mini-card"><b>${escapeHtml(n)}</b><span class="${cls}">${txt}</span><div class="hint">${escapeHtml(st.connectionString || st.port || st.status || 'nessun dato')}</div></div>`;
  }).join('');
}
async function renderQualityMini() {
  const box = document.getElementById('quality-mini'); if (!box) return;
  let k = { total:0, passed:0, failed:0, yield:'0%' };
  try { if (api?.getKpi) k = await api.getKpi(); } catch {}
  box.innerHTML = `<div class="quality-mini-card"><div class="num">${escapeHtml(k.total||0)}</div><div>Test</div></div><div class="quality-mini-card"><div class="num">${escapeHtml(k.passed||0)}</div><div>PASS</div></div><div class="quality-mini-card"><div class="num">${escapeHtml(k.failed||0)}</div><div>FAIL</div></div><div class="quality-mini-card"><div class="num">${escapeHtml(k.yield||'0%')}</div><div>Yield</div></div>`;
}

function toggleStepEnabled(i) { recipe.steps[i].enabled = recipe.steps[i].enabled === false; renderSteps(); }
function moveStep(i, delta) { const j = i + delta; if (j < 0 || j >= recipe.steps.length) return; const tmp = recipe.steps[i]; recipe.steps[i] = recipe.steps[j]; recipe.steps[j] = tmp; renumberRecipeSteps(); renderSteps(); }
function updateRecipeHealth() {
  const el = document.getElementById('recipe-health'); if (!el) return;
  const active = recipe.steps.filter(s => s.enabled !== false);
  const needsEsp = active.some(s => ['DI','DO','AI','AO'].includes(s.io_type)) || (getPowerSourceValue() === 'ESP32_RELAY_POWER');
  const esp = latestHardwareStatuses.find(x => x.name === 'modbus_serial');
  const espTxt = needsEsp ? (esp && !esp.mock ? '✅ ESP32/modbus_serial LIVE' : '❌ ESP32/modbus_serial non LIVE') : 'ℹ️ ESP32 non richiesto';
  const errors = [];
  active.forEach((s,idx)=>{ 
    const measure = String(s.type||'').match(/Measurement|Resistance|Frequency|PowerSupplyMeasureCurrent|Manual/i);
    if (s.min !== undefined && s.max !== undefined && s.min !== '' && s.max !== '' && Number(s.min) > Number(s.max)) errors.push(`Step ${idx+1}: Min > Max`); 
    if (measure && s.target !== undefined && s.target !== '' && s.min !== undefined && s.max !== undefined && (Number(s.target) < Number(s.min) || Number(s.target) > Number(s.max))) errors.push(`Step ${idx+1}: target fuori range`);
    if (measure && !s.unit && s.type !== 'ManualMeasurement') errors.push(`Step ${idx+1}: unità mancante`);
    if (measure && !s.device_mapping) errors.push(`Step ${idx+1}: dispositivo mancante`);
    if (!s.label) errors.push(`Step ${idx+1}: etichetta mancante`); 
  });
  const pl303Needed = active.some(s => s.device_mapping === 'AimTTi_PL303' || s.type === 'PowerSupplySet' || s.type === 'PowerSupplyMeasureCurrent');
  const pl303 = latestHardwareStatuses.find(x => x.name === 'AimTTi_PL303');
  const pl303Txt = pl303Needed ? (pl303 && !pl303.mock ? '✅ PL303 LIVE' : '⚠️ PL303 offline/mock') : 'ℹ️ PL303 non richiesto';
  el.innerHTML = `<b>Stato ricetta:</b> ${recipe.enabled !== false ? 'abilitata' : 'disabilitata'} · Step attivi: ${active.length}/${recipe.steps.length}<br>${espTxt}<br>${pl303Txt}${errors.length ? '<br><span style="color:var(--fail)">❌ '+errors.map(escapeHtml).join(' · ')+'</span>' : '<br><span style="color:var(--pass)">✅ Valori base coerenti</span>'}`;
  renderDeviceManagerMini();
  renderQualityMini();
}


function selectRecipeStepType(type, el) {
  const sel = document.getElementById('new-step-type-page');
  if (sel) sel.value = type;
  document.querySelectorAll('.recipe-type-tab').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function refreshDashboardRecipes() {
  const sel = document.getElementById('dash-recipe-select');
  if (!sel) return;
  let names = [];
  try { if (api?.listRecipes) names = await api.listRecipes(); } catch {}
  const localNames = Object.keys(localStorage).filter(k => k.startsWith('recipe_')).map(k => k.replace('recipe_', ''));
  names = Array.from(new Set([...(Array.isArray(names) ? names : []), ...localNames])).filter(Boolean).sort();
  names = await filterRecipeNamesByClient317(names, document.getElementById('dash-client-filter')?.value || '');
  const current = recipe?.recipe_name || '';
  sel.innerHTML = names.map(n => `<option value="${escapeHtml(n)}" ${n===current?'selected':''}>${escapeHtml(n)}</option>`).join('') || '<option value="">Nessuna ricetta</option>';
}

async function loadDashboardRecipeSelection() {
  const prodSel = document.getElementById('prod-recipe-select');
  const dashSel = document.getElementById('dash-recipe-select');
  if (prodSel && dashSel) {
    await refreshProductionRecipes();
    prodSel.value = dashSel.value;
    await loadProductionRecipeSelection();
  } else if (dashSel?.value) {
    let loaded = null;
    try { if (api?.loadRecipe) { const res = await api.loadRecipe(dashSel.value); if (res?.ok) loaded = res.recipe; } } catch {}
    if (!loaded) { try { loaded = JSON.parse(localStorage.getItem('recipe_' + dashSel.value) || 'null'); } catch {} }
    if (loaded) { recipe = loaded; recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : []; renumberRecipeSteps(); renderSteps(); }
  }
  addLog(document.getElementById('run-log'), `📂 Ricetta dashboard selezionata: <b>${escapeHtml(recipe?.recipe_name || dashSel?.value || '-')}</b>`, 'info');
}

async function startTestFromDashboard() {
  await loadDashboardRecipeSelection();
  await autoConnectProductionInstruments(false);
  await startTest();
}

function friendlyDeviceLabel(name) {
  return name === 'modbus_serial' ? 'ESP32-S3 USB JSON' : name === 'AimTTi_PL303' ? 'Alimentatore PL303' : name === 'Keysight_34461A' ? 'Keysight Multimetro' : name === 'QR_Scanner' ? 'Scanner QR' : name;
}

async function renderDashboardDevices() {
  const box = document.getElementById('dashboard-device-list');
  if (!box) return;
  let rows = [];
  try { rows = api?.getProfessionalDevices ? await api.getProfessionalDevices() : []; } catch {}
  if (!rows || !rows.length) { try { rows = await api.getHardwareStatuses(); } catch {} }
  if (!rows || !rows.length) { box.innerHTML = '<div class="hint">Nessuno strumento configurato.</div>'; return; }
  box.innerHTML = rows.map(r => {
    const live = r.live || (!r.mock && (r.connected !== false));
    return `<div class="dashboard-hw-row ${live?'live':'fail'}"><div><b>${escapeHtml(r.label || friendlyDeviceLabel(r.name))}</b><div class="detail-line">${escapeHtml(r.group || 'Strumento')}</div></div><div class="detail-line">${escapeHtml(r.connectionString || r.conn || '-')}</div><span class="state-led ${live?'high':'low'}">${live?'LIVE':'OFF'}</span></div>`;
  }).join('');
}

function inlineIoStateForStep(step) {
  const io = step.io_type || guessIoType(step.type);
  if (!['DI','DO','AI'].includes(io) || step.channel === undefined) return '';
  const key = `${io}_${step.channel}`;
  const v = liveIoSnapshot[key];
  const label = v === true ? 'HIGH' : v === false ? 'LOW' : (typeof v === 'number' ? Number(v).toFixed(3) : 'N/D');
  const cls = v === true ? 'high' : v === false ? 'low' : '';
  return `<span class="live-chip io-live-inline ${cls}"><span class="live-dot"></span>${io} GPIO${step.channel}: ${label}</span>`;
}

async function bootstrapDashboard217() {
  await refreshDashboardRecipes();
  renderDashboardDevices();
  const lot = document.getElementById('lot-number-dash'); if (lot) lot.value = getLotNumber();
  const sn = document.getElementById('serial-dut-dash'); if (sn) sn.value = getSerialDutRaw();
}

function updateHwBadges(statuses) {
  latestHardwareStatuses = statuses || [];
  const container = document.getElementById('hw-badges');
  container.innerHTML = statuses.map(s => `
    <div class="hw-badge ${s.mock ? 'mock' : 'live'}">
      <div class="dot"></div>
      <span>${s.name.split('_')[0]} ${s.mock ? 'MOCK' : 'LIVE'}</span>
    </div>`).join('');
}

async function startQr() {
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('videoEl');
    video.srcObject = qrStream;
    video.style.display = 'block';
    qrScanInterval = setInterval(() => scanQrFrame(), 300);
  } catch (e) {
    addLog(document.getElementById('sys-log'), '❌ Camera non disponibile', 'fail');
  }
}

function stopQr() {
  clearInterval(qrScanInterval);
  if (qrStream) qrStream.getTracks().forEach(t => t.stop());
  document.getElementById('videoEl').style.display = 'none';
}

function scanQrFrame() {
  const video = document.getElementById('videoEl');
  const canvas = document.getElementById('qrCanvas');
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (typeof jsQR !== 'undefined') {
    const code = jsQR(imgData.data, imgData.width, imgData.height);
    if (code) {
      document.getElementById('serial-dut').value = code.data; const psi=document.getElementById('prod-serial-input'); if(psi) psi.value = code.data;
      document.getElementById('qrResult').textContent = '✅ ' + code.data;
      stopQr();
    }
  }
}


function forceRunIdleUi() {
  stopProductionTimer();
  activeStepId = null;
  startInProgress = false;
  currentRunState = 'STOP_OPERATORE';
  setProductionTimingState('STOP_OPERATORE');
  setStatePill('READY');
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  if (btnStart) btnStart.disabled = false;
  if (btnPause) { btnPause.disabled = true; btnPause.textContent = '⏸ PAUSA'; btnPause.onclick = pauseTest; }
  if (btnStop) btnStop.disabled = true;
  const box = document.getElementById('current-step-box');
  if (box) box.innerHTML = 'Nessun test in esecuzione.';
}

let failFinalizeWatchdog336 = null;
function forceFinalizeFail336(reason) {
  try {
    productionForceComplete = true;
    currentRunState = 'FAIL';
    activeStepId = null;
    pendingFailureDecision = false;
    setStatePill('FAIL');
    setProductionTimingState('FAIL');
    const p=document.getElementById('prod-progress-percent'); const f=document.getElementById('prod-progress-fill');
    if(p) p.textContent='100%'; if(f) f.style.width='100%';
    setProductionFinalStatus('fail');
    forceRunIdleUi();
    updateProductionTestMode();
    addLog(document.getElementById('run-log'), `❌ Test chiuso con esito FAIL${reason ? ' — '+escapeHtml(reason) : ''}.`, 'fail');
    try {
      if (typeof window.label420PrintFromTestResult === 'function') {
        const labelResult = window.label420PrintFromTestResult({
          result:'FAIL',
          status:'FAIL',
          serial:document.getElementById('serial-dut')?.value || document.getElementById('prod-serial-input')?.value || '',
          workOrder:document.getElementById('lot-number')?.value || document.getElementById('prod-lot-input')?.value || '',
          recipe:recipe?.recipe_name || '',
          recipeRevision:recipe?.version || '',
          reason:reason || 'force fail'
        });
        if (labelResult && labelResult.ok) addLog(document.getElementById('run-log'), `🏷 Etichetta ${labelResult.template || 'FAIL'} preparata/stampata automaticamente.`, 'info');
      }
    } catch(labelErr) { console.warn('[AT-MEC 4.20A4] Auto label print on FAIL failed', labelErr); }
  } catch(e) { console.warn('forceFinalizeFail336', e); }
}
