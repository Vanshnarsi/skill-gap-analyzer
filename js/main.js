/* App wiring: load data, live analysis, storage, clipboard, download */
(() => {
  const $ = UI.$;
  const FALLBACK = [ // used if data/skills.json cannot be fetched (e.g. opened from file://)
    { name: 'JavaScript', cat: 'languages', syn: ['js', 'javascript'] }, { name: 'Python', cat: 'languages', syn: ['python'] },
    { name: 'C++', cat: 'languages', syn: ['c++', 'cpp'] }, { name: 'C#', cat: 'languages', syn: ['c#', 'csharp'] },
    { name: '.NET', cat: 'languages', syn: ['.net', 'dotnet'] }, { name: 'HTML', cat: 'languages', syn: ['html', 'html5'] },
    { name: 'CSS', cat: 'languages', syn: ['css', 'css3'] }, { name: 'React', cat: 'tooling', syn: ['react', 'reactjs'] },
    { name: 'Node.js', cat: 'tooling', syn: ['node.js', 'nodejs', 'node'] }, { name: 'Git', cat: 'tooling', syn: ['git', 'github'] },
    { name: 'REST API', cat: 'concepts', syn: ['rest', 'api', 'apis'] }, { name: 'Teamwork', cat: 'soft', syn: ['teamwork', 'collaboration'] }
  ];
  const FALLBACK_JD = [{ title: 'Sample', text: 'Required: JavaScript, React and Node.js.\nPreferred: C++ or C# and Git.' }];
  const FALLBACK_PRESETS = [{ name: 'Frontend student', levels: { HTML: 5, CSS: 4, JavaScript: 4, React: 3, Git: 3 } }];
  let presets = [], skills = [], samples = [], levels = Profile.levels(), checklist = Profile.checklist(), last = { rows: [], pct: 0 }, timer;

  const load = (url, fb) => fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => fb);

  function analyse() {
    const text = $('#jd').value; $('#count').textContent = `${text.length} / 12000 characters`;
    const { hits, found } = Parser.analyse(text);
    last = Scoring.run(found, levels);
    UI.highlight(text, hits); UI.score(last); UI.found(last.rows);
    UI.gaps(last.gaps, checklist, addToChecklist); renderPlan();
  }
  const live = () => { clearTimeout(timer); timer = setTimeout(analyse, 250); }; // debounce

  function renderPlan() { UI.plan(checklist, toggle, remove); }
  function addToChecklist(name) { checklist.push({ name, done: false }); Profile.saveChecklist(checklist); UI.gaps(last.gaps, checklist, addToChecklist); renderPlan(); }
  function toggle(name) { const c = checklist.find(x => x.name === name); c.done = !c.done; Profile.saveChecklist(checklist); renderPlan(); }
  function remove(name) { checklist = checklist.filter(x => x.name !== name); Profile.saveChecklist(checklist); UI.gaps(last.gaps, checklist, addToChecklist); renderPlan(); }

  function report() {
    const need = last.gaps.map((g, i) => `${i + 1}. ${g.skill.name} (${g.level === 'must' ? 'required' : g.level === 'nice' ? 'preferred' : 'mentioned'}, you: ${g.lv}/5)`);
    return `Skill gap report\nMatch: ${last.pct}%\nSkills found: ${last.rows.map(r => r.skill.name).join(', ') || 'none'}\n\nGaps, most important first:\n${need.join('\n') || 'None'}\n`;
  }
  const refreshHistory = list => UI.history(list, e => { $('#jd').value = e.text; analyse(); }, id => refreshHistory(Profile.removeHistory(id)));

  async function init() {
    skills = (await load('data/skills.json', { skills: FALLBACK })).skills;
    samples = await load('data/sample-jds.json', FALLBACK_JD);
    presets = await load('data/sample-profiles.json', FALLBACK_PRESETS);
    presets.forEach((p, i) => $('#preset').add(new Option(p.name, i)));
    $('#preset').add(new Option('Choose…', ''), 0); $('#preset').value = '';
    if (!Profile.exists()) { Profile.setAll(presets[0].levels); levels = Profile.levels(); } // first visit: start with sample data
    Parser.build(skills); UI.legend(); UI.tabs();
    samples.forEach((s, i) => { const o = new Option(s.title, i); $('#sample').add(o); });
    const onLevel = (n, lv) => { Profile.setLevel(n, lv); levels = Profile.levels(); analyse(); };
    const applyProfile = obj => { Profile.setAll(obj); levels = Profile.levels(); UI.profile(skills, levels, onLevel); analyse(); };
    UI.profile(skills, levels, onLevel);
    $('#preset').addEventListener('change', e => { if (e.target.value !== '') { applyProfile(presets[e.target.value].levels); UI.toast('Loaded ' + presets[e.target.value].name); } });
    $('#resetProfile').addEventListener('click', () => { applyProfile({}); $('#preset').value = ''; });
    refreshHistory(Profile.history());
    $('#jd').addEventListener('input', live);
    $('#sample').addEventListener('change', e => { if (e.target.value !== '') { $('#jd').value = samples[e.target.value].text; e.target.value = ''; analyse(); } });
    $('#clear').addEventListener('click', () => { $('#jd').value = ''; analyse(); $('#jd').focus(); });
    $('#toggleHl').addEventListener('change', e => $('#hl').classList.toggle('off', !e.target.checked));
    $('#save').addEventListener('click', () => {
      const text = $('#jd').value.trim(); if (!text) return UI.toast('Paste a description first');
      refreshHistory(Profile.saveHistory({ id: Date.now(), title: text.split('\n')[0].slice(0, 40), pct: last.pct, text })); UI.toast('Analysis saved');
    });
    $('#copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(report()); UI.toast('Summary copied'); } catch { UI.toast('Copy blocked by the browser'); }
    });
    $('#download').addEventListener('click', () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([report()], { type: 'text/plain' }));
      a.download = 'skill-gap-report.txt'; a.click(); URL.revokeObjectURL(a.href);
    });
    analyse();
  }
  init();
})();
