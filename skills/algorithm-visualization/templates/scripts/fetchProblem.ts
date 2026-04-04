#!/usr/bin/env tsx
/**
 * 从 leetcode.cn 获取题目信息（模板项目内可用）
 */

async function fetchProblem(slug: string) {
  const res = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': `https://leetcode.cn/problems/${slug}/`,
    },
    body: JSON.stringify({
      query: `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title translatedContent content difficulty } }`,
      variables: { titleSlug: slug },
      operationName: 'questionData',
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: {
      question?: {
        questionFrontendId?: string;
        title?: string;
        translatedContent?: string;
        content?: string;
        difficulty?: string;
      };
    };
  };

  const q = json.data?.question;
  if (!q) throw new Error('question not found');

  console.log(
    JSON.stringify(
      {
        number: q.questionFrontendId,
        title_en: q.title,
        slug,
        difficulty: q.difficulty,
        description: cleanHtml(q.translatedContent || q.content || ''),
      },
      null,
      2
    )
  );
}

function cleanHtml(raw: string) {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: tsx scripts/fetchProblem.ts <slug>');
  process.exit(1);
}

fetchProblem(slug).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
