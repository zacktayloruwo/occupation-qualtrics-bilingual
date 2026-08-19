# Occupation Selectors for Qualtrics

Zack Taylor, University of Western Ontario, [zack.taylor\@uwo.ca](mailto:zack.taylor@uwo.ca){.email}

A collection of JavaScript occupation-search widgets for Qualtrics surveys, built on the National Occupational Classification (NOC) 2021. Each **version** is a self-contained variant of the selector — a different aggregation level, interaction style, or language configuration — living in its own subfolder under `versions/`.

------------------------------------------------------------------------

## Repository layout

```         
data-raw/                 Shared NOC 2021 source files (see below). Never edited by hand.
versions/
  <version-name>/         One self-contained selector variant:
    README.md               Installation + behaviour notes for this version
    *.R                     Data-prep script (reads data-raw/, writes this folder)
    <data>.js               Generated data file, served to Qualtrics via jsDelivr
    <widget>.js             The Qualtrics question JavaScript
  _template/              Starting point for a new version
index.html                Placeholder page for the GitHub Pages root
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

The four versions cover every combination of what is displayed and what is searched:

| Version | Rows shown (EN) | Searchable text | Match ordering |
|---|---|---|---|
| `noc5-bilingual-tomselect` | 516 category names | category names + hidden occupation titles | relevance |
| `noc5-bilingual-categories` | 516 category names | category names only | alphabetical |
| `noc5-bilingual-keywords` | 27,941 occupation titles | occupation titles only | alphabetical |
| `noc5-bilingual-longlist` | 28,457 of both | both | alphabetical |

All four resolve to the same 5-digit NOC codes, so responses are directly comparable.

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

## CDN hosting

Generated data files are too large to paste into the Qualtrics header, so they are served from this repository via jsDelivr:

```         
https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@COMMIT-SHA/versions/<version-name>/<data-file>.js
```

Pin a **full commit SHA** rather than `@main`. jsDelivr caches `@main` aggressively, so a SHA is the only reliable way to guarantee a survey serves the file you just pushed. It also means each fielded survey is locked to an exact data snapshot, which is what you want mid-collection.

> **Path change:** before the move to `versions/`, the production data file lived at the repository root (`@main/noc2021_bilingual.js`). Any survey still pointing at that root URL must be updated to the versioned path above.
