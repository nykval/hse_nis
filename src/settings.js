(() => {
  const D=window.feedData;
  const {cards,profiles,destinationLabels,interestLabels,stageLabels,signalLabels,formatLabels,currencyLabels,freshnessLabels,reviewLabels,seasonLabels,audienceLabels}=D;
  const $=s=>document.querySelector(s);
  const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<img class="ui-icon" src="./assets/uicons/fi-rr-${name}.svg" alt="" aria-hidden="true">`;
  const tag=(text,kind='')=>`<span class="data-tag ${kind}">${esc(text)}</span>`;
  const options=(labels,value,all)=>`${all?`<option value="">${esc(all)}</option>`:''}${Object.entries(labels).filter(([k])=>!all || k!=='none').map(([k,v])=>`<option value="${esc(k)}" ${value===k?'selected':''}>${esc(v)}</option>`).join('')}`;
  const labelList=(keys,labels)=>keys.map(k=>labels[k]).join(', ');
  const filters={query:'',geography:'',topic:'',stage:'',format:'',freshness:'',review:''};
  let layout='grid', userFilter='all';
  function toast(message,error=false) {
    const node=$('#app-toast'); node.textContent=message; node.classList.toggle('is-error',error); node.hidden=false;
    clearTimeout(toast.timeout); toast.timeout=setTimeout(()=>node.hidden=true,6500);
  }
  function showView(view) {
    if(!['comparison','cards','users'].includes(view)) view='comparison';
    for(const key of ['comparison','cards','users']) {
      $(`#view-${key}`).hidden=key!==view;
      const link=$(`[data-view="${key}"]`);
      if(key===view) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    }
    if(view==='cards') renderCatalog(); if(view==='users') renderUsers();
  }
  $('#view-cards').innerHTML=`<h1 class="sr-only">Карточки</h1>
    <div class="catalog-toolbar"><label class="search-field">${icon('list')}<input id="card-search" type="search" placeholder="Поиск карточек…" aria-label="Поиск по названию, ID, месту или теме"></label>
      <button class="secondary-button" id="toggle-filters" aria-expanded="false" aria-controls="catalog-filter-panel">${icon('settings-sliders')} Фильтры <span id="filter-count" class="button-count" hidden></span></button>
      <div class="view-switch" role="group" aria-label="Вид каталога"><button data-layout="grid" aria-pressed="true">Плитки</button><button data-layout="list" aria-pressed="false">Список</button></div>
      <button class="secondary-button export-button" id="export-cards" title="Скачать карточки в JSON">Экспорт</button>
    </div>
    <div class="catalog-filters" id="catalog-filter-panel" hidden>
      <label>География<select id="filter-geography">${options(destinationLabels,'','Все места')}<option value="unspecified">Не указана</option></select></label>
      <label>Тема<select id="filter-topic">${options(interestLabels,'','Все темы')}</select></label>
      <label>Стадия<select id="filter-stage">${options(stageLabels,'','Все стадии')}</select></label>
      <label>Формат<select id="filter-format">${options(formatLabels,'','Все форматы')}</select></label>
      <label>Актуальность<select id="filter-freshness">${options(freshnessLabels,'','Все статусы')}</select></label>
      <label>Разметка<select id="filter-review">${options(reviewLabels,'','Все статусы')}</select></label>
    </div>
    <div class="catalog-results"><div class="review-shortcuts" id="review-shortcuts" role="group" aria-label="Статус разметки"></div></div>
    <details class="annotation-guide"><summary>${icon('info')} Правила разметки</summary><div class="guide-content"><ol>
      <li>Опирайтесь на текст и геометки. Не угадывайте место по фотографии.</li>
      <li>Выбирайте точную географию. Неизвестное место оставляйте пустым; пункт отправления отмечайте отдельно.</li>
      <li>Добавляйте подтверждённые темы и подходящие стадии поездки.</li>
      <li>Скидка без срока — непроверенные условия. Не придумывайте даты и сезоны.</li>
      <li>Сомнения записывайте в комментарий. После правки нужна повторная проверка.</li>
    </ol><p>Разметку превью проверили два ИИ-участника. Актуальность акций и правил не подтверждена.</p></div></details>
    <section class="active-filter-bar" id="active-filter-bar" aria-label="Активные фильтры" hidden><p id="catalog-count" role="status" aria-live="polite"></p><div class="active-filter-chips" id="active-filter-chips"></div><button class="filter-reset" id="clear-filters">Сбросить всё</button></section>
    <div id="catalog" class="catalog-grid"></div>
    <p class="local-note">Сохранение в этом браузере · Экспорт в JSON</p>`;
  $('#view-users').innerHTML=`<h1 class="sr-only">Пользователи</h1>
    <div class="users-toolbar"><div class="filter-tabs" role="group" aria-label="Назначение профилей"><button data-user-filter="all" aria-pressed="true">Все <span>6</span></button><button data-user-filter="tuning" aria-pressed="false">Настройка <span>2</span></button><button data-user-filter="evaluation" aria-pressed="false" title="Профили для итоговой оценки">Оценка <span>4</span></button></div><button class="secondary-button export-button" id="export-users" title="Скачать профили в JSON">Экспорт</button></div>
    <div id="user-list" class="user-grid"></div>
    <p class="local-note">Синтетические профили · 2 для настройки, 4 для итоговой оценки</p>`;
  document.body.insertAdjacentHTML('beforeend',`<div id="app-toast" class="app-toast" role="status" aria-live="polite" hidden></div><dialog id="manage-dialog" class="manage-dialog" aria-labelledby="manage-title"><button type="button" class="dialog-close" id="manage-close" aria-label="Закрыть редактор">${icon('cross-small')}</button><div id="manage-body"></div></dialog>`);
  function renderCatalog() {
    $('#review-shortcuts').innerHTML=[['','Все'],['needs_source','Нужен источник'],['edited','Изменены']].map(([value,label])=>`<button class="review-shortcut" data-review-filter="${value}" aria-pressed="${filters.review===value}">${label}<span>${value?cards.filter(c=>c.annotation.status===value).length:cards.length}</span></button>`).join('');
    const activeFilters=Object.entries(filters).filter(([key,value])=>key!=='query' && value).length;
    $('#filter-count').textContent=activeFilters;
    $('#filter-count').hidden=!activeFilters;
    const query=filters.query.trim().toLocaleLowerCase('ru');
    const items=cards.filter(c=>{
      const haystack=[c.id,String(c.id).padStart(3,'0'),c.title,c.sourceTitle,labelList(c.destinations,destinationLabels),labelList(c.interests,interestLabels)].join(' ').toLocaleLowerCase('ru');
      return (!query || haystack.includes(query.replace(/^#/,'')))
        && (!filters.geography || (filters.geography==='unspecified' ? !c.destinations.length : c.destinations.includes(filters.geography)))
        && (!filters.topic || c.interests.includes(filters.topic)) && (!filters.stage || c.stages.includes(filters.stage))
        && (!filters.format || c.format===filters.format) && (!filters.freshness || D.freshness(c)===filters.freshness)
        && (!filters.review || c.annotation.status===filters.review);
    });
    const active=Object.entries(filters).filter(([,value])=>value.trim());
    const filterNames={query:'Поиск',geography:'Место',topic:'Тема',stage:'Стадия',format:'Формат',freshness:'Актуальность',review:'Разметка'};
    const filterLabels={geography:{...destinationLabels,unspecified:'Не указано'},topic:interestLabels,stage:stageLabels,format:formatLabels,freshness:freshnessLabels,review:reviewLabels};
    $('#active-filter-bar').hidden=!active.length;
    $('#catalog-count').innerHTML=`<strong>${items.length}</strong> из ${cards.length}`;
    $('#active-filter-chips').innerHTML=active.map(([key,value])=>{
      const label=filterLabels[key]?.[value] || value;
      return `<button class="active-filter-chip" data-clear-filter="${key}" aria-label="Снять фильтр: ${esc(filterNames[key])} — ${esc(label)}"><span>${esc(filterNames[key])}: <strong>${esc(label)}</strong></span>${icon('cross-small')}</button>`;
    }).join('');
    $('#catalog').className=layout==='list'?'catalog-list':'catalog-grid';
    $('#catalog').innerHTML=items.length ? items.map(c=>`<button class="catalog-card" data-edit-card="${c.id}" aria-label="Редактировать карточку ${c.id}: ${esc(c.title)}">
      <div class="catalog-preview"><img src="${c.image}" alt="${esc(c.title)}" loading="lazy" width="${c.width}" height="${c.height}"><span class="catalog-id">#${String(c.id).padStart(3,'0')}</span><span class="catalog-format">${esc(formatLabels[c.format])}</span></div>
      <div class="catalog-copy"><h2>${esc(c.title)}</h2><p class="card-place">${esc(labelList(c.destinations,destinationLabels) || 'Место не указано')}${c.geographyRole==='origin'?' · отправление':''}</p><div class="data-tags">${c.interests.slice(0,2).map(i=>tag(interestLabels[i])).join('')}${c.interests.length>2?tag(`+${c.interests.length-2}`,'tag-muted'):''}</div>${cardStatus(c)}</div>
    </button>`).join('') : `<div class="empty-state"><h2>Ничего не найдено</h2><button class="secondary-button" data-reset-filters>Сбросить фильтры</button></div>`;
  }
  function cardStatus(c) {
    const currency=D.freshness(c);
    const notes=[];
    if(c.annotation.status==='needs_source')notes.push(tag('Нужен источник','tag-amber'));
    else if(c.annotation.status==='edited')notes.push(tag('Изменена','tag-muted'));
    if(currency==='unverified')notes.push(tag('Условия не проверены','tag-muted'));
    else if(currency==='expired' || currency==='upcoming')notes.push(tag(freshnessLabels[currency],'tag-amber'));
    else if(currency==='verified')notes.push(tag('Условия проверены','tag-green'));
    return notes.length?`<div class="catalog-card-footer">${notes.join('')}</div>`:'';
  }
  function renderUsers() {
    const list=profiles.filter(p=>userFilter==='all' || p.split===userFilter);
    $('#user-list').innerHTML=list.map(p=>`<article class="user-card ${p.split==='tuning'?'user-card--tuning':''}">
      <div class="user-card-top"><div class="user-avatar avatar-${profiles.indexOf(p)%6}">${esc(p.name.charAt(0))}</div><div class="user-identity"><div class="user-name">${esc(p.name)} <span>${p.age}</span></div><p>${esc(p.city)}</p></div>${tag(p.split==='tuning'?'Настройка':'Оценка',p.split==='tuning'?'tag-purple':'tag-muted')}</div>
      <h2>${esc(p.title)}</h2>
      <dl class="profile-facts"><div><dt>Куда</dt><dd>${esc(destinationLabels[p.destination])}</dd></div><div><dt>Стадия</dt><dd>${esc(stageLabels[p.stage])}</dd></div><div><dt>Поездка</dt><dd>${esc(p.companions)}${p.duration?` · ${p.duration} дн.`:''}</dd></div><div><dt>Сигнал</dt><dd>${esc(signalLabels[p.signal])}</dd></div></dl>
      <div class="data-tags user-interests">${p.interests.length?p.interests.map(i=>tag(interestLabels[i])).join(''):tag('Без интересов','tag-muted')}</div>
      <details class="user-details"><summary>Подробнее</summary><p>${esc(p.description)}</p><dl><div><dt>Бюджет</dt><dd>${esc(p.budget)}</dd></div><div><dt>Транспорт</dt><dd>${esc(p.transport)}</dd></div></dl><p>${esc(p.constraints)}</p><div class="user-criteria"><strong>Критерий оценки</strong><p>${esc(p.criteria)}</p></div>${p.split==='evaluation'?'<p>Используйте после фиксации модели, без подбора весов.</p>':''}</details>
      <div class="user-actions"><button class="primary-button" data-apply-user="${p.id}" aria-label="${p.split==='tuning'?'Применить профиль':'Открыть профиль для итоговой оценки'}: ${esc(p.name)}">В ленту</button><button class="secondary-button" data-edit-user="${p.id}" aria-label="Изменить профиль: ${esc(p.name)}">Изменить</button></div>
    </article>`).join('');
  }
  function checks(name,labels,selected) {
    return `<div class="checkbox-chips">${Object.entries(labels).filter(([key])=>key!=='none').map(([key,label])=>`<label><input type="checkbox" name="${name}" value="${esc(key)}" ${selected.includes(key)?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div>`;
  }
  function field(label,name,value,attrs='') {return `<label class="editor-field">${esc(label)}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;}
  function textarea(label,name,value) {return `<label class="editor-field">${esc(label)}<textarea name="${name}" rows="3">${esc(value)}</textarea></label>`;}
  function select(label,name,labels,value) {return `<label class="editor-field">${esc(label)}<select name="${name}">${options(labels,value)}</select></label>`;}
  function openEditor(markup) { $('#manage-body').innerHTML=markup; $('#manage-dialog').showModal(); $('#manage-dialog').scrollTop=0; }
  function editCard(id) {
    const c=cards.find(c=>c.id===id);if(!c)return;
    openEditor(`<form id="card-form" data-id="${id}"><div class="editor-heading"><h2 id="manage-title">Карточка #${String(id).padStart(3,'0')}</h2></div>
      <div class="card-editor-layout"><aside class="editor-preview"><img src="${c.image}" alt="${esc(c.title)}"><details class="source-details"><summary>Исходник</summary><dl><dt>Экспорт</dt><dd>${esc(c.dataset)}</dd><dt>Тип</dt><dd>${esc(c.type)}</dd><dt>Размер</dt><dd>${c.width} × ${c.height} px</dd><dt>Заголовок</dt><dd>${esc(c.sourceTitle)}</dd></dl></details></aside>
      <div class="editor-fields">${field('Название','title',c.title,'required maxlength="180"')}
        <fieldset><legend>География</legend><div id="selected-geography" class="data-tags">${c.destinations.map(g=>tag(destinationLabels[g])).join('') || tag('Не указана','tag-muted')}</div><details class="geography-picker"><summary>Выбрать места</summary><input type="search" id="geography-search" placeholder="Найти место…" aria-label="Поиск географии"><div class="geography-options">${Object.entries(destinationLabels).filter(([k])=>k!=='none').map(([k,v])=>`<label><input type="checkbox" name="destinations" value="${k}" ${c.destinations.includes(k)?'checked':''}>${esc(v)}</label>`).join('')}</div></details></fieldset>
        <fieldset><legend>Темы</legend>${checks('interests',interestLabels,c.interests)}</fieldset><fieldset><legend>Стадии поездки</legend>${checks('stages',stageLabels,c.stages)}</fieldset>
        ${select('Формат','format',formatLabels,c.format)}
        <details class="editor-section"><summary>Актуальность <span>${esc(freshnessLabels[D.freshness(c)])}</span></summary><div class="editor-section-body"><div class="editor-row">${select('Материал','currencyKind',currencyLabels,c.currency.kind)}${select('Проверка условий','freshness',Object.fromEntries(Object.entries(freshnessLabels).filter(([k])=>k!=='upcoming')),c.currency.status)}</div>
          <p class="field-hint">Для подтверждения нужны источник и дата проверки.</p>
          ${checks('seasons',seasonLabels,c.currency.seasons)}<div class="editor-row">${field('Действует с','validFrom',c.currency.validFrom,'type="date"')}${field('Действует по','validUntil',c.currency.validUntil,'type="date"')}</div>
          <div class="editor-row">${field('Дата проверки','checkedAt',c.currency.checkedAt,'type="date"')}${field('Источник проверки','source',c.currency.source || '', 'maxlength="500" placeholder="Ссылка или название источника"')}</div>
        </div></details><details class="editor-section"><summary>Дополнительно</summary><div class="editor-section-body">
        <div class="editor-row">${select('Роль географии','geographyRole',{destination:'Место материала',origin:'Пункт отправления'},c.geographyRole)}${select('Сигнал','signal',{ '':'Не указан',flight:'Авиабилеты',train:'Поезд',hotel:'Отель',bus:'Автобус' },c.signal)}</div>
        <fieldset><legend>Аудитория</legend>${checks('audience',audienceLabels,c.audience)}</fieldset></div></details>
        <details class="editor-section"><summary>Проверка разметки <span>${esc(c.annotation.status==='reviewed'?'Проверена':c.annotation.status==='needs_source'?'Нужен источник':reviewLabels[c.annotation.status])}</span></summary><div class="editor-section-body">
        <div class="review-record"><strong>${esc(reviewLabels[c.annotation.status])}</strong><p>${esc(c.annotation.author)} · ${esc(c.annotation.date)}</p>${c.annotation.reviewer?`<p>${esc(c.annotation.reviewer)} · ${esc(c.annotation.reviewedAt)}</p><p>${esc(c.annotation.decision)}</p>`:''}<small>После сохранения новой редакции потребуется повторная независимая проверка.</small></div>
        ${textarea('Комментарий','note',c.annotation.note)}</div></details>
      </div></div><div class="editor-footer"><p id="editor-error" class="editor-error" role="alert"></p><button type="button" class="secondary-button" data-cancel-editor>Отмена</button><button type="submit" class="primary-button">Сохранить</button></div></form>`);
  }
  function editUser(id) {
    const p=profiles.find(p=>p.id===id);if(!p)return;
    openEditor(`<form id="user-form" data-id="${esc(id)}"><div class="editor-heading"><h2 id="manage-title">${esc(p.name)}</h2>${tag(p.split==='tuning'?'Настройка':'Итоговая оценка','tag-purple')}</div><div class="user-editor-fields">
      <div class="editor-row">${field('Имя','name',p.name,'required maxlength="60"')}${field('Возраст','age',p.age,'type="number" min="18" max="100" required')}</div>${field('Сценарий','title',p.title,'required maxlength="160"')}
      <div class="editor-row">${field('Город','city',p.city,'maxlength="100"')}${select('Направление','destination',destinationLabels,p.destination)}</div><fieldset><legend>Интересы</legend>${checks('interests',interestLabels,p.interests)}</fieldset><div class="editor-row">${select('Стадия','stage',stageLabels,p.stage)}${select('Последний сигнал','signal',signalLabels,p.signal)}</div>
      <div class="editor-row">${field('С кем едет','companions',p.companions,'maxlength="120"')}${select('Бюджет','budget',{'Не задан':'Не задан','Экономный':'Экономный','Средний':'Средний','Выше среднего':'Выше среднего'},p.budget)}</div><div class="editor-row">${field('Дней · 0 — неизвестно','duration',p.duration,'type="number" min="0" max="365" required')}${select('Транспорт','transport',{'Не задан':'Не задан','Поезд':'Поезд','Самолёт':'Самолёт','Автомобиль':'Автомобиль','Автобус':'Автобус'},p.transport)}</div>
      <details class="editor-section"><summary>Описание и критерии</summary><div class="editor-section-body">${textarea('Описание','description',p.description)}${textarea('Потребности','constraints',p.constraints)}${textarea('Критерий оценки','criteria',p.criteria)}</div></details>
      </div><div class="editor-footer"><p id="editor-error" class="editor-error" role="alert"></p><button type="button" class="secondary-button" data-cancel-editor>Отмена</button><button type="submit" class="primary-button">Сохранить</button></div></form>`);
  }
  function download(kind) {
    const payload={schemaVersion:1,dataset:'2026-11-14',exportedAt:new Date().toISOString(),...(kind==='cards'?{cards,labels:{destinationLabels,interestLabels,stageLabels,formatLabels,currencyLabels,freshnessLabels,reviewLabels,seasonLabels,audienceLabels},reviewMethod:'Независимая проверка двумя ИИ-участниками по заголовкам и изображениям. Актуальность внешних условий не подтверждена.'}:{synthetic:true,profiles,split:{tuning:2,evaluation:4},modelSignals:['destination','interests','stage','signal']})};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`tutu-${kind}-2026-11-14.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Экспорт готов.');
  }
  function resetFilters() {for(const k of Object.keys(filters))filters[k]='';$('#card-search').value='';for(const s of document.querySelectorAll('.catalog-filters select'))s.value='';renderCatalog();}
  $('#card-search').addEventListener('input',event=>{filters.query=event.target.value;renderCatalog();});
  for(const key of ['geography','topic','stage','format','freshness','review'])$(`#filter-${key}`).addEventListener('change',event=>{filters[key]=event.target.value;renderCatalog();});
  $('#clear-filters').addEventListener('click',resetFilters);
  $('#toggle-filters').addEventListener('click',()=>{
    const panel=$('#catalog-filter-panel');panel.hidden=!panel.hidden;
    $('#toggle-filters').setAttribute('aria-expanded',String(!panel.hidden));
  });
  $('#export-cards').addEventListener('click',()=>download('cards'));$('#export-users').addEventListener('click',()=>download('users'));
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-edit-card'))editCard(Number(b.dataset.editCard));
    if(b.hasAttribute('data-edit-user'))editUser(b.dataset.editUser);
    if(b.hasAttribute('data-apply-user')){const p=profiles.find(p=>p.id===b.dataset.applyUser);window.feedApp.applyProfile(p);location.hash='comparison';showView('comparison');}
    if(b.hasAttribute('data-layout')){layout=b.dataset.layout;for(const node of document.querySelectorAll('[data-layout]'))node.setAttribute('aria-pressed',node.dataset.layout===layout);renderCatalog();}
    if(b.hasAttribute('data-user-filter')){userFilter=b.dataset.userFilter;for(const node of document.querySelectorAll('[data-user-filter]'))node.setAttribute('aria-pressed',node.dataset.userFilter===userFilter);renderUsers();}
    if(b.hasAttribute('data-review-filter')){filters.review=b.dataset.reviewFilter;$('#filter-review').value=filters.review;renderCatalog();}
    if(b.hasAttribute('data-clear-filter')){
      const key=b.dataset.clearFilter;
      const remaining=[...document.querySelectorAll('[data-clear-filter]')];
      const position=remaining.indexOf(b);
      filters[key]='';if(key==='query')$('#card-search').value='';else $(`#filter-${key}`).value='';
      renderCatalog();
      const chips=[...document.querySelectorAll('[data-clear-filter]')];
      (chips[Math.min(position,chips.length-1)] || $('#toggle-filters')).focus({preventScroll:true});
    }
    if(b.hasAttribute('data-reset-filters'))resetFilters();
    if(b.hasAttribute('data-cancel-editor') || b.id==='manage-close')$('#manage-dialog').close();
  });
  $('#manage-dialog').addEventListener('click',event=>{if(event.target===$('#manage-dialog'))$('#manage-dialog').close();});
  $('#manage-body').addEventListener('input',event=>{
    if(event.target.id==='geography-search'){const q=event.target.value.toLocaleLowerCase('ru');for(const l of document.querySelectorAll('.geography-options label'))l.hidden=!l.textContent.toLocaleLowerCase('ru').includes(q);}
  });
  $('#manage-body').addEventListener('change',event=>{
    if(event.target.name==='destinations'){const selected=[...document.querySelectorAll('[name="destinations"]:checked')].map(n=>n.value);$('#selected-geography').innerHTML=selected.map(k=>tag(destinationLabels[k])).join('') || tag('Не указана','tag-muted');}
  });
  $('#manage-body').addEventListener('submit',event=>{
    event.preventDefault();const form=event.target;const data=new FormData(form);let persisted;
    try {
      if(form.id==='card-form') {
        const current=cards.find(c=>c.id===Number(form.dataset.id));
        persisted=D.updateCard(current.id,{title:data.get('title').trim(),destinations:data.getAll('destinations'),interests:data.getAll('interests'),stages:data.getAll('stages'),format:data.get('format'),signal:data.get('signal'),geographyRole:data.get('geographyRole'),audience:data.getAll('audience'),currency:{kind:data.get('currencyKind'),status:data.get('freshness'),seasons:data.getAll('seasons'),validFrom:data.get('validFrom'),validUntil:data.get('validUntil'),checkedAt:data.get('checkedAt'),source:data.get('source').trim()},annotation:{note:data.get('note').trim()}});
        renderCatalog();window.feedApp.refresh();
      } else {
        const changes=Object.fromEntries(data.entries());changes.interests=data.getAll('interests');changes.age=Number(data.get('age'));changes.duration=Number(data.get('duration'));
        persisted=D.updateProfile(form.dataset.id,changes);renderUsers();window.feedApp.refresh();
      }
      $('#manage-dialog').close();toast(persisted?'Сохранено в браузере.':'Не удалось сохранить в браузере. Экспортируйте изменения.',!persisted);
    } catch(error){$('#editor-error').textContent=error.message;}
  });
  window.addEventListener('hashchange',()=>showView(location.hash.slice(1)));
  showView(location.hash.slice(1));
  if(D.storageWarnings.length)toast(D.storageWarnings.join(' '),true);
})();
