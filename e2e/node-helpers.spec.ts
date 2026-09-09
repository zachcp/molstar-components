import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Systematic coverage of node-kind helper dialogs, derived from a scripted
 * exploration pass over the `demo-builder` docs example (see
 * context/plans/2026-08-09-unimplemented-node-helpers.md for the write-up
 * of what that exploration also turned up: 3 kinds with no helper at all).
 *
 * Each case adds one child node of a given kind to a known row in the
 * preloaded 1opl demo tree (via the row's "⋮" actions menu → "Add child"),
 * opens the resulting helper dialog, and asserts its title/tab structure.
 */

function builderLocator(page: Page): Locator {
  return page.locator('#demo-builder [data-ui-builder]');
}

/** Adds a child of `kindLabel` (the exact "Add child" submenu item text) to
 * the row whose summary text is exactly `parentRowText`, then opens the
 * newly-added row's helper dialog. The new row is located by diffing row
 * text before/after the add — different node kinds render different
 * "unconfigured" placeholder text (e.g. generic rows say "click to
 * configure…", `primitives` says "click to add primitives…", and `focus`
 * isn't even null-summary — so there's no single placeholder string to
 * match on). Returns the dialog and the new row's text, so callers can
 * chain a second add-child off of it without re-deriving that text. */
async function addChildAndOpenHelper(
  page: Page,
  parentRowText: string,
  kindLabel: string,
): Promise<{ dialog: Locator; newRowText: string }> {
  const builder = builderLocator(page);
  const rows = builder.locator('button.bg-muted\\/40');

  const before = await rows.allTextContents();
  const parentIndex = before.indexOf(parentRowText);
  if (parentIndex === -1) throw new Error(`parent row "${parentRowText}" not found`);

  const actionButtons = builder.locator('button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-horizontal)');
  await actionButtons.nth(parentIndex).click();
  const menu = page.locator('[role="menu"]').last();
  await menu.getByText('Add child', { exact: true }).hover();
  const subMenu = page.locator('[role="menu"]').last();
  await subMenu.getByText(kindLabel, { exact: true }).click();

  await expect(rows).toHaveCount(before.length + 1);
  const after = await rows.allTextContents();
  let newIndex = after.length - 1;
  for (let i = 0; i < after.length; i++) {
    if (before[i] !== after[i]) { newIndex = i; break; }
  }
  const newRowText = after[newIndex];

  await rows.nth(newIndex).click();

  const dialog = page.locator('[data-slot=dialog-content]');
  await expect(dialog).toBeVisible();
  return { dialog, newRowText };
}

interface HelperCase {
  parentRow: string;
  addChildLabel: string;
  expectedTitle: string;
  expectedTabs: string[];
}

const cases: HelperCase[] = [
  { parentRow: 'Chain A', addChildLabel: 'Label', expectedTitle: 'Label', expectedTabs: ['Label', 'Raw'] },
  { parentRow: 'Chain A', addChildLabel: 'Tooltip', expectedTitle: 'Tooltip', expectedTabs: ['Tooltip', 'Raw'] },
  { parentRow: 'Chain A', addChildLabel: 'Focus', expectedTitle: 'Focus', expectedTabs: ['Vectors', 'Presets', 'Radius', 'Raw'] },
  { parentRow: 'cartoon', addChildLabel: 'Clip', expectedTitle: 'Clip', expectedTabs: ['Clip', 'Raw'] },
  { parentRow: 'cartoon', addChildLabel: 'Color From Source', expectedTitle: 'Color From Source', expectedTabs: ['Color from Source', 'Raw'] },
  { parentRow: 'cartoon', addChildLabel: 'Color From Uri', expectedTitle: 'Color From Uri', expectedTabs: ['Color from URI', 'Raw'] },
  { parentRow: 'model', addChildLabel: 'Primitives', expectedTitle: 'Primitive Helper', expectedTabs: ['Config', 'Raw'] },
  { parentRow: 'model', addChildLabel: 'Label From Source', expectedTitle: 'Label From Source', expectedTabs: ['Label from Source', 'Raw'] },
  { parentRow: 'model', addChildLabel: 'Label From Uri', expectedTitle: 'Label From Uri', expectedTabs: ['Label from URI', 'Raw'] },
  { parentRow: 'model', addChildLabel: 'Tooltip From Source', expectedTitle: 'Tooltip From Source', expectedTabs: ['Tooltip from Source', 'Raw'] },
  { parentRow: 'model', addChildLabel: 'Tooltip From Uri', expectedTitle: 'Tooltip From Uri', expectedTabs: ['Tooltip from URI', 'Raw'] },
  { parentRow: 'model', addChildLabel: 'Component From Source', expectedTitle: 'Component From Source', expectedTabs: ['Component from Source', 'Selector', 'Raw'] },
  { parentRow: 'model', addChildLabel: 'Component From Uri', expectedTitle: 'Component From Uri', expectedTabs: ['Component from URI', 'Selector', 'Raw'] },
];

test.describe('Node helper dialogs', () => {
  for (const c of cases) {
    test(`${c.addChildLabel} (child of "${c.parentRow}") opens with expected title and tabs`, async ({ page }) => {
      await page.goto('/state-builder-docs.html');
      await expect(builderLocator(page)).toBeVisible();

      const { dialog } = await addChildAndOpenHelper(page, c.parentRow, c.addChildLabel);
      await expect(dialog.locator('[data-slot=dialog-title]')).toHaveText(c.expectedTitle);
      await expect(dialog.getByRole('tab')).toHaveText(c.expectedTabs);
    });
  }

  test('Volume (child of download/parse) and its Volume Representation child both open correctly', async ({ page }) => {
    // Fetches real volume data from a live remote server and computes an
    // isosurface — noticeably heavier than the other cases here. Comfortably
    // under the default timeout locally, but slow CI runners (software-
    // rendered WebGL, no GPU) push it right up against the 60s budget.
    test.slow();

    await page.goto('/state-builder-docs.html');
    const builder = builderLocator(page);
    await expect(builder).toBeVisible();

    const { dialog: volumeDialog, newRowText: volumeRowText } = await addChildAndOpenHelper(
      page,
      'www.ebi.ac.uk/…/1opl.bcif',
      'Volume',
    );
    await expect(volumeDialog.locator('[data-slot=dialog-title]')).toHaveText('Volume');
    await expect(volumeDialog.getByRole('tab')).toHaveText(['Volume', 'Raw']);
    await page.keyboard.press('Escape');

    const { dialog: volRepDialog } = await addChildAndOpenHelper(page, volumeRowText, 'Volume Representation');
    await expect(volRepDialog.locator('[data-slot=dialog-title]')).toHaveText('Volume Representation');
    await expect(volRepDialog.getByRole('tab')).toHaveText(['Volume Representation', 'Raw']);
  });
});

test.describe('Unimplemented node kinds stay hidden from kind pickers', () => {
  /**
   * coordinates/instance/primitives_from_uri have no editing helper at all
   * (see context/plans/2026-08-09-unimplemented-node-helpers.md) — clicking
   * one opens nothing. They're filtered out of every kind picker via
   * withImplementedHelpersOnly() in node-categories.ts. This guards against
   * that filter regressing.
   */
  test('Coordinates does not appear in the download/parse "Add child" menu', async ({ page }) => {
    await page.goto('/state-builder-docs.html');
    const builder = builderLocator(page);
    await expect(builder).toBeVisible();

    const actionButtons = builder.locator('button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-horizontal)');
    await actionButtons.first().click();
    const menu = page.locator('[role="menu"]').last();
    await menu.getByText('Add child', { exact: true }).hover();
    const subMenu = page.locator('[role="menu"]').last();
    await expect(subMenu.getByText('Coordinates', { exact: true })).toHaveCount(0);
  });

  test('Instance and Primitives From Uri do not appear in the structure node\'s "Add child" menu', async ({ page }) => {
    await page.goto('/state-builder-docs.html');
    const builder = builderLocator(page);
    const rows = builder.locator('button.bg-muted\\/40');
    await expect(rows).toHaveCount(15);

    const modelIndex = (await rows.allTextContents()).indexOf('model');
    const actionButtons = builder.locator('button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-horizontal)');
    await actionButtons.nth(modelIndex).click();
    const menu = page.locator('[role="menu"]').last();
    await menu.getByText('Add child', { exact: true }).hover();
    const subMenu = page.locator('[role="menu"]').last();

    await expect(subMenu.getByText('Instance', { exact: true })).toHaveCount(0);
    await expect(subMenu.getByText('Primitives From Uri', { exact: true })).toHaveCount(0);
  });
});
