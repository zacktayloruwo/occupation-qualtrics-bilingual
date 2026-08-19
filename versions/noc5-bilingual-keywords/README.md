# noc5-bilingual-keywords

**Status:** Ready to test
**NOC level:** 5-digit unit group (516 categories, reported not selected)
**Languages:** EN + FR
**UI:** Tom Select single-select, occupation titles only

Only the illustrative occupation titles appear in the dropdown — 27,941 in English,
29,767 in French — listed alphabetically. NOC **category names are not selectable**.
A respondent picks a concrete job title and the widget reports the category it rolls
up to. Typing "Registered nurses and registered psychiatric nurses" returns nothing.

This is the mirror image of [`noc5-bilingual-categories`](../noc5-bilingual-categories/),
and together with [`noc5-bilingual-longlist`](../noc5-bilingual-longlist/) and
[`noc5-bilingual-tomselect`](../noc5-bilingual-tomselect/) the four versions cover
every combination of what is shown and what is searched.

| Version | Rows shown (EN) | Searchable | Ordering |
|---|---|---|---|
| tomselect | 516 categories | categories + hidden titles | relevance |
| categories | 516 categories | categories only | alphabetical |
| keywords | 27,941 titles | titles only | alphabetical |
| longlist | 28,457 both | both | alphabetical |

The row counts reconcile: the longlist's 158 matches for `nurse` are exactly the
categories version's 5 plus this version's 153.

---

## Data prep

Run `noc_process_keywords.R` from anywhere inside the project. It reads the shared
CSVs in `data-raw/` and writes `noc2021_bilingual_keywords.js` into this folder.

Output shape — 4.0 MB, about 540 KB gzipped, which is what jsDelivr actually serves:

```js
window.nocKeywords = {
  categories: { "31300": { EN: "Nursing coordinators…", FR: "Coordonnateurs…" }, … },
  EN: [ { code: "31300", label: "Head nurse" }, … ],  // alphabetical
  FR: [ … ]
};
```

Category names are held in a lookup rather than repeated on every row, and are used
only to report the rolled-up category — never rendered as a selectable option.

Note that two French titles are identical to their own category name
(`Commis des services du personnel`, `Commis à la saisie de données`). They are kept
here, since they are legitimate illustrative titles; the longlist version dedupes them
against the category rows. This is why the FR title count is 29,767 here but 29,765
titles in the longlist.

---

## Embedded data

| Survey Flow field name | Contents |
|---|---|
| `__js_occupation_noc_code` | 5-digit NOC 2021 category code |
| `__js_occupation_category_name` | Category the chosen title rolls up to |
| `__js_occupation_selected_label` | The exact title the respondent chose |
| `__js_occupation_lang` | `EN` or `FR`, language at the time of the pick |

There is no `selected_type` field as there is in the longlist version — every pick
here is a title by construction.

---

## Installation

Identical to the tomselect version except for the header scripts and the question
JavaScript. See that version's README for the Qualtrics steps in full.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@COMMIT-SHA/versions/noc5-bilingual-keywords/noc2021_bilingual_keywords.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

Question JavaScript: paste `occupation_keywords.js`.

---

## Behaviour notes

### Alphabetical ordering is enforced against Tom Select

Tom Select ignores `sortField` whenever a search query is active and always orders
matches by relevance. The `score` callback flattens the score so every match scores 1
and ties break on insertion order, which the R script has already alphabetised.
Removing it silently reverts the dropdown to relevance ordering.

### Broad queries exceed the render cap

`MAX_OPTIONS` is 200. Because matches are alphabetical rather than relevance-ranked,
a broad query overflows it: `manager` matches roughly 1,200 titles in English, so the
list starts at `Abattoir manager` and the respondent must type something more
specific. If this proves a problem in testing, either raise `MAX_OPTIONS` or float
prefix matches ahead of the rest and alphabetise within each group.

### Language switching cannot translate a title

The EN and FR title lists are not parallel-indexed, so a title picked in one language
has no counterpart in the other. Unlike the longlist version there is no category row
to fall back to, because categories are not in this list at all. The widget therefore
injects the original title as a one-off option and displays it unchanged.

A respondent who picks *Head nurse* in English and switches to French continues to see
*Head nurse* on screen, in English, and the stored data is untouched. The alternative
would be an apparently empty control, which reads as a lost answer. Re-selecting in
the new language overwrites all four fields.

Within the same language the exact row is restored, unchanged.

---

## Verification performed

Tested in a browser harness against the real Tom Select build:

- 27,941 EN / 29,767 FR rows load; Tom Select init ~38 ms.
- `nurse` returns 153 matches, alphabetical, no category names among them.
- Searching a full category name returns 0 matches, confirming categories are absent.
- Picking a title writes code, rolled-up category name, the exact label, and language.
- Clear empties all four fields.
- EN title pick → switch to FR → the English title is still displayed and the stored
  answer is preserved.
- No console errors.

Not yet tested inside Qualtrics itself.
