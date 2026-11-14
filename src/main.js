(() => {
const { cards, destinationLabels, interestLabels, stageLabels, signalLabels, presets, rankedCards, scoreCard } = window.feedData;

const defaultProfile = structuredClone(presets[0].profile);
let profile = structuredClone(defaultProfile);
let activePreset = presets[0].id;

const app = document.querySelector('#app');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function icon(name, className = '') {
  return `<img class="ui-icon ${className}" src="./assets/uicons/fi-rr-${name}.svg" alt="" aria-hidden="true" />`;
}

function phone(kind) {
  const personalized = kind === 'personalized';
  return `
    <div class="phone-column">
      <div class="phone-caption">
        <span class="caption-icon ${personalized ? 'caption-icon--purple' : ''}">${icon(personalized ? 'magic-wand' : 'list')}</span>
        <div><div class="caption-title">${personalized ? 'Персонализированная' : 'Статичная'}</div><div class="caption-subtitle">${personalized ? 'Порядок зависит от профиля' : 'Один порядок для всех'}</div></div>
      </div>
      <div class="phone ${personalized ? 'phone--personalized' : ''}">
        <div class="phone-screen">
          <div class="phone-scroll" id="${kind}-feed" aria-label="${personalized ? 'Персонализированная' : 'Статичная'} лента">
            <img class="app-opening" src="./assets/${personalized ? 'IMG_2916' : 'IMG_2915'}.jpg" width="${personalized ? 1169 : 1170}" height="${personalized ? 1865 : 1861}" alt="Стартовый экран приложения: ${personalized ? 'пляж и предложение с кешбэком' : 'отель и предложение со скидкой'}" />
            <img class="app-offers" src="./assets/IMG_2922.jpg" width="1170" height="360" alt="Предложения: скидки на отели и поезда, бонусы за билет на поезд и жильё в Азии" />
            <section class="app-feed-section">
              <div class="cards-area" id="${kind}-cards"></div>
            </section>
          </div>
        </div>
      </div>
    </div>`;
}

app.innerHTML = `
  <header class="site-header">
    <div class="site-header-inner">
      <div class="site-brand" aria-label="Туту и Высшая школа экономики">
        <img class="brand-tutu" src="./assets/tutu-logo.png" alt="Туту" />
        <span class="brand-collaboration" aria-hidden="true">${icon('cross-small')}</span>
        <img class="brand-hse" src="./assets/hse-logo.png" alt="Высшая школа экономики" />
      </div>
      <span class="header-tag">ИНТЕРАКТИВНЫЙ ПРОТОТИП</span>
    </div>
  </header>
  <div class="page-shell">
    <main class="workspace">
      <section class="comparison" aria-label="Сравнение лент">
        <div class="comparison-top"><div><span class="section-number">01 / СРАВНЕНИЕ</span><h2>Два экрана, один набор карточек</h2></div><div class="comparison-legend"><span class="legend-dot"></span> Прокрутите стартовый экран вниз к ленте</div></div>
        <div class="phones">${phone('static')}<div class="compare-arrow" aria-hidden="true">${icon('arrow-right')}</div>${phone('personalized')}</div>
      </section>
      <aside class="controls" aria-label="Параметры пользователя">
        <div class="controls-head"><div><span class="section-number">02 / ПРОФИЛЬ</span><h2>Кто смотрит ленту?</h2></div><span class="control-decoration">${icon('settings-sliders')}</span></div>
        <p class="controls-intro">Измените сигналы пользователя. Правая лента пересчитается сразу.</p>
        <div class="preset-label">Быстрые сценарии</div><div class="preset-grid" id="presets"></div>
        <div class="divider"></div>
        <label class="field-label" for="destination">Куда собирается</label><div class="select-wrap"><select id="destination"></select></div>
        <div class="field-label interest-heading">Что интересно <span>можно выбрать несколько</span></div><div class="interest-list" id="interests"></div>
        <label class="field-label" for="stage">Этап поездки</label><div class="select-wrap"><select id="stage"></select></div>
        <label class="field-label field-label--spaced" for="signal">Последнее действие</label><div class="select-wrap"><select id="signal"></select></div>
        <div class="score-explainer"><span class="score-icon">${icon('chart-histogram')}</span><div><strong>Как меняется порядок</strong><p>Совпадение направления +48, интересов до +36, этапа +16, недавнего поиска +20. Равные оценки сохраняют исходный порядок.</p></div></div>
      </aside>
    </main>
  </div>
  <dialog id="card-dialog" aria-labelledby="dialog-title"><button class="dialog-close" id="dialog-close" aria-label="Закрыть">${icon('cross-small')}</button><div id="dialog-body"></div></dialog>
`;

const $ = selector => document.querySelector(selector);
const selectOptions = (values, selected) => Object.entries(values).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');

function renderControls() {
  $('#presets').innerHTML = presets.map(p => `<button class="preset ${activePreset === p.id ? 'preset--active' : ''}" data-preset="${p.id}" aria-pressed="${activePreset === p.id}"><span class="preset-icon">${icon(p.icon)}</span><span><strong>${p.label}</strong><small>${p.description}</small></span></button>`).join('');
  $('#destination').innerHTML = selectOptions(destinationLabels, profile.destination);
  $('#stage').innerHTML = selectOptions(stageLabels, profile.stage);
  $('#signal').innerHTML = selectOptions(signalLabels, profile.signal);
  $('#interests').innerHTML = Object.entries(interestLabels).map(([id, label]) => `<button class="interest ${profile.interests.includes(id) ? 'interest--active' : ''}" data-interest="${id}" aria-pressed="${profile.interests.includes(id)}">${label}${profile.interests.includes(id) ? icon('check', 'selected-check') : ''}</button>`).join('');
}

function renderCard(item, kind, index) {
  return `<button class="feed-card${item.width > item.height ? ' feed-card--wide' : ''}" data-card="${item.id}" data-kind="${kind}" aria-label="${escapeHtml(item.title)}. Открыть объяснение позиции"><img src="${item.image}" alt="${escapeHtml(item.title)}" loading="${index < 6 ? 'eager' : 'lazy'}" /></button>`;
}

function renderFeeds() {
  const ranked = rankedCards(profile);
  const staticItems = cards.map((item, originalIndex) => ({ ...item, ...scoreCard(item, profile), originalIndex }));
  $('#static-cards').innerHTML = `<div class="card-grid">${staticItems.map((item, i) => renderCard(item, 'static', i)).join('')}</div>`;
  $('#personalized-cards').innerHTML = `<div class="card-grid">${ranked.map((item, i) => renderCard(item, 'personalized', i)).join('')}</div>`;
}

function revealFeeds() {
  for (const kind of ['static', 'personalized']) {
    const feed = $(`#${kind}-feed`);
    const openingHeight = feed.querySelector('.app-opening').offsetHeight;
    const offersHeight = feed.querySelector('.app-offers').offsetHeight;
    feed.scrollTo({ top: Math.max(0, openingHeight + offersHeight - 36), behavior: 'auto' });
  }
}

function showCard(id, kind) {
  const item = cards.find(c => c.id === id);
  if (!item) return;
  const { score, parts } = scoreCard(item, profile);
  const staticPosition = cards.findIndex(c => c.id === id) + 1;
  const rankPosition = rankedCards(profile).findIndex(c => c.id === id) + 1;
  $('#dialog-body').innerHTML = `<div class="dialog-layout"><img class="dialog-image" src="${item.image}" alt="${escapeHtml(item.title)}"><div class="dialog-copy"><span class="section-number">КАРТОЧКА #${String(id).padStart(3, '0')}</span><h2 id="dialog-title">${escapeHtml(item.title)}</h2><p>В статичной ленте: <strong>${staticPosition} место</strong><br>В персонализированной: <strong>${rankPosition} место</strong></p><div class="dialog-score">${score ? `+${score} баллов` : '0 баллов'} <span>демонстрационная оценка</span></div><div class="reason-title">Почему такая позиция</div>${parts.length ? `<ul class="reason-list">${parts.map(p => `<li><span>${escapeHtml(p.label)}</span><strong>+${p.value}</strong></li>`).join('')}</ul>` : '<p class="no-reason">Пока нет совпадений с параметрами профиля. Карточка остаётся в исходном порядке среди карточек с такой же оценкой.</p>'}<div class="dialog-origin">${kind === 'static' ? 'Открыто из статичной ленты' : 'Открыто из персонализированной ленты'}</div></div></div>`;
  $('#card-dialog').showModal();
}

$('#presets').addEventListener('click', event => {
  const button = event.target.closest('[data-preset]');
  if (!button) return;
  const preset = presets.find(p => p.id === button.dataset.preset);
  profile = structuredClone(preset.profile);
  activePreset = preset.id;
  renderControls(); renderFeeds(); revealFeeds();
});

$('#interests').addEventListener('click', event => {
  const button = event.target.closest('[data-interest]');
  if (!button) return;
  const interest = button.dataset.interest;
  profile.interests = profile.interests.includes(interest) ? profile.interests.filter(i => i !== interest) : [...profile.interests, interest];
  activePreset = null; renderControls(); renderFeeds(); revealFeeds();
});

for (const key of ['destination', 'stage', 'signal']) {
  $(`#${key}`).addEventListener('change', event => {
    profile[key] = event.target.value;
    activePreset = null; renderControls(); renderFeeds(); revealFeeds();
  });
}

$('.phones').addEventListener('click', event => {
  const button = event.target.closest('[data-card]');
  if (button) showCard(Number(button.dataset.card), button.dataset.kind);
});

$('#dialog-close').addEventListener('click', () => $('#card-dialog').close());
$('#card-dialog').addEventListener('click', event => { if (event.target === $('#card-dialog')) $('#card-dialog').close(); });

renderControls();
renderFeeds();
})();
