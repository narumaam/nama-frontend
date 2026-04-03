#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { chromium } from "playwright";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const ROOT = process.cwd();
const scenarioKey = process.argv[2] || "founder";

const SCENARIOS = {
  founder: {
    label: "Founder Golden Path",
    companyName: "Aurora Reserve Travel",
    operatorName: "Radhika Founder",
    planName: "Enterprise",
    caseSlug: "maldives-honeymoon",
    employeeToAccept: "Ritika Sen · Sales",
    adminAccessCode: "Founder-admin-01",
    inviteAccessCode: "Invite-sales-01",
    superAdminAccessCode: "Nama-root-01",
    employees: [
      "name,email,role,designation,team,reportsTo,responsibility",
      "Ritika Sen,ritika@aurora.example,Sales,Senior Executive,Inbound Desk,Sales Manager,Inbound CRM and quote follow-up",
      "Kabir Rao,kabir@aurora.example,Operations,Trip Designer,Luxury Desk,Operations Lead,Trip design and supplier coordination",
      "Zoya Ali,zoya@aurora.example,Finance,Accounts Lead,Billing,Finance Lead,Billing and reconciliation",
    ].join("\n"),
  },
  "small-agency": {
    label: "Small Agency",
    companyName: "Maple Trail Holidays",
    operatorName: "Asha Khan",
    planName: "Starter",
    caseSlug: "maldives-honeymoon",
    employeeToAccept: "Nina Dsouza · Operations",
    adminAccessCode: "Agency-admin-01",
    inviteAccessCode: "Invite-ops-01",
    superAdminAccessCode: "Nama-root-01",
    employees: [
      "name,email,role,designation,team,reportsTo,responsibility",
      "Nina Dsouza,nina@mapletrail.ae,Operations,Trip Coordinator,Holiday Desk,Founder,Bookings and traveler documentation",
      "Rhea Mathew,rhea@mapletrail.ae,Sales,Travel Consultant,Holiday Desk,Founder,Lead intake and quote follow-up",
    ].join("\n"),
  },
  "ops-dmc": {
    label: "Ops Heavy DMC",
    companyName: "Saffron Dunes DMC",
    operatorName: "Rehan Malik",
    planName: "Growth",
    caseSlug: "europe-family-escape",
    employeeToAccept: "Mira Joshi · Operations",
    adminAccessCode: "Dmc-admin-01",
    inviteAccessCode: "Invite-ops-01",
    superAdminAccessCode: "Nama-root-01",
    employees: [
      "name,email,role,designation,team,reportsTo,responsibility",
      "Mira Joshi,mira@saffrondunes.in,Operations,Ops Lead,Fulfilment Desk,Customer Admin,Supplier and itinerary execution",
      "Dev Shah,dev@saffrondunes.in,Finance,Collections Lead,Billing,Customer Admin,Collections and reconciliation",
      "Anika Roy,anika@saffrondunes.in,Sales,Partner Desk,B2B Desk,Customer Admin,Agent follow-up and group quoting",
    ].join("\n"),
  },
};

function tenantToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tenantAccessCode(companyName, role) {
  const codeTenant = tenantToken(companyName).slice(0, 8).toUpperCase() || "TENANT";
  const codeRole = role === "customer-admin" ? "ADMIN" : role.toUpperCase();
  return `NAMA-${codeTenant}-${codeRole}`;
}

function tenantEmailForRole(companyName, role) {
  const token = tenantToken(companyName);
  const roleToken = {
    "customer-admin": "admin",
    sales: "sales",
    finance: "finance",
    operations: "ops",
    viewer: "viewer",
  }[role];
  return `${roleToken}@${token}.demo`;
}

function registeredAdminEmail(companyName, operatorName) {
  const localPart = operatorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workspace.operator";
  const domainPart = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "tenant";
  return `${localPart}@${domainPart}.demo`;
}

function getExpectedInviteRoute(employeeLabel) {
  const normalized = employeeLabel.toLowerCase();
  if (normalized.includes("sales")) return "/dashboard/leads";
  if (normalized.includes("finance")) return "/dashboard/finance";
  if (normalized.includes("operations")) return "/dashboard/bookings";
  return "/dashboard/artifacts";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readFilledValue(locator, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await locator.inputValue();
    if (value) return value;
    await sleep(250);
  }
  throw new Error("Timed out waiting for populated input value");
}

