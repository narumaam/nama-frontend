# Beta Auth And Access Foundation

## Purpose

This document defines the first beta auth/access slice that replaces the alpha branch's disconnected entry behaviors with one shared session model.

## Current Alpha Reality

- `/register` writes demo workspace state and enters the dashboard without real auth.
- `/super-admin/login` uses a lightweight client-side gate for platform access.
- Dashboard access is mostly experience-driven, not role-driven.
- Backend has a prototype JWT layer, but the frontend is not yet aligned to it.

## Beta Foundation Goal

Introduce one shared application session concept that can later map cleanly to backend auth, roles, and tenant scope.

## Role Model

Primary beta roles:

- `super-admin`
- `customer-admin`
- `finance`
- `sales`
- `operations`
- `viewer`

## Scope Model

- `platform`: NAMA internal access across tenants
- `tenant`: tenant-scoped access inside one workspace

## Route Protection Model

- `/super-admin/login`: public entry for platform control
- `/register`: public entry for tenant onboarding
- `/dashboard/*`: requires an application session
- `/dashboard/admin*`: requires `super-admin`
- tenant workflow pages: require a tenant or platform session

## First Implementation Slice

This branch implements:

- one shared client-side app session model
- registration creates a tenant-scoped `customer-admin` session
- Super Admin login creates a platform-scoped `super-admin` session
- dashboard shell checks for a session before rendering protected routes
- Super Admin navigation only appears when the session role allows it

## What This Is Not Yet

- not production auth
- not server-backed session validation
- not final RBAC
- not tenant-aware backend authorization

## Why This Slice Matters

It gives the frontend one consistent mental model for access, so the later backend auth integration can replace one client-side session layer instead of two unrelated access hacks.
