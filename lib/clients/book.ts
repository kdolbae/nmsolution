import { logoSvg } from '@/lib/brand-logo'
import { PRETENDARD_CSS, QUOTE_CSS, SUPPLIER, renderQuote, type Quote, type QuoteRecipient } from './quote'
import { esc, withBrandFont, withBrandLogo } from './proposal'
import { quoteSummaryHtml } from './quote-summary'

/**
 * 제본용 인쇄 (양면 인쇄 + 코일 제본).
 *
 * - 1쪽 표지(오른쪽 면), 2·3쪽 목차와 개요가 첫 펼침면.
 * - 제안서 본문은 소제목마다 새 쪽을 열지 않고 이어서 채운다(2026-10-16 kevin: 여백 없이 꽉 차게).
 *   소제목 머리는 다음 내용과 붙여 두고, 남은 자리가 조금 모자라는 그림은 조금 줄여 넣는다.
 * - 견적서는 늘 왼쪽 쪽에서 시작해 펼쳐 볼 수 있게 한다.
 * - 마지막은 뒤표지, 전체 쪽수는 짝수.
 *
 * 쪽 나눔은 브라우저가 실제 크기(A4, 210mm 폭)로 그려 보며 정한다. 화면 폭이 다르면 반응형 CSS 가 달라지므로
 * 바깥 페이지(bookShellHtml)가 210mm 폭 iframe 안에 이 문서(bookFrameHtml)를 띄워 쪽을 만든 뒤 그 iframe 을 인쇄한다.
 */

type BookClient = QuoteRecipient & { name: string; proposalHtml: string; quote: Quote }

