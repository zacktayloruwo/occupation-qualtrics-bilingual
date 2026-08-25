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

## Header to paste into Qualtrics

**Look & Feel → Header**, copy this exactly. These URLs are live and pinned to commit
`492a26d` — paste them as-is, there is nothing to fill in.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-longlist/noc2021_bilingual_longlist.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

The question JavaScript is **not** loaded from a URL — open the widget file in this
folder and paste its full contents into the question's JavaScript editor.

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

## Installation

Identical to the tomselect version except for the header scripts and the question
JavaScript. See that version's README for the Qualtrics steps in full.

Header (**Look & Feel → Header**):

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-longlist/noc2021_bilingual_longlist.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

Question JavaScript: paste `occupation_longlist.js`.

Add the five embedded data fields above to the Survey Flow, and put
`<select></select>` in the question body for **every** language translation.

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
