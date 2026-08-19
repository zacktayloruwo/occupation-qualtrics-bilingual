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

## Installation

1. Push and derive the jsDelivr URL from the commit SHA (see the root README).
2. Header scripts:

```html
<script src="https://cdn.jsdelivr.net/gh/zacktayloruwo/occupation-qualtrics-bilingual@COMMIT-SHA/versions/<version-name>/<data-file>.js"></script>
```

3. Question HTML (add to every language translation).
4. Question JavaScript: paste `<widget>.js`.

## Notes / known issues
