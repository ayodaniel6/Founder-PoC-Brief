# Founder Prototype Brief

A 5-step brief for non-technical pre-seed founders (Fintech, Healthtech, Edtech) who need an investor-ready prototype. It helps them pick their "Aha" moment and decide what must be **real** and what can be **mocked**. It also captures their pitch date, how they'll demo, and their budget. Each brief turns into a printable one-page **Prototype Scope & Plan**.

```
Welcome → 1 Vision → 2 Demo → 3 Real vs. mocked → 4 Pitch → 5 Reality check → Review → Send
                                                                                    │
                       Formspree email: "[PoC Brief · $5,000 – $10,000 · Investor pitch in 4 weeks] Company — Name (PB-…)"
                                                                                    │
                                              profile.html#d=…  → one-page A4 Prototype Scope & Plan
```

## Files

```
index.html        The brief (welcome, 5 steps, review)
profile.html      The Prototype Scope & Plan
css/styles.css    Brief styles (dark design tokens)
css/profile.css   Scope document styles (dark screen, light A4 print)
js/shared.js      Field list, real/mock options, "worth a second look" checks, link encoding, email fields
js/app.js         Brief logic (validation, live guidance, progress, auto-save, submit)
js/profile.js     Scope rendering, one-page fitting, editable proposal box
```

There's no build step and there are no dependencies. Inter is loaded from Google Fonts.

## Configuration (top of `js/app.js`)

| Setting | Default | What it does |
|---|---|---|
| `SUBMIT_ENDPOINT` | Formspree URL | Where briefs are sent. Set it to `""` to log to the console instead. |
| `BOOKING_URL` | `""` | Optional Calendly/Cal.com link, offered right after a founder sends their brief. |

## Helping founders avoid mismatches

Nothing auto-disqualifies, and budget is only captured. The brief guides founders as they go:

- **Plain language only.** Step 3 options are written as outcomes ("Remembers what users enter"), not as technical terms. The email adds the internal term in brackets for the build team, e.g. `(Saved data / persistence)`.
- **"Not sure — help me decide"** is offered for both real and mocked, so nobody guesses.
- **Live guidance:** a note under each dropdown explains what the choice means for the build. Counters nudge the user flow toward 3–5 steps and "real" toward 1–2 items.
- **Contradictions** (e.g. real login *and* an "Enter demo" button) are flagged on step 3.
- **Worth a second look** on the review screen lists scope risks, such as a 2-week pitch with 3+ real pieces, a $2k–$5k budget with 3+ real pieces, a video demo with real features, or a shareable link with no way in. None of these block sending. The same list prints as **Points to align on** in the scope, and goes in the email.

## The Prototype Scope & Plan

`profile.html` reads the brief from the part of the link after `#`, which browsers never send to a server.

- **Header:** project name, founder, email, date, ref ID
- **1 · The Vision:** problem, solution, the "Aha" moment
- **2 · Build Strategy:** the core user flow as numbered steps. Below it, the **Real vs. Mocked** matrix, with clashes tagged and the cost-saving note.
- **3 · Pitch Logistics:** timeline, presentation method, decision makers, budget (plus any founder notes)
- **4 · Next Steps:** auto-generated points to align on, and a blank **Next Steps / Proposal Outline** box. You can type into the box on screen (it's saved in your browser for that ref) or print it and write by hand.

It always prints to **one A4 page**: the text shrinks automatically when answers are long. Open `profile.html?sample=1` to preview it with a fictional founder.

## Run / deploy

- **GitHub Pages:** go to Settings → Pages and deploy from the `main` branch (root folder).
- **Locally:** run `python3 -m http.server` in this folder and open http://localhost:8000.

## Design tokens

| Token | Value |
|---|---|
| `--bg-base` | `#0F172A` |
| `--bg-card` | `#1E293B` (borders `#334155`) |
| `--text-primary` | `#F8FAFC` |
| `--text-secondary` | `#94A3B8` |
| `--accent` | `#3B82F6` (buttons, progress, "real") |
| `--mock` | `#A78BFA` ("mocked") |

Type is Inter. Transitions are short fades, and none run when the user has asked for reduced motion.
