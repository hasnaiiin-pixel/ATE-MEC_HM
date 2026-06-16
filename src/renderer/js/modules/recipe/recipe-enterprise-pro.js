/* AT-MEC_HM_4.16A_APP_JS_SPLIT - extracted from legacy app.js.
 * Compatibility mode: classic script, shares window/global scope with app.js.
 */

/* AT-MEC 4.14B - Recipe Logic Pro (SAFE)
 * IF/ELSE pre-start logic layer: valuta condizioni su variabili disponibili prima dell'avvio,
 * compila una copia della ricetta senza pseudo-step logici e non modifica backend/Test Engine.
 */
(function(){
  if (window.__atmecRecipeLogic414B) return;
  window.__atmecRecipeLogic414B = true;

  function esc414B(v){ try { return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); } catch(_e){ return String(v ?? ''); } }
  function norm414B(k){ try { return typeof normalizeVariableKey414A === 'function' ? normalizeVariableKey414A(k) : String(k||'').replace(/^\$\{/,'').replace(/\}$/,'').replace(/[^A-Za-z0-9_]/g,'_').toUpperCase(); } catch(_e){ return String(k||'').toUpperCase(); } }
  function ctx414B(extra){ try { return typeof getRecipeVariableContext414A === 'function' ? getRecipeVariableContext414A(extra || {}) : {}; } catch(_e){ return {}; } }
  function isNum414B(v){ return v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(String(v).replace(',','.'))); }
  function valueOf414B(token, ctx){
    const raw = String(token ?? '').trim();
    const m = raw.match(/^\$?\{?([A-Za-z0-9_]+)\}?$/);
    if (m) {
      const key = norm414B(m[1]);
      if (Object.prototype.hasOwnProperty.call(ctx, key)) return ctx[key];
    }
    return raw;
  }
  function evalCond414B(step, ctx){
    const left = valueOf414B(step?.logic_left || step?.variable || step?.left || '', ctx);
    const right = valueOf414B(step?.logic_right ?? step?.value ?? step?.right ?? '', ctx);
    const op = String(step?.logic_operator || step?.operator || '==').trim().toUpperCase();
    const ln = isNum414B(left), rn = isNum414B(right);
    const a = ln && rn ? Number(String(left).replace(',','.')) : String(left ?? '');
    const b = ln && rn ? Number(String(right).replace(',','.')) : String(right ?? '');
    if (op === '==' || op === '=') return a == b;
    if (op === '!=' || op === '<>') return a != b;
    if (op === '>') return a > b;
    if (op === '<') return a < b;
    if (op === '>=') return a >= b;
    if (op === '<=') return a <= b;
    if (op === 'CONTAINS') return String(a).includes(String(b));
    if (op === 'NOT_CONTAINS') return !String(a).includes(String(b));
    if (op === 'EXISTS') return String(left ?? '').trim() !== '';
    if (op === 'EMPTY') return String(left ?? '').trim() === '';
    return false;
  }
  function compileLogic414B(srcRecipe, extra){
    const r = JSON.parse(JSON.stringify(srcRecipe || {}));
    const steps = Array.isArray(r.steps) ? r.steps : [];
    const ctx = ctx414B(extra || {});
    const out = [];
    const stack = [];
    const active = () => stack.every(s => s.active);
    const visibleParent = () => stack.slice(0,-1).every(s => s.active);
    const trace = [];

    for (const step of steps) {
      const t = String(step?.type || '');
      if (t === 'IfCondition') {
        const pass = evalCond414B(step, ctx);
        stack.push({ pass, inElse:false, active: active() && pass });
        trace.push({ step_id: step.step_id, label: step.label || 'IF', result: pass ? 'TRUE' : 'FALSE', condition: `${step.logic_left||''} ${step.logic_operator||'=='} ${step.logic_right??''}` });
        continue;
      }
      if (t === 'ElseBlock') {
        const top = stack[stack.length-1];
        if (top) { top.inElse = true; top.active = visibleParent() && !top.pass; }
        continue;
      }
      if (t === 'EndIf') { stack.pop(); continue; }
      if (active()) out.push(step);
    }
    r.steps = out;
    r.__logic_trace_414B = trace;
    return r;
  }

  const oldResolve = window.resolveRecipeForExecution414A || (typeof resolveRecipeForExecution414A === 'function' ? resolveRecipeForExecution414A : null);
  window.compileRecipeLogic414B = compileLogic414B;
  window.resolveRecipeForExecution414A = function(srcRecipe, extra){
    const compiled = compileLogic414B(srcRecipe, extra || {});
    try {
      if (compiled.__logic_trace_414B?.length && typeof addLog === 'function') {
        addLog(document.getElementById('run-log'), `🧠 Recipe Logic Pro: ${compiled.__logic_trace_414B.length} condizione/i valutate prima dell'avvio.`, 'pass');
      }
    } catch(_e) {}
    return oldResolve ? oldResolve(compiled, extra || {}) : compiled;
  };
  try { resolveRecipeForExecution414A = window.resolveRecipeForExecution414A; } catch(_e) {}

  function addIfBlock414B(){
    if (!window.recipe && typeof recipe === 'undefined') return;
    const r = window.recipe || recipe;
    r.steps = Array.isArray(r.steps) ? r.steps : [];
    const nextId = (typeof stepIdCounter !== 'undefined' ? stepIdCounter : (Math.max(0,...r.steps.map(s=>Number(s.step_id)||0))+1));
    const id1 = nextId, id2 = nextId+1, id3 = nextId+2;
    try { stepIdCounter = id3 + 1; } catch(_e) {}
    r.steps.push(
      { step_id:id1, enabled:true, type:'IfCondition', label:'IF condizione variabile', description:'Esegue il blocco solo se la condizione è vera', io_type:'SYSTEM', device_mapping:'system', logic_left:'${TARGET_VOLTAGE}', logic_operator:'>=', logic_right:'12.0', timeout:0 },
      { step_id:id2, enabled:true, type:'ElseBlock', label:'ELSE', description:'Ramo alternativo se la condizione è falsa', io_type:'SYSTEM', device_mapping:'system', timeout:0 },
      { step_id:id3, enabled:true, type:'EndIf', label:'END IF', description:'Fine blocco condizionale', io_type:'SYSTEM', device_mapping:'system', timeout:0 }
    );
    try { if (typeof renumberRecipeSteps === 'function') renumberRecipeSteps(); } catch(_e) {}
    try { if (typeof renderSteps === 'function') renderSteps(); else if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e) {}
  }
  function addLogicPreset414B(){
    try { if (typeof addRecipeVariablePreset414A === 'function') addRecipeVariablePreset414A(); } catch(_e) {}
    addIfBlock414B();
  }
  function simulateRecipeLogic414B(){
    const r = window.recipe || (typeof recipe !== 'undefined' ? recipe : null);
    const compiled = compileLogic414B(r || {}, {});
    const trace = compiled.__logic_trace_414B || [];
    const msg = trace.length ? trace.map(x => `Step ${x.step_id} · ${x.condition} = ${x.result}`).join('\n') : 'Nessuna condizione IF presente nella ricetta.';
    alert('Simulazione Recipe Logic Pro\n\n' + msg + `\n\nStep eseguibili dopo compilazione: ${(compiled.steps||[]).length}`);
  }
  window.addIfBlock414B = addIfBlock414B;
  window.addLogicPreset414B = addLogicPreset414B;
  window.simulateRecipeLogic414B = simulateRecipeLogic414B;

  const oldDescribe = (typeof describeRecipeStep === 'function') ? describeRecipeStep : null;
  try {
    describeRecipeStep = function(step){
      const t = String(step?.type || '');
      if (t === 'IfCondition') return `<span class="recipe-value-chip logic"><b>IF</b> ${esc414B(step.logic_left || '')} ${esc414B(step.logic_operator || '==')} ${esc414B(step.logic_right ?? '')}</span><span class="recipe-value-chip"><b>Pre-start</b> valuta variabili prima avvio</span>`;
      if (t === 'ElseBlock') return `<span class="recipe-value-chip logic"><b>ELSE</b> ramo alternativo</span>`;
      if (t === 'EndIf') return `<span class="recipe-value-chip logic"><b>END IF</b> chiusura blocco</span>`;
      return oldDescribe ? oldDescribe(step) : '';
    };
  } catch(_e) {}

  const oldInline = (typeof renderRecipeInlineEditor === 'function') ? renderRecipeInlineEditor : null;
  try {
    renderRecipeInlineEditor = function(step, i){
      const t = String(step?.type || '');
      const field = (label, html) => `<div><label>${label}</label>${html}</div>`;
      const input = (prop, value, inputType='text') => `<input type="${inputType}" value="${esc414B(value ?? '')}" onchange="updateRecipeStepField(${i}, '${prop}', this.value)">`;
      if (t === 'IfCondition') {
        return `<div class="recipe-inline-edit logic-editor-414b">
          ${field('Etichetta', input('label', step.label || 'IF condizione variabile'))}
          ${field('Sinistra', input('logic_left', step.logic_left || '${TARGET_VOLTAGE}'))}
          ${field('Operatore', `<select onchange="updateRecipeStepField(${i}, 'logic_operator', this.value)">${['==','!=','>','<','>=','<=','CONTAINS','EXISTS','EMPTY'].map(o=>`<option value="${o}" ${String(step.logic_operator||'>=')===o?'selected':''}>${o}</option>`).join('')}</select>`)}
          ${field('Destra', input('logic_right', step.logic_right ?? '12.0'))}
        </div>`;
      }
      if (t === 'ElseBlock' || t === 'EndIf') return `<div class="recipe-inline-edit logic-editor-414b">${field('Etichetta', input('label', step.label || t))}</div>`;
      return oldInline ? oldInline(step, i) : '';
    };
  } catch(_e) {}

  const oldVarsPanel = (typeof renderRecipeVariablesPanel414A === 'function') ? renderRecipeVariablesPanel414A : null;
  try {
    renderRecipeVariablesPanel414A = function(){
      const base = oldVarsPanel ? oldVarsPanel() : '';
      const logic = `<section class="recipe-logic-panel-414b" id="recipe-logic-panel-414b">
        <div class="recipe-logic-head-414b"><div><h3>Recipe Logic Pro</h3><p>Condizioni IF/ELSE valutate prima dell'avvio test usando variabili ricetta e dati stazione.</p></div><button class="btn btn-primary btn-sm" onclick="simulateRecipeLogic414B()">Simula logica</button></div>
        <div class="recipe-logic-actions-414b"><button class="btn btn-ghost btn-sm" onclick="addIfBlock414B()">➕ Aggiungi IF / ELSE</button><button class="btn btn-ghost btn-sm" onclick="addLogicPreset414B()">⚙ Preset IF TARGET_VOLTAGE</button></div>
        <div class="recipe-logic-note-414b">Nota: in questa fase le condizioni usano variabili disponibili prima dell'avvio. I controlli su misure live saranno nella fase LOOP/Runtime successiva.</div>
      </section>`;
      return base + logic;
    };
  } catch(_e) {}

  setTimeout(()=>{ try { if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e){} }, 300);
})();

