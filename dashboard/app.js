// Token Radar dashboard: sortable, filterable board + a detail view per protocol.
// Data comes from data.js (window.RADAR), written by main.ts from the same board
// as board.json. No network, no fetch: everything renders from that one object.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R || !R.rows) {
    document.getElementById('rows').innerHTML = '<tr><td colspan="11">No radar data found. Run main.ts to generate data.js beside this page.</td></tr>';
    return;
  }

  var PAGE = 50;
  var shown = PAGE;
  var sortKey = 'rank';
  var sortDir = 1;
  var selectedSlug = null;

  var $ = function (id) { return document.getElementById(id); };
  var fmtUsd = function (n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  };
  var fmtAge = function (d) {
    if (d === null || d === undefined) return '—';
    if (d < 30) return d + 'd';
    if (d < 365) return Math.round(d / 30) + 'mo';
    return (d / 365).toFixed(1) + 'y';
  };
  var fmtGrowth = function (g) {
    if (g === null || g === undefined) return '<span>—</span>';
    var cls = g >= 0 ? 'up' : 'down';
    return '<span class="' + cls + '">' + (g >= 0 ? '+' : '') + g.toFixed(1) + '%</span>';
  };
  var fmtPp = function (pp) {
    if (pp === null || pp === undefined) return '<span>—</span>';
    if (pp === 0) return '<span>0.0pp</span>';
    var cls = pp > 0 ? 'up' : 'down';
    return '<span class="' + cls + '">' + (pp > 0 ? '+' : '') + pp.toFixed(1) + 'pp</span>';
  };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // ---- header stats -------------------------------------------------------
  $('asOf').textContent = R.as_of;
  $('modelVer').textContent = R.model_version;
  $('statBoard').textContent = R.board_size;
  $('statWatch').textContent = R.watchlist_size + ' / ' + R.watchlist_size;
  $('statTotal').textContent = fmtUsd(R.total_implied_usd);
  $('statMedian').textContent = fmtUsd(R.median_implied_usd);
  $('sourceLine').textContent = R.source;

  // ---- filter controls ----------------------------------------------------
  var catSel = $('cat');
  R.categories.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c; catSel.appendChild(o);
  });
  var chainSel = $('chain');
  R.chains.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c; chainSel.appendChild(o);
  });

  function currentFilters() {
    return {
      q: $('q').value.trim().toLowerCase(),
      cat: catSel.value,
      chain: chainSel.value,
      watchOnly: $('watchOnly').checked,
      earlyOnly: $('earlyOnly').checked,
      hotOnly: $('hotOnly').checked,
      sortBy: $('sortBy').value,
    };
  }

  function filteredRows() {
    var f = currentFilters();
    var rows = R.rows.filter(function (r) {
      if (f.watchOnly && !r.on_watchlist) return false;
      if (f.earlyOnly && r.on_watchlist) return false;
      if (f.hotOnly && r.heat < 70) return false;
      if (f.cat && (r.category || 'Uncategorised') !== f.cat) return false;
      if (f.chain && r.chains.indexOf(f.chain) === -1) return false;
      if (f.q && (r.name.toLowerCase().indexOf(f.q) === -1 && r.slug.toLowerCase().indexOf(f.q) === -1)) return false;
      return true;
    });
    var key = f.sortBy === 'rank' ? sortKey : f.sortBy;
    // Numeric sorts run high to low (the labels promise it); name and
    // category run A to Z. Rank follows the header toggle instead.
    var dir = f.sortBy === 'rank' ? sortDir : (f.sortBy === 'name' || f.sortBy === 'category' ? 1 : -1);
    var val = function (r) {
      if (key === 'tvl') return r.tvl_usd;
      if (key === 'heat') return r.heat;
      if (key === 'momentum') return r.momentum_pp;
      if (key === 'growth') return r.change_7d === null ? -Infinity : r.change_7d;
      if (key === 'age') return r.age_days === null ? -1 : r.age_days;
      if (key === 'name') return r.name.toLowerCase();
      if (key === 'category') return (r.category || '').toLowerCase();
      if (key === 'chains') return r.chains.length;
      return r.rank;
    };
    rows.sort(function (a, b) {
      var va = val(a), vb = val(b);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return a.rank - b.rank;
    });
    return rows;
  }

  // ---- table ---------------------------------------------------------------
  function renderTable() {
    var rows = filteredRows();
    var total = rows.length;
    var slice = rows.slice(0, shown);
    var html = slice.map(function (r) {
      var badge = r.rank <= 3 ? 'rank-badge top' : 'rank-badge';
      var tag = r.on_watchlist ? '<span class="watch-tag">WATCHLIST</span>' : '';
      return '<tr data-slug="' + esc(r.slug) + '"' + (r.slug === selectedSlug ? ' class="selected"' : '') + '>' +
        '<td class="num"><span class="' + badge + '">' + r.rank + '</span></td>' +
        '<td><b>' + esc(r.name) + '</b>' + tag + '<br><span style="color:var(--ink-soft);font-size:12.5px">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ') || '—') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num">' + fmtGrowth(r.change_7d) + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td class="num"><b>' + fmtUsd(r.implied_value_usd) + '</b></td>' +
        '<td class="num"><span style="display:inline-block;width:36px;height:8px;background:#e5e7eb;vertical-align:middle"><span style="display:block;height:8px;width:' + r.heat + '%;background:#f59e0b"></span></span> ' + r.heat + '</td>' +
        '<td class="num"><span style="display:inline-block;width:36px;height:8px;background:#e5e7eb;vertical-align:middle"><span style="display:block;height:8px;width:' + (r.momentum * 100).toFixed(0) + '%;background:#0ea5e9"></span></span> ' + fmtPp(r.momentum_pp) + '</td>' +
        '<td><span class="farm-link">7 steps &rsaquo;</span></td></tr>';
    }).join('');
    $('rows').innerHTML = html || '<tr><td colspan="11">No protocols match these filters. Clear the search or pick another category.</td></tr>';
    $('resultLine').textContent = 'Showing ' + slice.length + ' of ' + total + ' ranked protocols' +
      (total < R.board_size ? ' (filtered from ' + R.board_size + ')' : '') + '. Click any row for its detail view and farm plan.';
    $('shownLine').textContent = total > shown ? (total - shown) + ' more rows hidden.' : '';
    $('moreBtn').style.display = total > shown ? '' : 'none';
    document.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.classList.toggle('sorted', th.getAttribute('data-sort') === sortKey);
    });
  }

  // ---- detail view ---------------------------------------------------------
  function barRow(label, value, max, display, cool) {
    var pct = Math.max(2, Math.min(100, (value / max) * 100));
    return '<div class="bar-row"><span>' + label + '</span><div class="bar-track"><div class="bar-fill' +
      (cool ? ' cool' : '') + '" style="width:' + pct.toFixed(0) + '%"></div></div><b>' + display + '</b></div>';
  }

  function renderDetail(slug) {
    var box = $('detail');
    var r = null;
    for (var i = 0; i < R.rows.length; i++) if (R.rows[i].slug === slug) { r = R.rows[i]; break; }
    if (!r) { box.classList.add('hidden'); selectedSlug = null; renderTable(); return; }
    selectedSlug = slug;
    var steps = (r.farm_steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    box.innerHTML =
      '<button class="close" type="button" id="closeDetail">Close &times;</button>' +
      '<h2>#' + r.rank + ' &nbsp;' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' &middot; ' + esc(r.category || 'Uncategorised') + ' &middot; ' +
      esc(r.chains.join(', ') || 'no chain listed') + (r.on_watchlist ? ' &middot; <b>on the watchlist</b>' : ' &middot; early find below the $50M floor') + '</p>' +
      '<div class="detail-grid">' +
      '<div class="box"><b>' + fmtUsd(r.implied_value_usd) + '</b><span>implied value</span></div>' +
      '<div class="box"><b>' + fmtUsd(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div class="box"><b>' + (r.change_7d === null ? '—' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b><span>TVL change, 7 days</span></div>' +
      '<div class="box"><b>' + fmtAge(r.age_days) + '</b><span>tracked with no token</span></div>' +
      '</div>' +
      '<h3>Why this value — the model&rsquo;s four multipliers</h3>' +
      '<div class="bars">' +
      barRow('Category', r.category_multiplier, 1.15, '&times;' + r.category_multiplier.toFixed(2), false) +
      barRow('Growth', r.growth_multiplier, 1.6, '&times;' + r.growth_multiplier.toFixed(2), false) +
      barRow('Maturity', r.maturity_multiplier, 1.0, '&times;' + r.maturity_multiplier.toFixed(2), false) +
      barRow('Chain breadth', r.chain_multiplier, 1.08, '&times;' + r.chain_multiplier.toFixed(2), true) +
      '</div>' +
      '<h3>Launch heat — ' + r.heat + ' / 100</h3>' +
      '<div class="bars">' +
      barRow('Heat', r.heat, 100, r.heat + ' / 100', false) +
      barRow('Value', (r.heat_parts || {}).value || 0, 1, ((r.heat_parts || {}).value || 0).toFixed(2), false) +
      barRow('Growth', (r.heat_parts || {}).growth || 0, 1, ((r.heat_parts || {}).growth || 0).toFixed(2), false) +
      barRow('Youth', (r.heat_parts || {}).youth || 0, 1, ((r.heat_parts || {}).youth || 0).toFixed(2), true) +
      '</div>' +
      '<p class="caveat">Heat is a parallel signal, not the rank: 0.40 &times; log implied value across the board, 0.35 &times; this week&rsquo;s growth, 0.25 &times; youth. It flags what is running hot; the rank above still comes from implied value.</p>' +
      '<h3>Momentum vs its category — ' + fmtPp(r.momentum_pp) + '</h3>' +
      '<div class="bars">' +
      barRow('Momentum', r.momentum, 1, r.momentum.toFixed(2), false) +
      '</div>' +
      '<p class="caveat">Momentum is this row&rsquo;s 7-day TVL change minus the median 7-day change of its own category' +
      (r.cat_median_7d === null ? ' (no median: fewer than 3 protocols in the category report a 7-day change)' : ' (category median ' + (r.cat_median_7d >= 0 ? '+' : '') + r.cat_median_7d.toFixed(1) + '%)') +
      '. It flags which rows are outrunning their own kind this week; the rank above still comes from implied value.</p>' +
      '<p class="caveat">Base is TVL &times; 0.20 &times; category. Multiply the four bars and the base and you get the implied value above — the arithmetic is on the page, not hidden.</p>' +
      '<h3>How to farm it — 7 steps</h3><ol class="farm">' + steps + '</ol>';
    box.classList.remove('hidden');
    $('closeDetail').addEventListener('click', function () { renderDetail(null); });
    renderTable();
  }

  // ---- hottest launches strip ----------------------------------------------
  var hotTop = R.rows.slice().sort(function (a, b) { return b.heat - a.heat || a.rank - b.rank; }).slice(0, 5);
  $('hotStrip').innerHTML = '<b>Hottest launches:</b> ' + hotTop.map(function (r) {
    return '<a href="#detail=' + esc(r.slug) + '" data-slug="' + esc(r.slug) + '">#' + r.rank + ' ' + esc(r.name) + ' (' + r.heat + ')</a>';
  }).join(' &middot; ');
  $('hotStrip').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-slug]');
    if (!a) return;
    e.preventDefault();
    window.location.hash = 'detail=' + a.getAttribute('data-slug');
    renderDetail(a.getAttribute('data-slug'));
  });

  // ---- momentum leaders strip ----------------------------------------------
  var momTop = R.rows.slice().sort(function (a, b) { return b.momentum_pp - a.momentum_pp || a.rank - b.rank; }).slice(0, 5);
  $('momStrip').innerHTML = '<b>Momentum leaders:</b> ' + momTop.map(function (r) {
    return '<a href="#detail=' + esc(r.slug) + '" data-slug="' + esc(r.slug) + '">#' + r.rank + ' ' + esc(r.name) + ' (' + (r.momentum_pp >= 0 ? '+' : '') + r.momentum_pp.toFixed(1) + 'pp)</a>';
  }).join(' &middot; ');
  $('momStrip').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-slug]');
    if (!a) return;
    e.preventDefault();
    window.location.hash = 'detail=' + a.getAttribute('data-slug');
    renderDetail(a.getAttribute('data-slug'));
  });

  // ---- methodology note: what the board leaves out --------------------------
  if (R.excluded) {
    var cats = Object.keys(R.excluded.by_category).sort(function (a, b) { return R.excluded.by_category[b] - R.excluded.by_category[a]; });
    $('methodNote').textContent = R.excluded.count + ' rankable protocols sit above the $50M early floor and are not ranked — mostly bridges and wrappers. Count by category: ' +
      cats.map(function (c) { return c + ' ' + R.excluded.by_category[c]; }).join(', ') + '.';
  }

  // ---- live-token list ------------------------------------------------------
  $('liveList').innerHTML = R.live.map(function (p) {
    return '<li><b>' + esc(p.name) + '</b> — ' + esc(p.category || '—') + ' · TVL ' + fmtUsd(p.tvl_usd) +
      ' · market cap ' + (p.mcap_usd ? fmtUsd(p.mcap_usd) : '—') + '</li>';
  }).join('');

  // ---- events ---------------------------------------------------------------
  ['q', 'cat', 'chain', 'watchOnly', 'earlyOnly', 'hotOnly', 'sortBy'].forEach(function (id) {
    $(id).addEventListener('input', function () { shown = PAGE; renderTable(); });
    $(id).addEventListener('change', function () { shown = PAGE; renderTable(); });
  });
  $('moreBtn').addEventListener('click', function () { shown += 100; renderTable(); });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) renderDetail(tr.getAttribute('data-slug'));
  });
  document.querySelectorAll('th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (sortKey === key) { sortDir = -sortDir; } else { sortKey = key; sortDir = 1; }
      $('sortBy').value = key === 'rank' ? 'rank' : key;
      renderTable();
    });
  });

  // Deep links: ?cat=Lending&q=veda presets filters; #detail=<slug> opens a row.
  // These exist so a filtered view and a detail view are real states of the page.
  var params = new URLSearchParams(window.location.search);
  if (params.get('cat')) { catSel.value = params.get('cat'); }
  if (params.get('q')) { $('q').value = params.get('q'); }
  if (params.get('watch') === '1') { $('watchOnly').checked = true; }
  if (params.get('early') === '1') { $('earlyOnly').checked = true; }
  if (params.get('hot') === '1') { $('hotOnly').checked = true; }
  var hash = window.location.hash || '';
  var m = hash.match(/detail=([A-Za-z0-9._-]+)/);
  if (params.get('view') === 'board') { document.body.classList.add('compact'); }
  renderTable();
  if (m) {
    // A deep-linked detail is the focus of the page: hide the model explainer,
    // masthead and filters so the detail view and its farm steps fill the
    // first screen without depending on a scroll position.
    document.body.classList.add('compact');
    document.body.classList.add('focus-detail');
    renderDetail(m[1]);
  }
})();
