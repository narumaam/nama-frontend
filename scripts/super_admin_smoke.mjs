#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { chromium } from "playwright";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const ROOT = process.cwd();
const ROTATED_SUPER_ADMIN_CODE = "Nama-root-01";

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

async function main() {
  const port = process.env.SMOKE_PORT || (await getAvailablePort());
  const baseUrl = process.env.SMOKE_BASE_URL || `http://${HOST}:${port}`;
  const server = startAppServer(port);
  let browser;

  try {
    await waitForServer(`${baseUrl}/super-admin/login`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/dashboard/admin`);
    await page.waitForURL("**/super-admin/login");
    await expectVisible(page, "Super Admin Access");
    await expectVisible(page, "/super-admin/login");

    await page.getByRole("textbox", { name: "Internal email" }).fill("control@nama.internal");
    await page.getByRole("textbox", { name: /^Access code$/ }).fill("WRONG-CODE");
    await page.getByRole("button", { name: /Open Super Admin/i }).click();
    await expectVisible(page, "Invalid Super Admin credentials");

    await page.getByRole("button", { name: /Request Reset/i }).click();
    const resetToken = await readFilledValue(page.getByRole("textbox", { name: /^Reset token$/ }));
    if (!resetToken) throw new Error("Reset token was not issued");
    await page.getByRole("textbox", { name: /^New access code$/ }).fill(ROTATED_SUPER_ADMIN_CODE);
    await page.getByRole("button", { name: /Confirm Reset/i }).click();
    await expectVisible(page, "Super Admin credential updated");

    await page.getByRole("textbox", { name: "Internal email" }).fill("control@nama.internal");
    await page.getByRole("textbox", { name: /^Access code$/ }).fill("NAMA-ALPHA");
    await page.getByRole("button", { name: /Open Super Admin/i }).click();
    await expectVisible(page, "Invalid Super Admin credentials");

    await page.getByRole("textbox", { name: "Internal email" }).fill("control@nama.internal");
    await page.getByRole("textbox", { name: /^Access code$/ }).fill(ROTATED_SUPER_ADMIN_CODE);
    await page.getByRole("button", { name: /Open Super Admin/i }).click();
    await page.waitForURL("**/dashboard/admin?entry=super-admin");
    await page.evaluate(() => window.localStorage.removeItem("nama.appSession"));
    await page.goto(`${baseUrl}/dashboard/admin?entry=super-admin`);
    await page.waitForURL("**/dashboard/admin?entry=super-admin");

    await expectVisible(page, "Platform Control");
    await expectVisible(page, "Customer entry");
    await expectVisible(page, "Exit Super Admin");
    await expectVisible(page, "System Audit Snapshot");
    await expectVisible(page, "Tenant Lifecycle & Risk Board");

    await page.goto(`${baseUrl}/dashboard/admin/audit-report`);
    await page.waitForLoadState("networkidle");
    await expectVisible(page, "Audit Report");
    await expectVisible(page, "Report state");

    await page.goto(`${baseUrl}/dashboard/admin?entry=super-admin`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("main").getByRole("button", { name: /Exit Super Admin/i }).click();
    await page.waitForURL("**/super-admin/login");

    console.log("\nSuper Admin smoke passed.");
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("\nsuper-admin smoke failed.");
  console.error(error);
  process.exitCode = 1;
});
