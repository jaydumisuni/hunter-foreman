(function(){
  if(window.__hunterRoseContinuationInstalled)return;
  window.__hunterRoseContinuationInstalled=true;

  var STARTER='We need event booking, digital invitations, guest tickets, QR check-in and a clear approval flow.';
  var state={started:false,created:false,taskId:'',messages:[],details:{}};
  var lastQuestion='';
  var sending=false;
  var restoreTimer=0;

  function el(id){return document.getElementById(id);}
  function chatEl(){return el('roseChat')||document.querySelector('.rose-window .chat');}
  function appsGridEl(){return el('appsGrid')||document.querySelector('.apps-grid');}
  function getGlobal(name){try{return (0,eval)(name);}catch(error){return undefined;}}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,function(character){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];});}

  function parseDetails(text){
    var source=String(text||''),lower=source.toLowerCase(),details={};
    var names=['chilanga mulilo','kitchen party','birthday','wedding','conference','outing','corporate event','meeting','product launch','launch','funeral','graduation'];
    var event=names.find(function(name){return lower.includes(name);});
    if(event)details.eventType=event.replace(/(^|\s)([a-z])/g,function(_,gap,letter){return gap+letter.toUpperCase();});
    var guests=lower.match(/(?:about|around|roughly|for)?\s*([0-9]{1,4})\s*(?:people|guests|pax|attendees)/);
    if(guests)details.guestCount=guests[1];
    var date=source.match(/(?:\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b|\b(?:today|tomorrow|next week|next month)\b)/i);
    if(date)details.date=date[0];
    if(/venue (?:is )?(?:not confirmed|not decided)|no venue|venue missing|not sure where/i.test(source))details.venue='Not confirmed';
    var services=[];
    if(/invitation|invite|rsvp/i.test(source))services.push('digital invitations');
    if(/qr|check-?in|guest ticket/i.test(source))services.push('QR check-in');
    if(/photo|video|media coverage/i.test(source))services.push('media coverage');
    if(/approval flow|approval process/i.test(source))services.push('approval flow');
    if(/pos|point of sale/i.test(source))services.push('POS access');
    if(services.length)details.services=services.join(', ');
    return details;
  }

  function mergeDetails(text){state.details=Object.assign({},state.details,parseDetails(text));}
  function summary(message){
    var parts=[];
    if(state.details.eventType)parts.push('Event: '+state.details.eventType);
    if(state.details.date)parts.push('Date: '+state.details.date);
    if(state.details.guestCount)parts.push('Guests: '+state.details.guestCount);
    if(state.details.venue)parts.push('Venue: '+state.details.venue);
    if(state.details.services)parts.push('Support: '+state.details.services);
    return parts.length?parts.join(' • '):String(message||'').slice(0,180);
  }

  function createBubble(role,text,extra){
    var chat=chatEl();if(!chat)return null;
    var bubble=document.createElement('div');bubble.className='bubble '+(role==='user'?'client':'rose');
    var small=document.createElement('small');small.textContent=role==='user'?'Client':'Rose';
    var span=document.createElement('span');span.textContent=text;
    bubble.appendChild(small);bubble.appendChild(span);
    if(extra){var holder=document.createElement('div');holder.innerHTML=extra;while(holder.firstChild)bubble.appendChild(holder.firstChild);}
    chat.appendChild(bubble);
    if(role==='assistant'&&window.HunterRoseActions)window.HunterRoseActions.decorate(bubble,text,lastQuestion);
    return bubble;
  }

  function renderConversation(){
    if(!state.started)return;
    var chat=chatEl();if(!chat)return;
    chat.classList.add('conversation-active');chat.innerHTML='';
    state.messages.forEach(function(message){createBubble(message.role,message.content,message.extra||'');});
    requestAnimationFrame(function(){chat.scrollTop=chat.scrollHeight;});
    var input=el('messageInput');if(input){input.placeholder='Reply to ROSE…';if(input.value===STARTER)input.value='';}
    var button=el('sendBtn');if(button){button.disabled=sending;button.textContent=sending?'ROSE is replying…':(typeof tr==='function'?tr('send'):'Send');}
  }

  function appendMessage(role,content,extra){
    state.messages.push({role:role,content:String(content||''),extra:extra||''});
    var chat=chatEl();if(!chat||!chat.classList.contains('conversation-active')){renderConversation();return;}
    createBubble(role,String(content||''),extra||'');requestAnimationFrame(function(){chat.scrollTop=chat.scrollHeight;});
  }

  function apiMessages(){return state.messages.slice(-12).map(function(message){return {role:message.role,content:message.content};});}

  async function askRose(){
    var response=await fetch('/api/rose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:apiMessages(),details:state.details,created:state.created,taskId:state.taskId})});
    if(!response.ok)throw new Error('ROSE endpoint returned '+response.status);
    var data=await response.json();if(!data.ok)throw new Error(data.error||'ROSE could not respond');
    state.details=Object.assign({},state.details,data.details||{});return data;
  }

  function setPipeline(active){
    var labels=active?['Received','Classified','Owned','Created','Live']:['Waiting','Waiting','Waiting','Waiting','Waiting'];
    document.querySelectorAll('.steps .step').forEach(function(step,index){if(index>=labels.length)return;var status=step.querySelector('small');if(status)status.textContent=labels[index];});
  }

  function showTaskId(task){
    var latest=el('latestTasks');if(!latest)return;
    var firstCell=latest.querySelector('.row:not(.head) span');if(!firstCell||firstCell.querySelector('[data-request-id]'))return;
    var requestId=document.createElement('small');requestId.dataset.requestId=task.id;requestId.textContent=task.id;
    requestId.style.display='block';requestId.style.marginTop='2px';requestId.style.color='var(--muted)';requestId.style.fontSize='9px';requestId.style.letterSpacing='.04em';firstCell.appendChild(requestId);
  }

  async function syncDashboard(task){
    var refresh=getGlobal('refreshStatus');if(typeof refresh==='function')await refresh();
    var rows=getGlobal('liveRows');if(!Array.isArray(rows))throw new Error('The demo task store is unavailable.');
    var row=[task.id,task.customerName||'Chilanga Mulilo Client',task.workflow&&task.workflow.label?task.workflow.label:'Event Booking Workflow','IN PROGRESS','Now',Boolean(task.escalation&&task.escalation.required)];
    var existing=rows.findIndex(function(item){return item&&item[0]===task.id;});if(existing===-1)rows.unshift(row);else rows[existing]=row;
    var render=getGlobal('renderAll');if(typeof render==='function')render();showTaskId(task);setPipeline(true);scheduleRestore();
  }

  async function createTask(message){
    var response=await fetch('/api/requests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customerName:'Chilanga Mulilo Client',channel:'website',message:message})});
    var data=await response.json();if(!response.ok||!data.task)throw new Error(data.error||'Task was not created');
    await syncDashboard(data.task);return data.task;
  }

  function confirmTask(task,message){
    state.created=true;state.taskId=task.id;
    var confirmation='You’re all set — your request has been recorded and is ready for the events team to follow up. You can keep chatting with me here, and I’ll help you work through the details without starting over. We can look at the date, guest list, invitations, QR check-in, venue or planning timeline. What would you like to sort out first?';
    var extra='<div class="rose-handoff"><b>Request reference:</b><span>'+escapeHtml(task.id)+'</span></div><div class="rose-handoff"><b>What I understood:</b><span>'+escapeHtml(summary(message))+'</span></div>';
    appendMessage('assistant',confirmation,extra);
  }

  function ensurePosCard(){
    var grid=appsGridEl();if(!grid)return;
    var keyed=grid.querySelector('[data-app-key="pos-system"]');if(keyed)return;
    var existing=Array.prototype.find.call(grid.querySelectorAll('.app-card'),function(card){return /\bPOS System\b/i.test(card.textContent||'');});
    if(existing){existing.dataset.appKey='pos-system';return;}
    var card=document.createElement('div');card.className='app-card';card.dataset.appKey='pos-system';
    card.innerHTML='<div class="big">▣</div><h3>POS System</h3><span class="badge disconnected">Not connected</span><p>Existing THETECHGUY business system; intentionally not connected to this public demo. Authorised users can sign in through a supported browser on a phone, tablet or computer.</p>';grid.appendChild(card);
  }

  function scheduleRestore(){
    clearTimeout(restoreTimer);restoreTimer=setTimeout(function(){ensurePosCard();if(state.started){var chat=chatEl();if(chat&&!chat.classList.contains('conversation-active'))renderConversation();var input=el('messageInput');if(input){input.placeholder='Reply to ROSE…';if(input.value===STARTER)input.value='';}if(state.taskId)showTaskId({id:state.taskId});}},0);
  }

  async function send(){
    var input=el('messageInput'),button=el('sendBtn');if(!input||!button||sending)return;
    var message=input.value.trim();if(!message)return;
    var taskAttempted=false;sending=true;state.started=true;lastQuestion=message;mergeDetails(message);input.value='';input.placeholder='Reply to ROSE…';appendMessage('user',message);renderConversation();
    try{
      var turn=await askRose();
      if(!state.created&&turn.readyToCreate){appendMessage('assistant',String(turn.reply||'Thanks — I’ve got it. I’m organising your request now.'));taskAttempted=true;var task=await createTask(message);renderConversation();confirmTask(task,message);}
      else appendMessage('assistant',String(turn.reply||'Of course — tell me what you’d like help with next.'));
    }catch(error){
      console.warn(error);
      if(!state.created&&!taskAttempted){try{taskAttempted=true;var fallbackTask=await createTask(message);appendMessage('assistant','Thanks — I’ve got your request and it has been recorded. I’m still here to help you work through the event details.');renderConversation();confirmTask(fallbackTask,message);}catch(taskError){console.warn(taskError);appendMessage('assistant','I’m sorry — I couldn’t confirm that your request was saved. Please use Reset and send the prepared request once more.');}}
      else if(!state.created)appendMessage('assistant','I understood your request, but I couldn’t confirm that it was saved without risking a duplicate. Please use Reset before trying again.');
      else appendMessage('assistant','I’m sorry, I couldn’t answer that just now. Your request is still saved, and you can try the question again when you’re ready.');
    }finally{sending=false;renderConversation();var currentInput=el('messageInput');if(currentInput)currentInput.focus();}
  }

  function resetConversation(){
    state={started:false,created:false,taskId:'',messages:[],details:{}};lastQuestion='';sending=false;
    var chat=chatEl();if(chat){chat.classList.remove('conversation-active');if(chat.dataset.initialHtml)chat.innerHTML=chat.dataset.initialHtml;}
    var input=el('messageInput');if(input){input.value=STARTER;input.placeholder='Start with the example request…';}
    var button=el('sendBtn');if(button){button.disabled=false;button.textContent=(typeof tr==='function'?tr('send'):'Send');}setPipeline(false);ensurePosCard();
  }

  function install(){
    var chat=chatEl(),input=el('messageInput'),button=el('sendBtn');if(!chat||!input||!button){setTimeout(install,80);return;}
    if(!chat.dataset.initialHtml)chat.dataset.initialHtml=chat.innerHTML;document.documentElement.dataset.hunterRoseRuntime='installed';
    document.addEventListener('click',function(event){var target=event.target&&event.target.closest?event.target.closest('#sendBtn'):null;if(!target)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();send();},true);
    document.addEventListener('keydown',function(event){if(event.key!=='Enter'||event.shiftKey||!event.target||event.target.id!=='messageInput')return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();send();},true);
    document.addEventListener('click',function(event){var target=event.target&&event.target.closest?event.target.closest('#resetBtn,#resetBtn2,#resetBtn3'):null;if(target)setTimeout(resetConversation,0);},true);
    new MutationObserver(scheduleRestore).observe(document.body,{childList:true,subtree:true});ensurePosCard();setInterval(ensurePosCard,1200);
  }

  install();
})();
