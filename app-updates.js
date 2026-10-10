// Check released app files without storing account or training data.
(() => {
  window.FitTogetherUpdates={start(registration,{reload=()=>location.reload()}={}){
    const version=document.querySelector('meta[name="app-version"]')?.content;
    if(!version)return;
    let checking=false,pending=false,reloading=false,dirty=false,interaction=0;
    const status=document.getElementById('appUpdateStatus');
    const standalone=()=>window.fitTogetherIsStandalone?.();
    function render(){
      if(!status)return;
      status.hidden=!pending;
      status.textContent=document.documentElement.lang==='en'
        ?'An update is ready. It will load when you reopen the app. Your current inputs are protected.'
        :'Ein Update ist bereit. Es wird beim erneuten Öffnen geladen. Deine aktuellen Eingaben bleiben geschützt.';
    }
    document.addEventListener('input',()=>{dirty=true;interaction++;},true);
    document.addEventListener('change',()=>{dirty=true;interaction++;},true);
    document.addEventListener('click',()=>{interaction++;},true);
    window.addEventListener('fittogether:languagechange',render);
    function safeToReload(stamp){
      const auth=document.getElementById('authScreen');
      return standalone()&&!dirty&&stamp===interaction&&document.visibilityState==='visible'
        &&!window.fitTogetherRecoveryActive&&!location.hash&&!location.search
        &&(!auth||auth.classList.contains('hidden'))&&!document.querySelector('dialog[open]')
        &&!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
    }
    async function check(allowReload=false){
      if(checking||reloading||navigator.onLine===false||document.visibilityState==='hidden')return;
      checking=true;
      const stamp=interaction;
      try{
        // Browser HTTP caches must not hide a newly published release.
        await registration?.update?.().catch(()=>{});
        const response=await fetch(new URL('./index.html',location.href),{cache:'no-store',credentials:'omit'});
        if(!response.ok)return;
        const html=await response.text();
        const released=new DOMParser().parseFromString(html,'text/html').querySelector('meta[name="app-version"]')?.content;
        pending=!!released&&released!==version;
        render();
        if(pending&&allowReload&&safeToReload(stamp)){reloading=true;reload();}
      }catch{ /* Offline or failed checks never interrupt the app. */ }
      finally{checking=false;}
    }
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check(true);});
    window.addEventListener('pageshow',event=>{if(event.persisted)check(true);});
    window.addEventListener('online',()=>check(false));
    setInterval(()=>check(false),5*60*1000);
    check(true);
    return {check};
  }};
})();
