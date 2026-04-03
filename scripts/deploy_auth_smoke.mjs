#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { chromium } from "playwright";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const ROOT = process.cwd();
const SCENARIO = {
  companyName: "Deploy Auth Labs",
  operatorName: "Radhika Deploy",
  planName: "Growth",
  adminAccessCode: "Deploy-admin-01",
  inviteAccessCode: "Deploy-sales-01",
  inviteEmployee: "Mira Dev · Sales",
  employees: [
    "name,email,role,designation,team,reportsTo,responsibility",
    "Mira Dev,mira@deployauth.example,Sales,Senior Executive,Inbound Desk,Sales Manager,Lead ownership and quote follow-up",
    "Karan Ops,karan@deployauth.example,Operations,Operations Lead,Fulfilment Desk,Customer Admin,Bookings and traveler release",
  ].join("\n"),
};

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

function startBuiltAppServer(port) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "start", "--", "-H", HOST, "-p", port], {
    cwd: ROOT,
    stdio: "pipe",
    env: {
      ...process.env,
      HOST,
      PORT: port,
      SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET || "deploy-auth-smoke-secret",
      SUPER_ADMIN_BOOTSTRAP_CODE: process.env.SUPER_ADMIN_BOOTSTRAP_CODE || "Nama-root-01",
    },
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function expectVisible(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 20000 });
}

async function expectTenantAuthRedirect(page, baseUrl) {
  const currentUrl = page.url();
  if (currentUrl.includes("/workspace/login") || currentUrl.includes("/register")) {
    return;
  }

  try {
    await page.waitForURL(/\/(workspace\/login|register)/, { timeout: 10000 });
  } catch {
    await page.goto(`${baseUrl}/workspace/login`);
    await page.waitForURL(/\/(workspace\/login|register)/);
  }
}

async function registerTenant(page, baseUrl) {
  await page.goto(`${baseUrl}/register`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Company Name" }).fill(SCENARIO.companyName);
  await page.getByRole("textbox", { name: "Workspace Operator" }).fill(SCENARIO.operatorName);
  await page.getByLabel("Workspace Admin Access Code").fill(SCENARIO.adminAccessCode);
  await page.getByLabel("Confirm Access Code").fill(SCENARIO.adminAccessCode);
  await page.locator("button").filter({ hasText: SCENARIO.planName }).first().click();
  await page.getByRole("button", { name: /Enter Demo Workspace/i }).click();
  try {
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  } catch {
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForURL("**/dashboard");
  }
  await expectVisible(page, "Operations Overview");
}

async function importAndInviteEmployee(page, baseUrl, csvPath) {
  await page.goto(`${baseUrl}/dashboard/team`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "bulk", exact: true }).click();
  await page.locator('label:has-text("Upload Employee List") input[type="file"]').setInputFiles(csvPath);
  await expectVisible(page, "Imported");
  await page.getByRole("button", { name: "invite", exact: true }).click();
  const employeeDirectorySelect = page.getByText("Select from employee directory").locator("..").locator("select");
  await employeeDirectorySelect.selectOption({ label: SCENARIO.inviteEmployee });
  await page.getByRole("button", { name: /Send Individual Invite/i }).click();
  const openAcceptance = page.getByRole("link", { name: /Open acceptance/i }).first();
  const inviteHref = await openAcceptance.getAttribute("href");
  if (!inviteHref) throw new Error("Invite acceptance link was not generated");
  return inviteHref;
}

