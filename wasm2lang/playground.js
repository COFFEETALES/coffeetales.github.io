(function () {
  "use strict";

  // ── configuration ──

  var BINARYEN_CDN = "https://cdn.jsdelivr.net/npm/binaryen@125.0.0/index.js";
  var WASM2LANG_CDN = 
    "https://cdn.jsdelivr.net/npm/@coffeetales.net/wasm2lang@2026.3.104/dist_artifacts/wasmxlang.js";

  // ── samples ──

  var SAMPLES = {
    fibonacci: `(module
  (export "fib" (func $fib))

  (func $fib (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $i i32)

    (if
      (i32.lt_s (local.get $n) (i32.const 2))
      (then (return (i32.const 1)))
    )

    (local.set $a (i32.const 1))
    (local.set $b (i32.const 1))
    (local.set $i (i32.const 2))

    (block $exit
      (loop $loop
        (br_if $exit
          (i32.gt_s (local.get $i) (local.get $n))
        )
        (local.set $b (i32.add (local.get $a) (local.get $b)))
        (local.set $a (i32.sub (local.get $b) (local.get $a)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $loop)
      )
    )

    (local.get $b)
  )
)`,

    add: `(module
  (export "add" (func $add))

  (func $add (param $a i32) (param $b i32) (result i32)
    (i32.add (local.get $a) (local.get $b))
  )
)`,

    factorial: `(module
  (export "factorial" (func $factorial))

  (func $factorial (param $n i32) (result i32)
    (if (result i32)
      (i32.le_s (local.get $n) (i32.const 1))
      (then (i32.const 1))
      (else
        (i32.mul
          (local.get $n)
          (call $factorial
            (i32.sub (local.get $n) (i32.const 1))
          )
        )
      )
    )
  )
)`,

    collatz: `(module
  (export "collatz" (func $collatz))

  ;; Count steps to reach 1 in the Collatz sequence.
  ;; n -> n/2 if even, 3n+1 if odd.
  (func $collatz (param $n i32) (result i32)
    (local $steps i32)

    (block $done
      (loop $loop
        (br_if $done
          (i32.le_s (local.get $n) (i32.const 1)))

        (if (i32.and (local.get $n) (i32.const 1))
          (then
            (local.set $n (i32.add
              (i32.mul (local.get $n) (i32.const 3))
              (i32.const 1))))
          (else
            (local.set $n
              (i32.shr_u (local.get $n) (i32.const 1)))))

        (local.set $steps
          (i32.add (local.get $steps) (i32.const 1)))
        (br $loop)
      )
    )

    (local.get $steps)
  )
)`,

    gcd: `(module
  (export "gcd" (func $gcd))

  ;; Greatest common divisor (Euclidean algorithm).
  (func $gcd (param $a i32) (param $b i32) (result i32)
    (if (result i32)
      (i32.eqz (local.get $b))
      (then (local.get $a))
      (else
        (call $gcd
          (local.get $b)
          (i32.rem_u (local.get $a) (local.get $b))
        )
      )
    )
  )
)`,

    select: `(module
  (export "min" (func $min))
  (export "max" (func $max))

  ;; Uses the wasm "select" instruction (like a ternary).
  (func $min (param $a i32) (param $b i32) (result i32)
    (select
      (local.get $a)
      (local.get $b)
      (i32.lt_s (local.get $a) (local.get $b))
    )
  )

  (func $max (param $a i32) (param $b i32) (result i32)
    (select
      (local.get $a)
      (local.get $b)
      (i32.gt_s (local.get $a) (local.get $b))
    )
  )
)`,

    global_counter: `(module
  (global $count (mut i32) (i32.const 0))
  (export "increment" (func $increment))
  (export "get_count"  (func $get_count))

  (func $increment (param $n i32)
    (global.set $count
      (i32.add (global.get $count) (local.get $n))
    )
  )

  (func $get_count (result i32)
    (global.get $count)
  )
)`,

    memory: `(module
  (memory 1)
  (export "store_and_load" (func $store_and_load))

  (func $store_and_load (param $addr i32) (param $val i32) (result i32)
    (i32.store (local.get $addr) (local.get $val))
    (i32.load (local.get $addr))
  )
)`,

    strlen: `(module
  (memory 1)
  (data (offset (i32.const 0)) "Hello, WebAssembly!\\00")
  (export "strlen" (func $strlen))

  ;; Count bytes until a null terminator.
  (func $strlen (param $ptr i32) (result i32)
    (local $len i32)

    (block $done
      (loop $loop
        (br_if $done
          (i32.eqz (i32.load8_u
            (i32.add (local.get $ptr) (local.get $len)))))
        (local.set $len
          (i32.add (local.get $len) (i32.const 1)))
        (br $loop)
      )
    )

    (local.get $len)
  )
)`,

    lookup_table: `(module
  (memory 1)
  ;; Squares lookup: 0..9 pre-computed as i32 in memory.
  (data (offset (i32.const 0))
    "\\00\\00\\00\\00"  ;; 0
    "\\01\\00\\00\\00"  ;; 1
    "\\04\\00\\00\\00"  ;; 4
    "\\09\\00\\00\\00"  ;; 9
    "\\10\\00\\00\\00"  ;; 16
    "\\19\\00\\00\\00"  ;; 25
    "\\24\\00\\00\\00"  ;; 36
    "\\31\\00\\00\\00"  ;; 49
    "\\40\\00\\00\\00"  ;; 64
    "\\51\\00\\00\\00") ;; 81
  (export "square" (func $square))

  ;; Table lookup for 0..9, fallback to multiply.
  (func $square (param $n i32) (result i32)
    (if (result i32)
      (i32.and
        (i32.ge_s (local.get $n) (i32.const 0))
        (i32.lt_s (local.get $n) (i32.const 10)))
      (then
        (i32.load (i32.shl (local.get $n) (i32.const 2))))
      (else
        (i32.mul (local.get $n) (local.get $n)))
    )
  )
)`,

    bitwise: `(module
  (export "rotl" (func $rotl))
  (export "clz"  (func $clz))

  (func $rotl (param $v i32) (param $n i32) (result i32)
    (i32.rotl (local.get $v) (local.get $n))
  )

  (func $clz (param $v i32) (result i32)
    (i32.clz (local.get $v))
  )
)`,

    crc32: `(module
  (memory 1)
  (export "crc32" (func $crc32))

  ;; Compute CRC32 of a byte buffer in memory.
  ;; $ptr = start address, $len = byte count.
  (func $crc32 (param $ptr i32) (param $len i32) (result i32)
    (local $crc i32)
    (local $end i32)
    (local $byte i32)
    (local $j i32)

    (local.set $crc (i32.const -1))
    (local.set $end (i32.add (local.get $ptr) (local.get $len)))

    (block $done
      (loop $outer
        (br_if $done
          (i32.ge_u (local.get $ptr) (local.get $end)))

        (local.set $crc (i32.xor (local.get $crc)
          (i32.load8_u (local.get $ptr))))

        ;; Process 8 bits
        (local.set $j (i32.const 0))
        (block $bit_done
          (loop $bits
            (br_if $bit_done
              (i32.ge_u (local.get $j) (i32.const 8)))
            (if (i32.and (local.get $crc) (i32.const 1))
              (then
                (local.set $crc (i32.xor
                  (i32.shr_u (local.get $crc) (i32.const 1))
                  (i32.const 0xEDB88320))))
              (else
                (local.set $crc
                  (i32.shr_u (local.get $crc) (i32.const 1)))))
            (local.set $j
              (i32.add (local.get $j) (i32.const 1)))
            (br $bits)
          )
        )

        (local.set $ptr
          (i32.add (local.get $ptr) (i32.const 1)))
        (br $outer)
      )
    )

    (i32.xor (local.get $crc) (i32.const -1))
  )
)`,
  };

  // ── syntax highlighting ──

  var HTML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

  function escapeHtml(s) {
    return s.replace(/[&<>]/g, function (c) {
      return HTML_ESC[c];
    });
  }

  function buildHighlighter(keywords, extras) {
    var tokens = [
      { pattern: "(\\/\\/[^\\n]*|;;[^\\n]*)", className: "hl-comment" },
      {
        pattern: '("(?:[^"\\\\]|\\\\.)*"' + "|'(?:[^'\\\\]|\\\\.)*')",
        className: "hl-string",
      },
      { pattern: "(\\$[\\w.$]+)", className: "hl-var" },
      { pattern: "\\b(" + keywords + ")\\b", className: "hl-keyword" },
    ];
    if (extras) tokens.push({ pattern: extras, className: "hl-type" });
    tokens.push({
      pattern: "\\b(0x[0-9a-fA-F]+|-?\\d+(?:\\.\\d+)?)\\b",
      className: "hl-number",
    });

    var re = new RegExp(
      tokens
        .map(function (t) {
          return t.pattern;
        })
        .join("|"),
      "g",
    );
    var classes = tokens.map(function (t) {
      return t.className;
    });

    return function (text) {
      return escapeHtml(text).replace(re, function () {
        var a = arguments;
        for (var i = 0; i < classes.length; i++) {
          if (a[i + 1])
            return '<span class="' + classes[i] + '">' + a[i + 1] + "</span>";
        }
        return a[0];
      });
    };
  }

  var highlightWat = buildHighlighter(
    "module|func|param|result|local|global|if|then|else|block|loop|" +
      "br|br_if|br_table|call|call_indirect|return|memory|export|import|" +
      "type|table|elem|data|mut|offset|select|drop|unreachable|nop",
    "\\b(i32|i64|f32|f64)\\b",
  );

  var highlightCode = buildHighlighter(
    "var|function|return|if|else|while|do|for|switch|case|default|break|" +
      "continue|new|this|use|array|null|class|void|int|float|double|true|false",
  );

  // ── code editor binding ──

  function bindEditor(textarea, codeEl, getHighlighter) {
    var pre = codeEl.parentNode;

    function refresh() {
      codeEl.innerHTML = getHighlighter()(textarea.value) + "\n";
    }

    textarea.addEventListener("input", refresh);
    textarea.addEventListener("scroll", function () {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    });

    refresh();
    return refresh;
  }

  // ── DOM references ──

  var $ = function (id) {
    return document.getElementById(id);
  };

  var inputEl = $("input");
  var outputEl = $("output");
  var sampleEl = $("sample");
  var backendEl = $("backend");
  var normalizeEl = $("normalize");
  var manglerEl = $("mangler");
  var outputTabEl = $("output-tab");
  var btnEl = $("transpile-btn");
  var statusEl = $("status");

  var binaryen = null;
  var lastResult = null;

  function outputHighlighter() {
    return outputTabEl.value === "wat" ? highlightWat : highlightCode;
  }

  var refreshInput = bindEditor(inputEl, $("input-hl"), function () {
    return highlightWat;
  });
  var refreshOutput = bindEditor(outputEl, $("output-hl"), outputHighlighter);

  // ── helpers ──

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = type || "";
  }

  // ── sample loading ──

  function loadSample() {
    var text = SAMPLES[sampleEl.value];
    if (text) {
      inputEl.value = text;
      refreshInput();
    }
  }

  // ── transpile ──

  function showResult() {
    if (!lastResult) return;
    if (outputTabEl.value === "wat" && lastResult.wast) {
      outputEl.value = lastResult.wast;
    } else {
      var parts = [];
      if (lastResult.metadata) parts.push(lastResult.metadata);
      if (lastResult.code) parts.push(lastResult.code);
      outputEl.value = parts.join("\n");
    }
    refreshOutput();
  }

  function transpile() {
    if (!binaryen || !window.Wasm2Lang) return;

    var wat = inputEl.value.trim();
    if (!wat) {
      setStatus("No input.", "error");
      return;
    }

    btnEl.disabled = true;
    setStatus("Transpiling...");
    outputEl.value = "";
    lastResult = null;

    try {
      var options = {
        languageOut: backendEl.value,
        normalizeWasm: normalizeEl.value.split(","),
        inputData: wat,
        emitCode: true,
        emitMetadata: true,
        emitWebAssembly: "text",
      };
      if (manglerEl.value) options.mangler = manglerEl.value;
      var result = Wasm2Lang.transpile(binaryen, options);
      if (result && result instanceof Promise) {
        result.then(onResult).catch(onError);
      } else {
        onResult(result);
      }
    } catch (err) {
      onError(err);
    }
  }

  function onResult(result) {
    lastResult = result;
    showResult();
    setStatus("Done.", "success");
    btnEl.disabled = false;
  }

  function onError(err) {
    var msg = err && err.message ? err.message : String(err);
    outputEl.value = msg;
    refreshOutput();
    setStatus("Error: " + msg, "error");
    btnEl.disabled = false;
  }

  // ── events ──

  btnEl.addEventListener("click", transpile);
  outputTabEl.addEventListener("change", showResult);
  sampleEl.addEventListener("change", loadSample);

  // ── init ──

  loadSample();

  var versionMatch = WASM2LANG_CDN.match(/@(\d[\d.]+)/);
  $("version").textContent =
    "wasm2lang " + (versionMatch ? versionMatch[1] : "");

  setStatus("Loading wasm2lang + binaryen...");

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("Failed to load " + src));
      };
      document.head.appendChild(s);
    });
  }

  Promise.all([loadScript(WASM2LANG_CDN), import(BINARYEN_CDN)])
    .then(function (results) {
      binaryen = results[1].default;
      btnEl.textContent = "Transpile";
      btnEl.disabled = false;
      transpile();
    })
    .catch(function (err) {
      setStatus("Load error: " + err.message, "error");
    });
})();
