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

Everything needed is on this page.

### 1. Look & Feel → Header

Paste as-is. These URLs are live and pinned to commit `22a379d`.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-longlist/noc2021_bilingual_longlist.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-longlist/occupation_longlist.js"></script>
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
- `__js_occupation_selected_label`
- `__js_occupation_selected_type`
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
  window.occupationWidget.longlist.init(this, {
    fieldPrefix: "",          // e.g. "longlist_" if several versions share one survey
    forceLang:   null,        // "EN" or "FR" on a single-language survey
    maxOptions:  200,
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
| `maxOptions` | matches rendered at once | `200` |

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

Pasting still works: paste the full contents of `occupation_longlist.js` into the question editor and
append the same `addOnload` stub underneath. There is one copy of the logic either way.
Hosting is recommended because re-pasting across several questions is where stale
scripts creep in — a missed paste leaves a silently stale question that is hard to
distinguish from a caching problem.

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
