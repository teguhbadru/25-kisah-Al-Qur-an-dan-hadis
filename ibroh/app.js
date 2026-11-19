'use strict';
const main = document.querySelector('main');
const storageKey = 'ibroh-family-v1';
const levels = ['Semua kisah', 'Menemukan fakta', 'Menyusun urutan', 'Sebab & akibat', 'Membaca yang tersirat', 'Menilai & merenung'];
const tones = ['#e5eadc', '#f1e8d9', '#e4e9e6', '#e9e5d9', '#e5e8d8'];
const glyphs = ['⌁', '❧', '✦', '◡', '❀', '♧', '◡', '◈', '⌁', '❦', '⌁', '❧', '♧', '◈', '✧', '◒', '❧', '◡', '◒', '♧', '❦', '◈', '♧', '✦', '❀'];
let stories = [];
let state = { stories: {}, last: null, sessions: [] };
const sessionFields = ['date', 'story', 'understanding', 'notes', 'practice'];
let saveAvailable = true;
let filter = 0;
let query = '';
let journeyFilter = 'started';
let currentTab = 0;
let activeSessionIndex = 0;
let largeText = false;
let toastTimer;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object' && saved.stories && typeof saved.stories === 'object' && !Array.isArray(saved.stories)) {
      for (const story of stories) {
        const progress = saved.stories[story.id];
        if (progress && typeof progress === 'object' && !Array.isArray(progress)) {
          state.stories[story.id] = { ...progress, answers: progress.answers && typeof progress.answers === 'object' ? progress.answers : {} };
        }
      }
      if (stories.some(story => story.id === saved.last)) state.last = saved.last;
      if (Array.isArray(saved.sessions)) state.sessions = saved.sessions.slice(0, 5).map(session => Object.fromEntries(sessionFields.map(field => [field, typeof session?.[field] === 'string' ? session[field].slice(0, 3000) : ''])));
    }
  } catch { saveAvailable = false; }
}
function progressFor(id) {
  if (!state.stories[id]) state.stories[id] = { answers: {} };
  return state.stories[id];
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); saveAvailable = true; }
  catch { saveAvailable = false; toast('Penyimpanan perangkat tidak tersedia. Jawaban tetap ada selama halaman ini terbuka.'); }
}
function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 3500);
}
function storageNote() {
  return saveAvailable ? 'Jawaban dan progres tersimpan di browser ini.' : 'Penyimpanan browser tidak tersedia. Progres berlaku selama halaman terbuka.';
}
function countComplete() { return stories.filter(story => state.stories[story.id]?.completed).length; }
function storyCard(story) {
  const index = stories.indexOf(story);
  const progress = state.stories[story.id] || {};
  return `<article class="story-card"><div class="card-art" style="--tone:${tones[story.level - 1]};--glyph:#6e8062"><span class="card-glyph" aria-hidden="true">${glyphs[index]}</span><button class="bookmark" data-bookmark="${story.id}" aria-label="${progress.bookmarked ? 'Hapus simpanan' : 'Simpan kisah'} ${escapeHtml(story.title)}" aria-pressed="${Boolean(progress.bookmarked)}">${progress.bookmarked ? '♥' : '♡'}</button></div><div class="card-body"><div class="card-meta"><span class="level-label">Tingkat ${story.level}</span><span>${story.minutes} menit baca & bahas</span></div><h3><a href="#kisah/${story.id}">${escapeHtml(story.title)}</a></h3><p>${escapeHtml(story.value)}</p><div class="card-bottom"><span class="${progress.completed ? 'complete-label' : ''}">${progress.completed ? '✓ Sudah dibahas' : progress.started ? 'Sedang dibaca' : 'Baca bersama'}</span><a href="#kisah/${story.id}">${progress.started ? 'Lanjutkan' : 'Buka kisah'} <span aria-hidden="true">↗</span></a></div></div></article>`;
}
function filtersMarkup() {
  return `<div class="toolbar"><div class="filters" aria-label="Tingkat pemahaman">${[1,2,3,4,5].map(level => `<button class="filter ${filter === level ? 'selected' : ''}" data-filter="${level}" aria-label="Tingkat ${level}, ${levels[level]}" aria-pressed="${filter === level}">Tingkat ${level}</button>`).join('')}</div></div>`;
}
function filteredStories() {
  const term = query.trim().toLocaleLowerCase('id');
  return stories.filter(story => (!filter || story.level === filter) && `${story.title} ${story.value} ${story.text}`.toLocaleLowerCase('id').includes(term));
}
function emptySearch() { return '<div class="empty"><h3>Kisahnya belum ditemukan.</h3><p>Coba kata seperti sabar, berbagi, atau jujur.</p><button class="secondary" data-reset-search>Lihat semua kisah</button></div>'; }
function refreshCards() {
  const results = filteredStories();
  document.querySelector('#story-grid').innerHTML = results.map(storyCard).join('') || emptySearch();
  const resultCount = document.querySelector('#result-count');
  if (resultCount) resultCount.textContent = `${results.length} kisah${filter ? ` · ${levels[filter]}` : ' untuk dibaca bersama'}`;
  document.querySelectorAll('[data-filter]').forEach(button => {
    const selected = Number(button.dataset.filter) === filter;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
function renderHome(catalog = false) {
  const last = stories.find(story => story.id === state.last);
  const resume = last && state.stories[last.id]?.started && !state.stories[last.id]?.completed ? last : stories.find(story => state.stories[story.id]?.started && !state.stories[story.id]?.completed);
  const next = resume || stories.find(story => !state.stories[story.id]?.completed) || stories[0];
  const hasStarted = stories.some(story => state.stories[story.id]?.started || state.stories[story.id]?.completed);
  const startLabel = resume ? `Lanjutkan ${resume.title}` : !hasStarted ? 'Mulai kisah pertama' : countComplete() === stories.length ? `Baca ulang ${next.title}` : `Mulai ${next.title}`;
  document.title = `${catalog ? 'Jelajahi kisah' : 'IBROH'} — Memahami kisah, menumbuhkan kebaikan`;
  main.innerHTML = `${catalog ? `<div class="intro"><div><p class="eyebrow">Koleksi kisah</p><h1>Temukan kisah untuk hari ini.</h1><p>Pilih sesuai rasa ingin tahu dan kesiapan anak.</p></div></div>` : `<div class="intro"><div><h1 class="welcome-heading">Assalamu’alaikum, Abba & Umma.</h1><p>Yuk Mulai waktu berkualitas bersama anak, melalui cerita Islami, percakapan hangat, dan aksi kebaikan yang sederhana.</p></div><span class="date-note">Mulai dari satu kisah kecil.</span></div><section class="hero" aria-label="Mulai membaca bersama"><div class="hero-copy"><p class="eyebrow">25 kisah Al-Qur’an & hadis</p><h2>Memahami kisah.<br><em>Menumbuhkan</em><br>kebaikan.</h2><p>Temani anak menemukan hikmah, lalu bawa satu kebaikan ke keseharian keluarga.</p><a class="primary" href="#kisah/${next.id}">${escapeHtml(startLabel)} <span aria-hidden="true">→</span></a><p class="start-duration">${next.minutes} menit baca &amp; bahas · Baca, ngobrol, lalu pilih satu kebaikan.</p>${last && state.stories[last.id]?.completed ? `<div class="return-note"><strong>Kebaikan dari kisah terakhir</strong><p>${escapeHtml(last.practice)}</p><span>${escapeHtml(last.practiceFollowup || 'Coba bersama hari ini. Saat kembali, ceritakan bagaimana pengalamannya.')}</span><button class="link-button" data-record-session="${last.id}">Catat sesi ini</button></div>` : ''}</div></section>`}
  ${catalog ? `<section aria-label="Koleksi kisah"><p class="level-help">Baru mulai? Pilih Tingkat 1 untuk berlatih menjawab siapa, apa, dan kapan.</p>${filtersMarkup()}<div class="cards" id="story-grid"></div></section>` : ''}<section class="bottom-callout"><span aria-hidden="true">❧</span><div><h3>Ayah & Bunda juga ikut belajar.</h3><p>Temani proses berpikirnya. Dengarkan dulu, lalu temukan hikmahnya bersama.</p></div><button class="secondary" data-guide>Baca panduan ↗</button></section>`;
  if (catalog) refreshCards();
}
function sessionFor(index) {
  if (!state.sessions[index]) state.sessions[index] = {};
  return state.sessions[index];
}
function sessionCount() {
  return state.sessions.filter(session => sessionFields.some(field => (session?.[field] || '').trim())).length;
}
function sessionTrackerMarkup() {
  const options = ['', 'Masih perlu dibimbing', 'Mulai memahami dengan bantuan', 'Bisa menjelaskan dengan kata sendiri'];
  return `<section class="session-tracker" aria-label="Catatan lima sesi"><p class="session-status" id="session-count">Sesi dicatat: ${sessionCount()} dari 5</p><p class="tiny">Amati prosesnya dengan hangat. Anak boleh membutuhkan waktu yang berbeda pada setiap kisah.</p><div class="session-list">${Array.from({length:5}, (_,index) => {
    const session = sessionFor(index);
    const field = name => `data-session="${index}" data-session-field="${name}"`;
    return `<details id="session-${index}" class="session-card" ${index === activeSessionIndex ? 'open' : ''}><summary>Sesi ${index + 1}<span id="session-label-${index}">${escapeHtml(session.date || 'Belum ada tanggal')}</span></summary><div class="session-fields"><label>Tanggal membaca<input type="date" ${field('date')} value="${escapeHtml(session.date || '')}"></label><label>Kisah yang dibaca<select ${field('story')}><option value="">Pilih kisah</option>${stories.map(story => `<option value="${story.id}" ${session.story === story.id ? 'selected' : ''}>${escapeHtml(story.title)}</option>`).join('')}</select></label><label class="session-wide">Pemahaman anak<select ${field('understanding')}>${options.map(value => `<option value="${escapeHtml(value)}" ${session.understanding === value ? 'selected' : ''}>${value || 'Pilih hasil pengamatan'}</option>`).join('')}</select></label><label class="session-wide">Hal yang berkembang &amp; masih perlu didampingi (opsional)<textarea ${field('notes')} maxlength="3000" placeholder="Apa yang anak ingat? Bagaimana ia menjelaskan pesan cerita? Catat contoh ucapannya…">${escapeHtml(session.notes || '')}</textarea></label><label class="session-wide">Kebaikan yang dicoba &amp; tindak lanjut (opsional)<textarea ${field('practice')} maxlength="3000" placeholder="Kebaikan apa yang dicoba? Apa yang ingin kalian latih pada sesi berikutnya?">${escapeHtml(session.practice || '')}</textarea></label></div></details>`;
  }).join('')}</div><p class="saved-note" id="session-save-note" role="status">${storageNote()} Catatan bisa berbeda di perangkat lain.</p></section>`;
}
function saveSessionInput(target) {
  const index = Number(target.dataset.session);
  const field = target.dataset.sessionField;
  if (!Number.isInteger(index) || index < 0 || index > 4 || !sessionFields.includes(field)) return;
  sessionFor(index)[field] = target.value.slice(0, 3000);
  save();
  document.querySelector('#session-count').textContent = `${sessionCount()} dari 5 sesi sudah dicatat`;
  document.querySelector(`#session-label-${index}`).textContent = sessionFor(index).date || 'Belum ada tanggal';
  document.querySelector('#session-save-note').textContent = storageNote() + ' Catatan bisa berbeda di perangkat lain.';
}
function renderJourney() {
  const complete = countComplete();
  document.title = 'Lembar Pantau 5 Sesi — IBROH';
  const selected = stories.filter(story => {
    const progress = state.stories[story.id] || {};
    return journeyFilter === 'bookmarked' ? progress.bookmarked : journeyFilter === 'completed' ? progress.completed : progress.started;
  });
  main.innerHTML = `<div class="intro"><div><p class="eyebrow">Lembar Pantau 5 Sesi</p><h1>Catatan perkembangan dari waktu ke waktu.</h1><p>Catat cara anak memahami kisah dan kebaikan yang dicoba bersama. Isi satu sesi setiap kali selesai membaca.</p></div></div>${sessionTrackerMarkup()}<section class="story-history"><h2>Kisah yang sudah kita jelajahi</h2><div class="journey-summary"><strong>${complete}<span style="font-size:20px;color:#8b997e"> / 25</span></strong><div><p>Kisah dibahas</p><div class="progress-line" role="progressbar" aria-label="Kisah dibahas" aria-valuenow="${complete}" aria-valuemin="0" aria-valuemax="25"><span style="width:${complete / 25 * 100}%"></span></div></div></div><p class="tiny">Status “Kisah dibahas” mengikuti konfirmasi Aba atau Umma setelah diskusi lisan atau tertulis.</p><div class="journey-tabs">${[['started','Pernah dibuka'],['bookmarked','Disimpan'],['completed','Sudah dibahas']].map(([key,label]) => `<button class="filter ${journeyFilter === key ? 'selected' : ''}" data-journey="${key}" aria-pressed="${journeyFilter === key}">${label}</button>`).join('')}</div><div class="cards">${selected.map(storyCard).join('') || `<div class="empty"><h3>${journeyFilter === 'bookmarked' ? 'Simpan kisah yang ingin dibaca lagi.' : journeyFilter === 'completed' ? 'Setiap perjalanan dimulai dari satu kisah.' : 'Kisah pertama menunggu kita.'}</h3><p>${journeyFilter === 'bookmarked' ? 'Tekan ikon hati pada kartu kisah untuk menyimpannya di sini.' : 'Buka satu kisah, baca bersama, dan bahas dengan santai.'}</p><a class="primary" href="#kisah">Jelajahi kisah →</a></div>`}</div></section>`;
}
function questionMarkup(question, index, story) {
  const answer = progressFor(story.id).answers[index] || '';
  return `<fieldset class="question"><legend>${index + 1}. ${escapeHtml(question.prompt)}</legend>${question.options.length ? question.options.map((option, optionIndex) => `<label class="option"><input type="radio" name="answer-${index}" data-answer="${index}" value="${escapeHtml(option)}" ${answer === option ? 'checked' : ''}><span>${question.options.length === 3 ? `${String.fromCharCode(65 + optionIndex)}. ` : ''}${escapeHtml(option)}</span></label>`).join('') : `<textarea class="answer" data-answer="${index}" maxlength="2000" aria-label="Jawaban pertanyaan ${index + 1}" placeholder="Tulis jawaban anak, atau bahas secara lisan…">${escapeHtml(answer)}</textarea>`}</fieldset>`;
}
function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function recordSession(story) {
  const date = localDate();
  let index = state.sessions.findIndex(session => session?.story === story.id && session?.date === date);
  if (index < 0) index = Array.from({length:5}, (_,i) => i).find(i => !sessionFields.some(field => (state.sessions[i]?.[field] || '').trim())) ?? -1;
  if (index < 0) {
    activeSessionIndex = 4;
    location.hash = '#perjalanan';
    toast('Lima sesi sudah terisi. Catatan sebelumnya tetap tersimpan; buka salah satu sesi untuk meninjaunya.');
    return;
  }
  activeSessionIndex = index;
  const session = sessionFor(index);
  session.story = story.id;
  session.date = date;
  save();
  location.hash = '#perjalanan';
}
function completeStory(story) {
  Object.assign(progressFor(story.id), {completed:true, read:true, started:true});
  state.last = story.id;
  save();
  currentTab = 3;
  renderReader(story);
  document.querySelector('#completion-title')?.focus();
}
function completionMarkup(story) {
  const next = stories[stories.indexOf(story) + 1];
  return `<section class="reading session-complete"><p class="eyebrow">Sesi membaca selesai</p><h2 id="completion-title" tabindex="-1">Alhamdulillah, satu kisah sudah dibahas.</h2><p>Kalian sudah meluangkan waktu untuk mendengar dan memahami bersama.</p><div class="lesson-box"><strong>Satu kebaikan untuk dibawa pulang</strong>${escapeHtml(story.practice)}</div><p>Praktiknya boleh menyusul. Coba hari ini atau besok, lalu obrolkan lagi saat bertemu kisah berikutnya.</p>${story.practiceFollowup ? `<div class="lesson-box"><strong>Obrolan beberapa hari lagi</strong>${escapeHtml(story.practiceFollowup)}<p class="tiny">Ajak anak bercerita tentang pengalamannya saat kalian kembali membaca.</p></div>` : ''}<div class="reader-actions"><button class="primary" data-record-session="${story.id}">Catat sesi ini</button>${next ? `<a class="secondary" href="#kisah/${next.id}">Baca kisah berikutnya</a>` : '<a class="secondary" href="#kisah">Jelajahi kisah lagi</a>'}</div><p class="tiny">Tanggal dan judul kisah akan terisi otomatis. Catatan panjang boleh dikosongkan.</p></section>`;
}
function renderReader(story) {
  const progress = progressFor(story.id);
  document.title = `${story.title} — IBROH`;
  let panel;
  if (currentTab === 3) {
    panel = completionMarkup(story);
  } else if (currentTab === 0) {
    const sentences = story.text.match(/[^.!?]+[.!?]+[”"']?|[^.!?]+$/g) || [story.text];
    const paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) paragraphs.push(sentences.slice(i, i + 3).join('').trim());
    panel = `<article class="reading ${largeText ? 'large' : ''}"><h2>Yuk, baca dengan tenang.</h2>${paragraphs.map(paragraph => `<p class="narrative">${escapeHtml(paragraph)}</p>`).join('')}<div class="word-box"><strong>Kata baru</strong>${escapeHtml(story.words)}</div><p class="source">Sumber kisah · ${escapeHtml(story.source)}</p></article><div class="reader-actions"><button class="secondary" data-read>✓ ${progress.read ? 'Sudah dibaca' : 'Tandai sudah dibaca'}</button><button class="primary" data-tab="1">Ayo memahami →</button></div>`;
  } else if (currentTab === 1) {
    panel = `<section class="reading"><h2>Apa yang kita temukan?</h2><p class="tiny">Dengarkan jawaban anak. Boleh dijawab lisan atau dicatat di sini. Buka panduan setelah berdiskusi.</p><div class="questions">${story.questions.map((question,index) => questionMarkup(question,index,story)).join('')}</div><details class="guide-answer"><summary>Panduan jawaban untuk orang tua</summary><p>${escapeHtml(story.guide)}</p></details><p class="saved-note" id="save-note">${storageNote()}</p></section><div class="reader-actions"><button class="secondary" data-tab="0">← Baca ulang</button><button class="primary" data-tab="2">Temukan hikmahnya →</button></div>`;
  } else {
    panel = `<section class="reading"><p class="eyebrow">Hikmah kisah</p><h2>${escapeHtml(story.value)}</h2><p>${escapeHtml(story.lesson)}</p><div class="lesson-box"><strong>Renungkan bersama</strong>${escapeHtml(story.reflection)}</div>${story.conversation ? `<div class="lesson-box"><strong>Obrolan lisan (opsional)</strong><p>${escapeHtml(story.conversation)}</p><p class="tiny">Dengarkan pengalaman anak. Boleh dijawab lisan dan tidak perlu dicatat.</p></div>` : ''}<label class="answer-label" for="reflection">Apa yang kita pelajari hari ini?</label><textarea id="reflection" class="answer" data-reflection maxlength="3000" placeholder="Catat pemikiran anak dan orang tua…">${escapeHtml(progress.reflection || '')}</textarea><div class="lesson-box"><strong>Satu kebaikan untuk dicoba</strong>${escapeHtml(story.practice)}<p class="tiny" style="margin:10px 0 0">Usulan kegiatan keluarga dari IBROH.</p></div><label class="practice-check"><input type="checkbox" data-practice ${progress.practiced ? 'checked' : ''}><span>Kami sudah mencoba kebaikan ini bersama.</span></label><p class="saved-note">${storageNote()}</p></section><div class="reader-actions"><button class="secondary" data-tab="1">← Kembali berdiskusi</button><button class="primary" data-complete>${progress.completed ? '✓ Kisah sudah dibahas' : 'Selesai membaca & berdiskusi'}</button></div>`;
  }
  const next = stories[stories.indexOf(story) + 1];
  main.innerHTML = `<div class="reader-top"><a href="#kisah" class="back">← Kembali ke koleksi</a><div><button class="text-size" data-text-size aria-pressed="${largeText}" aria-label="${largeText ? 'Gunakan ukuran teks biasa' : 'Perbesar teks cerita'}">A<span style="font-size:18px">a</span></button> <button class="text-size" data-bookmark="${story.id}" aria-pressed="${Boolean(progress.bookmarked)}">${progress.bookmarked ? '♥ Disimpan' : '♡ Simpan'}</button></div></div><div class="reader-layout"><div class="reader-main"><header class="reader-heading" style="--tone:${tones[story.level-1]}"><p class="eyebrow">Tingkat ${story.level} · ${levels[story.level]}</p><h1>${escapeHtml(story.title)}</h1><p>${story.minutes} menit baca & bahas · ${escapeHtml(story.value)}</p></header><div class="read-tabs" role="tablist" aria-label="Langkah membaca">${['Baca kisah','Ayo memahami','Hikmah & praktik'].map((label,index) => `<button role="tab" id="tab-${index}" aria-controls="reader-panel" aria-selected="${(currentTab === 3 ? 2 : currentTab) === index}" class="${(currentTab === 3 ? 2 : currentTab) === index ? 'selected' : ''}" data-tab="${index}">${label}</button>`).join('')}</div><div id="reader-panel" role="tabpanel" aria-labelledby="${currentTab === 3 ? 'completion-title' : `tab-${currentTab}`}">${panel}</div></div><aside class="reader-side" aria-label="Pendamping membaca"><section><p class="eyebrow">Untuk Ayah & Bunda</p><h3>Hadir, lalu dengarkan.</h3><p>Beri anak waktu berpikir. Tanyakan, “Bagian mana yang membuatmu berpikir begitu?”</p><button class="link-button" data-guide>Buka panduan ↗</button></section><section><h3>Lembar Pantau 5 Sesi</h3><p>Kisah dibahas: ${countComplete()} dari 25</p><p class="tiny">Status “Kisah dibahas” mengikuti konfirmasi Aba atau Umma setelah diskusi lisan atau tertulis.</p><p>Sesi dicatat: ${sessionCount()} dari 5</p><div class="progress-line"><span style="width:${countComplete()/25*100}%"></span></div><p class="tiny">${storageNote()}</p>${progress.completed && next ? `<a class="primary" href="#kisah/${next.id}">Kisah berikutnya →</a>` : '<a class="link-button" href="#perjalanan">Buka lembar pantau ↗</a>'}</section></aside></div>`;
}
function activeStory() { return stories.find(story => `#kisah/${story.id}` === location.hash); }
function route() {
  const hash = location.hash || '#beranda';
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = hash === `#${link.dataset.nav}` || (hash.startsWith('#kisah/') && link.dataset.nav === 'kisah');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  const story = activeStory();
  if (story) {
    state.last = story.id;
    currentTab = 0;
    save();
    renderReader(story);
  } else if (hash === '#perjalanan') renderJourney();
  else if (hash === '#kisah') renderHome(true);
  else if (hash === '#beranda' || !location.hash) renderHome();
  else main.innerHTML = '<div class="empty"><h1>Kisah ini belum ditemukan.</h1><p>Pilih kisah lain dari koleksi IBROH.</p><a class="primary" href="#kisah">Buka koleksi →</a></div>';
  window.scrollTo({ top:0, behavior:'instant' });
}
function openInfo(kind) {
  document.querySelector('#dialog-content').innerHTML = kind === 'guide' ? `<p class="eyebrow">Panduan orang tua</p><h2>Mulai dari hadir bersama.</h2><p>Sesuaikan ritme dengan anak. Satu kisah bisa dibaca dan dibahas dalam beberapa pertemuan.</p><div class="guide-step"><b>1</b><div><h3>Baca dan kenali</h3><p>Awali dengan bismillah. Baca bergantian atau bacakan untuk anak. Bahas kata yang belum dipahami.</p></div></div><div class="guide-step"><b>2</b><div><h3>Dengarkan pikirannya</h3><p>Tanyakan isi cerita dan beri waktu berpikir. Ajak anak mencari petunjuk di bacaan. Pertanyaan pendapat boleh punya jawaban berbeda dengan alasan yang masuk akal.</p></div></div><div class="guide-step"><b>3</b><div><h3>Coba satu kebaikan</h3><p>Pilih kegiatan kecil yang bisa dilakukan bersama. Orang tua ikut memberi contoh. Tanyakan lagi esok hari bagaimana pengalamannya.</p></div></div><p class="tiny">Lima tingkat membantu memilih tantangan pemahaman. Semua kisah dapat dibuka sesuai kesiapan anak. Catatan dan progres tersimpan pada browser yang digunakan.</p>` : `<p class="eyebrow">Tentang IBROH</p>
<h2>Memahami kisah.<br>Meneladani bersama.</h2>
<p>IBROH tumbuh dari keinginan seorang Aba untuk lebih hadir menanamkan nilai-nilai agama dalam keseharian keluarga.</p>
<p>Bacakan satu kisah, ajak anak membahas maknanya, lalu coba satu kebaikan bersama. Lewat 25 kisah dalam lima tingkat, anak berlatih memahami bacaan setahap demi setahap, dari menemukan fakta hingga merenungkan pesan cerita.</p>
<h3>Materi bacaan</h3>
<p>Seluruh 25 kisah bersumber dari Al-Qur'an atau hadis sahih riwayat Bukhari dan Muslim. Sumbernya tertulis di bawah setiap kisah.</p>
<p>Kisah ditulis ulang dengan bahasa anak dan sebagian rincian diringkas. Ajaklah anak membaca terjemahan ayat atau hadis aslinya bersama guru atau ustaz.</p>
<p>Untuk kisah para nabi, ucapkan "alaihissalam" dan untuk Rasulullah ucapkan shalawat. Untuk sahabat ucapkan "radhiyallahu anhu".</p>
<h3>Mengapa pemahaman begitu penting?</h3>
<p>Hampir semua pelajaran bertumpu pada pemahaman bacaan: soal cerita matematika, penjelasan sains, hingga nasihat dan ilmu agama. Asesmen literasi seperti AKM dan PISA pun menilai kemampuan memahami, menafsirkan, dan merenungkan bacaan, bukan sekadar membaca.</p>
<h3>Catatan keluarga</h3>
<p>Luangkan waktu untuk satu kisah hari ini. Setelah membacakannya, coba tanya, “Bagian mana yang paling kamu ingat?” Beri anak waktu untuk menjawab dengan kata-katanya sendiri. Lalu pilih satu kebaikan dari kisah itu yang bisa kalian coba bersama hari ini.</p>`;
  document.querySelector('#info-dialog').showModal();
}
document.querySelector('#guide-button').addEventListener('click', () => openInfo('guide'));
document.querySelector('#about-button').addEventListener('click', () => openInfo('about'));
document.querySelector('#dialog-close').addEventListener('click', () => document.querySelector('#info-dialog').close());
document.querySelector('#info-dialog').addEventListener('click', event => {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
});
main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-record-session')) {
    const selectedStory = stories.find(item => item.id === button.dataset.recordSession);
    if (selectedStory) recordSession(selectedStory);
    return;
  }
  if (button.hasAttribute('data-guide')) return openInfo('guide');
  if (button.hasAttribute('data-filter')) {
    const level = Number(button.dataset.filter);
    filter = filter === level ? 0 : level;
    refreshCards();
    return;
  }
  if (button.hasAttribute('data-reset-search')) { filter = 0; query = ''; const searchInput = main.querySelector('.search'); if (searchInput) searchInput.value = ''; refreshCards(); return; }
  if (button.hasAttribute('data-journey')) { journeyFilter = button.dataset.journey; renderJourney(); return; }
  if (button.hasAttribute('data-bookmark')) {
    const story = stories.find(item => item.id === button.dataset.bookmark);
    if (!story) return;
    const progress = progressFor(story.id);
    progress.bookmarked = !progress.bookmarked;
    save();
    if (activeStory()) renderReader(story);
    else if (location.hash === '#perjalanan') renderJourney();
    else refreshCards();
    toast(progress.bookmarked ? 'Kisah disimpan untuk dibaca lagi.' : 'Kisah dihapus dari simpanan.');
    return;
  }
  const story = activeStory();
  if (!story) return;
  if (button.hasAttribute('data-tab')) {
    progressFor(story.id).started = true;
    save();
    currentTab = Number(button.dataset.tab);
    renderReader(story);
    document.querySelector(`#tab-${currentTab}`).focus({preventScroll:true});
    return;
  }
  if (button.hasAttribute('data-text-size')) { largeText = !largeText; renderReader(story); return; }
  if (button.hasAttribute('data-read')) { progressFor(story.id).read = true; progressFor(story.id).started = true; save(); renderReader(story); toast('Kisah ditandai sudah dibaca.'); return; }
  if (button.hasAttribute('data-complete')) {
    completeStory(story);
  }
});
main.addEventListener('input', event => {
  if (event.target.hasAttribute('data-session-field')) { saveSessionInput(event.target); return; }
  if (event.target.matches('.search')) { query = event.target.value; refreshCards(); return; }
  const story = activeStory();
  if (!story) return;
  progressFor(story.id).started = true;
  if (event.target.hasAttribute('data-answer')) progressFor(story.id).answers[event.target.dataset.answer] = event.target.value;
  else if (event.target.hasAttribute('data-reflection')) progressFor(story.id).reflection = event.target.value;
  else return;
  save();
});
main.addEventListener('change', event => {
  if (event.target.hasAttribute('data-session-field')) { saveSessionInput(event.target); return; }
  const story = activeStory();
  if (story && event.target.hasAttribute('data-practice')) { progressFor(story.id).started = true; progressFor(story.id).practiced = event.target.checked; save(); }
});
main.addEventListener('keydown', event => {
  if (!event.target.matches('[role=tab]') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  currentTab = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (currentTab + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
  const story = activeStory();
  progressFor(story.id).started = true;
  save();
  renderReader(story);
  document.querySelector(`#tab-${currentTab}`).focus();
});
document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
window.addEventListener('hashchange', route);
fetch('stories.json').then(response => {
  if (!response.ok) throw new Error('Materi belum tersedia');
  return response.json();
}).then(data => {
  stories = data;
  loadState();
  route();
}).catch(() => {
  main.innerHTML = '<div class="empty"><h1>Kisah belum berhasil dimuat.</h1><p>Periksa koneksi, lalu coba buka lagi.</p><button class="primary" id="reload-button">Coba lagi</button></div>';
  document.querySelector('#reload-button').addEventListener('click', () => location.reload());
});