function getScenario() {
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) {
    throw new Error(`Unknown smoke scenario "${scenarioKey}". Expected one of: ${Object.keys(SCENARIOS).join(", ")}`);
  }
  return scenario;
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
  const scenario = getScenario();
  const port = process.env.SMOKE_PORT || (await getAvailablePort());
  const baseUrl = process.env.SMOKE_BASE_URL || `http://${HOST}:${port}`;
  rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
  const server = startAppServer(port);
  const tempDir = mkdtempSync(path.join(tmpdir(), `nama-${scenarioKey}-smoke-`));
  const csvPath = path.join(tempDir, "employees.csv");
  writeFileSync(csvPath, scenario.employees, "utf8");

  let browser;

  try {
    await waitForServer(`${baseUrl}/register`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/register`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox", { name: "Company Name" }).fill(scenario.companyName);
    await page.getByRole("textbox", { name: "Workspace Operator" }).fill(scenario.operatorName);
    await page.getByLabel("Workspace Admin Access Code").fill(scenario.adminAccessCode);
    await page.getByLabel("Confirm Access Code").fill(scenario.adminAccessCode);
    await page.locator("button").filter({ hasText: scenario.planName }).first().click();
    await page.getByRole("button", { name: /Enter Demo Workspace/i }).click();
    await page.waitForURL("**/dashboard");

    await page.goto(`${baseUrl}/dashboard/team`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "bulk", exact: true }).click();
    await expectVisible(page, "Upload Employee List");
    await page.locator('label:has-text("Upload Employee List") input[type="file"]').setInputFiles(csvPath);
    await expectVisible(page, "Imported");

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
    await employeeDirectorySelect.locator("option", { hasText: scenario.employeeToAccept }).waitFor({
      state: "attached",
      timeout: 20000,
    });
    await employeeDirectorySelect.selectOption({ label: scenario.employeeToAccept });
    await page.getByRole("button", { name: /Send Individual Invite/i }).click();

    const openAcceptance = page.getByRole("link", { name: /Open acceptance/i }).first();
    const inviteHref = await openAcceptance.getAttribute("href");
    if (!inviteHref) throw new Error("Invite acceptance link was not generated");

    await page.goto(`${baseUrl}${inviteHref}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("heading", { name: /Join the workspace/i }).waitFor({ state: "visible", timeout: 20000 });
    await page.getByLabel("New access code").fill(scenario.inviteAccessCode);
    await page.getByLabel("Confirm access code").fill(scenario.inviteAccessCode);
    await page.getByRole("button", { name: /Activate Invite & Continue/i }).click();
    await page.waitForURL(/\/workspace\/login/);
    await expectVisible(page, "Invite accepted");
    await page.getByRole("button", { name: /Enter Workspace/i }).click();
    await page.waitForURL(`**${getExpectedInviteRoute(scenario.employeeToAccept)}`);

    await page.goto(`${baseUrl}/workspace/login`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox", { name: /Workspace email/i }).fill(
      registeredAdminEmail(scenario.companyName, scenario.operatorName)
    );
    await page.getByRole("textbox", { name: /^Access code$/ }).fill(scenario.adminAccessCode);
    await page.getByRole("button", { name: /Enter Workspace/i }).click();
    await page.waitForURL("**/dashboard");
    await page.evaluate(() => window.localStorage.removeItem("nama.appSession"));
    await page.goto(`${baseUrl}/dashboard/finance`);
    await page.waitForURL("**/dashboard/finance");

    await page.goto(`${baseUrl}/dashboard/leads`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^List$/ }).click();
    await page.getByRole("button", { name: /Open contact/i }).first().click();
    await page.getByRole("button", { name: /^Won$/ }).click();

    await page.goto(`${baseUrl}/dashboard/finance`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Record Deposit/i }).first().click();

    await page.goto(`${baseUrl}/dashboard/bookings?case=${scenario.caseSlug}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Release guest pack now/i }).click();

    await page.goto(`${baseUrl}/dashboard/invoices/${scenario.caseSlug}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Mark Paid/i }).click();

    await page.goto(`${baseUrl}/dashboard/traveler-pdf/${scenario.caseSlug}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Mark shared/i }).click();

    await page.goto(`${baseUrl}/super-admin/login`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox", { name: "Internal email" }).fill("control@nama.internal");
    await page.getByRole("button", { name: /Request Reset/i }).click();
    const superAdminResetToken = await readFilledValue(page.getByRole("textbox", { name: /^Reset token$/ }));
    if (!superAdminResetToken) throw new Error("Super Admin reset token was not issued");
    await page.getByRole("textbox", { name: /^New access code$/ }).fill(scenario.superAdminAccessCode);
    await page.getByRole("button", { name: /Confirm Reset/i }).click();
    await page.getByRole("textbox", { name: /^Access code$/ }).fill("NAMA-ALPHA");
    await page.getByRole("button", { name: /Open Super Admin/i }).click();
    await expectVisible(page, "Invalid Super Admin credentials");
    await page.getByRole("textbox", { name: /^Access code$/ }).fill(scenario.superAdminAccessCode);
    await page.getByRole("button", { name: /Open Super Admin/i }).click();
    await page.waitForURL("**/dashboard/admin?entry=super-admin");

    console.log(`\n${scenario.label} smoke passed.`);
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
  console.error(`\n${scenarioKey} smoke failed.`);
  console.error(error);
  process.exitCode = 1;
});