const BOOK_CSS = `
@page{size:A4;margin:0}
html,body{margin:0;padding:0;background:#d9dde3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#nm-src{display:none}
#nm-book{width:210mm}
.pg{width:210mm;height:297mm;box-sizing:border-box;padding:15mm 14mm 0;position:relative;overflow:hidden;background:#fff;margin:0 0 6mm;break-after:page;page-break-after:always}
.pg:last-child{margin-bottom:0}
.pg-body{height:calc(297mm - 15mm - 17mm);overflow:hidden}
.pg-foot{position:absolute;left:14mm;right:14mm;bottom:7mm;display:flex;justify-content:space-between;align-items:center;font:500 8.5pt/1 Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#8a94a3;letter-spacing:.02em}
.pg-foot .no{font-weight:700;color:#0f2a44}
.pg.even .pg-foot{flex-direction:row}
.pg.odd .pg-foot{flex-direction:row-reverse}
.pg-run{position:absolute;top:7mm;left:14mm;right:14mm;font:600 8pt/1 Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#e8742a;letter-spacing:.12em;text-transform:uppercase}
.pg.odd .pg-run{text-align:right}
@media print{html,body{background:#fff}.pg{margin:0}}
/* 쪽 안에서는 웹페이지용 여백·배경을 걷어 낸다 */
.pg-body section{padding:0!important;margin:0!important;border:0!important;background:none!important;min-height:0!important}
.pg-body .wrap{max-width:none!important;padding:0!important;margin:0!important}
.pg-body .sec-head{margin-bottom:14px}
.pg-body .sec-head h2{margin-top:2px}
.pg-body .hero{margin:0 0 18px}
.pg-body .nmq .q-page{max-width:none;margin:0;padding:0;box-shadow:none;border:0;min-height:0}
.pg-body img,.pg-body svg{break-inside:avoid}
/* 쪽을 꽉 채우도록 글자·간격을 인쇄 크기로 줄인다 */
.pg-body .nm-flow{font-size:10pt;line-height:1.55}
.pg-body .nm-flow h2{font-size:17pt!important;margin:2px 0 6px!important}
.pg-body .nm-flow h3{font-size:12pt;margin:10px 0 6px}
.pg-body .nm-flow .sec-head{margin-bottom:8px}
.pg-body .nm-flow .sec-head p{font-size:10pt}
.pg-body .nm-flow + .nm-flow{margin-top:9mm!important;padding-top:6mm!important;border-top:.3mm solid #dde3ea!important}
.pg-body .nm-flow .steps,.pg-body .nm-flow .step{gap:12px!important}
.pg-body .nm-flow .step{padding:10px 0!important}
/* 표지·목차·메모·뒤표지 */
.nmb{font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1d2430;letter-spacing:-.01em}
.nmb-cover{height:100%;display:flex;flex-direction:column}
.nmb-cover .logo{height:13mm}
.nmb-cover .kicker{margin-top:52mm;font-size:11pt;font-weight:700;letter-spacing:.24em;color:#e8742a}
.nmb-cover h1{font-size:30pt;line-height:1.25;font-weight:800;color:#0f2a44;margin:5mm 0 0;letter-spacing:-.03em}
.nmb-cover .to{margin-top:7mm;font-size:15pt;font-weight:600;color:#0f2a44}
.nmb-cover .bar{width:18mm;height:1.6mm;background:#e8742a;margin:12mm 0 8mm}
.nmb-cover table{border-collapse:collapse;font-size:10.5pt}
.nmb-cover th{text-align:left;font-weight:500;color:#6b7686;padding:2.2mm 8mm 2.2mm 0;white-space:nowrap;vertical-align:top}
.nmb-cover td{padding:2.2mm 0;color:#1d2430;font-weight:600}
.nmb-cover .sup{margin-top:auto;border-top:.4mm solid #0f2a44;padding:6mm 0 12mm;font-size:9.5pt;line-height:1.7;color:#3d4756}
.nmb-cover .sup b{color:#0f2a44;font-size:11pt}
.nmb-toc h2{font-size:22pt;font-weight:800;color:#0f2a44;margin:0 0 10mm;letter-spacing:-.02em}
.nmb-toc .g{margin:0 0 6mm}
.nmb-toc .g>div:first-child{font-size:9pt;font-weight:700;letter-spacing:.16em;color:#e8742a;margin-bottom:2mm}
.nmb-toc .e{display:flex;align-items:baseline;gap:3mm;font-size:11.5pt;padding:1.6mm 0;border-bottom:.2mm solid #dde3ea}
.nmb-toc .e .t{flex:1;color:#1d2430}
.nmb-toc .e .p{font-weight:700;color:#0f2a44;font-variant-numeric:tabular-nums}
.nmb-toc .note{margin-top:8mm;font-size:9pt;color:#8a94a3;line-height:1.6}
.nmb-memo{height:100%;display:flex;flex-direction:column}
.nmb-memo .h{font-size:9pt;font-weight:700;letter-spacing:.2em;color:#b4bcc7}
.nmb-memo .lines{flex:1;margin-top:6mm;background:repeating-linear-gradient(#fff 0 9.4mm,#e3e7ec 9.4mm 9.6mm)}
.pg.back{background:#0f2a44;padding:0}
.pg.back .pg-body{height:297mm}
.nm-video-still{display:block!important;width:100%;height:auto;margin:0 auto}
.pg-body .table-wrap{overflow:visible!important}
.pg-body .gallery{grid-template-columns:1fr 1fr!important;gap:10px!important}
.pg-body .nm-flow .step{grid-template-columns:minmax(0,5fr) minmax(0,7fr)!important;gap:14px!important;align-items:start}
.pg-body .nm-flow .stepimg figcaption{font-size:9pt}
.pg-body .qsum .qcard .v{white-space:nowrap;font-size:20px!important}
.pg-body .qsum .qcard .s{font-size:11px}
.nmb-back{height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:0 16mm 22mm;box-sizing:border-box;color:#cfd8e4;font-size:10pt;line-height:1.8}
.nmb-back .logo{height:12mm;margin-bottom:8mm}
.nmb-back b{color:#fff}
.nmb-back .ph{font-size:20pt;font-weight:800;color:#fff;letter-spacing:-.01em}
`

