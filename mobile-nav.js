// Compact phone navigation; desktop keeps the existing tabs.
(()=>{
 const button=document.getElementById('mobileMenuBtn');
 const dialog=document.getElementById('mobileMenuDialog');
 if(!button||!dialog)return;
 const list=document.getElementById('mobileMenuItems');
 const sources=[...document.querySelectorAll('.tabs .tab')];
 const icons={home:'⌂',calendar:'▦',weight:'↗',achievements:'★',photos:'▧',groups:'♧',profiles:'♙',settings:'⚙'};
 const media=window.matchMedia('(max-width: 760px)');
 function sync(){
  const en=document.documentElement.lang==='en';
  button.setAttribute('aria-label',en?'Open navigation menu':'Navigationsmenü öffnen');
  document.getElementById('mobileMenuTitle').textContent=en?'Menu':'Menü';
  document.getElementById('mobileMenuCloseBtn').setAttribute('aria-label',en?'Close menu':'Menü schließen');
  dialog.querySelector('nav').setAttribute('aria-label',en?'Main navigation':'Hauptnavigation');
  for(const source of sources){
   const target=list.querySelector(`[data-mobile-tab="${source.dataset.tab}"]`);
   target.querySelector('.mobile-menu-label').textContent=source.textContent.trim().replace(/^⚙️?\s*/, '');
   const active=source.classList.contains('active');
   target.classList.toggle('active',active);
   for(const el of [source,target]){if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}
  }
 }
 function close(){if(dialog.open)dialog.close();}
 for(const source of sources){
  const target=document.createElement('button');target.type='button';target.dataset.mobileTab=source.dataset.tab;target.className='mobile-menu-item';
  const icon=document.createElement('span');icon.className='mobile-menu-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[source.dataset.tab];
  const label=document.createElement('span');label.className='mobile-menu-label';
  target.append(icon,label);list.append(target);
  target.addEventListener('click',()=>{source.click();close();window.scrollTo({top:0,behavior:'instant'});});
 }
 button.addEventListener('click',()=>{
  if(!media.matches||document.getElementById('appShell').classList.contains('hidden')||document.querySelector('dialog[open]'))return;
  sync();dialog.showModal();button.setAttribute('aria-expanded','true');document.body.classList.add('mobile-menu-open');
  list.querySelector('[aria-current="page"]')?.focus();
 });
 document.getElementById('mobileMenuCloseBtn').addEventListener('click',close);
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
 });
 dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');document.body.classList.remove('mobile-menu-open');});
 media.addEventListener('change',event=>{if(!event.matches)close();});
 window.addEventListener('fittogether:languagechange',sync);
 window.addEventListener('fittogether:tabchange',sync);
 const observer=new MutationObserver(()=>{if(document.getElementById('appShell').classList.contains('hidden'))close();});
 observer.observe(document.getElementById('appShell'),{attributes:true,attributeFilter:['class']});
 sync();
})();
