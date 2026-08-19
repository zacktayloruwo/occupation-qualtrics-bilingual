// Qualtrics occupation widget — CATEGORIES ONLY, powered by Tom Select
// Depends on: noc2021_bilingual_categories.js (defines window.nocCategories)
//
// Only the ~516 NOC 2021 category names appear in the dropdown, listed
// alphabetically, and only those names are searchable. Illustrative occupation
// titles are not present at all — a respondent typing "head nurse" finds nothing.
//
// Contrast with noc5-bilingual-tomselect, which shows the same 516 category
// names but silently searches the occupation titles behind them and orders
// matches by relevance.
//
// Embedded data written on selection:
//   __js_occupation_noc_code      — 5-digit NOC 2021 category code
//   __js_occupation_category_name — category name in the language active at selection
//   __js_occupation_lang          — "EN" or "FR"
//
// HTML required in the question body (both EN and FR translations):
//   <select></select>
//   <button type="button">Clear / Effacer</button>  (optional)

Qualtrics.SurveyEngine.addOnload(function () {
    var engine      = this;
    var qContainer  = this.getQuestionContainer();
    var questionId  = this.getQuestionInfo().QuestionID;
    var SESSION_KEY = "occupation_categories_code";

    function waitForDeps(fn) {
        if (window.nocCategories && window.nocCategories.EN && typeof TomSelect !== "undefined") {
            fn();
        } else {
            setTimeout(function () { waitForDeps(fn); }, 50);
        }
    }

    waitForDeps(function () {

        // ── Language ──────────────────────────────────────────────────────────

        function getCurrentLang() {
            var urlLang = new URLSearchParams(window.location.search).get("Q_Language") || "";
            if (urlLang.toLowerCase().startsWith("fr")) return "FR";

            var htmlLang = document.documentElement.lang || "";
            if (htmlLang.toLowerCase().startsWith("fr")) return "FR";

            return "EN";
        }

        var currentLang = getCurrentLang();

        // ── Option builder ────────────────────────────────────────────────────
        // Rows arrive already sorted alphabetically in the correct locale, so the
        // array index doubles as both the option id and the display order.

        function buildOptions(lang) {
            var rows = window.nocCategories[lang] || window.nocCategories.EN;
            return rows.map(function (row, i) {
                return { id: String(i), code: row.code, label: row.label };
            });
        }

        var options = buildOptions(currentLang);

        // ── Store embedded data ───────────────────────────────────────────────

        function storeSelection(code, name) {
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_noc_code",      code || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_category_name", name || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_lang",          code ? currentLang : "");

            if (code) {
                sessionStorage.setItem(SESSION_KEY, code);
            } else {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        // ── Tom Select init ───────────────────────────────────────────────────

        var selectEl = qContainer.querySelector("select");
        if (!selectEl) {
            console.error("[occupation-categories] <select> not found in question " + questionId);
            return;
        }

        var control = new TomSelect(selectEl, {
            maxItems:    1,
            maxOptions:  null,          // only ~516 rows, so never truncate
            valueField:  "id",
            labelField:  "label",
            searchField: ["label"],     // category names only — no hidden keywords
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
                storeSelection(opt ? opt.code : "", opt ? opt.label : "");
            }
        });

        // ── Restore selection after language re-render ────────────────────────
        // The category code is language-independent, so the exact selection is
        // always recoverable and simply displays under its translated name.

        var savedCode = sessionStorage.getItem(SESSION_KEY);
        if (savedCode) {
            var match = options.find(function (o) { return o.code === savedCode; });
            if (match) {
                control.addItem(match.id, /* silent = */ true);
                storeSelection(match.code, match.label);
            }
        }

        // ── Clear button ──────────────────────────────────────────────────────

        var clearBtn = qContainer.querySelector("#button-clear") || qContainer.querySelector("button");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                control.clear();
                storeSelection("", "");
            });
        }
    });
});
