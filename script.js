/* ================================================================
   VELTRIX IDE — script.js  v3.0
   Handles: Theme switching · Auth · Mobile menu · IDE logic
   ================================================================ */

'use strict';

// ================================================================
// 1. THEME SYSTEM
// ================================================================
const THEMES = [
  { id: 'aquatic', label: 'Aquatic',  color: '#14b8a6' },
  { id: 'dark',    label: 'Dark',     color: '#8b5cf6' },
  { id: 'light',   label: 'Light',    color: '#0d9488' },
  { id: 'neon',    label: 'Neon',     color: '#39ff14' },
];

function initTheme() {
  const saved = localStorage.getItem('veltrix_theme') || 'aquatic';
  applyTheme(saved);
  buildThemeDropdown();

  const btn = document.getElementById('theme-btn');
  const dd  = document.getElementById('theme-dd');
  if (!btn || !dd) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = dd.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', () => {
    dd.classList.remove('open');
    btn && btn.setAttribute('aria-expanded', 'false');
  });
}

function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('veltrix_theme', id);
  // Update active state in dropdown
  document.querySelectorAll('.t-item').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === id);
  });
  // Update button label
  const t = THEMES.find(t => t.id === id);
  const lbl = document.querySelector('.t-label');
  if (lbl && t) lbl.textContent = t.label;
}

function buildThemeDropdown() {
  const dd = document.getElementById('theme-dd');
  if (!dd) return;
  const cur = document.documentElement.getAttribute('data-theme') || 'aquatic';
  dd.innerHTML = THEMES.map(t => `
    <div class="t-item${t.id === cur ? ' active' : ''}" role="option" aria-selected="${t.id === cur}" data-theme="${t.id}" tabindex="0">
      <span class="t-dot" style="color:${t.color};background:${t.color}"></span>
      ${t.label}
    </div>`).join('');

  dd.querySelectorAll('.t-item').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      applyTheme(el.dataset.theme);
      dd.classList.remove('open');
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        applyTheme(el.dataset.theme);
        dd.classList.remove('open');
      }
    });
  });
}

// ================================================================
// 2. MOBILE HAMBURGER MENU
// ================================================================
function initHamburger() {
  const ham    = document.getElementById('nav-ham');
  const drawer = document.getElementById('nav-drawer');
  if (!ham || !drawer) return;

  function setOpen(state) {
    drawer.classList.toggle('open', state);
    ham.classList.toggle('open', state);
    ham.setAttribute('aria-expanded', String(state));
    drawer.setAttribute('aria-hidden', String(!state));
  }

  ham.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(!drawer.classList.contains('open'));
  });

  document.addEventListener('click', e => {
    if (!drawer.contains(e.target) && e.target !== ham) setOpen(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
  });

  // Close drawer when a link is clicked
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setOpen(false));
  });
}

// ================================================================
// 3. MODAL SYSTEM
// ================================================================
function initModals() {
  // Open via data-modal attr
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-modal]');
    if (trigger) {
      e.preventDefault();
      openModal(trigger.dataset.modal);
    }
    // Close on overlay click
    if (e.target.classList.contains('modal')) {
      closeAllModals();
    }
    // Close button
    if (e.target.classList.contains('modal-x') || e.target.closest('.modal-x')) {
      closeAllModals();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });
}

function openModal(id) {
  closeAllModals();
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    const first = m.querySelector('input,textarea,button');
    if (first) setTimeout(() => first.focus(), 60);
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
}

// ================================================================
// 4. AUTH SYSTEM
// ================================================================
function initAuth() {
  // Sign up
  const formSignup = document.getElementById('form-signup');
  if (formSignup) {
    formSignup.addEventListener('submit', e => {
      e.preventDefault();
      const d        = new FormData(formSignup);
      const fullname = (d.get('fullname') || '').trim();
      const username = (d.get('username') || '').trim().toLowerCase().replace(/\s/g, '_');
      const email    = (d.get('email')    || '').trim();
      const password = d.get('password')  || '';
      const errEl    = document.getElementById('err-signup');

      if (!fullname || !username || !email || !password) {
        showFormError(errEl, 'Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        showFormError(errEl, 'Password must be at least 6 characters.');
        return;
      }
      const existing = JSON.parse(localStorage.getItem('veltrix_users') || '{}');
      if (existing[username]) {
        showFormError(errEl, 'Username already taken. Choose another.');
        return;
      }
      existing[username] = { fullname, email, password: btoa(password) };
      localStorage.setItem('veltrix_users', JSON.stringify(existing));
      setSession(username, fullname);
      closeAllModals();
      formSignup.reset();
      hideFormError(errEl);
      showToast('Welcome to Veltrix IDE, ' + fullname + '! 🎉');
    });
  }

  // Login
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', e => {
      e.preventDefault();
      const d        = new FormData(formLogin);
      const username = (d.get('username') || '').trim().toLowerCase();
      const password = d.get('password')  || '';
      const errEl    = document.getElementById('err-login');

      if (!username || !password) {
        showFormError(errEl, 'Please fill in both fields.');
        return;
      }
      const users = JSON.parse(localStorage.getItem('veltrix_users') || '{}');
      const user  = users[username];
      if (!user || atob(user.password) !== password) {
        showFormError(errEl, 'Invalid username or password.');
        return;
      }
      setSession(username, user.fullname);
      closeAllModals();
      formLogin.reset();
      hideFormError(errEl);
      showToast('Welcome back, ' + user.fullname + '! 👋');
    });
  }

  // Logout
  document.addEventListener('click', e => {
    if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
      clearSession();
      showToast('Logged out. See you soon!');
    }
  });

  syncAuthUI();
}

