/* AT-MEC_HM_4.16B - estratto da app.js: PL303 UI/control. */

/* AT-MEC_HM_2.29 - Funzioni pagina alimentatore PL303 e QR produzione. */
function pl303Log(msg, level='info') { addLog(document.getElementById('pl303-status'), msg, level); }
function syncPl303ModeFields() {
  const mode = document.getElementById('pl303-mode')?.value || 'USB';
  const usb = document.getElementById('pl303-usb-fields');
  const eth = document.getElementById('pl303-eth-fields');
  if (usb) usb.style.display = mode === 'USB' ? 'grid' : 'none';
  if (eth) eth.style.display = mode === 'ETHERNET' ? 'grid' : 'none';
}
async function loadPl303Settings() {
  syncPl303ModeFields();
  try {
    const cfg = await api?.getAppSettings?.() || {};
    if (document.getElementById('pl303-mode')) document.getElementById('pl303-mode').value = cfg.pl303Mode || 'USB';
    if (document.getElementById('pl303-host')) document.getElementById('pl303-host').value = cfg.pl303Host || cfg.ttiHost || '';
    if (document.getElementById('pl303-port')) document.getElementById('pl303-port').value = cfg.pl303Port || 9221;
    if (document.getElementById('pl303-baud')) document.getElementById('pl303-baud').value = cfg.pl303Baud || cfg.ttiBaud || 9600;
    await scanPl303SerialPorts(false);
    const com = cfg.pl303Com || cfg.ttiPort || 'mock';
    const sel = document.getElementById('pl303-com'); if (sel && [...sel.options].some(o => o.value === com)) sel.value = com;
    syncPl303ModeFields();
    setPl303LiveState('Premi Read/Live dopo la connessione');
    // 3.12: non interrogare automaticamente il PL303 all'apertura pagina: se porta/baud non sono corretti si generano timeout inutili.
    restartPl303LiveIfEnabled();
  } catch(e) { pl303Log('❌ Caricamento impostazioni PL303: ' + escapeHtml(normalizeError(e)), 'fail'); }
}
async function scanPl303SerialPorts(show=true) {
  const sel = document.getElementById('pl303-com');
  const list = document.getElementById('pl303-port-list');
  if (!api?.scanSerialPorts || !sel) return;
  try {
    const ports = await api.scanSerialPorts();
    sel.innerHTML = '<option value="mock">mock</option>' + ports.map(p => `<option value="${escapeHtml(p.path)}">${escapeHtml(p.friendlyName || p.path)}</option>`).join('');
    if (list && show) list.innerHTML = ports.map(p => `<div class="port-card"><b>${escapeHtml(p.path)}</b><div class="detail-line">${escapeHtml(p.manufacturer || 'seriale')} ${p.serialNumber ? '— SN '+escapeHtml(p.serialNumber) : ''}</div></div>`).join('') || 'Nessuna porta seriale trovata.';
  } catch(e) { if (list) list.textContent = 'Errore scan porte: ' + normalizeError(e); }
}
function getPl303UiConfig() {
  const mode = document.getElementById('pl303-mode')?.value || 'USB';
  return {
    mode,
    host: document.getElementById('pl303-host')?.value?.trim() || 'mock',
    port: Number(document.getElementById('pl303-port')?.value || 9221),
    com: document.getElementById('pl303-com')?.value || 'mock',
    baud: Number(document.getElementById('pl303-baud')?.value || 9600)
  };
}
async function savePl303SettingsOnly() {
  const cfg = getPl303UiConfig();
  await api?.saveAppSettings?.({ pl303Mode: cfg.mode, pl303Host: cfg.host, pl303Port: cfg.port, pl303Com: cfg.com, pl303Baud: cfg.baud, ttiPort: cfg.mode === 'ETHERNET' ? cfg.host : cfg.com, ttiBaud: cfg.mode === 'ETHERNET' ? cfg.port : cfg.baud });
  pl303Log('💾 Impostazioni PL303 salvate.', 'pass');
}
async function connectPl303() {
  pl303EmergencyLock = false;
  const cfg = getPl303UiConfig();
  await savePl303SettingsOnly();
  const res = await guardedUi('Connessione PL303', () => api.connectPl303(cfg), { timeoutMs: 5000, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout'} });
  if (res?.ok) { latestHardwareStatuses = Array.isArray(res.statuses) ? res.statuses : latestHardwareStatuses; updateHwBadges(latestHardwareStatuses); renderProductionHardwareList(); pl303Log('🔌 PL303 collegamento completato.', 'pass'); }
  else pl303Log('❌ PL303 non collegato: ' + escapeHtml(res?.error || 'errore'), 'fail');
}
async function setPl303Output(channelOrOutputOn, maybeOutputOn) {
  const channel = (typeof maybeOutputOn === 'boolean') ? Number(channelOrOutputOn || 1) : 1;
  const outputOn = (typeof maybeOutputOn === 'boolean') ? maybeOutputOn : Boolean(channelOrOutputOn);
  const voltage = Number(document.getElementById(`pl303-ch${channel}-set-v`)?.value || document.getElementById('pl303-set-v')?.value || 0);
  const current = Number(document.getElementById(`pl303-ch${channel}-set-i`)?.value || document.getElementById('pl303-set-i')?.value || 0);
  const res = await guardedUi(`Set PL303 CH${channel}`, () => api.setPl303Output({ voltage, current, outputOn, channel }), { timeoutMs: 5000, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout'} });
  if (res?.ok) {
    const ve = document.getElementById(`pl303-ch${channel}-v-read`) || document.getElementById('pl303-v-read');
    if (ve) ve.textContent = outputOn ? Number(voltage).toFixed(3) : '0.000';
    pl303Log(`⚡ PL303 CH${channel} ${outputOn ? 'ON' : 'OFF'} — impostata ${Number(voltage).toFixed(3)} V / limite ${Number(current).toFixed(3)} A ${res.mock ? '(MOCK)' : ''}`, outputOn ? 'pass' : 'warn');
  } else pl303Log(`❌ Set PL303 CH${channel}: ` + escapeHtml(res?.error || 'errore'), 'fail');
  await queryPl303Status(channel, false).catch(()=>{});
  if (outputOn) await measurePl303Current(channel).catch(()=>{});
}
let pl303EmergencyLock = false;
function markPl303ValueUpdated(el) {
  if (!el) return;
  el.classList.add('updated');
  setTimeout(() => el.classList.remove('updated'), 220);
}
function setPl303Readouts(channel, voltage, current) {
  const ve = document.getElementById(`pl303-ch${channel}-v-read`) || document.getElementById('pl303-v-read');
  const ie = document.getElementById(`pl303-ch${channel}-i-read`) || document.getElementById('pl303-i-read');
  if (voltage !== undefined && voltage !== null) {
    const v = Number.isFinite(Number(voltage)) ? Number(voltage).toFixed(3) : String(voltage);
    if (ve && ve.textContent !== v) { ve.textContent = v; markPl303ValueUpdated(ve); }
  }
  if (current !== undefined && current !== null) {
    const i = Number.isFinite(Number(current)) ? Number(current).toFixed(3) : String(current);
    if (ie && ie.textContent !== i) { ie.textContent = i; markPl303ValueUpdated(ie); }
  }
}

async function queryPl303Status(channelOrShow=true, maybeShow) {
  if (!api?.queryPl303Status) return { ok:false, error:'API queryPl303Status non disponibile' };
  if (pl303EmergencyLock && maybeShow !== 'force') return { ok:false, skipped:true, error:'PL303 polling sospeso dopo emergenza' };
  const channel = (typeof channelOrShow === 'number') ? Number(channelOrShow || 1) : 1;
  const show = (typeof maybeShow === 'boolean') ? maybeShow : (typeof channelOrShow === 'boolean' ? channelOrShow : true);
  let res;
  if (show) {
    res = await guardedUi(`Lettura PL303 CH${channel}`, () => api.queryPl303Status(channel), { timeoutMs: 6000, logTo: null, fallback:{ok:false,error:'timeout'} });
  } else {
    // Live/polling: lettura diretta SENZA guardedUi, così non lampeggia/blocca tutta la HMI.
    try { res = await api.queryPl303Status(channel); }
    catch(e) { res = { ok:false, error: normalizeError(e) }; }
  }
  if (res?.ok) {
    setPl303Readouts(channel, res.voltage, res.current);
    if (show) pl303Log(`📡 Stato PL303 CH${channel}: ${Number(res.voltage).toFixed(3)} V / ${Number(res.current).toFixed(3)} A ${res.mock ? '(MOCK)' : ''}`, res.mock ? 'warn' : 'info');
  } else {
    if (show) pl303Log(`⚠️ Stato PL303 CH${channel} non disponibile: ${escapeHtml(res?.error || 'timeout')}. La HMI resta operativa.`, 'warn');
  }
  return res;
}
let pl303LiveTimer = null;
let pl303LiveBusy = false;
function setPl303LiveState(text) { const el = document.getElementById('pl303-live-state'); if (el) el.textContent = text; }
function getPl303LiveInterval() { return Math.max(1500, Number(document.getElementById('pl303-live-interval')?.value || 2500)); }
async function pl303LiveOnce(show=false) {
  if (pl303LiveBusy || pl303EmergencyLock) return;
  pl303LiveBusy = true;
  try {
    setPl303LiveState('Live lettura V/A...');
    await queryPl303Status(1, show);
    await new Promise(r => setTimeout(r, 220));
    await queryPl303Status(2, show);
    setPl303LiveState('Live OK ' + new Date().toLocaleTimeString());
  } catch(e) {
    setPl303LiveState('Live errore/timeout non bloccante');
    if (show) pl303Log('⚠️ Live PL303: ' + escapeHtml(normalizeError(e)), 'warn');
  } finally {
    pl303LiveBusy = false;
  }
}
function stopPl303Live() { if (pl303LiveTimer) clearInterval(pl303LiveTimer); pl303LiveTimer = null; setPl303LiveState('Live OFF'); }
function togglePl303Live(enabled) {
  if (enabled) pl303EmergencyLock = false;
  const cb = document.getElementById('pl303-live-enabled'); if (cb) cb.checked = Boolean(enabled);
  if (!enabled) return stopPl303Live();
  stopPl303Live();
  pl303LiveOnce(false);
  pl303LiveTimer = setInterval(() => pl303LiveOnce(false), getPl303LiveInterval());
  setPl303LiveState('Live ON ogni ' + getPl303LiveInterval() + ' ms');
}
function restartPl303LiveIfEnabled() { if (document.getElementById('pl303-live-enabled')?.checked) togglePl303Live(true); }

async function measurePl303Current(channel=1) {
  const ch = Math.max(1, Math.min(2, Number(channel) || 1));
  const meter = document.getElementById(`pl303-ch${ch}-i-read`) || document.getElementById('pl303-i-read');
  try {
    if (!api?.measurePl303Current) {
      pl303Log(`❌ Misura corrente CH${ch}: API measurePl303Current non disponibile`, 'fail');
      return { ok:false, error:'API measurePl303Current non disponibile' };
    }
    const res = await guardedUi(`Misura corrente PL303 CH${ch}`, () => api.measurePl303Current(ch), { timeoutMs: 4500, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout misura corrente'} });
    if (res?.ok) {
      const i = Number.isFinite(Number(res.current)) ? Number(res.current).toFixed(3) : '--.--';
      if (meter) meter.textContent = i;
      pl303Log(`📈 Consumo reale CH${ch}: ${i} A ${res.mock ? '(MOCK)' : ''}`, res.mock ? 'warn' : 'pass');
    } else {
      pl303Log(`❌ Misura corrente CH${ch}: ${escapeHtml(res?.error || 'errore')}`, 'fail');
    }
    return res;
  } catch(e) {
    const msg = normalizeError(e);
    pl303Log(`❌ Misura corrente CH${ch}: ${escapeHtml(msg)}`, 'fail');
    return { ok:false, error:msg };
  }
}

async function safePl303Off(reason='MANUAL_SAFE_OFF') {
  try {
    stopPl303Live();
    let res = null;
    if (api?.safePl303Off) {
      res = await guardedUi('PL303 CH1+CH2 OFF sicuro', () => api.safePl303Off(reason), { timeoutMs: 6500, logTo: document.getElementById('pl303-status'), fallback:{ok:false,error:'timeout safe off'} });
    } else {
      // Fallback renderer: invia OFF separato sui due canali con piccola pausa.
      await setPl303Output(1, false);
      await new Promise(r => setTimeout(r, 180));
      await setPl303Output(2, false);
      res = { ok:true, fallback:true };
    }
    // 3.12: dopo OFF sicuro non facciamo query immediate: su seriale lenta causavano timeout e falsi fault.
    setPl303Readouts(1, 0, 0);
    setPl303Readouts(2, 0, 0);
    pl303Log(`🛑 PL303 CH1+CH2 OFF sicuro completato (${escapeHtml(reason)})`, res?.ok ? 'pass' : 'warn');
    return res;
  } catch(e) {
    const msg = normalizeError(e);
    pl303Log('❌ CH1+CH2 OFF sicuro: ' + escapeHtml(msg), 'fail');
    return { ok:false, error:msg };
  }
}

if (typeof window !== 'undefined') {
  window.measurePl303Current = measurePl303Current;
  window.safePl303Off = safePl303Off;
  window.queryPl303Status = queryPl303Status;
  window.setPl303Output = setPl303Output;
  window.togglePl303Live = togglePl303Live;
  window.restartPl303LiveIfEnabled = restartPl303LiveIfEnabled;
  window.pl303LiveOnce = pl303LiveOnce;
}
