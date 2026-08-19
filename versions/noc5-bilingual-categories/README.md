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

## Installation

Identical to the tomselect version except for the header scripts and the question
JavaScript. See that version's README for the Qualtrics steps in full.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@COMMIT-SHA/versions/noc5-bilingual-categories/noc2021_bilingual_categories.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

Question JavaScript: paste `occupation_categories.js`.

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
