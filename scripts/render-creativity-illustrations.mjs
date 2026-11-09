// Original explanatory figures in the approved light editorial style.
// Only these owned assets and their manifest entries are regenerated.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const folder = resolve(root, 'content/assets/creativity');
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const line = (x1, y1, x2, y2, accent = false, dashed = false) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" class="${accent ? 'accent' : 'line'}${dashed ? ' dashed' : ''}"/>`;
const arrow = (x1, y1, x2, y2, accent = true, dashed = false) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" class="${accent ? 'accent' : 'line'}${dashed ? ' dashed' : ''}" marker-end="url(#${accent ? 'arrow' : 'gray-arrow'})"/>`;
const path = (d, cls = 'line') => `<path d="${d}" class="${cls}"/>`;
const rect = (x, y, w, h, cls = 'paper') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const circle = (x, y, r, cls = 'paper') => `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
const text = (x, y, lines, cls = '', anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${(Array.isArray(lines) ? lines : [lines]).map((s, i) => `<tspan x="${x}" dy="${i ? 23 : 0}">${esc(s)}</tspan>`).join('')}</text>`;
const label = (x, y, s) => text(x, y, s, 'small');
const box = (x, y, w, h, lines, accent = false) => {
  const wrapped = (Array.isArray(lines) ? lines : [lines]).flatMap((value) => {
    const rows = [''];
    for (const word of value.split(' ')) {
      const last = rows.length - 1;
      if (rows[last] && rows[last].length + word.length + 1 > (w - 24) / 8.8) rows.push(word);
      else rows[last] += (rows[last] ? ' ' : '') + word;
    }
    return rows;
  });
  return (
    rect(x, y, w, h, accent ? 'change' : 'context') +
    text(x + w / 2, y + h / 2 - (wrapped.length - 1) * 11.5 + 6, wrapped, '', 'middle')
  );
};
const note = (x, y, s) => text(x, y, s, 'muted');
const stages = (mobile, labels) => {
  const w = mobile ? 316 : 208,
    h = mobile ? 86 : 112;
  return labels
    .map((a, i) => {
      const x = mobile ? 22 : 24 + i * 232,
        y = mobile ? 40 + i * 140 : 115;
      return (
        label(x, y - 14, String(i + 1).padStart(2, '0')) +
        box(x, y, w, h, a, true) +
        (i < 2
          ? mobile
            ? arrow(180, y + h + 8, 180, y + 132)
            : arrow(x + w + 5, y + 56, x + 227, y + 56)
          : '')
      );
    })
    .join('');
};
const figures = [
  {
    id: 'abstraction-laddering',
    type: 'map',
    title: 'Return through a different route',
    height: 630,
    alt: 'The room-booking website leads to the purpose of reliable access to suitable rooms. That purpose also leads to clearer descriptions, standing allocations, and drop-in space.',
    caption:
      'Ask what booking makes possible, then return through other ways to provide suitable space. The alternatives still need to meet the same requirements.',
    rationale:
      'The branches make the move from one implementation to a purpose and back through alternative implementations visible.',
    draw(m) {
      if (m)
        return (
          box(22, 28, 316, 65, 'Better booking website') +
          arrow(180, 102, 180, 153) +
          label(198, 132, 'Enables') +
          box(22, 167, 316, 76, ['Reliable access to', 'suitable rooms'], true) +
          label(22, 284, 'Other ways to serve this purpose') +
          line(42, 301, 42, 565, true) +
          [['Clear room descriptions'], ['Standing allocations'], ['Drop-in space']]
            .map(
              (a, i) =>
                arrow(42, 331 + i * 106, 73, 331 + i * 106) +
                box(83, 302 + i * 106, 255, 65, a, true),
            )
            .join('')
        );
      return (
        box(228, 48, 264, 80, ['Reliable access to', 'suitable rooms'], true) +
        arrow(100, 255, 270, 141) +
        label(24, 175, 'What does it enable?') +
        box(24, 268, 152, 90, ['Better booking', 'website']) +
        [
          [200, ['Clear room', 'descriptions']],
          [376, ['Standing', 'allocations']],
          [552, ['Drop-in', 'space']],
        ]
          .map(([x, a]) => arrow(365, 140, x + 76, 254) + box(x, 268, 152, 90, a, true))
          .join('') +
        note(24, 414, 'Keep the purpose; reconsider the route.')
      );
    },
  },
  {
    id: 'zwicky-box',
    type: 'comparison',
    title: 'Construct a different archive experience',
    height: 735,
    alt: 'Three dimensions each offer two choices: setting, encounter, and contribution. Walking route, audio excerpts, and remembered places combine into a listening trail; the kitchen-table combination becomes a conversation pack.',
    caption:
      'Choose one alternative from each dimension, then describe and check the combination. The listening trail and conversation pack differ in their underlying arrangement.',
    rationale:
      'Aligned alternatives and complete combinations make recombination concrete without pretending to enumerate every possible design.',
    draw(m) {
      const data = [
        ['Setting', 'Walking route', 'Kitchen table'],
        ['Encounter', 'Audio excerpts', 'Printed exchange'],
        ['Contribution', 'Remembered places', 'Questions'],
      ];
      let s = data
        .map((a, i) => {
          const x = m ? 22 : 24 + i * 232,
            y = m ? 38 + i * 155 : 58,
            w = m ? 316 : 208;
          return (
            label(x, y, a[0]) + box(x, y + 16, w, 52, a[1], true) + box(x, y + 80, w, 52, a[2])
          );
        })
        .join('');
      if (m)
        return (
          s +
          box(22, 536, 316, 76, ['Listening trail', 'route + audio + memories'], true) +
          box(22, 631, 316, 76, ['Conversation pack', 'table + print + questions'])
        );
      return (
        s +
        label(24, 256, 'Two complete combinations') +
        box(24, 280, 324, 99, ['Listening trail', 'Route + audio + memories'], true) +
        box(372, 280, 324, 99, ['Conversation pack', 'Table + print + questions']) +
        note(24, 427, 'Check permission, access, resources, and compatibility.')
      );
    },
  },
  {
    id: 'productive-thinking-model',
    type: 'process/flow',
    title: 'A courtyard proposal can return to an earlier question',
    height: 900,
    alt: 'Six thinking jobs connect the courtyard concern to a trial: understand use, describe success, frame a question, generate options, develop a proposal, and align resources. A dashed return from the storage question reopens development.',
    caption:
      'The courtyard proposal moves through six different thinking jobs. If storage is unavailable, return to development instead of treating the plan as settled.',
    rationale:
      'The figure distinguishes thinking jobs and makes the return from a resource discovery to solution development explicit.',
    draw(m) {
      const items = [
        ['Understand', 'Why is the courtyard unused?'],
        ['Success', 'Comfort, access, upkeep'],
        ['Question', 'How can residents spend time here?'],
        ['Generate', 'Seating, activity, planting'],
        ['Develop', 'Small seating + hosted trial'],
        ['Resources', 'Owner, storage, permission'],
      ];
      let s = items
        .map((a, i) => {
          const x = m ? 22 : 24 + (i % 3) * 232,
            y = m ? 36 + i * 124 : 60 + Math.floor(i / 3) * 210,
            w = m ? 316 : 208;
          return (
            label(x, y, String(i + 1).padStart(2, '0') + ' / ' + a[0]) +
            box(x, y + 18, w, m ? 64 : 86, m ? a[1] : a[1].split(/, | \+ /), i > 3) +
            (m && i < 5 ? arrow(180, y + 88, 180, y + 115) : '')
          );
        })
        .join('');
      if (m)
        return (
          s +
          '<path d="M22 706H12V582H22" class="accent dashed" marker-end="url(#arrow)"/>' +
          text(50, 808, ['No storage?', 'Revisit the proposal.'], 'muted')
        );
      s +=
        arrow(236, 121, 251, 121) +
        arrow(468, 121, 483, 121) +
        path('M696 164V237H128V276', 'accent') +
        '<path d="M128 276V281" class="accent" marker-end="url(#arrow)"/>' +
        arrow(236, 331, 251, 331) +
        arrow(468, 331, 483, 331);
      return (
        s +
        '<path d="M592 382V410H360V382" class="accent dashed" marker-end="url(#arrow)"/>' +
        label(372, 439, 'No storage? Revisit development.')
      );
    },
  },
  {
    id: 'reframing-rapid-reframe',
    type: 'comparison',
    title: 'The same backlog suggests different checks',
    height: 680,
    alt: 'One concern, always being behind, branches into work arriving faster than it can finish and one request type blocking the rest. Each frame points to a different observation.',
    caption:
      'Both frames retain the backlog concern. One asks for incoming and completed work; the other asks where work waits. These checks can refine either interpretation.',
    rationale:
      'The branches pair each interpretation with its distinct check, showing why a wording change alone is insufficient.',
    draw(m) {
      if (m)
        return (
          box(22, 28, 316, 66, '“I am always behind.”') +
          arrow(180, 106, 180, 146) +
          box(22, 160, 316, 84, ['More work arrives', 'than can be completed'], true) +
          arrow(180, 257, 180, 291) +
          box(22, 305, 316, 70, ['Count incoming', 'and completed requests']) +
          label(22, 422, 'Another frame for the same concern') +
          box(22, 441, 316, 78, ['One request type', 'blocks the rest'], true) +
          arrow(180, 532, 180, 566) +
          box(22, 580, 316, 70, 'Inspect waits by category')
        );
      return (
        box(212, 28, 296, 68, '“I am always behind.”') +
        arrow(290, 108, 186, 165) +
        arrow(430, 108, 534, 165) +
        box(24, 178, 324, 90, ['More work arrives', 'than can be completed'], true) +
        box(372, 178, 324, 90, ['One request type', 'blocks the rest'], true) +
        arrow(186, 280, 186, 316) +
        arrow(534, 280, 534, 316) +
        box(24, 330, 324, 78, ['Count incoming', 'and completed requests']) +
        box(372, 330, 324, 78, 'Inspect waits by category') +
        label(24, 447, 'Frames propose different mechanisms; observations can change them.')
      );
    },
  },
  {
    id: 'reframing-explore-or-break',
    type: 'comparison',
    title: 'Inspect the meeting or question its premise',
    height: 630,
    alt: 'The concern that meetings run too long leads to two moves. Exploration inspects which agenda item expands; breaking the frame asks which decisions need a live meeting at all.',
    caption:
      'Exploring keeps the meeting as the setting and investigates variation. Breaking questions whether the decisions need to be synchronous. Either move may be useful.',
    rationale:
      'A paired comparison holds the concern constant while distinguishing a closer investigation from a changed premise.',
    draw(m) {
      if (m)
        return (
          box(22, 28, 316, 70, '“Our meetings run too long.”') +
          label(22, 152, 'Explore / keep the premise') +
          box(22, 170, 316, 96, ['Which agenda item', 'expands unpredictably?'], true) +
          label(22, 328, 'Break / question the premise') +
          box(22, 346, 316, 96, ['Which decisions need', 'a live meeting at all?'], true) +
          note(22, 508, ['Compare the evidence', 'each question would require.'])
        );
      return (
        box(178, 32, 364, 72, '“Our meetings run too long.”') +
        arrow(278, 117, 186, 182) +
        arrow(442, 117, 534, 182) +
        label(24, 216, 'Explore / keep the premise') +
        label(372, 216, 'Break / question the premise') +
        box(24, 234, 324, 108, ['Which agenda item', 'expands unpredictably?'], true) +
        box(372, 234, 324, 108, ['Which decisions need', 'a live meeting at all?'], true) +
        note(24, 409, 'Compare the evidence each question would require.')
      );
    },
  },
  {
    id: 'reframing-expand-time-window',
    type: 'timeline',
    title: 'The deadline sits within a wider sequence',
    height: 660,
    alt: 'A timeline places changing expectations and urgent requests before a missed deadline. After it, anticipated criticism may delay the next warning. The expectation is marked as a hypothesis.',
    caption:
      'Widen the time window around the missed deadline. Sequence is not proof of cause: check both the earlier demands and the person’s account of the anticipated response.',
    rationale:
      'The timeline separates the visible episode from nearby events and from an inferred expectation.',
    draw(m) {
      let s = stages(m, [
        ['Before', 'Changed expectations', 'Two urgent requests'],
        ['Visible event', 'Missed deadline'],
        ['Anticipated afterward', 'Criticism?', 'Delayed next warning?'],
      ]);
      if (m) return s + note(22, 536, ['Question marks mark hypotheses,', 'not observed motives.']);
      return (
        s +
        note(24, 312, [
          'The deadline remains a fact.',
          'The surrounding sequence changes what to investigate.',
        ]) +
        label(24, 414, 'Question marks mark hypotheses, not observed motives.')
      );
    },
  },
  {
    id: 'reframing-surface-higher-goals',
    type: 'map',
    title: 'One promotion can serve several purposes',
    height: 650,
    alt: 'A promotion branches into income, responsibility, and recognition. Each branch points to a different possible purpose: financial security, consequential work, and feeling valued.',
    caption:
      'Keep the branches distinct. A route that increases income may not provide responsibility or recognition; the person decides which purposes fit their experience.',
    rationale:
      'The tree preserves multiple legitimate purposes instead of collapsing the goal into a single inferred motive.',
    draw(m) {
      const branches = [
        ['Income', 'Financial security'],
        ['Responsibility', 'Consequential work'],
        ['Recognition', 'Feeling valued'],
      ];
      if (m)
        return (
          box(22, 30, 316, 70, 'Get promoted') +
          line(42, 113, 42, 557, true) +
          branches
            .map(
              (a, i) =>
                arrow(42, 176 + i * 155, 75, 176 + i * 155) +
                box(87, 137 + i * 155, 251, 88, a, true),
            )
            .join('')
        );
      return (
        box(232, 34, 256, 72, 'Get promoted') +
        branches
          .map(
            (a, i) =>
              arrow(360, 119, 128 + i * 232, 212) +
              box(
                24 + i * 232,
                226,
                208,
                102,
                [a[0], ...a[1].split(a[1].length > 18 ? ' ' : '\n')],
                true,
              ),
          )
          .join('') +
        note(24, 409, 'Ask what the target enables. Do not assume which branch matters most.')
      );
    },
  },
  {
    id: 'reframing-challenge-goal-logic',
    type: 'process/flow',
    title: 'Check the arrows in a meeting plan',
    height: 680,
    alt: 'The proposed chain links more meetings to better communication to fewer mistakes. Under each arrow is a question: are decisions recorded, and which mistakes involve missing information?',
    caption:
      'The arrows are assumptions to examine. Recording decisions or clarifying ownership may matter more than adding meetings; the chain alone cannot settle that.',
    rationale:
      'Separate questions attached to each causal link distinguish the intended outcome from the proposed mechanism.',
    draw(m) {
      if (m)
        return (
          box(22, 28, 316, 70, 'More meetings') +
          arrow(180, 112, 180, 172, true, true) +
          text(22, 137, ['Are decisions', 'recorded?'], 'small') +
          box(22, 186, 316, 70, 'Better communication', true) +
          arrow(180, 270, 180, 330, true, true) +
          text(22, 295, ['Which mistakes lack', 'information?'], 'small') +
          box(22, 344, 316, 70, 'Fewer mistakes') +
          note(22, 486, [
            'Dashed arrows are proposed links.',
            'Each can hold only under',
            'particular conditions.',
          ])
        );
      return (
        box(24, 90, 192, 92, ['More', 'meetings']) +
        arrow(232, 136, 249, 136, true, true) +
        box(264, 90, 192, 92, ['Better', 'communication'], true) +
        arrow(472, 136, 489, 136, true, true) +
        box(504, 90, 192, 92, ['Fewer', 'mistakes']) +
        line(240, 164, 240, 244) +
        line(480, 164, 480, 244) +
        text(24, 292, ['Are decisions recorded', 'and available when needed?']) +
        text(388, 292, ['Which mistakes involve', 'missing information?']) +
        note(24, 409, 'Dashed arrows are proposed links; check their conditions.')
      );
    },
  },
  {
    id: 'reframing-map-stakeholders',
    type: 'map',
    title: 'A release includes more than developers',
    height: 750,
    alt: 'A release is connected to developers implementing, a product owner changing scope, reviewers approving, support handling defects, and customers waiting. The labels describe roles rather than assign blame.',
    caption:
      'Map what each group does or experiences before deciding where the delay originates. A role map suggests people to consult; it does not establish the cause.',
    rationale:
      'A spatial map restores omitted roles and makes the difference between responsibility and causal blame visible.',
    draw(m) {
      const items = [
        ['Developers', 'Implement changes'],
        ['Product owner', 'Changes scope'],
        ['Reviewers', 'Approve releases'],
        ['Support', 'Handles defects'],
        ['Customers', 'Wait for capability'],
      ];
      if (m)
        return (
          text(22, 25, ['Whose role is missing from', '“developers are delaying”?'], 'small') +
          line(40, 66, 40, 686) +
          items
            .map(
              (a, i) =>
                line(40, 104 + i * 136, 75, 104 + i * 136) +
                box(87, 67 + i * 136, 251, 86, a, i > 0),
            )
            .join('')
        );
      const places = [
        [24, 48],
        [256, 48],
        [488, 48],
        [24, 302],
        [488, 302],
      ];
      return (
        places.map(([x, y]) => line(x + 104, y < 100 ? y + 95 : y - 8, 360, 238)).join('') +
        box(256, 204, 208, 70, 'Release') +
        items.map((a, i) => box(...places[i], 208, 90, a, i > 0)).join('') +
        label(24, 447, 'Connections indicate involvement, not a proven cause of delay.')
      );
    },
  },
  {
    id: 'reframing-find-hidden-properties',
    type: 'comparison',
    title: 'The same crate has more than one useful property',
    height: 620,
    alt: 'The same shipping crate is drawn as a storage container and as a possible raised display surface. The new use relies on its shape and stiffness and still requires a stability check.',
    caption:
      'Look beyond the label “storage.” A crate may provide a raised surface, but its strength and stability need checking before it becomes part of a stall.',
    rationale:
      'The same concrete object in two uses shows how a functional label can hide useful properties.',
    draw(m) {
      const crate = (x, y) =>
        rect(x, y, 144, 94, 'context') +
        [23, 47, 71].map((d) => line(x, y + d, x + 144, y + d)).join('') +
        line(x + 22, y, x + 22, y + 94) +
        line(x + 122, y, x + 122, y + 94);
      if (m)
        return (
          label(22, 35, 'Usual label / storage') +
          crate(108, 78) +
          rect(138, 56, 38, 22, 'paper') +
          rect(184, 47, 38, 31, 'paper') +
          label(22, 262, 'Other property / raised surface') +
          crate(108, 332) +
          rect(145, 296, 70, 36, 'change') +
          line(75, 428, 285, 428) +
          note(22, 499, ['Same object; another possible use.', 'Check strength and stability.'])
        );
      return (
        label(24, 49, 'Usual label / storage') +
        label(388, 49, 'Other property / raised surface') +
        crate(112, 153) +
        rect(140, 130, 38, 23, 'paper') +
        rect(188, 120, 38, 33, 'paper') +
        crate(464, 153) +
        rect(501, 117, 70, 36, 'change') +
        line(80, 251, 288, 251) +
        line(432, 251, 640, 251) +
        arrow(302, 200, 405, 200) +
        note(24, 345, [
          'Describe what the crate can do, not only what it is called.',
          'A possible use still needs a real-world check.',
        ])
      );
    },
  },
  {
    id: 'reframing-generate-real-options',
    type: 'comparison',
    title: 'Three vendors may still be one idea',
    height: 680,
    alt: 'Vendor A, Vendor B, and an internal dashboard share the assumption of preserving a report. Other options question whether to simplify, partly automate, or retire the report.',
    caption:
      'The first group varies the implementation while retaining the report. The second changes the underlying account of what work is needed. Relevance still matters more than novelty.',
    rationale: 'Grouping choices by their shared premise makes structural diversity visible.',
    draw(m) {
      if (m)
        return (
          label(22, 30, 'Same premise / keep the report') +
          rect(22, 49, 316, 233, 'context') +
          ['Vendor A', 'Vendor B', 'Internal dashboard']
            .map((a, i) => box(42, 68 + i * 67, 276, 52, a))
            .join('') +
          label(22, 332, 'Different accounts of the need') +
          ['Simplify the report', 'Automate one repeated step', 'Retire a report nobody uses']
            .map((a, i) => box(22, 352 + i * 100, 316, 75, a, true))
            .join('')
        );
      return (
        label(24, 34, 'Same premise / keep the report') +
        rect(24, 49, 324, 360, 'context') +
        ['Vendor A', 'Vendor B', 'Internal dashboard']
          .map((a, i) => box(44, 80 + i * 100, 284, 74, a))
          .join('') +
        label(380, 34, 'Different accounts of the need') +
        ['Simplify the report', 'Automate one repeated step', 'Retire an unused report']
          .map((a, i) => box(380, 80 + i * 100, 316, 74, a, true))
          .join('') +
        label(24, 447, 'A longer list is not necessarily a wider search.')
      );
    },
  },
  {
    id: 'enact-a-possibility-before-committing',
    type: 'comparison',
    title: 'Try a welcome desk before committing to the arrangement',
    height: 700,
    alt: 'Two simplified event entrance plans compare one host dividing attention between a visitor, a list, and a waiting person with two roles: initial contact and booking lookup. A separate map and queue marker are added in the second scene.',
    caption:
      'The second scene redistributes attention and clarifies waiting. Acting it out can expose new exceptions; the arrangement has not yet been validated with real visitors.',
    rationale:
      'A concrete plan comparison makes attention, roles, and physical arrangement visible in the same welcome-desk case.',
    draw(m) {
      function scene(x, y, w, after) {
        const mid = x + w / 2;
        let s =
          rect(x, y, w, 235, 'context') +
          rect(x + 24, y + 60, w - 48, 40, 'paper') +
          circle(mid - 30, y + 35, 12, after ? 'change' : 'paper') +
          text(x + 15, y + 220, after ? 'Clear wait marker' : 'Unclear waiting place', 'small');
        s +=
          circle(mid, y + 143, 12, 'paper') +
          circle(x + 40, y + 178, 12, 'paper') +
          rect(mid + 28, y + 65, 35, 27, 'paper');
        if (after)
          s +=
            circle(mid + 55, y + 35, 12, 'change') +
            line(mid - 30, y + 49, mid, y + 127, true) +
            line(mid + 55, y + 49, mid + 46, y + 62, true) +
            rect(x + w - 68, y + 149, 45, 32, 'change') +
            label(x + w - 68, y + 197, 'Map') +
            line(x + 25, y + 197, x + 62, y + 197, true) +
            label(x + 14, y + 15, 'Contact') +
            label(mid + 33, y + 15, 'Lookup');
        else
          s +=
            line(mid - 30, y + 49, mid, y + 127) +
            line(mid - 30, y + 49, mid + 46, y + 62) +
            line(mid - 30, y + 49, x + 40, y + 162) +
            label(x + 14, y + 15, 'One host');
        return s;
      }
      if (m)
        return (
          label(22, 30, 'First scene') +
          scene(22, 47, 316, false) +
          label(22, 333, 'Revised scene') +
          scene(22, 350, 316, true) +
          note(22, 637, 'Circles indicate people; lines show attention.')
        );
      return (
        label(24, 34, 'First scene / divided attention') +
        scene(24, 54, 324, false) +
        label(372, 34, 'Revised scene / separate roles') +
        scene(372, 54, 324, true) +
        note(24, 353, [
          'A waiting marker and a separate map change the arrangement.',
          'Try exceptions rather than rehearsing every difficulty away.',
        ]) +
        label(24, 432, 'Circles indicate people; lines show attention.')
      );
    },
  },
  {
    id: 'tell-the-story-without-words',
    type: 'comparison',
    title: 'A drawing opens another interpretation',
    height: 710,
    alt: 'A wordless drawing places one person between two blocks. A revised drawing shows people within both blocks and several possible connections. Tentative interpretations sit outside the drawings.',
    caption:
      'Changing scale and relationships can open a question about connecting work. The viewer’s interpretation remains tentative, and the artist can correct or reject it.',
    rationale:
      'The paired drawings demonstrate the change of representation while keeping interpretations outside the wordless image.',
    draw(m) {
      function scene(x, y, w, after) {
        const person = (px, py) =>
          circle(px, py, 6, 'paper') +
          path(`M${px} ${py + 7}v18m-12-10h24m-12 10l-10 13m10-13 10 13`);
        let s =
          rect(x, y, w, 200, 'paper') +
          rect(x + 25, y + 60, 80, 90, 'context') +
          rect(x + w - 105, y + 60, 80, 90, 'context');
        if (after)
          s +=
            person(x + 66, y + 88) +
            person(x + w - 66, y + 88) +
            person(x + w / 2, y + 116) +
            line(x + 80, y + 107, x + w - 80, y + 107, true) +
            line(x + 80, y + 124, x + w / 2 - 13, y + 142, true) +
            line(x + w / 2 + 13, y + 142, x + w - 80, y + 124, true);
        else
          s +=
            person(x + w / 2, y + 94) +
            line(x + 105, y + 115, x + w / 2 - 15, y + 115) +
            line(x + w / 2 + 15, y + 115, x + w - 105, y + 115);
        return s;
      }
      if (m)
        return (
          label(22, 30, 'First drawing') +
          scene(22, 47, 316, false) +
          text(22, 280, ['“One person seems to do', 'the connecting work.”'], 'muted') +
          label(22, 371, 'Revised drawing') +
          scene(22, 388, 316, true) +
          text(22, 626, ['“Who else could connect,', 'and what would support them?”'], 'muted')
        );
      return (
        label(24, 34, 'First drawing') +
        scene(24, 54, 324, false) +
        label(372, 34, 'Revised drawing') +
        scene(372, 54, 324, true) +
        text(24, 302, ['“One person seems to do', 'the connecting work.”'], 'muted') +
        text(372, 302, ['“Who else could connect,', 'and what would support them?”'], 'muted') +
        label(24, 415, 'Interpretations are conversation starters, not hidden truths.')
      );
    },
  },
  {
    id: 'five-alternative-frames',
    type: 'comparison',
    title: 'Five accounts of the same quiet reading group',
    height: 805,
    alt: 'The same observation, few members speaking, is viewed through five possible frames: turn-taking, the opening question, discussion climate, the purpose of the gathering, and participation conditions. Each points to a different inquiry.',
    caption:
      'Keep the observation constant while changing the account. These five frames suggest different questions; they are hypotheses to examine, and several may overlap.',
    rationale:
      'The comparison demonstrates five structurally different interpretations and the different inquiry each opens.',
    draw(m) {
      const rows = [
        ['Turn-taking', ['Who gets a chance to enter?']],
        ['Opening question', ['Which prompts invite a response?']],
        ['Discussion climate', ['Does speaking feel like a test?']],
        ['Purpose of the gathering', ['What makes the gathering worthwhile?']],
        ['Participation conditions', ['Can people hear and attend?']],
      ];
      if (m)
        return (
          text(
            22,
            28,
            ['Few members speak.', 'Current account: insufficient preparation.'],
            'muted',
          ) +
          rows
            .map((row, i) => {
              const y = 117 + i * 130;
              const question =
                i === 3
                  ? ['What makes the gathering', 'worthwhile?']
                  : i === 1
                    ? ['Which prompts invite', 'a response?']
                    : row[1];
              return (
                rect(22, y, 316, 102, 'change') +
                text(38, y + 29, i + 1 + ' / ' + row[0]) +
                text(38, y + 62, question, 'muted')
              );
            })
            .join('')
        );
      return (
        text(24, 30, 'Same observation: few members speak.') +
        label(24, 60, 'Current account: insufficient preparation') +
        label(24, 93, 'Alternative frame') +
        label(324, 93, 'A different inquiry') +
        rows
          .map((row, i) => {
            const y = 107 + i * 61;
            return (
              box(24, y, 278, 51, i + 1 + ' / ' + row[0], true) + text(324, y + 31, row[1], 'muted')
            );
          })
          .join('') +
        label(24, 450, 'Different questions, not established causes.')
      );
    },
  },
];
function svg(figure, mobile) {
  const width = mobile ? 360 : 720,
    height = mobile ? figure.height : 470;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(figure.title)}</title><desc id="desc">${esc(figure.alt)}</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L7 4L1 7" fill="none" stroke="#00855b" stroke-width="1.5"/></marker><marker id="gray-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L7 4L1 7" fill="none" stroke="#a6aca3" stroke-width="1.5"/></marker></defs><style>text{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:17px;font-weight:400;fill:#252c28}.small{font-size:13px}.muted{font-size:16px}.line,.accent{fill:none;stroke:#a6aca3;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.accent{stroke:#00855b}.dashed{stroke-dasharray:5 5}.context{fill:#f1f2ef;stroke:#a6aca3;stroke-width:1}.paper{fill:#fff;stroke:#a6aca3;stroke-width:1}.change{fill:#edf5f0;stroke:#00855b;stroke-width:1.5}</style><rect width="${width}" height="${height}" fill="#ffffff"/>${figure.draw(mobile)}</svg>\n`;
}
await mkdir(folder, { recursive: true });
const manifestPath = resolve(root, 'content/assets/manifest.json');
const metadata = [];
for (const figure of figures) {
  for (const mobile of [false, true])
    await writeFile(
      resolve(folder, figure.id + (mobile ? '-mobile' : '') + '.svg'),
      svg(figure, mobile),
    );
  metadata.push({
    id: figure.id,
    type: figure.type,
    file: `creativity/${figure.id}.svg`,
    compact_file: `creativity/${figure.id}-mobile.svg`,
    alt_text: figure.alt,
    caption: figure.caption,
    rationale: figure.rationale,
    width: 720,
    height: 470,
    compact_width: 360,
    compact_height: figure.height,
  });
}
// Read just before the update to preserve other sessions' manifest entries.
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const f of metadata) {
  manifest[f.file] = { width: f.width, height: f.height };
  manifest[f.compact_file] = { width: f.compact_width, height: f.compact_height };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(
  resolve(root, 'docs/pattern-packages/creativity-illustrations.json'),
  JSON.stringify(
    {
      style: 'Approved light editorial illustrations on fixed white',
      palette: {
        ink: '#252c28',
        construction: '#a6aca3',
        neutral: '#f1f2ef',
        accent: '#00855b',
        light_accent: '#edf5f0',
      },
      typography: 'Helvetica Neue regular; Helvetica and Arial fallbacks',
      figures: metadata,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Rendered ${figures.length} original figures and ${figures.length} phone compositions.`,
);
