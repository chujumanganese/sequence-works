/* ======================================================
   INVESTMENT SYSTEM — NexVault
   - $1,000 welcome bonus on signup
   - Base daily growth: 0.5%
   - Extra growth: +0.1% per $100 deposited (max 2.5%/day)
   - Withdrawal unlocked at $10,000
   - Min withdrawal: $10,000
====================================================== */

var WELCOME_BONUS    = 1000;
var GOAL_AMOUNT      = 10000;
var MIN_WITHDRAWAL   = 10000;
var BASE_DAILY_RATE  = 0.005;   // 0.5% per day

/* User state (in a real app, store in a backend database) */
var user = {
  name:        'User',
  balance:     WELCOME_BONUS,
  deposited:   0,
  joinedDate:  Date.now(),
  lastGrowth:  Date.now(),
  history:     [],
  bonusShown:  false
};

/* ── helpers ── */
function fmt(n){ return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',' ); }
function fmtShort(n){ return Math.floor(n).toLocaleString(); }

function getDailyRate(){
  /* +0.1% for every $100 deposited, capped at 2.5% */
  var boost = Math.min(user.deposited / 100 * 0.001, 0.02);
  return BASE_DAILY_RATE + boost;
}

/* Called whenever we load the home screen — applies any pending growth */
function applyGrowth(){
  var now  = Date.now();
  var msPerDay = 24 * 60 * 60 * 1000;
  var elapsed  = now - user.lastGrowth;
  if(elapsed < 60000) return; /* less than 1 min — skip */

  /* For demo we simulate 1 min = 1 day so users see real movement */
  var daysPassed = elapsed / 60000;
  var rate = getDailyRate();
  for(var d = 0; d < daysPassed; d++){
    var gain = user.balance * rate;
    user.balance += gain;
    var dateLabel = new Date(user.lastGrowth + (d * 60000)).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    user.history.unshift({date: dateLabel, gain: gain, rate: rate});
    if(user.history.length > 10) user.history.pop();
  }
  user.lastGrowth = now;
}

/* ── UPDATE DASHBOARD ── */
function updateDashboard(){
  applyGrowth();

  var bal  = user.balance;
  var rate = getDailyRate();
  var pct  = Math.min((bal / GOAL_AMOUNT) * 100, 100);
  var days = Math.floor((Date.now() - user.joinedDate) / 60000); /* 1min=1day demo */
  var earned = bal - WELCOME_BONUS - user.deposited;

  /* Balance */
  var balEl = document.getElementById('dashBalance');
  if(balEl) balEl.textContent = fmt(bal);

  /* Daily rate badge */
  var rateEl = document.getElementById('dashDailyPct');
  if(rateEl) rateEl.textContent = '+' + (rate*100).toFixed(2) + '%';

  var amtEl = document.getElementById('dashDailyAmt');
  if(amtEl) amtEl.textContent = '+$' + fmt(bal * rate) + ' today';

  /* Progress bar */
  var barEl = document.getElementById('dashBar');
  if(barEl) barEl.style.width = pct.toFixed(2) + '%';

  var pctEl = document.getElementById('dashPct');
  if(pctEl) pctEl.textContent = pct.toFixed(2) + '%';

  var curEl = document.getElementById('dashCurrent');
  if(curEl) curEl.textContent = fmtShort(bal);

  /* Stats */
  var rEl = document.getElementById('statRate');
  if(rEl) rEl.textContent = (rate*100).toFixed(2) + '%';

  var dEl = document.getElementById('statDays');
  if(dEl) dEl.textContent = days;

  var eEl = document.getElementById('statEarned');
  if(eEl) eEl.textContent = '$' + fmt(Math.max(0, earned));

  /* History list */
  var hEl = document.getElementById('historyList');
  if(hEl){
    if(user.history.length === 0){
      hEl.innerHTML = '<div style="font-size:13px;color:var(--muted);text-align:center;padding:16px 0">Growth will appear here daily</div>';
    } else {
      hEl.innerHTML = user.history.slice(0,5).map(function(h){
        return '<div style="display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--border);border-radius:13px;padding:13px 14px">'
          + '<div style="width:36px;height:36px;border-radius:10px;background:rgba(34,197,94,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
          + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg></div>'
          + '<div style="flex:1"><div style="font-size:13px;font-weight:600">Daily growth</div>'
          + '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + h.date + ' · ' + (h.rate*100).toFixed(2) + '% rate</div></div>'
          + '<div style="font-size:14px;font-weight:700;color:var(--green)">+$' + fmt(h.gain) + '</div></div>';
      }).join('');
    }
  }

  /* Show welcome bonus banner once */
  var banner = document.getElementById('bonusBanner');
  if(banner && !user.bonusShown){
    banner.style.display = 'flex';
    user.bonusShown = true;
    setTimeout(function(){ banner.style.display='none'; }, 6000);
  }

  /* Unlock withdraw button highlight */
  var wbtn = document.getElementById('withdrawActBtn');
  if(wbtn){
    if(bal >= GOAL_AMOUNT){
      wbtn.style.borderColor = 'rgba(0,212,170,.4)';
      wbtn.style.background  = 'rgba(0,212,170,.1)';
    }
  }
}

/* Auto-refresh dashboard every 30 seconds */
// setInterval(function(){
//   if(document.getElementById('homeScreen').classList.contains('active')){
//     updateDashboard();
//   }
// }, 30000);

/* ======================================================
   NAVIGATION
====================================================== */
function go(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  if(id === 'homeScreen') updateDashboard();
}
function goDeposit(){ depStep=1; depCoin=null; depNet=null; renderDep(); go('depositScreen'); }
function goBuy(){ renderBuy(); go('buyScreen'); }
function goKYC(){ kycStep=1; kycFront=false; kycBack=false; kycVideo=false; renderKYC(); go('kycScreen'); }
function goWithdraw(){ renderWithdraw(); go('withdrawScreen'); }

/* ======================================================
   AUTH
====================================================== */
function loader(running = true){

  const ele = document.createElement("div");
  ele.classList.add("loader");
  const btn = document.getElementById("tabUp");
  const data = btn.innerHTML;
  btn.innerHTML = "";
  btn.appendChild(ele);

  setTimeout(() => {
    btn.innerHTML = data;
  }, 2000);
}

function switchTab(t){
  document.getElementById('tabIn').className = 'atab' + (t==='in' ? ' on' : '');
  document.getElementById('tabUp').className = 'atab' + (t==='up' ? ' on' : '');
  document.getElementById('siForm').style.display  = (t==='in') ? 'block' : 'none';
  document.getElementById('suForm').style.display  = (t==='up') ? 'block' : 'none';
  document.getElementById('fgForm').style.display  = 'none';
  if(t==='in'){
    document.getElementById('aTitle').innerHTML = 'Welcome <span style="color:#00d4aa">back</span>';
    document.getElementById('aSub').textContent = 'Sign in to access your portfolio and manage your assets securely.';
  } else {
    document.getElementById('aTitle').innerHTML = 'Create your <span style="color:#00d4aa">account</span>';
    document.getElementById('aSub').textContent = 'Join NexVault and start building your crypto portfolio in minutes.';
  }
  document.getElementById('trustRow').style.display = 'flex';
}

