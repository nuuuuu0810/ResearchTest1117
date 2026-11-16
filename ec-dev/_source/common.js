/* ===== 共通エンジン（ビルド時に各ページへインライン化） ===== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const h=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const yen=n=>(Number(n)<0?'−¥':'¥')+Math.abs(Number(n)).toLocaleString();

/* ---------- 進捗（目次と共有） ---------- */
const Progress={
  KEY:'ec-dev-progress',LOCK:'ec-dev-lock',
  get(){try{return JSON.parse(localStorage.getItem(this.KEY))||{}}catch(e){return{}}},
  set(id){try{const p=this.get();p[id]=true;localStorage.setItem(this.KEY,JSON.stringify(p))}catch(e){}},
  locked(){try{return localStorage.getItem(this.LOCK)==='1'}catch(e){return false}}
};
function postParent(msg){try{if(window.parent&&window.parent!==window)window.parent.postMessage(msg,'*')}catch(e){}}

/* ---------- エンジニアくん（アバター） ---------- */
const ENG_SVG=`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="31" fill="#111"/><path d="M12 64c2-12 10-17 20-17s18 5 20 17z" fill="#3b82f6"/><path d="M27 47h10l-5 7z" fill="#fff"/><circle cx="32" cy="30" r="14" fill="#ffd9b8"/><path d="M17 28c0-10 7-15 15-15s15 5 15 14c-3-4-8-6-12-6-6 0-11-1-14-4-1 4-2 8-4 11z" fill="#2b2118"/><rect x="21" y="27" width="9" height="7" rx="2.5" fill="none" stroke="#111" stroke-width="1.8"/><rect x="34" y="27" width="9" height="7" rx="2.5" fill="none" stroke="#111" stroke-width="1.8"/><path d="M30 30h4" stroke="#111" stroke-width="1.6"/><circle cx="25.5" cy="30.5" r="1.4" fill="#111"/><circle cx="38.5" cy="30.5" r="1.4" fill="#111"/><path d="M28 38q4 3 8 0" stroke="#b5552b" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M15 30a17 17 0 0 1 34 0" stroke="#e5e7eb" stroke-width="3" fill="none"/><rect x="12" y="28" width="5" height="9" rx="2" fill="#e5e7eb"/><path d="M15 37q0 7 9 7" stroke="#e5e7eb" stroke-width="2" fill="none"/><circle cx="25" cy="44" r="2" fill="#e5e7eb"/></svg>`;

const STAGES={plan:['企画','--st-plan'],req:['要件定義','--st-req'],des:['設計','--st-des'],dev:['開発','--st-dev'],test:['テスト','--st-test'],ops:['管理運用','--st-ops']};

/* ---------- ページ枠 ---------- */
const Page={
  cfg:null,state:'check',
  init(cfg){
    this.cfg=cfg;const pg=$('#pg'),app=$('#app');const st=STAGES[cfg.stage]||['',''];
    pg.insertBefore(h(`<header id="hdr"><span class="chip" style="background:var(${st[1]})">${st[0]}</span><h1>${cfg.title}</h1><span class="mis">${cfg.mission||''}</span><div class="steps" id="steps"></div></header>`),app);
    pg.appendChild(h(`<footer id="ftr"><div class="eng-av">${ENG_SVG}</div><div class="eng-msg" id="engMsg"><span class="eng-name">エンジニアくん</span><span id="engTxt"></span></div><div class="sp"></div>${cfg.hints?'<button class="hintbtn" id="hintBtn">💡 ヒント</button>':''}<button id="checkBtn"><span id="cbTxt">${cfg.checkLabel||'答え合わせ'}</span></button></footer>`));
    $('#checkBtn').onclick=()=>this._click();
    if(cfg.hints){let hi=0;$('#hintBtn').onclick=()=>{Eng.say('💡 '+cfg.hints[hi%cfg.hints.length],'');hi++}}
    if(cfg.intro)Eng.say(cfg.intro);
    if(cfg.steps)this.setStep(0);
    postParent({type:'page-ready',id:cfg.id});
  },
  setStep(i){if(!this.cfg)return;const n=this.cfg.steps;if(!n)return;this.step=i;$('#steps').innerHTML=`STEP ${Math.min(i+1,n)}/${n} `+Array.from({length:n},(_,k)=>`<i class="${k<i?'done':k==i?'on':''}"></i>`).join('')},
  setLabel(t){$('#cbTxt').textContent=t},
  busy(b){$('#checkBtn').disabled=b},
  async _click(){
    if(this.state==='next'){postParent({type:'next',id:this.cfg.id});if(window.parent===window)Eng.say('（目次から開くと、次のファイルへ進みます）');return}
    if(this._running)return;this._running=true;this.busy(true);Eng.clear();Eng.say('🔍 確認しているよ…');
    let r=false;try{r=await this.cfg.onCheck()}catch(e){console.error(e)}
    this._running=false;this.busy(false);
    if(r===true)this.complete();
  },
  complete(msg){
    if(this.state==='next')return;this.state='next';
    if(this.cfg.steps)this.setStep(this.cfg.steps);
    Progress.set(this.cfg.id);postParent({type:'exercise-complete',id:this.cfg.id});
    const b=$('#checkBtn');b.classList.add('next');this.setLabel(this.cfg.nextLabel||'次へ進む ▶');
    Eng.say(msg||this.cfg.doneMsg||'完成！すべて正解だよ。右下の「次へ進む」で次の工程へ進もう。','ok');confetti();
  }
};

