/* Finds skills in text and decides if each is required or preferred */
const Parser = (() => {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const MUST = /\b(required|requirements?|must|essential|minimum|mandatory|proficien\w*|strong|solid|expert\w*)\b/i;
  const NICE = /\b(preferred|nice to have|bonus|a plus|desirable|familiarity|advantage|optional)\b/i;
  let rx, map;

  function build(skills) {
    map = new Map(); const terms = [];
    skills.forEach(s => [s.name, ...s.syn].forEach(t => { map.set(t.toLowerCase(), s); terms.push(t); }));
    terms.sort((a, b) => b.length - a.length); // longest first: "node.js" beats "node"
    // boundaries that treat C++, C#, .NET and Node.js as whole tokens, no false hits inside words
    rx = new RegExp('(?<![\\w+#.])(' + terms.map(esc).join('|') + ')(?:s)?(?![\\w+#])', 'gi');
  }

  function sentenceAt(t, i, j) {
    let a = i, b = j;
    while (a > 0 && t[a - 1] !== '\n' && !/[.!?]\s/.test(t.slice(a - 2, a))) a--;
    while (b < t.length && t[b] !== '\n' && !/[.!?]\s/.test(t.slice(b, b + 2))) b++;
    return t.slice(a, b);
  }

  function sectionMode(lines, idx) {
    for (let k = idx; k >= Math.max(0, idx - 12); k--) {
      const l = lines[k];
      if (l.length < 50) { if (NICE.test(l)) return 'nice'; if (MUST.test(l)) return 'must'; }
    }
    return 'normal';
  }

  function analyse(text) {
    const lines = text.split('\n'), starts = []; let off = 0;
    lines.forEach(l => { starts.push(off); off += l.length + 1; });
    const hits = [], found = new Map(); rx.lastIndex = 0; let m;
    while ((m = rx.exec(text))) {
      const skill = map.get(m[1].toLowerCase()); if (!skill) continue;
      const end = m.index + m[1].length;
      const sent = sentenceAt(text, m.index, end);
      let idx = starts.findIndex((s, k) => m.index >= s && (k === starts.length - 1 || m.index < starts[k + 1]));
      const level = NICE.test(sent) ? 'nice' : MUST.test(sent) ? 'must' : sectionMode(lines, idx);
      hits.push({ start: m.index, end, skill });
      const f = found.get(skill.name) || { skill, count: 0, level: 'nice', rank: 0 };
      const r = { nice: 1, normal: 2, must: 3 }[level];
      f.count++; if (r > f.rank) { f.rank = r; f.level = level; }
      found.set(skill.name, f);
    }
    return { hits, found: [...found.values()] };
  }
  return { build, analyse };
})();
