export type LocalReview = {
  statement: string;
  basis: string;
  risk: string;
  repair: string;
};

const clean = (value: string) => value.replace(/^\s*(?:\d+[.、)]\s*)?/, '').trim();

const splitItems = (value: string) => {
  const numbered = value.split(/(?:^|\n)\s*\d+[.、)]\s*/).map(clean).filter(Boolean);
  if (numbered.length > 1) return numbered;
  const bullets = value.split(/(?:^|\n)\s*[-•]\s*/).map(clean).filter(Boolean);
  return bullets.length ? bullets : [clean(value)].filter(Boolean);
};

function sectionsOf(summary: string) {
  const labels = ['核心结论', '证据依据', '风险与边界', '下一步补证'] as const;
  return Object.fromEntries(labels.map((label) => {
    const match = summary.match(new RegExp(`【${label}】([\\s\\S]*?)(?=【(?:${labels.join('|')})】|$)`));
    return [label, clean(match?.[1] ?? '')];
  })) as Record<(typeof labels)[number], string>;
}

export function parseLocalReview(summary: string): LocalReview {
  const sections = sectionsOf(summary);

  return {
    statement: sections.核心结论 || clean(summary).slice(0, 180),
    basis: sections.证据依据,
    risk: sections.风险与边界 || '这是端侧模型发现的待核验问题，尚缺少人工确认的来源证据。',
    repair: sections.下一步补证 || '上传能够直接支持或反驳这条主张的原始材料。',
  };
}

export function parseLocalReviews(summary: string): LocalReview[] {
  const sections = sectionsOf(summary);
  const statements = splitItems(sections.核心结论 || summary);
  const bases = splitItems(sections.证据依据);
  const risks = splitItems(sections.风险与边界);
  const repairs = splitItems(sections.下一步补证);
  return statements.map((statement, index) => ({
    statement,
    basis: bases[index] ?? sections.证据依据,
    risk: risks[index] ?? (sections.风险与边界 || '这是端侧模型发现的待核验问题，尚缺少人工确认的来源证据。'),
    repair: repairs[index] ?? (sections.下一步补证 || '上传能够直接支持或反驳这条主张的原始材料。'),
  }));
}
