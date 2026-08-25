# <Version name>

**Status:** Draft
**NOC level:** <e.g. 5-digit unit group>
**Languages:** <EN / FR / EN+FR>
**UI:** <e.g. Tom Select single-select>

One-paragraph description of what makes this version different and when to use it.

---

## Data prep

Run `<script>.R` from anywhere inside the project. It reads from `data-raw/` and
writes `<data-file>.js` into this folder.

Describe any version-specific filtering, aggregation, or recoding here.

## Embedded data

| Survey Flow field name | Contents |
|---|---|
| `__js_...` |  |

## Installing in Qualtrics

See [Installation](../../README.md#installation) in the root README for the full
walkthrough. Version-specific parts:

**Header** — this version's data file and widget file, plus Tom Select:

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@COMMIT-SHA/versions/<version-name>/<data-file>.js"></script>
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@COMMIT-SHA/versions/<version-name>/<widget-file>.js"></script>
```

**Question JavaScript** — a stub naming this version:

```js
Qualtrics.SurveyEngine.addOnload(function () {
  window.occupationWidget.<key>.init(this, { fieldPrefix: "", forceLang: null });
});
```

## Notes / known issues