/** 쪽을 만드는 스크립트 (iframe 안에서 실행) */
const BOOK_SCRIPT = String.raw`
(async function(){
  var src=document.getElementById('nm-src'), book=document.getElementById('nm-book');
  var meta=JSON.parse(document.getElementById('nm-meta').textContent);
  // 1. 접힌 내용 펼치기, 그림 미리 불러오기
  src.querySelectorAll('details').forEach(function(d){d.open=true});
  src.querySelectorAll('[hidden]').forEach(function(e){if(e.classList.contains('panel'))e.hidden=false});
  var probe=src.cloneNode(true);probe.id='';probe.style.cssText='position:absolute;left:-9999px;top:0;width:182mm;visibility:hidden;display:block';
  document.body.appendChild(probe);
  await Promise.all([].map.call(probe.querySelectorAll('img'),function(i){
    return (i.complete?Promise.resolve():new Promise(function(r){i.onload=i.onerror=r})).then(function(){return i.decode?i.decode().catch(function(){}):0});
  }));
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  // 화면에서 옆으로 스크롤되던 넓은 표는 쪽 폭에 맞게 줄인다
  var pt=probe.querySelectorAll('table'),st=src.querySelectorAll('table');
  [].forEach.call(pt,function(t,i){var w=t.parentElement.clientWidth;if(w&&t.scrollWidth>w+1&&st[i])st[i].style.zoom=String(Math.max(w/t.scrollWidth,.5))});
  probe.remove();

  var pages=[];
  function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
  function newPage(kind,run){
    var pg=el('div','pg'+(kind?' '+kind:'')),body=el('div','pg-body');
    pg.appendChild(body);pg._run=run||'';book.appendChild(pg);pages.push(pg);return pg;
  }
  function memoPage(){var pg=newPage('memo');pg.firstChild.appendChild(el('div','nmb nmb-memo','<div class="h">MEMO</div><div class="lines"></div>'));return pg}
  function padToLeft(){ if(pages.length%2===0) memoPage(); } // 다음 쪽 번호가 짝수(왼쪽)가 되게

  // 2. 단위(섹션) → 조각(item). 조각은 자기를 감싸던 상자들(chain)을 기억해 쪽마다 같은 상자를 다시 만든다
  var SPLIT=/(^|\s)(gallery|steps|diag|thumbs|vs|grid2|grid3|grid4|panel|trade-list)(\s|$)/;
  function shellOf(node){
    var tag=node.tagName;
    if(tag==='DETAILS'){var d=el('div',node.className);return {root:d,ins:d}}
    if(tag==='TABLE'){var t=node.cloneNode(false);[].forEach.call(node.children,function(c){if(c.tagName==='THEAD'||c.tagName==='COLGROUP'||c.tagName==='CAPTION')t.appendChild(c.cloneNode(true))});var tb=document.createElement('tbody');t.appendChild(tb);return {root:t,ins:tb}}
    var s=node.cloneNode(false);s.removeAttribute('id');return {root:s,ins:s};
  }
  var keySeq=0;function key(n){if(!n._k)n._k=++keySeq;return n._k}
  function rowsOf(table){var r=[];[].forEach.call(table.children,function(c){if(c.tagName==='TBODY'||c.tagName==='TFOOT')[].push.apply(r,c.children);else if(c.tagName==='TR')r.push(c)});return r}
  function childrenItems(node,chain){
    var link={node:node,key:key(node)},ch=chain.concat([link]),out=[];
    var kids=node.tagName==='TABLE'?rowsOf(node):[].filter.call(node.children,function(c){return c.tagName!=='SCRIPT'&&c.tagName!=='STYLE'});
    kids.forEach(function(k,i){
      if(node.tagName==='DETAILS'&&k.tagName==='SUMMARY'){out.push(item(k,ch,true));return}
      var it=item(k,ch,false);it.idx=i;out.push(it);
    });
    return out;
  }
  function isHead(n){return /^H[1-4]$/.test(n.tagName)||n.classList.contains('sec-head')||n.classList.contains('q-sec')||n.tagName==='SUMMARY'}
  function item(n,chain,glue){return {node:n,chain:chain,glue:glue||isHead(n)}}
  function expand(n,chain){
    // 알려진 묶음(사진 모음·단계·표)은 미리 풀어 둔다
    // 짧은 표(8줄 이하)는 쪼개지 않는다
    if(n.tagName==='TABLE'&&rowsOf(n).length>8)return childrenItems(n,chain);
    if(n.classList&&n.classList.contains('table-wrap')&&n.children.length===1&&n.firstElementChild.tagName==='TABLE'&&rowsOf(n.firstElementChild).length>8){
      return expandAll(childrenItems(n,chain).map(function(i){return i}));
    }
    if(n.className&&SPLIT.test(n.className)&&n.children.length>=1)return expandAll(childrenItems(n,chain));
    if((n.tagName==='OL'||n.tagName==='UL')&&n.children.length>3)return childrenItems(n,chain);
    return [item(n,chain,false)];
  }
  function expandAll(items){var out=[];items.forEach(function(it){var e=expand(it.node,it.chain);if(e.length===1&&e[0].node===it.node){out.push(it)}else{if(it.glue&&e.length)e[0].glue=true;[].push.apply(out,e)}});return out}

  // 3. 쪽에 조각 놓기
  function openCtx(unit,first){
    var pg=newPage('',first?'':unit.run),body=pg.firstChild,outer=unit.wrap();
    body.appendChild(outer.root);
    return {pg:pg,body:body,inner:outer.ins,stack:[],empty:true};
  }
  function over(ctx){return ctx.body.scrollHeight>ctx.body.clientHeight+1}
  function put(ctx,it,made){
    var depth=0;
    while(depth<ctx.stack.length&&depth<it.chain.length&&ctx.stack[depth].key===it.chain[depth].key)depth++;
    ctx.stack.length=depth;
    var parent=depth?ctx.stack[depth-1].ins:ctx.inner;
    for(var d=depth;d<it.chain.length;d++){
      var link=it.chain[d],sh=shellOf(link.node);
      if(link.node.tagName==='OL'&&it.idx)sh.root.setAttribute('start',String(it.idx+1));
      if(link.node.classList.contains('diag')&&it.idx)sh.root.style.counterReset='d '+it.idx;
      parent.appendChild(sh.root);made.push(sh.root);
      ctx.stack.push({key:link.key,ins:sh.ins});parent=sh.ins;
    }
    var c=it.node.cloneNode(true);parent.appendChild(c);made.push(c);it.el=c;
  }
  function tryPut(ctx,group){
    var made=[],saved=ctx.stack.slice();
    group.forEach(function(it){put(ctx,it,made)});
    if(over(ctx)){made.reverse().forEach(function(m){m.remove()});ctx.stack=saved;return false}
    ctx.empty=false;return true;
  }
  function groups(items){var gs=[],g=[];items.forEach(function(it){g.push(it);if(!it.glue){gs.push(g);g=[]}});if(g.length)gs.push(g);return gs}
  function fit(ctx){ // 혼자서도 넘치는 조각은 쪽에 맞게 줄인다
    if(!over(ctx))return;var z=ctx.body.clientHeight/ctx.body.scrollHeight;ctx.body.firstChild.style.zoom=String(Math.max(z,.35));
  }
  function place(unit,gs,breakAt){
    var start=pages.length,ctx=openCtx(unit,true);
    for(var i=0;i<gs.length;i++){
      if(breakAt===i&&!ctx.empty)ctx=openCtx(unit);
      var g=gs[i];
      if(tryPut(ctx,g))continue;
      if(!ctx.empty){ctx=openCtx(unit);if(tryPut(ctx,g))continue}
      // 빈 쪽에도 안 들어감: 쪼갤 수 있으면 쪼개서 다시
      var last=g[g.length-1],kids=last.node.children?[].filter.call(last.node.children,function(c){return c.tagName!=='SCRIPT'}):[];
      if(kids.length>1&&!/^(IMG|SVG|FIGURE|VIDEO|TR)$/.test(last.node.tagName)){
        var sub=childrenItems(last.node,last.chain);if(sub.length&&g.length>1)sub[0].glue=true;
        var rest=groups(g.slice(0,-1).concat(sub));gs.splice.apply(gs,[i,1].concat(rest));i--;continue;
      }
      var made=[];g.forEach(function(it){put(ctx,it,made)});ctx.empty=false;fit(ctx);
    }
    return start;
  }
  function bottoms(gs){ // 한 쪽에 놓였을 때 각 묶음이 끝나는 높이
    return gs.map(function(g){var b=0;g.forEach(function(it){if(it.el){var r=it.el.getBoundingClientRect();b=Math.max(b,r.bottom)}});return b});
  }
  var toc=[];
  // 본문은 소제목마다 새 쪽을 열지 않고 이어서 채운다(빈 여백을 줄이려고). 소제목 머리는 다음 내용과 붙여 둔다
  function flow(units,Z){
    var ctx=null;
    function startUnit(u){
      var outer=u.wrap();outer.root.classList.add('nm-flow');if(Z<1)outer.root.style.zoom=String(Z);
      if(!ctx){var pg=newPage('',u.run);ctx={pg:pg,body:pg.firstChild,inner:null,stack:[],empty:true}}
      else if(!ctx.empty&&used(ctx)>ctx.body.clientHeight*.86){ctx=freshPage(u)} // 쪽 끝에 머리만 걸리지 않게
      ctx.body.appendChild(outer.root);ctx.inner=outer.ins;ctx.stack=[];ctx.unit=u;ctx.outer=outer.root;
    }
    function used(c){var l=c.body.lastElementChild;return l?l.getBoundingClientRect().bottom-c.body.getBoundingClientRect().top:0}
    function freshPage(u){var pg=newPage('',u.run),c={pg:pg,body:pg.firstChild,inner:null,stack:[],empty:true,unit:u};return c}
    function cont(){ // 같은 소제목을 다음 쪽에서 이어 간다
      var u=ctx.unit,c=freshPage(u),outer=u.wrap();outer.root.classList.add('nm-flow');if(Z<1)outer.root.style.zoom=String(Z);c.body.appendChild(outer.root);c.inner=outer.ins;c.outer=outer.root;ctx=c;
    }
    function shrinkPut(g){ // 남은 자리에 그림을 조금 줄여서라도 넣는다
      var last=g[g.length-1].node,pic=/^(IMG|SVG|FIGURE)$/.test(last.tagName)||(last.querySelector&&last.querySelector('img,svg'));
      if(!pic)return false;
      var made=[],saved=ctx.stack.slice();g.forEach(function(it){put(ctx,it,made)});
      var el2=g[g.length-1].el,need=ctx.body.scrollHeight-ctx.body.clientHeight,h=el2.getBoundingClientRect().height;
      var z=(h-need-2)/h;
      if(z>=.72){el2.style.zoom=String(z);if(!over(ctx)){ctx.empty=false;return true}}
      made.reverse().forEach(function(m){m.remove()});ctx.stack=saved;return false;
    }
    units.forEach(function(u){
      var gs=groups(expandAll(u.items.map(function(n){return item(n,[],false)})));
      if(!gs.length)return;
      startUnit(u);
      var startPage=pages.length;
      for(var i=0;i<gs.length;i++){
        var g=gs[i];
        if(tryPut(ctx,g))continue;
        if(shrinkPut(g))continue;
        var wasEmpty=ctx.empty&&ctx.outer===ctx.body.firstChild;
        if(!wasEmpty){
          // 소제목 첫 묶음조차 못 넣었으면 빈 머리 상자를 걷어 내고 새 쪽에서 시작
          if(ctx.outer&&!ctx.outer.textContent.trim()&&!ctx.outer.querySelector('img,svg')){ctx.outer.remove();ctx=freshPage(u);var o=u.wrap();o.root.classList.add('nm-flow');if(Z<1)o.root.style.zoom=String(Z);ctx.body.appendChild(o.root);ctx.inner=o.ins;ctx.outer=o.root;ctx.unit=u;startPage=pages.length}
          else cont();
          if(tryPut(ctx,g))continue;
        }
        var last=g[g.length-1],kids=last.node.children?[].filter.call(last.node.children,function(c){return c.tagName!=='SCRIPT'}):[];
        if(kids.length>1&&!/^(IMG|SVG|FIGURE|VIDEO|TR)$/.test(last.node.tagName)){
          var sub=childrenItems(last.node,last.chain);if(sub.length&&g.length>1)sub[0].glue=true;
          var rest=groups(g.slice(0,-1).concat(sub));gs.splice.apply(gs,[i,1].concat(rest));i--;continue;
        }
        var made=[];g.forEach(function(it){put(ctx,it,made)});ctx.empty=false;fit(ctx);
      }
      // 소제목이 시작된 쪽 (머리가 앞 쪽 끝에 붙었으면 그 쪽)
      var at=pages.indexOf(ctx.pg),first=startPage-1;
      for(var k=0;k<pages.length;k++){if(pages[k].contains(ctx.outer)&&k<at)at=k}
      toc.push({group:u.run,title:u.title,page:Math.min(first,at)+1});
    });
  }
  function layout(unit){
    padToLeft();
    var items=expandAll(unit.items.map(function(n){return item(n,[],false)}));
    if(!items.length)return;
    var gs=groups(items),start=place(unit,gs);
    var n=pages.length-start;
    if(n===1&&gs.length>1){
      // 한 쪽이면 두 쪽(펼침면)으로 나눠 담는다: 높이가 반에 가장 가까운 곳에서 자름
      var top=pages[start].firstChild.getBoundingClientRect().top,b=bottoms(gs).map(function(v){return v-top}),half=b[b.length-1]/2,k=1,best=1e9;
      // 표·사진 묶음 중간보다 묶음 사이에서 자르는 쪽을 고른다
      function inner(j){var a=gs[j-1][gs[j-1].length-1].chain,c=gs[j][0].chain;return a.length&&c.length&&a[a.length-1].key===c[c.length-1].key&&gs[j][0].node.tagName==='TR'}
      for(var j=1;j<gs.length;j++){var d=Math.abs(b[j-1]-half)+(inner(j)?1e5:0);if(d<best){best=d;k=j}}
      // 한쪽이 너무 비면(전체의 25% 미만) 나누지 않고 오른쪽을 메모 쪽으로 둔다
      var cut=b[k-1],total=b[b.length-1];
      if(cut>=total*.25&&total-cut>=total*.25){pages.pop().remove();place(unit,gs,k)}
    }
    if((pages.length-start)%2)memoPage();
    toc.push({group:unit.run,title:unit.title,page:start+1});
  }

  // 4. 표지, 목차·개요, 본문, 견적서, 뒤표지
  var cover=newPage('cover');cover.firstChild.innerHTML=document.getElementById('nm-cover').innerHTML;
  var tocPg=newPage('toc');
  function sectionUnit(sec){
    var wrap=null;[].some.call(sec.children,function(c){if(c.classList.contains('wrap')){wrap=c;return true}});
    var holder=wrap||sec,items=[].filter.call(holder.children,function(c){return c.tagName!=='SCRIPT'&&c.tagName!=='STYLE'});
    var h2=sec.querySelector('h2'),k=sec.querySelector('.kicker');
    return {
      title:h2?h2.textContent.trim():'',run:k?k.textContent.trim():'',items:items,
      wrap:function(){var s=sec.cloneNode(false);if(!wrap)return {root:s,ins:s};var w=wrap.cloneNode(false);s.appendChild(w);return {root:s,ins:w}}
    };
  }
  var body=src.querySelector('.nm-proposal')||src;
  var intro=[],secs=[];
  [].forEach.call(body.children,function(c){
    if(c.tagName==='SECTION'){secs.push(c);return}
    if(secs.length)return; // 섹션 뒤의 꼬리(footer 등)는 뒤표지가 대신함
    if(/^(SCRIPT|STYLE|HEADER|NAV|FOOTER|LINK)$/.test(c.tagName)||c.classList.contains('lightbox')||c.classList.contains('topbar'))return;
    intro.push(c);
  });
  var units=[];
  if(intro.length)units.push({title:'',run:'',items:intro,intro:true,wrap:function(){var d=el('div','');return {root:d,ins:d}}});
  // 견적 소제목은 견적서 바로 앞으로 옮긴다
  var qsecs=secs.filter(function(s){return s.querySelector('[data-nm-qslot]')||s.id==='quote'||s.id==='price'});
  secs=secs.filter(function(s){return qsecs.indexOf(s)<0}).concat(qsecs);
  secs.forEach(function(s){
    var u=sectionUnit(s);
    // 내용 없이 제목만 남은 섹션은 뺀다(견적서 자리 등)
    var real=u.items.filter(function(c){return !c.classList.contains('sec-head')&&!c.hasAttribute('data-nm-qslot')&&(c.textContent.trim().length+c.querySelectorAll('img,svg,video,table').length)>0});
    if(real.length)units.push(u);
  });
  // 본문이 왼쪽 쪽에서 조금만 넘쳐 끝나면(견적서 앞에 메모 쪽이 생김) 글자를 조금씩 줄여 다시 채운다
  var flowStart=pages.length;
  for(var Z=1;;Z=Math.round((Z-.03)*100)/100){
    toc=[];flow(units,Z);
    var lastPg=pages[pages.length-1],lb=lastPg.firstChild,le=lb.lastElementChild;
    var fill=le?(le.getBoundingClientRect().bottom-lb.getBoundingClientRect().top)/lb.clientHeight:1;
    if(pages.length%2===1||fill>.45||Z<=.88)break;
    while(pages.length>flowStart)pages.pop().remove();
  }
  toc=toc.filter(function(t){return t.title});
  var q=document.getElementById('nm-quote');
  if(q&&q.firstElementChild){
    var page=q.querySelector('.q-page')||q.firstElementChild;
    // 견적서 마지막 쪽이 조금만 넘치면 글자를 조금 줄여 쪽 수를 줄여 본다(줄지 않으면 원래 크기)
    var qz=1,qStart=pages.length,base=-1;
    var qu={title:'견적서',run:'QUOTATION',items:[].slice.call(page.children),
      wrap:function(){var a=el('div','nmq'),b=el('div','q-page');if(qz<1)a.style.zoom=String(qz);a.appendChild(b);return {root:a,ins:b}}};
    for(;;){
      layout(qu);var n=pages.length-qStart;
      if(base<0)base=n;else if(n<base)break;
      if(qz<=.9){while(pages.length>qStart)pages.pop().remove();toc.pop();qz=1;layout(qu);break}
      while(pages.length>qStart)pages.pop().remove();toc.pop();qz=Math.round((qz-.03)*100)/100;
    }
  }
  if(pages.length%2===0)memoPage();
  var back=newPage('back');back.firstChild.innerHTML=document.getElementById('nm-back').innerHTML;

  // 5. 목차, 쪽 번호
  var html='<div class="nmb nmb-toc"><h2>목차</h2>',lastG=null;
  toc.forEach(function(t){
    if(t.group!==lastG){if(lastG!==null)html+='</div>';html+='<div class="g"><div>'+(t.group||'')+'</div>';lastG=t.group}
    html+='<div class="e"><span class="t">'+t.title.replace(/</g,'&lt;')+'</span><span class="p">'+t.page+'</span></div>';
  });
  if(lastG!==null)html+='</div>';
  html+='<div class="note">양면 인쇄 후 왼쪽을 묶는 제본 기준. 견적서는 왼쪽 쪽에서 시작해 펼쳐 볼 수 있음.</div></div>';
  tocPg.firstChild.innerHTML=html;
  var tb=tocPg.firstChild;if(tb.scrollHeight>tb.clientHeight+1)tb.firstChild.style.zoom=String(Math.max(tb.clientHeight/tb.scrollHeight,.6));
  pages.forEach(function(pg,i){
    var no=i+1;pg.classList.add(no%2?'odd':'even');
    if(pg.classList.contains('cover')||pg.classList.contains('back'))return;
    if(pg._run)pg.appendChild(el('div','pg-run',pg._run.replace(/</g,'&lt;')));
    pg.appendChild(el('div','pg-foot','<span class="no">'+no+'</span><span>'+meta.foot+'</span>'));
  });
  document.documentElement.setAttribute('data-pages',String(pages.length));
  document.documentElement.setAttribute('data-book-ready','1');
  if(window.parent!==window)window.parent.postMessage({nmBook:'ready',pages:pages.length},'*');
})();
`

