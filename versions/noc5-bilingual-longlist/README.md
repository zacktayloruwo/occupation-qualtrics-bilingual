# noc5-bilingual-longlist

**Status:** Ready to test
**NOC level:** 5-digit unit group (~516 categories)
**Languages:** EN + FR
**UI:** Tom Select single-select, flat long list

Every NOC 2021 category name **and** every illustrative occupation title appears as
its own separate row in the dropdown, listed alphabetically. A respondent who types
"nurse" sees `Bedside nurse`, `Head nurse`, `Nurse practitioner` … as individual
selectable entries, rather than the handful of category names those titles roll up to.

Contrast with [`noc5-bilingual-tomselect`](../noc5-bilingual-tomselect/), where the
~516 category names are the only visible rows and the occupation titles are hidden
search keywords. Both versions resolve to the same NOC codes.

| | tomselect | longlist |
|---|---|---|
| Visible rows (EN) | 516 | 28,457 |
| Visible rows (FR) | 516 | 30,281 |
| Titles are | hidden keywords | selectable rows |
| Match ordering | relevance | alphabetical |

---

## Installing in Qualtrics

The widget code is loaded once from the survey header; each question carries only a
short stub. See [Installation](../../README.md#installation) in the root README for the
full walkthrough, including the Survey Flow fields.

**1 — Look & Feel → Header.** Paste as-is; these URLs are live and pinned.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-longlist/noc2021_bilingual_longlist.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-longlist/occupation_longlist.js"></script>
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
  window.occupationWidget.longlist.init(this, {
    fieldPrefix: "",          // e.g. "longlist_" if several versions share one survey
    forceLang:   null,        // "EN" or "FR" on a single-language survey
    maxOptions:  200,        // matches rendered at once
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

Run `noc_process_longlist.R` from anywhere inside the project. It reads the shared
CSVs in `data-raw/` and writes `noc2021_bilingual_longlist.js` into this folder.

The cleaning steps (label filter, sentence case, quote normalisation, zero-padded
codes) are identical to the tomselect version, so the two agree on codes and wording.
Sort collation is pinned with `stri_rank(locale = "en"/"fr")` so the build is
reproducible regardless of the machine's `LC_COLLATE`.

Output shape:

```js
window.nocLonglist = {
  categories: { "31300": { EN: "Nursing coordinators…", FR: "Coordonnateurs…" }, … },
  EN: [ { code: "31300", label: "Head nurse", type: "T" }, … ],  // alphabetical
  FR: [ … ]
};
```

`type` is `"C"` for a category name and `"T"` for an occupation title. Category names
are held in a separate lookup rather than repeated on all ~58,000 rows, which keeps
the file to 4.8 MB (about 640 KB gzipped, which is what jsDelivr actually serves).

---

## Embedded data

| Survey Flow field name | Contents |
|---|---|
| `__js_occupation_noc_code` | 5-digit NOC 2021 category code |
| `__js_occupation_category_name` | Category the pick rolls up to |
| `__js_occupation_selected_label` | The exact string the respondent chose |
| `__js_occupation_selected_type` | `category` or `title` |
| `__js_occupation_lang` | `EN` or `FR`, language at the time of the pick |

Picking the title *Head nurse* records code `31300`, category name
*Nursing coordinators and supervisors*, label *Head nurse*, type `title`.

---

---

## Behaviour notes

### Alphabetical ordering is enforced against Tom Select

Tom Select ignores `sortField` whenever a search query is active and always orders
matches by relevance score. The only reliable way to get alphabetical output is to
flatten the score so every match scores 1; ties then break on insertion order, and
rows were inserted in locale-correct alphabetical order by the R script. That is what
the `score` callback in `occupation_longlist.js` does — removing it silently reverts
the dropdown to relevance ordering.

### Broad queries exceed the render cap

`MAX_OPTIONS` is 200. Because matches are alphabetical rather than relevance-ranked,
a broad query can overflow it and the best match may not be visible:

| Query (EN) | Matching rows |
|---|---|
| `nurse` | 158 |
| `teacher` | 282 |
| `engineer` | 660 |
| `manager` | 1,195 |

Typing `manager` lists 200 rows starting at `Abattoir manager`. Respondents need to
type a more specific phrase. If this proves to be a problem in testing, the options
are to raise `MAX_OPTIONS`, or to sort matches that *begin with* the query ahead of
the rest and alphabetise within each group — a change to the `score` callback.

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
window.occupationWidget.longlist.init(this, { fieldPrefix: "matches_" });
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
window.occupationWidget.longlist.init(this, {
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
window.occupationWidget.longlist.init(this, { forceLang: "FR" });
```

Verified: with no override and no language signals the widget resolves to English;
`"FR"` renders French regardless; `"EN"` holds English even with a stray
`<html lang="fr">`. Auto-detection handles `fr`, `FR`, `fr-CA`, `FR-CA` and `fr_CA`.

### Language switching cannot translate a title

The EN and FR title lists are not parallel-indexed, so an individual occupation title
has no reliable translation. When a respondent switches language after answering, the
widget:

1. selects the **category** row for the saved code, so something sensible is displayed
   in the new language; and
2. leaves the stored answer untouched — `selected_label`, `selected_type` and `lang`
   still describe the original pick.

So a respondent who picks *Head nurse* in English and switches to French sees
*Coordonnateurs/coordonnatrices et superviseurs/superviseures des soins infirmiers*
on screen, while the data still records `Head nurse` / `title` / `EN`. Switching
language does not silently rewrite an answer, but the on-screen text will no longer
match what was stored. Re-selecting in the new language overwrites all five fields.

Within the same language the exact row is restored, unchanged.

---

## Verification performed

Tested in a browser harness against the real Tom Select build:

- All 28,457 EN / 30,281 FR rows load; Tom Select init ~12 ms, search ~5 ms.
- Rendered match order is byte-identical to the R-generated alphabetical order.
- Picking a title, picking a category, and the Clear button write the expected fields.
- EN title pick → switch to FR → falls back to the FR category name, stored answer preserved.
- No console errors.

Not yet tested inside Qualtrics itself.
