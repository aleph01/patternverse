import manifest from '../dist/articles.json' with { type: 'json' };
import type {
  ArticleContribution,
  ContributionAnchor,
  ContributionStatus,
} from '../src/contract.js';

export const previewIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
];
const anchor = (blockId: string, text: string, quote: string): ContributionAnchor => ({
  blockId,
  sectionId: '',
  sectionTitle: 'Article introduction',
  text,
  quote,
  start: text.indexOf(quote),
  end: text.indexOf(quote) + quote.length,
  x: 0.8,
  y: 0.2,
});
export function reviewFixtures(): {
  contribution: ArticleContribution;
  status: ContributionStatus;
  label: string;
  createdAt: string;
}[] {
  const paths = [
    '/pattern/define-the-decision-before-comparing-options',
    '/pattern/singleton',
    '/pattern/stats-forecast-intervals',
    '/pattern/make-trade-offs-explicit',
    '/pattern/keep-a-decision-journal',
  ];
  const names = ['Nina Blake', 'Sam Chen', 'Robin Ellis', 'Alex Morgan', 'Taylor Lee'];
  return paths.map((path, index) => {
    const article = manifest[path as keyof typeof manifest];
    if (!article) throw new Error(`Missing published preview article: ${path}`);
    const contribution: ArticleContribution = {
      requestId: previewIds[index]!,
      article,
      name: names[index]!,
      email: '',
      website: '',
      edits: [],
      comments: [],
    };
    if (index === 0) {
      const before =
        'A decision can be difficult because the alternatives are genuinely close. But sometimes the difficulty comes earlier: you have not yet established what decision you are actually making.';
      contribution.edits = [
        {
          blockId: 'block-0',
          sectionId: '',
          sectionTitle: 'Article introduction',
          before,
          after: before.replace('difficult', 'complex'),
        },
        {
          blockId: 'block-23',
          sectionId: '',
          sectionTitle: 'Framing the decision',
          before: 'A useful decision statement contains three elements:',
          after:
            'A useful decision statement names the problem, the desired outcome, and the real constraints:',
        },
      ];
      contribution.comments = [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          anchor: {
            ...anchor(
              'block-28',
              '“We need to decide this week.” Why?',
              '“We need to decide this week.”',
            ),
            sectionTitle: 'Questioning constraints',
          },
          additionalAnchors: [
            {
              ...anchor(
                'block-41',
                'Which constraints are genuinely fixed? Which constraints am I merely assuming?',
                'Which constraints are genuinely fixed?',
              ),
              sectionTitle: 'Practice — Rewrite the Decision',
            },
          ],
          body: 'Could we distinguish a real deadline from a self-imposed one? These two passages seem connected, but the difference might be easy to miss.',
        },
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          anchor: {
            blockId: '',
            sectionId: '',
            sectionTitle: 'Whole article',
            text: '',
            quote: '',
            start: 0,
            end: 0,
            x: 0.95,
            y: 0,
          },
          body: 'A short example of a reframed decision at the beginning would help on a first read.',
        },
      ];
    } else {
      const bodies = [
        '',
        'Could you explain why global state can make testing harder?',
        'A concrete forecast interval would help explain the uncertainty.',
        'Could you add an example where two priorities conflict?',
        'An example journal entry would make this easier to try.',
      ];
      contribution.comments = [
        {
          id: crypto.randomUUID(),
          anchor: anchor('block-1', 'An example would make this clearer.', 'example'),
          body: bodies[index]!,
        },
      ];
    }
    return {
      contribution,
      status: index === 3 ? 'reviewing' : index === 4 ? 'approved' : 'pending',
      label: index === 1 ? 'Examples' : 'Clarity',
      createdAt: `2026-10-${26 - index}T09:42:00.000Z`,
    };
  });
}
export async function seedReviewFixtures(database: D1Database): Promise<void> {
  for (const { contribution, status, label, createdAt } of reviewFixtures()) {
    await database
      .prepare(
        'INSERT INTO contributions (id,payload_hash,article_path,article_revision,article_title,payload,status,label,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
      )
      .bind(
        contribution.requestId,
        'local-preview',
        contribution.article.path,
        contribution.article.revision,
        contribution.article.title,
        JSON.stringify(contribution),
        status,
        label,
        createdAt,
        createdAt,
      )
      .run();
    if (status !== 'pending')
      await database
        .prepare(
          'INSERT INTO contribution_events (contribution_id,status,label,note,reviewer,created_at) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM contribution_events WHERE contribution_id = ?)',
        )
        .bind(
          contribution.requestId,
          status,
          label,
          '',
          'preview@example.com',
          createdAt,
          contribution.requestId,
        )
        .run();
  }
}
