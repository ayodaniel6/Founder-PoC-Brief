/* =========================================================
   PROTOTYPE SCOPE & PLAN — renders one founder brief as a
   single A4 page. Data comes from (in order):
     1. #d=<encoded>  (the link in the Formspree email)
     2. ?sample=1     (demo data, to preview the layout)
     3. the last brief sent from this browser
   ========================================================= */
(function () {
  "use strict";

  /* Fictional sample founder */
  var SAMPLE = {
    v: 1, kind: "poc-brief", ref: "PB-SAMPLE-0001", submittedAt: new Date().toISOString(),
    answers: {
      name: "Amara Okafor", email: "amara@ledgerly.ca", company: "Ledgerly", industry: "Healthtech",
      problem: "Small clinic owners spend 6+ hours a week chasing unpaid insurance claims by phone. Office managers feel it most — it’s the first thing they do every morning, and money slips through the cracks.",
      solution: "Ledgerly tracks every claim automatically and tells the office manager exactly which ones to chase today.",
      aha: "They upload last month’s claims and instantly see $14,200 in money they didn’t know they were owed.",
      userFlow: "1. Enter demo\n2. Upload a claims spreadsheet\n3. See the “money owed” dashboard\n4. Tap a claim to see the one-click follow-up",
      mustBeReal: ["Real calculations"],
      canBeMocked: ["“Enter demo” button instead of login", "Realistic sample data", "Simulated connections"],
      presentation: "Share screen on Zoom", timeline: "Investor pitch in 4 weeks",
      decisionMakers: "Me and my co-founder Tunde", budget: "$5,000 – $10,000 CAD",
      notes: "We have Figma screens from a freelancer."
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  var record = null;

  /* ---------- Load ---------- */
  function load() {
    var hash = location.hash.replace(/^#/, "");
    var match = /(?:^|&)d=([^&]+)/.exec(hash);
    if (match) return Brief.decodeRecord(match[1]);
    if (/[?&]sample=1/.test(location.search)) return Promise.resolve(SAMPLE);
    try {
      var last = localStorage.getItem(Brief.LAST_RECORD_KEY);
      if (last) return Promise.resolve(JSON.parse(last));
    } catch (e) { /* ignore */ }
    return Promise.resolve(null);
  }

  /* ---------- Helpers ---------- */
  function text(id, value, fallback) {
    var el = $(id);
    value = value && String(value).trim();
    if (value) { el.textContent = value; el.classList.remove("muted"); }
    else { el.textContent = fallback || "Not provided"; el.classList.add("muted"); }
  }
  function list(v) { return Array.isArray(v) ? v : (v ? [v] : []); }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" });
  }

  /* One column of the Real vs. Mocked matrix. `clashing` holds the
     values that also appear (as their opposite) in the other column. */
  function matrixColumn(id, values, clashing) {
    var ul = $(id);
    ul.innerHTML = "";
    var items = list(values);
    if (!items.length) items = [""];
    items.forEach(function (v) {
      var li = document.createElement("li");
      if (!v) { li.className = "is-empty"; li.textContent = "Nothing selected"; }
      else if (v === Brief.NOT_SURE) { li.className = "is-open"; li.textContent = "To decide together on our call"; }
      else {
        li.textContent = v;
        if (clashing.indexOf(v) > -1) {
          li.className = "is-clash";
          var tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = "Also marked " + (id === "pReal" ? "mocked" : "real");
          li.appendChild(tag);
        }
      }
      ul.appendChild(li);
    });
  }

  /* ---------- Render ---------- */
  function render(r) {
    record = r;
    var a = r.answers || {};

    var project = (a.company && a.company.trim()) || "Untitled project";
    document.title = "Prototype Scope & Plan — " + project;

    // Header
    $("pProject").textContent = project;
    text("pFounder", a.name);
    text("pEmail", a.email);
    text("pDate", formatDate(r.submittedAt));
    text("pRef", r.ref);

    // Section 1 — Vision
    text("pProblem", a.problem);
    text("pSolution", a.solution);
    text("pAha", a.aha);

    // Section 2 — Build strategy
    var flow = $("pFlow");
    flow.innerHTML = "";
    var steps = Brief.flowSteps(a.userFlow);
    flow.classList.toggle("is-long", steps.length > 5);
    if (!steps.length) {
      var none = document.createElement("li");
      none.className = "muted";
      none.textContent = "Not provided";
      flow.appendChild(none);
    }
    steps.forEach(function (s) {
      var li = document.createElement("li");
      li.textContent = s;
      flow.appendChild(li);
    });

    var real = list(a.mustBeReal);
    var mock = list(a.canBeMocked);
    var clashing = [];
    Brief.CLASHES.forEach(function (p) {
      if (real.indexOf(p[0]) > -1 && mock.indexOf(p[1]) > -1) clashing.push(p[0], p[1]);
    });
    matrixColumn("pReal", real, clashing);
    matrixColumn("pMock", mock, clashing);

    // Section 3 — Pitch logistics
    text("pTimeline", a.timeline);
    text("pPresentation", a.presentation);
    text("pDecision", a.decisionMakers);
    text("pBudget", a.budget);
    var notes = $("pNotes");
    notes.hidden = !(a.notes && a.notes.trim());
    notes.innerHTML = "";
    if (!notes.hidden) {
      var b = document.createElement("strong");
      b.textContent = "Founder notes: ";
      notes.appendChild(b);
      notes.appendChild(document.createTextNode(a.notes.trim()));
    }

    // Section 4 — Next steps
    var checks = Brief.checks(a);
    var ul = $("pAlign");
    ul.innerHTML = "";
    checks.forEach(function (c) {
      var li = document.createElement("li");
      if (c.info) li.className = "is-info";
      li.textContent = c.text;
      ul.appendChild(li);
    });
    $("pAlignWrap").hidden = !checks.length;
    restoreProposal();

    $("pFootRef").textContent = (r.ref || "") + " · " + project + (a.name ? " · " + a.name : "");

    $("sheet").hidden = false;
    $("emptyState").hidden = true;
    fitToPage();
    fitToScreen();
  }

  /* ---------- Proposal box: typed notes are kept on this device per ref ---------- */
  function proposalKey() { return "poc-brief-proposal:" + ((record && record.ref) || ""); }
  function restoreProposal() {
    var box = $("pProposal");
    var saved = "";
    try { saved = localStorage.getItem(proposalKey()) || ""; } catch (e) { /* ignore */ }
    box.innerText = saved;
  }
  $("pProposal").addEventListener("input", function () {
    var v = $("pProposal").innerText.replace(/\n+$/, "");
    try { if (v) localStorage.setItem(proposalKey(), v); else localStorage.removeItem(proposalKey()); } catch (e) { /* ignore */ }
    fitToPage();
  });
  // Keep pasted content plain
  $("pProposal").addEventListener("paste", function (e) {
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, t);
  });

  /* Shrink the base font until the sheet's content fits one A4 page */
  function fitToPage() {
    var sheet = $("sheet");
    var next = sheet.querySelector(".next");
    var size = 12.5;
    sheet.classList.remove("is-tight");
    sheet.style.setProperty("--fs", size + "px");
    var overflowing = function () {
      // the next-steps box flexes; measure real content by collapsing it
      next.style.flex = "0 0 auto";
      var over = sheet.scrollHeight > sheet.clientHeight + 1;
      next.style.flex = "";
      return over;
    };
    while (overflowing() && size > 9) {
      size -= 0.5;
      sheet.style.setProperty("--fs", size + "px");
    }
    if (overflowing()) sheet.classList.add("is-tight");
  }

  /* Scale the 794px sheet down on narrow screens */
  function fitToScreen() {
    var sheet = $("sheet");
    var avail = document.documentElement.clientWidth - 32;
    sheet.style.zoom = avail < 794 ? String(avail / 794) : "";
  }

  function showEmpty(msg) {
    $("sheet").hidden = true;
    $("emptyState").hidden = false;
    if (msg) $("emptyMsg").textContent = msg;
    ["copyLink", "downloadJson", "printBtn"].forEach(function (id) { $(id).disabled = true; });
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("is-visible"); }, 1800);
  }

  /* ---------- Actions ---------- */
  $("printBtn").addEventListener("click", function () { window.print(); });

  $("downloadJson").addEventListener("click", function () {
    if (!record) return;
    var blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    var link = document.createElement("a");
    var slug = (record.answers.company || "brief").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    link.href = URL.createObjectURL(blob);
    link.download = (record.ref || "scope") + "-" + (slug || "brief") + ".json";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  });

  $("copyLink").addEventListener("click", function () {
    if (!record) return;
    Brief.encodeRecord(record).then(function (enc) {
      return navigator.clipboard.writeText(Brief.profileUrl(enc, location.href));
    }).then(function () { toast("Link copied"); })
      .catch(function () { toast("Couldn’t copy — use the address bar"); });
  });

  window.addEventListener("resize", function () { if (record) fitToScreen(); });
  window.addEventListener("hashchange", function () { start(); });
  window.addEventListener("beforeprint", function () { $("sheet").style.zoom = ""; });
  window.addEventListener("afterprint", function () { if (record) fitToScreen(); });

  function start() {
    load().then(function (r) {
      if (r && r.answers) render(r);
      else showEmpty();
    }).catch(function () {
      showEmpty("This scope link looks broken or incomplete — open it again from the email.");
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