/* AT-MEC 4.14C - Recipe Flow Pro (SAFE)
 * Aggiunge LOOP/WAIT/RETRY UI e compilazione su COPIA prima dell'avvio.
 * Non modifica backend, login, utenti, ruoli, permessi, Device Manager o report.
 */
(function(){
  const FLOW_VERSION_414C = 'AT-MEC_HM_4.14C_RECIPE_FLOW_PRO';
  const esc414C = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const num414C = (v, d=0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

  function clone414C(obj){ return JSON.parse(JSON.stringify(obj || {})); }

  function compileFlow414C(srcRecipe, extra){
    const r = clone414C(srcRecipe || {});
    const steps = Array.isArray(r.steps) ? r.steps : [];
    const maxCompiled = 1000;
    const trace = [];

    function compileRange(start, end, depth){
      const out = [];
      let i = start;
      while (i < end) {
        const step = steps[i] || {};
        const t = String(step.type || '');
        if (t === 'LoopStart') {
          let level = 1, j = i + 1;
          while (j < end) {
            const tt = String(steps[j]?.type || '');
            if (tt === 'LoopStart') level++;
            if (tt === 'LoopEnd') { level--; if (level === 0) break; }
            j++;
          }
          const count = Math.max(0, Math.min(50, Math.floor(num414C(step.loop_count ?? step.value ?? 1, 1))));
          const body = compileRange(i + 1, Math.min(j, end), depth + 1);
          trace.push({ type:'LOOP', label: step.label || 'Loop', count, body: body.length });
          for (let n = 0; n < count; n++) {
            for (const b of body) {
              const c = clone414C(b);
              c.__flow_loop_414C = { label: step.label || 'Loop', index: n + 1, count };
              if (!String(c.label || '').includes(`[${n+1}/${count}]`)) c.label = `${c.label || c.type || 'Step'} [${n+1}/${count}]`;
              out.push(c);
              if (out.length > maxCompiled) throw new Error('Ricetta compilata troppo lunga: limite 1000 step');
            }
          }
          i = (j < end) ? j + 1 : end;
          continue;
        }
        if (t === 'LoopEnd') { i++; continue; }
        if (t === 'RetryPolicy') {
          const next = steps[i + 1];
          if (next) {
            const c = clone414C(next);
            c.retry_count = Math.max(0, Math.min(10, Math.floor(num414C(step.retry_count ?? step.value ?? 1, 1))));
            c.retry_delay_ms = Math.max(0, Math.min(60000, Math.floor(num414C(step.retry_delay_ms ?? 500, 500))));
            c.stability_ms = Math.max(0, Math.min(60000, Math.floor(num414C(step.stability_ms ?? 0, 0))));
            c.__flow_retry_414C = { count:c.retry_count, delay_ms:c.retry_delay_ms, stability_ms:c.stability_ms };
            trace.push({ type:'RETRY', label: c.label || c.type || 'Step', count:c.retry_count, delay_ms:c.retry_delay_ms, stability_ms:c.stability_ms });
            out.push(c);
            i += 2;
            continue;
          }
          i++;
          continue;
        }
        const c = clone414C(step);
        if (t === 'Delay' || t === 'WaitStep') {
          c.type = 'Delay';
          c.timeout = Math.max(0, Math.floor(num414C(c.timeout ?? c.wait_ms ?? c.value ?? 1000, 1000)));
          c.label = c.label || `Attesa ${c.timeout} ms`;
          trace.push({ type:'WAIT', label:c.label, timeout:c.timeout });
        }
        out.push(c);
        if (out.length > maxCompiled) throw new Error('Ricetta compilata troppo lunga: limite 1000 step');
        i++;
      }
      return out;
    }

    try {
      r.steps = compileRange(0, steps.length, 0).filter(Boolean);
      r.steps.forEach((s, idx) => { s.step_id = idx + 1; });
      r.__flow_trace_414C = trace;
      r.__flow_compiled_414C = true;
    } catch(e) {
      r.__flow_error_414C = String(e?.message || e);
      r.__flow_trace_414C = trace;
    }
    return r;
  }

  const oldResolve = window.resolveRecipeForExecution414A || (typeof resolveRecipeForExecution414A === 'function' ? resolveRecipeForExecution414A : null);
  window.compileRecipeFlow414C = compileFlow414C;
  window.resolveRecipeForExecution414A = function(srcRecipe, extra){
    const base = oldResolve ? oldResolve(srcRecipe, extra || {}) : clone414C(srcRecipe || {});
    const compiled = compileFlow414C(base, extra || {});
    try {
      const tr = compiled.__flow_trace_414C || [];
      if (compiled.__flow_error_414C) addLog(document.getElementById('run-log'), `⚠ Recipe Flow Pro: ${esc414C(compiled.__flow_error_414C)}`, 'fail');
      else if (tr.length && typeof addLog === 'function') addLog(document.getElementById('run-log'), `🔁 Recipe Flow Pro: ${tr.length} regola/e di flusso compilate. Step finali: ${(compiled.steps||[]).length}.`, 'pass');
    } catch(_e) {}
    return compiled;
  };
  try { resolveRecipeForExecution414A = window.resolveRecipeForExecution414A; } catch(_e) {}

  function nextIds414C(count){
    const r = window.recipe || (typeof recipe !== 'undefined' ? recipe : null);
    const base = (typeof stepIdCounter !== 'undefined' ? stepIdCounter : (Math.max(0,...((r?.steps||[]).map(s=>Number(s.step_id)||0)))+1));
    try { stepIdCounter = base + count; } catch(_e) {}
    return Array.from({length:count}, (_,i)=>base+i);
  }
  function addLoopBlock414C(){
    const r = window.recipe || (typeof recipe !== 'undefined' ? recipe : null); if (!r) return;
    r.steps = Array.isArray(r.steps) ? r.steps : [];
    const [a,b,c] = nextIds414C(3);
    r.steps.push(
      { step_id:a, enabled:true, type:'LoopStart', label:'LOOP x3', description:'Ripete gli step interni per il numero indicato', io_type:'SYSTEM', device_mapping:'system', loop_count:3, value:3, timeout:0 },
      { step_id:b, enabled:true, type:'Delay', label:'Step interno loop - attesa', description:'Esempio step interno al loop', io_type:'SYSTEM', device_mapping:'system', timeout:500 },
      { step_id:c, enabled:true, type:'LoopEnd', label:'END LOOP', description:'Fine blocco loop', io_type:'SYSTEM', device_mapping:'system', timeout:0 }
    );
    try { if (typeof renumberRecipeSteps === 'function') renumberRecipeSteps(); } catch(_e) {}
    try { if (typeof renderSteps === 'function') renderSteps(); else if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e) {}
  }
  function addWaitStep414C(){
    const r = window.recipe || (typeof recipe !== 'undefined' ? recipe : null); if (!r) return;
    r.steps = Array.isArray(r.steps) ? r.steps : [];
    const [id] = nextIds414C(1);
    r.steps.push({ step_id:id, enabled:true, type:'Delay', label:'Attesa stabilizzazione', description:'Pausa controllata prima dello step successivo', io_type:'SYSTEM', device_mapping:'system', timeout:1000 });
    try { if (typeof renumberRecipeSteps === 'function') renumberRecipeSteps(); } catch(_e) {}
    try { if (typeof renderSteps === 'function') renderSteps(); else if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e) {}
  }
  function addRetryPolicy414C(){
    const r = window.recipe || (typeof recipe !== 'undefined' ? recipe : null); if (!r) return;
    r.steps = Array.isArray(r.steps) ? r.steps : [];
    const [id] = nextIds414C(1);
    r.steps.push({ step_id:id, enabled:true, type:'RetryPolicy', label:'Retry prossimo step', description:'Applica retry al prossimo step in fase di esecuzione/compilazione', io_type:'SYSTEM', device_mapping:'system', retry_count:3, retry_delay_ms:500, stability_ms:0, timeout:0 });
    try { if (typeof renumberRecipeSteps === 'function') renumberRecipeSteps(); } catch(_e) {}
    try { if (typeof renderSteps === 'function') renderSteps(); else if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e) {}
  }
  function simulateRecipeFlow414C(){
    const r = window.recipe || (typeof recipe !== 'undefined' ? recipe : null);
    const base = (window.compileRecipeLogic414B ? window.compileRecipeLogic414B(r || {}, {}) : clone414C(r || {}));
    const compiled = compileFlow414C(base, {});
    const tr = compiled.__flow_trace_414C || [];
    const msg = tr.length ? tr.map(x => {
      if (x.type === 'LOOP') return `LOOP · ${x.label} · ${x.count} ripetizioni · ${x.body} step interni`;
      if (x.type === 'RETRY') return `RETRY · ${x.label} · ${x.count} tentativi · delay ${x.delay_ms} ms`;
      if (x.type === 'WAIT') return `WAIT · ${x.label} · ${x.timeout} ms`;
      return `${x.type} · ${x.label || ''}`;
    }).join('\n') : 'Nessuna regola LOOP/WAIT/RETRY presente.';
    alert('Simulazione Recipe Flow Pro\n\n' + msg + `\n\nStep finali dopo compilazione: ${(compiled.steps||[]).length}` + (compiled.__flow_error_414C ? `\n\nERRORE: ${compiled.__flow_error_414C}` : ''));
  }
  window.addLoopBlock414C = addLoopBlock414C;
  window.addWaitStep414C = addWaitStep414C;
  window.addRetryPolicy414C = addRetryPolicy414C;
  window.simulateRecipeFlow414C = simulateRecipeFlow414C;

  const oldDescribe = (typeof describeRecipeStep === 'function') ? describeRecipeStep : null;
  try {
    describeRecipeStep = function(step){
      const t = String(step?.type || '');
      if (t === 'LoopStart') return `<span class="recipe-value-chip logic"><b>LOOP</b> ${esc414C(step.loop_count ?? step.value ?? 1)} ripetizioni</span><span class="recipe-value-chip"><b>Runtime</b> compilato su copia</span>`;
      if (t === 'LoopEnd') return `<span class="recipe-value-chip logic"><b>END LOOP</b> chiusura blocco</span>`;
      if (t === 'RetryPolicy') return `<span class="recipe-value-chip logic"><b>RETRY</b> ${esc414C(step.retry_count ?? 1)} tentativi</span><span class="recipe-value-chip"><b>Delay</b> ${esc414C(step.retry_delay_ms ?? 500)} ms</span><span class="recipe-value-chip"><b>Stabilità</b> ${esc414C(step.stability_ms ?? 0)} ms</span>`;
      return oldDescribe ? oldDescribe(step) : '';
    };
  } catch(_e) {}

  const oldInline = (typeof renderRecipeInlineEditor === 'function') ? renderRecipeInlineEditor : null;
  try {
    renderRecipeInlineEditor = function(step, i){
      const t = String(step?.type || '');
      const field = (label, html) => `<div><label>${label}</label>${html}</div>`;
      const input = (prop, value, inputType='text') => `<input type="${inputType}" value="${esc414C(value ?? '')}" onchange="updateRecipeStepField(${i}, '${prop}', this.value)">`;
      if (t === 'LoopStart') return `<div class="recipe-inline-edit logic-editor-414b flow-editor-414c">${field('Etichetta', input('label', step.label || 'LOOP'))}${field('Ripetizioni', input('loop_count', step.loop_count ?? step.value ?? 3, 'number'))}</div>`;
      if (t === 'LoopEnd') return `<div class="recipe-inline-edit logic-editor-414b flow-editor-414c">${field('Etichetta', input('label', step.label || 'END LOOP'))}</div>`;
      if (t === 'RetryPolicy') return `<div class="recipe-inline-edit logic-editor-414b flow-editor-414c">${field('Etichetta', input('label', step.label || 'Retry prossimo step'))}${field('Tentativi', input('retry_count', step.retry_count ?? 3, 'number'))}${field('Delay ms', input('retry_delay_ms', step.retry_delay_ms ?? 500, 'number'))}${field('Stabilità ms', input('stability_ms', step.stability_ms ?? 0, 'number'))}</div>`;
      return oldInline ? oldInline(step, i) : '';
    };
  } catch(_e) {}

  const oldVarsPanel = (typeof renderRecipeVariablesPanel414A === 'function') ? renderRecipeVariablesPanel414A : null;
  try {
    renderRecipeVariablesPanel414A = function(){
      const base = oldVarsPanel ? oldVarsPanel() : '';
      const flow = `<section class="recipe-logic-panel-414b recipe-flow-panel-414c" id="recipe-flow-panel-414c">
        <div class="recipe-logic-head-414b"><div><h3>Recipe Flow Pro</h3><p>Controllo flusso ricetta: LOOP, WAIT e RETRY compilati su copia prima dell'esecuzione.</p></div><button class="btn btn-primary btn-sm" onclick="simulateRecipeFlow414C()">Simula flow</button></div>
        <div class="recipe-logic-actions-414b"><button class="btn btn-ghost btn-sm" onclick="addLoopBlock414C()">🔁 Aggiungi LOOP</button><button class="btn btn-ghost btn-sm" onclick="addWaitStep414C()">⏱ Aggiungi WAIT</button><button class="btn btn-ghost btn-sm" onclick="addRetryPolicy414C()">↻ Retry prossimo step</button></div>
        <div class="recipe-logic-note-414b">Sicuro: il motore compila una copia della ricetta. La ricetta originale resta modificabile e non vengono toccati backend, permessi o Device Manager.</div>
      </section>`;
      return base + flow;
    };
  } catch(_e) {}

  try {
    const style = document.createElement('style');
    style.textContent = `.recipe-flow-panel-414c{border-color:rgba(80,200,255,.25)} .flow-editor-414c input{min-width:120px}`;
    document.head.appendChild(style);
  } catch(_e) {}

  setTimeout(()=>{ try { if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e){} }, 300);
})();


/* AT-MEC 4.14D - Recipe Enterprise Pro (SAFE)
 * Aggiunge blocchi/sub-ricette riutilizzabili e simulatore enterprise.
 * Compila su COPIA prima dell'avvio: non modifica backend, login, utenti, ruoli, permessi, Device Manager o report.
 */
(function(){
  const ENTERPRISE_VERSION_414D = 'AT-MEC_HM_4.14D_RECIPE_ENTERPRISE_PRO';
  const esc414D = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const clone414D = (obj) => JSON.parse(JSON.stringify(obj || {}));
  const STORE_414D = 'atmec_recipe_enterprise_blocks_414d';

  function currentRecipe414D(){ return window.recipe || (typeof recipe !== 'undefined' ? recipe : null); }
  function nextIds414D(count){
    const r = currentRecipe414D();
    const max = Math.max(0, ...(((r && r.steps) || []).map(s => Number(s.step_id) || 0)));
    let base = (typeof stepIdCounter !== 'undefined') ? Number(stepIdCounter || max + 1) : max + 1;
    if (!Number.isFinite(base) || base <= max) base = max + 1;
    try { stepIdCounter = base + count; } catch(_e) {}
    return Array.from({length:count}, (_,i)=>base+i);
  }

  function defaultLibrary414D(){
    return {
      PowerOn: {
        name:'PowerOn', title:'Power On sicuro', category:'Power', description:'Accensione controllata alimentazione e stabilizzazione iniziale.',
        steps:[
          { type:'BlockStart', label:'START PowerOn', description:'Inizio blocco PowerOn', io_type:'SYSTEM', device_mapping:'system' },
          { type:'Delay', label:'Stabilizzazione alimentazione', description:'Attesa dopo accensione', io_type:'SYSTEM', device_mapping:'system', timeout:1000 },
          { type:'BlockEnd', label:'END PowerOn', description:'Fine blocco PowerOn', io_type:'SYSTEM', device_mapping:'system' }
        ]
      },
      MeasureVoltage: {
        name:'MeasureVoltage', title:'Misura tensione standard', category:'Measurement', description:'Blocco base per misura tensione con device mapping configurabile.',
        steps:[
          { type:'BlockStart', label:'START Misura tensione', description:'Inizio blocco misura tensione', io_type:'SYSTEM', device_mapping:'system' },
          { type:'ManualMeasure', label:'Misura tensione', description:'Misura tensione e registra valore', io_type:'MEASURE', measure_type:'voltage', unit:'V', device_mapping:'multimeter', min:'${VOLTAGE_MIN}', max:'${VOLTAGE_MAX}', timeout:2000 },
          { type:'BlockEnd', label:'END Misura tensione', description:'Fine blocco misura tensione', io_type:'SYSTEM', device_mapping:'system' }
        ]
      },
      PowerOff: {
        name:'PowerOff', title:'Power Off sicuro', category:'Safety', description:'Spegnimento controllato e attesa di sicurezza.',
        steps:[
          { type:'BlockStart', label:'START PowerOff', description:'Inizio blocco PowerOff', io_type:'SYSTEM', device_mapping:'system' },
          { type:'Delay', label:'Attesa spegnimento sicuro', description:'Attesa dopo OFF', io_type:'SYSTEM', device_mapping:'system', timeout:500 },
          { type:'BlockEnd', label:'END PowerOff', description:'Fine blocco PowerOff', io_type:'SYSTEM', device_mapping:'system' }
        ]
      }
    };
  }

  function loadLibrary414D(){
    try {
      const raw = localStorage.getItem(STORE_414D);
      const parsed = raw ? JSON.parse(raw) : {};
      return Object.assign(defaultLibrary414D(), parsed || {});
    } catch(_e) { return defaultLibrary414D(); }
  }
  function saveLibrary414D(lib){
    try { localStorage.setItem(STORE_414D, JSON.stringify(lib || {}, null, 2)); return true; } catch(_e) { return false; }
  }

  function blockToSteps414D(block, sourceName){
    const arr = Array.isArray(block?.steps) ? block.steps : [];
    return arr.map((s, idx) => {
      const c = clone414D(s);
      c.__enterprise_block_414D = sourceName || block?.name || block?.title || 'Blocco';
      c.description = c.description || `Step da blocco ${sourceName || block?.name || ''}`;
      return c;
    });
  }

  function compileEnterprise414D(srcRecipe, extra){
    const r = clone414D(srcRecipe || {});
    const steps = Array.isArray(r.steps) ? r.steps : [];
    const lib = Object.assign(defaultLibrary414D(), r.blockLibrary414D || {}, loadLibrary414D());
    const out = [];
    const trace = [];
    try {
      for (const step of steps) {
        const t = String(step?.type || '');
        if (t === 'SubRecipeCall') {
          const key = String(step.subrecipe_name || step.block_name || step.value || '').trim();
          const block = lib[key];
          if (!key || !block) {
            const c = clone414D(step);
            c.type = 'ManualStep';
            c.label = c.label || `Sub-ricetta mancante: ${key || 'N/D'}`;
            c.description = `ATTENZIONE: blocco/sub-ricetta non trovato (${key || 'N/D'}). Verificare libreria ricetta.`;
            c.__enterprise_warning_414D = true;
            out.push(c);
            trace.push({ type:'MISSING', name:key || 'N/D', count:1 });
          } else {
            const expanded = blockToSteps414D(block, key);
            expanded.forEach(s => out.push(s));
            trace.push({ type:'SUBRECIPE', name:key, count:expanded.length });
          }
          continue;
        }
        const c = clone414D(step);
        if (t === 'BlockStart' || t === 'BlockEnd') c.enabled = c.enabled !== false;
        out.push(c);
      }
      r.steps = out.filter(Boolean).map((s, idx) => Object.assign(s, { step_id: idx + 1 }));
      r.__enterprise_compiled_414D = true;
      r.__enterprise_trace_414D = trace;
    } catch(e) {
      r.__enterprise_error_414D = String(e?.message || e);
      r.__enterprise_trace_414D = trace;
    }
    return r;
  }

  const oldResolve414D = window.resolveRecipeForExecution414A || (typeof resolveRecipeForExecution414A === 'function' ? resolveRecipeForExecution414A : null);
  window.compileRecipeEnterprise414D = compileEnterprise414D;
  window.resolveRecipeForExecution414A = function(srcRecipe, extra){
    const base = oldResolve414D ? oldResolve414D(srcRecipe, extra || {}) : clone414D(srcRecipe || {});
    const compiled = compileEnterprise414D(base, extra || {});
    try {
      const tr = compiled.__enterprise_trace_414D || [];
      if (compiled.__enterprise_error_414D && typeof addLog === 'function') addLog(document.getElementById('run-log'), `⚠ Recipe Enterprise Pro: ${esc414D(compiled.__enterprise_error_414D)}`, 'fail');
      else if (tr.length && typeof addLog === 'function') addLog(document.getElementById('run-log'), `🏗 Recipe Enterprise Pro: ${tr.length} blocco/i compilati. Step finali: ${(compiled.steps||[]).length}.`, 'pass');
    } catch(_e) {}
    return compiled;
  };
  try { resolveRecipeForExecution414A = window.resolveRecipeForExecution414A; } catch(_e) {}

  function addSubRecipeCall414D(name){
    const r = currentRecipe414D(); if (!r) return;
    r.steps = Array.isArray(r.steps) ? r.steps : [];
    const [id] = nextIds414D(1);
    r.steps.push({ step_id:id, enabled:true, type:'SubRecipeCall', label:`Sub-ricetta: ${name || 'PowerOn'}`, description:'Richiama un blocco riutilizzabile dalla libreria Recipe Enterprise.', io_type:'SYSTEM', device_mapping:'system', subrecipe_name:name || 'PowerOn', timeout:0 });
    try { if (typeof renumberRecipeSteps === 'function') renumberRecipeSteps(); } catch(_e) {}
    try { if (typeof renderSteps === 'function') renderSteps(); else if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e) {}
  }

  function addEnterpriseBlock414D(kind){
    const r = currentRecipe414D(); if (!r) return;
    const lib = loadLibrary414D();
    const block = lib[kind] || defaultLibrary414D()[kind];
    if (!block) return addSubRecipeCall414D(kind || 'PowerOn');
    r.steps = Array.isArray(r.steps) ? r.steps : [];
    const expanded = blockToSteps414D(block, kind);
    const ids = nextIds414D(expanded.length);
    expanded.forEach((s,i)=>{ s.step_id = ids[i]; r.steps.push(s); });
    try { if (typeof renumberRecipeSteps === 'function') renumberRecipeSteps(); } catch(_e) {}
    try { if (typeof renderSteps === 'function') renderSteps(); else if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e) {}
  }

  function saveCurrentStepsAsBlock414D(){
    const r = currentRecipe414D(); if (!r) return alert('Nessuna ricetta aperta.');
    const name = prompt('Nome blocco/sub-ricetta da salvare:', 'CustomBlock');
    if (!name) return;
    const steps = (r.steps || []).filter(s => !['SubRecipeCall'].includes(String(s.type || ''))).map(s => {
      const c = clone414D(s); delete c.step_id; return c;
    });
    if (!steps.length) return alert('Nessuno step salvabile nel blocco.');
    const lib = loadLibrary414D();
    lib[name] = { name, title:name, category:'Custom', description:`Blocco creato dalla ricetta ${r.name || r.recipeName || ''}`, steps };
    saveLibrary414D(lib);
    alert(`Blocco "${name}" salvato in libreria (${steps.length} step).`);
    try { if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e) {}
  }

  function simulateRecipeEnterprise414D(){
    const r = currentRecipe414D() || {};
    let base = r;
    try { if (window.compileRecipeLogic414B) base = window.compileRecipeLogic414B(base, {}); } catch(_e) {}
    try { if (window.compileRecipeFlow414C) base = window.compileRecipeFlow414C(base, {}); } catch(_e) {}
    const compiled = compileEnterprise414D(base, {});
    const tr = compiled.__enterprise_trace_414D || [];
    const msg = tr.length ? tr.map(x => {
      if (x.type === 'SUBRECIPE') return `SUB-RICETTA · ${x.name} · ${x.count} step espansi`;
      if (x.type === 'MISSING') return `MANCANTE · ${x.name}`;
      return `${x.type} · ${x.name || ''}`;
    }).join('\n') : 'Nessuna sub-ricetta/blocco enterprise da compilare.';
    alert('Simulazione Recipe Enterprise Pro\n\n' + msg + `\n\nStep finali dopo compilazione: ${(compiled.steps||[]).length}` + (compiled.__enterprise_error_414D ? `\n\nERRORE: ${compiled.__enterprise_error_414D}` : ''));
  }

  window.addSubRecipeCall414D = addSubRecipeCall414D;
  window.addEnterpriseBlock414D = addEnterpriseBlock414D;
  window.saveCurrentStepsAsBlock414D = saveCurrentStepsAsBlock414D;
  window.simulateRecipeEnterprise414D = simulateRecipeEnterprise414D;

  const oldDescribe414D = (typeof describeRecipeStep === 'function') ? describeRecipeStep : null;
  try {
    describeRecipeStep = function(step){
      const t = String(step?.type || '');
      if (t === 'SubRecipeCall') return `<span class="recipe-value-chip logic"><b>SUB-RICETTA</b> ${esc414D(step.subrecipe_name || step.block_name || 'N/D')}</span><span class="recipe-value-chip"><b>Enterprise</b> espansa su copia</span>`;
      if (t === 'BlockStart') return `<span class="recipe-value-chip logic"><b>BLOCCO START</b> ${esc414D(step.__enterprise_block_414D || step.label || '')}</span>`;
      if (t === 'BlockEnd') return `<span class="recipe-value-chip logic"><b>BLOCCO END</b> ${esc414D(step.__enterprise_block_414D || step.label || '')}</span>`;
      return oldDescribe414D ? oldDescribe414D(step) : '';
    };
  } catch(_e) {}

  const oldInline414D = (typeof renderRecipeInlineEditor === 'function') ? renderRecipeInlineEditor : null;
  try {
    renderRecipeInlineEditor = function(step, i){
      const t = String(step?.type || '');
      const field = (label, html) => `<div><label>${label}</label>${html}</div>`;
      const input = (prop, value) => `<input type="text" value="${esc414D(value ?? '')}" onchange="updateRecipeStepField(${i}, '${prop}', this.value)">`;
      if (t === 'SubRecipeCall') {
        const lib = loadLibrary414D();
        const opts = Object.keys(lib).map(k => `<option value="${esc414D(k)}" ${(step.subrecipe_name||'')===k?'selected':''}>${esc414D(k)} · ${esc414D(lib[k].title||'')}</option>`).join('');
        return `<div class="recipe-inline-edit enterprise-editor-414d">${field('Etichetta', input('label', step.label || 'Sub-ricetta'))}<div><label>Blocco/Sub-ricetta</label><select onchange="updateRecipeStepField(${i}, 'subrecipe_name', this.value)">${opts}</select></div></div>`;
      }
      if (t === 'BlockStart' || t === 'BlockEnd') return `<div class="recipe-inline-edit enterprise-editor-414d">${field('Etichetta', input('label', step.label || t))}${field('Descrizione', input('description', step.description || ''))}</div>`;
      return oldInline414D ? oldInline414D(step, i) : '';
    };
  } catch(_e) {}

  const oldPanel414D = (typeof renderRecipeVariablesPanel414A === 'function') ? renderRecipeVariablesPanel414A : null;
  try {
    renderRecipeVariablesPanel414A = function(){
      const base = oldPanel414D ? oldPanel414D() : '';
      const lib = loadLibrary414D();
      const cards = Object.keys(lib).map(k => `<button class="enterprise-card-414d" onclick="addSubRecipeCall414D('${esc414D(k)}')"><b>${esc414D(k)}</b><span>${esc414D(lib[k].title || '')}</span><small>${esc414D((lib[k].steps||[]).length)} step · ${esc414D(lib[k].category||'Library')}</small></button>`).join('');
      return base + `<section class="recipe-enterprise-panel-414d" id="recipe-enterprise-panel-414d">
        <div class="recipe-enterprise-head-414d"><div><h3>Recipe Enterprise Pro</h3><p>Sub-ricette, blocchi riutilizzabili, libreria e simulatore. Tutto viene espanso su copia prima dell'esecuzione.</p></div><button class="btn btn-primary btn-sm" onclick="simulateRecipeEnterprise414D()">Simula enterprise</button></div>
        <div class="recipe-enterprise-actions-414d"><button class="btn btn-ghost btn-sm" onclick="addEnterpriseBlock414D('PowerOn')">⚡ Inserisci PowerOn</button><button class="btn btn-ghost btn-sm" onclick="addEnterpriseBlock414D('MeasureVoltage')">📏 Inserisci Misura V</button><button class="btn btn-ghost btn-sm" onclick="addEnterpriseBlock414D('PowerOff')">⏻ Inserisci PowerOff</button><button class="btn btn-ghost btn-sm" onclick="saveCurrentStepsAsBlock414D()">💾 Salva step come blocco</button></div>
        <div class="enterprise-library-414d">${cards}</div>
        <div class="recipe-logic-note-414b">Suggerimento: usa le sub-ricette per PowerOn, misura standard, PowerOff e sequenze ripetitive. Nella fase di test vengono espanse senza modificare la ricetta originale.</div>
      </section>`;
    };
  } catch(_e) {}

  try {
    const style = document.createElement('style');
    style.textContent = `.recipe-enterprise-panel-414d{margin-top:12px;border:1px solid rgba(155,120,255,.28);border-radius:16px;background:rgba(155,120,255,.055);padding:14px}.recipe-enterprise-head-414d{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.recipe-enterprise-head-414d h3{margin:0 0 4px;font-size:16px}.recipe-enterprise-head-414d p{margin:0;color:var(--text2);font-size:12px}.recipe-enterprise-actions-414d{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.enterprise-library-414d{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.enterprise-card-414d{text-align:left;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);border-radius:12px;padding:10px;color:var(--text);cursor:pointer}.enterprise-card-414d:hover{border-color:rgba(0,212,255,.35);background:rgba(0,212,255,.06)}.enterprise-card-414d b{display:block;font-size:13px}.enterprise-card-414d span{display:block;color:var(--text2);font-size:11px;margin-top:3px}.enterprise-card-414d small{display:block;color:var(--accent);font-size:10px;margin-top:6px}.enterprise-editor-414d select{min-width:180px}`;
    document.head.appendChild(style);
  } catch(_e) {}

  setTimeout(()=>{ try { if (typeof renderRecipePage === 'function') renderRecipePage(); } catch(_e){} }, 300);
})();


/* AT-MEC 4.15B - Test Engine Pro (SAFE)
 * Runtime variables + Universal Measurements UI layer.
 * Non modifica backend, login, ruoli, permessi, Device Manager o report.
 */
(function(){
  const VERSION_415A = 'AT-MEC_HM_4.15B_TEST_ENGINE_PRO';
  const esc415A = (s)=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const clone415A = (o)=>JSON.parse(JSON.stringify(o||{}));
  window.__atmecRuntimeVars415A = window.__atmecRuntimeVars415A || {};
  window.__atmecRuntimeTrace415A = window.__atmecRuntimeTrace415A || [];

  function now415A(){ return new Date().toLocaleTimeString('it-IT'); }
  function norm415A(k){ return String(k||'').trim().replace(/^\$\{/,'').replace(/\}$/,'').replace(/[^A-Za-z0-9_]/g,'_').toUpperCase(); }
  function setRuntimeVar415A(k,v, meta={}){
    const nk=norm415A(k); if(!nk) return;
    window.__atmecRuntimeVars415A[nk]=v;
    window.__atmecRuntimeTrace415A.unshift({ key:nk, value:v, ts:Date.now(), ...meta });
    window.__atmecRuntimeTrace415A = window.__atmecRuntimeTrace415A.slice(0,80);
    try { renderRuntimePanel415A(); } catch(_e) {}
  }
  function getCtx415A(extra={}){
    let ctx={};
    try { if (typeof getRecipeVariableContext414A === 'function') ctx = getRecipeVariableContext414A(extra); } catch(_e) {}
    try { Object.entries(window.__atmecRuntimeVars415A||{}).forEach(([k,v])=>{ ctx[norm415A(k)] = v; }); } catch(_e) {}
    return ctx;
  }
  function val415A(raw, ctx){
    if (typeof raw === 'string') {
      const m = raw.match(/^\s*\$\{\s*([A-Za-z0-9_]+)\s*\}\s*$/);
      if (m) return ctx[norm415A(m[1])] ?? '';
      try { if (typeof resolveRecipeTemplate414A === 'function') return resolveRecipeTemplate414A(raw, ctx); } catch(_e) {}
    }
    return raw;
  }
  function num415A(v){ return /^-?\d+(\.\d+)?$/.test(String(v??'').replace(',','.').trim()); }
  function evalRuntimeCond415A(step, ctx){
    const left = val415A(step.runtime_left || step.logic_left || step.left || '', ctx);
    const right = val415A(step.runtime_right ?? step.logic_right ?? step.right ?? '', ctx);
    const op = String(step.runtime_operator || step.logic_operator || step.operator || '==').trim().toUpperCase();
    const a = num415A(left) && num415A(right) ? Number(String(left).replace(',','.')) : String(left??'');
    const b = num415A(left) && num415A(right) ? Number(String(right).replace(',','.')) : String(right??'');
    if(op==='==' || op==='=') return a == b;
    if(op==='!=' || op==='<>') return a != b;
    if(op==='>') return a > b;
    if(op==='<') return a < b;
    if(op==='>=') return a >= b;
    if(op==='<=') return a <= b;
    if(op==='CONTAINS') return String(a).includes(String(b));
    if(op==='EXISTS') return String(left??'').trim() !== '';
    if(op==='EMPTY') return String(left??'').trim() === '';
    return false;
  }
  function compileRuntimeBlocks415A(srcRecipe, extra={}){
    const r=clone415A(srcRecipe||{}); const steps=Array.isArray(r.steps)?r.steps:[]; const ctx=getCtx415A(extra);
    const out=[]; const stack=[]; const trace=[];
    const parentActive=()=>stack.every(s=>s.active);
    const parentBeforeTop=()=>stack.slice(0,-1).every(s=>s.active);
    for(const st of steps){
      const t=String(st?.type||'');
      if(t==='RuntimeIf'){
        const pass=evalRuntimeCond415A(st, ctx);
        stack.push({pass, active:parentActive() && pass});
        trace.push({type:'IF', label:st.label||'Runtime IF', condition:`${st.runtime_left||''} ${st.runtime_operator||'=='} ${st.runtime_right??''}`, result:pass?'TRUE':'FALSE'});
        continue;
      }
      if(t==='RuntimeElse'){
        const top=stack[stack.length-1]; if(top) top.active = parentBeforeTop() && !top.pass;
        trace.push({type:'ELSE'}); continue;
      }
      if(t==='RuntimeEndIf'){ stack.pop(); trace.push({type:'END_IF'}); continue; }
      if(parentActive()) out.push(st);
    }
    r.steps = out.map((s,i)=>Object.assign(s,{step_id:i+1}));
    r.__runtime_trace_415A=trace;
    r.__runtime_vars_415A=ctx;
    return r;
  }

  const oldResolve415A = window.resolveRecipeForExecution414A || (typeof resolveRecipeForExecution414A === 'function' ? resolveRecipeForExecution414A : null);
  window.compileRecipeRuntime415A = compileRuntimeBlocks415A;
  window.resolveRecipeForExecution414A = function(srcRecipe, extra){
    window.__atmecRuntimeVars415A = {};
    window.__atmecRuntimeTrace415A = [];
    const base = oldResolve415A ? oldResolve415A(srcRecipe, extra||{}) : clone415A(srcRecipe||{});
    const compiled = compileRuntimeBlocks415A(base, extra||{});
    try {
      const tr=compiled.__runtime_trace_415A||[];
      if(tr.length && typeof addLog==='function') addLog(document.getElementById('run-log'), `🧩 Test Engine Pro: ${tr.length} regola/e runtime preparate.`, 'info');
    } catch(_e) {}
    return compiled;
  };
  try { resolveRecipeForExecution414A = window.resolveRecipeForExecution414A; } catch(_e) {}

  function currentRecipe415A(){ return window.recipe || (typeof recipe!=='undefined' ? recipe : null); }
  function nextIds415A(count){
    const r=currentRecipe415A(); const base=(typeof stepIdCounter!=='undefined'?stepIdCounter:(Math.max(0,...((r?.steps||[]).map(s=>Number(s.step_id)||0)))+1));
    try { stepIdCounter = base + count; } catch(_e) {}
    return Array.from({length:count},(_,i)=>base+i);
  }
  const templates415A={
    voltage:{type:'VoltageMeasurement',label:'Misura tensione runtime',description:'Misura universale tensione con salvataggio variabile runtime',io_type:'SCPI',device_mapping:'Keysight_34461A',command:'MEAS:VOLT:DC?',target:12.0,tolerance:0.5,min:11.5,max:12.5,unit:'V',timeout:2500,measurement_mode:'auto_with_fallback',manual_fallback_enabled:true,save_as_variable:'VOLTAGE'},
    current:{type:'CurrentMeasurement',label:'Misura corrente runtime',description:'Misura universale corrente con salvataggio variabile runtime',io_type:'SCPI',device_mapping:'Keysight_34461A',command:'MEAS:CURR:DC?',target:0.5,tolerance:0.2,min:0.0,max:1.0,unit:'A',timeout:2500,measurement_mode:'auto_with_fallback',manual_fallback_enabled:true,save_as_variable:'CURRENT'},
    resistance:{type:'ResistanceTest',label:'Misura resistenza runtime',description:'Misura universale resistenza con salvataggio variabile runtime',io_type:'SCPI',device_mapping:'Keysight_34461A',command:'MEAS:RES?',target:500,tolerance:50,min:450,max:550,unit:'Ω',timeout:2500,measurement_mode:'auto_with_fallback',manual_fallback_enabled:true,save_as_variable:'RESISTANCE'},
    frequency:{type:'FrequencyTest',label:'Misura frequenza runtime',description:'Misura universale frequenza con salvataggio variabile runtime',io_type:'SCPI',device_mapping:'Keysight_34461A',command:'MEAS:FREQ?',target:1000,tolerance:10,min:990,max:1010,unit:'Hz',timeout:2500,measurement_mode:'auto_with_fallback',manual_fallback_enabled:true,save_as_variable:'FREQUENCY'},
    continuity:{type:'ManualMeasurement',label:'Controllo continuità runtime',description:'Controllo continuità con variabile runtime',io_type:'SCPI',device_mapping:'Keysight_34461A',command:'MEAS:RES?',target:0,tolerance:10,min:0,max:10,unit:'Ω',timeout:2500,measurement_mode:'auto_with_fallback',manual_fallback_enabled:true,manual_measure_type:'CONTINUITY',save_as_variable:'CONTINUITY'},
    temperature:{type:'ManualMeasurement',label:'Temperatura runtime',description:'Misura temperatura manuale con variabile runtime',io_type:'SYSTEM',device_mapping:'manual',target:25,tolerance:10,min:15,max:35,unit:'°C',timeout:0,measurement_mode:'manual',manual_input_enabled:true,manual_measure_type:'TEMPERATURE',save_as_variable:'TEMPERATURE'},
    power:{type:'ManualMeasurement',label:'Potenza runtime',description:'Misura potenza manuale con variabile runtime',io_type:'SYSTEM',device_mapping:'manual',target:10,tolerance:5,min:5,max:15,unit:'W',timeout:0,measurement_mode:'manual',manual_input_enabled:true,manual_measure_type:'POWER',save_as_variable:'POWER'}
  };
  function addUniversalMeasurement415A(kind){
    const r=currentRecipe415A(); if(!r) return alert('Nessuna ricetta aperta.'); r.steps=Array.isArray(r.steps)?r.steps:[];
    const t=clone415A(templates415A[kind]||templates415A.voltage); const [id]=nextIds415A(1); t.step_id=id; r.steps.push(t);
    try { if(typeof renumberRecipeSteps==='function') renumberRecipeSteps(); } catch(_e) {}
    try { if(typeof renderSteps==='function') renderSteps(); if(typeof renderRecipePage==='function') renderRecipePage(); } catch(_e) {}
  }
  function addRuntimeIfBlock415A(){
    const r=currentRecipe415A(); if(!r) return alert('Nessuna ricetta aperta.'); r.steps=Array.isArray(r.steps)?r.steps:[];
    const [a,b,c]=nextIds415A(3);
    r.steps.push(
      {step_id:a,enabled:true,type:'RuntimeIf',label:'IF runtime su misura',description:'Valuta la condizione usando variabili runtime aggiornate dagli step precedenti',io_type:'SYSTEM',device_mapping:'system',runtime_left:'${VOLTAGE}',runtime_operator:'>=',runtime_right:'11.5'},
      {step_id:b,enabled:true,type:'RuntimeElse',label:'ELSE runtime',description:'Ramo alternativo se la condizione runtime è falsa',io_type:'SYSTEM',device_mapping:'system'},
      {step_id:c,enabled:true,type:'RuntimeEndIf',label:'END IF runtime',description:'Fine blocco runtime',io_type:'SYSTEM',device_mapping:'system'}
    );
    try { if(typeof renumberRecipeSteps==='function') renumberRecipeSteps(); } catch(_e) {}
    try { if(typeof renderSteps==='function') renderSteps(); if(typeof renderRecipePage==='function') renderRecipePage(); } catch(_e) {}
  }
  function simulateTestEngine415A(){
    const r=currentRecipe415A()||{}; const compiled=compileRuntimeBlocks415A(r,{}); const tr=compiled.__runtime_trace_415A||[];
    const vars=getCtx415A({}); const v=Object.keys(vars).slice(0,20).map(k=>`${k} = ${vars[k]}`).join('\n') || 'Nessuna variabile disponibile.';
    const t=tr.map(x=>x.type==='IF'?`IF ${x.condition} → ${x.result}`:x.type).join('\n') || 'Nessun blocco runtime IF presente.';
    alert(`Test Engine Pro 4.15B\n\nVariabili:\n${v}\n\nFlow runtime:\n${t}\n\nStep eseguibili: ${(compiled.steps||[]).length}`);
  }
  function renderRuntimePanel415A(){
    const el=document.getElementById('runtime-vars-list-415a'); if(!el) return;
    const rows=Object.entries(window.__atmecRuntimeVars415A||{}).map(([k,v])=>`<div class="rt-var-415a"><b>\${${esc415A(k)}}</b><span>${esc415A(v)}</span></div>`).join('');
    el.innerHTML = rows || '<div class="hint">Nessuna variabile runtime ancora aggiornata durante il test.</div>';
  }

  window.addUniversalMeasurement415A=addUniversalMeasurement415A;
  window.addRuntimeIfBlock415A=addRuntimeIfBlock415A;
  window.simulateTestEngine415A=simulateTestEngine415A;
  window.setRuntimeVar415A=setRuntimeVar415A;

  try {
    const oldDesc415A=(typeof describeRecipeStep==='function')?describeRecipeStep:null;
    describeRecipeStep=function(step){
      const t=String(step?.type||'');
      if(t==='RuntimeIf') return `<span class="recipe-value-chip logic"><b>IF runtime</b> ${esc415A(step.runtime_left||'')} ${esc415A(step.runtime_operator||'==')} ${esc415A(step.runtime_right??'')}</span>`;
      if(t==='RuntimeElse') return `<span class="recipe-value-chip logic"><b>ELSE runtime</b></span>`;
      if(t==='RuntimeEndIf') return `<span class="recipe-value-chip logic"><b>END IF runtime</b></span>`;
      const base=oldDesc415A?oldDesc415A(step):'';
      if(step?.save_as_variable) return base + `<span class="recipe-value-chip"><b>VAR</b> \${${esc415A(step.save_as_variable)}}</span>`;
      return base;
    };
  } catch(_e) {}

  try {
    const oldInline415A=(typeof renderRecipeInlineEditor==='function')?renderRecipeInlineEditor:null;
    renderRecipeInlineEditor=function(step,i){
      const t=String(step?.type||'');
      const input=(prop,val)=>`<input type="text" value="${esc415A(val??'')}" onchange="updateRecipeStepField(${i}, '${prop}', this.value)">`;
      if(t==='RuntimeIf') return `<div class="recipe-inline-edit runtime-editor-415a"><div><label>Variabile sinistra</label>${input('runtime_left',step.runtime_left||'${VOLTAGE}')}</div><div><label>Operatore</label><select onchange="updateRecipeStepField(${i}, 'runtime_operator', this.value)">${['==','!=','>','<','>=','<=','CONTAINS','EXISTS','EMPTY'].map(o=>`<option value="${o}" ${String(step.runtime_operator||'>=')===o?'selected':''}>${o}</option>`).join('')}</select></div><div><label>Valore destro</label>${input('runtime_right',step.runtime_right??'11.5')}</div></div>`;
      const base=oldInline415A?oldInline415A(step,i):'';
      if(/Measurement|Current|Voltage|Resistance|Frequency|Manual/i.test(t)) return base + `<div class="recipe-inline-edit runtime-editor-415a"><div><label>Salva valore come variabile runtime</label>${input('save_as_variable',step.save_as_variable||'')}</div></div>`;
      return base;
    };
  } catch(_e) {}

  try {
    const oldPanel415A=(typeof renderRecipeVariablesPanel414A==='function')?renderRecipeVariablesPanel414A:null;
    renderRecipeVariablesPanel414A=function(){
      const base=oldPanel415A?oldPanel415A():'';
      return base + `<section class="test-engine-panel-415a" id="test-engine-panel-415a">
        <div class="recipe-enterprise-head-414d"><div><h3>Test Engine Pro 4.15B</h3><p>Runtime variables, IF runtime e misure universali con pannello live. Le modifiche sono applicate su copia prima dell'esecuzione.</p></div><button class="btn btn-primary btn-sm" onclick="simulateTestEngine415A()">Simula Test Engine</button></div>
        <div class="recipe-enterprise-actions-414d"><button class="btn btn-ghost btn-sm" onclick="addUniversalMeasurement415A('voltage')">📏 Tensione</button><button class="btn btn-ghost btn-sm" onclick="addUniversalMeasurement415A('current')">🔌 Corrente</button><button class="btn btn-ghost btn-sm" onclick="addUniversalMeasurement415A('resistance')">Ω Resistenza</button><button class="btn btn-ghost btn-sm" onclick="addUniversalMeasurement415A('frequency')">Hz Frequenza</button><button class="btn btn-ghost btn-sm" onclick="addUniversalMeasurement415A('continuity')">🔗 Continuità</button><button class="btn btn-ghost btn-sm" onclick="addUniversalMeasurement415A('temperature')">🌡 Temperatura</button><button class="btn btn-ghost btn-sm" onclick="addUniversalMeasurement415A('power')">⚡ Potenza</button><button class="btn btn-ghost btn-sm" onclick="addRuntimeIfBlock415A()">🧠 IF runtime</button></div>
        <div class="runtime-grid-415a"><div><b>Variabili runtime durante test</b><div id="runtime-vars-list-415a" class="runtime-vars-list-415a"><div class="hint">Nessuna variabile runtime ancora aggiornata durante il test.</div></div></div><div><b>Uso consigliato</b><div class="hint">1) Inserisci una misura universale e salva come VOLTAGE. 2) Aggiungi IF runtime su \${VOLTAGE}. 3) Avvia il test: il pannello live mostra valore, target, tolleranza, device ed esito.</div></div></div>
      </section>`;
    };
  } catch(_e) {}

  function maybeCaptureFromStep415A(data, status){
    try {
      const st=(currentRecipe415A()?.steps||[]).find(x=>Number(x.step_id)===Number(data?.step_id)) || {};
      const key=st.save_as_variable || data?.save_as_variable || data?.variable || '';
      const val=data?.value ?? data?.measured ?? data?.measurement ?? data?.current ?? data?.voltage ?? data?.resultValue;
      if(key && val!==undefined && val!==null && val!=='') setRuntimeVar415A(key,val,{ step_id:data?.step_id, status, unit:st.unit||data?.unit||'', device:st.device_mapping||data?.device||'' });
      if(typeof setLiveMeasurePanel319==='function' && (val!==undefined || /Measurement|Current|Voltage|Resistance|Frequency|Manual/i.test(String(st.type||'')))) setLiveMeasurePanel319({...st,...data,value:val,pass:status==='PASS'?true:status==='FAIL'?false:null,timestamp:Date.now()});
    } catch(_e) {}
  }
  try {
    if(window.api?.on){
      window.api.on('step-passed', data=>maybeCaptureFromStep415A(data,'PASS'));
      window.api.on('step-failed', data=>maybeCaptureFromStep415A(data,'FAIL'));
      window.api.on('step-detail', data=>maybeCaptureFromStep415A(data, String(data?.level||'INFO').toUpperCase()));
    }
  } catch(_e) {}

  try {
    const style=document.createElement('style');
    style.textContent=`.test-engine-panel-415a{margin-top:12px;border:1px solid rgba(0,212,255,.28);border-radius:16px;background:linear-gradient(135deg,rgba(0,212,255,.06),rgba(44,120,255,.045));padding:14px}.runtime-grid-415a{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin-top:12px}.runtime-vars-list-415a{display:grid;gap:6px;margin-top:8px}.rt-var-415a{display:grid;grid-template-columns:150px 1fr;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:7px 9px;background:rgba(255,255,255,.035);font-size:12px}.rt-var-415a b{color:var(--accent)}.rt-var-415a span{font-weight:800}.runtime-editor-415a{border-color:rgba(0,212,255,.22)!important;background:rgba(0,212,255,.04)!important}.runtime-editor-415a select{min-width:90px}`;
    document.head.appendChild(style);
  } catch(_e) {}
  setTimeout(()=>{ try { if(typeof renderRecipePage==='function') renderRecipePage(); } catch(_e){} },350);
})();
