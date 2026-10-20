# Dependency update report

Registry snapshot: October 20, 2026.

## Scope and compatibility

Updated 41 distinct direct dependencies across 43 declarations, including major upgrades. Refreshed and deduplicated transitive dependencies. The constraint is compatibility for Verrou consumers, not preserving dependency major versions.

The public exports and Node.js minimum (`>=18.16.0`) are unchanged. The optional AWS SDK peer minimum remains `^3.484.0`. The ioredis peer range is widened from `^5.3.2` to `^5.3.2 || ^6.0.0`; existing Redis 5 consumers remain supported.

The only core source adaptation is importing `InvalidArgumentsException` from the renamed `@poppinss/utils/exception` subpath. Utils 6 and 7 re-export the same exception classes from `@poppinss/exception`. Duration parsing and Verrou error codes, messages, and statuses remain compatible in the checks below.

Development and documentation now use Node.js 24, including CI. This is an increase for contributors, not a new minimum for applications consuming the published core package. New driver development versions can require newer Node.js versions while older supported clients remain usable by consumers.

## Direct updates

Version range operators are preserved, including the exact `edge.js` and core `@japa/expect-type` pins. The following table combines duplicate declarations.

| Package                    | Previous version | Updated version |
| -------------------------- | ---------------- | --------------- |
| `@adonisjs/tsconfig`       | 1.4.1            | 2.0.0           |
| `@japa/assert`             | 4.1.1            | 4.2.0           |
| `@japa/expect-type`        | 2.0.3            | 2.0.4           |
| `@japa/file-system`        | 2.3.2            | 3.0.0           |
| `@japa/runner`             | 4.4.0            | 5.4.0           |
| `@julr/tooling-configs`    | 4.0.0            | 6.1.2           |
| `@swc/core`                | 1.15.3           | 1.16.18         |
| `@types/node`              | 24.10.1          | 26.6.5          |
| `c8`                       | 10.1.3           | 12.0.0          |
| `del-cli`                  | 7.0.0            | 8.0.1           |
| `dotenv`                   | 17.2.3           | 18.0.8          |
| `prettier`                 | 3.7.4            | 3.9.10          |
| `release-it`               | 19.0.6           | 21.1.1          |
| `tsup`                     | 8.5.1            | 9.0.0           |
| `typescript`               | 5.9.3            | 6.0.3           |
| `@poppinss/utils`          | 6.10.1           | 7.1.2           |
| `@aws-sdk/client-dynamodb` | 3.946.0          | 3.1153.0        |
| `@types/better-sqlite3`    | 7.6.13           | 9.6.0           |
| `@types/pg`                | 8.15.6           | 8.23.1          |
| `better-sqlite3`           | 12.5.0           | 13.0.3          |
| `ioredis`                  | 5.8.2            | 6.0.0           |
| `knex`                     | 3.1.0            | 3.3.0           |
| `kysely`                   | 0.28.8           | 0.29.7          |
| `mysql2`                   | 3.15.3           | 3.24.6          |
| `pg`                       | 8.16.3           | 8.23.1          |
| `sqlite3`                  | 5.1.7            | 6.0.1           |
| `@adonisjs/core`           | 6.19.1           | 7.6.0           |
| `@adonisjs/static`         | 1.1.1            | 2.0.1           |
| `edge.js`                  | 6.2.1            | 6.5.1           |
| `@adonisjs/assembler`      | 7.8.2            | 8.6.0           |
| `@adonisjs/vite`           | 4.0.0            | 6.0.3           |
| `@alpinejs/persist`        | 3.15.2           | 3.17.4          |
| `@docsearch/css`           | 3.9.0            | 5.1.2           |
| `@docsearch/js`            | 3.9.0            | 5.1.2           |
| `alpinejs`                 | 3.15.2           | 3.17.4          |
| `concurrently`             | 9.2.1            | 10.0.6          |
| `undici`                   | 7.16.0           | 8.12.3          |
| `unpoly`                   | 3.12.0           | 3.14.3          |
| `vite`                     | 6.4.1            | 8.3.4           |
| `pino`                     | 10.1.0           | 10.4.0          |
| `pino-pretty`              | 13.1.3           | 13.2.0          |

