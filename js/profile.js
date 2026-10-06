/* Profile, history and checklist, persisted in localStorage */
const Profile = (() => {
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
  return {
    levels: () => read('sga.profile', {}),
    exists: () => localStorage.getItem('sga.profile') !== null,
    setAll(obj) { write('sga.profile', obj); },
    setLevel(name, lv) { const p = read('sga.profile', {}); lv > 0 ? p[name] = lv : delete p[name]; write('sga.profile', p); },
    history: () => read('sga.history', []),
    saveHistory(entry) { const h = [entry, ...read('sga.history', [])].slice(0, 15); write('sga.history', h); return h; },
    removeHistory(id) { const h = read('sga.history', []).filter(e => e.id !== id); write('sga.history', h); return h; },
    checklist: () => read('sga.checklist', []),
    saveChecklist: list => write('sga.checklist', list)
  };
})();
