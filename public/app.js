(function () {
  'use strict';

  var CATS = ['Schedule', 'Scope', 'People', 'Technical', 'Budget', 'External', 'Other'];
  var STATUSES = ['Open', 'Mitigating', 'Closed'];
  var LIK = [
    ['Rare', 'under 10% chance'],
    ['Unlikely', '10 to 30% chance'],
    ['Possible', '30 to 50% chance'],
    ['Likely', '50 to 80% chance'],
    ['Almost certain', 'over 80% chance']
  ];
  var IMP = [
    ['Negligible', 'absorbed without anyone noticing'],
    ['Minor', 'a few days lost or a small extra cost'],
    ['Moderate', 'a milestone slips or scope is cut'],
    ['Major', 'deadline, grade or budget badly hit'],
    ['Severe', 'the project cannot be delivered']
  ];
  var BAND_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  var BAND_RANGE = { critical: '15-25', high: '10-14', medium: '5-9', low: '1-4' };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- scoring ---------- */
  function score(r) { return r.l * r.i; }
  function band(s) { return s >= 15 ? 'critical' : s >= 10 ? 'high' : s >= 5 ? 'medium' : 'low'; }
  function cmp(a, b) {
    return (score(b) - score(a)) || (b.i - a.i) || (a.review < b.review ? -1 : a.review > b.review ? 1 : 0) || (a.id < b.id ? -1 : 1);
  }

  /* ---------- dates ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function diffDays(s) { return Math.round((parse(s) - today()) / 86400000); }
  function fmt(s) { return parse(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

  /* ---------- state ---------- */
  var state = { risks: [] };
  var loading = true;
  var loadError = null;
  var filter = { q: '', status: 'all', band: 'all', owner: 'all', sort: 'score', cell: null };
  var editingId = null;
  var pendingDelete = null;

  /* ---------- server API ---------- */
  function api(method, url, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }
  function fail(e) { toast(e.message || 'Something went wrong'); }
  function upsert(r) {
    var i = state.risks.findIndex(function (x) { return x.id === r.id; });
    if (i === -1) state.risks.push(r); else state.risks[i] = r;
  }
  function loadRisks() {
    loading = true; loadError = null; render();
    return api('GET', '/api/risks?today=' + iso(today()))
      .then(function (d) { state.risks = d.risks; })
      .catch(function (e) { loadError = e.message; })
      .then(function () { loading = false; render(); });
  }

  /* ---------- derived ---------- */
  function openRisks() { return state.risks.filter(function (r) { return r.status !== 'Closed'; }); }
  function rankMap() {
    var m = {};
    openRisks().slice().sort(cmp).forEach(function (r, i) { m[r.id] = i + 1; });
    return m;
  }
  function visible() {
    var q = filter.q.trim().toLowerCase();
    var list = state.risks.filter(function (r) {
      if (filter.status !== 'all' && r.status !== filter.status) return false;
      if (filter.band !== 'all' && band(score(r)) !== filter.band) return false;
      if (filter.owner !== 'all' && r.owner !== filter.owner) return false;
      if (filter.cell && (r.l !== filter.cell.l || r.i !== filter.cell.i)) return false;
      if (q && (r.title + ' ' + r.mit + ' ' + r.owner + ' ' + r.cat + ' ' + (r.desc || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    function closedLast(a, b) { return (a.status === 'Closed') - (b.status === 'Closed'); }
    if (filter.sort === 'review') {
      list.sort(function (a, b) { return closedLast(a, b) || (a.review < b.review ? -1 : a.review > b.review ? 1 : 0) || cmp(a, b); });
    } else if (filter.sort === 'owner') {
      list.sort(function (a, b) { return closedLast(a, b) || a.owner.localeCompare(b.owner) || cmp(a, b); });
    } else {
      list.sort(function (a, b) { return closedLast(a, b) || cmp(a, b); });
    }
    return list;
  }

  /* ---------- render ---------- */
  function renderStrip() {
    var open = openRisks();
    var hot = open.filter(function (r) { return score(r) >= 10; }).length;
    var over = open.filter(function (r) { return diffDays(r.review) < 0; }).length;
    var soon = open.filter(function (r) { var d = diffDays(r.review); return d >= 0 && d <= 7; }).length;
    $('strip').innerHTML =
      '<div class="stat"><span class="n">' + open.length + '</span><span class="l">Active risks</span></div>' +
      '<div class="stat' + (hot ? ' hot' : '') + '"><span class="n">' + hot + '</span><span class="l">High or critical (score 10+)</span></div>' +
      '<div class="stat' + (over ? ' warn' : '') + '"><span class="n">' + over + '</span><span class="l">Reviews overdue</span></div>' +
      '<div class="stat"><span class="n">' + soon + '</span><span class="l">Reviews due in 7 days</span></div>';
  }

  function renderMatrix() {
    var counts = {};
    openRisks().forEach(function (r) { var k = r.l + '-' + r.i; counts[k] = (counts[k] || 0) + 1; });
    var h = '<div class="ylab">Impact</div>';
    for (var i = 5; i >= 1; i--) {
      for (var l = 1; l <= 5; l++) {
        var s = l * i, b = band(s), n = counts[l + '-' + i] || 0;
        var active = filter.cell && filter.cell.l === l && filter.cell.i === i;
        h += '<button type="button" class="cell ' + b + (n ? '' : ' empty') + (active ? ' active' : '') + '" data-l="' + l + '" data-i="' + i + '"' +
          ' aria-pressed="' + (active ? 'true' : 'false') + '"' +
          ' aria-label="Likelihood ' + l + ', impact ' + i + ', score ' + s + ', ' + BAND_LABEL[b] + ', ' + n + ' active risk' + (n === 1 ? '' : 's') + '">' +
          '<span class="sc">' + l + '×' + i + '=' + s + '</span><span class="ct">' + n + '</span></button>';
      }
    }
    h += '<div class="xrow">';
    for (var x = 1; x <= 5; x++) h += '<span>' + x + '</span>';
    h += '</div><div class="xtitle">Likelihood</div>';
    $('matrix').innerHTML = h;
  }

  function renderKey() {
    $('bands').innerHTML = ['critical', 'high', 'medium', 'low'].map(function (b) {
      return '<span class="pill ' + b + '"><b>' + BAND_RANGE[b] + '</b> ' + BAND_LABEL[b] + '</span>';
    }).join('');
    $('likKey').innerHTML = LIK.map(function (x, k) { return '<dt>' + (k + 1) + '</dt><dd><b>' + x[0] + '</b>, ' + x[1] + '</dd>'; }).join('');
    $('impKey').innerHTML = IMP.map(function (x, k) { return '<dt>' + (k + 1) + '</dt><dd><b>' + x[0] + '</b>, ' + x[1] + '</dd>'; }).join('');
  }

  function renderOwnerFilter() {
    var owners = Array.from(new Set(state.risks.map(function (r) { return r.owner; }))).sort();
    if (filter.owner !== 'all' && owners.indexOf(filter.owner) === -1) filter.owner = 'all';
    $('fOwner').innerHTML = '<option value="all">All owners</option>' + owners.map(function (o) {
      return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
    }).join('');
    $('fOwner').value = filter.owner;
    $('ownerList').innerHTML = owners.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('');
  }

  function renderChips() {
    var el = $('chips');
    if (!filter.cell) { el.hidden = true; el.innerHTML = ''; return; }
    var s = filter.cell.l * filter.cell.i;
    el.hidden = false;
    el.innerHTML = '<span class="chip">Likelihood ' + filter.cell.l + ' × Impact ' + filter.cell.i + ' = ' + s +
      '<button type="button" id="chipX" aria-label="Clear matrix filter">×</button></span>';
  }

  function reviewCell(r) {
    var h = '<div class="mono">' + fmt(r.review) + '</div>';
    if (r.status === 'Closed') return h;
    var d = diffDays(r.review);
    if (d < 0) h += '<span class="flag over">' + (-d) + (d === -1 ? ' day' : ' days') + ' overdue</span>';
    else if (d === 0) h += '<span class="flag soon">Due today</span>';
    else if (d <= 7) h += '<span class="flag soon">Due in ' + d + (d === 1 ? ' day' : ' days') + '</span>';
    return h;
  }

  function rowHTML(r, rank) {
    var s = score(r), b = band(s), closed = r.status === 'Closed';
    var acts;
    if (pendingDelete === r.id) {
      acts = '<button class="btn small danger" type="button" data-act="delyes" data-id="' + r.id + '">Confirm delete</button>' +
             '<button class="btn small" type="button" data-act="delno" data-id="' + r.id + '">Keep</button>';
    } else {
      acts = (closed ? '' : '<button class="btn small" type="button" data-act="reviewed" data-id="' + r.id + '" title="Set the next review for 14 days from today">Reviewed</button>') +
             '<button class="btn small" type="button" data-act="edit" data-id="' + r.id + '">Edit</button>' +
             '<button class="btn small" type="button" data-act="del" data-id="' + r.id + '">Delete</button>';
    }
    var opts = STATUSES.map(function (st) { return '<option' + (st === r.status ? ' selected' : '') + '>' + st + '</option>'; }).join('');
    return '<tr class="' + (closed ? 'closed' : '') + '">' +
      '<td class="rank">' + (closed ? '–' : rank) + '</td>' +
      '<td class="risk"><div class="rt">' + esc(r.title) + (r.example ? ' <span class="hint">(example)</span>' : '') + '</div>' +
        '<div class="cat">' + esc(r.id) + ' · ' + esc(r.cat) + '</div>' +
        (r.desc ? '<div class="desc">' + esc(r.desc) + '</div>' : '') + '</td>' +
      '<td class="num">' + r.l + '</td><td class="num">' + r.i + '</td>' +
      '<td><span class="pill ' + b + '"><b>' + s + '</b> ' + BAND_LABEL[b] + '</span></td>' +
      '<td class="mit">' + esc(r.mit) + '</td>' +
      '<td>' + esc(r.owner) + '</td>' +
      '<td class="rev">' + reviewCell(r) + '</td>' +
      '<td class="status"><select class="statussel" data-id="' + r.id + '" aria-label="Status for ' + esc(r.title) + '">' + opts + '</select></td>' +
      '<td class="actions">' + acts + '</td></tr>';
  }

  function renderTable() {
    var ranks = rankMap();
    var list = visible();
    var body = $('rows');
    if (loading) {
      body.innerHTML = '<tr><td colspan="10"><div class="empty-state">Loading risks from the database...</div></td></tr>';
      $('regCount').textContent = ''; $('note').textContent = '';
      return;
    }
    if (loadError) {
      body.innerHTML = '<tr><td colspan="10"><div class="empty-state">Could not load risks: ' + esc(loadError) +
        '<br>Check MONGODB_URI in your .env file and that the server is running.<br><button class="btn" type="button" data-act="retry">Try again</button></div></td></tr>';
      $('regCount').textContent = ''; $('note').textContent = '';
      return;
    }
    if (!state.risks.length) {
      body.innerHTML = '<tr><td colspan="10"><div class="empty-state">No risks yet. Add the first one and it will be scored straight away.<br><button class="btn" type="button" data-act="seed">Load example risks</button></div></td></tr>';
    } else if (!list.length) {
      body.innerHTML = '<tr><td colspan="10"><div class="empty-state">No risks match these filters.<br><button class="btn" type="button" data-act="reset">Clear filters</button></div></td></tr>';
    } else {
      body.innerHTML = list.map(function (r) { return rowHTML(r, ranks[r.id]); }).join('');
    }
    $('regCount').textContent = list.length + ' of ' + state.risks.length + ' shown';
    $('note').textContent = filter.sort === 'score' ? 'Ranked by score, highest first. Closed risks sit at the bottom.' : '';
  }

  function render() {
    $('banner').hidden = !state.risks.some(function (r) { return r.example; });
    renderStrip();
    renderMatrix();
    renderOwnerFilter();
    renderChips();
    renderTable();
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- form ---------- */
  function fillSelect(id, opts) {
    $(id).innerHTML = opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
  }
  function initForm() {
    fillSelect('fCat', CATS.map(function (c) { return [c, c]; }));
    fillSelect('fStat', STATUSES.map(function (c) { return [c, c]; }));
    fillSelect('fLik', LIK.map(function (x, k) { return [k + 1, (k + 1) + ' · ' + x[0] + ' (' + x[1] + ')']; }));
    fillSelect('fImp', IMP.map(function (x, k) { return [k + 1, (k + 1) + ' · ' + x[0] + ' (' + x[1] + ')']; }));
  }
  function updatePreview() {
    var l = +$('fLik').value, i = +$('fImp').value, s = l * i, b = band(s);
    $('eq').textContent = l + ' × ' + i + ' =';
    $('eqPill').innerHTML = '<span class="pill ' + b + '"><b>' + s + '</b> ' + BAND_LABEL[b] + '</span>';
  }
  function setErr(id, msg) {
    var p = document.querySelector('[data-for="' + id + '"]');
    if (!p) return;
    p.textContent = msg;
    p.hidden = !msg;
    $(id).setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function openForm(id) {
    editingId = id || null;
    var r = id ? state.risks.filter(function (x) { return x.id === id; })[0] : null;
    $('formTitle').textContent = r ? 'Edit risk ' + r.id : 'Add risk';
    $('fTitle').value = r ? r.title : '';
    $('fDesc').value = r ? (r.desc || '') : '';
    $('fCat').value = r ? r.cat : 'Schedule';
    $('fStat').value = r ? r.status : 'Open';
    $('fLik').value = r ? r.l : 3;
    $('fImp').value = r ? r.i : 3;
    $('fMit').value = r ? r.mit : '';
    $('fOwner2').value = r ? r.owner : '';
    $('fDate').value = r ? r.review : iso(addDays(today(), 14));
    ['fTitle', 'fMit', 'fOwner2', 'fDate'].forEach(function (k) { setErr(k, ''); });
    updatePreview();
    $('formOverlay').hidden = false;
    setTimeout(function () { $('fTitle').focus(); }, 0);
  }
  function closeForm() { $('formOverlay').hidden = true; editingId = null; }
  function validate() {
    var ok = true;
    [['fTitle', 'Describe the risk in a few words.'], ['fMit', 'Write what you will do about it.'],
     ['fOwner2', 'Name the person who owns this risk.'], ['fDate', 'Pick a review date.']].forEach(function (p) {
      var bad = !$(p[0]).value.trim();
      setErr(p[0], bad ? p[1] : '');
      if (bad) ok = false;
    });
    return ok;
  }
  function submitForm(e) {
    e.preventDefault();
    if (!validate()) return;
    var data = {
      title: $('fTitle').value.trim(), desc: $('fDesc').value.trim(), cat: $('fCat').value, status: $('fStat').value,
      l: +$('fLik').value, i: +$('fImp').value, mit: $('fMit').value.trim(), owner: $('fOwner2').value.trim(), review: $('fDate').value
    };
    var wasEdit = !!editingId;
    var req = wasEdit ? api('PUT', '/api/risks/' + editingId, data) : api('POST', '/api/risks', data);
    $('btnSave').disabled = true;
    req.then(function (d) {
      upsert(d.risk);
      toast(wasEdit ? 'Risk ' + d.risk.id + ' updated' : 'Added ' + d.risk.id + ' with score ' + score(d.risk));
      closeForm();
      render();
    }).catch(fail).then(function () { $('btnSave').disabled = false; });
  }

  /* ---------- export ---------- */
  function csv() {
    var head = ['ID', 'Risk', 'Category', 'Likelihood', 'Impact', 'Score', 'Rating', 'Rank', 'Mitigation', 'Owner', 'Review date', 'Status', 'Details'];
    var ranks = rankMap();
    function q(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }
    var lines = [head.join(',')];
    state.risks.slice().sort(function (a, b) {
      return ((a.status === 'Closed') - (b.status === 'Closed')) || cmp(a, b);
    }).forEach(function (r) {
      var s = score(r);
      lines.push([r.id, r.title, r.cat, r.l, r.i, s, BAND_LABEL[band(s)], ranks[r.id] || '', r.mit, r.owner, r.review, r.status, r.desc || ''].map(q).join(','));
    });
    return lines.join('\n');
  }

  /* ---------- events ---------- */
  function findRisk(id) { return state.risks.filter(function (x) { return x.id === id; })[0]; }

  $('btnAdd').addEventListener('click', function () { openForm(); });
  $('btnCancel').addEventListener('click', closeForm);
  $('riskForm').addEventListener('submit', submitForm);
  $('fLik').addEventListener('change', updatePreview);
  $('fImp').addEventListener('change', updatePreview);
  $('formOverlay').addEventListener('mousedown', function (e) { if (e.target === this) closeForm(); });

  $('btnExport').addEventListener('click', function () {
    $('csvText').value = csv();
    $('exportOverlay').hidden = false;
    setTimeout(function () { $('csvText').focus(); $('csvText').select(); }, 0);
  });
  $('btnExClose').addEventListener('click', function () { $('exportOverlay').hidden = true; });
  $('exportOverlay').addEventListener('mousedown', function (e) { if (e.target === this) this.hidden = true; });
  $('btnExCopy').addEventListener('click', function () {
    var ta = $('csvText');
    function fallback() { ta.focus(); ta.select(); toast('Selected. Press Ctrl+C or Cmd+C to copy.'); }
    try {
      navigator.clipboard.writeText(ta.value).then(function () { toast('CSV copied'); }, fallback);
    } catch (e) { fallback(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeForm(); $('exportOverlay').hidden = true; }
  });

  $('btnClearEx').addEventListener('click', function () {
    api('DELETE', '/api/risks?examples=true')
      .then(function (d) { state.risks = d.risks; render(); toast('Examples cleared'); })
      .catch(fail);
  });

  $('matrix').addEventListener('click', function (e) {
    var c = e.target.closest('.cell');
    if (!c) return;
    var l = +c.getAttribute('data-l'), i = +c.getAttribute('data-i');
    filter.cell = (filter.cell && filter.cell.l === l && filter.cell.i === i) ? null : { l: l, i: i };
    renderMatrix(); renderChips(); renderTable();
  });
  $('chips').addEventListener('click', function (e) {
    if (e.target.id === 'chipX') { filter.cell = null; renderMatrix(); renderChips(); renderTable(); }
  });

  $('qSearch').addEventListener('input', function () { filter.q = this.value; renderTable(); });
  $('fStatus').addEventListener('change', function () { filter.status = this.value; renderTable(); });
  $('fBand').addEventListener('change', function () { filter.band = this.value; renderTable(); });
  $('fOwner').addEventListener('change', function () { filter.owner = this.value; renderTable(); });
  $('fSort').addEventListener('change', function () { filter.sort = this.value; renderTable(); });

  function resetFilters() {
    filter = { q: '', status: 'all', band: 'all', owner: 'all', sort: 'score', cell: null };
    $('qSearch').value = ''; $('fStatus').value = 'all'; $('fBand').value = 'all'; $('fSort').value = 'score';
    render();
  }

  $('rows').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (act === 'edit') openForm(id);
    else if (act === 'del') { pendingDelete = id; renderTable(); }
    else if (act === 'delno') { pendingDelete = null; renderTable(); }
    else if (act === 'delyes') {
      pendingDelete = null;
      api('DELETE', '/api/risks/' + id).then(function () {
        state.risks = state.risks.filter(function (r) { return r.id !== id; });
        render(); toast('Risk deleted');
      }).catch(function (e) { fail(e); render(); });
    } else if (act === 'reviewed') {
      api('PUT', '/api/risks/' + id, { review: iso(addDays(today(), 14)) }).then(function (d) {
        upsert(d.risk); render(); toast('Next review for ' + d.risk.id + ' is ' + fmt(d.risk.review));
      }).catch(fail);
    } else if (act === 'seed') {
      api('POST', '/api/seed', { today: iso(today()) }).then(function (d) { state.risks = d.risks; render(); }).catch(fail);
    }
    else if (act === 'retry') loadRisks();
    else if (act === 'reset') resetFilters();
  });
  $('rows').addEventListener('change', function (e) {
    var sel = e.target.closest('select.statussel');
    if (!sel) return;
    api('PUT', '/api/risks/' + sel.getAttribute('data-id'), { status: sel.value })
      .then(function (d) { upsert(d.risk); render(); })
      .catch(function (err) { fail(err); render(); });
  });

  /* ---------- start ---------- */
  initForm();
  renderKey();
  loadRisks();
})();
