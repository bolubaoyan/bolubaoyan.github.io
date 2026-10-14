/* CSV 数据只读展示；时间计算统一使用北京时间。 */
(function (root) {
  'use strict';
  // 默认展示的申请年份；以后切换到 2027，只需修改下一行。
  var DEFAULT_YEAR = '2026';
  var DAY = 86400000;
  function beijingDay(now) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    var time = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
  }
  function instant(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+08:00$/.test(value || '') || !validDate(value.slice(0, 10))) return NaN;
    return Date.parse(value);
  }
  function cutoff(record) {
    if (record.precision === 'exact') return instant(record.deadline);
    // 仅有日期时，按当日结束计算；原始精度仍为 date，不改写维护表。
    if (record.precision === 'date' && validDate(record.deadline)) return Date.parse(record.deadline + 'T00:00:00+08:00') + DAY;
    return NaN;
  }
  function state(record, now) {
    now = now === undefined ? Date.now() : now;
    function result(kind, label, tone, hint) { return { kind:kind, label:label, expired:kind==='closed', tone:tone||'', hint:hint||'' }; }
    var end = cutoff(record);
    // 状态只由截止时间决定；旧状态、链接核验与开放时间不覆盖此规则。
    if (Number.isFinite(end) && now >= end) return result('closed', '已截止', 'closed');
    if (!Number.isFinite(end)) return result('open', '报名中');
    // “报名中”是按截止日期计算的清单状态，实际开放情况以原通知为准。
    if (end - now <= 3 * DAY) return result('open', '报名中', 'urgent', '3 天内截止');
    if (end - now <= 7 * DAY) return result('open', '报名中', 'week', '7 天内截止');
    return result('open', '报名中');
  }
  function compare(a, b, now, order) {
    var sa=state(a,now), sb=state(b,now), rank={open:0,closed:1};
    if(sa.kind!==sb.kind) return rank[sa.kind]-rank[sb.kind];
    var da=cutoff(a), db=cutoff(b);
    if(!Number.isFinite(da) || !Number.isFinite(db)) return Number.isFinite(da) ? -1 : Number.isFinite(db) ? 1 : 0;
    return order==='desc' ? db-da : da-db;
  }
  function matches(record, filters, now) {
    if(filters.year !== 'all' && record.year !== filters.year) return false;
    now = now === undefined ? Date.now() : now;
    var value=state(record,now), remaining=cutoff(record)-now;
    if(filters.status==='open' && value.expired) return false;
    if(filters.status==='closed' && !value.expired) return false;
    if(filters.status==='within3' || filters.status==='within7') {
      var days=filters.status==='within3' ? 3 : 7;
      if(value.expired || !Number.isFinite(remaining) || remaining<=0 || remaining>days*DAY) return false;
    }
    var search=(record.search || '').toLocaleLowerCase().replace(/\s+/g,'');
    var query=(filters.query || '').toLocaleLowerCase().replace(/\s+/g,'');
    return search.indexOf(query)>=0;
  }
  function beijingClock(now) { return new Date(now + 8 * 3600000).toISOString().slice(0,19).replace('T',' '); }
  function countdown(record, now) {
    if(state(record,now).expired) return '';
    var end=cutoff(record);
    if(!Number.isFinite(end)) return '';
    var seconds=Math.max(0,Math.ceil((end-now)/1000));
    var days=Math.floor(seconds/86400), hours=Math.floor(seconds%86400/3600), minutes=Math.floor(seconds%3600/60);
    return '距截止 '+days+' 天 '+String(hours).padStart(2,'0')+':'+String(minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  }
  function schoolKey(value) { return value.replace(/（/g,'(').replace(/）/g,')').replace(/\s/g,''); }
  var aliases={
    '哈尔滨工业大学(深圳)':'哈尔滨工业大学','哈尔滨工业大学(威海)':'哈尔滨工业大学',
    '电子科技大学(深圳)':'电子科技大学','清华大学(深圳)':'清华大学',
    '华北电力大学(保定)':'华北电力大学','北京理工大学(珠海校区)':'北京理工大学',
    '中国石油大学(北京)克拉玛依校区':'中国石油大学(北京)'
  };
  var api={state:state,compare:compare,matches:matches,cutoff:cutoff,beijingDay:beijingDay,schoolKey:schoolKey,schoolAliases:aliases,beijingClock:beijingClock,countdown:countdown};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  if(!root.document) return;
  var document=root.document, list=document.getElementById('deadline-list'), form=document.getElementById('deadline-filters');
  if(!list || !form) return;
  var siteBase = new URL('../../', document.currentScript.src);
  var get=function(id){return document.getElementById(id);};
  var yearSel=get('ddl-year'),statusSel=get('ddl-status'),sortSel=get('ddl-sort'),searchInput=get('ddl-search');
  var clockEl=get('ddl-current-time');
  var countEl=get('ddl-count'),emptyEl=get('ddl-empty'),clearBtn=get('ddl-clear'),metaEl=get('ddl-meta-checked');
  var data=root.BOLU_DDL, records=data && Array.isArray(data.records) ? data.records : [];
  var logos=root.BOLU_SCHOOL_LOGOS || {};

  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
  function link(text,href){var a=el('a',null,text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
  var items=records.map(function(record){
    var article=el('article','deadline-record'); article.id=record.id;
    var summary=el('div','deadline-summary'), head=el('div','deadline-school');
    var badge=el('span','school-badge'); badge.setAttribute('aria-hidden','true');
    var fallback=el('span','school-monogram',record.school.slice(0,2)); badge.appendChild(fallback);
    var key=schoolKey(record.school), logo=logos[key] || logos[aliases[key]];
    if(logo){
      var img=el('img'); img.src=new URL(logo,siteBase).href;img.alt='';img.width=42;img.height=42;img.loading='lazy';img.decoding='async';
      img.addEventListener('load',function(){fallback.hidden=true;});
      img.addEventListener('error',function(){img.hidden=true;fallback.hidden=false;});
      badge.appendChild(img);
    }
    head.appendChild(badge);
    var schoolCopy=el('div','deadline-school-copy');
    schoolCopy.appendChild(el('h3',null,record.dept ? record.school+' - '+record.dept : record.school));
    head.appendChild(schoolCopy);
    summary.appendChild(head);
    var dateCell=el('div','deadline-date');
    if(record.deadline && record.precision==='exact'){
      var t=el('time',null,record.deadline.slice(0,10)+' '+record.deadline.slice(11,16));t.dateTime=record.deadline;dateCell.appendChild(t);
    }else if(record.deadline && record.precision==='date'){
      var d=el('time',null,record.deadline+' 24:00');d.dateTime=record.deadline;dateCell.appendChild(d);
      dateCell.appendChild(el('span','time-note'));
    }else dateCell.appendChild(el('span','deadline-unknown',record.dateText || '截止时间待确认'));
    var countdownEl=el('span','deadline-countdown');dateCell.appendChild(countdownEl);
    summary.appendChild(dateCell);
    var statusCell=el('div'),label=el('span','deadline-status');
    statusCell.appendChild(label);summary.appendChild(statusCell);
    var srcCell=el('div');
    if(record.url)srcCell.appendChild(link('通知原文 ↗',record.url));else srcCell.appendChild(el('span','muted','暂无来源'));
    summary.appendChild(srcCell);article.appendChild(summary);
    if(record.note || record.applyUrl || record.checked || record.validity==='review'){
      var box=el('div','deadline-notes');
      if(record.validity==='review')box.appendChild(el('p',null,'此条信息仍需核实，请以院校通知为准。'));
      if(record.note)box.appendChild(el('p',null,'备注：'+record.note));
      if(record.checked)box.appendChild(el('p',null,'此条核验日期：'+record.checked));
      if(record.applyUrl){var p=el('p');p.appendChild(link('前往报名系统 ↗',record.applyUrl));box.appendChild(p);}
      schoolCopy.appendChild(box);
    }
    return {record:record,el:article,label:label,countdownEl:countdownEl};
  });
  var recordYears=Array.from(new Set(records.map(function(r){return r.year;}))).sort().reverse();
  var years=Array.from(new Set(recordYears.concat(data && Array.isArray(data.years) ? data.years : [], [DEFAULT_YEAR]))).sort().reverse();
  years.forEach(function(y){var o=el('option',null,y+'('+ (Number(y) + 1) +'年硕士入学)');o.value=y;o.defaultSelected=y===DEFAULT_YEAR;yearSel.appendChild(o);});
  yearSel.value=DEFAULT_YEAR;
  if(metaEl)metaEl.textContent=data && data.checked ? '最近单条核验：'+data.checked : '来源：历史清单整理，核验日期未记录';
  var visibleItems=[], nextBoundary=Infinity;
  function updateClock(now) {
    if(clockEl){clockEl.textContent=beijingClock(now);clockEl.dateTime=new Date(now).toISOString();}
    visibleItems.forEach(function(it){var text=countdown(it.record,now);it.countdownEl.textContent=text;it.countdownEl.hidden=!text;});
  }
  function refresh(){
    var now=Date.now(),filters={year:yearSel.value,status:statusSel.value,query:searchInput.value},frag=document.createDocumentFragment(),visible=0;
    visibleItems=[];nextBoundary=Infinity;
    items.forEach(function(it){
      var end=cutoff(it.record),start=instant(it.record.start);
      [end,end-3*DAY,end-7*DAY,start].forEach(function(boundary){if(Number.isFinite(boundary)&&boundary>now)nextBoundary=Math.min(nextBoundary,boundary);});
    });
    items.slice().sort(function(a,b){return compare(a.record,b.record,now,sortSel ? sortSel.value : 'asc');}).forEach(function(it){
      var value=state(it.record,now);it.label.textContent=value.label;it.el.dataset.tone=value.tone;
      if(matches(it.record,filters,now)){frag.appendChild(it.el);visible++;visibleItems.push(it);}
    });
    list.replaceChildren(frag);updateClock(now);countEl.textContent='筛选出 '+ visible+' 条截止信息';
    var h2=emptyEl.querySelector('h2'),p=emptyEl.querySelector('p:not(.eyebrow)');
    if(!data || !Array.isArray(data.records)){h2.textContent='清单暂时未能加载。';p.textContent='请刷新页面后重试，或稍后再来查看。';countEl.textContent='清单加载失败';}
    else if(!items.length){h2.textContent='暂未收录院校通知。';p.textContent='维护者录入后，将在这里显示。';}
    else if(!visible){h2.textContent='没有符合条件的信息。';p.textContent='试着修改关键词或报名状态，也可以重置筛选。';}
    emptyEl.hidden=visible>0;clearBtn.hidden=!items.length;
  }
  form.addEventListener('submit',function(event){event.preventDefault();});
  var timer=null;
  searchInput.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(refresh,120);});
  form.addEventListener('change',refresh);
  form.addEventListener('reset',function(){setTimeout(function(){yearSel.value=DEFAULT_YEAR;refresh();},0);});
  clearBtn.addEventListener('click',function(){form.reset();});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});
  var lastTick=Date.now();
  setInterval(function(){if(document.hidden)return;var now=Date.now();if(now>=nextBoundary || now<lastTick || now-lastTick>2000)refresh();else updateClock(now);lastTick=now;},1000);refresh();
})(typeof window!=='undefined' ? window : globalThis);
