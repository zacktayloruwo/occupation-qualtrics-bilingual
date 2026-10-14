# Qualtrics Custom CSS

Two sheets, because Qualtrics renders surveys with two different markup
structures and **a sheet written for one matches nothing in the other**. It
fails silently — no error, no warning, the rules simply do nothing.

| File | For surveys whose markup uses |
|---|---|
| [`new-experience.css`](new-experience.css) | `question-display`, `header-container`, `choice-label`, `nav#navigation` |
| [`classic-skin.css`](classic-skin.css) | `QuestionOuter`, `QuestionText`, `ChoiceStructure`, `SkinInner`, `#Header` |

Paste the contents of the matching file into **Look & Feel → Style → Custom CSS**.

## Which one does my survey use?

Open the published survey and run this in the browser console:

```javascript
document.querySelector('.JFEContent') ? 'classic skin  -> classic-skin.css'
  : document.querySelector('.question-display') ? 'new experience -> new-experience.css'
  : 'neither matched - check the markup'
```

Do this per survey. It is not an account-wide setting: `SV_5A8gHdE1SzxSkdM`
uses the new experience and `SV_42warnvmNGzgjjg` uses the classic skin, in the
same account, created months apart.

## What maps to what

Both sheets do the same jobs. Only the selectors differ.

| Job | New experience | Classic skin |
|---|---|---|
| Collapse the empty header holding the script tags | `#header-container` | `#Header` |
| Trim space above the logo | `#logo-container` | `.SkinInner` padding-top, `#Logo` margin |
| Question text line-height, instruction italics | `.question-display`, `.question-display i` | `.QuestionText`, `.QuestionText i` |
| Padding under the question | `.question-error-wrapper` | `.QuestionBody` |
| Navigation buttons | `nav#navigation` | `#Buttons` |
| Gap between radio choices | `.choice.radio` margin-bottom | `.LabelWrapper` margin-bottom |
| Radio tap target | `.choice-label` padding | `label.SingleAnswer` padding |
| Stop iOS zooming the search box | `.ts-control`, `.ts-dropdown` | **identical** |
| Occupation-widget feedback line | `.occ-summary` | **identical** |

The last two rows are classes the occupation widget creates itself, not
Qualtrics markup, so they are the same in both skins and carry over unchanged.

## Measured effect of `classic-skin.css`

On the published `SV_42warnvmNGzgjjg`, before and after:

| | Desktop (1280px) | Mobile (375px) |
|---|---|---|
| Space above the first question | 214px → **92px** | 95px → **79px** |
| Gap between radio choices | 53px → **47px** | 49px → **47px** |
| Radio tap target | 45px → 45px (held) | 41px → **45px** (raised) |
| Question text line-height | 30px → 25px | 24px → 20px |
| Total page height | 1541px → **1240px** | — |

The desktop saving is large because the classic skin puts 80px of `SkinInner`
padding and a 40px empty `#Header` above every page.

Note the mobile tap target **improves**. This skin renders choice labels at
41px on a phone, below the 44px Apple's HIG and WCAG 2.5.5 both ask for; the
sheet raises it to 45px while still tightening the gap. That is why the mobile
block increases `label.SingleAnswer` padding rather than reducing it.

## If Qualtrics rejects the sheet

> Unable to save Look And Feel. Custom CSS is invalid.

Qualtrics sanitises Custom CSS and rejects the **entire** sheet if it finds
tag-like text — including inside a comment. Both files here are free of angle
brackets for that reason; keep them that way when editing. The error names no
line number, so if you hit it, paste the sheet in halves to find the cause.