function coverHtml(client: BookClient): string {
  const q = client.quote
  const rows = [
    ['현장', client.siteAddress],
    ['견적번호', q.number],
    ['제출일', q.date],
    ['견적 유효기간', `제출일로부터 ${q.validDays}일`],
  ].filter(([, v]) => v)
  return `<div class="nmb nmb-cover">
  <div class="logo">${logoSvg('horizontal', { height: '100%' })}</div>
  <div class="kicker">공사제안서 · 견적서</div>
  <h1>${esc(q.title || `${client.name} 공사`)}</h1>
  <div class="to">${esc(client.name)} 귀중</div>
  <div class="bar"></div>
  <table>${rows.map(([k, v]) => `<tr><th>${esc(k!)}</th><td>${esc(v!)}</td></tr>`).join('')}</table>
  <div class="sup"><b>${esc(SUPPLIER.name)}</b><br>대표 ${esc(SUPPLIER.ceo)} · 사업자등록번호 ${esc(SUPPLIER.bizNumber)}<br>${esc(SUPPLIER.address)}<br>대표전화 ${esc(SUPPLIER.phoneMain)} · 직통 ${esc(SUPPLIER.phoneMobile)} · ${esc(SUPPLIER.web)}</div>
</div>`
}

function backHtml(): string {
  return `<div class="nmb nmb-back">
  <div class="logo">${logoSvg('horizontal', { ink: '#FFFFFF', height: '100%' })}</div>
  <div><b>${esc(SUPPLIER.name)}</b></div>
  <div>공장 개보수 · 철골 · 지붕 · 설비</div>
  <div class="ph">${esc(SUPPLIER.phoneMain)}</div>
  <div>직통 ${esc(SUPPLIER.phoneMobile)} · ${esc(SUPPLIER.web)}</div>
  <div>${esc(SUPPLIER.address)}</div>
</div>`
}

