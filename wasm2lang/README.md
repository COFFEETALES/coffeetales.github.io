# wasm2lang Playground

Browser-based playground for [**wasm2lang**](https://www.npmjs.com/package/@coffeetales.net/wasm2lang) — a WebAssembly-to-source-code transpiler. Paste or pick a WAT snippet, choose a backend, and read the generated code side-by-side.

[![npm version](https://img.shields.io/npm/v/%40coffeetales.net%2Fwasm2lang.svg?style=flat&label=npm&color=007acc&logo=npm&logoColor=white)](https://www.npmjs.com/package/@coffeetales.net/wasm2lang)
[![GitHub stars](https://img.shields.io/github/stars/COFFEETALES/wasm2lang?style=flat&label=stars&color=f59e0b&logo=github&logoColor=white)](https://github.com/COFFEETALES/wasm2lang/stargazers)
[![Live demo](https://img.shields.io/badge/demo-coffeetales.github.io%2Fwasm2lang-10b981?style=flat&logo=githubpages&logoColor=white)](https://coffeetales.github.io/wasm2lang)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-db2777?style=flat&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/COFFEETALES)

> **Live demo:** [coffeetales.github.io/wasm2lang](https://coffeetales.github.io/wasm2lang)

---

## Highlights

- **Four backends** — asm.js, JavaScript (ES2020+), PHP, Java
- **25 curated samples** spanning basics, memory, control-flow recovery, bitwise intrinsics, hashing, numeric casts, i64 / BigInt, indirect calls, and SIMD
- **Side-by-side editors** with syntax highlighting for WAT input and transpiled output
- **Three normalization levels** — `binaryen:max`, `binaryen:min`, `binaryen:none` — each pairable with the `wasm2lang:codegen` pass
- **Name manglers** — off, random, or a fixed demo string for stable output
- **Output toggle** — inspect either the transpiled target code (with metadata) or the normalized WAT that was fed into the codegen
- **URL-hash preselection** — share links like `#sample=crc32` to open the playground with a specific sample loaded
- **Searchable sample picker** — filter by title or tag
- **Backend-aware samples** — restricted samples (BigInt / SIMD) are hidden from incompatible backends automatically
- **Zero build step** — the playground runs entirely in the browser via CDN; no bundler, no server, no install required
- **Responsive layout** — works on desktop and mobile

## Backends

| Backend      | Target                         | Notes                                             |
| ------------ | ------------------------------ | ------------------------------------------------- |
| `asmjs`      | Strict asm.js module           | Typed-array heap, int/double coercions            |
| `javascript` | Modern ES2020+ JavaScript      | BigInt for i64, native number types elsewhere     |
| `php64`      | 64-bit PHP                     | Long integer arithmetic, typed properties         |
| `java`       | Java class with static methods | Full primitive type set, SIMD via `jdk.incubator` |

## Sample catalog

All 25 samples ship in `wasm2lang_samples.xml`. Featured samples are marked **★**; backend-restricted samples list the languages they support.

### Basics & arithmetic

| Sample                         | Functions                                       | Concepts                                  |
| ------------------------------ | ----------------------------------------------- | ----------------------------------------- |
| **Fibonacci** ★                | `fib_iter`, `fib_rec`                           | Iterative loops, recursion                |
| **Arithmetic**                 | `add`, `add3`, `add_abs`                        | Multi-param, select, internal calls       |
| **Factorial**                  | `factorial_rec`, `factorial_iter` (i32 and i64) | If-expression results, accumulator loops  |
| **Collatz conjecture**         | `collatz_steps`, `collatz_max`                  | Nested if/else in loops, peak tracking    |
| **GCD / LCM**                  | `gcd_rec`, `gcd_iter`, `lcm`                    | Euclidean algorithm, function composition |
| **Select (min / max / clamp)** | `min`, `max`, `clamp`, `abs`                    | Wasm `select`, branchless logic           |
| **Float math (f64)**           | Float arithmetic and comparisons                | `f64` add / mul / div / sqrt / compare    |

### Memory, state, and tables

| Sample             | Functions                                              | Concepts                               |
| ------------------ | ------------------------------------------------------ | -------------------------------------- |
| **Global counter** | `increment`, `decrement`, `reset`, `get_count`         | Mutable globals                        |
| **Memory ops** ★   | `store_and_load`, `swap`, `sum_array`                  | `i32.store` / `load`, array iteration  |
| **String ops**     | `strlen`, `char_at`, `indexof`                         | Data segments, `load8_u`, early return |
| **Lookup table**   | `square_lookup`, `square_compute`, `is_perfect_square` | Precomputed data, fallback logic       |

### Bits, hashing, and numeric casts

| Sample                                   | Functions                                                | Concepts                               |
| ---------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| **Bitwise ops**                          | `rotl`, `rotr`, `clz`, `ctz`, `popcnt`                   | Wasm bit intrinsics                    |
| **Hashing (CRC32 / DJB2)** ★             | `init_crc_table`, `crc32_table`, `crc32_bitwise`, `djb2` | Table precomputation, shift/xor, loops |
| **Cast-module interception (32-bit)** ★  | 6 functions covering all 8 i32/u32 ↔ f32/f64 casts       | `cast` module imports → native casts   |
| **Cast-module interception (64-bit)** ★  | 6 functions covering all 8 i64/u64 ↔ f32/f64 casts       | `cast` module imports → native casts   |
| **BigInt i64 ops (JavaScript / Java)** ★ | i64-focused arithmetic                                   | BigInt in JS, `long` in Java           |

Backend-restricted: **Cast-module interception (64-bit)** — JavaScript, Java. **BigInt i64 ops** — JavaScript, Java.

### Control-flow recovery

These samples exercise the `wasm2lang:codegen` structuring pass, which reassembles idiomatic control flow from Wasm's block/br primitives.

| Sample                                       | Concept                                        |
| -------------------------------------------- | ---------------------------------------------- |
| **Switch dispatch (br_table)**               | Switch-like dispatch recovered from `br_table` |
| **Nested blocks (multi-level break)**        | Multi-level break recovery                     |
| **Loop forms (for / while / do-while)**      | Different structured loop shapes               |
| **If-else recovery (chained if-break)**      | Chained if-break turned back into branches     |
| **Block guard elision**                      | Guard blocks collapsing into cleaner flow      |
| **Switch variants (br_table / fallthrough)** | Fallthrough handling                           |
| **State machine (root-switch + epilogue)** ★ | Root-switch state machine with shared epilogue |

### Advanced dispatch

| Sample                         | Functions                                                           | Concepts                                    |
| ------------------------------ | ------------------------------------------------------------------- | ------------------------------------------- |
| **Indirect calls (ftable)** ★  | `dispatch`, `reduce`, `apply_chain`                                 | Function tables, `call_indirect`, type refs |
| **SIMD vectors (Java only)** ★ | `dot_product`, `sum_lanes`, `blend`, `negate_abs`, `shift_and_mask` | `v128` lane ops                             |

Backend-restricted: **SIMD vectors** — Java only.

## Quick start

Serve the files with any static HTTP server and open `index.html`:

```sh
# Python 3
python -m http.server 8080

# Node.js
npx serve .
```

Then visit `http://localhost:8080`, or skip the local server and open the hosted build at [coffeetales.github.io/wasm2lang](https://coffeetales.github.io/wasm2lang).

## URL hash preselection

Append `#sample=<id>` to the playground URL to open a specific sample directly. For example:

- [`#sample=fibonacci`](https://coffeetales.github.io/wasm2lang#sample=fibonacci)
- [`#sample=crc32`](https://coffeetales.github.io/wasm2lang#sample=crc32)
- [`#sample=cast_interception`](https://coffeetales.github.io/wasm2lang#sample=cast_interception)
- [`#sample=state_machine`](https://coffeetales.github.io/wasm2lang#sample=state_machine)

Switching samples in the picker rewrites the hash in place, so every view has a shareable URL.

## Repository layout

| File                       | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `index.html`               | Page structure, controls, inline SVG favicon                 |
| `wasm2lang_playground.js`  | Sample loader, syntax highlighting, editor wiring, transpile |
| `wasm2lang_playground.css` | Dark-theme styles, tabular layout, responsive breakpoints    |
| `wasm2lang_samples.xml`    | WAT sample sources, labels, tags, and backend restrictions   |

## Links

- **npm package:** [@coffeetales.net/wasm2lang](https://www.npmjs.com/package/@coffeetales.net/wasm2lang)
- **Transpiler source:** [github.com/COFFEETALES/wasm2lang](https://github.com/COFFEETALES/wasm2lang)
- **Live playground:** [coffeetales.github.io/wasm2lang](https://coffeetales.github.io/wasm2lang)
- **Sponsor:** [github.com/sponsors/COFFEETALES](https://github.com/sponsors/COFFEETALES)
- **fps.coffee:** [fps.coffee](https://fps.coffee)
