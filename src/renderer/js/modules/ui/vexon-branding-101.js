(function(){
  const NAME='VEXON';
  const SUB='Industrial Test Platform';
  const VERSION='10.1.1';

  function safe(fn){ try{ fn(); } catch(e){} }

  function applyVexonNameOnly(){
    document.title = `${NAME} ${VERSION} - ${SUB}`;

    const loginSub = document.querySelector('.login-sub');
    if (loginSub) loginSub.textContent = SUB;

    const appTitle = document.getElementById('app-title-logo');
    if (appTitle) {
      appTitle.textContent = NAME;
      appTitle.style.display = 'inline-flex';
    }

    document.querySelectorAll('.app-subtitle-pro').forEach(e => { e.textContent = SUB; });

    const global = document.getElementById('vexon-global-top-brand');
    if (global) global.style.display = 'inline-flex';

    const prod = document.getElementById('vexon-prod-top-brand');
    if (prod) prod.style.display = 'inline-flex';

    const labelBrand = document.querySelector('.tm-label-brand420');
    if (labelBrand) labelBrand.textContent = NAME;
  }

  document.addEventListener('DOMContentLoaded', () => {
    safe(applyVexonNameOnly);
    setTimeout(() => safe(applyVexonNameOnly), 250);
  });

  window.applyVexonBranding101 = applyVexonNameOnly;
})();
