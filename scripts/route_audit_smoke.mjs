#!/usr/bin/env node

import { createServer } from "node:net";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const ROOT = process.cwd();
const COMPANY_NAME = "Route Audit Travel";
const OPERATOR_NAME = "Radhika Audit";
const ADMIN_ACCESS_CODE = "Route-admin-01";
const SUPER_ADMIN_ACCESS_CODE = process.env.SUPER_ADMIN_BOOTSTRAP_CODE || "Nama-root-01";
const SESSION_COOKIE_SECRET = process.env.SESSION_COOKIE_SECRET || "route-audit-smoke-secret";

const PUBLIC_ROUTES = [
  "/",
  "/register",
  "/workspace/login",
  "/super-admin/login",
  "/contact",
  "/compliance",
  "/privacy",
  "/terms",
  "/kinetic",
];

const TENANT_ROUTES = [
  "/dashboard",
  "/dashboard/leads",
  "/dashboard/deals",
  "/dashboard/finance",
  "/dashboard/bookings",
  "/dashboard/itineraries",
  "/dashboard/team",
  "/dashboard/comms",
  "/dashboard/content",
  "/dashboard/dmc",
  "/dashboard/analytics",
  "/dashboard/autopilot",
  "/dashboard/ekla",
  "/dashboard/evolution",
  "/dashboard/artifacts",
  "/dashboard/invoices/maldives-honeymoon",
  "/dashboard/traveler-pdf/maldives-honeymoon",
  "/dashboard/demo-pack/maldives-honeymoon",
];

const SUPER_ADMIN_ROUTES = [
  "/dashboard/admin?entry=super-admin",
  "/dashboard/admin/audit-report",
];

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
      SESSION_COOKIE_SECRET,
      SUPER_ADMIN_BOOTSTRAP_CODE: SUPER_ADMIN_ACCESS_CODE,
    },
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function assertHealthyPage(page, baseUrl, route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  if (!response) {
    throw new Error(`No response received for ${route}`);
  }
  if (response.status() >= 400) {
    throw new Error(`Route ${route} returned ${response.status()}`);
  }
  await page.waitForLoadState("domcontentloaded");
  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("This page could not be found")) {
    throw new Error(`Route ${route} rendered a 404 page`);
  }
}

async function registerTenant(page, baseUrl) {
  await page.goto(`${baseUrl}/register`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Company Name" }).fill(COMPANY_NAME);
  await page.getByRole("textbox", { name: "Workspace Operator" }).fill(OPERATOR_NAME);
  await page.getByLabel("Workspace Admin Access Code").fill(ADMIN_ACCESS_CODE);
  await page.getByLabel("Confirm Access Code").fill(ADMIN_ACCESS_CODE);
  await page.locator("button").filter({ hasText: "Growth" }).first().click();
  await page.getByRole("button", { name: /Enter Demo Workspace/i }).click();
  try {
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  } catch {
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForURL("**/dashboard");
  }
}

async function loginSuperAdmin(page, baseUrl) {
  await page.goto(`${baseUrl}/super-admin/login`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Internal email" }).fill("control@nama.internal");
  await page.getByRole("textbox", { name: /^Access code$/ }).fill(SUPER_ADMIN_ACCESS_CODE);
  await page.getByRole("button", { name: /Open Super Admin/i }).click();
  try {
    await page.waitForURL("**/dashboard/admin?entry=super-admin", { timeout: 10000 });
  } catch {
    await page.goto(`${baseUrl}/dashboard/admin?entry=super-admin`);
  }
}

async function main() {
  const port = process.env.SMOKE_PORT || (await getAvailablePort());
  const baseUrl = process.env.SMOKE_BASE_URL || `http://${HOST}:${port}`;
  const server = process.env.SMOKE_BASE_URL ? null : startBuiltAppServer(port);
  let browser;

  try {
    await waitForServer(`${baseUrl}/`);
    browser = await chromium.launch({ headless: true });

    const publicPage = await browser.newPage();
    for (const route of PUBLIC_ROUTES) {
      await assertHealthyPage(publicPage, baseUrl, route);
    }

    const tenantPage = await browser.newPage();
    await registerTenant(tenantPage, baseUrl);
    for (const route of TENANT_ROUTES) {
      await assertHealthyPage(tenantPage, baseUrl, route);
    }

    const adminPage = await browser.newPage();
    await loginSuperAdmin(adminPage, baseUrl);
    for (const route of SUPER_ADMIN_ROUTES) {
      await assertHealthyPage(adminPage, baseUrl, route);
    }

    console.log("\nRoute audit smoke passed.");
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("\nroute audit smoke failed.");
  console.error(error);
  process.exitCode = 1;
});