function toggleEye(id){
  var el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function showForgot(){
  document.getElementById('siForm').style.display = 'none';
  document.getElementById('fgForm').style.display = 'block';
  document.getElementById('aTitle').innerHTML = 'Reset <span style="color:#00d4aa">password</span>';
  document.getElementById('aSub').textContent = "We'll send a secure reset link to your email.";
  document.getElementById('trustRow').style.display = 'none';
}
function showSI(){
  document.getElementById('fgForm').style.display = 'none';
  document.getElementById('siForm').style.display = 'block';
  document.getElementById('aTitle').innerHTML = 'Welcome <span style="color:#00d4aa">back</span>';
  document.getElementById('aSub').textContent = 'Sign in to access your portfolio and manage your assets securely.';
  document.getElementById('trustRow').style.display = 'flex';
}
function doForgot(){
  document.getElementById('fgForm').innerHTML = '<div style="background:rgba(0,212,170,.07);border:1px solid rgba(0,212,170,.2);border-radius:13px;padding:22px;text-align:center;margin-bottom:18px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="1.5" style="margin-bottom:10px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><div style="font-size:14px;color:#00d4aa;font-weight:600">Reset link sent!</div><div style="font-size:12px;color:#64748b;margin-top:5px">Check your inbox and spam folder</div></div><div style="text-align:center;margin-bottom:24px"><span style="font-size:13px;color:#3b82f6;cursor:pointer;font-weight:500" onclick="showSI()">\u2190 Back to sign in</span></div>';
}

function valSU(){
  var first   = document.getElementById('suFirst').value.trim();
  var last    = document.getElementById('suLast').value.trim();
  var email   = document.getElementById('suEmail').value.trim();
  var phone   = document.getElementById('suPhone').value.trim();
  var country = document.getElementById('suCountry').value;
  var pass    = document.getElementById('suPass').value;
  var confirm = document.getElementById('suConfirm').value;
  var terms   = document.getElementById('chkTerms').checked;
  var age     = document.getElementById('chkAge').checked;
  var eok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  var pok = pass.length >= 8;
  var mok = pass === confirm && confirm.length > 0;
  document.getElementById('suEmailErr').className   = 'ferror' + (email.length > 3 && !eok ? ' show' : '');
  document.getElementById('suConfirmErr').className = 'ferror' + (confirm.length > 0 && !mok ? ' show' : '');
  document.getElementById('suBtn').disabled = !(first && last && eok && phone && country && pok && mok && terms && age);
}

function chkStr(){
  var p = document.getElementById('suPass').value;
  var s = 0;
  if(p.length>=8) s++; if(/[A-Z]/.test(p)) s++; if(/[0-9]/.test(p)) s++; if(/[^A-Za-z0-9]/.test(p)) s++;
  var c = ['#ef4444','#f59e0b','#3b82f6','#22c55e'];
  var l = ['Weak','Fair','Good','Strong'];
  for(var i=1;i<=4;i++) document.getElementById('sb'+i).style.background = i<=s ? c[s-1] : 'var(--border)';
  var lbl = document.getElementById('strLbl');
  lbl.textContent = p.length > 0 ? l[Math.max(0,s-1)] + ' password' : '';
  lbl.style.color = p.length > 0 ? c[Math.max(0,s-1)] : 'var(--muted)';
}

function doSignIn(){
  var e = document.getElementById('siEmail').value.trim();
  var p = document.getElementById('siPass').value;
  var ok = true;
  if(!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){
    document.getElementById('siEmail').classList.add('invalid');
    document.getElementById('siEmailErr').classList.add('show');
    ok = false;
  } else {
    document.getElementById('siEmail').classList.remove('invalid');
    document.getElementById('siEmailErr').classList.remove('show');
  }
  if(!p){
    document.getElementById('siPass').classList.add('invalid');
    document.getElementById('siPassErr').classList.add('show');
    ok = false;
  } else {
    document.getElementById('siPass').classList.remove('invalid');
    document.getElementById('siPassErr').classList.remove('show');
  }
  if(!ok) return;
  user.name = e.split('@')[0];
  document.getElementById('homeUser').textContent = user.name;
  go('homeScreen');
}

// function doSignUp(){
//   var first = document.getElementById('suFirst').value.trim();
//   var last  = document.getElementById('suLast').value.trim();
//   /* Reset user state with fresh welcome bonus */
//   user = {
//     name:       first + ' ' + last,
//     balance:    WELCOME_BONUS,
//     deposited:  0,
//     joinedDate: Date.now(),
//     lastGrowth: Date.now(),
//     history:    [],
//     bonusShown: false
//   };
//   document.getElementById('homeUser').textContent = first;
//   go('homeScreen');
// }

/* ======================================================
   WITHDRAWAL SCREEN
====================================================== */
function renderWithdraw(){
  var bal = user.balance;
  var locked = bal < GOAL_AMOUNT;
  var need = Math.max(0, GOAL_AMOUNT - bal);
  var pct = Math.min((bal / GOAL_AMOUNT) * 100, 100);

  var body = document.getElementById('withdrawBody');

  if(locked){
    body.innerHTML =
      '<div style="background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:16px;padding:20px;margin-bottom:20px;text-align:center">'
      + '<div style="font-size:32px;margin-bottom:10px">🔒</div>'
      + '<div style="font-size:15px;font-weight:700;color:var(--yellow);margin-bottom:6px">Withdrawal Locked</div>'
      + '<div style="font-size:13px;color:var(--muted);line-height:1.7">Your balance must reach <strong style="color:var(--text)">$10,000</strong> before you can withdraw. Keep growing!</div>'
      + '</div>'

      + '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:16px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:8px">'
      + '<span style="font-size:12px;color:var(--muted);font-weight:500">Your balance</span>'
      + '<span style="font-size:12px;font-weight:700;color:var(--accent)">$' + fmt(bal) + '</span></div>'
      + '<div style="background:rgba(255,255,255,.06);border-radius:99px;height:10px;overflow:hidden;margin-bottom:8px">'
      + '<div style="height:100%;border-radius:99px;background:linear-gradient(90deg,#f59e0b,#f97316);width:' + pct.toFixed(2) + '%"></div></div>'
      + '<div style="display:flex;justify-content:space-between">'
      + '<span style="font-size:11px;color:var(--muted)">$' + fmtShort(bal) + ' / $10,000</span>'
      + '<span style="font-size:11px;color:var(--yellow)">Need $' + fmt(need) + ' more</span></div></div>'

      + '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:20px">'
      + '<div style="font-size:13px;font-weight:600;margin-bottom:12px">How to unlock faster</div>'
      + '<div style="display:flex;flex-direction:column;gap:10px">'
      + '<div style="display:flex;align-items:flex-start;gap:10px"><div style="width:24px;height:24px;border-radius:50%;background:rgba(0,212,170,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><span style="font-size:13px;color:var(--muted);line-height:1.6">Your balance grows at <strong style="color:var(--text)">' + (getDailyRate()*100).toFixed(2) + '% per day</strong> automatically</span></div>'
      + '<div style="display:flex;align-items:flex-start;gap:10px"><div style="width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg></div><span style="font-size:13px;color:var(--muted);line-height:1.6">Make a <strong style="color:var(--text)">deposit</strong> to boost your daily rate up to 2.5%/day</span></div>'
      + '</div></div>'

      + '<button class="pbtn" onclick="goDeposit()">Make a deposit to grow faster</button>'
      + '<button class="gbtn" onclick="go(\'homeScreen\')">Back to portfolio</button>';

  } else {
    body.innerHTML =
      '<div style="background:rgba(0,212,170,.07);border:1px solid rgba(0,212,170,.2);border-radius:16px;padding:18px;margin-bottom:20px;text-align:center">'
      + '<div style="font-size:32px;margin-bottom:8px">🎉</div>'
      + '<div style="font-size:14px;font-weight:700;color:var(--accent);margin-bottom:4px">Withdrawal Unlocked!</div>'
      + '<div style="font-size:13px;color:var(--muted)">Your balance has reached the $10,000 goal</div></div>'

      + '<div class="field"><label class="flabel">Withdrawal amount</label>'
      + '<div class="fwrap"><svg class="ficon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
      + '<input class="finput" id="wdAmt" type="number" value="' + MIN_WITHDRAWAL + '" min="' + MIN_WITHDRAWAL + '" max="' + Math.floor(bal) + '" oninput="valWD()"></div>'
      + '<div class="ferror" id="wdErr">Minimum withdrawal is $' + MIN_WITHDRAWAL.toLocaleString() + '</div></div>'

      + '<div style="background:var(--card);border:1px solid var(--border);border-radius:13px;padding:15px;margin-bottom:16px">'
      + '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--muted)">Available balance</span><span style="font-weight:600;color:var(--green)">$' + fmt(bal) + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--muted)">Minimum withdrawal</span><span style="font-weight:500">$' + MIN_WITHDRAWAL.toLocaleString() + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px"><span style="color:var(--muted)">Processing time</span><span style="font-weight:500">1–3 business days</span></div></div>'

      + '<div class="field"><label class="flabel">Withdrawal wallet address</label>'
      + '<div class="fwrap"><svg class="ficon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>'
      + '<input class="finput" id="wdAddr" type="text" placeholder="Enter your wallet address"></div></div>'

      + '<div class="field"><label class="flabel">Select coin</label>'
      + '<div class="fwrap"><svg class="ficon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
      + '<select class="fselect" id="wdCoin"><option>BTC</option><option>ETH</option><option>XRP</option><option>SOL</option><option>BNB</option></select>'
      + '<svg class="sarrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>'

      + '<button class="pbtn" id="wdBtn" onclick="doWithdraw()">Request withdrawal</button>'
      + '<div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:28px;line-height:1.7">Withdrawal requests are reviewed within 1–3 business days. You will be notified by email.</div>';
  }
}

