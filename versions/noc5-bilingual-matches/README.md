# noc5-bilingual-matches

**Status:** Ready to test
**NOC level:** 5-digit unit group (~516 categories)
**Languages:** EN + FR
**UI:** Tom Select single-select with visible match feedback

Behaviourally identical to [`noc5-bilingual-tomselect`](../noc5-bilingual-tomselect/) —
the same 516 category names are the only selectable rows, the same occupation titles
are searched, matches are ordered by the same relevance score, and the same three
embedded-data fields are written. The data file is byte-identical apart from the
global variable name.

The one difference: it **shows the respondent which occupation titles matched**,
instead of matching against them invisibly.

---

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

## Installation

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@COMMIT-SHA/versions/noc5-bilingual-matches/noc2021_bilingual_matches.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

Question JavaScript: paste `occupation_matches.js`. The question body HTML and the
Survey Flow fields are **unchanged from tomselect** — the feedback element and its
CSS are created by the script, so nothing needs editing in the Qualtrics editor.

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

### Single-language surveys: set `FORCE_LANG`

Language detection only ever recognises French; anything it cannot positively
identify as French becomes English. The widget has no way to see which languages
the survey actually offers, so it cannot fall back to "whichever language remains".

On a bilingual survey this is fine. On a survey offering only ONE language, and
therefore having no language selector:

- **English-only** works correctly, because English is the fallback.
- **French-only** works only if Qualtrics exposes `Q_Language=FR` in the URL or
  `<html lang="fr">`. If neither is present the widget renders in **English** and
  records `__js_occupation_lang` as `EN`, silently.

Set `FORCE_LANG` at the top of the widget script to remove the guesswork:

```js
var FORCE_LANG = "FR";   // or "EN"; null means auto-detect
```

Verified: with `FORCE_LANG` unset and no language signals present, the widget resolves
to English; set to `"FR"` it renders French regardless; set to `"EN"` it stays English
even when `<html lang="fr">` is present. Auto-detection handles `fr`, `FR`, `fr-CA`,
`FR-CA` and `fr_CA`.

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
