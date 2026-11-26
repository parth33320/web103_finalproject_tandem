import { test, expect } from "@playwright/test";

test.describe("Tandem Hybrid AI End-to-End Verification", () => {
  test("Test 1: Cloud-Only mode routes requests to Google Cloud API and displays Cloud badge", async ({ page }) => {
    const IS_LIVE = process.env["LIVE_AI"] === "1";
    let cloudRequests = 0;

    if (!IS_LIVE) {
      // App Check token mock (specific subdomain) so Firebase App Check succeeds in headless Chromium
      await page.route("**/*firebaseappcheck.googleapis.com**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ token: "mock-appcheck-jwt", ttl: "3600s" }),
        });
      });
      await page.route("**/*firebasevertexai.googleapis.com**", async (route) => {
        cloudRequests++;
        const postData = route.request().postData() || "";
        const isMnemonic = postData.includes("memory hook") || postData.includes("contrast memory trick");
        const mockText = isMnemonic
          ? "In Japanese you write a polite letter on paper, while in Chinese you reach for the toilet paper roll."
          : "Japanese: 手紙を書きました。\nClue: I wrote a [ ___ ].";

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [{ content: { parts: [{ text: mockText }], role: "model" }, finishReason: "STOP" }],
          }),
        });
      });
    } else {
      // In LIVE_AI=1 mode, count real cloud requests without mocking them
      page.on("request", (req) => {
        if (req.url().includes("://firebasevertexai.googleapis.com")) cloudRequests++;
      });
    }

    await page.goto("/", { waitUntil: "networkidle" });

    // Switch to Cloud Only in Settings
    await page.getByRole("button", { name: "Settings" }).click();
    const cloudBtn = page.getByRole("button", { name: /Cloud Only/i });
    await cloudBtn.click();
    await expect(cloudBtn).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");

    // Start room & deal cards
    await page.getByPlaceholder(/Wang Xiaoming/i).fill("CloudTester");
    await page.getByRole("button", { name: /Create a room/i }).click();
    const dealBtn = page.getByRole("button", { name: /Deal the cards for everyone/i });
    await expect(dealBtn).toBeVisible({ timeout: 15000 });
    await dealBtn.click();

    // Trigger Context Sentence -> must hit cloud and show Cloud badge
    const sentenceBtn = page.getByRole("button", { name: /See in a sentence/i });
    await expect(sentenceBtn).toBeVisible({ timeout: 15000 });
    await sentenceBtn.dispatchEvent("click");

    await expect(page.getByText(/Cloud \(Gemini\)/i)).toBeVisible({ timeout: 15000 });
    expect(cloudRequests).toBeGreaterThan(0);
  });

  test("Test 2: Hybrid mode runs On-Device with zero cloud requests even when browser goes Offline", async ({ page, context }) => {
    let cloudRequests = 0;

    await page.route("**/*firebasevertexai.googleapis.com**", async (route) => {
      cloudRequests++;
      await route.abort();
    });

    // Stub Chrome's built-in Gemini Nano LanguageModel API
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).LanguageModel = {
        availability: async () => "available",
        create: async () => ({
          prompt: async (text: string) => {
            if (text.includes("memory")) {
              return "In Japanese it means letter, while in Chinese it means toilet paper.";
            }
            return "Japanese: 手紙を書きました。\nClue: I wrote a [ ___ ].";
          },
          destroy: () => {},
        }),
      };
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Verify Hybrid mode is active
    await page.getByRole("button", { name: "Settings" }).click();
    const hybridBtn = page.getByRole("button", { name: /Hybrid \(Nano \+ Cloud\)/i });
    await expect(hybridBtn).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");

    // Start room & deal cards
    await page.getByPlaceholder(/Wang Xiaoming/i).fill("OfflineTester");
    await page.getByRole("button", { name: /Create a room/i }).click();
    const dealBtn = page.getByRole("button", { name: /Deal the cards for everyone/i });
    await expect(dealBtn).toBeVisible({ timeout: 15000 });
    await dealBtn.click();

    const sentenceBtn = page.getByRole("button", { name: /See in a sentence/i });
    await expect(sentenceBtn).toBeVisible({ timeout: 15000 });

    // Simulate airplane mode / Wi-Fi drop mid-game
    await context.setOffline(true);

    await sentenceBtn.dispatchEvent("click");
    await expect(page.getByText(/On-Device \(Nano\)/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Clue:/i)).toBeVisible();
    expect(cloudRequests).toBe(0);

    // Restore network to submit answer & verify post-reveal On-Device mnemonic
    await context.setOffline(false);
    await page.locator("button").filter({ hasText: /^A/ }).first().dispatchEvent("click");

    const mnemonicBtn = page.getByRole("button", { name: /AI Memory Trick/i });
    await expect(mnemonicBtn).toBeVisible({ timeout: 15000 });
    await mnemonicBtn.dispatchEvent("click");

    await expect(page.getByText(/On-Device \(Nano\)/i)).toBeVisible({ timeout: 10000 });
    expect(cloudRequests).toBe(0);
  });

  test("Test 3: Cloud Linguistics Referee auto-fills Word Pool form", async ({ page }) => {
    // Mock signed-in user so /words/new route guard allows access
    await page.addInitScript(() => {
      localStorage.setItem("tandem-token", "mock.jwt.token");
    });
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 1, username: "parth33320", avatar_url: null, created_at: new Date().toISOString(), settings: null, stats: { games: 0, best: 0, words: 0, traps: 0 } }),
      });
    });

    // App Check token mock (specific subdomain) so Firebase App Check succeeds in headless Chromium
    await page.route("**/*firebaseappcheck.googleapis.com**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "mock-appcheck-jwt", ttl: "3600s" }),
      });
    });

    await page.route("**/*firebasevertexai.googleapis.com**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      reading: "benkyō",
                      pinyin: "miǎnqiǎng",
                      meaning_ja: "study",
                      meaning_zh: "reluctant or force",
                      relation: "false",
                      note: "In Japanese it means studying hard, while in Chinese it means forcing someone reluctantly.",
                    }),
                  },
                ],
                role: "model",
              },
              finishReason: "STOP",
            },
          ],
        }),
      });
    });

    await page.goto("/words/new", { waitUntil: "networkidle" });

    // Type characters and click Auto-Fill & Verify
    await page.locator("input[lang='ja']").fill("勉強");
    await page.getByRole("button", { name: /Auto-Fill & Verify with AI/i }).dispatchEvent("click");

    // Verify all fields populated accurately
    await expect(page.locator("input[value='benkyō']")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("input[value='miǎnqiǎng']")).toBeVisible();
    await expect(page.locator("input[value='study']")).toBeVisible();
    await expect(page.locator("input[value='reluctant or force']")).toBeVisible();
  });
});