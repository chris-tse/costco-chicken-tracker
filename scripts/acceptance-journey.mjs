import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const applicationUrl = process.argv[2];

if (!applicationUrl) {
  throw new Error(
    "The application URL is required for the acceptance journey."
  );
}

const JOURNEY_VIEWPORT = { height: 844, width: 390 };
const NARROW_VIEWPORTS = [375, 430];
const MINIMUM_TARGET_SIZE = 44;
const INITIAL_SIGHTING_PATTERN = /August 10, 2026 at 10:00 AM/;
const CORRECTED_SIGHTING_PATTERN = /August 17, 2026 at 2:15 PM/;
const FAILURE_SIGHTING_PATTERN = /August 24, 2026 at 12:00 PM/;
const DONENESS_FAILURE_PATTERN = /Unable to save doneness/;

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function describeViewport(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

async function expectVisible(locator, description) {
  await locator.waitFor({ state: "visible" });
  ensure(await locator.isVisible(), `${description} is visible`);
}

async function assertNoHorizontalOverflow(page, description) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  ensure(
    dimensions.scrollWidth <= dimensions.clientWidth,
    `${description} does not overflow horizontally (${dimensions.scrollWidth}px > ${dimensions.clientWidth}px)`
  );
}

async function assertTouchTargets(page, description) {
  const undersizedTargets = await page
    .locator("a, button, input, select")
    .evaluateAll(
      (elements, minimumTargetSize) =>
        elements.flatMap((element) => {
          const rectangle = element.getBoundingClientRect();
          const name =
            element.getAttribute("aria-label") ||
            element.textContent?.trim() ||
            element.getAttribute("id") ||
            element.tagName.toLowerCase();

          return rectangle.width >= minimumTargetSize &&
            rectangle.height >= minimumTargetSize
            ? []
            : [
                {
                  height: Math.round(rectangle.height),
                  name,
                  width: Math.round(rectangle.width),
                },
              ];
        }),
      MINIMUM_TARGET_SIZE
    );

  ensure(
    undersizedTargets.length === 0,
    `${description} has an interactive target below ${MINIMUM_TARGET_SIZE}px: ${JSON.stringify(undersizedTargets)}`
  );
}

async function assertAccessibility(page, description) {
  const results = await new AxeBuilder({ page }).analyze();
  const blockingViolations = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious"
  );

  ensure(
    blockingViolations.length === 0,
    `${description} has serious or critical axe violations: ${JSON.stringify(blockingViolations)}`
  );

  await assertNoHorizontalOverflow(page, description);
  await assertTouchTargets(page, description);
}

