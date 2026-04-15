# NAMA Travel OS: Master Root Cause Analysis (RCA) & Technical Audit
## Build Phase: v1.0 - v3.0 Final Production Push

This document details the critical technical hurdles identified during the NAMA deployment phase and the engineered resolutions implemented to ensure a stable, production-ready environment.

---

### 🚨 1. Issue: Backend Build Failure (Pydantic-core / SQLAlchemy)
*   **Symptom:** Railway deployments failed during the `pip install` stage with errors about "failed building wheel".
*   **Root Cause:** Railway's default build environment (Nixpacks) often defaults to the latest Python (3.13), which lacks pre-compiled wheels for certain core libraries like `pydantic-core` and `sqlalchemy` on specific Linux architectures. This forced the server to try and compile them from source, failing due to missing build tools (gcc/rust).
*   **Resolution:** 
    *   Hard-locked the environment to **Python 3.10** using a custom `Dockerfile` and `nixpacks.toml`.
    *   Simplified `requirements.txt` to use stable, wheel-supported versions.
*   **Status:** ✅ RESOLVED.

### 🚨 2. Issue: "Application Failed to Listen" (Port 502/503)
*   **Symptom:** The service showed "Active" in Railway but the public URL returned a 502 error.
*   **Root Cause:** The startup command was passing the literal string `"$PORT"` to uvicorn. Because of shell interpolation rules in different CI/CD environments, the application was literally trying to open a port named "Dollar-Sign-P-O-R-T" instead of the numeric port (e.g., 8080) assigned by Railway.
*   **Resolution:** 
    *   Implemented a robust **internal port-checking logic** in `main.py`. The app now reads the environment variable directly from Python, bypassing shell errors.
    *   Added a `start.sh` wrapper to ensure variable expansion.
*   **Status:** ✅ RESOLVED.

### 🚨 3. Issue: Frontend Navigation & "Try Pilot" 404s
*   **Symptom:** Homepage links and the "Start Pilot" button returned "404 Not Found" on the live site.
*   **Root Cause:** 
    1.  **Nested Root Error:** The project was initially structured with a `/frontend` folder, but Vercel was configured to look at the project root.
    2.  **Export Mismatch:** Some internal pages (like `/register`) used incorrect React export patterns, causing Next.js to skip building them.
*   **Resolution:** 
    *   Synchronized all high-fidelity UI code into the `/frontend` sub-directory to match the Vercel dashboard configuration.
    *   Converted all placeholder buttons into **Next.js `Link` components** for proper client-side routing.
*   **Status:** ✅ RESOLVED.

---
**Technical Summary:** The platform is now structured as a **Shielded Monorepo**. The backend logic is isolated in `/backend` and the frontend in `/frontend`, preventing dependency "cross-contamination" during build.
