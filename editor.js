(function () {
  'use strict';

  var STORAGE_KEY = 'vx_projects';
  var state = {
    folderId:    null,
    projectName: null,
    activeFile:  'index.html'
  };
  var toastTimer   = null;
  var previewTimer = null;

  /* ── Helpers ── */
  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { folders: [] };
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.folders)) return { folders: [] };
      return d;
    } catch (e) { return { folders: [] }; }
  }

  function saveData(d) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
    catch (e) { alert('Save failed — localStorage may be full.'); }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function getFolder(data, id) {
    return data.folders.find(function (f) { return f.id === id; }) || null;
  }

  function getProject(folder, name) {
    return folder.projects.find(function (p) { return p.name === name; }) || null;
  }

  /* ── URL params ── */
  function getParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      folderId:    params.get('folder')  || '',
      projectName: params.get('project') || ''
    };
  }

  /* ── Flush textarea → localStorage ── */
  function flush() {
    if (!state.folderId || !state.projectName) return;
    var data    = loadData();
    var folder  = getFolder(data, state.folderId);
    if (!folder) return;
    var project = getProject(folder, state.projectName);
    if (!project) return;
    var ta = document.getElementById('codeArea');
    if (!ta) return;
    project.files[state.activeFile] = ta.value;
    saveData(data);
  }

  /* ── Load file into textarea ── */
  function loadFile(filename) {
    flush();
    state.activeFile = filename;

    var data    = loadData();
    var folder  = getFolder(data, state.folderId);
    var project = folder ? getProject(folder, state.projectName) : null;
    var ta      = document.getElementById('codeArea');
    if (!ta) return;

    if (!project) { ta.value = ''; ta.disabled = true; return; }
    ta.disabled  = false;
    ta.value     = project.files[filename] || '';
    ta.scrollTop = 0;

    document.querySelectorAll('.file-tab').forEach(function (btn) {
      var active = btn.getAttribute('data-file') === filename;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    var labels = { 'index.html': 'HTML', 'style.css': 'CSS', 'script.js': 'JavaScript' };
    var sbLang = document.getElementById('sbLang');
    if (sbLang) sbLang.textContent = labels[filename] || filename;

    updateLines();
    schedulePreview();
  }

  /* ── Build preview HTML ── */
  function getPreviewHTML() {
    flush();
    var data    = loadData();
    var folder  = getFolder(data, state.folderId);
    var project = folder ? getProject(folder, state.projectName) : null;
    if (!project) return '<body style="font:14px/2 sans-serif;padding:40px;color:#999;background:#fff;text-align:center"><p style="margin-top:100px;opacity:.5">No project loaded.</p></body>';

    var html = project.files['index.html'] || '';
    var css  = project.files['style.css']  || '';
    var js   = project.files['script.js']  || '';

    if (css) {
      var ct = '<style>\n' + css + '\n</style>';
      html = html.indexOf('</head>') !== -1
        ? html.replace('</head>', ct + '\n</head>')
        : ct + '\n' + html;
    }
    if (js) {
      var jt = '<script>try{\n' + js + '\n}catch(e){console.error(e);}<\/script>';
      html = html.indexOf('</body>') !== -1
        ? html.replace('</body>', jt + '\n</body>')
        : html + '\n' + jt;
    }
    return html;
  }

  /* ── Live preview ── */
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(buildPreview, 600);
  }

  function buildPreview() {
    var frame = document.getElementById('previewFrame');
    if (!frame) return;
    frame.srcdoc = getPreviewHTML();
  }

  /* ── Line counter ── */
  function updateLines() {
    var ta = document.getElementById('codeArea');
    var el = document.getElementById('sbLines');
    if (!ta || !el) return;
    var n = ta.value.split('\n').length;
    el.textContent = n + (n === 1 ? ' line' : ' lines');
  }

  /* ── Save ── */
  function save() {
    flush();
    toast('✓ Saved');
    var ss = document.getElementById('saveStatus');
    if (ss) ss.textContent = 'All saved';
  }

  /* ── Fullscreen preview ── */
  function openFullscreen() {
    flush();
    var modal   = document.getElementById('fsModal');
    var fsFrame = document.getElementById('fsFrame');
    var fsTitle = document.getElementById('fsTitle');
    if (!modal || !fsFrame) return;

    if (fsTitle) {
      fsTitle.textContent = (state.projectName || 'Preview') + ' — Live Preview';
    }
    fsFrame.srcdoc = getPreviewHTML();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeFullscreen() {
    var modal   = document.getElementById('fsModal');
    var fsFrame = document.getElementById('fsFrame');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (fsFrame) { fsFrame.srcdoc = ''; }
  }

  /* ── Render sidebar tree ── */
  function renderTree() {
    var treeEl = document.getElementById('ideTree');
    if (!treeEl) return;
    var data = loadData();
    if (!data.folders.length) { treeEl.innerHTML = ''; return; }

    var html = '';
    data.folders.forEach(function (f) {
      html += '<div class="tree-folder">';
      html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="#d4a843"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>';
      html += esc(f.name);
      html += '</div>';
      f.projects.forEach(function (p) {
        var active = (f.id === state.folderId && p.name === state.projectName);
        html += '<div class="tree-project ' + (active ? 'active' : '') + '" data-fid="' + esc(f.id) + '" data-name="' + esc(p.name) + '" tabindex="0">';
        html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        html += esc(p.name);
        html += '</div>';
      });
    });
    treeEl.innerHTML = html;

    treeEl.querySelectorAll('.tree-project').forEach(function (row) {
      function open() {
        flush();
        state.folderId    = row.getAttribute('data-fid');
        state.projectName = row.getAttribute('data-name');
        initEditor();
      }
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  /* ── Init editor ── */
  function initEditor() {
    var data    = loadData();
    var folder  = getFolder(data, state.folderId);
    var project = folder ? getProject(folder, state.projectName) : null;

    var bcFolder  = document.getElementById('bcFolder');
    var bcProject = document.getElementById('bcProject');
    if (bcFolder)  bcFolder.textContent  = folder  ? folder.name  : '';
    if (bcProject) bcProject.textContent = project ? project.name : 'Not found';

    if (!project) {
      alert('Project not found. It may have been deleted.');
      window.location.href = './lab.html';
      return;
    }

    renderTree();
    loadFile('index.html');
  }

  /* ── Boot ── */
  document.addEventListener('DOMContentLoaded', function () {
    var params = getParams();
    if (!params.folderId || !params.projectName) {
      alert('No project specified. Redirecting to projects page.');
      window.location.href = './lab.html';
      return;
    }

    state.folderId    = params.folderId;
    state.projectName = decodeURIComponent(params.projectName);

    initEditor();

    /* File tabs */
    document.querySelectorAll('.file-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadFile(btn.getAttribute('data-file'));
      });
    });

    /* Code area input */
    var ta = document.getElementById('codeArea');
    if (ta) {
      ta.addEventListener('input', function () {
        flush();
        updateLines();
        schedulePreview();
        var ss = document.getElementById('saveStatus');
        if (ss) ss.textContent = 'Unsaved changes';
      });
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          var s = ta.selectionStart, end = ta.selectionEnd;
          ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(end);
          ta.selectionStart = ta.selectionEnd = s + 2;
          flush();
          schedulePreview();
        }
      });
    }

    /* Save button */
    var btnSave = document.getElementById('btnSave');
    if (btnSave) btnSave.addEventListener('click', save);

    /* Ctrl+S / Cmd+S */
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { closeFullscreen(); }
    });

    /* Refresh */
    var btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) btnRefresh.addEventListener('click', function () { flush(); buildPreview(); });

    /* Fullscreen open */
    var btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) btnFullscreen.addEventListener('click', openFullscreen);

    /* Fullscreen close */
    var fsClose = document.getElementById('fsClose');
    if (fsClose) fsClose.addEventListener('click', closeFullscreen);

    /* Fullscreen refresh */
    var fsRefresh = document.getElementById('fsRefresh');
    if (fsRefresh) fsRefresh.addEventListener('click', function () {
      var fsFrame = document.getElementById('fsFrame');
      if (fsFrame) fsFrame.srcdoc = getPreviewHTML();
    });

    /* Click outside modal content = close (click on the overlay itself) */
    var fsModal = document.getElementById('fsModal');
    if (fsModal) {
      fsModal.addEventListener('click', function (e) {
        if (e.target === fsModal) closeFullscreen();
      });
    }
  });

}());
