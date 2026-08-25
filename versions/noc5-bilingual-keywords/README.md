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

## Installing in Qualtrics

The widget code is loaded once from the survey header; each question carries only a
short stub. See [Installation](../../README.md#installation) in the root README for the
full walkthrough, including the Survey Flow fields.

**1 — Look & Feel → Header.** Paste as-is; these URLs are live and pinned.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-keywords/noc2021_bilingual_keywords.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-keywords/occupation_keywords.js"></script>
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
  window.occupationWidget.keywords.init(this, {
    fieldPrefix: "",          // e.g. "keywords_" if several versions share one survey
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
window.occupationWidget.keywords.init(this, { fieldPrefix: "matches_" });
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
window.occupationWidget.keywords.init(this, {
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
window.occupationWidget.keywords.init(this, { forceLang: "FR" });
```

Verified: with no override and no language signals the widget resolves to English;
`"FR"` renders French regardless; `"EN"` holds English even with a stray
`<html lang="fr">`. Auto-detection handles `fr`, `FR`, `fr-CA`, `FR-CA` and `fr_CA`.

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
