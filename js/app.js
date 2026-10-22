(function () {
  "use strict";

  /* =========================================================
     CONFIG
     SUBMIT_ENDPOINT: where briefs are POSTed (Formspree form URL).
       Leave empty to keep everything client-side (the payload is
       logged to the console instead of being sent).
     BOOKING_URL: optional scheduling link (Calendly, Cal.com…). When set,
       founders are offered it straight after sending their brief.
     ========================================================= */
  var SUBMIT_ENDPOINT = "https://formspree.io/f/xgaoknoy";
  var BOOKING_URL = "";

  var STORAGE_KEY = "poc-brief-v1";
  var TOTAL_STEPS = 5;
  var REVIEW_SCREEN = 6;

  /* Short, plain-language notes shown under a dropdown once it's answered */
  var HINTS = {
    presentation: {
      "Hand them my phone": "We’ll design for a phone screen first and make sure the demo works smoothly even on patchy Wi-Fi.",
      "Share screen on Zoom": "You’ll be the one clicking, so more can be mocked. We’ll rehearse the exact path with you.",
      "Send them a link to click around": "Investors will explore on their own, so every button they might tap needs to lead somewhere sensible.",
      "Video recording": "The most budget-friendly option: we only build what the camera sees."
    },
    timeline: {
      "Investor pitch in 2 weeks": "Tight, but doable for a focused demo. Expect most of it to be mocked except your “Aha” moment.",
      "Investor pitch in 4 weeks": "Enough time for a polished demo with one or two pieces that truly work.",
      "Investor pitch in 8 weeks": "Room for more real features and a round of feedback before you pitch.",
      "Just exploring": "No pressure. We’ll give you a clear plan you can act on when the timing is right."
    },
    budget: {
      "$2,000 – $5,000 CAD": "A focused, mostly mocked demo of your core flow.",
      "$5,000 – $10,000 CAD": "A polished demo with your most important pieces working for real.",
      "$10,000+ CAD": "A demo that holds up to hands-on investor testing, with more of it real.",
      "Not sure yet": "That’s common. We’ll show you what different budgets get you."
    }
  };

  var form = document.getElementById("briefForm");
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
  var progress = document.getElementById("progress");
  var progressFill = document.getElementById("progressFill");
  var progressLabel = document.getElementById("progressLabel");
  var savedIndicator = document.getElementById("savedIndicator");
  var liveRegion = document.getElementById("liveRegion");

  var state = {
    screen: 0,
    submitted: false,
    ref: "",
    answers: {
      name: "",
      email: "",
      company: "",
      industry: "",
      problem: "",
      solution: "",
      aha: "",
      userFlow: "",
      mustBeReal: [],
      canBeMocked: [],
      presentation: "",
      timeline: "",
      decisionMakers: "",
      budget: "",
      notes: ""
    }
  };

  var current = 0;
  var transitioning = false;

  /* =========================================================
     STORAGE — kept on this device so a founder can come back later
     ========================================================= */
  function save(showIndicator) {
    state.screen = current;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable — fine, keep going */ }
    if (showIndicator) flashSaved();
  }

  var savedTimer = null;
  function flashSaved() {
    savedIndicator.classList.add("is-visible");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { savedIndicator.classList.remove("is-visible"); }, 1600);
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || !saved.answers) return false;
      Object.keys(state.answers).forEach(function (k) {
        var v = saved.answers[k];
        if (v === undefined) return;
        if (Array.isArray(state.answers[k]) && !Array.isArray(v)) v = v ? [v] : [];
        state.answers[k] = v;
      });
      state.screen = typeof saved.screen === "number" ? saved.screen : 0;
      state.submitted = !!saved.submitted;
      state.ref = saved.ref || "";
      return true;
    } catch (e) {
      return false;
    }
  }

  /* =========================================================
     HYDRATE UI FROM STATE
     ========================================================= */
  function hydrate() {
    var a = state.answers;
    Object.keys(a).forEach(function (key) {
      var q = form.querySelector('[data-question="' + key + '"]');
      var input = form.querySelector('[name="' + key + '"]');
      if (input && typeof a[key] === "string") input.value = a[key];
      if (!q) return;
      if (q.getAttribute("data-type") === "multi") {
        q.querySelectorAll(".card").forEach(function (card) {
          card.setAttribute("aria-checked", a[key].indexOf(card.getAttribute("data-value")) > -1 ? "true" : "false");
        });
      }
    });
    Object.keys(HINTS).forEach(syncHint);
    updateSolutionCounter();
    updateFlowCounter();
    updateRealCounter();
    syncClashes();
  }

  /* =========================================================
     CARD SELECTION (checkbox groups)
     ========================================================= */
  form.addEventListener("click", function (e) {
    var card = e.target.closest(".card");
    if (!card) return;
    var q = card.closest("[data-question]");
    var key = q.getAttribute("data-question");

    var on = card.getAttribute("aria-checked") !== "true";
    card.setAttribute("aria-checked", on ? "true" : "false");
    // "Not sure" can't be combined with the other options
    if (on) {
      var exclusive = card.hasAttribute("data-exclusive");
      q.querySelectorAll(".card").forEach(function (c) {
        if (c !== card && (exclusive || c.hasAttribute("data-exclusive"))) c.setAttribute("aria-checked", "false");
      });
    }
    state.answers[key] = checkedValues(q);
    if (key === "mustBeReal") updateRealCounter();
    syncClashes();

    clearError(q);
    save(true);
  });

  function checkedValues(q) {
    return Array.prototype.slice.call(q.querySelectorAll('.card[aria-checked="true"]'))
      .map(function (c) { return c.getAttribute("data-value"); });
  }

  /* Arrow-key navigation inside card groups */
  form.addEventListener("keydown", function (e) {
    var card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (keys.indexOf(e.key) === -1) return;
    var cards = Array.prototype.slice.call(card.parentElement.querySelectorAll(".card"));
    var i = cards.indexOf(card);
    var forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    e.preventDefault();
    cards[(i + (forward ? 1 : -1) + cards.length) % cards.length].focus();
  });

  /* Text inputs and dropdowns */
  function onFieldChange(e) {
    var el = e.target;
    if (!el.name || !(el.name in state.answers)) return;
    state.answers[el.name] = el.value;
    if (HINTS[el.name]) syncHint(el.name);
    if (el.name === "solution") updateSolutionCounter();
    if (el.name === "userFlow") updateFlowCounter();
    var q = el.closest("[data-question]");
    if (q && q.classList.contains("has-error") && isQuestionValid(q)) clearError(q);
    debouncedSave();
  }
  form.addEventListener("input", onFieldChange);
  form.addEventListener("change", onFieldChange);

  var saveDebounce = null;
  function debouncedSave() {
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(function () { save(true); }, 450);
  }

  /* Enter key advances on single-line inputs */
  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
    var el = e.target;
    if (el.tagName === "INPUT" && el.type !== "button") {
      e.preventDefault();
      var nextBtn = el.closest(".screen").querySelector('[data-action="next"]');
      if (nextBtn) nextBtn.click();
    }
  });

  /* Start the flow list with "1. " and number each new line */
  var flowInput = document.getElementById("q-userFlow");
  flowInput.addEventListener("focus", function () {
    if (!flowInput.value.trim()) {
      flowInput.value = "1. ";
      state.answers.userFlow = flowInput.value;
    }
  });
  flowInput.addEventListener("blur", function () {
    if (/^\s*1\.\s*$/.test(flowInput.value)) {
      flowInput.value = "";
      state.answers.userFlow = "";
    }
  });
  flowInput.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
    var pos = flowInput.selectionStart;
    if (pos !== flowInput.selectionEnd || pos !== flowInput.value.length) return;
    var n = Brief.flowSteps(flowInput.value).length;
    if (!n || /\n\s*$/.test(flowInput.value)) return;
    e.preventDefault();
    flowInput.value += "\n" + (n + 1) + ". ";
    flowInput.dispatchEvent(new Event("input", { bubbles: true }));
  });

  form.addEventListener("submit", function (e) { e.preventDefault(); });

  /* =========================================================
     LIVE GUIDANCE
     ========================================================= */
  function syncHint(key) {
    var el = document.getElementById("hint-" + key);
    var msg = HINTS[key][state.answers[key]] || "";
    el.textContent = msg;
    el.classList.toggle("is-visible", !!msg);
  }

  function updateSolutionCounter() {
    var el = document.getElementById("count-solution");
    var n = state.answers.solution.trim().length;
    el.textContent = n > 200 ? "That’s more than a sentence. Investors remember the short version." : "";
  }

  function updateFlowCounter() {
    var el = document.getElementById("count-userFlow");
    var n = Brief.flowSteps(state.answers.userFlow).length;
    if (n === 0) el.textContent = "";
    else if (n < 3) el.innerHTML = "<strong>" + n + "</strong> step" + (n === 1 ? "" : "s") + " so far. Press Enter for the next one.";
    else if (n <= 5) el.innerHTML = "<strong>" + n + "</strong> steps. A good length for an investor demo.";
    else el.innerHTML = "<strong>" + n + "</strong> steps. Investor demos land best at 3–5. We can help you trim it.";
  }

  function updateRealCounter() {
    var el = document.getElementById("count-real");
    var n = Brief.realItems(state.answers).length;
    if (n === 0) el.textContent = "";
    else if (n <= 2) el.innerHTML = "<strong>" + n + "</strong> real. A focused build. Most pitch prototypes need one or two.";
    else el.innerHTML = "<strong>" + n + "</strong> real. Each one adds build time. Could any of these be mocked for now?";
  }

  /* Same-screen contradictions on step 3 */
  function syncClashes() {
    var box = document.getElementById("clashNotice");
    var clashes = Brief.checks(state.answers).filter(function (c) { return c.clash; });
    box.hidden = !clashes.length;
    box.textContent = clashes.map(function (c) { return c.text; }).join(" ");
  }

  /* =========================================================
     VALIDATION
     ========================================================= */
  function isQuestionValid(q) {
    var key = q.getAttribute("data-question");
    var type = q.getAttribute("data-type");
    var required = q.getAttribute("data-required") === "true";
    var val = state.answers[key];

    if (type === "email") {
      if (!val || !val.trim()) return !required;
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
    }
    if (!required) return true;
    if (type === "multi") return Array.isArray(val) && val.length > 0;
    if (key === "userFlow") return Brief.flowSteps(val).length >= 2;
    return typeof val === "string" && val.trim().length > 0;
  }

  function showError(q) {
    q.classList.add("has-error");
    var field = q.querySelector(".input, .textarea, .select");
    if (field) field.setAttribute("aria-invalid", "true");
  }
  function clearError(q) {
    q.classList.remove("has-error");
    var field = q.querySelector(".input, .textarea, .select");
    if (field) field.removeAttribute("aria-invalid");
  }

  function validateScreen(screenEl) {
    var questions = Array.prototype.slice.call(screenEl.querySelectorAll("[data-question]"));
    var firstInvalid = null;
    questions.forEach(function (q) {
      if (isQuestionValid(q)) {
        clearError(q);
      } else {
        showError(q);
        if (!firstInvalid) firstInvalid = q;
      }
    });
    if (firstInvalid) {
      var focusable = firstInvalid.querySelector(".input, .textarea, .select, .card");
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 300);
      announce("A few answers on this step still need filling in.");
      return false;
    }
    return true;
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */
  form.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "start") goTo(1);
    if (action === "resume") goTo(Math.max(1, Math.min(state.screen, REVIEW_SCREEN)));
    if (action === "next") {
      if (!validateScreen(screens[current])) return;
      goTo(current + 1);
    }
    if (action === "back") goTo(current - 1, true);
    if (action === "submit") submit();
    if (action === "edit") goTo(parseInt(btn.getAttribute("data-target"), 10), true);
  });

  function goTo(index) {
    if (transitioning || index < 0 || index > REVIEW_SCREEN || index === current) return;
    transitioning = true;

    var from = screens[current];
    var to = screens[index];

    from.classList.add("is-leaving");

    setTimeout(function () {
      from.classList.remove("is-active", "is-leaving");
      to.classList.add("is-active", "is-entering");
      current = index;
      updateProgress();
      if (index === REVIEW_SCREEN) renderReview();
      window.scrollTo({ top: 0, behavior: "auto" });
      to.focus({ preventScroll: true });
      var heading = to.querySelector("h1, h2");
      if (heading) announce(heading.textContent.trim());
      save(false);
      setTimeout(function () {
        to.classList.remove("is-entering");
        transitioning = false;
      }, 320);
    }, 160);
  }

  function updateProgress() {
    var step = parseInt((screens[current].getAttribute("data-step") || "0"), 10);
    var inFlow = step > 0;
    progress.classList.toggle("is-visible", inFlow || current === REVIEW_SCREEN);
    if (current === REVIEW_SCREEN) {
      progressFill.style.width = "100%";
      progressLabel.textContent = "Review";
    } else if (inFlow) {
      progressFill.style.width = (step / TOTAL_STEPS) * 100 + "%";
      progressLabel.textContent = "Step " + step + " of " + TOTAL_STEPS;
    } else {
      progressFill.style.width = "0%";
    }
  }

  function announce(msg) {
    liveRegion.textContent = "";
    setTimeout(function () { liveRegion.textContent = msg; }, 60);
  }

  /* =========================================================
     REVIEW
     ========================================================= */
  function editButton(step, label, text) {
    var edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit-link";
    edit.setAttribute("data-action", "edit");
    edit.setAttribute("data-target", String(step));
    edit.setAttribute("aria-label", "Edit " + label);
    edit.textContent = text || "Edit";
    return edit;
  }

  function renderReview() {
    var a = state.answers;
    var firstName = (a.name || "").trim().split(/[\s,]+/)[0];
    document.getElementById("closingName").textContent = firstName ? ", " + firstName : "";

    var checks = Brief.checks(a);
    var ul = document.getElementById("checksList");
    ul.innerHTML = "";
    checks.forEach(function (c) {
      var li = document.createElement("li");
      if (c.info) li.className = "is-info";
      li.appendChild(document.createTextNode(c.text + " "));
      if (!c.info) li.appendChild(editButton(c.step, "step " + c.step, "Review"));
      ul.appendChild(li);
    });
    document.getElementById("checks").hidden = !checks.length;

    var dl = document.getElementById("summaryList");
    dl.innerHTML = "";
    Brief.FIELDS.forEach(function (f) {
      var row = document.createElement("div");
      row.className = "summary__row";
      var dt = document.createElement("dt");
      dt.textContent = f.label;
      var dd = document.createElement("dd");
      dd.textContent = Brief.display(a, f.key) || "—";
      row.appendChild(dt);
      row.appendChild(dd);
      row.appendChild(editButton(f.step, f.label));
      dl.appendChild(row);
    });

    if (state.submitted) markSent();
  }

  /* =========================================================
     SUBMIT
     ========================================================= */
  function buildRecord() {
    if (!state.ref) state.ref = Brief.makeRef();
    return {
      v: 1,
      kind: "poc-brief",
      ref: state.ref,
      submittedAt: new Date().toISOString(),
      answers: JSON.parse(JSON.stringify(state.answers))
    };
  }

  function submit() {
    var btn = document.getElementById("submitBtn");
    if (state.submitted) return;

    btn.disabled = true;
    btn.textContent = "Sending…";
    var record = buildRecord();

    var done = function (ok) {
      btn.disabled = false;
      if (ok) {
        state.submitted = true;
        save(false);
        markSent();
      } else {
        btn.innerHTML = 'Try again <span class="arrow" aria-hidden="true">→</span>';
        var s = document.getElementById("sentState");
        s.classList.add("is-visible", "is-error");
        document.getElementById("sentMessage").textContent =
          "Your brief didn’t send. Your answers are safe on this device; please try again.";
      }
    };

    Brief.encodeRecord(record).then(function (encoded) {
      var link = Brief.profileUrl(encoded);
      try { localStorage.setItem(Brief.LAST_RECORD_KEY, JSON.stringify(record)); } catch (e) { /* optional */ }
      save(false);

      var fields = Brief.emailFields(record, link);
      fields._gotcha = document.getElementById("q-gotcha").value;

      if (!SUBMIT_ENDPOINT) {
        console.log("[Brief] Submission:", fields, record);
        setTimeout(function () { done(true); }, 500);
        return;
      }

      return fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(fields)
      }).then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (body) {
            console.warn("[Brief] Formspree rejected the submission:", r.status, body);
            done(false);
          });
        }
        done(true);
      });
    }).catch(function (err) {
      console.warn("[Brief] Submission failed:", err);
      done(false);
    });
  }

  function markSent() {
    var a = state.answers;
    var btn = document.getElementById("submitBtn");
    btn.textContent = "Brief sent";
    btn.classList.add("is-done");
    btn.setAttribute("aria-disabled", "true");
    var s = document.getElementById("sentState");
    s.classList.remove("is-error");
    s.classList.add("is-visible");
    document.getElementById("sentMessage").textContent = "Brief sent. Your reference is " + state.ref + ".";

    var next = document.getElementById("nextStep");
    next.textContent = BOOKING_URL
      ? "Next, pick a time for a short scoping call. We’ll walk through your “Aha” moment and come back with a clear plan and price."
      : "Within one business day, we’ll reply to " + (a.email || "your email") + " with a short scoping plan and a time to talk it through.";
    next.hidden = false;
    if (BOOKING_URL) {
      document.getElementById("bookingLink").href = BOOKING_URL;
      document.getElementById("bookingWrap").hidden = false;
    }
  }

  /* =========================================================
     INIT
     ========================================================= */
  var hasSaved = load();
  hydrate();
  if (hasSaved && state.screen > 0) document.getElementById("resumeNote").hidden = false;
  updateProgress();
})();
