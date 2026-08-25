# Occupation Selectors for Qualtrics

Zack Taylor, University of Western Ontario, [zack.taylor\@uwo.ca](mailto:zack.taylor@uwo.ca){.email}

**Interactive demo: <https://zacktayloruwo.github.io/occupation-qualtrics-bilingual/>** Try all five versions side by side, in English or French, without installing anything.

A collection of JavaScript occupation-search widgets for Qualtrics surveys, built on the National Occupational Classification (NOC) 2021. Each **version** is a self-contained variant of the selector — a different aggregation level, interaction style, or language configuration — living in its own subfolder under `versions/`.

------------------------------------------------------------------------

## Repository layout

```         
data-raw/                 Shared NOC 2021 source files (see below). Never edited by hand.
index.html                Public demo page, served by GitHub Pages
demo/widget.html          Per-version frame used by the demo (stands in for the Qualtrics engine)
versions/
  <version-name>/         One self-contained selector variant:
    README.md               Installation + behaviour notes for this version
    *.R                     Data-prep script (reads data-raw/, writes this folder)
    <data>.js               Generated data file, served to Qualtrics via jsDelivr
    <widget>.js             The Qualtrics question JavaScript
  _template/              Starting point for a new version
tools/                    Maintenance scripts (see Updating the pinned commit)
LICENSE
```

Each version owns its data-prep script outright. Versions do **not** import shared R helpers — they may diverge freely, and a change to one cannot break another. The only shared resource is the raw input data in `data-raw/`.

------------------------------------------------------------------------

## Versions

| Version | NOC level | Languages | UI | Status |
|----|----|----|----|----|
| [`noc5-bilingual-tomselect`](versions/noc5-bilingual-tomselect/) | 5-digit unit group (\~500) | EN + FR | Tom Select single-select | In production |
| [`noc5-bilingual-longlist`](versions/noc5-bilingual-longlist/) | 5-digit unit group (516) | EN + FR | Tom Select, flat alphabetical list of every category name and occupation title | Ready to test |
| [`noc5-bilingual-categories`](versions/noc5-bilingual-categories/) | 5-digit unit group (516) | EN + FR | Tom Select, category names only, alphabetical | Ready to test |
| [`noc5-bilingual-keywords`](versions/noc5-bilingual-keywords/) | 5-digit unit group (516) | EN + FR | Tom Select, occupation titles only, alphabetical | Ready to test |
| [`noc5-bilingual-matches`](versions/noc5-bilingual-matches/) | 5-digit unit group (516) | EN + FR | Tom Select, as tomselect but shows which occupation titles matched | Ready to test |

The five versions cover every combination of what is displayed and what is searched:

| Version | Rows shown (EN) | Searchable text | Match ordering |
|----|----|----|----|
| `noc5-bilingual-tomselect` | 516 category names | category names + hidden occupation titles | relevance |
| `noc5-bilingual-categories` | 516 category names | category names only | alphabetical |
| `noc5-bilingual-keywords` | 27,941 occupation titles | occupation titles only | alphabetical |
| `noc5-bilingual-longlist` | 28,457 of both | both | alphabetical |
| `noc5-bilingual-matches` | 516 category names | category names + occupation titles, **with the matched titles shown** | relevance |

All five resolve to the same 5-digit NOC codes, so responses are directly comparable.

------------------------------------------------------------------------

## Shared source data (`data-raw/`)

All versions are built from NOC 2021 Version 1.0, retrieved from the [Open Government Portal](https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593).

| File | Contents |
|----|----|
| `noc_2021_version_1.0_-_elements.csv` | English elements — category names and illustrative example titles |
| `noc_2021_version_1.0_-_elements-additional.csv` | Supplementary English examples |
| `cnp_2021_version_1.0_-_elements.csv` | French (CNP) elements |
| `12-583-x2021001-eng.pdf` | NOC 2021 classification manual (reference) |

A caution carried over from the original build: the EN and FR illustrative-example lists inside a category are **not indexed in parallel**, so individual example titles cannot be reliably matched across languages. Use `category_code` as the stable, language-independent identifier in any version.

------------------------------------------------------------------------

## Adding a new version

1.  Copy `versions/_template/` to `versions/<your-version-name>/`.
2.  Write the data-prep script. Read inputs from `data-raw/` via `here::here()` so it runs from anywhere in the project; write outputs into your own version folder.
3.  Write the widget JavaScript and fill in the version README.
4.  Add a row to the Versions table above.
5.  Commit, push, and derive the version's jsDelivr URL from the new commit SHA (see **CDN hosting** below).

------------------------------------------------------------------------

## Installation

The widget code and its data are loaded **once from the survey header**. Each question
carries only a short stub naming the version and its options. Nothing needs re-pasting
when a widget changes — you update one commit SHA in the header.

