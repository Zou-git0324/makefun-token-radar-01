// Token Radar panels (radar-3): a per-category summary, the market calibration
// behind each category multiplier, and a CSV export of the filtered board.
// Data comes from data.js (window.RADAR), written by main.ts from the same
// board as board.json. No network, no fetch: everything renders from that
// one object. Runs after app.js; it only reads the same filter controls.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R || !R.rows) return;
  var $ = function (id) { return document.getElementById(id); };
  var fmtUsd = function (n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var median = function (values) {
    if (!values.length) return null;
    var s = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  // ---- board by category --------------------------------------------------
  // One row per category: how many ranked protocols it holds, the median
  // implied value inside it, and its best row. Clicking a row filters the
  // board below to that category, so the summary is a way into the table.
  var byCat = {};
  R.rows.forEach(function (r) {
    var c = r.category || 'Uncategorised';
    (byCat[c] = byCat[c] || []).push(r);
  });
  var catNames = Object.keys(byCat).sort(function (a, b) {
    return byCat[b].length - byCat[a].length || (a < b ? -1 : 1);
  });
  var summary = '<table class="mini"><thead><tr><th>Category</th><th class="num">Rows</th>' +
    '<th class="num">Median implied</th><th>Best row</th></tr></thead><tbody>' +
    catNames.map(function (c) {
      var rows = byCat[c];
      var med = median(rows.map(function (r) { return r.implied_value_usd; }));
      var best = rows[0];
      for (var i = 1; i < rows.length; i++) if (rows[i].rank < best.rank) best = rows[i];
      return '<tr data-cat="' + esc(c) + '"><td><b>' + esc(c) + '</b></td>' +
        '<td class="num">' + rows.length + '</td>' +
        '<td class="num">' + fmtUsd(med) + '</td>' +
        '<td>#' + best.rank + ' ' + esc(best.name) + '</td></tr>';
    }).join('') + '</tbody></table>';
  var summaryBox = $('catSummary');
  if (summaryBox) {
    summaryBox.innerHTML = summary;
    summaryBox.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-cat]');
      if (!tr) return;
      var sel = $('cat');
      if (!sel) return;
      sel.value = tr.getAttribute('data-cat');
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      var board = $('board');
      if (board) board.scrollIntoView();
    });
  }

  // ---- market calibration ---------------------------------------------------
  // The evidence behind each category multiplier: how many live-token
  // protocols priced the category, their median market-cap/TVL, the market
  // factor that follows, and the multiplier the board actually used. Rows
  // with too few live comparables say so instead of showing a factor.
  var calBox = $('calibrationTable');
  var cal = R.calibration;
  if (calBox && cal && cal.categories) {
    var calRows = cal.categories.map(function (c) {
      var evidence = c.live_count >= 3
        ? '×' + c.market_factor.toFixed(2) + ' from ' + c.live_count + ' live'
        : 'hand-set — only ' + c.live_count + ' live';
      return '<tr><td><b>' + esc(c.category) + '</b></td>' +
        '<td class="num">' + (c.median_mcap_tvl === null ? '—' : c.median_mcap_tvl.toFixed(3)) + '</td>' +
        '<td>' + esc(evidence) + '</td>' +
        '<td class="num"><b>×' + c.calibrated_multiplier.toFixed(2) + '</b></td></tr>';
    }).join('');
    calBox.innerHTML = '<table class="mini"><thead><tr><th>Category</th>' +
      '<th class="num">Live mcap / TVL</th><th>Market evidence</th>' +
      '<th class="num">Multiplier used</th></tr></thead><tbody>' + calRows + '</tbody></table>' +
      '<p class="caveat">Live tokens across the snapshot trade at a median ' +
      cal.global_median_mcap_tvl.toFixed(3) + '× TVL (' + cal.live_count +
      ' priced protocols) — the market prices a token at about a quarter of TVL, close to the base the model already used (0.20). ' +
      'A category&rsquo;s hand-set multiplier moves by at most a quarter, and only where at least 3 live tokens price it.</p>';
  }

  // ---- CSV export of the filtered board --------------------------------------
  // Re-reads the same filter controls app.js reads, so the download matches
  // the rows on screen. One row per ranked protocol, plain values only.
  function filteredRows() {
    var q = ($('q').value || '').trim().toLowerCase();
    var cat = $('cat').value;
    var chain = $('chain').value;
    var watchOnly = $('watchOnly').checked;
    var earlyOnly = $('earlyOnly').checked;
    var sortBy = $('sortBy').value;
    var rows = R.rows.filter(function (r) {
      if (watchOnly && !r.on_watchlist) return false;
      if (earlyOnly && r.on_watchlist) return false;
      if (cat && (r.category || 'Uncategorised') !== cat) return false;
      if (chain && r.chains.indexOf(chain) === -1) return false;
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var val = function (r) {
      if (sortBy === 'tvl') return r.tvl_usd;
      if (sortBy === 'growth') return r.change_7d === null ? -Infinity : r.change_7d;
      if (sortBy === 'age') return r.age_days === null ? -1 : r.age_days;
      if (sortBy === 'name') return r.name.toLowerCase();
      return r.rank;
    };
    // Same order as the table on screen: rank and name ascending, numeric sorts high to low.
    var dir = (sortBy === 'rank' || sortBy === 'name') ? 1 : -1;
    rows.sort(function (a, b) {
      var va = val(a), vb = val(b);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return a.rank - b.rank;
    });
    return rows;
  }
  var csvBtn = $('csvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', function () {
      var rows = filteredRows();
      var cell = function (v) {
        var s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      var lines = ['rank,name,slug,category,chains,tvl_usd,change_7d,age_days,implied_value_usd,on_watchlist'];
      rows.forEach(function (r) {
        lines.push([r.rank, cell(r.name), cell(r.slug), cell(r.category || ''),
          cell(r.chains.join(';')), r.tvl_usd, r.change_7d === null ? '' : r.change_7d,
          r.age_days === null ? '' : r.age_days, r.implied_value_usd,
          r.on_watchlist ? 'yes' : 'no'].join(','));
      });
      var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'token-radar-filtered.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      var note = $('csvNote');
      if (note) note.textContent = rows.length + ' rows downloaded.';
    });
  }
})();