async function openCapture(page) {
  await page.goto(applicationUrl, { waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Capture" }),
    "Capture heading"
  );
}

async function saveSighting(page, labelDate, labelTime) {
  await page.getByLabel("Label date").fill(labelDate);
  await page.getByLabel("Label time").fill(labelTime);
  await page.getByRole("button", { name: "Save label time" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Sighting saved" }),
    "completion heading"
  );
}

async function assertFocused(locator, description) {
  await locator.waitFor({ state: "visible" });
  const isFocused = await locator.evaluate(
    (element) => document.activeElement === element
  );
  ensure(isFocused, `${description} receives focus`);
}

async function runFullJourney(page) {
  await openCapture(page);
  await expectVisible(page.getByRole("main"), "main landmark");
  await expectVisible(
    page.getByRole("navigation", { name: "Primary navigation" }),
    "navigation"
  );
  await expectVisible(page.getByLabel("Label time"), "labelled time input");
  await expectVisible(page.getByLabel("Label date"), "labelled date input");
  await assertAccessibility(page, "initial Capture at 390px");

  await page.getByLabel("Label time").focus();
  await assertFocused(
    page.getByLabel("Label time"),
    "Capture label-time input"
  );
  await page.keyboard.press("Tab");
  await assertFocused(
    page.getByLabel("Label date"),
    "Capture label-date input after Tab"
  );
  await page.keyboard.press("Shift+Tab");
  await assertFocused(
    page.getByLabel("Label time"),
    "Capture label-time input after Shift+Tab"
  );
  await page.getByLabel("Label date").fill("2026-08-10");
  await page.getByLabel("Label time").fill("10:00");
  await page.getByLabel("Label time").focus();
  await page.keyboard.press("Enter");
  await expectVisible(
    page.getByRole("heading", { name: "Sighting saved" }),
    "completion heading after keyboard submit"
  );
  await assertFocused(
    page.getByRole("heading", { name: "Sighting saved" }),
    "completion heading"
  );
  await assertAccessibility(page, "completion at 390px");

  await page.reload({ waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Capture" }),
    "Capture after reload"
  );
  const persistedSighting = page.getByRole("button", {
    name: INITIAL_SIGHTING_PATTERN,
  });
  await expectVisible(
    persistedSighting,
    "recent sighting after reload before enrichment"
  );
  await persistedSighting.click();
  await expectVisible(
    page.getByRole("heading", { name: "Correct sighting" }),
    "correction heading"
  );
  await assertFocused(
    page.getByRole("heading", { name: "Correct sighting" }),
    "correction heading"
  );
  await assertAccessibility(page, "correction at 390px");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Capture" }),
    "Capture after cancel"
  );

  await saveSighting(page, "2026-08-17", "14:05");
  await page.getByRole("button", { name: "Medium" }).focus();
  await assertFocused(
    page.getByRole("button", { name: "Medium" }),
    "Medium doneness button"
  );
  await page.keyboard.press("Space");
  await expectVisible(
    page.getByText("Doneness saved as medium."),
    "doneness status"
  );
  await page.getByRole("button", { name: "Correct this sighting" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Correct sighting" }),
    "completion correction"
  );
  await page.getByLabel("Label time").fill("14:15");
  await page.getByLabel("Doneness").selectOption("dark");
  await page.getByRole("button", { name: "Save correction" }).focus();
  await page.keyboard.press("Enter");
  await expectVisible(
    page.getByRole("heading", { name: "Sighting saved" }),
    "completion after correction"
  );
  await expectVisible(
    page.getByText(CORRECTED_SIGHTING_PATTERN),
    "corrected label time"
  );
  await page.getByRole("button", { exact: true, name: "Done" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Capture" }),
    "Capture after Done"
  );
  ensure(
    !new URL(page.url()).searchParams.has("completion"),
    "Done removes the completion recovery URL"
  );

  await expectVisible(
    page.getByRole("heading", { name: "Recent Sightings" }),
    "recent heading"
  );
  await page.getByRole("button", { name: CORRECTED_SIGHTING_PATTERN }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Correct sighting" }),
    "recent correction"
  );
  await page.getByRole("button", { name: "Delete sighting" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Permanently delete this sighting?" }),
    "deletion confirmation"
  );
  await assertFocused(
    page.getByRole("heading", { name: "Permanently delete this sighting?" }),
    "deletion confirmation heading"
  );
  await page.getByRole("button", { name: "Permanently delete" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Capture" }),
    "Capture after deletion"
  );
  ensure(
    (await page
      .getByRole("button", { name: CORRECTED_SIGHTING_PATTERN })
      .count()) === 0,
    "deleted sighting is absent from Recent Sightings"
  );

  await page.getByRole("link", { name: "Plan" }).focus();
  await assertFocused(page.getByRole("link", { name: "Plan" }), "Plan link");
  await page.keyboard.press("Enter");
  await expectVisible(
    page.getByRole("heading", { name: "Plan" }),
    "Plan heading"
  );
  await page.getByLabel("Weekday").selectOption("1");
  await expectVisible(
    page.getByRole("heading", { name: "No history for this weekday" }),
    "no-weekday-history state"
  );
  await page.getByLabel("Weekday").selectOption("0");
  await page.getByLabel("Approximate time").fill("10:00");
  await expectVisible(
    page.getByRole("heading", { name: "Not enough history to compare yet" }),
    "sparse Plan state"
  );
  await assertAccessibility(page, "Plan at 390px");

  await page.getByRole("link", { name: "Capture" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Capture" }),
    "Capture before failure case"
  );
  await saveSighting(page, "2026-08-24", "12:00");

  let interceptedEnrichment = false;
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      interceptedEnrichment = true;
      await route.abort("failed");
      return;
    }

    await route.continue();
  });
  await page.getByRole("button", { name: "Light" }).click();
  await expectVisible(
    page.getByText(DONENESS_FAILURE_PATTERN),
    "enrichment failure"
  );
  ensure(interceptedEnrichment, "enrichment request was intercepted");
  await page.unroute("**/*");
  await page.reload({ waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Capture" }),
    "Capture after enrichment failure"
  );
  await page.getByRole("button", { name: FAILURE_SIGHTING_PATTERN }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Correct sighting" }),
    "correction after enrichment failure"
  );
}

async function assertNarrowViewports(browser) {
  for (const width of NARROW_VIEWPORTS) {
    const viewport = { height: 844, width };
    const page = await browser.newPage({ viewport });

    try {
      await openCapture(page);
      await assertAccessibility(
        page,
        `Capture at ${describeViewport(viewport)}`
      );
      await page.getByRole("link", { name: "Plan" }).click();
      await expectVisible(
        page.getByRole("heading", { name: "Plan" }),
        "Plan heading"
      );
      await assertAccessibility(page, `Plan at ${describeViewport(viewport)}`);
    } finally {
      await page.close();
    }
  }
}

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH,
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: JOURNEY_VIEWPORT });

  try {
    await runFullJourney(page);
  } finally {
    await page.close();
  }

  await assertNarrowViewports(browser);
  console.log(
    JSON.stringify({
      browser:
        process.env.ACCEPTANCE_BROWSER_LABEL ?? `Chromium ${browser.version()}`,
      result: "passed",
      viewports: [JOURNEY_VIEWPORT.width, ...NARROW_VIEWPORTS],
    })
  );
} finally {
  await browser.close();
}
