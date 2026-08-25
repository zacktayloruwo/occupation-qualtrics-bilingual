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

Everything needed is on this page.

### 1. Look & Feel → Header

Paste as-is. These URLs are live and pinned to commit `22a379d`.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-tomselect/noc2021_bilingual.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-tomselect/occupation_selectize.js"></script>
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
  window.occupationWidget.tomselect.init(this, {
    fieldPrefix: "",          // e.g. "tomselect_" if several versions share one survey
    forceLang:   null,        // "EN" or "FR" on a single-language survey
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

Pasting still works: paste the full contents of `occupation_selectize.js` into the question editor and
append the same `addOnload` stub underneath. There is one copy of the logic either way.
Hosting is recommended because re-pasting across several questions is where stale
scripts creep in — a missed paste leaves a silently stale question that is hard to
distinguish from a caching problem.

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

### English-only data build

French accounts for roughly 60% of the bilingual data file, and an English-only survey
downloads all of it for nothing. `noc2021_en.js` is a drop-in replacement in the
header — same global name, same structure, French dropped:

| File | Over the wire (gzip) |
|---|---|
| `noc2021_bilingual.js` | 466 KB |
| `noc2021_en.js` | **185 KB** |

Swap the data `<script>` in step 1; **nothing else changes**. The widget file, the
question stub and the embedded data are all identical.

Both files come from the same prep script, so they cannot drift.

> **Only for surveys that will never offer French.** The widget falls back to the
> English fields when a French one is absent, so nothing breaks if French is somehow
> selected — but the respondent would see English occupation names under French
> interface text. Pair this with `forceLang: "EN"`. If French is a possibility, keep the
> bilingual file.

Verified against the English-only build: all five versions return the same match
counts as the bilingual file (15 / 5 / 153 / 158 / 15 for "nurse"), with the same
embedded data and, for this version, the same per-row examples.

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

