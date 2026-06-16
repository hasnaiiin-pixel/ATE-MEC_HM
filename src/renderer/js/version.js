// AT-MEC_HM 4.22A - UI Navigation Cleanup version consistency
(function(){
  window.AT_MEC_VERSION = '4.22.1';
  window.AT_MEC_RELEASE = 'AT-MEC_HM_4.22A_UI_NAVIGATION_CLEANUP';
  window.AT_MEC_RELEASE_LABEL = '4.22A UI NAVIGATION CLEANUP';
  try {
    document.addEventListener('DOMContentLoaded', function(){
      document.querySelectorAll('.ver').forEach(function(el){ el.textContent = '4.22A'; });
      var titles = document.querySelectorAll('.login-title');
      titles.forEach(function(el){ el.textContent = 'ATE-MEC HM 4.22A UI NAVIGATION CLEANUP'; });
    });
  } catch(e){}
})();
