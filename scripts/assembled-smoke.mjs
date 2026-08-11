import { chromium } from "@playwright/test";

const applicationUrl = process.argv[2];

if (!applicationUrl) {
  throw new Error(
    "The application URL is required for the assembled smoke journey."
  );
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { height: 844, width: 390 } });

  await page.goto(applicationUrl, { waitUntil: "networkidle" });
  await page.getByLabel("Label date").fill("2026-08-11");
  await page.getByLabel("Label time").fill("14:05");
  await page.getByRole("button", { name: "Save label time" }).click();
  await page
    .getByRole("heading", { name: "Sighting saved" })
    .waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Done" }).click();
  await page
    .getByRole("heading", { name: "Capture" })
    .waitFor({ state: "visible" });

  await page.getByRole("link", { name: "Plan" }).click();
  await page
    .getByRole("heading", { name: "Plan" })
    .waitFor({ state: "visible" });
  await page.getByLabel("Weekday").selectOption("2");
  await page.getByLabel("Approximate time").fill("14:05");
  await page
    .getByRole("heading", { name: "Not enough history to compare yet" })
    .waitFor({ state: "visible" });
} finally {
  await browser.close();
}
