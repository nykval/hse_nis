// The current 100-card export supplies all cards in both feeds. Title tags drive the demonstration model.
const card = (id, title, destinations, interests, stages = ['explore', 'plan'], signal = '') => ({
  id, title, image: `./cards/2026-11-14/${String(id).padStart(3, '0')}.png`, destinations, interests, stages, signal,
});

// Cards without a title stay neutral until their metadata is supplied.
function inferMetadata(title) {
  if (title === 'Без названия') return { destinations: [], interests: [], stages: [], signal: '' };
  const text = title.toLowerCase();
  const matches = patterns => Object.entries(patterns).filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
  const destinations = matches({
    sochi: /сочи|гелeнджик|геленджик|краснодар|кубан|розы хутор|юге россии/,
    petersburg: /петербург|питер|выборг|тихвин/,
    turkey: /турци|каппадоки/,
    altai: /алтай/,
    moscow: /москв|твери/,
    karelia: /карели|сортавал/,
    egypt: /египт|шарм/,
    bali: /бали/,
    caucasus: /кавказ|домбай|дагестан/,
    kaliningrad: /калининград/,
    nizhny: /нижн.*новгород/,
    dubai: /дуба|оаэ/,
  });
  const interests = matches({
    routes: /маршрут|выходн|куда|поездк|город|увид|съезд|путешеств|прогулк|один день/,
    hotels: /отел|зв[её]зд|бунгал|жиль|остановиться/,
    food: /вкус|пекарн|завтрак|винодель|гастро|лаундж.бар|сыроварн/,
    nature: /пляж|природ|вулкан|плато|красот|курорт|горн|хибин|камчат|кавказ|алтай/,
    family: /семейн|дет|аквапарк/,
    culture: /музе|усадьб|театр|эстетик|истор|достопр|фотозон/,
    activities: /серф|лыж|аквапарк|развлеч|забег|восхожд|велосипед/,
    tips: /как|знать|выгод|возврат|билет|скидк|льгот|стоит|недорог|альтернатива/,
    events: /фестивал|концерт|круто|dobrofest|jason derulo/,
  });
  const signal = /авиа|авиабилет/.test(text) ? 'flight' : /поезд|ж.?д билет|сапсан/.test(text) ? 'train' : '';
  const stages = interests.length || destinations.length ? ['explore', 'plan'] : [];
  if (interests.some(interest => ['food', 'culture', 'activities'].includes(interest))) stages.push('booked');
  return { destinations, interests, stages, signal };
}

const cards = window.cardManifest.map(([id, sourceTitle, width, height, type]) => {
  const title = sourceTitle === 'Без названия' ? `Карточка №${String(id).padStart(3, '0')}` : sourceTitle;
  const { destinations, interests, stages, signal } = inferMetadata(sourceTitle);
  return { ...card(id, title, destinations, interests, stages, signal), width, height, type };
});

const destinationLabels = {
  none: 'Не выбрано', sochi: 'Сочи и юг', petersburg: 'Санкт-Петербург', turkey: 'Турция',
  altai: 'Алтай', moscow: 'Москва', karelia: 'Карелия', egypt: 'Египет', bali: 'Бали',
  caucasus: 'Кавказ', kaliningrad: 'Калининград', nizhny: 'Нижний Новгород', dubai: 'Дубай',
};

const interestLabels = {
  routes: 'Маршруты', hotels: 'Отели', food: 'Еда', nature: 'Природа',
  family: 'С детьми', culture: 'Культура', activities: 'Активности', tips: 'Советы', events: 'События',
};

const stageLabels = { none: 'Не выбрано', explore: 'Присматриваюсь', plan: 'Планирую', booked: 'Билеты куплены' };
const signalLabels = { none: 'Нет сигнала', flight: 'Искал авиабилеты', train: 'Искал поезд', hotel: 'Искал отели' };

const presets = [
  { id: 'sochi', label: 'Лечу в Сочи', description: 'Билеты уже куплены', icon: 'sun', profile: { destination: 'sochi', interests: ['family', 'food', 'activities'], stage: 'booked', signal: 'flight' } },
  { id: 'petersburg', label: 'Еду в Петербург', description: 'Планирую выходные', icon: 'train', profile: { destination: 'petersburg', interests: ['food', 'culture', 'routes'], stage: 'plan', signal: 'train' } },
  { id: 'turkey', label: 'Отдых с семьёй', description: 'Выбираю отель', icon: 'bed', profile: { destination: 'turkey', interests: ['hotels', 'family'], stage: 'plan', signal: 'hotel' } },
  { id: 'new', label: 'Новый пользователь', description: 'Пока без истории', icon: 'user', profile: { destination: 'none', interests: [], stage: 'none', signal: 'none' } },
];

function scoreCard(item, profile) {
  const parts = [];
  if (profile.destination !== 'none' && item.destinations.includes(profile.destination)) {
    parts.push({ label: 'Совпадает направление', value: 48 });
  }
  const matchedInterests = profile.interests.filter(interest => item.interests.includes(interest));
  if (matchedInterests.length) {
    parts.push({ label: `Интересы: ${matchedInterests.map(i => interestLabels[i].toLowerCase()).join(', ')}`, value: Math.min(matchedInterests.length * 18, 36) });
  }
  if (profile.stage !== 'none' && item.stages.includes(profile.stage)) {
    parts.push({ label: 'Подходит к этапу поездки', value: 16 });
  }
  if (profile.signal === 'hotel' && item.interests.includes('hotels')) {
    parts.push({ label: 'Недавний поиск отелей', value: 20 });
  } else if (profile.signal !== 'none' && item.signal === profile.signal) {
    parts.push({ label: 'Недавний поиск билетов', value: 20 });
  }
  return { score: parts.reduce((sum, part) => sum + part.value, 0), parts };
}

function rankedCards(profile) {
  return cards.map((item, originalIndex) => ({ ...item, ...scoreCard(item, profile), originalIndex }))
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
}

window.feedData = { cards, destinationLabels, interestLabels, stageLabels, signalLabels, presets, scoreCard, rankedCards };
