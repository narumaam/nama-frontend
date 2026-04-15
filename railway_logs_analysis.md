# Railway Deployment Logs Analysis for 'stunning-joy'

## 1. Dashboard and Service
- **Project:** zoological-commitment
- **Service:** stunning-joy
- **Environment:** production

## 2. Latest Deployment Logs (Commit f12ed2d)
- **Deployment ID:** bb7eeb41-e129-484b-bb00-1eb4bd7d0acd
- **Status:** FAILED (during Build)
- **Build Logs Key Finding:**
  - `SECURITY VULNERABILITIES DETECTED`
  - `Railway cannot proceed with deployment due to security vulnerabilities in your project's dependencies.`
  - `Found 1 vulnerable package(s): next@14.2.3`
  - `Upgrade to 14.2.35: npm install next@^14.2.35`
- **Deploy (Runtime) Logs:** None (deployment never reached runtime).

## 3. Runtime Logs Analysis (from Active Deployment 8f714965)
- **Start Command:** `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Error Message:** `Error: Invalid value for '--port': '$PORT' is not a valid integer.`
- **Conclusion:** Railway is indeed ignoring the shell expansion or the Dockerfile configuration, as `$PORT` is being passed as a literal string to uvicorn.

## 4. Other Errors
- **Permission denied:** Not found.
- **Exec format error:** Not found.

## Screenshots
- Dashboard: ![Dashboard](https://sc02.alicdn.com/kf/A811f1b03dc67454ca1ddba27efa9bb58i.png)
- Active Logs (Port Error): ![Active Logs](https://sc02.alicdn.com/kf/A811f1b03dc67454ca1ddba27efa9bb58i.png) (Note: Same view as dashboard but logs were inspected in snapshot)
