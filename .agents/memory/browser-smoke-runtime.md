---
name: Browser smoke runtime
description: Environment prerequisite for running the authenticated responsive browser smoke suite.
---

The browser smoke suite requires a provisioned Playwright Chromium binary and Linux shared libraries in the execution environment.

**Why:** A fresh runtime can have Node and the app dependencies installed while Chromium still exits before launch because libraries such as GLib, GBM, or xkbcommon are absent.

**How to apply:** Provision the Playwright browser and its system dependencies before diagnosing `test:e2e` failures as application or selector regressions.