### 1. Header

**Look & Feel → Header.** Add the pair of files for each version you are fielding, plus
Tom Select once. For the `matches` version:

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-matches/noc2021_bilingual_matches.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-matches/occupation_matches.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

Every version needs **its own data file and its own widget file**; they define different
globals and cannot substitute for one another. Two versions in one survey means four
`<script>` tags plus Tom Select.

### 2. Survey Flow

Add an **Embedded Data** element **above the first block** — placement matters, because
any element between blocks disables the Back button on the block that follows. Declare
each field the version writes, including any `fieldPrefix`:

`__js_occupation_noc_code`, `__js_occupation_category_name`, `__js_occupation_lang`,
plus `__js_occupation_selected_label` (keywords, longlist, matches-optional) and
`__js_occupation_selected_type` (longlist).

### 3. Question HTML

In **every language translation**:

```html
<select></select>
<button type="button">Clear</button>
```

### 4. Question JavaScript

```js
Qualtrics.SurveyEngine.addOnload(function () {
  window.occupationWidget.matches.init(this, {
    fieldPrefix: "matches_",
    forceLang:   null
  });
});
```

`window.occupationWidget` exposes `tomselect`, `categories`, `keywords`, `longlist` and
`matches`. Options — all optional, each defaulting to the version's previous constant:

| Option | Applies to | Default |
|---|---|---|
| `fieldPrefix` | all | `""` |
| `forceLang` | all | `null` (auto-detect) |
| `placeholder` | all | per-version `{EN, FR}` |
| `depsTimeoutMs` | all | `15000` |
| `maxOptions` | keywords, longlist | `200` |
| `showHints` | matches | `true` |
| `showSummary` | matches | `false` (the line above the box) |
| `maxSummary`, `maxHints` | matches | `2` |

### 5. Publish

Saving is not enough — **publish**, then test the published link in a private window.
A private window matters: `sessionStorage` deliberately preserves a selection across
reloads, which otherwise looks like a stale page.

### Pasting instead of hosting

Pasting a widget file into the question editor still works: paste its full contents and
append the same stub. There is one copy of the logic either way. Hosting is recommended
because re-pasting five versions across several questions is where stale scripts creep
in — a missed paste leaves a silently stale question that is hard to tell apart from a
caching problem.

------------------------------------------------------------------------

## Current CDN URLs

Pinned to `d2db22e`. Only the header needs these; the question stub is typed in directly.

| Version | Files |
|---|---|
| `tomselect` | [data](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-tomselect/noc2021_bilingual.js) · [widget](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-tomselect/occupation_selectize.js) |
| `categories` | [data](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-categories/noc2021_bilingual_categories.js) · [widget](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-categories/occupation_categories.js) |
| `keywords` | [data](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-keywords/noc2021_bilingual_keywords.js) · [widget](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-keywords/occupation_keywords.js) |
| `longlist` | [data](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-longlist/noc2021_bilingual_longlist.js) · [widget](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-longlist/occupation_longlist.js) |
| `matches` | [data](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-matches/noc2021_bilingual_matches.js) · [widget](https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@22a379df60954e171f1d26bff939b73492e40745/versions/noc5-bilingual-matches/occupation_matches.js) |

Pin a **full commit SHA**, never `@main`. jsDelivr caches `@main` aggressively, and a
SHA also locks a fielded survey to an exact snapshot — which is what you want
mid-collection. If you re-run an R script and push new data, that pinned URL keeps
serving the old file until you update the SHA.

> **404 plus "Refused to execute … X-Content-Type-Options: nosniff"** means the URL is
> wrong. jsDelivr answers a bad path with an HTML error page, and the browser refuses to
> run a non-script MIME type. Open the URL directly: if you do not see JavaScript,
> Qualtrics will not either.

------------------------------------------------------------------------

### Updating the pinned commit

Each version README is self-contained, so the pinned SHA appears in several files.
After pushing a commit that changes a data or widget file:

```bash
python3 tools/update_cdn_sha.py          # repoint every README at git HEAD
python3 tools/update_cdn_sha.py --check  # report which SHAs are in use
```

`--check` warns if the READMEs have drifted onto different commits. Run the update
*after* pushing — jsDelivr can only serve a commit GitHub already has, and a freshly
pushed SHA may 404 for a minute or two on first request.

### English-only data builds

Each version also ships an English-only data file. French is roughly 60% of the
bilingual payload, so an English-only survey waits on a download it never uses:

| Version | Bilingual (gzip) | English-only (gzip) |
|---|---|---|
| `tomselect` | 466 KB | **185 KB** |
| `matches` | 466 KB | **185 KB** |
| `keywords` | 603 KB | **265 KB** |
| `longlist` | 641 KB | **283 KB** |
| `categories` | 19 KB | **8 KB** |

