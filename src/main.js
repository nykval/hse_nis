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
        <div class="caption-title">${personalized ? 'Для пользователя' : 'Без персонализации'}</div>
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
    </div>
  </header>
  <div class="page-shell">
    <nav class="workspace-nav" aria-label="Разделы проекта">
      <a href="#comparison" data-view="comparison" aria-current="page">${icon('list')} Лента</a>
      <a href="#cards" data-view="cards">${icon('settings-sliders')} Карточки <span>${cards.length}</span></a>
      <a href="#users" data-view="users">${icon('user')} Пользователи <span>6</span></a>
    </nav>
    <main id="view-comparison" class="workspace">
      <section class="comparison" aria-label="Сравнение лент">
        <h1 class="sr-only">Сравнение лент</h1>
        <div class="phones">${phone('static')}${phone('personalized')}</div>
        <button class="text-button reveal-feed" id="reveal-feeds">Показать карточки</button>
      </section>
      <aside class="controls" aria-label="Параметры пользователя">
        <div class="controls-head"><h2>Профиль</h2><span class="profile-mode" id="active-profile-mode">Настройка</span></div>
        <div class="preset-grid" id="presets" aria-label="Профили для настройки"></div>
        <div class="divider"></div>
        <label class="field-label" for="destination">Направление</label><div class="select-wrap"><select id="destination"></select></div>
        <div class="field-label interest-heading" id="interests-label">Интересы</div><div class="interest-list" id="interests" role="group" aria-labelledby="interests-label"></div>
        <label class="field-label" for="stage">Стадия</label><div class="select-wrap"><select id="stage"></select></div>
        <label class="field-label field-label--spaced" for="signal">Последнее действие</label><div class="select-wrap"><select id="signal"></select></div>
        <details class="model-details"><summary>Как работает подбор</summary><dl><div><dt>Направление</dt><dd>+48</dd></div><div><dt>Интересы</dt><dd>до +36</dd></div><div><dt>Стадия</dt><dd>+16</dd></div><div><dt>Последний поиск</dt><dd>+20</dd></div></dl><p>Равные оценки сохраняют исходный порядок.</p></details>
      </aside>
    </main>
    <main id="view-cards" class="management-view" hidden></main>
    <main id="view-users" class="management-view" hidden></main>
  </div>
  <dialog id="card-dialog" aria-labelledby="dialog-title"><button class="dialog-close" id="dialog-close" aria-label="Закрыть">${icon('cross-small')}</button><div id="dialog-body"></div></dialog>
`;

const $ = selector => document.querySelector(selector);
const selectOptions = (values, selected) => Object.entries(values).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');

function renderControls() {
  $('#presets').innerHTML = presets.map(p => `<button class="preset ${activePreset === p.id ? 'preset--active' : ''}" data-preset="${p.id}" aria-pressed="${activePreset === p.id}"><span class="preset-icon">${icon(p.icon)}</span><span><strong>${escapeHtml(p.profile.name)}</strong><small>${escapeHtml(destinationLabels[p.profile.destination])}</small></span></button>`).join('');
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
  $('#dialog-body').innerHTML = `<div class="dialog-layout"><img class="dialog-image" src="${item.image}" alt="${escapeHtml(item.title)}"><div class="dialog-copy"><span class="section-number">#${String(id).padStart(3, '0')}</span><h2 id="dialog-title">${escapeHtml(item.title)}</h2><p>Без персонализации: <strong>№${staticPosition}</strong><br>Для пользователя: <strong>№${rankPosition}</strong></p><div class="dialog-score">${score} баллов</div>${parts.length ? `<ul class="reason-list">${parts.map(p => `<li><span>${escapeHtml(p.label)}</span><strong>+${p.value}</strong></li>`).join('')}</ul>` : '<p class="no-reason">Нет совпадений с профилем.</p>'}</div></div>`;
  $('#card-dialog').showModal();
}

$('#presets').addEventListener('click', event => {
  const button = event.target.closest('[data-preset]');
  if (!button) return;
  const preset = presets.find(p => p.id === button.dataset.preset);
  profile = structuredClone(preset.profile);
  activePreset = preset.id;
  $('#active-profile-mode').textContent = 'Настройка';
  renderControls(); renderFeeds(); revealFeeds();
});

$('#interests').addEventListener('click', event => {
  const button = event.target.closest('[data-interest]');
  if (!button) return;
  const interest = button.dataset.interest;
  profile.interests = profile.interests.includes(interest) ? profile.interests.filter(i => i !== interest) : [...profile.interests, interest];
  activePreset = null; renderControls(); renderFeeds(); revealFeeds();
  $('#active-profile-mode').textContent = 'Свои параметры';
});

for (const key of ['destination', 'stage', 'signal']) {
  $(`#${key}`).addEventListener('change', event => {
    profile[key] = event.target.value;
    activePreset = null; renderControls(); renderFeeds(); revealFeeds();
    $('#active-profile-mode').textContent = 'Свои параметры';
  });
}

$('.phones').addEventListener('click', event => {
  const button = event.target.closest('[data-card]');
  if (button) showCard(Number(button.dataset.card), button.dataset.kind);
});

$('#dialog-close').addEventListener('click', () => $('#card-dialog').close());
$('#reveal-feeds').addEventListener('click', revealFeeds);
$('#card-dialog').addEventListener('click', event => { if (event.target === $('#card-dialog')) $('#card-dialog').close(); });

renderControls();
renderFeeds();
window.feedApp = {
  refresh() { renderControls(); renderFeeds(); },
  applyProfile(selected) {
    profile = structuredClone(selected);
    activePreset = selected.split === 'tuning' ? selected.id : null;
    $('#active-profile-mode').textContent = selected.split === 'evaluation'
      ? `Оценка · ${selected.name}`
      : 'Настройка';
    renderControls(); renderFeeds();
    requestAnimationFrame(revealFeeds);
  },
};
})();
