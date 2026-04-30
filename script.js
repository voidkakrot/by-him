function openMonitor() {
  var f = document.createElement('iframe');
  f.id  = 'monitorFrame';
  f.src = 'monitor.html';
  f.style.cssText = [
    'position:fixed', 'inset:0', 'width:100%', 'height:100%',
    'border:none', 'z-index:9999',
    'opacity:0', 'transform:scale(0.97)',
    'transition:opacity 0.35s ease, transform 0.35s ease'
  ].join(';');
  document.body.appendChild(f);
  requestAnimationFrame(() => {
    f.style.opacity   = '1';
    f.style.transform = 'scale(1)';
  });
}

function closeMonitor() {
  var f = document.getElementById('monitorFrame');
  if (!f) return;
  f.style.opacity   = '0';
  f.style.transform = 'scale(0.97)';
  setTimeout(() => f.remove(), 350);
}

const firebaseConfig = {
  apiKey:            "AIzaSyDD7qteBijzuhKLqZuxUt0NAGNz9t3Mf5U",
  authDomain:        "omqr-8a2ba.firebaseapp.com",
  databaseURL:       "https://omqr-8a2ba-default-rtdb.firebaseio.com",
  projectId:         "omqr-8a2ba",
  storageBucket:     "omqr-8a2ba.firebasestorage.app",
  messagingSenderId: "59834457864",
  appId:             "1:59834457864:web:57963a63081f33f09e96bd"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let dbData      = {};
let modalAction = null;

function closeMonitorSelf() {
  if (window.parent && window.parent.closeMonitor) {
    window.parent.closeMonitor();
  } else {
    window.close();
  }
}

function tryLogin() {
  var val = document.getElementById('passInput').value;
  if (val === '3821') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    startListening();
  } else {
    var inp = document.getElementById('passInput');
    inp.classList.add('shake');
    inp.value = '';
    setTimeout(() => inp.classList.remove('shake'), 500);
  }
}

document.getElementById('passInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') tryLogin();
});

function startListening() {
  db.ref('omar_data/users').on('value', function(snap) {
    dbData = snap.val() || {};
    renderAll();
  });
}

function renderAll() {
  var grid  = document.getElementById('studentsGrid');
  var users = Object.entries(dbData);

  if (users.length === 0) {
    grid.innerHTML = '<div class="empty-state">// NO STUDENTS FOUND</div>';
    updateStats(0, 0, 0);
    return;
  }

  var onlineC = 0, cheatC = 0, html = '';

  users.sort(function(a, b) {
    return (b[1].cheatCount || 0) - (a[1].cheatCount || 0);
  });

  users.forEach(function([uid, u]) {
    var isOnline    = !!u.live;
    var isKicked    = !!u.kicked;
    var cheats      = u.cheats ? Object.values(u.cheats) : [];
    var cheatTotal  = cheats.length;
    var isCheat     = cheatTotal > 0;

    if (isOnline) onlineC++;
    if (isCheat)  cheatC++;

    var approved = u.approved ? Object.entries(u.approved) : [];
    var pending  = u.pending  ? Object.entries(u.pending)  : [];

    var scoresHTML = '';
    approved.forEach(function([ex, score]) {
      var c = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
      scoresHTML += '<div class="info-row"><span class="info-label">\u2713 ' + ex + '</span><span class="info-val ' + c + '">' + score + '%</span></div>';
    });
    pending.forEach(function([ex, score]) {
      scoresHTML += '<div class="info-row"><span class="info-label">\u23f3 ' + ex + '</span><span class="info-val yellow">' + score + '% \u2014 pending</span></div>';
    });
    if (!scoresHTML) scoresHTML = '<div class="info-row"><span class="info-label" style="color:#333">\u0644\u0645 \u064a\u0624\u062f\u0650 \u0623\u064a \u0627\u0645\u062a\u062d\u0627\u0646 \u0628\u0639\u062f</span></div>';

    var cheatHTML = '';
    if (cheatTotal > 0) {
      var sorted = cheats.sort((a, b) => b.time - a.time).slice(0, 5);
      cheatHTML = '<div class="cheat-section"><div class="cheat-header"><span class="cheat-title"><i class="fas fa-triangle-exclamation"></i> CHEAT LOG</span><span class="cheat-count">' + cheatTotal + 'x</span></div><div class="cheat-list">';
      sorted.forEach(function(c) {
        cheatHTML += '<div class="cheat-event"><span class="cheat-type">' + cheatTypeLabel(c.type) + '</span><span class="cheat-time">' + formatTime(c.time) + ' \u2014 Q' + (c.question || '?') + '</span></div>';
      });
      cheatHTML += '</div></div>';
    }

    var approveHTML = '';
    pending.forEach(function([ex, score]) {
      approveHTML += '<button class="act-btn btn-approve" onclick="approveStudent(\'' + uid + '\',\'' + ex + '\',' + score + ')"><i class="fas fa-check"></i> \u0642\u0628\u0648\u0644 ' + ex + '</button>';
    });

    html += '<div class="s-card ' + (isCheat ? 'cheater' : '') + '" id="card-' + uid + '">';
    html += '<div class="card-head"><div><div class="card-name">' + (u.name || uid) + (isKicked ? ' \uD83D\uDEAB' : '') + '</div><div class="card-id">ID: ' + uid + '</div></div>';
    html += '<div class="status-badge ' + (isOnline ? 'badge-online' : 'badge-offline') + '"><div class="dot ' + (isOnline ? 'dot-green' : '') + '"></div>' + (isOnline ? 'LIVE' : 'OFFLINE') + '</div></div>';
    html += '<div class="card-body"><div class="info-row"><span class="info-label">\u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062d\u0627\u0644\u064a</span><span class="info-val" style="font-size:0.72rem;color:#aaa">' + (u.live || '\u2014') + '</span></div>' + scoresHTML + cheatHTML + '</div>';
    html += '<div class="card-actions"><button class="act-btn btn-kick" onclick="kickStudent(\'' + uid + '\',\'' + (u.name || uid) + '\')"><i class="fas fa-ban"></i> \u0637\u0631\u062f</button>' + approveHTML + '<button class="act-btn btn-delete" onclick="deleteStudent(\'' + uid + '\',\'' + (u.name || uid) + '\')"><i class="fas fa-trash"></i> \u062d\u0630\u0641</button></div>';
    html += '</div>';
  });

  grid.innerHTML = html;
  updateStats(onlineC, cheatC, users.length);
}