They are drop-in replacements — same global name, same structure — so only the data
`<script>` in the header changes. Widget file, question stub and embedded data are
identical. Both builds come from the same prep script and cannot drift.

Use them only where French will never be offered, and pair with `forceLang: "EN"`.
The widget falls back to the English fields if French is somehow selected, so nothing
breaks, but the respondent would see English occupation names under French interface
text.

**Where the first-load lag comes from.** The non-network cost is negligible — building
the options takes about 3 ms and Tom Select initialises in about 2 ms. It is all
download. The survey header sits outside the region Qualtrics swaps between pages, so
header scripts load once at survey start and persist; putting anything ahead of the
occupation question (consent, instructions) lets that download finish while the
respondent reads, and the widget is ready when they arrive. A survey fielding two
versions loads two data files, which is why an English-only build is worth roughly half
a megabyte there.

------------------------------------------------------------------------

## Mobile layout and the iOS zoom

Applies to every version — these are Qualtrics-level settings, not per-widget ones.
Paste into **Look & Feel → Style → Custom CSS**.

```css
/* The survey header holds only the <script> and <link> tags pasted into
   Look & Feel -> Header. They are display:none, so the container renders
   80px of pure empty space below the logo. Collapse it, and keep a modest
   padding on the logo itself rather than dropping to 0. */
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
  /* Stop iOS Safari zooming in when the respondent taps the box.
     Safari force-zooms any input under 16px, and never zooms back out.
     Tom Select ships its input at 13px. */
  .ts-control,
  .ts-control input,
  .ts-dropdown {
    font-size: 16px !important;
  }

  /* Reclaim vertical space above the control. */
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

### The empty header is the biggest single win

Measured on a fielded survey at 375x812, the question text began 151px down. The
breakdown was 67px of logo container (16px padding, a 35px logo, 16px padding) and
**80px of `#header-container` holding nothing but the script tags** — its inner
`#header` div measures 0px. Collapsing that empty container and choosing a logo
padding:

| Logo padding | Question text starts at |
|---|---|
| current (16px, header not collapsed) | 151px |
| 0px | 39px |
| 6px | 51px |
| **10px (recommended)** | **59px** |
| 14px | 67px |

Collapsing the container cannot stop the scripts running: they execute when the
browser parses them, long before CSS affects layout.

### The selectors depend on which survey experience you are using

The rules above target the **New Survey Taking Experience**: `.question-display`,
`.question-error-wrapper`, `nav#navigation`. Most Qualtrics CSS advice online — and
earlier versions of this README — targets the **classic** skin: `.QuestionOuter`,
`.QuestionBody`, `.SkinInner`, `.QuestionText`. Those match *nothing* on a new-experience
survey and fail silently. Confirm with the browser inspector before assuming a rule is
live. `#logo-container` and `#header-container` exist in both, and are only worth
zeroing out if a logo is actually configured.

### Padding is not where the space goes

Measured on a fielded question at 375×812, the input sat 291px down the screen.
Trimming every padding that could safely be trimmed moved it up **12px**. The question
text was doing the real damage:

| Contributor | Vertical space |
|---|---|
| Italic instruction paragraph | 160px |
| `<br><br>` gap | ~33px |
| Version label | 22px |
| Question stem | 22px |
| Qualtrics chrome | 16px |

Shrinking the instructions and dropping one `<br>` is worth far more:

| Change | Input Y position |
|---|---|
| Baseline | 291px |
| Instructions at 75%, line-height 1.2 | 226px |
| Also a single `<br>` instead of `<br><br>` | 198px |

Note that `line-height` must be set on a **block** element. Setting it on an inline
`<i>` computes correctly but changes nothing on screen, because the line box height is
governed by the containing block's strut. Wrap the instructions in a `<div>`:

```html
What is your occupation?<br>
<div style="font-size:75%; line-height:1.2; font-style:italic">Please enter your job title…</div>
```

This matters more than the raw numbers suggest: with the iOS keyboard open the usable
viewport falls to roughly 350px, so moving the control from 291px to 198px is the
difference between two visible dropdown rows and six or seven.

### Two things not to shrink

`.ts-control` carries 8px of vertical padding, and the NEXT button 14px. Removing
either reclaims a little space at the cost of the tap target. The control is already
36px tall, below the 44px Apple's HIG and WCAG 2.5.5 both call for, so it should if
anything grow. `.plug-container` ("Powered by Qualtrics") sits *below* the control, so
trimming it does not help dropdown room; remove it in Look & Feel if your licence allows.

------------------------------------------------------------------------
