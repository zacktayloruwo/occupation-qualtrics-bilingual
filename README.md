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

## Current header URLs

Live, pinned URLs for each version — paste as-is. Only the **data file** is loaded from
a URL; the widget script is pasted directly into the question's JavaScript editor.

| Version | Data file URL (`Look & Feel → Header`) |
|---|---|
| `noc5-bilingual-tomselect` | <https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-tomselect/noc2021_bilingual.js> |
| `noc5-bilingual-categories` | <https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-categories/noc2021_bilingual_categories.js> |
| `noc5-bilingual-keywords` | <https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-keywords/noc2021_bilingual_keywords.js> |
| `noc5-bilingual-longlist` | <https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-longlist/noc2021_bilingual_longlist.js> |
| `noc5-bilingual-matches` | <https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-matches/noc2021_bilingual_matches.js> |

Every version also needs Tom Select, which is the same two lines regardless:

```html
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

All five were verified returning HTTP 200 with `Content-Type: application/javascript`
at commit `492a26d`.

> **If the browser console shows a 404 plus "Refused to execute ... X-Content-Type-Options:
> nosniff"**, the URL is wrong. jsDelivr answers a bad path with an HTML error page, and
> because that is not a script MIME type the browser refuses to run it. The usual cause is
> pasting a template URL containing `YOUR-USERNAME`, `YOUR-REPO` or `COMMIT-SHA` instead of
> a real one, or a commit SHA that predates the file. Open the URL directly in a browser: if
> you do not see JavaScript, Qualtrics will not either.

------------------------------------------------------------------------

## CDN hosting

Generated data files are too large to paste into the Qualtrics header, so they are served from this repository via jsDelivr:

```         
https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/<version-name>/<data-file>.js
```

Pin a **full commit SHA** rather than `@main`. jsDelivr caches `@main` aggressively, so a SHA is the only reliable way to guarantee a survey serves the file you just pushed. It also means each fielded survey is locked to an exact data snapshot, which is what you want mid-collection.

> **Path change:** before the move to `versions/`, the production data file lived at the repository root (`@main/noc2021_bilingual.js`). Any survey still pointing at that root URL must be updated to the versioned path above.