/* ---------- エンジニアくん（メッセージ・指摘） ---------- */
const Eng={
  say(t,type=''){const m=$('#engMsg');if(!m)return;$('#engTxt').innerHTML=t;m.className='eng-msg '+type;m.classList.remove('shake');void m.offsetWidth;if(type==='ng')m.classList.add('shake')},
  clear(){$$('.engpop').forEach(e=>e.remove());$$('.err-glow').forEach(e=>e.classList.remove('err-glow'))},
  point(el,text,{type='ng',title,keep=false,glow=true,below=false}={}){
    if(!keep)this.clear();if(!el)return;
    if(glow)el.classList.add('err-glow');
    const pg=$('#pg'),pr=pg.getBoundingClientRect(),r=el.getBoundingClientRect();
    const t=title||(type==='ng'?'ここが違うみたい！':type==='ok'?'いいね！':'エンジニアくん');
    const p=h(`<div class="engpop ${type==='ng'?'':type}"><div class="av">${ENG_SVG}</div><div class="bb"><b class="t">${t}</b>${text}</div><span class="x">✕</span></div>`);
    p.querySelector('.x').onclick=()=>p.remove();pg.appendChild(p);
    const k=pr.width/1440,R={left:(r.left-pr.left)/k,right:(r.right-pr.left)/k,top:(r.top-pr.top)/k,bottom:(r.bottom-pr.top)/k};
    const pw=p.offsetWidth,ph=p.offsetHeight;let x=R.right+10,y=R.top-6;
    if(below){x=Math.min(1430-pw,Math.max(8,R.left));y=R.bottom+8}
    else if(x+pw>1430){x=R.left-pw-10;p.classList.add('flip')}
    if(!below&&x<8){x=Math.max(8,Math.min(1430-pw,R.left));y=R.bottom+8;p.classList.remove('flip')}
    y=Math.max(60,Math.min(825-62-ph,y));p.style.left=x+'px';p.style.top=y+'px';
    this.say(text.replace(/<br>/g,' '),type==='ng'?'ng':type==='ok'?'ok':'');
    return p;
  },
  errors(list){/* list: [{el,msg}] */
    this.clear();if(!list.length)return;list.forEach(e=>e.el&&e.el.classList.add('err-glow'));
    const more=list.length>1?`<br><small style="color:#912018">ほかにも赤く光っているところが ${list.length-1} か所あるよ。</small>`:'';
    this.point(list[0].el,list[0].msg+more,{keep:true});
  }
};

