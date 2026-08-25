# noc5-bilingual-matches

**Status:** Ready to test
**NOC level:** 5-digit unit group (~516 categories)
**Languages:** EN + FR
**UI:** Tom Select single-select with visible match feedback

Shows the same 516 category names as
[`noc5-bilingual-tomselect`](../noc5-bilingual-tomselect/), searches the same occupation
titles, and writes the same three embedded-data fields. The data file is byte-identical
apart from the global variable name.

Both versions use the same tiered relevance ranking, so comparing them isolates the
feedback rather than confounding it with a scoring difference — verified across 396
queries with zero ordering differences. See
[Relevance ranking](../noc5-bilingual-tomselect/README.md#relevance-ranking-changed)
for what that ranking does and why it replaced Tom Select's stock scoring.

The one difference: it **shows the respondent which occupation titles matched**,
instead of matching against them invisibly.

---

## Installing in Qualtrics

The widget code is loaded once from the survey header; each question carries only a
short stub. See [Installation](../../README.md#installation) in the root README for the
full walkthrough, including the Survey Flow fields.

**1 — Look & Feel → Header.** Paste as-is; these URLs are live and pinned.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-matches/noc2021_bilingual_matches.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-matches/occupation_matches.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

**2 — Question HTML** (in every language translation):

```html
<select></select>
<button type="button">Clear</button>
```

**3 — Question JavaScript.** This is the whole thing:

```js
Qualtrics.SurveyEngine.addOnload(function () {
  window.occupationWidget.matches.init(this, {
    fieldPrefix: "",          // e.g. "matches_" if several versions share one survey
    forceLang:   null,        // "EN" or "FR" on a single-language survey
    showSummary: true,       // the line above the box
    showHints:   true,       // the per-row matched titles
    maxSummary:  2,
    maxHints:    2,
  });
});
```

Every option defaults to the value it had as a constant, so an empty `{}` behaves
exactly as before. `placeholder: { EN: "...", FR: "..." }` overrides the prompt text,
and `depsTimeoutMs` the 15-second dependency deadline.

> **Prefer to paste?** The whole widget file still works in the question editor —
> paste its contents and append the same stub underneath. There is only one copy of
> the logic either way. Hosting is recommended because updating five versions across
> several questions by re-pasting is where stale scripts creep in.

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

## Two feedback mechanisms

Both are on by default and each can be switched off at the top of
`occupation_matches.js`.

**`SHOW_SUMMARY`** — a line above the box naming the closest matching titles overall:

> Closest examples: **Head nurse**, **Assistant head nurse**

This answers *"did it understand what I typed?"*. When nothing matches it says so
("No matching occupation examples"), which is useful negative feedback the fielded
version never gives.

**`SHOW_HINTS`** — a muted second line on each dropdown row naming the titles from
*that* category which matched. This answers *"why is this row here, and does it cover
my job?"*.

The summary alone was the original proposal, and it is worth keeping, but it can only
describe the single best match across the whole list. The per-row hints are what make
a list of similar-sounding categories decidable, because the question a respondent
actually has to answer is per-row. Recommend fielding with both; drop `SHOW_SUMMARY`
first if the layout is too tall on mobile.

---

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

iOS Safari zooms in whenever a respondent taps the box, because Tom Select's input is
13px and Safari force-zooms anything under 16px. That and the vertical-space CSS are
survey-wide rather than version-specific — see
[Mobile layout and the iOS zoom](../../README.md#mobile-layout-and-the-ios-zoom) in the
root README.

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
