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

Everything needed is on this page.

### 1. Look & Feel → Header

Paste as-is. These URLs are live and pinned to commit `5e420b1`.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@5e420b183bda469f84cf9d9bdb8a50049422d594/versions/noc5-bilingual-keywords/noc2021_bilingual_keywords.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@5e420b183bda469f84cf9d9bdb8a50049422d594/versions/noc5-bilingual-keywords/occupation_keywords.js"></script>
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
  window.occupationWidget.keywords.init(this, {
    fieldPrefix: "",          // e.g. "keywords_" if several versions share one survey
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

Pasting still works: paste the full contents of `occupation_keywords.js` into the question editor and
append the same `addOnload` stub underneath. There is one copy of the logic either way.
Hosting is recommended because re-pasting across several questions is where stale
scripts creep in — a missed paste leaves a silently stale question that is hard to
distinguish from a caching problem.

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

### English-only data build

French accounts for roughly 60% of the bilingual data file, and an English-only survey
downloads all of it for nothing. `noc2021_en_keywords.js` is a drop-in replacement in the
header — same global name, same structure, French dropped:

| File | Over the wire (gzip) |
|---|---|
| `noc2021_bilingual_keywords.js` | 603 KB |
| `noc2021_en_keywords.js` | **265 KB** |

Swap the data `<script>` in step 1; **nothing else changes**.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@5e420b183bda469f84cf9d9bdb8a50049422d594/versions/noc5-bilingual-keywords/noc2021_en_keywords.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@5e420b183bda469f84cf9d9bdb8a50049422d594/versions/noc5-bilingual-keywords/occupation_keywords.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```
 The widget file, the
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
