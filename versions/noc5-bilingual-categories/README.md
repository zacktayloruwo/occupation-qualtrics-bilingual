# noc5-bilingual-categories

**Status:** Ready to test
**NOC level:** 5-digit unit group (516 categories)
**Languages:** EN + FR
**UI:** Tom Select single-select, category names only

Only the 516 NOC 2021 category names appear in the dropdown, listed alphabetically,
and **only those names are searchable**. The illustrative occupation titles are not
in the data file at all, so a respondent typing "head nurse" gets no results.

This is the deliberate contrast with [`noc5-bilingual-tomselect`](../noc5-bilingual-tomselect/),
which displays the same 516 names but silently searches the ~28,000 occupation titles
behind them. Here, what you see is exactly what is searched.

| | tomselect | categories |
|---|---|---|
| Visible rows | 516 | 516 |
| Searchable text | category names + hidden titles | category names only |
| Match ordering | relevance | alphabetical |
| Matches for `nurse` (EN) | 15 | 5 |

---

## Installing in Qualtrics

The widget code is loaded once from the survey header; each question carries only a
short stub. See [Installation](../../README.md#installation) in the root README for the
full walkthrough, including the Survey Flow fields.

**1 — Look & Feel → Header.** Paste as-is; these URLs are live and pinned.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-categories/noc2021_bilingual_categories.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-categories/occupation_categories.js"></script>
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
  window.occupationWidget.categories.init(this, {
    fieldPrefix: "",          // e.g. "categories_" if several versions share one survey
    forceLang:   null,        // "EN" or "FR" on a single-language survey
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

## Data prep

Run `noc_process_categories.R` from anywhere inside the project. It reads the shared
CSVs in `data-raw/` and writes `noc2021_bilingual_categories.js` into this folder.

Output shape — 84 KB, by far the smallest of the four versions:

```js
window.nocCategories = {
  EN: [ { code: "10010", label: "Financial managers" }, … ],  // alphabetical
  FR: [ … ]
};
```

Sort collation is pinned with `stri_rank(locale = "en"/"fr")` so the build is
reproducible regardless of the machine's `LC_COLLATE`.

---

## Embedded data

| Survey Flow field name | Contents |
|---|---|
| `__js_occupation_noc_code` | 5-digit NOC 2021 category code |
| `__js_occupation_category_name` | Category name in the language active at selection |
| `__js_occupation_lang` | `EN` or `FR` |

Same three fields as the tomselect version, so the two are directly comparable in
the response data.

---

---

## Behaviour notes

### Alphabetical ordering is enforced against Tom Select

Tom Select ignores `sortField` whenever a search query is active and always orders
matches by relevance. The `score` callback in `occupation_categories.js` flattens the
score so every match scores 1 and ties break on insertion order, which the R script
has already alphabetised. Removing that callback silently reverts the dropdown to
relevance ordering.

### No render cap needed

`maxOptions` is `null`. With only 516 rows the whole list can be shown without a
performance concern, unlike the longlist and keywords versions.

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
window.occupationWidget.categories.init(this, { fieldPrefix: "matches_" });
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
window.occupationWidget.categories.init(this, {
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
window.occupationWidget.categories.init(this, { forceLang: "FR" });
```

Verified: with no override and no language signals the widget resolves to English;
`"FR"` renders French regardless; `"EN"` holds English even with a stray
`<html lang="fr">`. Auto-detection handles `fr`, `FR`, `fr-CA`, `FR-CA` and `fr_CA`.

### Language switching is lossless

The category code is language-independent and every category has both an English and
a French name, so a selection always survives a language switch and simply redisplays
under its translated name. This is the only one of the four versions with no
cross-language caveat.

---

## Verification performed

Tested in a browser harness against the real Tom Select build:

- 516 rows load in each language; Tom Select init ~2 ms.
- `nurse` returns 5 matches, alphabetical, all of them genuine category names.
- Searching a full category name returns exactly 1 match.
- Selection and the Clear button write the expected fields.
- EN pick → switch to FR → redisplays the French category name, code unchanged.
- No console errors.

Not yet tested inside Qualtrics itself.
