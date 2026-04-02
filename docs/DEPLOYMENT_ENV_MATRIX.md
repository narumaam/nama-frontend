# Deployment Environment Matrix

This file is the source of truth for what must be configured in Vercel and Railway.

## Frontend (Vercel)

Set these in the Vercel project:

- `NEXT_PUBLIC_API_URL`
  - Production value should point to the Railway backend base URL, for example:
  - `https://<your-backend>.up.railway.app/api/v1`

## Backend (Railway)

Required:

- `NAMA_ENV=production`
- `SECRET_KEY`
- `DATABASE_URL`

Travel supply:

- `AMADEUS_API_KEY`
- `AMADEUS_API_SECRET`
- `AMADEUS_BASE_URL`
- `TBO_CLIENT_ID`
- `TBO_CLIENT_SECRET`
- `TBO_BASE_URL`
- `BOKUN_API_KEY`
- `BOKUN_API_SECRET`
- `BOKUN_BASE_URL`
- `SUPPLY_HTTP_TIMEOUT`

Communications:

- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_ID`
- `WHATSAPP_WABA_ID`
- `RESEND_API_KEY`
- `SENDGRID_API_KEY`

Payments:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

## Deployment routing

- Vercel should build from repo root.
- Railway backend should use `backend/railway.json`.
- Railway frontend-style root deployment should not be used for the backend.

## Post-deploy verification

Frontend:

- `/`
- `/dashboard`
- `/dashboard/itineraries`
- `/kinetic`
- `/register`

Backend:

- `/`
- `/api/v1/health`
- `/api/v1/auth/health`
- `/api/v1/queries/health`
- `/api/v1/itineraries/health`
- `/api/v1/integrations/vault/status`
- `/api/v1/payments/health`