/** 웹페이지의 인쇄 전용 규칙을 화면에서도 쓰게 바꾼다(쪽 나눔을 계산할 때와 실제 인쇄 때 모양이 같아야 함) */
function printRulesAlways(html: string): string {
  return html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_m, attrs: string, css: string) => `<style${attrs}>${css.replace(/@media\s+print/gi, '@media all')}</style>`)
}

/** 쪽 나눔을 하는 실제 문서. bookShellHtml 의 iframe 이 연다 */
export function bookFrameHtml(client: BookClient, title: string): string {
  let proposal = client.proposalHtml ? withBrandLogo(withBrandFont(client.proposalHtml)) : ''
  // 견적 자리 표시: 요약 카드는 넣고, 견적서 본문은 뒤에 따로 붙인다
  proposal = proposal
    .split('{{QUOTE_NO}}')
    .join(esc(client.quote.number))
    .replace('<!--NM:QUOTE-SUMMARY-->', () => quoteSummaryHtml(client.quote))
    .replace('<!--NM:QUOTE-->', '<i data-nm-qslot hidden></i>')
    // 영상은 인쇄되지 않으므로 대표 장면(poster)을 그림으로 넣는다
    .replace(/<video\b([^>]*)>[\s\S]*?<\/video>/gi, (m, attrs: string) => {
      const poster = attrs.match(/\sposter="([^"]+)"/i)?.[1]
      return poster ? `<img class="nm-video-still" src="${poster}" alt="영상 장면">` : ''
    })
    .replace(/\sloading="lazy"/gi, '')
  proposal = printRulesAlways(proposal)
  const head = proposal.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? ''
  const body = proposal.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? proposal
  // 제안서 스크립트(탭·라이트박스 등)는 인쇄에 필요 없고, 위치를 옮기면 오류가 날 수 있어 뺀다
  const bodyNoScript = body.replace(/<script\b[\s\S]*?<\/script>/gi, '')
  const quote = renderQuote(client.quote, client)
  const meta = { foot: `${SUPPLIER.name.replace(/\s*\(.*\)/, '')} · ${client.quote.title || client.name}` }

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=794">
<title>${esc(title)}</title>
${head.replace(/<title>[\s\S]*?<\/title>/i, '')}
<link rel="stylesheet" href="${PRETENDARD_CSS}">
<style>${QUOTE_CSS.replace(/@media\s+print/gi, '@media all')}</style>
<style>${BOOK_CSS}</style>
</head><body>
<div id="nm-src"><div class="nm-proposal">${bodyNoScript}</div><div id="nm-quote">${quote}</div></div>
<div id="nm-cover" hidden>${coverHtml(client)}</div>
<div id="nm-back" hidden>${backHtml()}</div>
<script type="application/json" id="nm-meta">${JSON.stringify(meta).replace(/</g, '\\u003c')}</script>
<div id="nm-book"></div>
<script>${BOOK_SCRIPT}</script>
</body></html>`
}

/** 인쇄 창: 210mm 폭 iframe 에 제본용 문서를 띄우고 다 만들어지면 그 iframe 을 인쇄한다 */
export function bookShellHtml(frameUrl: string, title: string): string {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="${PRETENDARD_CSS}">
<style>
body{margin:0;background:#c9ced6;font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
.bar{position:sticky;top:0;z-index:2;display:flex;gap:12px;align-items:center;justify-content:center;padding:10px 16px;background:#0f2a44;color:#fff;font-size:14px}
.bar button{font:inherit;font-weight:700;border:0;background:#e8742a;color:#fff;padding:7px 16px;cursor:pointer}
.bar span{color:#cfd8e4}
iframe{display:block;width:794px;border:0;margin:16px auto;background:transparent}
</style></head><body>
<div class="bar"><span id="st">쪽을 나누는 중…</span><button id="pr" disabled>인쇄</button></div>
<iframe id="f" src="${esc(frameUrl)}" title="제본용 인쇄 미리보기"></iframe>
<script>
var f=document.getElementById('f'),pr=document.getElementById('pr'),st=document.getElementById('st'),done=false;
function go(){try{f.contentWindow.focus();f.contentWindow.print()}catch(e){}}
pr.onclick=go;
window.addEventListener('message',function(e){
  if(!e.data||e.data.nmBook!=='ready'||done)return;done=true;
  var d=f.contentDocument;f.style.height=d.documentElement.scrollHeight+'px';
  st.textContent='총 '+e.data.pages+'쪽 · A4 양면 인쇄 · 왼쪽 제본 (인쇄 창에서 양면, 여백 없음, 배경 그래픽 켜기)';
  pr.disabled=false;setTimeout(go,300);
});
</script></body></html>`
}
