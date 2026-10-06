/* All DOM rendering. Text is only ever added via textContent / text nodes (no innerHTML), so no XSS. */
const UI = (() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const CATS = { languages: 'Languages', tooling: 'Tooling', concepts: 'Concepts', soft: 'Soft skills' };
  const LABEL = { must: 'Required', normal: 'Mentioned', nice: 'Preferred' };

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  function highlight(text, hits) {
    const box = $('#hl'); box.replaceChildren();
    box.classList.toggle('empty', !text.trim());
    if (!text.trim()) { box.append('Highlighted skills will appear here. Paste a description or load a sample to start.'); return; }
    let p = 0;
    hits.forEach(h => {
      if (h.start > p) box.append(text.slice(p, h.start));
      const m = el('mark', 'cat-' + h.skill.cat, text.slice(h.start, h.end));
      m.title = h.skill.name + ' (' + CATS[h.skill.cat] + ')'; box.append(m); p = h.end;
    });
    box.append(text.slice(p));
  }

  function legend() {
    const ul = $('#legend'); ul.replaceChildren();
    Object.entries(CATS).forEach(([k, v]) => ul.append(el('li', 'cat-' + k, v)));
  }

  function score(r) {
    $('#gauge').style.setProperty('--p', r.pct); $('#pct').textContent = r.pct + '%'; $('#meter').value = r.pct;
    $('#summary').textContent = r.rows.length ? `${r.rows.length} skills found, ${r.gaps.length} gaps` : 'Nothing analysed yet.';
  }

  function found(rows) {
    const p = $('#p1'); p.replaceChildren();
    if (!rows.length) return p.append(el('p', 'empty-state', 'No skills detected yet. Paste a job description to begin.'));
    Object.entries(CATS).forEach(([cat, name]) => {
      const list = rows.filter(r => r.skill.cat === cat).sort((a, b) => b.w - a.w); if (!list.length) return;
      const d = el('details'); d.open = true; d.append(el('summary', 'cat-' + cat, `${name} (${list.length})`));
      list.forEach(r => {
        const row = el('div', 'skill'); row.append(el('span', 'name', r.skill.name));
        row.append(el('span', 'badge ' + r.level, LABEL[r.level]), el('span', 'badge', r.count + '×'));
        const m = el('meter'); m.min = 0; m.max = 5; m.value = r.lv; m.title = 'Your level: ' + r.lv; row.append(m);
        d.append(row);
      });
      p.append(d);
    });
  }

  function gaps(list, checklist, onAdd) {
    const p = $('#p2'); p.replaceChildren();
    if (!list.length) return p.append(el('p', 'empty-state', 'No gaps to show. Raise or lower levels in your profile to see how scores change.'));
    const ol = el('ol');
    list.forEach(r => {
      const li = el('li', 'skill'); li.append(el('span', 'name', r.skill.name), el('span', 'badge ' + r.level, LABEL[r.level]));
      const b = el('button', null, checklist.some(c => c.name === r.skill.name) ? 'Added' : 'Add to checklist');
      b.disabled = b.textContent === 'Added'; b.addEventListener('click', () => onAdd(r.skill.name)); li.append(b); ol.append(li);
    });
    p.append(ol);
  }

  function plan(list, onToggle, onRemove) {
    const p = $('#p3'); p.replaceChildren();
    if (!list.length) return p.append(el('p', 'empty-state', 'Your checklist is empty. Add skills from the Your gaps tab.'));
    const done = list.filter(c => c.done).length; p.append(el('p', null, `${done} of ${list.length} done`));
    list.forEach(c => {
      const row = el('label', 'skill'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = c.done;
      cb.addEventListener('change', () => onToggle(c.name)); row.append(cb, el('span', 'name', 'Learn ' + c.name));
      const x = el('button', null, 'Remove'); x.type = 'button'; x.addEventListener('click', e => { e.preventDefault(); onRemove(c.name); }); row.append(x); p.append(row);
    });
  }

  function profile(skills, levels, onChange) {
    const box = $('#profile'); box.replaceChildren();
    Object.entries(CATS).forEach(([cat, name]) => {
      const d = el('details'); d.append(el('summary', null, name));
      skills.filter(s => s.cat === cat).forEach(s => {
        const row = el('div', 'pf'); const id = 'pf-' + s.name.replace(/\W/g, '_');
        const lb = el('label', null, s.name); lb.htmlFor = id; lb.style.fontWeight = 400;
        const sel = el('select'); sel.id = id;
        for (let i = 0; i <= 5; i++) { const o = el('option', null, String(i)); o.value = i; sel.append(o); }
        sel.value = levels[s.name] || 0; sel.addEventListener('change', () => onChange(s.name, +sel.value));
        row.append(lb, sel); d.append(row);
      });
      box.append(d);
    });
  }

  function history(list, onLoad, onDelete) {
    const ul = $('#history'); ul.replaceChildren();
    if (!list.length) return ul.append(el('li', 'empty-state', 'No saved analyses yet.'));
    list.forEach(e => {
      const li = el('li', 'skill'); li.append(el('span', 'name', `${e.title} · ${e.pct}%`));
      const a = el('button', null, 'Load'), b = el('button', null, 'Delete');
      a.addEventListener('click', () => onLoad(e)); b.addEventListener('click', () => onDelete(e.id)); li.append(a, b); ul.append(li);
    });
  }

  function tabs() {
    const tabs = [...document.querySelectorAll('[role=tab]')];
    const pick = t => tabs.forEach(x => {
      const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', e => {
        const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!n) return;
        const nx = tabs[(i + n + tabs.length) % tabs.length]; pick(nx); nx.focus();
      });
    });
  }
  return { $, toast, highlight, legend, score, found, gaps, plan, profile, history, tabs };
})();