## Tooling and documentation adaptations

- Tooling-configs 6 no longer exports ESLint or Prettier configurations. Replaced the old ESLint configuration and direct dependency with its OXC preset, `oxlint@1.89.0`, and `eslint-plugin-perfectionist@5.12.1`. Preserved the previous Prettier options inline. A temporary deliberately misordered import was rejected by `perfectionist/sort-imports`, confirming that the new preset actually executes.
- AdonisJS 7 requires an explicit encryption configuration. Both documentation entrypoints now configure its legacy driver using the existing documentation-only key. Vite's configuration option is now `entryPoints`. Caught errors are narrowed for TypeScript 6. Generated `.adonisjs` files are ignored.
- DocSearch 5 requires `indices` instead of `indexName`. The existing Dimer initializer is adapted at the integration point. New highlight and selected-result background variables preserve the documentation palette and readable contrast in both themes.
- Pnpm is allowed to run the existing native build scripts for SWC, esbuild, SQLite3, and better-sqlite3. In this orb, SQLite3 6's downloaded prebuild required GLIBC 2.38, so its module was compiled from source instead; integration tests then exercised it successfully.
- An override updates the retained optional `tsx` peer from 4.19.2 to `^4.23.15`, removing its vulnerable esbuild dependency. This stays within both Vite and postcss-load-config's declared `^4.8.1` peer range; it does not replace the repository's ts-node loader.

## Versions retained and remaining blockers

`pnpm outdated -r --format json` reports only TypeScript among direct stable updates.

| Dependency | Retained   | Newer version / blocker                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript | `~6.0.3`   | 7.0.2 was attempted but does not provide the compiler API required by tsup's declaration generation. AdonisJS assembler 8 also accepts only TypeScript 5 or 6. Publishing without usable declarations or overriding these requirements is not an acceptable upgrade. This is a toolchain blocker, not evidence that Verrou's runtime API requires TypeScript 6. |
| edge-uikit | `^1.0.0-1` | The registry's `latest` tag is the older `0.0.1-0` prerelease; newer published candidates are version 2 prereleases. No downgrade or unrequested move to a new prerelease line was made.                                                                                                                                                                        |

No tested stable runtime dependency upgrade had to be rejected because it broke Verrou's public API. Compatibility was checked with the old client versions rather than requiring consumers to upgrade with the repository.

## Remaining security alerts

`pnpm audit --json` reports **3 advisories: 2 high and 1 moderate**, down from **174: 6 critical, 84 high, 65 moderate, and 19 low** for the original frozen lockfile. Counts represent reported advisories, not demonstrated exploits.

| Dependency path                                                                                  | Retained version   | Constraint / missing fix                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `release-it > proxy-agent > pac-proxy-agent > get-uri > basic-ftp`                               | `basic-ftp@5.3.1`  | [GHSA-c475-qrg2-pj4r](https://github.com/advisories/GHSA-c475-qrg2-pj4r), high. The fix requires 6.2.1 or later, outside get-uri's current major range. No incompatible transitive override was forced. |
| `@julr/tooling-configs > @adonisjs/eslint-plugin > micromatch > braces`                          | `braces@3.0.3`     | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), high. The registry audit reports no patched version.                                                                          |
| `docs > @dimerapp/content > @dimerapp/markdown > front-matter > js-yaml > argparse > sprintf-js` | `sprintf-js@1.0.3` | [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), moderate. The registry audit reports no patched version.                                                                      |

`pnpm audit --prod --json` reports one high advisory: braces through `docs > @adonisjs/core > @adonisjs/assembler > fast-glob > micromatch`. This is a documentation application path, not a core runtime dependency path. Neither workspace audit is a published-core-only audit.

## Verification

Repository checks ran with Node.js 24.22.0 and pinned pnpm 10.24.0. Integration services were disposable Redis 6.2, DynamoDB Local, PostgreSQL 15, and MySQL 8.0 containers, alongside both SQLite drivers.