function setSession(username, fullname) {
  localStorage.setItem('veltrix_session', JSON.stringify({ username, fullname }));
  syncAuthUI();
}

function clearSession() {
  localStorage.removeItem('veltrix_session');
  syncAuthUI();
}

function getSession() {
  try { return JSON.parse(localStorage.getItem('veltrix_session')); } catch { return null; }
}

function syncAuthUI() {
  const s       = getSession();
  const authGrp = document.getElementById('nav-auth');
  const userGrp = document.getElementById('nav-user');
  const avatar  = document.getElementById('nav-avatar');
  const uname   = document.getElementById('nav-uname');

  if (authGrp) authGrp.style.display = s ? 'none'  : 'flex';
  if (userGrp) userGrp.style.display = s ? 'flex'  : 'none';
  if (avatar && s) avatar.textContent = s.fullname.charAt(0).toUpperCase();
  if (uname  && s) uname.textContent  = s.username;

  // Lab gate / IDE visibility
  const gate    = document.getElementById('lab-gate');
  const ideWrap = document.getElementById('ide-wrap');
  if (gate && ideWrap) {
    if (s) {
      gate.classList.remove('show');
      ideWrap.classList.add('show');
      if (typeof renderFileTree === 'function') renderFileTree();
    } else {
      gate.classList.add('show');
      ideWrap.classList.remove('show');
    }
  }
}

function showFormError(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }
function hideFormError(el) { if (el) el.style.display = 'none'; }