/* ---------- パズル（ドラッグ＆ドロップ / クリック選択） ---------- */
class Puzzle{
  constructor({pieces,pool,order,root,onChange,pieceCls='',shuffle:sh=true,swap=false}){
    this.swap=swap;this.selSlot=null;this.defs=pieces;this.pool=pool;this.root=root||$('#app');this.onChange=onChange||(()=>{});this.pieceCls=pieceCls;
    this.order=order||Object.keys(pieces);if(sh)this.order=shuffle(this.order);
    this.map=new Map();this.sel=null;this.locked=false;
    $$('.slot',this.root).forEach(s=>{if(!s.dataset.ph0)s.dataset.ph0=s.innerHTML});
    this.renderPool();this._bind();
  }
  slots(){return $$('.slot',this.root).filter(s=>!s.closest('[data-off]'))}
  mk(id,extra=''){const d=this.defs[id];return h(`<div class="piece ${this.pieceCls} ${d.cls||''} ${extra}" data-pid="${id}">${d.icon?`<span class="ic">${d.icon}</span>`:''}<span class="lb">${d.label}</span></div>`)}
  renderPool(){if(!this.pool)return;this.pool.innerHTML='';const used=new Set([].concat(...this.map.values()));
    this.order.forEach(id=>{const p=this.mk(id);if(used.has(id)&&!this.defs[id].inf)p.classList.add('used');if(this.sel===id)p.classList.add('sel');this.pool.appendChild(p)})}
  renderSlot(s){const ids=this.map.get(s)||[];s.classList.remove('ok');
    if(!ids.length){s.innerHTML=s.dataset.ph0||'';s.classList.remove('filled');return}
    s.innerHTML='';ids.forEach(id=>{const p=this.mk(id);p.dataset.from='1';s.appendChild(p)});s.classList.add('filled')}
  get(s){return (this.map.get(s)||[])[0]}
  getAll(s){return this.map.get(s)||[]}
  put(s,id,{silent}={}){
    if(!this.defs[id].inf)for(const [k,v] of this.map){if(v.includes(id)){this.map.set(k,v.filter(x=>x!==id));this.renderSlot(k)}}
    const bin=s.classList.contains('bin');const cur=this.map.get(s)||[];
    this.map.set(s,bin?[...cur.filter(x=>x!==id),id]:[id]);this.renderSlot(s);
    s.classList.remove('err-glow');this.sel=null;this.renderPool();if(!silent)this.onChange(s,id);
  }
  swapSlots(a,b){const x=this.map.get(a)||[],y=this.map.get(b)||[];this.map.set(a,y);this.map.set(b,x);this.renderSlot(a);this.renderSlot(b);$$('.slot',this.root).forEach(z=>z.classList.remove('selectable','err-glow'));this.onChange(b,x[0])}
  remove(s,id){const v=(this.map.get(s)||[]).filter(x=>x!==id);this.map.set(s,v);this.renderSlot(s);this.renderPool();this.onChange(s,null)}
  reset(){this.map.clear();this.slots().forEach(s=>this.renderSlot(s));this.renderPool()}
  check(){const empty=[],wrong=[];
    this.slots().forEach(s=>{const acc=(s.dataset.accept||'').split('|');const ids=this.map.get(s)||[];
      if(s.classList.contains('bin')){if(ids.some(i=>!acc.includes(i)))wrong.push(s);else if(acc.some(a=>!ids.includes(a)))empty.push(s)}
      else if(!ids.length)empty.push(s);else if(!acc.includes(ids[0]))wrong.push(s)});
    return {ok:!empty.length&&!wrong.length,empty,wrong}}
  /* 標準の答え合わせ：エンジニアくんが指摘 */
  judge(){const r=this.check();
    if(r.ok){this.slots().forEach(s=>s.classList.add('ok'));return true}
    const list=[...r.wrong.map(s=>({el:s,msg:s.dataset.hint||'ここに入るカードを、もう一度考えてみよう。'})),...r.empty.map(s=>({el:s,msg:s.classList.contains('bin')?'まだ足りないカードがあるみたい。':'まだ空いているところがあるよ。カードを置いてみよう。'}))];
    Eng.errors(list);return false}
  lock(b=true){this.locked=b}
  _bind(){
    let st=null;
    const down=e=>{if(this.locked)return;const p=e.target.closest('.piece');if(!p||!p.dataset.pid||!(this.root.contains(p)||(this.pool&&this.pool.contains(p))))return;
      if(p.classList.contains('used'))return;e.preventDefault();
      st={p,id:p.dataset.pid,from:p.dataset.from?p.closest('.slot'):null,x:e.clientX,y:e.clientY,g:null}};
    const move=e=>{if(!st)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;
      if(!st.g&&Math.hypot(dx,dy)>5){const r=st.p.getBoundingClientRect();st.g=st.p.cloneNode(true);st.g.classList.add('ghost');st.g.classList.remove('sel');st.g.style.width=r.width+'px';st.ox=e.clientX-r.left;st.oy=e.clientY-r.top;document.body.appendChild(st.g);st.p.style.opacity=.35}
      if(st.g){st.g.style.left=(e.clientX-st.ox)+'px';st.g.style.top=(e.clientY-st.oy)+'px';$$('.slot.hov').forEach(s=>s.classList.remove('hov'));const t=document.elementFromPoint(e.clientX,e.clientY);const s=t&&t.closest('.slot');if(s&&this.root.contains(s))s.classList.add('hov')}};
    const up=e=>{if(!st)return;const s0=st;st=null;$$('.slot.hov').forEach(s=>s.classList.remove('hov'));
      if(s0.g){s0.g.remove();s0.p.style.opacity='';const t=document.elementFromPoint(e.clientX,e.clientY);const s=t&&t.closest('.slot');
        if(s&&this.swap&&s0.from&&s!==s0.from){this.swapSlots(s0.from,s);return}
        if(s&&this.root.contains(s)&&!s.closest('[data-off]')){if(s0.from&&s0.from!==s&&this.defs[s0.id].inf){this.map.set(s0.from,(this.map.get(s0.from)||[]).filter(x=>x!==s0.id));this.renderSlot(s0.from)}this.put(s,s0.id)}
        else if(s0.from){this.remove(s0.from,s0.id)}
        return}
      /* クリック */
      if(s0.from&&this.swap){if(this.selSlot&&this.selSlot!==s0.from){const a=this.selSlot;this.selSlot=null;this.swapSlots(a,s0.from)}else{this.selSlot=this.selSlot===s0.from?null:s0.from;$$('.slot',this.root).forEach(x=>x.classList.toggle('selectable',x===this.selSlot))}return}
      if(s0.from){if(this.sel&&this.sel!==s0.id){this.put(s0.from,this.sel)}else this.remove(s0.from,s0.id);return}
      this.sel=this.sel===s0.id?null:s0.id;this.renderPool();this._mark()};
    document.addEventListener('pointerdown',down);document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
    this.root.addEventListener('click',e=>{if(this.locked||!this.sel)return;if(e.target.closest('.piece'))return;const s=e.target.closest('.slot');if(s&&!s.closest('[data-off]')){this.put(s,this.sel);this._mark()}});
  }
  _mark(){$$('.slot',this.root).forEach(s=>s.classList.toggle('selectable',!!this.sel&&!s.classList.contains('filled')))}
}

