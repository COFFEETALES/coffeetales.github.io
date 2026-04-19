(function () {
  "use strict";

  // ── configuration ──

  var BINARYEN_CDN = "https://cdn.jsdelivr.net/npm/binaryen@129.0.0/index.js";
  var WASM2LANG_CDN =
    "https://cdn.jsdelivr.net/npm/@coffeetales.net/wasm2lang@2026.4.112/dist_artifacts/wasmxlang.js";

  var ALL_BACKENDS = ["asmjs", "javascript", "php64", "java"];
  var BACKEND_LABELS = {
    asmjs: "asm.js",
    javascript: "JavaScript",
    php64: "PHP",
    java: "Java",
  };

  // SAMPLES[id] = { text, label, summary, tags, featured, backends }
  var SAMPLES = {};
  var SAMPLE_IDS = [];

  // ── syntax highlighting ──

  var HTML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

  function escapeHtml(s) {
    return s.replace(/[&<>]/g, function (c) {
      return HTML_ESC[c];
    });
  }

  function buildHighlighter(keywords, extras, commentPattern) {
    var tokens = [
      { pattern: commentPattern || "(\\/\\/[^\\n]*)", className: "hl-comment" },
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

    var patterns = tokens.map(function (t) {
      return t.pattern;
    });
    var classes = tokens.map(function (t) {
      return t.className;
    });
    var re = new RegExp(patterns.join("|"), "g");

    return function (text) {
      return escapeHtml(text).replace(re, function () {
        for (var i = 0; i < classes.length; i++) {
          if (arguments[i + 1]) {
            return (
              '<span class="' + classes[i] + '">' + arguments[i + 1] + "</span>"
            );
          }
        }
        return arguments[0];
      });
    };
  }

  var highlightWat = buildHighlighter(
    "module|func|param|result|local|global|if|then|else|block|loop|" +
      "br|br_if|br_table|call|call_indirect|return|memory|export|import|" +
      "type|table|elem|data|mut|offset|select|drop|unreachable|nop",
    "\\b(i32|i64|f32|f64|v128)\\b",
    "(\\/\\/[^\\n]*|;;[^\\n]*)",
  );

  var highlightCode = buildHighlighter(
    "var|let|const|function|return|if|else|while|do|for|switch|case|default|" +
      "break|continue|new|this|use|array|null|class|void|int|float|double|" +
      "true|false|typeof|instanceof|in|of|static|extends",
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

  function $(id) {
    return document.getElementById(id);
  }

  var inputEl = $("input");
  var outputEl = $("output");
  var samplePickerShellEl = $("sample-picker-shell");
  var samplePickerBtnEl = $("sample-picker-btn");
  var samplePickerCurrentEl = $("sample-picker-current");
  var samplePickerEl = $("sample-picker");
  var sampleSearchEl = $("sample-search");
  var samplePickerListEl = $("sample-picker-list");
  var samplePickerEmptyEl = $("sample-picker-empty");
  var samplePreviewTitleEl = $("sample-preview-title");
  var samplePreviewSummaryEl = $("sample-preview-summary");
  var samplePreviewBadgesEl = $("sample-preview-badges");
  var backendEl = $("backend");
  var normalizeEl = $("normalize");
  var manglerEl = $("mangler");
  var outputTabEl = $("output-tab");
  var btnEl = $("transpile-btn");
  var statusEl = $("status");

  var binaryen = null;
  var lastResult = null;
  var selectedSampleId = null;

  function outputHighlighter() {
    return outputTabEl.value === "wat" ? highlightWat : highlightCode;
  }

  var refreshInput = bindEditor(inputEl, $("input-hl"), function () {
    return highlightWat;
  });
  var refreshOutput = bindEditor(outputEl, $("output-hl"), outputHighlighter);

  // ── helpers ──

  function hideLoadingOverlay() {
    var overlay = $("loading-overlay");
    overlay.classList.add("hidden");
    overlay.addEventListener("transitionend", function () {
      overlay.close();
      overlay.remove();
    });
  }

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = type || "";
  }

  function clearChildren(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function createPill(text, type) {
    var pill = document.createElement("span");
    pill.className = "sample-pill" + (type ? " " + type : "");
    pill.textContent = text;
    return pill;
  }

  function appendBadges(container, sample) {
    sample.tags.forEach(function (tag) {
      container.appendChild(createPill(tag));
    });
    sample.backends.forEach(function (backend) {
      container.appendChild(createPill(BACKEND_LABELS[backend], "backend"));
    });
  }

  // ── sample selection ──

  function applyBackendRestrictions(sample) {
    var allowed = sample.backends;
    var options = backendEl.options;
    var needSwitch = false;

    for (var i = 0; i < options.length; i++) {
      var disabled = allowed.indexOf(options[i].value) === -1;
      options[i].disabled = disabled;
      if (disabled && options[i].selected) needSwitch = true;
    }

    if (needSwitch && allowed.length) {
      backendEl.value = allowed[0];
    }
  }

  function renderSamplePreview() {
    var sample = SAMPLES[selectedSampleId];
    if (!sample) return;

    samplePreviewTitleEl.textContent = sample.label;
    samplePreviewSummaryEl.textContent = sample.summary;
    clearChildren(samplePreviewBadgesEl);
    appendBadges(samplePreviewBadgesEl, sample);
  }

  function createSampleCard(sampleId) {
    var sample = SAMPLES[sampleId];
    var isSelected = sampleId === selectedSampleId;

    var card = document.createElement("label");
    card.className = "sample-card" + (isSelected ? " selected" : "");
    card.setAttribute("data-sample-id", sampleId);

    var radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "sample-picker-radio";
    radio.value = sampleId;
    radio.className = "sample-card-radio";
    radio.checked = isSelected;

    var top = document.createElement("div");
    top.className = "sample-card-top";

    var title = document.createElement("span");
    title.className = "sample-card-title";
    title.textContent = sample.label;
    top.appendChild(title);
    if (sample.featured) top.appendChild(createPill("Featured", "featured"));

    var summary = document.createElement("span");
    summary.className = "sample-card-summary";
    summary.textContent = sample.summary;

    var badges = document.createElement("div");
    badges.className = "sample-card-badges";
    appendBadges(badges, sample);

    card.appendChild(radio);
    card.appendChild(top);
    card.appendChild(summary);
    card.appendChild(badges);
    return card;
  }

  function appendSampleSection(title, sampleIds) {
    if (!sampleIds.length) return;

    var section = document.createElement("div");
    section.className = "sample-picker-section";

    var heading = document.createElement("span");
    heading.className = "sample-picker-section-title";
    heading.textContent = title;
    section.appendChild(heading);

    sampleIds.forEach(function (sampleId) {
      section.appendChild(createSampleCard(sampleId));
    });
    samplePickerListEl.appendChild(section);
  }

  function filterSampleIds() {
    var filter = sampleSearchEl.value.trim().toLowerCase();
    if (!filter) return SAMPLE_IDS;

    return SAMPLE_IDS.filter(function (sampleId) {
      var s = SAMPLES[sampleId];
      var backendLabels = s.backends.map(function (b) {
        return BACKEND_LABELS[b];
      });
      var haystack = [
        s.label,
        s.summary,
        s.tags.join(" "),
        backendLabels.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(filter) !== -1;
    });
  }

  function renderSamplePicker() {
    clearChildren(samplePickerListEl);

    var matches = filterSampleIds();
    if (!matches.length) {
      samplePickerEmptyEl.hidden = false;
      return;
    }
    samplePickerEmptyEl.hidden = true;

    if (sampleSearchEl.value.trim()) {
      appendSampleSection("Matches", matches);
      return;
    }

    var featured = [];
    var standard = [];
    matches.forEach(function (sampleId) {
      (SAMPLES[sampleId].featured ? featured : standard).push(sampleId);
    });
    appendSampleSection("Featured", featured);
    appendSampleSection(featured.length ? "More Samples" : "Samples", standard);
  }

  function setSamplePickerOpen(open) {
    samplePickerEl.hidden = !open;
    samplePickerBtnEl.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeSamplePicker() {
    if (samplePickerEl.hidden) return;
    setSamplePickerOpen(false);
    sampleSearchEl.value = "";
    renderSamplePicker();
  }

  function openSamplePicker() {
    if (samplePickerBtnEl.disabled) return;
    setSamplePickerOpen(true);
    renderSamplePicker();
    sampleSearchEl.focus();
    sampleSearchEl.select();
  }

  function syncHashTo(sampleId) {
    var hash = "#" + sampleId;
    if (location.hash !== hash) {
      history.replaceState(null, "", hash);
    }
  }

  function selectSample(sampleId) {
    var sample = SAMPLES[sampleId];
    if (!sample) return;

    selectedSampleId = sampleId;
    samplePickerCurrentEl.textContent = sample.label;
    inputEl.value = sample.text;
    refreshInput();
    applyBackendRestrictions(sample);
    renderSamplePreview();
    renderSamplePicker();
    syncHashTo(sampleId);
  }

  function readSampleIdFromHash() {
    var hashId = location.hash.replace(/^#/, "");
    try {
      hashId = decodeURIComponent(hashId);
    } catch (e) {}
    return hashId && SAMPLES[hashId] ? hashId : null;
  }

  // ── transpile ──

  function showResult() {
    if (!lastResult) return;
    if (outputTabEl.value === "wat" && lastResult.wast) {
      outputEl.value = lastResult.wast;
    } else {
      outputEl.value = [lastResult.metadata, lastResult.code]
        .filter(Boolean)
        .join("\n");
    }
    refreshOutput();
  }

  function getManglerValue() {
    var v = manglerEl.value;
    if (!v) return null;
    return v === "random" ? Math.random().toString(36).slice(2) : v;
  }

  function buildTranspileOptions(wat) {
    var options = {
      languageOut: backendEl.value,
      normalizeWasm: normalizeEl.value.split(","),
      inputData: wat,
      emitCode: true,
      emitMetadata: true,
      emitWebAssembly: "text",
    };
    var mangler = getManglerValue();
    if (mangler) options.mangler = mangler;
    return options;
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
      var result = Wasm2Lang.transpile(binaryen, buildTranspileOptions(wat));
      if (result instanceof Promise) {
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
    var msg =
      (err instanceof Error && err.message) ||
      (typeof err === "string" && err) ||
      "An unexpected error occurred. Try a different normalization level.";
    outputEl.value = msg;
    refreshOutput();
    setStatus("Error: " + msg.split("\n")[0], "error");
    btnEl.disabled = false;
  }

  // ── events ──

  btnEl.addEventListener("click", transpile);
  outputTabEl.addEventListener("change", showResult);

  samplePickerBtnEl.addEventListener("click", function () {
    if (samplePickerEl.hidden) openSamplePicker();
    else closeSamplePicker();
  });

  sampleSearchEl.addEventListener("input", renderSamplePicker);
  sampleSearchEl.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    var firstCard = samplePickerListEl.querySelector(".sample-card");
    if (!firstCard) return;
    firstCard.click();
    event.preventDefault();
  });

  samplePickerListEl.addEventListener("click", function (event) {
    var target = event.target;
    if (!target.classList || !target.classList.contains("sample-card-radio")) {
      return;
    }
    var card = target.parentNode;
    if (!card) return;
    selectSample(card.getAttribute("data-sample-id"));
    closeSamplePicker();
    samplePickerBtnEl.focus();
  });

  document.addEventListener("click", function (event) {
    if (samplePickerEl.hidden) return;
    if (samplePickerShellEl.contains(event.target)) return;
    closeSamplePicker();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || samplePickerEl.hidden) return;
    closeSamplePicker();
    samplePickerBtnEl.focus();
  });

  window.addEventListener("hashchange", function () {
    var hashId = readSampleIdFromHash();
    if (hashId && hashId !== selectedSampleId) {
      selectSample(hashId);
      transpile();
    }
  });

  // ── init ──

  var versionMatch = WASM2LANG_CDN.match(/@(\d[\d.]+)/);
  $("version").textContent =
    "wasm2lang " + (versionMatch ? versionMatch[1] : "@latest");

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

  function loadSamplesXml() {
    return new Promise(function (resolve, reject) {
      function onReady() {
        var doc = $("samples-xml").contentDocument;
        if (doc) resolve(doc);
        else reject(new Error("Failed to load wasm2lang_samples.xml"));
      }
      if (document.readyState === "complete") onReady();
      else window.addEventListener("load", onReady);
    });
  }

  function parseSampleNode(node) {
    var id = node.getAttribute("id");
    var tags = node.getAttribute("tags");
    var backends = node.getAttribute("backends");
    SAMPLES[id] = {
      text: node.textContent.trim(),
      label: node.getAttribute("label") || id,
      summary: node.getAttribute("summary") || "Built-in sample.",
      tags: tags
        ? tags.split(",").map(function (t) {
            return t.trim();
          })
        : [],
      featured: node.getAttribute("featured") === "true",
      backends: backends ? backends.split(",") : ALL_BACKENDS,
    };
    SAMPLE_IDS.push(id);
  }

  function parseSamplesXml(doc) {
    var nodes = doc.getElementsByTagName("sample");
    for (var i = 0; i < nodes.length; i++) {
      parseSampleNode(nodes[i]);
    }
  }

  Promise.all([
    loadScript(WASM2LANG_CDN),
    import(BINARYEN_CDN),
    loadSamplesXml(),
  ])
    .then(function (results) {
      binaryen = results[1].default;
      parseSamplesXml(results[2]);
      btnEl.textContent = "Transpile";
      btnEl.disabled = false;
      samplePickerBtnEl.disabled = false;
      renderSamplePicker();
      selectSample(readSampleIdFromHash() || SAMPLE_IDS[0]);
      transpile();
      hideLoadingOverlay();
    })
    .catch(function (err) {
      setStatus("Load error: " + err.message, "error");
      hideLoadingOverlay();
    });
})();
