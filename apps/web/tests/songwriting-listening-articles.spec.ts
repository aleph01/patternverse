import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const integration = JSON.parse(
  readFileSync(
    new URL('../../../docs/songwriting-course/listening-integration.json', import.meta.url),
    'utf8',
  ),
) as {
  articles: { number: number; id: string; heading: string; source_links: string[] }[];
};
const plan = JSON.parse(
  readFileSync(new URL('../../../docs/songwriting-course/chapters.json', import.meta.url), 'utf8'),
) as { chapters: { id: string; part: number }[] };

test.skip(!process.env.SONGWRITING_DRAFT_REVIEW, 'Local unpublished-course review only.');

for (let part = 1; part <= 8; part += 1) {
  test(`written listening studies in part ${part} remain readable and linked`, async ({ page }) => {
    const ids = new Set(
      plan.chapters.filter((chapter) => chapter.part === part).map((chapter) => chapter.id),
    );
    const studies = integration.articles.filter((study) => ids.has(study.id));
    for (const study of studies) {
      const response = await page.goto(`/pattern/${study.id}`);
      expect(response?.status(), study.id).toBe(200);
      await expect(page.locator('.draft-label')).toBeVisible();
      const body = page.locator('.entity-article .markdown-body');
      const heading = body.getByRole('heading', { name: study.heading, exact: true });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      for (const url of study.source_links) {
        await expect(body.locator(`a[href="${url}"]`)).not.toHaveCount(0);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        study.id,
      ).toBe(true);
      await expect(page.locator('.listening-example iframe')).toHaveCount(0);
      if ([17, 27, 35, 41, 48].includes(study.number)) {
        await page.screenshot({
          path: test.info().outputPath(`${study.number}-listening-study.png`),
        });
      }
    }
  });
}

test('listening guide exposes the complete article index with working routes', async ({ page }) => {
  await page.goto('/collection/songwriting-listening-guide');
  const body = page.locator('.entity-article .markdown-body');
  const tables = body.locator('table');
  await expect(tables).toHaveCount(8);
  await expect(tables.locator('tbody tr')).toHaveCount(plan.chapters.length);
  await expect(body).toContainText(
    'Only the three studies above currently have in-page YouTube players.',
  );
  const target = body.getByRole('link', { name: 'Point to a Temporary Home', exact: true });
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute('href', '/pattern/songwriting-point-to-a-temporary-home');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: test.info().outputPath('listening-guide-index.png') });
  await target.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Point to a Temporary Home');
  await expect(page.locator('.entity-article .markdown-body')).toContainText('V7/V–V');
});
