---

editor_options: 
  markdown: 
    wrap: 72
---

# noc5-bilingual-tomselect

Bilingual Occupation Selector for Qualtrics

**Status:** In production
**NOC level:** 5-digit unit group (~500 categories)
**Languages:** EN + FR
**UI:** Tom Select single-select

Zack Taylor, University of Western Ontario, zack.taylor\@uwo.ca

August 19, 2026

A bilingual (English/French) occupation search widget for Qualtrics surveys, programmed in JS. Respondents type to search for their occupation and select from a dropdown. The widget stores the National Occupational Classification (NOC) 2021 code and category name as embedded data.

The widget is currently functional at <https://uwo.eu.qualtrics.com/jfe/form/SV_esdkA30l2ejov1Y>.

------------------------------------------------------------------------

## Installing in Qualtrics

The widget code is loaded once from the survey header; each question carries only a
short stub. See [Installation](../../README.md#installation) in the root README for the
full walkthrough, including the Survey Flow fields.

**1 — Look & Feel → Header.** Paste as-is; these URLs are live and pinned.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-tomselect/noc2021_bilingual.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@d2db22efd0e81275f34f08fd8f7babf8feef23cd/versions/noc5-bilingual-tomselect/occupation_selectize.js"></script>
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
  window.occupationWidget.tomselect.init(this, {
    fieldPrefix: "",          // e.g. "tomselect_" if several versions share one survey
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

## How It Works

### Data source

`noc2021_bilingual.js` defines a `window.categories` array containing all \~500 NOC 2021 5-digit occupational categories. Each entry has:

- `category_code` — 5-digit NOC 2021 code (e.g., `"31301"`)
- `category_EN` — English category name (e.g., `"Registered nurses and registered psychiatric nurses"`)
- `category_FR` — French category name
- `occupations_EN` — array of illustrative English occupation titles (e.g., `["Nurse", "Head nurse", ...]`)
- `occupations_FR` — array of illustrative French occupation titles

Note: The EN and FR occupation-example lists inside each category are *not indexed in parallel*, so individual occupation example titles can't be reliably matched across languages. Using `category_code` as the value field gives a stable, language-independent identifier.

The data were retrieved from: <https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593>. The `noc2021_bilingual.js` file is created by the R script `noc_process.R` in this folder, which reads and processes `noc_2021_version_1.0_-_elements.csv`, `noc_2021_version_1.0_-_elements-additional.csv`, and `cnp_2021_version_1.0_-_elements.csv` from the shared `data-raw/` directory at the project root. Run it from anywhere inside the project — paths resolve via `here::here()`. It writes `noc2021_bilingual.js` back into this folder. The output contains a JSON object.

### Search behaviour

The widget uses [Tom Select](https://tom-select.js.org/) to provide a searchable dropdown. Tom Select offers the same functionality as Selectize but without a jQuery dependency. Each option in the dropdown represents one NOC category. Respondents can search by:

- **Category name** — e.g., typing "registered nurse"
- **Individual occupation titles** — e.g., typing "head nurse" or "infirmier" will surface the matching category, even though only the category name is displayed

The individual occupation titles are loaded into a hidden `keywords` field on each option. Tom Select searches across both `label` (the category name) and `keywords` (the occupation examples) but only displays the category name in the dropdown.

### Language switching

Qualtrics fully re-renders the question when the respondent switches language, firing `addOnload` again from scratch. To preserve the selection across this re-render:

1.  When a respondent makes a selection, the category code is saved to `sessionStorage` (in addition to Qualtrics embedded data).
2.  On each `addOnload`, the widget checks `sessionStorage` for a previously saved code and silently restores it in the new language.
3.  Because the category code is the same in both languages, the correct option is found in the new language's option list and its translated label is displayed.

### Embedded data

Values are written immediately when the respondent makes or changes a selection (not at page submit). If the respondent changes their answer, the previous values are overwritten. The clear button writes empty strings.

| Survey Flow field name | Contents |
|------------------------------------|------------------------------------|
| `__js_occupation_noc_code` | 5-digit NOC 2021 category code |
| `__js_occupation_category_name` | Category name in the language used at time of selection |
| `__js_occupation_lang` | `EN` or `FR` |

> **Note:** Qualtrics automatically prefixes fields set by `setJSEmbeddedData` with `__js_`. The field names above are how they must be defined in the Survey Flow and referenced in piped text (e.g., `${e://Field/__js_occupation_noc_code}`).

------------------------------------------------------------------------

## Troubleshooting

**Dropdown does not appear**

- Open the browser console (F12) and check for errors.

- Confirm the CDN URLs in the header return HTTP 200 in the Network tab.

- Confirm the `<select>` element is present in the question HTML for the active language.

**"Can't create duplicate variable: categories"**

- The first line of `noc2021_bilingual.js` must be `window.categories = window.categories || [` — not `let categories = [`. Check the file on GitHub.

**Embedded data fields are blank**

- Confirm the Survey Flow fields are named with the `__js_` prefix.

- Confirm `setJSEmbeddedData` is available in your Qualtrics instance (requires the New Survey Taking Experience).

**Old version of script keeps running after edits**

- Qualtrics caches compiled survey JavaScript. The most reliable fix is to duplicate the survey, paste the new script into the copy, and test from there.

**Selection disappears after language switch**

- Confirm the HTML of the French translation of the question body contains the `<select></select>` element.

- Confirm you are using the current version of `occupation_selectize.js`, which uses `sessionStorage` to persist the selection across language re-renders.

**Pulldown is cut off on mobile, or the browser zooms in when the box is tapped**

- See [Mobile layout and the iOS zoom](../../README.md#mobile-layout-and-the-ios-zoom)
  in the root README for the current CSS and the measurements behind it.

- Two things worth knowing before you start trimming padding. First, iOS Safari
  force-zooms any input smaller than 16px and never zooms back out; Tom Select ships
  its input at 13px, so the fix is a font-size rule, not a viewport meta tag —
  `user-scalable=no` has been ignored since iOS 10 and breaks pinch-zoom for anyone
  who needs it. Second, padding is not where the space goes: on a measured question
  trimming every safe padding moved the control up 12px, while shrinking the
  instruction text moved it 65px.

- The CSS previously published here targeted `.QuestionOuter`, `.QuestionBody`,
  `.SkinInner` and `.QuestionText`. Those are **classic-skin** selectors and match
  nothing on a New Survey Taking Experience survey, where the equivalents are
  `.question-display` and `.question-error-wrapper`. If your survey uses the classic
  skin the old names still apply — check the inspector rather than assuming.

---

### Running several versions in ONE survey: `fieldPrefix`

Every version writes the same `__js_occupation_*` embedded-data field names, so two
versions in one survey overwrite each other and you record one answer instead of two.
Pass a prefix in the question stub:

```js
window.occupationWidget.tomselect.init(this, { fieldPrefix: "matches_" });
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

### Relevance ranking (changed)

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
window.occupationWidget.tomselect.init(this, {
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
window.occupationWidget.tomselect.init(this, { forceLang: "FR" });
```

Verified: with no override and no language signals the widget resolves to English;
`"FR"` renders French regardless; `"EN"` holds English even with a stray
`<html lang="fr">`. Auto-detection handles `fr`, `FR`, `fr-CA`, `FR-CA` and `fr_CA`.