/* ---------- 線でつなぐ ---------- */
const Lines={
  svg(){let s=$('#pg>.lines-svg');if(!s){s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','lines-svg');$('#pg').appendChild(s)}return s},
  link(a,b,{color='#111',w=2,id}={}){if(!a||!b)return;const pr=$('#pg').getBoundingClientRect(),k=pr.width/1440,ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    const ac=(ra.left+ra.right)/2,bc=(rb.left+rb.right)/2;const lr=ac<bc;
    const x1=((lr?ra.right:ra.left)-pr.left)/k,y1=((ra.top+ra.bottom)/2-pr.top)/k,x2=((lr?rb.left:rb.right)-pr.left)/k,y2=((rb.top+rb.bottom)/2-pr.top)/k,mx=(x1+x2)/2;
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);p.style.stroke=color;p.style.strokeWidth=w;if(id)p.dataset.id=id;this.svg().appendChild(p);
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',x2);c.setAttribute('cy',y2);c.setAttribute('r',4);c.style.fill=color;this.svg().appendChild(c);return p},
  clear(){const s=$('#pg>.lines-svg');if(s)s.innerHTML=''}
};

function toast(t,cls=''){const e=h(`<div class="toast ${cls}">${t}</div>`);$('#pg').appendChild(e);setTimeout(()=>e.remove(),1800)}
function confetti(){const pg=$('#pg');const cs=['#111','#0a66d1','#12a150','#f5b400','#e5383b','#7a5af8'];
  for(let i=0;i<46;i++){const d=document.createElement('div');const x=Math.random()*1440,r=Math.random()*360;
    d.style.cssText=`position:absolute;left:${x}px;top:-12px;width:8px;height:12px;background:${cs[i%6]};z-index:99;border-radius:2px;pointer-events:none;transform:rotate(${r}deg)`;
    pg.appendChild(d);d.animate([{transform:`translate(0,0) rotate(${r}deg)`},{transform:`translate(${(Math.random()-.5)*200}px,${840}px) rotate(${r+540}deg)`}],{duration:1600+Math.random()*900,easing:'cubic-bezier(.3,.6,.5,1)'}).onfinish=()=>d.remove()}}

/* ---------- ECサイトの商品データ ---------- */
const PRODUCTS=[
  {id:'apple',name:'アップル',e:'🍎',price:300,stock:12,bg:'linear-gradient(135deg,#ffe3e0,#ffc9c2)'},
  {id:'grape',name:'グレープ',e:'🍇',price:500,stock:8,bg:'linear-gradient(135deg,#eee4ff,#d9c8ff)'},
  {id:'pine',name:'パイナップル',e:'🍍',price:800,stock:3,bg:'linear-gradient(135deg,#fff6d6,#ffe79a)'},
  {id:'orange',name:'オレンジ',e:'🍊',price:100,stock:20,bg:'linear-gradient(135deg,#ffefd9,#ffd9a8)'},
  {id:'straw',name:'ストロベリー',e:'🍓',price:400,stock:0,bg:'linear-gradient(135deg,#ffe0ea,#ffc2d4)'},
  {id:'banana',name:'バナナ',e:'🍌',price:200,stock:15,bg:'linear-gradient(135deg,#fffbe0,#fff0a8)'}];
const PD=Object.fromEntries(PRODUCTS.map(p=>[p.id,p]));

/* ---------- スマホのモックアップ ---------- */
const SCR_NAME={home:'ホーム画面',search:'Web検索',top:'トップページ',results:'検索結果',detail:'商品詳細',cart:'買い物カート',info:'お客様情報',done:'注文完了',custom:'',error:'エラー'};
const SCREENS={
  home:S=>`<div class="s-home"><div class="clock">9:41</div><div class="date">11月16日 月曜日</div><div class="apps">
    ${[['☀️','天気','#4aa3ff'],['🗓️','カレンダー','#fff'],['📷','カメラ','#555'],['🖼️','写真','#fff'],['🗺️','マップ','#e8f5e9'],['🎵','ミュージック','#ff3b5c'],['⚙️','設定','#8e8e93'],['📝','メモ','#ffd60a']].map(a=>`<div class="app"><i style="background:${a[2]}">${a[0]}</i>${a[1]}</div>`).join('')}
    </div><div class="dock"><div class="app" data-k="browser"><i style="background:#fff">🧭</i></div><div class="app"><i style="background:#34c759">💬</i></div><div class="app"><i style="background:#0a84ff">✉️</i></div><div class="app"><i style="background:#34c759">📞</i></div></div></div>`,
  search:S=>`<div class="brw"><div class="urlbar"><span class="lk">🔍</span><span data-k="q" style="flex:1"><span>${S.query||''}</span></span></div>
    ${S.query?`<div class="sres">
    ${S.fake?`<div class="it" data-k="r-fake"><div class="u"><span class="ad">広告</span>shopping-jp.xyz</div><div class="t">【公式】Shopping 激安セール90%OFF!!</div><div class="d">今だけ全品90%OFF。カード情報を入力するだけ。</div></div>`:''}
    <div class="it" data-k="r-shop"><div class="u">https://shopping.jp</div><div class="t">Shopping - 公式通販サイト</div><div class="d">Shopping.jpの公式サイト。食品や日用品から家具や家電までたくさん…</div></div>
    <div class="it"><div class="u">https://aiueoshop.jp</div><div class="t">あいうえおショップ</div><div class="d">食品や日用品から家具や家電まで…</div></div>
    <div class="it"><div class="u">https://abcde-shop.jp</div><div class="t">ABCDE Shopping</div><div class="d">毎日の暮らしに役立つ商品をお届け…</div></div>
    <div class="it"><div class="u">https://shop12345.jp</div><div class="t">ショップ12345</div><div class="d">まとめ買いでお得…</div></div></div>`:`<div style="padding:40px 20px;text-align:center;color:#999;font-size:12px">検索ワードを入力</div>`}</div>`,
  top:S=>`<div class="shop">${shopHead(S)}<div class="sbox" data-k="q"><span>${S.query||''}</span><i class="go" data-k="go">🔍</i></div>
    <div class="banner" data-k="banner"><small>AUTUMN FRUITS FAIR</small><b>秋のフルーツフェア</b><small>対象商品が最大20%OFF</small><span class="em">${S.textOnly?'[画像]':'🍇'}</span></div>
    <div class="cats">${[['🍎','くだもの','cat-fruit'],['🥬','やさい',''],['🧴','日用品',''],['📺','家電','']].map(c=>`<div class="cat" data-k="${c[2]}"><i>${S.textOnly?'':c[0]}</i>${c[1]}</div>`).join('')}</div>
    <div class="sec-t">おすすめ<small>すべて見る</small></div><div class="recs">${['apple','grape','pine'].map(i=>`<div class="rec"><div class="im" style="background:${PD[i].bg}">${S.textOnly?`<small style="font-size:9px">${PD[i].name}の画像</small>`:PD[i].e}</div>${PD[i].name}<br>${yen(PD[i].price)}</div>`).join('')}</div></div>`,
  results:S=>{let list=S.list||PRODUCTS.map(p=>p.id);return `<div class="shop">${shopHead(S)}<div class="sbox" data-k="q"><span>${S.query||'くだもの'}</span><i class="go">🔍</i></div>
    <div class="rbar"><span>${list.length}件の商品</span><span class="pill" data-k="sort">並び替え：${S.sortLabel||'おすすめ順'}</span></div>
    <div class="plist">${list.map(i=>{const p=PD[i];return `<div class="pitem" data-k="p-${i}"><div class="im" style="background:${p.bg}">${S.textOnly?`<small style="font-size:8px">画像</small>`:p.e}</div><div><div class="nm">${p.name}</div><div class="pr">${yen(p.price)}</div><div class="st ${p.stock?'':'no'}">${p.stock?'在庫あり':'売り切れ'}</div></div></div>`}).join('')}</div></div>`},
  detail:S=>{const p=PD[S.sel||'grape'];return `<div class="shop">${shopHead(S)}<div class="dt"><div class="back">‹ 検索結果に戻る</div>
    <div class="im" data-k="img" style="background:${p.bg}">${S.textOnly?`<span style="font-size:14px;color:#888">（${p.name}の写真）</span>`:p.e}</div>
    <div class="nm" data-k="name">${p.name}</div><div class="pr" data-k="price">${yen(p.price)} <small>税込 / ${p.stock?'在庫あり':'売り切れ'}</small></div>
    <div class="qty" data-k="qty"><span>個数</span><div class="b" data-k="qty-">−</div><div class="n">${S.qty||1}</div><div class="b" data-k="qty+">＋</div></div>
    <div class="mbtn" data-k="add">🛒 カートに入れる</div></div></div>`},
  cart:S=>{const c=S.cart.length?S.cart:[{id:'grape',qty:2}];const tot=c.reduce((a,x)=>a+PD[x.id].price*x.qty,0);return `<div class="shop">${shopHead(S)}<div class="cartv"><h3>🛒 買い物カート</h3>
    <div class="plist" style="padding:0">${c.map(x=>{const p=PD[x.id];return `<div class="pitem" data-k="c-${x.id}"><div class="im" style="background:${p.bg}">${S.textOnly?'':p.e}</div><div><div class="nm">${p.name}</div><div class="pr">${yen(p.price)}</div></div><div class="q">× ${x.qty}個<br><b style="color:#111;font-size:12px">${yen(p.price*x.qty)}</b></div></div>`}).join('')}</div>
    <div class="tot" data-k="total"><span>合計（税込）</span><b>${typeof S.totalOverride==='string'?S.totalOverride:yen(S.totalOverride??tot)}</b></div>
    <div class="mbtn sub" data-k="more" style="margin-top:auto">買い物を続ける</div><div class="mbtn" data-k="toinfo" style="margin-top:0">お客様情報の入力へ</div></div></div>`},
  info:S=>{const f=S.filled;const c=S.cart.length?S.cart:[{id:'grape',qty:2}];const tot=c.reduce((a,x)=>a+PD[x.id].price*x.qty,0);return `<div class="shop">${shopHead(S)}<div class="form"><h3>🚚 お客様情報</h3>
    <div class="fl">お名前</div><div class="fi" data-k="f-name" data-ph="山田 花子">${f?'山田 花子':''}</div>
    <div class="fl">住所</div><div class="fi" data-k="f-addr" data-ph="東京都〇〇区…">${f?'東京都港区南青山1-2-3':''}</div>
    <div class="fl">電話番号</div><div class="fi" data-k="f-tel" data-ph="090-0000-0000">${f?'090-1234-5678':''}</div>
    ${S.extraFields||''}
    <div class="fl">支払い方法</div><div class="pays" data-k="pay"><span class="pill ${S.pay!=='gift'?'on':''}">クレジット</span><span class="pill ${S.pay==='gift'?'on':''}">ギフトカード</span></div>
    <div class="fi" data-k="f-card" data-ph="カード番号">${f?'4980 1234 5678 9012':''}</div>
    ${S.consent||''}
    <div class="tot" data-k="total" style="margin-top:2px"><span>合計</span><b>${yen(tot)}</b></div><div class="mbtn" data-k="confirm" style="margin-top:0">注文を確定する</div></div></div>`},
  done:S=>`<div class="shop">${shopHead(S)}<div class="donev"><div class="ck">✓</div><b>注文を完了しました！</b><span style="color:#666;font-size:11px">注文番号：#20261116-0042<br>確認メールを送信しました</span><div class="mbtn sub" data-k="home" style="width:180px;margin:14px 0 0">トップへ戻る</div></div></div>`,
  error:S=>`<div class="err-scr"><div class="big">${S.errIcon||'⚠️'}</div><b>${S.errTitle||'ページを表示できません'}</b><small>${S.errText||''}</small></div>`,
  custom:S=>S.html||''
};
function shopHead(S){const n=(S.cart||[]).reduce((a,x)=>a+x.qty,0);return `<div class="shop-h"><span class="lg">S</span>Shopping<span class="sp"></span><span class="cartic" data-k="cartbtn">🛒${n?`<b>${n}</b>`:''}</span></div>`}

class Mock{
  constructor(host,{scale=1,nav=true,title}={}){
    this.host=host;this.S={query:'',cart:[],sel:'grape',qty:1,filled:false,pay:'credit',theme:''};this.hist=[];this.hi=-1;this.cur=null;
    const w=h(`<div class="mockwrap">${title?`<div class="tag">${title}</div>`:''}<div class="phone" style="${scale!==1?`transform:scale(${scale});transform-origin:top center;margin-bottom:${-556*(1-scale)}px`:''}"><div class="scr"><div class="island"></div><div class="sbar"><span>9:41</span><span class="r">▂▄▆ 📶 <span class="bat"></span></span></div><div class="view"></div><div class="movl"></div><div class="finger"></div><div class="homebar"></div></div></div>${nav?`<div class="phone-nav"><button class="pv">‹</button><span class="pnm">—</span><button class="nx">›</button></div>`:''}</div>`);
    host.appendChild(w);this.w=w;this.scr=$('.scr',w);this.view=$('.view',w);this.ovl=$('.movl',w);this.fg=$('.finger',w);
    if(nav){$('.pv',w).onclick=()=>this.nav(-1);$('.nx',w).onclick=()=>this.nav(1)}
  }
  _render(name){const S=this.S;this.view.innerHTML=`<div class="screen ${S.theme||''}">${SCREENS[name](S)}</div>`;this.cur=name}
  _upd(){const n=$(".phone-nav .pnm",this.w);if(!n)return;const e=this.hist[this.hi];n.textContent=e?(e.label||SCR_NAME[e.name]||e.name):'—';$('.pv',this.w).disabled=this.hi<=0;$('.nx',this.w).disabled=this.hi>=this.hist.length-1}
  async go(name,patch={},{push=true,label,wait=300}={}){Object.assign(this.S,patch);this._render(name);
    if(push){this.hist=this.hist.slice(0,this.hi+1);this.hist.push({name,S:JSON.parse(JSON.stringify(this.S)),label});this.hi=this.hist.length-1}this._upd();await sleep(wait)}
  nav(d){const i=this.hi+d;if(i<0||i>=this.hist.length)return;this.hi=i;const e=this.hist[i];this.S=JSON.parse(JSON.stringify(e.S));this._render(e.name);this._upd()}
  el(k){return this.view.querySelector(`[data-k="${k}"]`)}
  pos(el){const r=el.getBoundingClientRect(),s=this.scr.getBoundingClientRect(),sc=s.width/this.scr.offsetWidth;return{x:(r.left+r.width/2-s.left)/sc,y:(r.top+r.height/2-s.top)/sc}}
  async tap(k){const e=typeof k==='string'?this.el(k):k;if(!e)return;const p=this.pos(e);const f=this.fg;
    if(!f.classList.contains('on')){f.style.transition='none';f.style.left=(p.x+40)+'px';f.style.top=(p.y+80)+'px';void f.offsetWidth;f.style.transition='';f.classList.add('on')}
    f.style.left=p.x+'px';f.style.top=p.y+'px';await sleep(440);f.classList.add('press');
    const r=h(`<div class="ripple" style="left:${p.x}px;top:${p.y}px"></div>`);this.scr.appendChild(r);setTimeout(()=>r.remove(),600);await sleep(220);f.classList.remove('press');await sleep(120)}
  hideFinger(){this.fg.classList.remove('on')}
  async type(k,text,speed=60){const e=this.el(k);if(!e)return;const s=e.querySelector('span')||e;s.textContent='';for(const ch of text){s.textContent+=ch;await sleep(speed)}}
  hl(k,cls='mhl'){const e=typeof k==='string'?this.el(k):k;if(e)e.classList.add(cls);return e}
  unhl(){$$('.mhl,.mhl-ng',this.view).forEach(e=>e.classList.remove('mhl','mhl-ng'))}
  badge(html,{cls='',top,bottom}={}){const b=h(`<div class="mbadge ${cls}" style="${top!=null?`top:${top}px`:`bottom:${bottom??70}px`}">${html}</div>`);this.ovl.appendChild(b);return b}
  clearBadges(){this.ovl.innerHTML=''}
  /* --- 典型的な購入の流れ --- */
  async step(name){const S=this.S;
    switch(name){
      case 'websearch':await this.go('home');await this.tap('browser');await this.go('search',{query:''});await this.type('q','ショッピング');await this.go('search',{query:'ショッピング'},{wait:500});break;
      case 'opentop':if(this.cur!=='search')await this.go('search',{query:'ショッピング'});await this.tap('r-shop');await this.go('top',{query:''});break;
      case 'search':if(this.cur!=='top')await this.go('top',{query:''});await this.tap('q');await this.type('q','くだもの');await this.tap('go');await this.go('results',{query:'くだもの'});break;
      case 'select':if(this.cur!=='results')await this.go('results',{query:'くだもの'});await this.tap('p-grape');await this.go('detail',{sel:'grape',qty:1});break;
      case 'qty':if(this.cur!=='detail')await this.go('detail',{sel:'grape',qty:1});await this.tap('qty+');await this.go('detail',{qty:2},{push:false,wait:250});break;
      case 'add':if(this.cur!=='detail')await this.go('detail',{sel:'grape',qty:2});await this.tap('add');{const c=S.cart.filter(x=>x.id!==S.sel);c.push({id:S.sel,qty:S.qty});await this.go('detail',{cart:c},{push:false,wait:200});}toast('🛒 カートに追加しました','ok');await sleep(500);break;
      case 'opencart':await this.tap('cartbtn');await this.go('cart');break;
      case 'total':if(this.cur!=='cart')await this.go('cart');this.hl('total');await sleep(900);this.unhl();break;
      case 'pay':if(this.cur!=='cart')await this.go('cart');await this.tap('toinfo');await this.go('info',{filled:false});for(const k of ['f-name','f-addr','f-tel','f-card']){await this.tap(k)}await this.go('info',{filled:true},{push:false,wait:300});break;
      case 'confirm':if(this.cur!=='info')await this.go('info',{filled:true});await this.tap('confirm');await this.go('done');break;
      case 'backtop':if(this.cur!=='done')await this.go('done');await this.tap('home');await this.go('top',{cart:[]});break;
    }}
}

/* 単体で開いたときも画面に合わせて拡大縮小 */
(function(){const fit=()=>{const pg=$('#pg');if(!pg)return;const s=Math.min(innerWidth/1440,innerHeight/825);pg.style.transformOrigin='0 0';pg.style.transform=Math.abs(s-1)<.002?'':`scale(${s})`};addEventListener('resize',fit);fit()})();
/* 位置（#pg内の座標）を取る */
function relRect(el){const pr=$('#pg').getBoundingClientRect(),k=pr.width/1440,r=el.getBoundingClientRect();return{x:(r.left-pr.left)/k,y:(r.top-pr.top)/k,w:r.width/k,h:r.height/k,cx:(r.left+r.width/2-pr.left)/k,cy:(r.top+r.height/2-pr.top)/k}}

/* ---------- 段階型シナリオ：スマホで場面を再生 → リスク提示 → カードで対応 → 対応後のアニメ ---------- */
class Scenes{
  constructor({list,pieces,riskLabel='リスク',slotLabel='対応するカード',poolTitle='選択肢',histTitle='対応したこと'}){
    this.list=list;this.riskLabel=riskLabel;this.slotLabel=slotLabel;this.i=0;
    $('#app').innerHTML=`<div class="sc-grid"><div class="sc-mock" id="scMock"></div><div class="sc-mid"><div id="scCard"></div><div class="sc-ttl">${histTitle}</div><div class="sc-hist" id="scHist"></div></div><div class="sc-pool panel"><span class="tag" style="align-self:flex-start">${poolTitle}</span><div class="pool" id="scPool"></div></div></div>`;
    this.mock=new Mock($('#scMock'));
    this.P=new Puzzle({root:$('.sc-mid'),pool:$('#scPool'),pieces});
  }
  async start(){await this.show(0)}
  async show(i){const s=this.list[i];this.i=i;Page.setStep(i);
    $('#scCard').innerHTML=`<div class="panel sc-card"><div class="rk"><div class="ic">${s.icon||'⚠️'}</div><div><div class="lab">${this.riskLabel} ${i+1} / ${this.list.length}　${s.where?'｜ '+s.where:''}</div><h3>${s.title}</h3><p>${s.text}</p></div></div>
      <div class="ans"><b>${s.slotLabel||this.slotLabel} ▶</b><div class="slot" id="scSlot" data-accept="${s.accept.join('|')}" data-hint="${s.hint}" data-ph0='<span class="ph">ここにカードを置く</span>'><span class="ph">ここにカードを置く</span></div></div>
      <button class="rp" id="scReplay">▶ 場面をもう一度見る</button></div>`;
    $('#scReplay').onclick=()=>this.play();await this.play()}
  async play(){const s=this.list[this.i];this.P.lock(true);Page.busy(true);this.mock.clearBadges();
    try{await s.scene(this.mock)}catch(e){console.error(e)}
    this.mock.hideFinger();this.P.lock(false);Page.busy(false);Eng.say(s.ask||'スマホの中で問題が起きたね。どのカードで対応すればいいかな？')}
  async check(){const s=this.list[this.i],slot=$('#scSlot');const id=this.P.get(slot);
    if(!this.P.judge()){if(id&&s.ng)await s.ng(this.mock,id);return false}
    this.P.lock(true);this.mock.clearBadges();try{await s.fix(this.mock)}catch(e){console.error(e)}
    this.mock.hideFinger();
    $('#scHist').prepend(h(`<div class="hi"><span class="n">${this.i+1}</span><span class="r">${s.short||s.title}</span><span class="ar">➜</span><span class="a">${this.P.defs[id].label.replace(/<small>.*<\/small>/,'')}</span></div>`));
    Eng.say('✅ '+(s.ok||'解決！'),'ok');await sleep(1600);
    if(this.i<this.list.length-1){this.P.lock(false);await this.show(this.i+1);return false}
    return true}
}

/* ---------- ハブ：配置図の中の各タスクへ進む ---------- */
const Hub={
  init({subs,finale}){this.subs=subs;this.finale=finale;this.render();
    addEventListener('storage',()=>this.render());addEventListener('message',e=>{if(e.data&&e.data.type==='state')this.render()});
    document.addEventListener('click',e=>{const m=e.target.closest('.hubmk');if(!m)return;const i=+m.dataset.i,t=this.state()[i];if(!t.av){Eng.point(m,'前のタスクを先に終わらせよう。',{type:'info'});return}this.open(this.subs[i])})},
  state(){const p=Progress.get(),L=Progress.locked();let prevDone=true;
    return this.subs.map(s=>{const d=!!p[s.id];const av=!L||d||prevDone;const st={d,av,cur:!d&&prevDone};prevDone=prevDone&&d;return st})},
  render(){$$('.hubmk').forEach(e=>e.remove());const st=this.state();const pg=$('#pg');
    this.subs.forEach((s,i)=>{const t=st[i];const m=h(`<div class="hubmk ${t.d?'done':t.cur?'cur':''} ${t.av?'':'lock'}"><span class="n">${t.d?'✓':i+1}</span><span>${s.label}<small>${s.desc||''}</small></span><span class="go">${t.d?'もう一度':t.av?'開く ▶':'🔒'}</span></div>`);
      m.dataset.i=i;pg.appendChild(m);
      const r=relRect($(s.at));const pos=s.pos||'below';let x=r.cx-m.offsetWidth/2,y=r.y+r.h+10;
      if(pos==='above')y=r.y-m.offsetHeight-10;if(pos==='left'){x=r.x-m.offsetWidth-12;y=r.cy-m.offsetHeight/2}if(pos==='right'){x=r.x+r.w+12;y=r.cy-m.offsetHeight/2}if(pos==='in'){y=r.cy-m.offsetHeight/2}
      m.style.left=Math.max(8,x)+'px';m.style.top=y+'px';s._el=m});
    const nx=st.findIndex(t=>!t.d);this.allDone=nx<0;
    if(Page.state!=='next'){if(nx>=0){Page.setLabel('全体の動きを見る');Eng.point(this.subs[nx]._el,`次は <b>${this.subs[nx].label}</b> を見てみよう！ ボタンを押すと、くわしいページに進むよ。${this.subs[nx].say?'<br>'+this.subs[nx].say:''}`,{type:'info',title:`エンジニアくん（${nx+1}/${this.subs.length}）`,glow:false,below:true})}
      else{Eng.clear();Page.setLabel('▶ 全体の動きを見る');Eng.say('すべてのタスクが完了！ 右下のボタンで、全体がどう動くか確かめよう。','ok')}}
    Page.setStep(this.subs.filter((s,i)=>st[i].d).length)},
  open(s){if(window.parent!==window)postParent({type:'open',target:s.id});else location.href=s.file},
  async check(){const st=this.state();const nx=st.findIndex(t=>!t.d);
    if(nx>=0){Eng.point(this.subs[nx]._el,`まだ終わっていないタスクがあるよ。先に <b>${this.subs[nx].label}</b> をやってみよう。`,{title:'あと少し！'});return false}
    $$('.hubmk').forEach(e=>e.style.display='none');Eng.clear();await this.finale();return true}
};
