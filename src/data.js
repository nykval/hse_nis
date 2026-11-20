(() => {
  const destinationLabels = {
    none:'Не выбрано', russia:'Россия', moscow:'Москва', moscow_region:'Московская область', petersburg:'Санкт-Петербург', leningrad_region:'Ленинградская область', vyborg:'Выборг', tikhvin:'Тихвин', sochi:'Сочи', krasnodar:'Краснодарский край', gelendzhik:'Геленджик', altai:'Республика Алтай', karelia:'Карелия', kalmykia:'Калмыкия', komi:'Коми', yaroslavl:'Ярославль и область', tula:'Тула', kazan:'Казань', murmansk:'Мурманская область', veliky_novgorod:'Великий Новгород', voronezh:'Воронежская область', irkutsk:'Иркутская область / Байкал', perm:'Пермский край', vladimir:'Владимир', yelets:'Елец', tver:'Тверь', nizhny:'Нижний Новгород', murom:'Муром', suzdal:'Суздаль', caucasus:'Кавказ', dagestan:'Дагестан', dombay:'Домбай', kaliningrad:'Калининград', turkey:'Турция', egypt:'Египет', thailand:'Таиланд', china:'Китай', vietnam:'Вьетнам', armenia:'Армения', montenegro:'Черногория', goa:'Гоа', bali:'Бали', asia:'Азия',
  };
  const interestLabels = { routes:'Маршруты', hotels:'Отели', food:'Еда', nature:'Природа', family:'С детьми', culture:'Культура', activities:'Активности', tips:'Советы', events:'События', wellness:'Отдых и спа', pets:'С питомцем', gear:'Экипировка' };
  const stageLabels = { none:'Не выбрано', explore:'Присматриваюсь', plan:'Планирую', booked:'Билеты куплены', on_trip:'В путешествии', after:'После поездки' };
  const signalLabels = { none:'Нет сигнала', flight:'Искал авиабилеты', train:'Искал поезд', hotel:'Искал отели', bus:'Искал автобус' };
  const formatLabels = { guide:'Гид / инструкция', collection:'Подборка', story:'История / впечатление', promotion:'Промобаннер', video:'Видео' };
  const currencyLabels = { evergreen:'Без явного срока', seasonal:'Сезонная', time_sensitive:'Требует проверки условий' };
  const freshnessLabels = { not_required:'Без указанного срока', unverified:'Не проверена', verified:'Подтверждена', expired:'Срок истёк' };
  const reviewLabels = { labeled:'Размечена', reviewed:'Проверена вторым участником', needs_source:'Нужен первоисточник', edited:'Изменена после проверки' };
  const seasonLabels = { spring:'Весна', summer:'Лето', autumn:'Осень', winter:'Зима' };
  const audienceLabels = { seniors:'Пассажиры 60+', experienced:'Опытные туристы', pet_owners:'С питомцем' };
  const storageKeys = { cards:'tutu-lab:cards:v1', profiles:'tutu-lab:profiles:v1' };
  const storageWarnings = [];
  function readSaved(key) {
    try { const text = localStorage.getItem(key); return text ? JSON.parse(text) : {}; }
    catch { storageWarnings.push('Не удалось прочитать локальные изменения. Загружены исходные данные.'); return {}; }
  }
  function writeSaved(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  const reviews = new Map((window.cardAnnotationReview?.decisions || []).map(r => [r.id,r]));
  const annotations = new Map(window.cardAnnotations.map(a => [a.id,a]));
  const baseCards = window.cardManifest.map(([id,sourceTitle,width,height,type]) => {
    const label = structuredClone(annotations.get(id));
    const review = reviews.get(id);
    if (review) {
      Object.assign(label, structuredClone(review.overrides || {}));
      Object.assign(label.annotation, { status:review.status, reviewer:window.cardAnnotationReview.reviewer, reviewedAt:window.cardAnnotationReview.reviewedAt, decision:review.decision });
    }
    return { ...label, sourceTitle, width, height, type, geographyRole:label.geographyRole || 'destination', image:`./cards/2026-11-14/${String(id).padStart(3,'0')}.png`, dataset:'2026-11-14' };
  });
  const savedCards = readSaved(storageKeys.cards);
  const savedProfiles = readSaved(storageKeys.profiles);
  const baseProfiles = structuredClone(window.syntheticProfiles);
  function validateCard(item) {
    if (!item.title?.trim()) return 'Укажите название карточки.';
    for (const [field, labels] of [['destinations',destinationLabels],['interests',interestLabels],['stages',stageLabels]]) {
      if (!Array.isArray(item[field]) || item[field].some(k => !Object.hasOwn(labels,k) || k === 'none') || new Set(item[field]).size !== item[field].length) return 'Проверьте метки карточки.';
    }
    if (!item.interests.length || !item.stages.length) return 'Выберите хотя бы одну тему и стадию.';
    if (!Object.hasOwn(formatLabels,item.format) || !Object.hasOwn(currencyLabels,item.currency?.kind) || !Object.hasOwn(freshnessLabels,item.currency?.status) || (item.signal && !Object.hasOwn(signalLabels,item.signal))) return 'Проверьте формат, актуальность и сигнал.';
    if (!['destination','origin'].includes(item.geographyRole)) return 'Проверьте роль географии.';
    if (!Array.isArray(item.currency.seasons) || item.currency.seasons.some(s => !Object.hasOwn(seasonLabels,s))) return 'Проверьте сезон.';
    if (!Array.isArray(item.audience) || item.audience.some(k => !Object.hasOwn(audienceLabels,k))) return 'Проверьте аудиторию.';
    if (item.currency.kind === 'time_sensitive' && item.currency.status === 'not_required') return 'Для материала с изменяемыми условиями укажите статус проверки.';
    for (const key of ['validFrom','validUntil','checkedAt']) {
      const date = item.currency[key];
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date)) return 'Укажите корректные даты.';
    }
    if (item.currency.validFrom && item.currency.validUntil && item.currency.validFrom > item.currency.validUntil) return 'Конец периода должен быть не раньше начала.';
    if (item.currency.status === 'verified' && (!item.currency.checkedAt || !item.currency.source?.trim())) return 'Для подтверждения укажите дату проверки и источник.';
    return '';
  }
  function validateProfile(p) {
    if (!p.name?.trim() || !p.title?.trim()) return 'Укажите имя и название сценария.';
    if (!Number.isInteger(p.age) || p.age < 18 || p.age > 100) return 'Возраст должен быть от 18 до 100 лет.';
    if (!Number.isInteger(p.duration) || p.duration < 0 || p.duration > 365) return 'Длительность должна быть от 0 до 365 дней.';
    if (!Object.hasOwn(destinationLabels,p.destination) || !Object.hasOwn(stageLabels,p.stage) || !Object.hasOwn(signalLabels,p.signal) || !Array.isArray(p.interests) || p.interests.some(k => !Object.hasOwn(interestLabels,k)) || new Set(p.interests).size !== p.interests.length) return 'Проверьте параметры профиля.';
    return '';
  }
  const cards = baseCards.map(c => {
    const saved = savedCards?.[c.id];
    return saved && !validateCard({...c,...saved}) ? {...c,...saved,id:c.id,image:c.image,width:c.width,height:c.height,type:c.type,dataset:c.dataset,sourceTitle:c.sourceTitle} : structuredClone(c);
  });
  const profiles = baseProfiles.map(p => savedProfiles?.[p.id] && !validateProfile({...p,...savedProfiles[p.id]}) ? {...p,...savedProfiles[p.id],id:p.id,split:p.split} : structuredClone(p));
  function persistCards() { return writeSaved(storageKeys.cards,Object.fromEntries(cards.filter(c => c.annotation.status === 'edited').map(c => [c.id,c]))); }
  function updateCard(id, changes) {
    const index = cards.findIndex(c => c.id === id);
    if (index < 0) throw new Error('Карточка не найдена.');
    const current = cards[index];
    const next = { ...current,...changes,id:current.id };
    const error = validateCard(next); if (error) throw new Error(error);
    next.geographyStatus = next.destinations.length ? 'specified' : 'unspecified';
    next.annotation = {...current.annotation, status:'edited', author:'Локальная правка', date:new Date().toLocaleDateString('sv-SE'), reviewer:'', reviewedAt:'', decision:'Предыдущая независимая проверка не распространяется на эту редакцию.', note:changes.annotation?.note || ''};
    Object.assign(current,next);
    return persistCards();
  }
  function updateProfile(id, changes) {
    const p=profiles.find(p=>p.id === id); if(!p) throw new Error('Профиль не найден.');
    const next={...p,...changes,id:p.id,split:p.split}; const error=validateProfile(next); if(error) throw new Error(error);
    Object.assign(p,next);
    return writeSaved(storageKeys.profiles,Object.fromEntries(profiles.map(p=>[p.id,p])));
  }
  function freshness(item, today = new Date().toLocaleDateString('sv-SE')) {
    if (item.currency.validUntil && item.currency.validUntil < today) return 'expired';
    if (item.currency.validFrom && item.currency.validFrom > today) return 'upcoming';
    return item.currency.status;
  }
  function scoreCard(item, profile) {
    const parts=[];
    if(profile.destination !== 'none' && item.geographyRole !== 'origin' && item.destinations.includes(profile.destination)) parts.push({label:'Совпадает направление',value:48});
    const matched=profile.interests.filter(i=>item.interests.includes(i));
    if(matched.length) parts.push({label:`Интересы: ${matched.map(i=>interestLabels[i].toLowerCase()).join(', ')}`,value:Math.min(matched.length*18,36)});
    if(profile.stage !== 'none' && item.stages.includes(profile.stage)) parts.push({label:'Подходит к этапу поездки',value:16});
    if(profile.signal === 'hotel' && item.interests.includes('hotels')) parts.push({label:'Недавний поиск отелей',value:20});
    else if(profile.signal !== 'none' && item.signal === profile.signal) parts.push({label:'Недавний поиск транспорта',value:20});
    return {score:parts.reduce((s,p)=>s+p.value,0),parts};
  }
  function rankedCards(profile) {return cards.map((item,originalIndex)=>({...item,...scoreCard(item,profile),originalIndex})).sort((a,b)=>b.score-a.score || a.originalIndex-b.originalIndex);}
  const presets=profiles.filter(p=>p.split === 'tuning').map(p=>({id:p.id,label:p.title,description:p.name,icon:p.signal === 'train'?'train':'sun',profile:p}));
  window.feedData={cards,profiles,presets,destinationLabels,interestLabels,stageLabels,signalLabels,formatLabels,currencyLabels,freshnessLabels:{...freshnessLabels,upcoming:'Период ещё не начался'},reviewLabels,seasonLabels,audienceLabels,storageWarnings,scoreCard,rankedCards,updateCard,updateProfile,validateCard,validateProfile,freshness,baseCards,baseProfiles};
})();
