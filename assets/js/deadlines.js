/* 纯日期逻辑导出供本地测试；页面部分从 window.BOLU_DDL 读取数据文件，
   不发起网络请求，也不需要后端。数据文件由 tools/build-deadlines.mjs 生成。 */
(function (root) {
  'use strict';
  var DAY = 86400000;
  function beijingDay(now) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    var time = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
  }
  function instant(value) {
    // Every precise timestamp must explicitly declare the China offset.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+08:00$/.test(value || '') || !validDate(value.slice(0, 10))) return NaN;
    return Date.parse(value);
  }
  function state(record, now) {
    now = now === undefined ? Date.now() : now;
    var result = function (kind, label, expired) { return {kind:kind, label:label, expired:!!expired}; };
    if (record.validity === 'withdrawn') return result('withdrawn', '已撤销', true);
    if (record.validity === 'review') return result('review', '信息待核实');
    var today = beijingDay(now);
    var precise = record.precision === 'exact';
    var dateOnly = record.precision === 'date';
    var end = precise ? instant(record.deadline) : NaN;
    if ((precise && !Number.isFinite(end)) || (dateOnly && !validDate(record.deadline))) return result('review', '日期待核实');
    if (precise && now >= end) return result('closed', '已截止', true);
    if (dateOnly && today > record.deadline) return result('closed', '截止日期已过', true);
    var start = record.start ? instant(record.start) : NaN;
    if (record.start && !Number.isFinite(start)) return result('review', '开放时间待核实');
    if (Number.isFinite(start) && ((precise && start > end) || (dateOnly && beijingDay(start) > record.deadline))) return result('review', '时间范围待核实');
    if (Number.isFinite(start) && now < start) return result('upcoming', '未开始');
    // A date-only deadline never becomes an invented 23:59 countdown.
    if (dateOnly && today === record.deadline) return result('today', '今日截止，时刻见原通知');
    var open = record.openConfirmed === 'true' || record.openConfirmed === true || (Number.isFinite(start) && now >= start);
    if (!precise && !dateOnly) return result('unknown', record.precision === 'rolling' ? '滚动招生' : '截止待确认');
    if (!open) return result('review', '开放时间待核实');
    if (precise && end - now <= 3 * DAY) return result('soon', '即将截止');
    return result('open', '报名中');
  }
  function dateKey(record) {
    if (record.precision === 'exact' && Number.isFinite(instant(record.deadline))) return record.deadline.slice(0,10);
    if (record.precision === 'date' && validDate(record.deadline)) return record.deadline;
    return null;
  }
  function compare(a, b, direction, now) {
    var sa=state(a,now), sb=state(b,now);
    if(sa.expired !== sb.expired) return sa.expired ? 1 : -1;
    var da=dateKey(a), db=dateKey(b);
    if(!da || !db) return da ? -1 : db ? 1 : 0;
    var sign = direction === 'desc' ? -1 : 1;
    if(da !== db) return (da < db ? -1 : 1) * sign;
    // Same-day exact times sort together; date-only entries are a distinct group.
    if(a.precision !== b.precision) return a.precision === 'exact' ? -1 : 1;
    if(a.precision === 'exact') return (instant(a.deadline)-instant(b.deadline))*sign;
    return 0;
  }
  function matches(record, filters, now) {
    var status=state(record,now);
    if(filters.year !== 'all' && record.year !== filters.year) return false;
    if(!filters.archive && status.expired) return false;
    if(filters.status !== 'all') {
      if(filters.status === 'open' ? ['open','soon'].indexOf(status.kind) < 0 : filters.status !== status.kind) return false;
    }
    var search=(record.search || '').toLocaleLowerCase().replace(/\s+/g,'');
    var query=(filters.query || '').toLocaleLowerCase().replace(/\s+/g,'');
    return search.indexOf(query) >= 0;
  }
  var api={state:state,compare:compare,matches:matches,beijingDay:beijingDay};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (!root.document) return;
  var document=root.document;
  var list=document.getElementById('deadline-list');
  var form=document.getElementById('deadline-filters');
  if(!list || !form) return;
  var get=function(id){return document.getElementById(id);};
  var yearSel=get('ddl-year'),statusSel=get('ddl-status'),sortSel=get('ddl-sort'),searchInput=get('ddl-search'),archiveBox=get('ddl-archive');
  var countEl=get('ddl-count'),emptyEl=get('ddl-empty'),clearBtn=get('ddl-clear'),metaEl=get('ddl-meta-checked');
  var data=root.BOLU_DDL;
  var records=(data && Array.isArray(data.records)) ? data.records : [];

  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
  function link(text,href){var a=el('a',null,text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}

  // 每条记录只建一次 DOM，之后刷新只做增删，避免 1000 多条时反复重建。
  var items=records.map(function(record){
    var article=el('article','deadline-record');
    article.id=record.id;
    var summary=el('div','deadline-summary');

    var head=el('div');
    head.appendChild(el('h3',null,record.dept ? record.school+' · '+record.dept : record.school));
    summary.appendChild(head);

    var dateCell=el('div');
    if(record.deadline && record.precision==='exact'){
      var t=el('time',null,record.deadline.slice(0,10)+' '+record.deadline.slice(11,16));
      t.dateTime=record.deadline;
      dateCell.appendChild(t);
    }else if(record.deadline && record.precision==='date'){
      var d=el('time',null,record.deadline);
      d.dateTime=record.deadline;
      dateCell.appendChild(d);
      dateCell.appendChild(el('span','time-note','时刻未注明'));
    }else{
      dateCell.appendChild(el('span','time-note',record.dateText || (record.precision==='rolling' ? '滚动招生' : '截止时间未公布')));
    }
    summary.appendChild(dateCell);

    var statusCell=el('div');
    var label=el('span','deadline-status');
    statusCell.appendChild(label);
    summary.appendChild(statusCell);

    var srcCell=el('div');
    if(record.url) srcCell.appendChild(link('通知原文 ↗',record.url));
    else srcCell.appendChild(el('span','muted','暂无来源'));
    summary.appendChild(srcCell);

    article.appendChild(summary);

    if(record.note || record.applyUrl || record.checked){
      var details=el('details');
      details.appendChild(el('summary',null,'更多信息'));
      var box=el('div');
      if(record.note) box.appendChild(el('p',null,'备注：'+record.note));
      if(record.checked) box.appendChild(el('p',null,'此条核验日期：'+record.checked));
      if(record.applyUrl){var p=el('p');p.appendChild(link('前往报名系统 ↗',record.applyUrl));box.appendChild(p);}
      details.appendChild(box);
      article.appendChild(details);
    }
    return {record:record,el:article,label:label};
  });

  var years=[];
  items.forEach(function(it){if(years.indexOf(it.record.year)<0)years.push(it.record.year);});
  years.sort().reverse();
  years.forEach(function(y){var o=document.createElement('option');o.value=y;o.textContent=y+' 年申请';yearSel.appendChild(o);});
  var latest=years[0]||'all';
  yearSel.value=latest;
  if(metaEl) metaEl.textContent=data && data.checked ? '最近单条核验：'+data.checked : '来源：历史清单整理，核验日期未记录';

  function refresh() {
    var now=Date.now();
    var filters={year:yearSel.value,status:statusSel.value,query:searchInput.value,archive:archiveBox.checked};
    var frag=document.createDocumentFragment();
    var visible=0;
    items.slice().sort(function(a,b){return compare(a.record,b.record,sortSel.value,now);}).forEach(function(it){
      var value=state(it.record,now);
      it.label.textContent=value.label;
      it.label.dataset.kind=value.kind;
      if(matches(it.record,filters,now)){frag.appendChild(it.el);visible++;}
    });
    list.replaceChildren(frag);
    countEl.textContent=items.length ? '显示 '+visible+' / '+items.length+' 条院校通知' : '暂未收录院校通知';
    var h2=emptyEl.querySelector('h2'), p=emptyEl.querySelector('p:not(.eyebrow)');
    if(!data || !Array.isArray(data.records)){
      h2.textContent='清单暂时未能加载。';
      p.textContent='请刷新页面后重试，或稍后再来查看。';
    }else if(!items.length){
      h2.textContent='暂未收录院校通知。';
      p.textContent='维护者录入并核验后，将在这里显示。';
    }else if(!visible){
      h2.textContent='没有符合条件的信息。';
      p.textContent='试着修改筛选条件，或勾选“包含已截止 / 撤销”。';
    }
    emptyEl.hidden=visible>0;
    clearBtn.hidden=!items.length;
  }
  form.addEventListener('submit',function(event){event.preventDefault();});
  var timer=null;
  searchInput.addEventListener('input',function(){
    if(timer) clearTimeout(timer);
    timer=setTimeout(function(){timer=null;refresh();},120);
  });
  form.addEventListener('change',function(event){
    if(event.target===statusSel && ['closed','withdrawn'].indexOf(statusSel.value)>=0) archiveBox.checked=true;
    refresh();
  });
  form.addEventListener('reset',function(){
    setTimeout(function(){yearSel.value=latest;archiveBox.checked=false;refresh();},0);
  });
  archiveBox.addEventListener('change',function(){
    if(!archiveBox.checked && ['closed','withdrawn'].indexOf(statusSel.value)>=0) statusSel.value='all';
    refresh();
  });
  clearBtn.addEventListener('click',function(){form.reset();});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});
  setInterval(function(){if(!document.hidden)refresh();},60000);
  refresh();
})(typeof window!=='undefined' ? window : globalThis);