// ================================================================
// 5. TOAST
// ================================================================
let toastTimer = null;
function showToast(msg, dur = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// ================================================================
// 6. LAB / IDE LOGIC
// ================================================================

// ── File system stored in localStorage ──
const FS_KEY  = 'veltrix_files';
const CUR_KEY = 'veltrix_cur_file';

const DEFAULT_FILES = {
  'index.html': {
    type: 'file', lang: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Hello, Veltrix IDE!</h1>
    <p>Start editing to see your changes live.</p>
    <button id="btn">Click me</button>
  </div>
  <script src="script.js"><\/script>
</body>
</html>`
  },
  'style.css': {
    type: 'file', lang: 'css',
    content: `/* Styles */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.container {
  text-align: center;
  padding: 40px 24px;
}

h1 {
  font-size: clamp(28px, 5vw, 56px);
  font-weight: 800;
  background: linear-gradient(135deg, #14b8a6, #0ea5e9);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
}

p {
  font-size: 16px;
  color: #94a3b8;
  margin-bottom: 28px;
}

button {
  padding: 12px 28px;
  background: linear-gradient(135deg, #14b8a6, #0ea5e9);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: filter .2s, transform .2s;
}

button:hover { filter: brightness(1.12); transform: translateY(-1px); }`
  },
  'script.js': {
    type: 'file', lang: 'js',
    content: `// JavaScript
const btn = document.getElementById('btn');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  btn.textContent = 'Clicked ' + count + ' time' + (count !== 1 ? 's' : '') + '!';
});

console.log('Veltrix IDE — ready!');`
  }
};

function getFS() {
  try {
    const s = getSession();
    if (!s) return {};
    const all = JSON.parse(localStorage.getItem(FS_KEY) || '{}');
    return all[s.username] || JSON.parse(JSON.stringify(DEFAULT_FILES));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_FILES)); }
}

function saveFS(fs) {
  const s = getSession();
  if (!s) return;
  const all = JSON.parse(localStorage.getItem(FS_KEY) || '{}');
  all[s.username] = fs;
  localStorage.setItem(FS_KEY, JSON.stringify(all));
}

function getCurFile() {
  const s = getSession();
  if (!s) return null;
  const cur = JSON.parse(localStorage.getItem(CUR_KEY) || '{}');
  return cur[s.username] || null;
}

function saveCurFile(name) {
  const s = getSession();
  if (!s) return;
  const cur = JSON.parse(localStorage.getItem(CUR_KEY) || '{}');
  cur[s.username] = name;
  localStorage.setItem(CUR_KEY, JSON.stringify(cur));
}

// ── Icons ──
function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = { html:'🌐', htm:'🌐', css:'🎨', js:'⚡', ts:'📘', json:'📋', md:'📝', txt:'📄', svg:'🖼️', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', webp:'🖼️' };
  return icons[ext] || '📄';
}

// ── Render file tree ──
function renderFileTree() {
  const tree    = document.getElementById('file-tree');
  const tabsEl  = document.getElementById('ide-tabs');
  if (!tree) return;

  const fs     = getFS();
  const cur    = getCurFile();
  const names  = Object.keys(fs).filter(n => fs[n].type === 'file').sort();

  if (names.length === 0) {
    tree.innerHTML = '<div class="tree-empty">No files yet.</div>';
    return;
  }

  tree.innerHTML = names.map(name => `
    <div class="tree-row${name === cur ? ' active' : ''}" data-file="${name}" role="treeitem" tabindex="0" aria-selected="${name === cur}">
      <span class="tree-ic">${fileIcon(name)}</span>
      <span class="tree-nm">${name}</span>
      <button class="tree-dot" data-ctx="${name}" aria-label="Options for ${name}" tabindex="-1">
        <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
        </svg>
      </button>
    </div>`).join('');

  // Click to open
  tree.querySelectorAll('.tree-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.tree-dot')) return;
      openFile(row.dataset.file);
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFile(row.dataset.file); }
    });
  });

  // Context menu dots
  tree.querySelectorAll('.tree-dot').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showCtxMenu(btn.dataset.ctx, e.clientX, e.clientY);
    });
  });

  // Rebuild tab bar
  renderTabs();
}

// ── Open file in editor ──
function openFile(name) {
  const fs = getFS();
  if (!fs[name]) return;
  saveCurFile(name);

  const editorEl  = document.getElementById('ide-editor');
  const imgPrevEl = document.getElementById('img-prev');
  const imgEl     = document.getElementById('img-prev-el');
  const langEl    = document.getElementById('status-lang');
  const fileEl    = document.getElementById('status-file');

  const isImg = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);

  if (editorEl)  { editorEl.style.display = isImg ? 'none' : 'flex'; editorEl.value = isImg ? '' : (fs[name].content || ''); }
  if (imgPrevEl) imgPrevEl.classList.toggle('show', isImg);
  if (imgEl && isImg) imgEl.src = fs[name].content || '';

  if (langEl) langEl.textContent = (fs[name].lang || '').toUpperCase() || '—';
  if (fileEl) fileEl.textContent = name;

  renderFileTree();
  renderTabs();
  if (!isImg) updatePreview();
}

// ── Render tab bar ──
function renderTabs() {
  const tabsEl = document.getElementById('ide-tabs');
  if (!tabsEl) return;
  const fs  = getFS();
  const cur = getCurFile();
  const names = Object.keys(fs).filter(n => fs[n].type === 'file').sort();

  if (names.length === 0) {
    tabsEl.innerHTML = '<span class="tabs-empty">Open a file to start editing</span>';
    return;
  }

  tabsEl.innerHTML = names.map(n => `
    <button class="ide-tab${n === cur ? ' active' : ''}" data-tab="${n}" role="tab" aria-selected="${n === cur}">
      <span class="tab-nm">${n}</span>
      <span class="tab-x" data-close="${n}" aria-label="Close ${n}">&times;</span>
    </button>`).join('');

  tabsEl.querySelectorAll('.ide-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      if (e.target.closest('.tab-x')) return;
      openFile(tab.dataset.tab);
    });
  });

  tabsEl.querySelectorAll('.tab-x').forEach(x => {
    x.addEventListener('click', e => {
      e.stopPropagation();
      closeTab(x.dataset.close);
    });
  });
}

function closeTab(name) {
  const fs = getFS();
  delete fs[name];
  saveFS(fs);
  const remaining = Object.keys(fs).filter(n => fs[n].type === 'file');
  saveCurFile(remaining[0] || null);
  if (remaining[0]) openFile(remaining[0]);
  else {
    renderFileTree();
    renderTabs();
    const editorEl = document.getElementById('ide-editor');
    if (editorEl) editorEl.value = '';
    const langEl = document.getElementById('status-lang');
    const fileEl = document.getElementById('status-file');
    if (langEl) langEl.textContent = '—';
    if (fileEl) fileEl.textContent = '—';
  }
}

// ── Live Preview ──
let previewTimer = null;
function updatePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(_buildPreview, 700);
}

function _buildPreview() {
  const frame  = document.getElementById('preview-frame');
  const fsModal= document.getElementById('fs-modal');
  const fsFrame= document.getElementById('fs-frame');
  if (!frame) return;

  const fs  = getFS();
  const cur = getCurFile();

  // Build HTML content
  let html = '';
  const htmlNames = Object.keys(fs).filter(n => n.match(/\.html?$/i));
  const mainHtml  = htmlNames.includes('index.html') ? 'index.html' : (htmlNames[0] || null);

  if (mainHtml && fs[mainHtml]) {
    html = fs[mainHtml].content || '';
    // Inject CSS files
    const cssFiles = Object.keys(fs).filter(n => n.endsWith('.css'));
    if (cssFiles.length) {
      const cssAll = cssFiles.map(n => fs[n].content || '').join('\n');
      html = html.replace('</head>', `<style>\n${cssAll}\n</style>\n</head>`);
    }
    // Inject JS files (excluding script.js from default if already referenced)
    const jsFiles = Object.keys(fs).filter(n => n.endsWith('.js'));
    if (jsFiles.length) {
      const jsAll = jsFiles.map(n => fs[n].content || '').join('\n');
      html = html.replace('</body>', `<script>\n${jsAll}\n<\/script>\n</body>`);
    }
  } else if (cur && fs[cur]) {
    // Non-HTML file — wrap in minimal page
    const lang = fs[cur].lang || 'text';
    if (lang === 'css') {
      html = `<html><head><style>${fs[cur].content}</style></head><body><p style="padding:20px;font-family:sans-serif;color:#666">CSS preview — add an index.html to see layout.</p></body></html>`;
    } else if (lang === 'js') {
      html = `<html><head></head><body><p id="out" style="padding:20px;font-family:sans-serif"></p><script>try{${fs[cur].content}}catch(e){document.getElementById('out').textContent='Error: '+e.message;}<\/script></body></html>`;
    } else {
      html = `<html><body><pre style="padding:20px;font-family:monospace;white-space:pre-wrap">${escHtml(fs[cur].content || '')}</pre></body></html>`;
    }
  }

  frame.srcdoc = html;
  // Sync fullscreen iframe if open
  if (fsModal && fsModal.classList.contains('open') && fsFrame) {
    fsFrame.srcdoc = html;
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Context menu ──
let ctxMenu = null;
function showCtxMenu(filename, x, y) {
  closeCtxMenu();
  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  ctxMenu.innerHTML = `
    <button class="ctx-item" data-action="open" data-file="${filename}">
      <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Open
    </button>
    <button class="ctx-item" data-action="rename" data-file="${filename}">
      <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Rename
    </button>
    <button class="ctx-item" data-action="duplicate" data-file="${filename}">
      <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      Duplicate
    </button>
    <div class="ctx-sep"></div>
    <button class="ctx-item danger" data-action="delete" data-file="${filename}">
      <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      Delete
    </button>`;

  // Position
  ctxMenu.style.cssText = `left:${Math.min(x, window.innerWidth-175)}px;top:${Math.min(y, window.innerHeight-180)}px;`;
  document.body.appendChild(ctxMenu);

  ctxMenu.querySelectorAll('.ctx-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const file   = btn.dataset.file;
      closeCtxMenu();
      if      (action === 'open')      openFile(file);
      else if (action === 'rename')    renameFile(file);
      else if (action === 'duplicate') duplicateFile(file);
      else if (action === 'delete')    deleteFile(file);
    });
  });

  setTimeout(() => document.addEventListener('click', closeCtxMenu, { once: true }), 50);
}
function closeCtxMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }

// ── CRUD ──
function renameFile(name) {
  const newName = prompt('Rename file:', name);
  if (!newName || newName === name) return;
  const fs = getFS();
  if (!fs[name]) return;
  if (fs[newName]) { showToast('A file with that name already exists.'); return; }
  fs[newName] = { ...fs[name], lang: detectLang(newName) };
  delete fs[name];
  saveFS(fs);
  if (getCurFile() === name) saveCurFile(newName);
  renderFileTree();
  openFile(newName);
}

function duplicateFile(name) {
  const fs   = getFS();
  const ext  = name.includes('.') ? '.' + name.split('.').pop() : '';
  const base = name.replace(/\.[^.]+$/, '');
  let copy   = base + '_copy' + ext;
  let n = 2;
  while (fs[copy]) copy = base + '_copy' + n++ + ext;
  fs[copy] = { ...JSON.parse(JSON.stringify(fs[name])) };
  saveFS(fs);
  renderFileTree();
  showToast('Duplicated as ' + copy);
}

function deleteFile(name) {
  if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
  const fs = getFS();
  delete fs[name];
  saveFS(fs);
  if (getCurFile() === name) {
    const rem = Object.keys(fs).filter(n => fs[n].type === 'file');
    saveCurFile(rem[0] || null);
    if (rem[0]) openFile(rem[0]); else renderFileTree();
  } else {
    renderFileTree();
  }
  showToast(name + ' deleted.');
}

function detectLang(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { html:'html', htm:'html', css:'css', js:'js', ts:'ts', json:'json', md:'md', txt:'txt', svg:'svg' };
  return map[ext] || 'text';
}

// ── New file / folder ──
function initLabButtons() {
  const btnNewFile   = document.getElementById('btn-new-file');
  const btnNewFolder = document.getElementById('btn-new-folder');
  const btnUpload    = document.getElementById('btn-upload');
  const uploadInput  = document.getElementById('upload-input');
  const btnRefresh   = document.getElementById('btn-refresh');
  const btnFs        = document.getElementById('btn-fullscreen');
  const fsModal      = document.getElementById('fs-modal');
  const fsClose      = document.getElementById('fs-close');
  const fsRefresh    = document.getElementById('fs-refresh');
  const fsFrame      = document.getElementById('fs-frame');

  if (btnNewFile) {
    btnNewFile.addEventListener('click', () => {
      const name = prompt('New file name:', 'newfile.html');
      if (!name) return;
      const fs = getFS();
      if (fs[name]) { showToast('File already exists.'); return; }
      fs[name] = { type: 'file', lang: detectLang(name), content: '' };
      saveFS(fs);
      renderFileTree();
      openFile(name);
    });
  }

  if (btnNewFolder) {
    btnNewFolder.addEventListener('click', () => {
      showToast('Folders are coming in v4.0!');
    });
  }

  if (btnUpload && uploadInput) {
    btnUpload.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => {
      Array.from(uploadInput.files).forEach(file => {
        const reader = new FileReader();
        const isImg  = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name);
        reader.onload = ev => {
          const fs = getFS();
          fs[file.name] = {
            type: 'file',
            lang: isImg ? 'image' : detectLang(file.name),
            content: ev.target.result
          };
          saveFS(fs);
          renderFileTree();
          showToast(file.name + ' uploaded.');
        };
        if (isImg) reader.readAsDataURL(file);
        else       reader.readAsText(file);
      });
      uploadInput.value = '';
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => _buildPreview());
  }

  // Fullscreen
  if (btnFs && fsModal) {
    btnFs.addEventListener('click', () => {
      fsModal.classList.add('open');
      _buildPreview();
    });
  }
  if (fsClose && fsModal) {
    fsClose.addEventListener('click', () => fsModal.classList.remove('open'));
  }
  if (fsRefresh) {
    fsRefresh.addEventListener('click', () => _buildPreview());
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && fsModal && fsModal.classList.contains('open')) {
      fsModal.classList.remove('open');
    }
  });
}

// ── Editor input → debounced preview ──
function initEditorInput() {
  const editor = document.getElementById('ide-editor');
  if (!editor) return;

  editor.addEventListener('input', () => {
    const cur = getCurFile();
    if (!cur) return;
    const fs = getFS();
    if (fs[cur]) {
      fs[cur].content = editor.value;
      saveFS(fs);
      updatePreview();
    }
  });

  // Tab key inserts 2 spaces
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      const v = editor.value;
      editor.value = v.substring(0, s) + '  ' + v.substring(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = s + 2;
      // Trigger input for save
      editor.dispatchEvent(new Event('input'));
    }
  });
}

// ================================================================
// 7. INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHamburger();
  initModals();
  initAuth();

  // Lab-specific init
  if (document.getElementById('ide-wrap')) {
    initLabButtons();
    initEditorInput();
    const s = getSession();
    if (s) {
      const cur = getCurFile();
      if (cur) openFile(cur);
      else {
        renderFileTree();
        const names = Object.keys(getFS()).filter(n => getFS()[n].type === 'file');
        if (names[0]) openFile(names[0]);
      }
    }
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
 
