// Install UI works independently of login and the remote app SDK.
(() => {
  let promptEvent=null,installing=false,installed=false;
  const standalone=window.matchMedia?.('(display-mode: standalone)');
  let language;
  try{language=localStorage.getItem('fitTogether_language');}catch{}
  language=language||((navigator.language||'').startsWith('de')?'de':'en');
  const el=id=>document.getElementById(id);
  const isStandalone=()=>!!(standalone?.matches||navigator.standalone===true);
  window.fitTogetherIsStandalone=isStandalone;
  function render(){
    const en=language==='en',running=isStandalone();
    document.body.classList.toggle('install-only',!running);
    if(!el('installAppBtn'))return;
    el('installTitle').textContent=running?(en?'Your FitTogether app':'Deine FitTogether-App'):(en?'Install FitTogether':'FitTogether installieren');
    el('installDescription').textContent=en?'Open your training directly from your home screen, with its own icon and no browser bar.':'Dein Training direkt vom Homescreen öffnen – mit eigenem Icon und ohne Browserleiste.';
    const button=el('installAppBtn');
    button.textContent=en?'Install app':'App installieren';
    button.classList.toggle('hidden',running||installed||!promptEvent);
    button.disabled=installing;
    el('installLandingBtn').textContent=en?'Install FitTogether':'FitTogether installieren';
    el('installLandingBtn').classList.toggle('hidden',running||installed||!promptEvent);
    el('installLandingBtn').disabled=installing;
    el('installLandingTitle').textContent=en?'Your training. Together.':'Dein Training. Eure Motivation.';
    el('installLandingDescription').textContent=en?'Install FitTogether and start your training directly from your home screen.':'Installiere FitTogether und starte dein Training direkt vom Homescreen.';

    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    el('installHelp').textContent=running?(en?'Installed. Open FitTogether from your home screen. Internet is needed for your training data.':'Installiert. Öffne FitTogether vom Homescreen. Für deine Trainingsdaten brauchst du Internet.'):
      promptEvent?(en?'Install once, then open FitTogether like your other apps.':'Einmal installieren, danach wie deine anderen Apps öffnen.'):
      ios?(en?'Open this page in Safari, tap Share, then Add to Home Screen.':'Öffne diese Seite in Safari, tippe auf Teilen und dann auf Zum Home-Bildschirm.'):
      (en?'Open your browser menu and look for Install app or Add to Home screen. If available, an install button will also appear here.':'Öffne das Browsermenü und suche App installieren oder Zum Startbildschirm hinzufügen. Wenn verfügbar, erscheint auch hier ein Installationsbutton.');
    el('installLandingHelp').textContent=installed&&!running?(en?'Installation complete. Close this page and open FitTogether using the app icon on your home screen.':'Installation abgeschlossen. Schließe diese Seite und öffne FitTogether über das App-Icon auf deinem Homescreen.'):el('installHelp').textContent;
    if(installed&&!running){
      el('installLandingTitle').textContent=en?'Ready to train':'Bereit fürs Training';
      el('installLandingDescription').textContent=en?'FitTogether is installed. Your training is waiting in the app.':'FitTogether ist installiert. Dein Training wartet in der App.';
    }
    if(running&&el('installLandingDialog').open)el('installLandingDialog').close();
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();promptEvent=event;render();
  });
  window.addEventListener('appinstalled',()=>{installed=true;promptEvent=null;render();});
  window.addEventListener('fittogether:languagechange',event=>{language=event.detail;render();});
  standalone?.addEventListener?.('change',render);
  async function install(){
    if(!promptEvent||installing)return;
    const event=promptEvent;promptEvent=null;installing=true;
    el('installAppBtn').disabled=true;
    el('installLandingBtn').disabled=true;
    try{
      await event.prompt();
      await event.userChoice;
      // Only appinstalled / display-mode confirms installation, not acceptance.
    }catch{ /* Manual browser-menu instructions remain available. */ }
    finally{installing=false;render();}
  }
  el('installAppBtn')?.addEventListener('click',install);
  el('installLandingBtn')?.addEventListener('click',install);
  const landing=el('installLandingDialog');
  landing?.addEventListener('cancel',event=>{if(!isStandalone())event.preventDefault();});
  landing?.addEventListener('close',()=>{if(!isStandalone()&&!window.fitTogetherRecoveryActive)landing.showModal();});
  window.addEventListener('fittogether:recovery-finished',()=>{if(!isStandalone()&&!landing.open)landing.showModal();});
  render();
  if(!isStandalone()&&landing?.showModal)landing.showModal();
  if('serviceWorker' in navigator&&window.isSecureContext){
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})
      .catch(error=>console.warn('FitTogether background service:',error));
  }
})();