function updateStats(online, cheats, total) {
  document.getElementById('onlineCount').innerText = online;
  document.getElementById('cheatCount').innerText  = cheats;
  document.getElementById('totalCount').innerText  = total;
}

function cheatTypeLabel(type) {
  var map = {
    tab_switch:        '\u21c4 \u062a\u0628\u062f\u064a\u0644 \u062a\u0627\u0628',
    window_blur:       '\u2197 \u062e\u0631\u0648\u062c \u0645\u0646 \u0627\u0644\u0646\u0627\u0641\u0630\u0629',
    right_click:       '\uD83D\uDDB1 \u0643\u0644\u064a\u0643 \u064a\u0645\u064a\u0646',
    copy_attempt:      '\u2398 \u0645\u062d\u0627\u0648\u0644\u0629 \u0646\u0633\u062e',
    paste_attempt:     '\u2398 \u0645\u062d\u0627\u0648\u0644\u0629 \u0644\u0635\u0642',
    keyboard_shortcut: '\u2328 \u0627\u062e\u062a\u0635\u0627\u0631 \u0643\u064a\u0628\u0648\u0631\u062f',
    devtools_attempt:  '\uD83D\uDD27 \u0641\u062a\u062d DevTools'
  };
  return map[type] || type;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ar-EG', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}

function kickStudent(uid, name) {
  openModal('\u0637\u0631\u062f ' + name + ' \u061f', '\u0633\u064a\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0645\u062a\u062d\u0627\u0646\u0647 \u0648\u0625\u0631\u0633\u0627\u0644\u0647 \u0644\u0644\u062e\u0631\u0648\u062c', function() {
    db.ref('omar_data/users/' + uid + '/kicked').set(true);
    db.ref('omar_data/users/' + uid + '/pending').remove();
    db.ref('omar_data/users/' + uid + '/live').set('\u062a\u0645 \u0637\u0631\u062f\u0647 \uD83D\uDEAB');
    showToast('\u062a\u0645 \u0637\u0631\u062f ' + name + ' \u2713');
  });
}

function deleteStudent(uid, name) {
  openModal('\u062d\u0630\u0641 ' + name + ' \u0646\u0647\u0627\u0626\u064a\u0627\u064b \u061f', '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639', function() {
    db.ref('omar_data/users/' + uid).remove();
    showToast('\u062a\u0645 \u062d\u0630\u0641 ' + name + ' \u2713');
  });
}

function approveStudent(uid, exId, score) {
  db.ref('omar_data/users/' + uid + '/approved/' + exId).set(score);
  db.ref('omar_data/users/' + uid + '/pending/' + exId).remove();
  showToast('\u062a\u0645 \u0642\u0628\u0648\u0644 ' + exId + ' \u2713');
}

function openModal(title, msg, action) {
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalMsg').innerText   = msg;
  modalAction = action;
  document.getElementById('modal').classList.add('open');
  document.getElementById('modalConfirm').onclick = function() {
    action();
    closeModal();
  };
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  modalAction = null;
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}
