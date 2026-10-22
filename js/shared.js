/* =========================================================
   FOUNDER PROTOTYPE BRIEF — SHARED HELPERS
   Used by both the brief (index.html) and the
   Prototype Scope & Plan (profile.html).
   ========================================================= */
(function (global) {
  "use strict";

  /* Every answer, in the order it appears in the email and review.
     key: answers key · label: human label · step: screen to edit it on */
  var FIELDS = [
    { key: "name",           label: "Founder name",        step: 1 },
    { key: "email",          label: "Email",               step: 1 },
    { key: "company",        label: "Company",             step: 1 },
    { key: "industry",       label: "Industry",            step: 1 },
    { key: "problem",        label: "The problem",         step: 1 },
    { key: "solution",       label: "The solution",        step: 1 },
    { key: "aha",            label: "The “Aha” moment", step: 2 },
    { key: "userFlow",       label: "Core user flow",      step: 2 },
    { key: "mustBeReal",     label: "Must be real",        step: 3 },
    { key: "canBeMocked",    label: "Can be mocked",       step: 3 },
    { key: "presentation",   label: "How investors see it", step: 4 },
    { key: "timeline",       label: "Timeline",            step: 4 },
    { key: "decisionMakers", label: "Sign-off",            step: 4 },
    { key: "budget",         label: "Budget",              step: 5 },
    { key: "notes",          label: "Anything else",       step: 5 }
  ];

  /* Step 3 options. `value` is what's stored; `plain` is the
     internal name used in the email so the build team sees both. */
  var REAL = [
    { value: "Real sign-up & login",       plain: "User authentication" },
    { value: "Remembers what users enter", plain: "Saved data / persistence" },
    { value: "Real calculations",          plain: "Core logic / calculations" },
    { value: "Connects to real services",  plain: "External integrations (Stripe, Plaid…)" },
    { value: "Live updates",               plain: "Real-time updates" }
  ];
  var MOCK = [
    { value: "“Enter demo” button instead of login", plain: "Login bypass" },
    { value: "Realistic sample data",                       plain: "Dummy data" },
    { value: "Simulated connections",                       plain: "Fake service responses" },
    { value: "Pre-set results",                             plain: "Hard-coded results" }
  ];
  var NOT_SURE = "Not sure — help me decide";

  function list(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function has(arr, v) { return list(arr).indexOf(v) > -1; }

  /* The things a founder ticked as real, excluding "Not sure". */
  function realItems(a) { return list(a.mustBeReal).filter(function (v) { return v !== NOT_SURE; }); }

  /* Steps in the core user flow, one per line, numbering stripped. */
  function flowSteps(text) {
    return String(text || "").split(/\n+/)
      .map(function (s) { return s.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim(); })
      .filter(Boolean);
  }

  /* ---------- Things worth a second look ----------
     Contradictions and scope risks, phrased for the founder.
     Shown on the review screen and printed on the scope document.
     Never blocks submission. step: where to fix it. */
  var CLASHES = [
    [REAL[0].value, MOCK[0].value, "sign-up & login"],
    [REAL[3].value, MOCK[2].value, "connections to outside services"],
    [REAL[2].value, MOCK[3].value, "the results screen"]
  ];

  function checks(a) {
    var out = [];
    var real = realItems(a);
    var steps = flowSteps(a.userFlow);

    CLASHES.forEach(function (c) {
      if (has(a.mustBeReal, c[0]) && has(a.canBeMocked, c[1])) {
        out.push({ step: 3, clash: true, text: "You marked " + c[2] + " as both real and mocked. Pick one, or we’ll settle it together." });
      }
    });
    if (a.timeline === "Investor pitch in 2 weeks" && real.length >= 3) {
      out.push({ step: 3, text: "With a pitch in 2 weeks, " + real.length + " real pieces is ambitious. We’d suggest keeping only the “Aha” moment real." });
    }
    if (a.budget === "$2,000 – $5,000 CAD" && real.length >= 3) {
      out.push({ step: 3, text: "In the $2,000–$5,000 range, one or two real pieces gives you the most polish for the money." });
    }
    if (a.presentation === "Video recording" && real.length >= 2) {
      out.push({ step: 3, text: "For a recorded video, almost everything can be mocked — investors only see what’s on camera. That can lower the cost." });
    }
    if (a.presentation === "Send them a link to click around" && !has(a.mustBeReal, REAL[0].value) && !has(a.canBeMocked, MOCK[0].value)) {
      out.push({ step: 3, text: "Investors will open the link on their own, so we’ll need either a real login or an “Enter demo” button." });
    }
    if (steps.length > 6) {
      out.push({ step: 2, text: "Your flow has " + steps.length + " steps. Investor demos land best at 3–5 — we’ll help you trim it." });
    }
    if (has(a.mustBeReal, NOT_SURE) || has(a.canBeMocked, NOT_SURE)) {
      out.push({ step: 3, info: true, text: "We’ll recommend what to make real and what to mock, based on your “Aha” moment." });
    }
    return out;
  }

  /* Turn one answer into display text. */
  function display(answers, key) {
    var v = answers[key];
    if (key === "userFlow") v = flowSteps(v).map(function (s, i) { return (i + 1) + ". " + s; }).join("\n");
    if (Array.isArray(v)) v = v.join(", ");
    return v && String(v).trim() ? String(v).trim() : "";
  }

  /* Short, human-friendly reference, e.g. PB-261022-K3QF */
  function makeRef(date) {
    var d = date || new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var tail = "";
    for (var i = 0; i < 4; i++) tail += chars[Math.floor(Math.random() * chars.length)];
    return "PB-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + tail;
  }

  /* ---------- base64url helpers ---------- */
  function bytesToB64url(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToBytes(str) {
    var b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function streamThrough(bytes, transform) {
    return new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer()
      .then(function (buf) { return new Uint8Array(buf); });
  }

  /* Pack a record into a URL-safe string. Compressed ("z.") where the
     browser supports it, plain ("j.") otherwise. Returns a Promise. */
  function encodeRecord(record) {
    var bytes = new TextEncoder().encode(JSON.stringify(record));
    if (typeof CompressionStream === "function") {
      return streamThrough(bytes, new CompressionStream("deflate-raw"))
        .then(function (out) { return "z." + bytesToB64url(out); })
        .catch(function () { return "j." + bytesToB64url(bytes); });
    }
    return Promise.resolve("j." + bytesToB64url(bytes));
  }

  function decodeRecord(str) {
    try {
      var kind = str.slice(0, 2);
      var bytes = b64urlToBytes(str.slice(2));
      var parse = function (b) { return JSON.parse(new TextDecoder().decode(b)); };
      if (kind === "j.") return Promise.resolve(parse(bytes));
      if (kind === "z." && typeof DecompressionStream === "function") {
        return streamThrough(bytes, new DecompressionStream("deflate-raw")).then(parse);
      }
      return Promise.reject(new Error("Unsupported scope link"));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /* Absolute link to profile.html next to the current page */
  function profileUrl(encoded, base) {
    return new URL("profile.html", base || global.location.href).href.split("#")[0] + "#d=" + encoded;
  }

  /* "Real sign-up & login (User authentication)" — founder wording first */
  function withPlain(values, options) {
    return list(values).map(function (v) {
      var o = options.filter(function (x) { return x.value === v; })[0];
      return o ? v + " (" + o.plain + ")" : v;
    }).join(", ");
  }

  /* Flat, labelled fields for the Formspree email (keys show as row labels).
     The subject leads with budget and timeline so the inbox sorts itself. */
  function emailFields(record, link) {
    var a = record.answers;
    var company = a.company && a.company.trim() ? a.company.trim() : "Unnamed company";
    var budget = (a.budget || "Budget not given").replace(/ CAD$/, "");
    var out = {
      _subject: "[PoC Brief · " + budget + " · " + (a.timeline || "No timeline") + "] " + company + " — " + (a.name || "Founder") + " (" + record.ref + ")",
      _replyto: a.email || "",
      "Reference": record.ref,
      "Prototype Scope & Plan": link
    };
    FIELDS.forEach(function (f) {
      var v = f.key === "mustBeReal" ? withPlain(a.mustBeReal, REAL)
        : f.key === "canBeMocked" ? withPlain(a.canBeMocked, MOCK)
        : display(a, f.key);
      out[f.label] = v || "—";
    });
    var c = checks(a);
    out["Worth a second look"] = c.length ? c.map(function (x) { return "• " + x.text; }).join("\n") : "Nothing flagged";
    out["Submitted at"] = new Date(record.submittedAt).toUTCString();
    return out;
  }

  global.Brief = {
    FIELDS: FIELDS,
    REAL: REAL,
    MOCK: MOCK,
    NOT_SURE: NOT_SURE,
    CLASHES: CLASHES,
    realItems: realItems,
    flowSteps: flowSteps,
    checks: checks,
    display: display,
    makeRef: makeRef,
    encodeRecord: encodeRecord,
    decodeRecord: decodeRecord,
    profileUrl: profileUrl,
    emailFields: emailFields,
    LAST_RECORD_KEY: "poc-brief-last-scope"
  };
})(window);