async function acceptInvite(page, baseUrl, inviteHref) {
  await page.goto(`${baseUrl}${inviteHref}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("New access code").fill(SCENARIO.inviteAccessCode);
  await page.getByLabel("Confirm access code").fill(SCENARIO.inviteAccessCode);
  await page.getByRole("button", { name: /Activate Invite & Continue/i }).click();
  await page.waitForURL(/\/workspace\/login/);
  await page.getByRole("button", { name: /Enter Workspace/i }).click();
  try {
    await page.waitForURL("**/dashboard/leads", { timeout: 10000 });
  } catch {
    await page.goto(`${baseUrl}/dashboard/leads`);
    await page.waitForURL("**/dashboard/leads");
  }
}

async function workspaceLogin(page, baseUrl, email, accessCode) {
  await page.goto(`${baseUrl}/workspace/login`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: /Workspace email/i }).fill(email);
  await page.getByRole("textbox", { name: /^Access code$/ }).fill(accessCode);
  await page.getByRole("button", { name: /Enter Workspace/i }).click();
  try {
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  } catch {
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForURL("**/dashboard");
  }
}

async function assertCookieBackedSession(page, baseUrl) {
  await page.evaluate(() => window.localStorage.removeItem("nama.appSession"));
  await page.goto(`${baseUrl}/dashboard`);
  await page.waitForURL("**/dashboard");
  await expectVisible(page, "Operations Overview");
}

async function assertLogout(page, baseUrl) {
  await page.goto(`${baseUrl}/dashboard`);
  await page.evaluate(async () => {
    await fetch("/api/v1/sessions/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    window.localStorage.removeItem("nama.appSession");
  });
  await page.goto(`${baseUrl}/dashboard/team`);
  await expectTenantAuthRedirect(page, baseUrl);
}

async function assertRevocation(baseUrl) {
  const adminContext = await chromium.launch({ headless: true });
  const memberContext = await chromium.launch({ headless: true });
  const adminPage = await adminContext.newPage();
  const memberPage = await memberContext.newPage();

  try {
    await adminPage.goto(`${baseUrl}/workspace/login`);
    await adminPage.waitForLoadState("networkidle");
    const adminSessionId = await adminPage.evaluate(async ({ email, accessCode }) => {
      const response = await fetch("/api/v1/sessions/tenant", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          scope: "tenant",
          tenant_name: "Deploy Auth Labs",
          access_code: accessCode,
        }),
      });
      if (!response.ok) return null;
      const body = await response.json();
      return body.id;
    }, { email: "radhika.deploy@deployauthlabs.demo", accessCode: SCENARIO.adminAccessCode });
    if (!adminSessionId) {
      throw new Error("Admin session id was not available for revocation setup");
    }

    await memberPage.goto(`${baseUrl}/workspace/login`);
    await memberPage.waitForLoadState("networkidle");

    const memberSessionId = await memberPage.evaluate(async ({ email, accessCode }) => {
      const response = await fetch("/api/v1/sessions/tenant", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          scope: "tenant",
          tenant_name: "Deploy Auth Labs",
          access_code: accessCode,
        }),
      });
      if (!response.ok) return null;
      const body = await response.json();
      return body.id;
    }, { email: "radhika.deploy@deployauthlabs.demo", accessCode: SCENARIO.adminAccessCode });
    if (!memberSessionId) {
      throw new Error("Member session id was not available for revocation");
    }

    const revokeOk = await adminPage.evaluate(async (sessionId) => {
      const response = await fetch("/api/v1/sessions/tenant/revoke", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          tenant_name: "Deploy Auth Labs",
          session_id: sessionId,
        }),
      });
      return response.ok;
    }, memberSessionId);
    if (!revokeOk) {
      throw new Error("Tenant session revoke request failed");
    }

    await memberPage.goto(`${baseUrl}/dashboard/team`);
    await expectTenantAuthRedirect(memberPage, baseUrl);
  } finally {
    await adminContext.close();
    await memberContext.close();
  }
}

async function main() {
  const externalBaseUrl = process.env.SMOKE_BASE_URL;
  const port = externalBaseUrl ? null : (process.env.SMOKE_PORT || (await getAvailablePort()));
  const baseUrl = externalBaseUrl || `http://${HOST}:${port}`;
  const tempDir = mkdtempSync(path.join(tmpdir(), "nama-deploy-auth-smoke-"));
  const csvPath = path.join(tempDir, "employees.csv");
  writeFileSync(csvPath, SCENARIO.employees, "utf8");

  const server = externalBaseUrl ? null : startBuiltAppServer(port);
  let browser;

  try {
    await waitForServer(`${baseUrl}/register`);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await registerTenant(page, baseUrl);
    const inviteHref = await importAndInviteEmployee(page, baseUrl, csvPath);
    await acceptInvite(page, baseUrl, inviteHref);
    await workspaceLogin(page, baseUrl, "radhika.deploy@deployauthlabs.demo", SCENARIO.adminAccessCode);
    await assertCookieBackedSession(page, baseUrl);
    await assertLogout(page, baseUrl);
    await assertRevocation(baseUrl);

    console.log("\nDeploy auth smoke passed.");
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("\ndeploy auth smoke failed.");
  console.error(error);
  process.exitCode = 1;
});
