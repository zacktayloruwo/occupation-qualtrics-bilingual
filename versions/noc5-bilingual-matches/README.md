# noc5-bilingual-matches

**Status:** Ready to test
**NOC level:** 5-digit unit group (~516 categories)
**Languages:** EN + FR
**UI:** Tom Select single-select with visible match feedback

Shows the same 516 category names as
[`noc5-bilingual-tomselect`](../noc5-bilingual-tomselect/), searches the same occupation
titles, and writes the same three embedded-data fields. The data file is byte-identical
apart from the global variable name.

Both versions use the same tiered relevance ranking — verified across 396 queries with
zero ordering differences — so comparing them isolates the feedback rather than
confounding it with a scoring difference. That ranking is documented under
[Relevance ranking](#relevance-ranking) below.

The one difference: it **shows the respondent which occupation titles matched**,
instead of matching against them invisibly.

---

## Installing in Qualtrics

Everything needed is on this page.

### 1. Look & Feel → Header

Paste as-is. These URLs are live and pinned to commit `d2db22e`.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-matches/noc2021_bilingual_matches.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-matches/occupation_matches.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

Two files: the **data** and the **widget**. Each version defines different globals, so
one version's files cannot stand in for another's. Fielding a second version means
adding its two files here as well; Tom Select is only ever needed once.

Pin a **full commit SHA**, never `@main` — jsDelivr caches `@main` aggressively, and a
SHA locks a fielded survey to an exact snapshot. Note that a freshly pushed SHA can
404 for a minute or two while jsDelivr fetches it from GitHub for the first time.

### 2. Survey Flow

Add an **Embedded Data** element **above the first block**. Placement matters: any
element sitting between blocks disables the Back button on the block that follows it.

Declare each field this version writes:

- `__js_occupation_noc_code`
- `__js_occupation_category_name`
- `__js_occupation_lang`

If you set a `fieldPrefix` in step 4, declare the prefixed names instead
(`__js_myprefix_occupation_noc_code`, and so on).

### 3. Question HTML

Add to the question body — and to **every language translation** of it:

```html
<select></select>
<button type="button">Clear</button>
```

The `<select>` is where the dropdown renders. The button is optional; it is styled
automatically and needs no class or id.

### 4. Question JavaScript

Select all in the editor, delete, and paste:

```js
Qualtrics.SurveyEngine.addOnload(function () {
  window.occupationWidget.matches.init(this, {
    fieldPrefix: "",          // e.g. "matches_" if several versions share one survey
    forceLang:   null,        // "EN" or "FR" on a single-language survey
    showSummary: false,     // the line above the box; off by default
    showHints:   true,
  });
});
```

Delete any `addOnload` stub the editor pre-populates. Every option is optional and
defaults to the value shown, so `init(this, {})` behaves exactly as documented here.

| Option | What it does | Default |
|---|---|---|
| `fieldPrefix` | prefix for field names and the session key | `""` |
| `forceLang` | `"EN"`/`"FR"` on a single-language survey | `null` (auto-detect) |
| `placeholder` | `{ EN, FR }` prompt inside the box | this version's text |
| `depsTimeoutMs` | how long to wait for the CDN files | `15000` |
| `showSummary` | the line above the box | `false` |
| `showHints` | the per-row matched titles | `true` |
| `maxSummary`, `maxHints` | titles named | `2` |
| `minQueryLen` | before feedback shows | `2` |

### 5. Publish and test

Saving is not enough — **publish**, then open the published link in a **private
window**. A private window matters: `sessionStorage` deliberately preserves a
selection across reloads, which otherwise looks like a stale page.

To confirm the current script is live, run this in the browser console on the survey:

```js
document.querySelector('select').tomselect.control_input.getAttribute('placeholder')
```

A string means the current script; `null` means the question is running older code.

### Pasting instead of hosting

Pasting still works: paste the full contents of `occupation_matches.js` into the question editor and
append the same `addOnload` stub underneath. There is one copy of the logic either way.
Hosting is recommended because re-pasting across several questions is where stale
scripts creep in — a missed paste leaves a silently stale question that is hard to
distinguish from a caching problem.

## Why

In the tomselect version a respondent types `head nurse` and is offered
*Nursing coordinators and supervisors*. Nothing on screen connects the two. They
cannot tell whether the system understood them, and they cannot tell what an
unfamiliar category actually covers. Both questions are answered by naming the
titles that matched.

The clearest case is `plumber`, which returns three categories that look almost
interchangeable until you see the matched titles:

| Category offered | Titles that matched |
|---|---|
| Plumbers | Plumber, Plumber apprentice |
| Contractors and supervisors, pipefitting trades | Plumbers supervisor, Plumber foreman/woman |
| Construction trades helpers and labourers | Plumber helper |

Same three answers as the fielded version; now the respondent can actually choose
between them.

---

## How the feedback appears

Each row in the dropdown carries a muted second line naming the occupation titles from
*that* category which matched what was typed:

| Row | Second line |
|---|---|
| Plumbers | **Examples:** Plumber, Plumber apprentice |
| Contractors and supervisors, pipefitting trades | **Examples:** Plumbers supervisor, Plumber foreman/woman |
| Construction trades helpers and labourers | **Examples:** Plumber helper |

Same three answers the fielded version gives, but the respondent can now tell them
apart. The label is language-aware — `Examples:` in English, `Exemples :` in French,
with the space before the colon French typography expects.

Controlled by `showHints` (default `true`) and `maxHints` (default `2`).

### The summary line is off by default

An earlier design also put a line **above** the box naming the closest matching titles
overall ("Closest examples: Head nurse, Assistant head nurse"). It is still available
but no longer shown, because the per-row labels answer the same question in the place
the respondent is actually looking, and the extra line cost vertical space that matters
on a phone.

To bring it back:

```js
window.occupationWidget.matches.init(this, { showSummary: true });
```

With it enabled, a query matching nothing reports "No matching occupation examples" —
useful negative feedback the fielded version never gives.

## What this exposes about the fielded version

Turning the feedback on immediately surfaced a genuine search-quality problem that
`tomselect` hides. Typing `head nurse` into the **currently fielded** widget returns,
in order:

1. Managers in horticulture
2. Nursing coordinators and supervisors
3. Contractors and supervisors, landscaping, grounds maintenance and horticulture services

Tom Select splits the query into `head` and `nurse` and matches them independently
anywhere in a category's concatenated keyword blob, so categories containing
*nursery* and some unrelated *head* rank above the one category that literally
contains the title *Head nurse*. In this version only the nursing row carries a hint,
because only it contains the whole phrase — so the mismatch is visible at a glance
rather than silently steering respondents to the wrong code.

This is worth deciding on separately from the feedback question. Options include
requiring all query tokens to match the same title, or scoring whole-phrase title
matches above token-scatter matches.

---

## Data prep

Run `noc_process_matches.R`. It reads `data-raw/` and writes
`noc2021_bilingual_matches.js` into this folder. The transformation is identical to
the tomselect version's; only the emitted global name differs
(`window.nocMatches` rather than `window.categories`) so both can coexist on one page,
as they do on the demo site.

---

## Embedded data

Unchanged from tomselect, so responses are directly comparable:

| Survey Flow field name | Contents |
|---|---|
| `__js_occupation_noc_code` | 5-digit NOC 2021 category code |
| `__js_occupation_category_name` | Category name in the language active at selection |
| `__js_occupation_lang` | `EN` or `FR` |

The matched titles are feedback only. If it would be useful to record which title
drove a selection, that is a small addition — say the word.

---

---

## Implementation notes

### Matches must be computed in `score`, not on the `type` event

Tom Select's `_onInput()` calls `refreshOptions()` **before** it fires `type`. Computing
matches in a `type` handler therefore renders every row against the *previous* query —
the hints lag one keystroke behind, which is worse than no hints at all. The
`settings.score` callback is invoked once per search before any row is built, so that
is where matches are computed and the render cache dropped. The base scoring function
is returned untouched, which is what keeps relevance ordering identical to tomselect.

Note also that `type` fires on a 300 ms `refreshThrottle`, not on every keypress.

### Mobile layout and the iOS zoom

Paste into **Look & Feel → Style → Custom CSS**. These are Qualtrics-level settings and
apply to the whole survey.

```css
/* The survey header holds only the <script> and <link> tags from step 1. They are
   display:none, so the container renders as empty space below the logo. Collapse it,
   and keep a modest padding on the logo rather than dropping to 0. */
#header-container {
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

#logo-container {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

@media (max-width: 768px) {
  /* iOS Safari force-zooms any input under 16px and never zooms back out.
     Tom Select ships its input at 13px. */
  .ts-control,
  .ts-control input,
  .ts-dropdown {
    font-size: 16px !important;
  }

  .question-error-wrapper {
    padding-top: 4px !important;
    padding-bottom: 4px !important;
  }
  .question-display { margin-bottom: 4px !important; }
  .occ-summary      { margin-bottom: 2px !important; }
  nav#navigation {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }
}

/* Optional: smaller, tighter instruction text. */
.question-display   { line-height: 1.25; }
.question-display i { font-size: 75%; }
```

**Do not use the `user-scalable=no` viewport advice** you will find elsewhere for the
zoom problem. iOS has ignored it since iOS 10, so it does not work, and to the extent
`maximum-scale` still applies it blocks pinch-zoom for anyone who needs to magnify text.

**These selectors are for the New Survey Taking Experience.** Most Qualtrics CSS advice
online targets the classic skin — `.QuestionOuter`, `.QuestionBody`, `.SkinInner`,
`.QuestionText` — which match *nothing* on a new-experience survey and fail silently.
Check the inspector before assuming a rule is live.

**Padding is not where the space goes.** Measured on a fielded question at 375x812, the
control sat 291px down the screen. Trimming every padding that could safely be trimmed
moved it up 12px; the italic instruction paragraph alone was 160px. Shrinking the
instructions and dropping one `<br>` moved it to 198px. Note that `line-height` must be
set on a **block** element — on an inline `<i>` it computes correctly but changes
nothing, because the line box is governed by the containing block's strut:

```html
What is your occupation?<br>
<div style="font-size:75%; line-height:1.2; font-style:italic">Please enter your job title…</div>
```

**Two things not to shrink.** `.ts-control` carries 8px of vertical padding and the
NEXT button 14px; both are tap targets. The control is already 36px tall, below the
44px Apple's HIG and WCAG 2.5.5 call for. `.plug-container` sits *below* the control,
so trimming it does not help dropdown room.

### Running several versions in ONE survey: `fieldPrefix`

Every version writes the same `__js_occupation_*` embedded-data field names, so two
versions in one survey overwrite each other and you record one answer instead of two.
Pass a prefix in the question stub:

```js
window.occupationWidget.matches.init(this, { fieldPrefix: "matches_" });
```

Fields become `__js_matches_occupation_noc_code` and so on, and the prefix applies to
the `sessionStorage` key too, so one question cannot pre-fill another. **Add each
prefixed name to the Survey Flow.** Leave it out entirely on a single-version survey.

Verified with all five versions on one page: 18 fields across five namespaces, no
collisions, and every field blank after clearing.

### If the dropdown never appears

Each version needs **its own data file** in `Look & Feel → Header`; they define
different globals and one cannot substitute for another. If the data file is missing,
the widget waits 15 seconds and then logs, for example:

```
[occupation-matches] dependencies never loaded after 15s.
Missing: window.nocMatches (add this version's data file to Look & Feel -> Header)
```

Check the browser console first — that message names the exact fix.

### The dropdown stays closed until typing

Tom Select opens the full option list on focus by default, so clicking an empty box
showed an arbitrary first entry — "Legislators" for the category-based versions, being
the lowest NOC code — before the respondent had expressed any intent. `openOnFocus` is
therefore `false`, and an `onType` handler closes the list again if they delete back to
an empty box.

Verified across all five versions: focusing an empty box leaves the dropdown
`display: none` at zero height, typing opens it with the expected matches, deleting the
text closes it, and re-focusing after a selection does not reopen it.

### The Clear button

Qualtrics themes reset `<button>` to `border: 0`, `padding: 0` and a transparent
background, so an unstyled Clear renders as bare text — measured at 31x16px on a
fielded survey. It does not read as clickable, and 16px is far under the 44px tap
target Apple's HIG and WCAG 2.5.5 both ask for.

The widget now adds an `occ-clear` class to whichever button it wires up and injects
the styling itself, so nothing needs editing in the question HTML or repeating across
language translations. Measured after the change: **63x40px on desktop, 71x44px on
mobile**, right-aligned so its right edge lines up with the input's, with hover, active
and keyboard-focus states, and the clear behaviour unchanged.

Right alignment uses `display:block; width:fit-content; margin-left:auto` rather than a
float, so nothing needs clearing afterwards. The `min-height` is what holds the tap
target at 40/44px, so the padding can be tuned without dropping below it.

The palette assumes a light survey theme (white fill, dark text, grey border). On a
dark theme, override `.occ-clear` in Custom CSS — anything there wins, since the
injected block is a plain stylesheet rather than inline styles.

### Placeholder text

The greyed-out prompt inside the box is language-aware and set in the stub:

```js
window.occupationWidget.matches.init(this, {
  placeholder: { EN: "Enter your job title", FR: "Entrez votre titre d'emploi" }
});
```

Omit it for the version's default, or pass `{ EN: "", FR: "" }` for none. The
`categories` version defaults to "Search occupation categories" instead, because
typing a job title there matches nothing by design.

### Single-language surveys: `forceLang`

Language detection only ever recognises French; anything it cannot positively identify
as French becomes English. The widget cannot see which languages the survey offers, so
it cannot fall back to "whichever language remains".

That is fine on a bilingual survey and correct on an English-only one. On a
**French-only** survey it works only if Qualtrics exposes `Q_Language=FR` or
`<html lang="fr">`; if neither is present the widget renders in **English** and records
`__js_occupation_lang` as `EN`, silently. Remove the guesswork:

```js
window.occupationWidget.matches.init(this, { forceLang: "FR" });
```

Verified: with no override and no language signals the widget resolves to English;
`"FR"` renders French regardless; `"EN"` holds English even with a stray
`<html lang="fr">`. Auto-detection handles `fr`, `FR`, `fr-CA`, `FR-CA` and `fr_CA`.

### Relevance ranking

Tom Select's built-in score is effectively `constant / field length`. It matches each
query token independently anywhere in a category's concatenated keyword blob, never
checks whether the words appear together, and normalises by field length. Two
consequences:

- `nurse` matches `Nursery`, because matching is substring-based rather than word-based.
- A category literally containing the title **Head nurse** was outranked by one
  containing only *Head grower* and *Nursery manager*, purely because its keyword list
  was longer.

Measured with Tom Select's own scorer for the query `head nurse`:

| Category | Keyword chars | Score | Contains "head nurse"? |
|---|---|---|---|
| Managers in horticulture | 397 | 0.00567 | no |
| Nursing coordinators and supervisors | 799 | 0.00282 | **yes** |
| Contractors and supervisors, landscaping… | 1,339 | 0.00168 | no |

Score × keyword length is 2.251, 2.253 and 2.250 — identical. Match quality contributed
nothing; length alone decided the order.

This version now applies a tiered `score` callback. Highest tier first:

1. whole phrase, as whole words, in the category name
2. whole phrase, as whole words, in one occupation title
3. whole phrase as a substring of a title (`nurse` inside `Nursery`)
4. every token as a whole word within a single title
5. every token as a whole word anywhere in the category
6. matched only as scattered substrings

The base score is added within a tier as a tie-breaker. Whole-word matching allows a
trailing plural `s`/`es`, so `teacher` matches `teachers`; without that it matched
`teacher assistants` but not `teachers`, promoting the wrong category. Restricting the
suffix to `s`/`es` is what keeps `nurse` from matching `nursery`.

**It reorders results; it never changes which categories match.** Verified across 748
queries drawn from real occupation titles: zero differences in the matched set. The top
result changed for 20% of them, and a hand-checked sample were all corrections:

| Query | Was | Now |
|---|---|---|
| `head nurse` | Managers in horticulture | Nursing coordinators and supervisors |
| `aerospace engineer` | Engineering managers | Aerospace engineers |
| `occupational physician` | Registered nurses | Specialists in clinical and laboratory medicine |
| `community health nurse` | Senior managers – health, education… | Registered nurses |
| `public relations manager` | Managers in social, community and correctional services | Advertising, marketing and PR managers |

Cost is roughly 0.7 ms per search over the 516 categories.

### Matching ignores accents and case

Respondents will not type `Électricien`. Titles are folded through
`normalize("NFD")` with combining marks stripped, so `electricien` finds
*Électricien/électricienne*. The fold is precomputed once at load for all ~28,000
titles, so each search is a plain substring scan.

### Ranking of the named titles

A title whose match starts at position 0 beats one where the match starts a later
word, which beats a mid-word match; ties break on shorter title, then alphabetically.
So `nurse` reports *Nurse, Nurse aide* rather than an arbitrary pair.

---

## Verification performed

Tested in a browser harness against the real Tom Select build, both languages:

- Summary reports the expected pair for `nurse`, `plumber`, `head nurse`, and the
  "no matching examples" state for nonsense input.
- Per-row hints name the correct titles per category and update in step with the
  query, confirmed after fixing the render-order bug above.
- `electricien` and `électricien` return identical results.
- Selection writes the same three fields as tomselect; the summary clears on
  selection, blur, and Clear.
- No console errors.

Not yet tested inside Qualtrics itself.
