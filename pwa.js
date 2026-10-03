// Install UI works independently of login and the remote app SDK.
(() => {
  let promptEvent=null,installing=false,installed=false;
  const standalone=window.matchMedia?.('(display-mode: standalone)');
  let language;
  try{language=localStorage.getItem('fitTogether_language');}catch{}
  language=language||((navigator.language||'').startsWith('de')?'de':'en');
  const el=id=>document.getElementById(id);
  const isStandalone=()=>installed||standalone?.matches||navigator.standalone===true;
  function render(){
    const en=language==='en',running=isStandalone();
    if(!el('installAppBtn'))return;
    el('installTitle').textContent=running?(en?'Your FitTogether app':'Deine FitTogether-App'):(en?'Install FitTogether':'FitTogether installieren');
    el('installDescription').textContent=en?'Open your training directly from your home screen, with its own icon and no browser bar.':'Dein Training direkt vom Homescreen öffnen – mit eigenem Icon und ohne Browserleiste.';
    const button=el('installAppBtn');
    button.textContent=en?'Install app':'App installieren';
    button.classList.toggle('hidden',running||!promptEvent);
    button.disabled=installing;
    el('installLandingBtn').textContent=en?'Install FitTogether':'FitTogether installieren';
    el('installLandingBtn').classList.toggle('hidden',running||!promptEvent);
    el('installLandingBtn').disabled=installing;
    el('installLandingTitle').textContent=en?'Your training. Together.':'Dein Training. Eure Motivation.';
    el('installLandingDescription').textContent=en?'Install FitTogether and start your training directly from your home screen.':'Installiere FitTogether und starte dein Training direkt vom Homescreen.';
    el('installContinueBtn').textContent=en?'Continue in browser':'Im Browser fortfahren';
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    el('installHelp').textContent=running?(en?'Installed. Open FitTogether from your home screen. Internet is needed for your training data.':'Installiert. Öffne FitTogether vom Homescreen. Für deine Trainingsdaten brauchst du Internet.'):
      promptEvent?(en?'Install once, then open FitTogether like your other apps.':'Einmal installieren, danach wie deine anderen Apps öffnen.'):
      ios?(en?'Open this page in Safari, tap Share, then Add to Home Screen.':'Öffne diese Seite in Safari, tippe auf Teilen und dann auf Zum Home-Bildschirm.'):
      (en?'Open your browser menu and look for Install app or Add to Home screen. If available, an install button will also appear here.':'Öffne das Browsermenü und suche App installieren oder Zum Startbildschirm hinzufügen. Wenn verfügbar, erscheint auch hier ein Installationsbutton.');
    el('installLandingHelp').textContent=el('installHelp').textContent;
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
  el('installContinueBtn')?.addEventListener('click',()=>landing.close());
  landing?.addEventListener('close',()=>window.dispatchEvent(new Event('fittogether:install-dismissed')));
  render();
  if(!isStandalone()&&landing?.showModal)landing.showModal();
  if('serviceWorker' in navigator&&window.isSecureContext){
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})
      .catch(error=>console.warn('FitTogether background service:',error));
  }
})();
