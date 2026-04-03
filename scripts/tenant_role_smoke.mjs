#!/usr/bin/env node

import { rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { chromium } from "playwright";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const ROOT = process.cwd();
const CASE_SLUG = "maldives-honeymoon";
const COMPANY_NAME = "Beta Role Labs";
const OPERATOR_NAME = "Radhika Beta";
const PLAN_NAME = "Growth";
const ADMIN_ACCESS_CODE = "Beta-admin-01";

function tenantToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tenantAccessCode(role) {
  const codeTenant = tenantToken(COMPANY_NAME).slice(0, 8).toUpperCase() || "TENANT";
  const codeRole = role === "customer-admin" ? "ADMIN" : role.toUpperCase();
  return `NAMA-${codeTenant}-${codeRole}`;
}

function tenantEmailForRole(role) {
  const token = tenantToken(COMPANY_NAME);
  const roleToken = {
    "customer-admin": "admin",
    sales: "sales",
    finance: "finance",
    operations: "ops",
    viewer: "viewer",
  }[role];
  return `${roleToken}@${token}.demo`;
}

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

async function expectVisible(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
}

async function expectHeading(page, heading) {
  await page.getByRole("heading", { name: heading }).waitFor({ state: "visible", timeout: 20000 });
}

async function expectDisabled(locator, label) {
  const disabled = await locator.isDisabled();
  if (!disabled) {
    throw new Error(`${label} was expected to be disabled`);
  }
}

async function expectEnabled(locator, label) {
  const disabled = await locator.isDisabled();
  if (disabled) {
    throw new Error(`${label} was expected to be enabled`);
  }
}

async function switchRole(page, role) {
  await page.goto("/workspace/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: /Workspace email/i }).fill(tenantEmailForRole(role));
  await page.getByRole("textbox", { name: /^Access code$/ }).fill(tenantAccessCode(role));
  await page.getByRole("button", { name: /Enter Workspace/i }).click();
}

async function verifyWorkspaceLoginFailure(page) {
  await page.goto("/workspace/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: /Workspace email/i }).fill(tenantEmailForRole("sales"));
  await page.getByRole("textbox", { name: /^Access code$/ }).fill("NAMA-BAD-CODE");
  await page.getByRole("button", { name: /Enter Workspace/i }).click();
  await expectVisible(page, "Invalid tenant member credentials");
}

async function registerTenant(page, baseUrl) {
  await page.goto(`${baseUrl}/register`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Company Name" }).fill(COMPANY_NAME);
  await page.getByRole("textbox", { name: "Workspace Operator" }).fill(OPERATOR_NAME);
  await page.getByLabel("Workspace Admin Access Code").fill(ADMIN_ACCESS_CODE);
  await page.getByLabel("Confirm Access Code").fill(ADMIN_ACCESS_CODE);
  await page.locator("button").filter({ hasText: PLAN_NAME }).first().click();
  await page.getByRole("button", { name: /Enter Demo Workspace/i }).click();
  await page.waitForURL("**/dashboard");
  await expectVisible(page, "Operations Overview");
}

async function verifySalesRole(page) {
  await switchRole(page, "sales");

  await page.goto("/dashboard/finance");
  await page.waitForURL("**/dashboard/leads");
  await expectHeading(page, /Leads & Contacts/i);

  await page.getByRole("button", { name: /^List$/ }).click();
  await page.getByRole("button", { name: /Open contact/i }).first().click();
  const wonButton = page.getByRole("button", { name: /^Won$/ });
  await expectEnabled(wonButton, "Sales Won stage button");
  await wonButton.click();
}

async function verifyFinanceRole(page) {
  await switchRole(page, "finance");

  await page.goto("/dashboard/team");
  await page.waitForURL("**/dashboard/finance");
  await expectHeading(page, /Finance Control/i);

  await expectEnabled(page.getByRole("button", { name: /^Send Quote$/ }).first(), "Finance Send Quote");
  await expectEnabled(page.getByRole("button", { name: /^Record Deposit$/ }).first(), "Finance Record Deposit");
  await expectEnabled(page.getByRole("button", { name: /Export CSV/i }), "Finance Export CSV");

  await page.goto(`/dashboard/bookings?case=${CASE_SLUG}`);
  await page.waitForLoadState("networkidle");
  await expectDisabled(page.getByRole("button", { name: /Release guest pack now/i }), "Finance release guest pack");
  await expectVisible(page, "only Operations or Customer Admin can release the guest pack");

  await page.goto(`/dashboard/invoices/${CASE_SLUG}`);
  await page.waitForLoadState("networkidle");
  await expectEnabled(page.getByRole("button", { name: /^Mark Sent$/ }), "Finance Mark Sent");
  await expectEnabled(page.getByRole("button", { name: /^Mark Paid$/ }), "Finance Mark Paid");
}

async function verifyOperationsRole(page) {
  await switchRole(page, "operations");

  await page.goto("/dashboard/leads");
  await page.waitForURL("**/dashboard/bookings");
  await expectHeading(page, /Booking Execution Hub/i);

  const releaseButton = page.getByRole("button", { name: /Release guest pack now/i });
  await expectEnabled(releaseButton, "Operations release guest pack");
  await releaseButton.click();

  await page.goto(`/dashboard/traveler-pdf/${CASE_SLUG}`);
  await page.waitForLoadState("networkidle");
  await expectEnabled(page.getByRole("button", { name: /Approve for send/i }), "Operations approve for send");
  await expectEnabled(page.getByRole("button", { name: /Mark shared/i }), "Operations mark shared");
}

async function verifyViewerRole(page) {
  await switchRole(page, "viewer");

  await page.goto("/dashboard/leads");
  await page.waitForURL("**/dashboard/artifacts");
  await expectHeading(page, /Artifact Hub/i);

  await page.goto(`/dashboard/invoices/${CASE_SLUG}`);
  await page.waitForURL("**/dashboard/artifacts");

  await page.goto(`/dashboard/traveler-pdf/${CASE_SLUG}`);
  await page.waitForLoadState("networkidle");
  await expectDisabled(page.getByRole("button", { name: /Approve for send/i }), "Viewer approve for send");
  await expectDisabled(page.getByRole("button", { name: /Mark shared/i }), "Viewer mark shared");
  await expectVisible(page, "only Operations or Customer Admin can approve and dispatch the guest pack");
}

async function main() {
  const port = process.env.SMOKE_PORT || (await getAvailablePort());
  const baseUrl = process.env.SMOKE_BASE_URL || `http://${HOST}:${port}`;
  rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
  const server = startAppServer(port);
  let browser;

  try {
    await waitForServer(`${baseUrl}/register`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ baseURL: baseUrl });

    await registerTenant(page, baseUrl);
    await verifyWorkspaceLoginFailure(page);
    await verifySalesRole(page);
    await verifyFinanceRole(page);
    await verifyOperationsRole(page);
    await verifyViewerRole(page);

    console.log("\nTenant role smoke passed.");
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("\ntenant role smoke failed.");
  console.error(error);
  process.exitCode = 1;
});
