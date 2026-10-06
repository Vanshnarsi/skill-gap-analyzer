/* Weighted match: importance x frequency, reduced over the profile */
const Scoring = (() => {
  const W = { must: 3, normal: 2, nice: 1 };
  const weight = f => W[f.level] * (1 + 0.5 * Math.log2(f.count)); // repeated mentions add weight
  function run(found, profile) {
    const rows = found.map(f => {
      const w = weight(f), lv = profile[f.skill.name] || 0, cov = Math.min(lv, 3) / 3; // level 3 counts as job-ready
      return { ...f, w, lv, gap: w * (1 - cov), got: w * cov };
    });
    const tot = rows.reduce((s, r) => s + r.w, 0), got = rows.reduce((s, r) => s + r.got, 0);
    return { pct: tot ? Math.round(got / tot * 100) : 0, rows, gaps: rows.filter(r => r.gap > 0).sort((a, b) => b.gap - a.gap) };
  }
  return { run };
})();