function valWD(){
  var val = parseFloat(document.getElementById('wdAmt').value)||0;
  var err = document.getElementById('wdErr');
  var btn = document.getElementById('wdBtn');
  if(val < MIN_WITHDRAWAL){
    err.classList.add('show');
    if(btn) btn.disabled = true;
  } else {
    err.classList.remove('show');
    if(btn) btn.disabled = false;
  }
}

function doWithdraw(){
  var addr = document.getElementById('wdAddr').value.trim();
  if(!addr){ alert('Please enter your wallet address'); return; }
  var amt = parseFloat(document.getElementById('wdAmt').value)||0;
  document.getElementById('withdrawBody').innerHTML =
    '<div class="sucwrap">'
    + '<div class="sucring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>'
    + '<div class="suctitle">Request submitted!</div>'
    + '<div class="sucsub">Your withdrawal of <strong>$' + fmt(amt) + '</strong> has been submitted and is under review. You will be notified by email within 1–3 business days.</div>'
    + '<div class="eta">Processing time: 1–3 business days</div>'
    + '<button class="pbtn" onclick="go(\'homeScreen\')">Back to portfolio</button></div>';
}

/* ======================================================
   DEPOSIT — updates user.deposited and daily rate
====================================================== */
var depStep = 1, depCoin = null, depNet = null;

var WALLET_ADDRESSES = {
  BTC:  'bc1ql479n42zrrdusylktyg3rr8gx5nc6ssqj2tjf8',
  ETH:  '0x86AEB9Ec6439E8f97d916393794E91D7d129332c',
  XRP:  'rU7hAmVPURuQdGTPhJjZc1ZMZtWwNcnL9L',
  USDT: '',
  SOL:  '8NVtKQsgdbnoHYSNPA4a7hiCKY5MPcr7bbGtifurepyw',
  BNB:  '0x86AEB9Ec6439E8f97d916393794E91D7d129332c'
};

var depCoins = [
  {sym:'BTC',cls:'btc',name:'Bitcoin'},
  {sym:'ETH',cls:'eth',name:'Ethereum'},
  {sym:'XRP',cls:'xrp',name:'XRP'},
  {sym:'SOL',cls:'sol',name:'Solana'},
  {sym:'BNB',cls:'bnb',name:'BNB'}
];
var depNets = {
  BTC:  [{id:'btc', name:'Bitcoin',        sub:'Native SegWit',  fee:'~$0.80', col:'#f7931a', abbr:'BTC'}],
  ETH:  [{id:'eth', name:'Ethereum',       sub:'ERC-20',         fee:'~$2.40', col:'#627eea', abbr:'ETH'}],
  XRP:  [{id:'xrp', name:'XRP Ledger',     sub:'Native XRP',     fee:'~$0.01', col:'#00aae4', abbr:'XRP'}],
  SOL:  [{id:'sol', name:'Solana',         sub:'Native SOL',     fee:'~$0.01', col:'#9945ff', abbr:'SOL'}],
  BNB:  [{id:'bnb', name:'BNB Smart Chain',sub:'BEP-20',         fee:'~$0.20', col:'#f3ba2f', abbr:'BSC'}]
};

function setDepSteps(){
  var els   = ['ds1','ds2','ds3'].map(function(x){return document.getElementById(x);});
  var lines = ['dl1','dl2'].map(function(x){return document.getElementById(x);});
  els.forEach(function(e){e.className='stp idle';});
  lines.forEach(function(l){l.className='sline';});
  if(depStep===1){ els[0].className='stp active'; }
  if(depStep===2){ els[0].className='stp done'; lines[0].className='sline done'; els[1].className='stp active'; }
  if(depStep===3){ els[0].className='stp done'; els[1].className='stp done'; els[2].className='stp active'; lines[0].className='sline done'; lines[1].className='sline done'; }
  document.getElementById('depTitle').textContent = depStep===1?'Select coin':depStep===2?'Select network':'Deposit address';
}

