#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { chromium } from "playwright";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const ROOT = process.cwd();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to resolve an open localhost port")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(String(port));
      });
    });
  });
}

async function waitForServer(url, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function startAppServer(port) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev", "--", "-H", HOST, "-p", port], {
    cwd: ROOT,
    stdio: "pipe",
    env: {
      ...process.env,
      HOST,
      PORT: port,
    },
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  return child;
}

async function main() {
  const port = process.env.SMOKE_PORT || (await getAvailablePort());
  const baseUrl = process.env.SMOKE_BASE_URL || `http://${HOST}:${port}`;
  rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
  const server = startAppServer(port);
  const tempDir = mkdtempSync(path.join(tmpdir(), "nama-founder-smoke-"));
  const csvPath = path.join(tempDir, "employees.csv");
  const csv = [
    "name,email,role,designation,team,reportsTo,responsibility",
    "Ritika Sen,ritika@aurora.example,Sales,Senior Executive,Inbound Desk,Sales Manager,Inbound CRM and quote follow-up",
    "Kabir Rao,kabir@aurora.example,Operations,Trip Designer,Luxury Desk,Operations Lead,Trip design and supplier coordination",
    "Zoya Ali,zoya@aurora.example,Finance,Accounts Lead,Billing,Finance Lead,Billing and reconciliation",
  ].join("\n");
  writeFileSync(csvPath, csv, "utf8");

  let browser;

  try {
    await waitForServer(`${baseUrl}/register`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/register`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox", { name: "Company Name" }).fill("Aurora Reserve Travel");
    await page.getByRole("textbox", { name: "Workspace Operator" }).fill("Radhika Founder");
    await page.locator("button").filter({ hasText: "Enterprise" }).first().click();
    await page.getByRole("button", { name: /Enter Demo Workspace/i }).click();
    await page.waitForURL("**/dashboard");

    await page.goto(`${baseUrl}/dashboard/team`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "bulk", exact: true }).click();
    await expectVisible(page, "Upload Employee List");
    await page.locator('label:has-text("Upload Employee List") input[type="file"]').setInputFiles(csvPath);
    await expectVisible(page, "Imported 3 employees into the directory.");

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < Math.min(count, 2); i += 1) {
      await checkboxes.nth(i).check();
    }
    await page.getByRole("button", { name: /Send to Selected/i }).click();

    await page.getByRole("button", { name: "invite", exact: true }).click();
    await expectVisible(page, "Select from employee directory");
    const employeeDirectorySelect = page.getByText("Select from employee directory").locator("..").locator("select");
    await employeeDirectorySelect.waitFor({ state: "visible", timeout: 20000 });
    await employeeDirectorySelect.locator("option", { hasText: "Ritika Sen · Sales" }).waitFor({
      state: "attached",
      timeout: 20000,
    });
    await employeeDirectorySelect.selectOption({ label: "Ritika Sen · Sales" });
    await page.getByRole("button", { name: /Send Individual Invite/i }).click();

    const openAcceptance = page.getByRole("link", { name: /Open acceptance/i }).last();
    const inviteHref = await openAcceptance.getAttribute("href");
    if (!inviteHref) throw new Error("Invite acceptance link was not generated");

    await page.goto(`${baseUrl}${inviteHref}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("heading", { name: /Join the workspace/i }).waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: /Accept Invite/i }).click();
    await expectVisible(page, "Invite accepted");

    await page.goto(`${baseUrl}/dashboard/leads`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^List$/ }).click();
    await page.getByRole("button", { name: /Open contact/i }).first().click();
    await page.getByRole("button", { name: /^Won$/ }).click();

    await page.goto(`${baseUrl}/dashboard/finance`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Record Deposit/i }).first().click();

    await page.goto(`${baseUrl}/dashboard/bookings?case=maldives-honeymoon`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Release guest pack now/i }).click();

    await page.goto(`${baseUrl}/dashboard/invoices/maldives-honeymoon`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Mark Paid/i }).click();

    await page.goto(`${baseUrl}/dashboard/traveler-pdf/maldives-honeymoon`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Mark shared/i }).click();

    await page.goto(`${baseUrl}/dashboard/admin`);
    await page.waitForLoadState("networkidle");
    await expectVisible(page, "Aurora Reserve Travel");
    await expectVisible(page, "Enterprise");
    await expectVisible(page, "Logged-in Users");
    await expectVisible(page, "Golden Path Status");
    await expectVisible(page, "Accepted Invites");

    console.log("\nFounder flow smoke passed.");
  } finally {
    if (browser) await browser.close();
    rmSync(tempDir, { recursive: true, force: true });
    server.kill("SIGTERM");
  }
}

async function expectVisible(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
}

main().catch((error) => {
  console.error("\nFounder flow smoke failed.");
  console.error(error);
  process.exitCode = 1;
});
