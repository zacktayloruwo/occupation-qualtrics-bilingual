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

## Header to paste into Qualtrics

**Look & Feel → Header**, copy this exactly. These URLs are live and pinned to commit
`492a26d` — paste them as-is, there is nothing to fill in.

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-tomselect/noc2021_bilingual.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

The question JavaScript is **not** loaded from a URL — open the widget file in this
folder and paste its full contents into the question's JavaScript editor.

------------------------------------------------------------------------

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

## Installation

### Prerequisites

- A Qualtrics account with access to Look & Feel and JavaScript editing
- The files `noc2021_bilingual.js` and `occupation_selectize.js` from this folder
- `noc2021_bilingual.js` hosted on a CDN (instructions below)

------------------------------------------------------------------------

### Step 1 — Host the data file on a CDN

`noc2021_bilingual.js` is too large to paste into the Qualtrics header directly.

1.  Push `noc2021_bilingual.js` to a public GitHub repository.

2.  Find the full SHA of the commit (e.g., `a3f8c12b...`) on GitHub.

3.  Your CDN URL will be:

    ```         
    https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-tomselect/noc2021_bilingual.js
    ```

    It is stored on Zack Taylor's GitHub at:

    ```         
    https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-tomselect/noc2021_bilingual.js
    ```

4.  Using a commit SHA instead of `@main` prevents stale cache issues on jsDelivr, and locks a fielded survey to an exact data snapshot.

> **Path change:** This file previously lived at the repository root, served as `@main/noc2021_bilingual.js`. That URL no longer resolves — surveys pointing at it must be updated to the versioned path above.

> **Cache note:** If you update the file, push a new commit and update the SHA in the URL. To force jsDelivr to serve a fresh copy immediately, visit: `https://purge.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@main/versions/noc5-bilingual-tomselect/noc2021_bilingual.js`

------------------------------------------------------------------------

### Step 2 — Add scripts to the Qualtrics survey header

1.  In the Qualtrics editor, go to **Look & Feel → Header**.
2.  Paste the following, replacing the jsDelivr URL with your own from Step 1:

``` html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@492a26dfbe4a38ea466fdb654a6aeb9ce5ef21a2/versions/noc5-bilingual-tomselect/noc2021_bilingual.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tom-select@2/dist/js/tom-select.complete.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2/dist/css/tom-select.default.min.css">
```

3.  Save.

------------------------------------------------------------------------

### Step 3 — Add embedded data fields to the Survey Flow

1.  Open the **Survey Flow**.

2.  Add an **Embedded Data** element (place it before the block containing the occupation question).

3.  Add these three fields exactly as written (Qualtrics requires the "\_\_js\_" prefix):

    - `__js_occupation_noc_code`
    - `__js_occupation_category_name`
    - `__js_occupation_lang`

4.  Leave their values blank (the widget will populate them).

5.  Save the Survey Flow.

------------------------------------------------------------------------

### Step 4 — Add HTML to the question body

Open the occupation question in the editor. Click the **HTML source** button (`<>`) and add the following to the question body:

``` html
What is your occupation?<br />
<select></select>
<br />
<button type="button">Clear</button>
```

The `<select>` element is where Tom Select will render the dropdown. The button is optional but recommended — it allows respondents to clear their selection.

> **Important:** If your survey has French translations, you must add this same HTML to the **French translation** of the question body as well. Go to **Tools → Translate Survey**, find the French version of this question, click the HTML source button, and paste the same markup with French text:

``` html
Quel est votre occupation ?<br />
<select></select>
<br />
<button type="button">Effacer</button>
```

------------------------------------------------------------------------

### Step 5 — Add the question JavaScript

1.  Click the occupation question to select it.
2.  Click **JavaScript** (in the question toolbar).
3.  **Select all** existing content in the editor (`Cmd+A` / `Ctrl+A`) and delete it.
4.  Paste the entire contents of `occupation_selectize.js`.
5.  Click **Save**.

> **Important:** The editor may pre-populate stubs like `Qualtrics.SurveyEngine.addOnload(function() { })`. Delete these before pasting — the script already contains its own `addOnload` wrapper.

------------------------------------------------------------------------

### Step 6 — Publish and test

1.  **Publish** the survey.
2.  Open the published survey link in a **private/incognito window**.
3.  Type an occupation (e.g., "nurse", "teacher", "infirmier") and confirm the dropdown populates.
4.  Select an option and submit the response.
5.  Check the response data to confirm `__js_occupation_noc_code`, `__js_occupation_category_name`, and `__js_occupation_lang` are populated.
6.  If your survey has a language switcher, test switching languages before and after making a selection to confirm the selection is preserved.

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

**Too much vertical padding truncatres the pulldown on mobile**

- If the pulldown gets cut off, you can reduce the vertical padding on elements in the Qualtrics UX. This can be done globally by adding the following CSS to the ‘Custom CSS’ area in the Look and Feel / Style area:

``` CSS
@media (max-width: 768px) {
  .QuestionOuter,
  .QuestionBody,
  .SkinInner,
  .QuestionText {
    padding-top: 4px !important;
    padding-bottom: 4px !important;
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }
}

#logo-container {
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

#header-container {
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
```

---

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