function renderDep(){
  setDepSteps();
  var b = document.getElementById('depBody');
  if(depStep===1){
    var h = '<label class="flabel" style="display:block;margin-bottom:10px">Choose coin to deposit</label><div class="coingrid">';
    depCoins.forEach(function(c){
      h += '<div class="coinopt'+(depCoin===c.sym?' on':'')+'" onclick="depPickCoin(&quot;'+c.sym+'&quot;)"><span class="csym '+c.cls+'">'+c.sym+'</span><span class="cnsm">'+c.name+'</span></div>';
    });
    h += '</div><div style="background:rgba(0,212,170,.07);border:1px solid rgba(0,212,170,.2);border-radius:12px;padding:13px;display:flex;gap:9px;margin-bottom:20px"><svg style="flex-shrink:0;margin-top:1px" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span style="font-size:12px;color:#6ee7da;line-height:1.7">Deposits increase your daily growth rate. Every $100 deposited adds +0.1%/day to your rate, up to 2.5%/day.</span></div>';
    h += '<div class="navrow"><button class="nxbtn" id="dn1" onclick="depNext()" '+(depCoin?'':'disabled')+'>Continue \u2192</button></div>';
    b.innerHTML = h;
  } else if(depStep===2){
    var nets = depNets[depCoin] || [];
    var h = '<label class="flabel" style="display:block;margin-bottom:10px">Select network for '+depCoin+'</label><div class="netlist">';
    nets.forEach(function(n){
      var sel = depNet===n.id;
      h += '<div class="netopt'+(sel?' on':'')+'" onclick="depPickNet(&quot;'+n.id+'&quot;)"><div class="netico" style="background:'+n.col+'22;color:'+n.col+'">'+n.abbr+'</div><div style="flex:1"><div class="netnm">'+n.name+'</div><div class="netsub">'+n.sub+'</div></div><div style="text-align:right"><div class="netfee">'+n.fee+'</div><div class="radio'+(sel?' on':'')+'"></div></div></div>';
    });
    h += '</div><div class="navrow"><button class="nbtn" onclick="depBack()">\u2190 Back</button><button class="nxbtn" id="dn2" onclick="depNext()" '+(depNet?'':'disabled')+'>Continue \u2192</button></div>';
    b.innerHTML = h;
  } else {
    var addr = WALLET_ADDRESSES[depCoin] || '';
    b.innerHTML = '<div style="background:rgba(0,212,170,.06);border:1px solid rgba(0,212,170,.15);border-radius:13px;padding:13px;display:flex;align-items:center;gap:10px;margin-bottom:16px"><svg style="flex-shrink:0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="1.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg><span style="font-size:12px;color:#6ee7da;line-height:1.6">After sending, your deposit will be confirmed and your daily growth rate will increase automatically.</span></div>'
      + '<div class="addrcard"><div class="qrwrap"><div class="qrbox" id="qrCanvas"></div></div>'
      + '<span class="addrlabel">Your '+depCoin+' deposit address</span>'
      + '<div class="addrbox"><span class="addrtxt">'+addr+'</span>'
      + '<button class="copybtn" onclick="doCopy(\''+addr+'\',this)">Copy</button></div></div>'
      + '<div class="warnbox"><svg style="flex-shrink:0;margin-top:2px" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span class="warntxt">Only send <strong>'+depCoin+'</strong> on the selected network. Wrong asset or network = permanent loss of funds.</span></div>'
      + '<div class="sharerow"><button class="sharebtn">\uD83D\uDCE4 Share</button><button class="sharebtn">\uD83D\uDCF7 Save QR</button></div>'
      + '<div class="navrow"><button class="nbtn" onclick="depBack()">\u2190 Back</button><button class="nxbtn" onclick="go(\'homeScreen\')">Done</button></div>';
    setTimeout(function(){
      var el = document.getElementById('qrCanvas');
      if(el && addr){
        new QRCode(el, { text: addr, width: 140, height: 140, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      }
    }, 60);
  }
}

function depPickCoin(sym){ depCoin=sym; depNet=null; renderDep(); }
function depPickNet(id){ depNet=id; renderDep(); }
function depNext(){ depStep++; renderDep(); }
function depBack(){ depStep--; renderDep(); }
function doCopy(txt,btn){
  if(navigator.clipboard){ navigator.clipboard.writeText(txt); }
  btn.textContent='Copied!';
  setTimeout(function(){ btn.textContent='Copy'; }, 2000);
}

/* ======================================================
   BUY CRYPTO
====================================================== */
var buyCoin = {sym:'BTC',price:97650,icon:'\u20BF',name:'Bitcoin',bg:'rgba(247,147,26,.1)',col:'#f7931a'};
var buyCoins = [
  {sym:'BTC', icon:'\u20BF', name:'Bitcoin',  col:'#f7931a', bg:'rgba(247,147,26,.1)',  price:97650},
  {sym:'ETH', icon:'\u039E', name:'Ethereum', col:'#627eea', bg:'rgba(98,126,234,.1)',  price:3610},
  {sym:'XRP', icon:'\u2715', name:'XRP',      col:'#00aae4', bg:'rgba(0,170,228,.1)',   price:2.25},
  {sym:'SOL', icon:'\u25CE', name:'Solana',   col:'#9945ff', bg:'rgba(153,69,255,.1)',  price:163},
  {sym:'BNB', icon:'B',       name:'BNB',      col:'#f3ba2f', bg:'rgba(243,186,47,.1)',  price:580}
];

function renderBuy(){
  var cpItems = buyCoins.map(function(c,i){
    return '<div class="cpitem'+(i===0?' on':'')+'" onclick="buySelCoin(this,'+i+')">'
      + '<div class="cpico" style="background:'+c.bg+';color:'+c.col+'">'+c.icon+'</div>'
      + '<div style="flex:1"><div class="cpnm">'+c.name+'</div><div class="cppx">$'+c.price.toLocaleString()+' / '+c.sym+'</div></div>'
      + '<div class="cpchk'+(i===0?' on':'')+'"></div></div>';
  }).join('');

  document.getElementById('buyBody').innerHTML =
    '<div class="amtcard">'
    + '<div class="amttop"><span class="amtlbl">You pay</span><span class="maxhint" onclick="setAmt(500)">Max \u2192</span></div>'
    + '<div class="fiatrow"><div class="currsel" id="currSel" onclick="toggleCurr()"><span id="bFlag">\uD83C\uDDFA\uD83C\uDDF8</span><span id="bCurr"> USD</span></div>'
    + '<input class="amtinput" id="bAmt" type="number" value="100" oninput="buyCalc()"></div>'
    + '<div class="quickrow"><div class="qbtn" onclick="setAmt(50)">$50</div><div class="qbtn on" onclick="setAmt(100)">$100</div><div class="qbtn" onclick="setAmt(250)">$250</div><div class="qbtn" onclick="setAmt(500)">$500</div></div>'
    + '</div>'
    + '<div class="coinpickcard"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span class="flabel">You receive</span></div>'
    + '<div class="pickrow" onclick="toggleCP()">'
    + '<div class="pickico" id="bCoinIco" style="background:rgba(247,147,26,.1);color:#f7931a">\u20BF</div>'
    + '<div><div class="picknm" id="bCoinName">Bitcoin</div><div class="picksym" id="bCoinSym">BTC</div></div>'
    + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
    + '<div class="youget"><div class="getval" id="bGetVal">0.001024</div><div class="getlbl">estimated</div></div></div>'
    + '<div class="cpicker" id="cpPicker">'+cpItems+'</div></div>'
    + '<div class="paysec"><label class="flabel" style="display:block;margin-bottom:10px">Payment method</label>'
    + '<div class="paygrid">'
    + '<div class="payopt on" onclick="selPay(this)"><div class="payicorow"><div class="payico" style="background:#1a56db22"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div></div><div class="paynm">Debit/Credit</div><div class="paysub">Visa, Mastercard</div></div>'
    + '<div class="payopt" onclick="selPay(this)"><div class="payicorow"><div class="payico" style="background:#00a86b22"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div></div><div class="paynm">Bank Transfer</div><div class="paysub">ACH \u00B7 1\u20133 days</div></div>'
    + '<div class="payopt" onclick="selPay(this)"><div class="payicorow"><div class="payico" style="background:#00aae422"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00aae4" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg></div></div><div class="paynm">Apple Pay</div><div class="paysub">Instant</div></div>'
    + '<div class="payopt" onclick="selPay(this)"><div class="payicorow"><div class="payico" style="background:#f59e0b22"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg></div></div><div class="paynm">Google Pay</div><div class="paysub">Instant</div></div>'
    + '</div></div>'
    + '<div class="ordsum">'
    + '<div class="ordrow"><span class="ordkey">Amount</span><span class="ordval" id="bSumAmt">$100.00</span></div>'
    + '<div class="ordrow"><span class="ordkey">MoonPay fee (1.5%)</span><span class="ordval" id="bSumFee">$1.50</span></div>'
    + '<div class="ordrow"><span class="ordkey">Network fee</span><span class="ordval">~$2.40</span></div>'
    + '<div class="ordrow"><span class="ordkey">Rate</span><span class="ordval" id="bSumRate">1 BTC = $97,650</span></div>'
    + '<div class="ordrow" style="border-bottom:none"><span class="ordkey" style="font-weight:600;color:var(--text)">You receive</span><span class="ordval acc" id="bSumGet">\u2248 0.001024 BTC</span></div></div>'
    + '<button class="buybtn" onclick="doBuy()">Buy <span id="bBuyLbl">BTC</span> now</button>'
    + '<div style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:28px;line-height:1.7">By continuing you agree to MoonPay&apos;s Terms &amp; Privacy Policy</div>';
  buyCalc();
}

var currIdx = 0;
var currs = [{flag:'\uD83C\uDDFA\uD83C\uDDF8',code:'USD'},{flag:'\uD83C\uDDEC\uD83C\uDDE7',code:'GBP'},{flag:'\uD83C\uDDEA\uD83C\uDDFA',code:'EUR'}];
function toggleCurr(){ currIdx=(currIdx+1)%currs.length; document.getElementById('bFlag').textContent=currs[currIdx].flag; document.getElementById('bCurr').textContent=' '+currs[currIdx].code; }

function buyCalc(){
  var amt = parseFloat(document.getElementById('bAmt').value)||0;
  var fee = amt*0.015, net=2.40, spend=Math.max(0,amt-fee-net);
  var get = buyCoin.price>0 ? spend/buyCoin.price : 0;
  var fmtG = get<0.01 ? get.toFixed(6) : get<1 ? get.toFixed(4) : get.toFixed(2);
  document.getElementById('bGetVal').textContent = fmtG;
  document.getElementById('bSumAmt').textContent = '$'+fmt(amt);
  document.getElementById('bSumFee').textContent = '$'+fee.toFixed(2);
  document.getElementById('bSumRate').textContent = '1 '+buyCoin.sym+' = $'+buyCoin.price.toLocaleString();
  document.getElementById('bSumGet').textContent = '\u2248 '+fmtG+' '+buyCoin.sym;
  document.getElementById('bBuyLbl').textContent = buyCoin.sym;
}
function setAmt(v){
  document.getElementById('bAmt').value = v;
  document.querySelectorAll('.qbtn').forEach(function(b){ b.classList.remove('on'); if(b.textContent==='$'+v) b.classList.add('on'); });
  buyCalc();
}
function toggleCP(){ document.getElementById('cpPicker').classList.toggle('open'); }
function buySelCoin(el,idx){
  document.querySelectorAll('.cpitem').forEach(function(i){ i.classList.remove('on'); i.querySelector('.cpchk').className='cpchk'; });
  el.classList.add('on'); el.querySelector('.cpchk').className='cpchk on';
  var c = buyCoins[idx]; buyCoin = c;
  document.getElementById('bCoinIco').textContent=c.icon; document.getElementById('bCoinIco').style.background=c.bg; document.getElementById('bCoinIco').style.color=c.col;
  document.getElementById('bCoinName').textContent=c.name; document.getElementById('bCoinSym').textContent=c.sym;
  document.getElementById('cpPicker').classList.remove('open');
  buyCalc();
}
function selPay(el){ document.querySelectorAll('.payopt').forEach(function(p){p.classList.remove('on');}); el.classList.add('on'); }
function doBuy(){
  document.getElementById('buyBody').innerHTML = '<div class="sucwrap"><div class="sucring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><div class="suctitle">Order placed!</div><div class="sucsub">Your purchase is being processed. Funds will arrive in your wallet shortly.</div><button class="pbtn" onclick="go(\'homeScreen\')">Back to portfolio</button></div>';
}

/* ======================================================
   KYC
====================================================== */
var kycStep=1, kycFront=false, kycBack=false, kycVideo=false;

function setKYCSteps(){
  var els   = ['ks1','ks2','ks3'].map(function(x){return document.getElementById(x);});
  var lines = ['kl1','kl2'].map(function(x){return document.getElementById(x);});
  els.forEach(function(e){e.className='stp idle';});
  lines.forEach(function(l){l.className='sline';});
  if(kycStep===1){ els[0].className='stp active'; }
  if(kycStep===2){ els[0].className='stp done'; lines[0].className='sline done'; els[1].className='stp active'; }
  if(kycStep===3){ els[0].className='stp done'; els[1].className='stp done'; els[2].className='stp active'; lines[0].className='sline done'; lines[1].className='sline done'; }
}

function renderKYC(){
  setKYCSteps();
  var b = document.getElementById('kycBody');
  var d = new Date();
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ds = d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
  if(kycStep===1){
    b.innerHTML = '<div style="font-size:15px;font-weight:600;margin-bottom:4px">Upload your ID document</div>'
      + '<div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px">We need to verify your identity before you can deposit, withdraw, or trade.</div>'
      + '<div class="infobanner"><svg style="flex-shrink:0;margin-top:1px" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span class="infotxt">Your documents are encrypted and stored securely. We will never share your information with third parties without your consent.</span></div>'
      + '<label class="flabel" style="display:block;margin-bottom:8px">Document type</label>'
      + '<div class="idtyperow"><div class="idtype on" onclick="selIDT(this)"><span class="idtype-ico">\uD83E\uDDEA</span><span class="idtype-lbl">National ID</span></div><div class="idtype" onclick="selIDT(this)"><span class="idtype-ico">\uD83D\uDEC2</span><span class="idtype-lbl">Passport</span></div><div class="idtype" onclick="selIDT(this)"><span class="idtype-ico">\uD83D\uDE97</span><span class="idtype-lbl">Driver\'s License</span></div></div>'
      + '<label class="flabel" style="display:block;margin-bottom:8px">Front of ID</label>'
      + '<div class="upzone'+(kycFront?' done':'')+'" onclick="kycUp(\'front\')">'+(kycFront?'<div class="upok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>front_id.jpg uploaded</div>':'<div class="upico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div class="uptitle">Upload front of ID</div><div class="upsub">Tap to browse</div><div class="fmts"><span class="fmt">JPG</span><span class="fmt">PNG</span><span class="fmt">PDF</span><span class="fmt">Max 10MB</span></div>')+'</div>'
      + '<label class="flabel" style="display:block;margin-bottom:8px;margin-top:4px">Back of ID</label>'
      + '<div class="upzone'+(kycBack?' done':'')+'" onclick="kycUp(\'back\')">'+(kycBack?'<div class="upok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>back_id.jpg uploaded</div>':'<div class="upico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div class="uptitle">Upload back of ID</div><div class="upsub">Tap to browse</div><div class="fmts"><span class="fmt">JPG</span><span class="fmt">PNG</span><span class="fmt">PDF</span><span class="fmt">Max 10MB</span></div>')+'</div>'
      + '<div class="navrow" style="margin-top:8px"><button class="nxbtn" onclick="kycNext()" '+(kycFront&&kycBack?'':'disabled')+'>Continue \u2192</button></div>';
  } else if(kycStep===2){
    b.innerHTML = '<div style="font-size:15px;font-weight:600;margin-bottom:4px">Record a short video</div>'
      + '<div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:14px">Hold your ID next to your face and read the phrase below aloud.</div>'
      + '<div class="phrasebox"><div class="phraselbl">SAY THIS PHRASE CLEARLY</div><div class="phrasetxt">"I am verifying my identity on NexVault today, '+ds+'"</div></div>'
      + '<div class="vilist"><div class="virow"><div class="vinum">1</div><div class="vitxt"><strong>Good lighting</strong> \u2014 your face and ID must be clearly visible.</div></div><div class="virow"><div class="vinum">2</div><div class="vitxt"><strong>Hold ID steady</strong> \u2014 keep it flat and fully in frame.</div></div><div class="virow"><div class="vinum">3</div><div class="vitxt"><strong>Speak clearly</strong> \u2014 read the phrase in a normal audible voice.</div></div><div class="virow"><div class="vinum">4</div><div class="vitxt"><strong>10\u201330 seconds</strong> \u2014 video must be under 100MB.</div></div></div>'
      + '<label class="flabel" style="display:block;margin-bottom:8px">Upload verification video</label>'
      + '<div class="upzone'+(kycVideo?' done':'')+'" onclick="kycUp(\'video\')">'+(kycVideo?'<div class="upok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>verification.mp4 uploaded</div>':'<div class="upico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div><div class="uptitle">Upload verification video</div><div class="upsub">Tap to browse</div><div class="fmts"><span class="fmt">MP4</span><span class="fmt">MOV</span><span class="fmt">Max 100MB</span></div>')+'</div>'
      + '<div class="warnbox" style="margin-top:12px"><svg style="flex-shrink:0;margin-top:1px" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><span class="warntxt">Do not submit a pre-recorded or edited video. Doing so will result in permanent account suspension.</span></div>'
      + '<div class="navrow"><button class="nbtn" onclick="kycBack()">\u2190 Back</button><button class="nxbtn" onclick="kycNext()" '+(kycVideo?'':'disabled')+'>Continue \u2192</button></div>';
  } else {
    b.innerHTML = '<div style="font-size:15px;font-weight:600;margin-bottom:4px">Review &amp; submit</div>'
      + '<div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px">Check all files are correct before submitting. Review takes 1\u201324 hours.</div>'
      + '<div class="revitem"><div class="revico" style="background:rgba(0,212,170,.1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div style="flex:1"><div class="revnm">Front of ID</div><div class="revsub">front_id.jpg \u00B7 2.4 MB</div></div><span class="readybadge">Ready</span></div>'
      + '<div class="revitem"><div class="revico" style="background:rgba(0,212,170,.1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div style="flex:1"><div class="revnm">Back of ID</div><div class="revsub">back_id.jpg \u00B7 1.9 MB</div></div><span class="readybadge">Ready</span></div>'
      + '<div class="revitem"><div class="revico" style="background:rgba(59,130,246,.1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div><div style="flex:1"><div class="revnm">Verification video</div><div class="revsub">verification.mp4 \u00B7 18.2 MB</div></div><span class="readybadge">Ready</span></div>'
      + '<div style="background:var(--surface);border:1.5px solid var(--border);border-radius:13px;padding:15px;margin:14px 0">'
      + '<label class="flabel" style="display:block;margin-bottom:10px">By submitting you confirm</label>'
      + '<label style="display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="kc1" onchange="kycChk()" style="margin-top:3px;accent-color:#00d4aa;flex-shrink:0"><span style="font-size:12px;color:var(--muted);line-height:1.6">The documents submitted are genuine and belong to me</span></label>'
      + '<label style="display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="kc2" onchange="kycChk()" style="margin-top:3px;accent-color:#00d4aa;flex-shrink:0"><span style="font-size:12px;color:var(--muted);line-height:1.6">I consent to NexVault processing my personal data for KYC purposes</span></label>'
      + '<label style="display:flex;align-items:flex-start;gap:9px;cursor:pointer"><input type="checkbox" id="kc3" onchange="kycChk()" style="margin-top:3px;accent-color:#00d4aa;flex-shrink:0"><span style="font-size:12px;color:var(--muted);line-height:1.6">I understand that false submissions may result in account suspension</span></label>'
      + '</div>'
      + '<button class="pbtn" id="kSubmit" disabled onclick="kycSubmit()">Submit for verification</button>'
      + '<button class="gbtn" onclick="kycBack()">\u2190 Back</button>';
  }
}

function selIDT(el){ document.querySelectorAll('.idtype').forEach(function(e){e.classList.remove('on');}); el.classList.add('on'); }
function kycUp(type){ setTimeout(function(){ if(type==='front')kycFront=true; else if(type==='back')kycBack=true; else kycVideo=true; renderKYC(); }, 400); }
function kycNext(){ kycStep++; renderKYC(); }
// function kycBack(){ kycStep--; renderKYC(); }
function kycChk(){
  var all = [document.getElementById('kc1'),document.getElementById('kc2'),document.getElementById('kc3')];
  document.getElementById('kSubmit').disabled = !all.every(function(c){return c.checked;});
}
function kycSubmit(){
  document.getElementById('kycBody').innerHTML = '<div class="sucwrap"><div class="sucring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><div class="suctitle">Documents submitted!</div><div class="sucsub">Your identity documents and video are under review. We\'ll notify you by email once complete.</div><div class="eta">Typical review time: 1 \u2013 24 hours</div><button class="pbtn" onclick="go(\'homeScreen\')">Back to portfolio</button></div>';
}


/* ======================================================
   NOTIFICATIONS
====================================================== */
var notifications = [
  { id:1, type:'bonus',    title:'Welcome Bonus Credited!',          sub:'$1,000 has been added to your portfolio. Start growing today!',       time:'Just now',    unread:true  },
  { id:2, type:'growth',   title:'Daily Earnings Update',            sub:'Your portfolio grew by +0.50% today. Keep it up!',                    time:'1h ago',      unread:true  },
  { id:3, type:'info',     title:'Verify your identity',             sub:'Complete KYC to unlock all features and protect your account.',        time:'2h ago',      unread:true  },
  { id:4, type:'deposit',  title:'Boost your daily rate',            sub:'Make a deposit to increase your growth rate up to 2.50%/day.',        time:'Yesterday',   unread:false },
  { id:5, type:'withdraw', title:'Withdrawal goal: $10,000',         sub:'You need $10,000 to unlock withdrawals. Deposit to grow faster.',      time:'Yesterday',   unread:false }
];

function notifIcon(type){
  var icons = {
    bonus:    {bg:'rgba(0,212,170,.12)',  col:'#00d4aa', svg:'<polyline points="20 6 9 17 4 12"/>'},
    growth:   {bg:'rgba(34,197,94,.12)', col:'#22c55e', svg:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'},
    info:     {bg:'rgba(59,130,246,.12)',col:'#3b82f6', svg:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'},
    deposit:  {bg:'rgba(245,158,11,.12)',col:'#f59e0b', svg:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/>'},
    withdraw: {bg:'rgba(239,68,68,.12)', col:'#ef4444', svg:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/>'}
  };
  var ic = icons[type] || icons.info;
  return '<div class="notif-ico" style="background:'+ic.bg+'">'
    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+ic.col+'" stroke-width="2">'+ic.svg+'</svg></div>';
}

function renderNotifs(){
  var el = document.getElementById('notifList');
  if(!el) return;
  if(notifications.length === 0){
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">No notifications yet</div>';
    return;
  }
  el.innerHTML = notifications.map(function(n){
    return '<div class="notif-item'+(n.unread?' unread':'')+'" onclick="readNotif('+n.id+')">'
      + notifIcon(n.type)
      + '<div style="flex:1;min-width:0">'
      + '<div class="notif-title">'+n.title+'</div>'
      + '<div class="notif-sub">'+n.sub+'</div>'
      + '<div class="notif-time">'+n.time+'</div>'
      + '</div>'
      + (n.unread ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px"></div>' : '')
      + '</div>';
  }).join('');
}

function toggleNotif(){
  var panel = document.getElementById('notifPanel');
  var chatW = document.getElementById('chatWidget');
  if(chatW) chatW.style.display = 'none';
  if(panel.style.display === 'none' || !panel.style.display){
    panel.style.display = 'block';
    renderNotifs();
  } else {
    panel.style.display = 'none';
  }
}

function readNotif(id){
  notifications = notifications.map(function(n){
    if(n.id === id) n.unread = false;
    return n;
  });
  updateNotifDot();
  renderNotifs();
}

function markAllRead(){
  notifications = notifications.map(function(n){ n.unread=false; return n; });
  updateNotifDot();
  renderNotifs();
}

function updateNotifDot(){
  var dot = document.getElementById('notifDot');
  if(!dot) return;
  var hasUnread = notifications.some(function(n){ return n.unread; });
  dot.className = 'notif-dot' + (hasUnread ? ' show' : '');
}

function addNotification(type, title, sub){
  var times = ['Just now'];
  notifications.unshift({ id: Date.now(), type:type, title:title, sub:sub, time:'Just now', unread:true });
  updateNotifDot();
  /* Flash the dot */
  var dot = document.getElementById('notifDot');
  if(dot){ dot.className = 'notif-dot show'; }
}

/* Push daily earnings notification every minute (demo) */
setInterval(function(){
  if(!user || !user.balance) return;
  var rate = getDailyRate ? getDailyRate() : 0.005;
  var earned = user.balance * rate;
  addNotification('growth',
    'Daily Earnings Update',
    'Your portfolio earned +$' + fmt(earned) + ' today at ' + (rate*100).toFixed(2) + '% daily rate!'
  );
}, 60000);

/* Close panels when clicking outside */
document.addEventListener('click', function(e){
  var panel = document.getElementById('notifPanel');
  var notifBtn = document.getElementById('notifBtn');
  var chatW = document.getElementById('chatWidget');
  if(panel && panel.style.display !== 'none'){
    if(!panel.contains(e.target) && !notifBtn.contains(e.target)){
      panel.style.display = 'none';
    }
  }
});

/* ======================================================
   CUSTOMER SUPPORT CHAT
====================================================== */
var chatOpen = false;
var chatHistory = [];
var chatTyping = false;

var autoReplies = [
  "Thanks for reaching out! A support agent will be with you shortly.",
  "We have received your message and will respond as soon as possible. Our team is available 24/7.",
  "Great question! Please give us a moment to look into this for you.",
  "We understand your concern. Our team is reviewing your account and will update you shortly.",
  "For urgent issues, please include your registered email so we can prioritise your request.",
  "Your satisfaction is our priority. We are working on a solution right now.",
  "Thank you for your patience. If you made a deposit, please allow 1-3 hours for it to reflect.",
  "Withdrawals are processed within 1-3 business days after approval. You will be notified by email."
];
var replyIdx = 0;

function openChat(){
  var w = document.getElementById('chatWidget');
  if(!w) return;
  chatOpen = true;
  w.style.display = 'flex';
  var panel = document.getElementById('notifPanel');
  if(panel) panel.style.display = 'none';
  if(chatHistory.length === 0){
    addAgentMsg("Hello " + (user.name || 'there') + "! Welcome to NexVault Support. How can we help you today?");
  }
  renderChat();
  var msgs = document.getElementById('chatMessages');
  if(msgs) msgs.scrollTop = msgs.scrollHeight;
}

function closeChat(){
  var w = document.getElementById('chatWidget');
  if(w) w.style.display = 'none';
  chatOpen = false;
}

function addAgentMsg(text){
  var now = new Date();
  var t = now.getHours() + ':' + (now.getMinutes()<10?'0':'') + now.getMinutes();
  chatHistory.push({ from:'agent', text:text, time:t });
}

function sendChat(){
  var input = document.getElementById('chatInput');
  if(!input || !input.value.trim()) return;
  var text = input.value.trim();
  var now = new Date();
  var t = now.getHours() + ':' + (now.getMinutes()<10?'0':'') + now.getMinutes();
  chatHistory.push({ from:'user', text:text, time:t });
  input.value = '';
  renderChat();
  /* Auto-scroll */
  var msgs = document.getElementById('chatMessages');
  if(msgs) msgs.scrollTop = msgs.scrollHeight;
  /* Show typing indicator then reply */
  setTimeout(function(){
    showTyping();
    setTimeout(function(){
      hideTyping();
      var reply = autoReplies[replyIdx % autoReplies.length];
      replyIdx++;
      addAgentMsg(reply);
      renderChat();
      if(msgs) msgs.scrollTop = msgs.scrollHeight;
      /* Also push a notification */
      addNotification('info', 'New message from Support', reply.substring(0,60) + '...');
    }, 2000);
  }, 500);
}

function showTyping(){
  chatTyping = true;
  renderChat();
  var msgs = document.getElementById('chatMessages');
  if(msgs) msgs.scrollTop = msgs.scrollHeight;
}
function hideTyping(){ chatTyping = false; }

function renderChat(){
  var el = document.getElementById('chatMessages');
  if(!el) return;
  var html = chatHistory.map(function(m){
    return '<div class="chat-msg '+m.from+'">'
      + '<div class="chat-bubble">'+m.text+'</div>'
      + '<div class="chat-time">'+m.time+'</div>'
      + '</div>';
  }).join('');
  if(chatTyping){
    html += '<div class="chat-msg agent">'
      + '<div class="chat-bubble" style="padding:8px 14px">'
      + '<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>'
      + '</div></div>';
  }
  el.innerHTML = html;
}

/* Init notification dot on load */
setTimeout(updateNotifDot, 500);


/* ======================================================
   TRADE / CHART SCREEN
====================================================== */
var chartCoins = [
  { sym:'BTC', name:'Bitcoin',  price:97650,  change:2.41,  col:'#f7931a', base:97650  },
  { sym:'ETH', name:'Ethereum', price:3610,   change:5.44,  col:'#627eea', base:3610   },
  { sym:'XRP', name:'XRP',      price:2.25,   change:-1.09, col:'#00aae4', base:2.25   },
  { sym:'SOL', name:'Solana',   price:163,    change:2.87,  col:'#9945ff', base:163    },
  { sym:'BNB', name:'BNB',      price:580,    change:1.12,  col:'#f3ba2f', base:580    }
];
var activeChartCoin = 0;
var chartTF = '1H';
var chartInterval = null;
var priceHistory = {};
var livePrice = {};

/* Seed price history for each coin */
function seedHistory(idx){
  var c = chartCoins[idx];
  var pts = 60;
  var prices = [];
  var p = c.base;
  for(var i = 0; i < pts; i++){
    var change = (Math.random() - 0.48) * (c.base * 0.004);
    p = Math.max(p + change, c.base * 0.88);
    prices.push(parseFloat(p.toFixed(4)));
  }
  priceHistory[idx] = prices;
  livePrice[idx] = prices[prices.length - 1];
}

function goTrade(){
  chartCoins.forEach(function(c, i){ seedHistory(i); });
  renderCoinTabs();
  renderMarketList();
  selectChartCoin(0);
  go('tradeScreen');
  startLivePrices();
}

function startLivePrices(){
  if(chartInterval) clearInterval(chartInterval);
  chartInterval = setInterval(function(){
    if(!document.getElementById('tradeScreen').classList.contains('active')){
      clearInterval(chartInterval);
      return;
    }
    chartCoins.forEach(function(c, i){
      var hist = priceHistory[i];
      var last = hist[hist.length - 1];
      var move = (Math.random() - 0.48) * (c.base * 0.003);
      var newP = Math.max(last + move, c.base * 0.85);
      hist.push(parseFloat(newP.toFixed(4)));
      if(hist.length > 80) hist.shift();
      livePrice[i] = newP;
      var pct = ((newP - c.base) / c.base) * 100;
      chartCoins[i].price = newP;
      chartCoins[i].change = pct;
    });
    drawChart(activeChartCoin);
    updatePriceHeader(activeChartCoin);
    updateMarketList();
  }, 1500);
}

function renderCoinTabs(){
  var el = document.getElementById('chartCoinTabs');
  if(!el) return;
  el.innerHTML = chartCoins.map(function(c, i){
    return '<div class="ctab'+(i===0?' on':'')+'" id="ctab'+i+'" onclick="selectChartCoin('+i+')">'+c.sym+'</div>';
  }).join('');
}

function selectChartCoin(idx){
  activeChartCoin = idx;
  document.querySelectorAll('.ctab').forEach(function(t,i){
    t.className = 'ctab' + (i===idx?' on':'');
  });
  updatePriceHeader(idx);
  drawChart(idx);
  updateStats(idx);
}

function updatePriceHeader(idx){
  var c = chartCoins[idx];
  var p = livePrice[idx] || c.price;
  var pct = c.change;
  var isUp = pct >= 0;
  var priceEl = document.getElementById('chartPrice');
  var badgeEl = document.getElementById('chartChangeBadge');
  var amtEl   = document.getElementById('chartChangeAmt');
  if(priceEl) priceEl.textContent = '$' + p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(badgeEl){
    badgeEl.textContent = (isUp?'+':'')+pct.toFixed(2)+'%';
    badgeEl.style.background = isUp ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
    badgeEl.style.color = isUp ? '#22c55e' : '#ef4444';
  }
  if(amtEl){
    var dollarChg = (p * Math.abs(pct) / 100);
    amtEl.textContent = (isUp?'+':'-') + '$' + dollarChg.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' today';
    amtEl.style.color = isUp ? '#22c55e' : '#ef4444';
  }
}

function updateStats(idx){
  var hist = priceHistory[idx] || [];
  if(!hist.length) return;
  var high = Math.max.apply(null, hist);
  var low  = Math.min.apply(null, hist);
  var open = hist[0];
  var vol  = (Math.random() * 40 + 10).toFixed(1) + 'B';
  var el;
  el = document.getElementById('statOpen'); if(el) el.textContent = open.toLocaleString('en-US',{maximumFractionDigits:2});
  el = document.getElementById('statHigh'); if(el) el.textContent = high.toLocaleString('en-US',{maximumFractionDigits:2});
  el = document.getElementById('statLow');  if(el) el.textContent = low.toLocaleString('en-US',{maximumFractionDigits:2});
  el = document.getElementById('statVol');  if(el) el.textContent = vol;
}

function setTF(btn, tf){
  chartTF = tf;
  document.querySelectorAll('.tf-btn').forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  /* Re-seed with different point count */
  seedHistory(activeChartCoin);
  drawChart(activeChartCoin);
  updateStats(activeChartCoin);
}

function drawChart(idx){
  var canvas = document.getElementById('priceChart');
  if(!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var W = canvas.parentElement.clientWidth - 40;
  var H = 220;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  var hist = priceHistory[idx] || [];
  if(hist.length < 2) return;

  var padL = 10, padR = 10, padT = 15, padB = 30;
  var cW = W - padL - padR;
  var cH = H - padT - padB;

  var minP = Math.min.apply(null, hist) * 0.9995;
  var maxP = Math.max.apply(null, hist) * 1.0005;
  var range = maxP - minP || 1;

  var c = chartCoins[idx];
  var isUp = c.change >= 0;
  var lineCol = isUp ? '#22c55e' : '#ef4444';

  /* X/Y helpers */
  function xOf(i){ return padL + (i / (hist.length - 1)) * cW; }
  function yOf(p){ return padT + (1 - (p - minP) / range) * cH; }

  /* Grid lines */
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for(var g = 0; g <= 4; g++){
    var gy = padT + (g / 4) * cH;
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
  }

  /* Price labels */
  ctx.fillStyle = '#475569';
  ctx.font = '10px DM Sans, sans-serif';
  ctx.textAlign = 'right';
  for(var g = 0; g <= 4; g++){
    var gp = maxP - (g / 4) * range;
    var gy = padT + (g / 4) * cH;
    ctx.fillText(gp > 100 ? Math.round(gp).toLocaleString() : gp.toFixed(4), W - padR, gy + 3);
  }

  /* Gradient fill under line */
  var grad = ctx.createLinearGradient(0, padT, 0, padT + cH);
  grad.addColorStop(0, isUp ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(hist[0]));
  for(var i = 1; i < hist.length; i++) ctx.lineTo(xOf(i), yOf(hist[i]));
  ctx.lineTo(xOf(hist.length - 1), padT + cH);
  ctx.lineTo(padL, padT + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* Line */
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(hist[0]));
  for(var i = 1; i < hist.length; i++) ctx.lineTo(xOf(i), yOf(hist[i]));
  ctx.strokeStyle = lineCol;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';
  ctx.stroke();

  /* Live dot */
  var lx = xOf(hist.length - 1);
  var ly = yOf(hist[hist.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = lineCol;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lx, ly, 7, 0, Math.PI * 2);
  ctx.fillStyle = isUp ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)';
  ctx.fill();
}

/* Tiny sparkline for market list */
function drawSparkline(canvasId, hist, isUp){
  var canvas = document.getElementById(canvasId);
  if(!canvas) return;
  var W = 60, H = 32;
  canvas.width  = W * 2; canvas.height = H * 2;
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  var minP = Math.min.apply(null, hist);
  var maxP = Math.max.apply(null, hist);
  var range = maxP - minP || 1;
  function xOf(i){ return (i / (hist.length - 1)) * W; }
  function yOf(p){ return H - 3 - ((p - minP) / range) * (H - 6); }
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(hist[0]));
  for(var i = 1; i < hist.length; i++) ctx.lineTo(xOf(i), yOf(hist[i]));
  ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function renderMarketList(){
  var el = document.getElementById('marketList');
  if(!el) return;
  var html = '';
  chartCoins.forEach(function(c, i){
    var isUp = c.change >= 0;
    var priceFmt = '$' + c.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    var chgFmt   = (isUp ? '+' : '') + c.change.toFixed(2) + '%';
    var chgCol   = isUp ? '#22c55e' : '#ef4444';
    html += '<div style="display:flex;align-items:center;gap:12px;background:var(--card);border:1.5px solid var(--border);border-radius:15px;padding:14px;cursor:pointer;margin-bottom:8px" onclick="selectChartCoin(' + i + ')">';
    html += '<div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;flex-shrink:0;color:' + c.col + '">' + c.sym.charAt(0) + '</div>';
    html += '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">' + c.name + '</div><div style="font-size:12px;color:var(--muted);margin-top:1px">' + c.sym + ' / USD</div></div>';
    html += '<canvas id="spark' + i + '" class="spark-canvas"></canvas>';
    html += '<div style="text-align:right;min-width:64px"><div style="font-size:13px;font-weight:700" id="mlPrice' + i + '">' + priceFmt + '</div>';
    html += '<div style="font-size:12px;font-weight:600;margin-top:2px;color:' + chgCol + '" id="mlChg' + i + '">' + chgFmt + '</div></div>';
    html += '</div>';
  });
  el.innerHTML = html;
  /* Draw sparklines after DOM update */
  setTimeout(function(){
    chartCoins.forEach(function(c, i){
      var hist = priceHistory[i] || [];
      if(hist.length > 1) drawSparkline('spark'+i, hist, c.change >= 0);
    });
  }, 50);
}

function updateMarketList(){
  chartCoins.forEach(function(c, i){
    var isUp = c.change >= 0;
    var priceEl = document.getElementById('mlPrice'+i);
    var chgEl   = document.getElementById('mlChg'+i);
    if(priceEl) priceEl.textContent = '$'+c.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    if(chgEl){
      chgEl.textContent = (isUp?'+':'')+c.change.toFixed(2)+'%';
      chgEl.style.color = isUp ? '#22c55e' : '#ef4444';
    }
    var hist = priceHistory[i] || [];
    if(hist.length > 1) drawSparkline('spark'+i, hist, isUp);
  });
  if(activeChartCoin !== null) updateStats(activeChartCoin);
}


/* ======================================================
   ACCOUNT SCREEN
====================================================== */
function goAccount(){
  updateAccountPage();
  go('accountScreen');
}

function updateAccountPage(){
  var name    = (user && user.name)    ? user.name    : (document.getElementById('homeUser').textContent || 'User');
  var bal     = (user && user.balance) ? user.balance : 1000;
  var dep     = (user && user.deposited) ? user.deposited : 0;
  var earned  = Math.max(0, bal - 1000 - dep);

  var avatar  = document.getElementById('acAvatar');
  var acName  = document.getElementById('acName');
  var acEmail = document.getElementById('acEmail');
  var acBal   = document.getElementById('acBalance');
  var acDep   = document.getElementById('acDeposited');
  var acEarn  = document.getElementById('acEarned');
  var refCode = document.getElementById('refCode');

  if(avatar)  avatar.textContent  = name.charAt(0).toUpperCase();
  if(acName)  acName.textContent  = name;
  if(acEmail) acEmail.textContent = name.toLowerCase().replace(' ','') + '@nexvault.com';
  if(acBal)   acBal.textContent   = '$' + bal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(acDep)   acDep.textContent   = '$' + dep.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(acEarn)  acEarn.textContent  = '$' + earned.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(refCode) refCode.textContent = 'NEXV-' + name.toUpperCase().replace(' ','').substring(0,4) + Math.floor(1000 + Math.random()*9000);

  renderTxHistory();
}

function renderTxHistory(){
  var el = document.getElementById('txList');
  if(!el) return;
  var txs = (user && user.history) ? user.history : [];
  if(!txs.length){
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">No transactions yet</div>';
    return;
  }
  var icons = {
    bonus:    { bg:'rgba(0,212,170,.1)',  col:'#00d4aa', svg:'<polyline points="20 6 9 17 4 12"/>' },
    growth:   { bg:'rgba(34,197,94,.1)', col:'#22c55e', svg:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
    deposit:  { bg:'rgba(59,130,246,.1)',col:'#3b82f6', svg:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/>' },
    withdraw: { bg:'rgba(239,68,68,.1)', col:'#ef4444', svg:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/>' }
  };
  el.innerHTML = txs.slice().reverse().slice(0,10).map(function(tx){
    var ic = icons[tx.type] || icons.growth;
    var isPos = tx.amount >= 0;
    var d = new Date(tx.date);
    var dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    return '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)">'
      + '<div style="width:38px;height:38px;border-radius:11px;background:'+ic.bg+';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+ic.col+'" stroke-width="2">'+ic.svg+'</svg></div>'
      + '<div style="flex:1"><div style="font-size:13px;font-weight:600">'+tx.label+'</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+dateStr+'</div></div>'
      + '<div style="font-size:13px;font-weight:700;font-family:\'Space Mono\',monospace;color:'+(isPos?'#22c55e':'#ef4444')+'">'+(isPos?'+':'')+tx.amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</div>'
      + '</div>';
  }).join('');
}

function toggle2FA(btn){
  var isOff = btn.textContent === 'Off';
  btn.textContent = isOff ? 'On' : 'Off';
  btn.style.background    = isOff ? 'rgba(0,212,170,.1)'  : 'var(--surface)';
  btn.style.borderColor   = isOff ? 'rgba(0,212,170,.2)'  : 'var(--border)';
  btn.style.color         = isOff ? 'var(--accent)'       : 'var(--muted)';
  addNotification('info', '2FA ' + (isOff ? 'Enabled' : 'Disabled'), 'Two-factor authentication has been ' + (isOff ? 'turned on' : 'turned off') + ' for your account.');
}

function copyRef(){
  var code = document.getElementById('refCode');
  if(code && navigator.clipboard) navigator.clipboard.writeText(code.textContent);
  var btn = document.getElementById('refCopyBtn');
  if(btn){ btn.textContent = 'Copied!'; setTimeout(function(){ btn.textContent = 'Copy'; }, 2000); }
}

function openChangePass(){
  var f = document.getElementById('changePwForm');
  if(f) f.style.display = 'block';
  f.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function closeChangePass(){
  var f = document.getElementById('changePwForm');
  if(f) f.style.display = 'none';
}
function submitChangePass(){
  var cur  = document.getElementById('pwCurrent').value;
  var nw   = document.getElementById('pwNew').value;
  var conf = document.getElementById('pwConfirm').value;
  if(!cur || !nw || !conf){ alert('Please fill in all fields.'); return; }
  if(nw !== conf){ alert('New passwords do not match.'); return; }
  if(nw.length < 8){ alert('Password must be at least 8 characters.'); return; }
  closeChangePass();
  addNotification('info', 'Password Updated', 'Your account password has been changed successfully.');
}

function doLogout(){
  if(!confirm('Are you sure you want to sign out?')) return;
  user = { name:'', balance:1000, deposited:0, joinedDate:Date.now(), lastGrowth:Date.now(), history:[] };
  go('authScreen');
  switchTab('in');
}

