// Qualtrics occupation widget — LONG LIST variant, powered by Tom Select
// Depends on: noc2021_bilingual_longlist.js (defines window.nocLonglist)
//
// Every NOC 2021 category name AND every illustrative occupation title is its
// own row in the dropdown, listed alphabetically. Contrast with the
// noc5-bilingual-tomselect version, where only the ~516 category names are
// visible and the titles are hidden search keywords.
//
// Embedded data written on selection:
//   __js_occupation_noc_code        — 5-digit NOC 2021 category code
//   __js_occupation_category_name   — name of the category the pick rolls up to
//   __js_occupation_selected_label  — the exact string the respondent chose
//   __js_occupation_selected_type   — "category" or "title"
//   __js_occupation_lang            — "EN" or "FR", language at time of the pick
//
// HTML required in the question body (both EN and FR translations):
//   <select></select>
//   <button type="button">Clear / Effacer</button>  (optional)
//
// When Qualtrics switches language it fully re-renders the question and fires
// addOnload again. sessionStorage is used to persist the selection across that
// re-render. Note that the EN and FR title lists are not parallel-indexed, so an
// individual title cannot be translated; see the language-switch section below.

Qualtrics.SurveyEngine.addOnload(function () {
    var engine      = this;
    var qContainer  = this.getQuestionContainer();
    var questionId  = this.getQuestionInfo().QuestionID;
    var SESSION_KEY = "occupation_longlist_selection";

    // Set to "EN" or "FR" on a survey that offers only ONE language and therefore
    // has no language selector. Left null, the language is auto-detected, which
    // resolves to English whenever French cannot be positively identified -- so a
    // French-only survey that exposes neither Q_Language nor <html lang="fr">
    // would silently render in English. Setting this removes the guesswork.
    var FORCE_LANG = null;

    // Cap on how many matches are rendered at once. The full list is ~28,000
    // (EN) / ~30,000 (FR) rows, so an uncapped dropdown would be unusable.
    // Because matches are shown in strict alphabetical order rather than by
    // relevance, a broad query can exceed this cap ("manager" matches ~1,200
    // rows in EN). Raising it costs render time; lowering it hides matches.
    var MAX_OPTIONS = 200;

    // ── Wait for CDN dependencies ─────────────────────────────────────────────

    function waitForDeps(fn) {
        if (window.nocLonglist && window.nocLonglist.EN && typeof TomSelect !== "undefined") {
            fn();
        } else {
            setTimeout(function () { waitForDeps(fn); }, 50);
        }
    }

    waitForDeps(function () {

        // ── Language ──────────────────────────────────────────────────────────

        // Detection only ever recognises French; anything else becomes English.
        // The widget cannot see which languages the survey actually has, so it
        // cannot "fall back to the remaining language" on its own. On a
        // single-language survey set FORCE_LANG above and none of this runs.
        function getCurrentLang() {
            if (FORCE_LANG) {
                return String(FORCE_LANG).trim().toUpperCase().indexOf("FR") === 0 ? "FR" : "EN";
            }

            // Accepts "fr", "FR", "fr-CA", "FR-CA", "fr_CA".
            function isFrench(value) {
                return String(value || "").trim().toLowerCase().replace(/_/g, "-").indexOf("fr") === 0;
            }

            // 1. Qualtrics language query parameter.
            if (isFrench(new URLSearchParams(window.location.search).get("Q_Language"))) return "FR";

            // 2. Document language attribute.
            if (isFrench(document.documentElement.lang)) return "FR";

            // 3. Q_Language as embedded data, where the survey exposes it.
            //    Not available in every Qualtrics version, hence the guard.
            try {
                if (window.Qualtrics && Qualtrics.SurveyEngine &&
                    typeof Qualtrics.SurveyEngine.getEmbeddedData === "function" &&
                    isFrench(Qualtrics.SurveyEngine.getEmbeddedData("Q_Language"))) return "FR";
            } catch (e) { /* getEmbeddedData not supported here */ }

            return "EN";
        }

        var currentLang = getCurrentLang();

        // ── Option builder ────────────────────────────────────────────────────
        // Rows arrive already sorted alphabetically in the correct locale, so the
        // array index doubles as both the option id and the display order.

        function buildOptions(lang) {
            var rows = window.nocLonglist[lang] || window.nocLonglist.EN;
            return rows.map(function (row, i) {
                return {
                    id:    String(i),
                    code:  row.code,
                    label: row.label,
                    type:  row.type === "C" ? "category" : "title"
                };
            });
        }

        function categoryName(code, lang) {
            var entry = window.nocLonglist.categories[code];
            if (!entry) return "";
            return entry[lang] || entry.EN || "";
        }

        var options = buildOptions(currentLang);

        // ── Store embedded data ───────────────────────────────────────────────
        // `sel` is the record of what the respondent actually picked, including
        // the language they picked it in. It is written verbatim so a later
        // language switch cannot silently rewrite their answer.

        function storeSelection(sel) {
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_noc_code",       sel ? sel.code    : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_category_name",  sel ? sel.catName : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_selected_label", sel ? sel.label   : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_selected_type",  sel ? sel.type    : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_lang",           sel ? sel.lang    : "");

            if (sel) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(sel));
            } else {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        // ── Tom Select init ───────────────────────────────────────────────────

        var selectEl = qContainer.querySelector("select");
        if (!selectEl) {
            console.error("[occupation-longlist] <select> not found in question " + questionId);
            return;
        }

        var control = new TomSelect(selectEl, {
            maxItems:    1,
            maxOptions:  MAX_OPTIONS,
            valueField:  "id",
            labelField:  "label",
            searchField: ["label"],
            options:     options,
            create:      false,
            // Show matches in alphabetical order. Tom Select ignores `sortField`
            // whenever a search query is active and always orders by relevance
            // score, so the only way to get alphabetical output is to flatten
            // the score: every match scores 1, ties break on insertion order,
            // and the rows were inserted in locale-correct alphabetical order
            // by the R prep script.
            score: function (search) {
                var baseScore = this.getScoreFunction(search);
                return function (item) {
                    return baseScore(item) > 0 ? 1 : 0;
                };
            },
            onChange: function (id) {
                var opt = control.options[id];
                if (!opt) { storeSelection(null); return; }
                storeSelection({
                    code:    opt.code,
                    label:   opt.label,
                    type:    opt.type,
                    catName: categoryName(opt.code, currentLang),
                    lang:    currentLang
                });
            }
        });

        // ── Restore selection after language re-render ────────────────────────
        // Same language: restore the exact row.
        // Different language: the EN and FR title lists are not parallel-indexed,
        // so an individual title has no translation. Fall back to displaying the
        // category the pick rolls up to, and leave the stored answer untouched so
        // the respondent's original wording survives in the data.

        var savedRaw = sessionStorage.getItem(SESSION_KEY);
        if (savedRaw) {
            var saved = null;
            try { saved = JSON.parse(savedRaw); } catch (e) { saved = null; }

            if (saved && saved.code) {
                var match = null;

                if (saved.lang === currentLang) {
                    match = options.find(function (o) {
                        return o.code === saved.code && o.label === saved.label;
                    });
                }
                if (!match) {
                    match = options.find(function (o) {
                        return o.code === saved.code && o.type === "category";
                    });
                }

                if (match) {
                    control.addItem(match.id, /* silent = */ true);
                }
                // Rewrite embedded data from the saved record, not from the row
                // now on screen, so a language switch never overwrites the pick.
                storeSelection(saved);
            }
        }

        // ── Clear button ──────────────────────────────────────────────────────

        var clearBtn = qContainer.querySelector("#button-clear") || qContainer.querySelector("button");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                control.clear();
                storeSelection(null);
            });
        }
    });
});