| Check                                           | Result                                                                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                | Passed                                                                                                                                         |
| `pnpm checks`                                   | Lint and root typecheck passed                                                                                                                 |
| `pnpm -r typecheck`                             | Core and documentation typechecks passed                                                                                                       |
| `pnpm -C packages/verrou build`                 | JavaScript and declaration builds passed                                                                                                       |
| `pnpm -C docs export`                           | Vite build and all 8 HTML page exports passed                                                                                                  |
| `pnpm -C packages/verrou test`                  | Final run: 267 passed, 1 failed out of 268; remaining-time assertion described below. Earlier runs failed the DynamoDB acquisition-order test. |
| Coverage                                        | 98% lines/statements, 95.88% branches, 94.11% functions                                                                                        |
| Packed-package consumer checks                  | Passed on Node.js 18.16.0 and 24.22.0 with old Redis/AWS/SQL clients                                                                           |
| Public `registerStoreTestSuite` with Japa 4.4.0 | All 25 tests passed                                                                                                                            |
| TypeScript 5.9 consumer compilation             | Strict compilation with `skipLibCheck: false` passed, including all driver constructors and the public Japa test-suite helper                  |
| Chromium documentation checks                   | Theme switching, selected code-tab state, search opening/input/results, and navigation worked; desktop and 390px layouts inspected             |
| Formatting                                      | Prettier check passed for changed manifests, configuration, JavaScript, and TypeScript files                                                   |
| `git diff --check`                              | Passed                                                                                                                                         |

### Timing-sensitive test failures

Earlier full updated runs failed `DynamoDB Store / run is exclusive with two factories` at `packages/verrou/src/test_suite.ts:166`. The first `run` is launched without waiting for its callback to enter; the second acquisition then assumes FIFO ordering. Separate factories can send overlapping DynamoDB requests that complete in the opposite order.

Sequential comparisons against the same database reproduced this exact assertion failure with both the **original frozen dependencies** and the updated dependencies: each DynamoDB-only run passed 28 of 29 tests. An earlier intermediate full run passed all 268 tests; full major-upgrade runs reproduced the failure.

The final full run passed all DynamoDB tests but failed `Lock / acquireImmediately works` at `packages/verrou/tests/lock.spec.ts:339`: the assertion expected exactly 1000 milliseconds remaining, while the real clock had already advanced one millisecond and the method returned 999. The test uses the real clock and performs awaited operations before asserting the exact original TTL. Both this assertion and the remaining-time implementation are unchanged. This second failure was observed on the updated dependencies; unlike the DynamoDB failure, it was not separately reproduced against a frozen original installation.

This is not a consistently green suite. No skips, retries in the test code, relaxed assertions, or unrelated test fixes were introduced.

### Consumer compatibility checks

An isolated consumer installed the actual packed core package with `ioredis@5.3.2`, `@aws-sdk/client-dynamodb@3.484.0`, `knex@3.1.0`, `kysely@0.28.8`, and `pg@8.16.3`. On both Node.js versions, public imports and real memory, Redis, DynamoDB, Knex/PostgreSQL, and Kysely/PostgreSQL operations passed: acquisition, mutual exclusion, duration parsing, extension, serialization/restoration, callback return values, errors, and TTL expiration. The consumer also compiled with TypeScript 5.9 and Node.js 18 types, and ran the exported test suite using Japa 4 rather than the repository's new Japa 5.

A separate TypeScript check with ioredis 6 accepts both `Redis` and `Redis<'resp3'>` as connections, but rejects `Cluster` because the current option requires the full `Redis` class. [PR #19](https://github.com/Julien-R44/verrou/pull/19) widens the peer range identically and also proposes a structural connection interface, a type test, and documentation for Cluster support. Those additional changes are not included in this dependency update.

Browser checks found five Algolia results for `lock`, verified selected-result contrast in both themes, and navigated through the narrow menu to `/docs/quick-setup`. No errors were captured by the browser's error and unhandled-rejection listeners during the checked search/theme interactions. At 390px, document width equals viewport width; code and tab lists have their own horizontal scrolling. Screenshots and an interaction recording are available under `.amp/in/artifacts/`.

The documentation build still emits a large-chunk warning, and ts-node emits loader/fs.Stats deprecation warnings. They do not prevent export; no bundling redesign or loader migration was included.

## Delivery state

Changes are committed locally. Nothing was pushed, published, or deployed. The standalone compatibility fixture, lint probe, and disposable services are validation-only, not additions to the permanent test suite.
