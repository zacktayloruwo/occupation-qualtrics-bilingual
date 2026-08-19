// Qualtrics occupation widget — KEYWORDS ONLY, powered by Tom Select
// Depends on: noc2021_bilingual_keywords.js (defines window.nocKeywords)
//
// Only the illustrative occupation titles appear in the dropdown (~27,900 EN /
// ~29,800 FR), listed alphabetically. NOC category names are NOT selectable; a
// respondent picks a concrete job title and the widget reports the category it
// rolls up to. Typing a category name such as "Registered nurses and registered
// psychiatric nurses" will not match anything.
//
// Embedded data written on selection:
//   __js_occupation_noc_code        — 5-digit NOC 2021 category code
//   __js_occupation_category_name   — category the chosen title rolls up to
//   __js_occupation_selected_label  — the exact title the respondent chose
//   __js_occupation_lang            — "EN" or "FR", language at time of the pick
//
// HTML required in the question body (both EN and FR translations):
//   <select></select>
//   <button type="button">Clear / Effacer</button>  (optional)

Qualtrics.SurveyEngine.addOnload(function () {
    var engine      = this;
    var qContainer  = this.getQuestionContainer();
    var questionId  = this.getQuestionInfo().QuestionID;
    var SESSION_KEY = "occupation_keywords_selection";

    // Set to "EN" or "FR" on a survey that offers only ONE language and therefore
    // has no language selector. Left null, the language is auto-detected, which
    // resolves to English whenever French cannot be positively identified -- so a
    // French-only survey that exposes neither Q_Language nor <html lang="fr">
    // would silently render in English. Setting this removes the guesswork.
    var FORCE_LANG = null;

    // Matches are shown in strict alphabetical order rather than by relevance,
    // so a broad query can exceed this cap. Raising it costs render time.
    var MAX_OPTIONS = 200;

    function waitForDeps(fn) {
        if (window.nocKeywords && window.nocKeywords.EN && typeof TomSelect !== "undefined") {
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

        function buildOptions(lang) {
            var rows = window.nocKeywords[lang] || window.nocKeywords.EN;
            return rows.map(function (row, i) {
                return { id: String(i), code: row.code, label: row.label };
            });
        }

        function categoryName(code, lang) {
            var entry = window.nocKeywords.categories[code];
            if (!entry) return "";
            return entry[lang] || entry.EN || "";
        }

        var options = buildOptions(currentLang);

        // ── Store embedded data ───────────────────────────────────────────────

        function storeSelection(sel) {
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_noc_code",       sel ? sel.code    : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_category_name",  sel ? sel.catName : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_selected_label", sel ? sel.label   : "");
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
            console.error("[occupation-keywords] <select> not found in question " + questionId);
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
                    catName: categoryName(opt.code, currentLang),
                    lang:    currentLang
                });
            }
        });

        // ── Restore selection after language re-render ────────────────────────
        // The EN and FR title lists are not parallel-indexed, so a title picked
        // in one language has no counterpart in the other. Unlike the longlist
        // version there is no category row to fall back to, so the original
        // title is injected as a one-off option and shown as-is. The respondent
        // therefore still sees their own answer, in the language they gave it,
        // and the stored data is left exactly as they left it.

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

                if (match) {
                    control.addItem(match.id, /* silent = */ true);
                } else {
                    // Cross-language: surface the original wording rather than
                    // appearing to have lost the answer.
                    var carryId = "carried";
                    control.addOption({ id: carryId, code: saved.code, label: saved.label });
                    control.addItem(carryId, /* silent = */ true);
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
