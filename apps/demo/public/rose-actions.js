(function(){
  if(window.HunterRoseActions)return;

  function icon(name){
    var paths={
      copy:'<rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect>',
      helpful:'<path d="M7 10v10H4V10h3Z"></path><path d="M7 18h9.2a2 2 0 0 0 1.9-1.4l1.5-5A2 2 0 0 0 17.7 9H14l.7-3.3A2.2 2.2 0 0 0 12.6 3L7 10v8Z"></path>',
      'not-helpful':'<path d="M7 14V4H4v10h3Z"></path><path d="M7 6h9.2a2 2 0 0 1 1.9 1.4l1.5 5a2 2 0 0 1-1.9 2.6H14l.7 3.3a2.2 2.2 0 0 1-2.1 2.7L7 14V6Z"></path>',
      share:'<path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"></path>',
      more:'<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>';
  }

  function button(name,label){var control=document.createElement('button');control.type='button';control.className='rose-answer-action '+name;control.setAttribute('aria-label',label);control.title=label;control.innerHTML=icon(name)+'<span>'+label+'</span>';return control;}
  function fallbackCopy(value){var area=document.createElement('textarea');area.value=value;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();try{document.execCommand('copy');}catch(error){}area.remove();}
  async function copyText(value){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(value);else fallbackCopy(value);return true;}catch(error){fallbackCopy(value);return true;}}
  function sessionId(){var key='hunter-foreman-feedback-session';var value=sessionStorage.getItem(key);if(value)return value;value=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'hf-'+Date.now()+'-'+Math.random().toString(36).slice(2);sessionStorage.setItem(key,value);return value;}
  async function sendReaction(reaction,question,answer){try{await fetch('/api/assistant-feedback',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({reaction:reaction,assistant:'ROSE',surface:'rose-demo',question:String(question||'').slice(0,700),answer:String(answer||'').slice(0,1800),timestamp:new Date().toISOString(),sessionId:sessionId()})});}catch(error){}}
  function closePopovers(except){document.querySelectorAll('.rose-answer-popover.open').forEach(function(pop){if(pop!==except)pop.classList.remove('open');});document.querySelectorAll('.rose-answer-action.more.active').forEach(function(control){if(!except||control.closest('.rose-answer-block')!==except.closest('.rose-answer-block'))control.classList.remove('active');});}

  function quickPopover(){
    var pop=document.createElement('div');pop.className='rose-answer-popover';var title=document.createElement('div');title.className='rose-answer-popover-title';title.textContent='Ask ROSE next';var list=document.createElement('div');list.className='rose-answer-popover-list';
    [['How mobile is the POS system?','How mobile is the POS system and how do authorised staff access it?'],['Explain QR check-in','How would QR check-in work for this event?'],['Plan invitations','What should we prepare for digital invitations and RSVPs?']].forEach(function(item){var control=document.createElement('button');control.type='button';control.className='rose-answer-quick';control.textContent=item[0];control.addEventListener('click',function(){var input=document.getElementById('messageInput');if(input){input.value=item[1];input.focus();}pop.classList.remove('open');});list.appendChild(control);});
    pop.appendChild(title);pop.appendChild(list);return pop;
  }

  function decorate(message,text,question){
    if(!message||message.dataset.roseActions==='1'||!message.parentNode)return;
    message.dataset.roseActions='1';var parent=message.parentNode;var block=document.createElement('div');block.className='rose-answer-block';parent.insertBefore(block,message);block.appendChild(message);
    var row=document.createElement('div');row.className='rose-answer-actions';var copy=button('copy','Copy'),helpful=button('helpful','Helpful'),notHelpful=button('not-helpful','Not helpful'),share=button('share','Share'),more=button('more','More'),pop=quickPopover();
    copy.addEventListener('click',async function(){await copyText(text);copy.classList.add('active');copy.querySelector('span').textContent='Copied!';setTimeout(function(){copy.classList.remove('active');copy.querySelector('span').textContent='Copy';},1400);});
    helpful.addEventListener('click',function(){var active=!helpful.classList.contains('active');helpful.classList.toggle('active',active);helpful.setAttribute('aria-pressed',String(active));notHelpful.classList.remove('active');notHelpful.setAttribute('aria-pressed','false');if(active)sendReaction('helpful',question,text);});
    notHelpful.addEventListener('click',function(){var active=!notHelpful.classList.contains('active');notHelpful.classList.toggle('active',active);notHelpful.setAttribute('aria-pressed',String(active));helpful.classList.remove('active');helpful.setAttribute('aria-pressed','false');if(active)sendReaction('not_helpful',question,text);});
    share.addEventListener('click',async function(){try{if(navigator.share)await navigator.share({title:'ROSE — Hunter Foreman Event Demo',text:String(text).slice(0,500),url:location.href});else{await copyText(location.href);share.classList.add('active');share.querySelector('span').textContent='Link copied';setTimeout(function(){share.classList.remove('active');share.querySelector('span').textContent='Share';},1400);}}catch(error){}});
    more.addEventListener('click',function(event){event.stopPropagation();var open=!pop.classList.contains('open');closePopovers(pop);pop.classList.toggle('open',open);more.classList.toggle('active',open);});
    [copy,helpful,notHelpful,share,more].forEach(function(control){row.appendChild(control);});block.appendChild(row);block.appendChild(pop);requestAnimationFrame(function(){var chat=document.getElementById('roseChat')||document.querySelector('.rose-window .chat');if(chat)chat.scrollTop=chat.scrollHeight;});
  }

  document.addEventListener('click',function(event){if(!event.target.closest('.rose-answer-actions')&&!event.target.closest('.rose-answer-popover'))closePopovers();});
  window.HunterRoseActions={decorate:decorate};
})();
