# wasm2lang Playground

Browser-based playground for [wasm2lang](https://www.npmjs.com/package/@coffeetales.net/wasm2lang) — a WebAssembly to source code transpiler.

Write or select WAT (WebAssembly Text Format) input and transpile it to **asm.js**, **PHP**, or **Java**.

## Features

- Side-by-side WAT input and transpiled output editors with syntax highlighting
- Built-in samples: Fibonacci, Factorial, GCD, CRC32, and more
- Configurable Binaryen normalization passes and name mangling
- Runs entirely in the browser (no server required)

## Usage

Serve the files with any static HTTP server and open `index.html`, or visit the hosted version at [wasm2lang.github.io](https://wasm2lang.github.io).

## Files

- `index.html` — page layout and controls
- `playground.js` — samples, syntax highlighting, transpiler integration
- `playground.css` — dark-theme styles
