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

(function () {
    "use strict";

    // Registered on a namespace rather than calling addOnload directly, so this
    // file can be hosted on a CDN and loaded once from Look & Feel -> Header.
    // A remote script that called addOnload itself would register too late to be
    // picked up. The question JavaScript is a stub that calls init():
    //
    //   Qualtrics.SurveyEngine.addOnload(function () {
    //     window.occupationWidget.categories.init(this, { fieldPrefix: "" });
    //   });
    //
    // Pasting this whole file into the question editor still works -- append the
    // same stub after it. Either way there is one copy of the logic.

    window.occupationWidget = window.occupationWidget || {};

    window.occupationWidget.categories = { init: function (engine, options) {

    options = options || {};
    var qContainer  = engine.getQuestionContainer();
    var questionId  = engine.getQuestionInfo().QuestionID;
    // Prefix for the embedded-data field names and the sessionStorage key. Leave
    // empty on a survey that fields ONE version. Set it (e.g. "matches_") when
    // several versions appear in the SAME survey, otherwise they all write the
    // same __js_occupation_* fields and whichever the respondent answers last
    // overwrites the others. Fields become __js_<prefix>occupation_noc_code, and
    // each prefixed name must be added to the Survey Flow.
    var FIELD_PREFIX = options.fieldPrefix || "";

    // Greyed-out prompt inside the box. Set to "" to show none.
    var PLACEHOLDER = options.placeholder || { EN: "Search occupation categories",
                        FR: "Rechercher une catégorie professionnelle" };

    var SESSION_KEY = FIELD_PREFIX + "occupation_categories_code";

    // Set to "EN" or "FR" on a survey that offers only ONE language and therefore
    // has no language selector. Left null, the language is auto-detected, which
    // resolves to English whenever French cannot be positively identified -- so a
    // French-only survey that exposes neither Q_Language nor <html lang="fr">
    // would silently render in English. Setting this removes the guesswork.
    var FORCE_LANG = options.forceLang || null;

    // Poll for the CDN dependencies, but give up rather than hang silently. A
    // missing data file is the most common setup mistake -- the header was not
    // updated for this version -- and without this the widget just sits there
    // with no error at all.
    var DEPS_TIMEOUT_MS = options.depsTimeoutMs || 15000;

    function waitForDeps(fn) {
        // Wall-clock, not a tick counter: browsers throttle setTimeout to about
        // one second in a backgrounded tab, so counting 50 ms per tick would
        // stretch a 15 s deadline into minutes for anyone who switches away.
        var started = Date.now();
        (function poll() {
            if (window.nocCategories && window.nocCategories.EN && typeof TomSelect !== "undefined") { fn(); return; }
            if (Date.now() - started >= DEPS_TIMEOUT_MS) {
                console.error("[occupation-categories] dependencies never loaded after " + (DEPS_TIMEOUT_MS / 1000) +
                    "s. Missing: " +
                    [!(window.nocCategories) ? "window.nocCategories (add this version's data file to Look & Feel -> Header)" : null,
                     (typeof TomSelect === "undefined") ? "TomSelect" : null]
                        .filter(Boolean).join(", "));
                return;
            }
            setTimeout(poll, 50);
        })();
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
            var rows = window.nocCategories[lang] || window.nocCategories.EN;
            return rows.map(function (row, i) {
                return { id: String(i), code: row.code, label: row.label };
            });
        }

        var options = buildOptions(currentLang);

        // ── Store embedded data ───────────────────────────────────────────────

        function storeSelection(code, name) {
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_noc_code",      code || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_category_name", name || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_lang",          code ? currentLang : "");

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
            placeholder:  PLACEHOLDER[currentLang] || PLACEHOLDER.EN,
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
        // Qualtrics themes reset <button> to border:0, padding:0 and a transparent
        // background, so an unstyled Clear renders as bare text about 31x16px -- it
        // does not read as clickable and is far under the 44px tap target Apple's
        // HIG and WCAG 2.5.5 ask for. Styling is injected here rather than left to
        // Custom CSS so the version stays self-contained and works in every language
        // translation without editing the question HTML.

        if (!document.getElementById("occ-clear-styles")) {
            var clearStyles = document.createElement("style");
            clearStyles.id = "occ-clear-styles";
            clearStyles.textContent =
                ".occ-clear{-webkit-appearance:none !important;appearance:none !important;" +
                "display:block;width:-webkit-fit-content;width:fit-content;" +
                "margin-top:10px;margin-left:auto;margin-right:0;" +
                "padding:7px 13px !important;min-height:40px;" +
                "font-family:inherit;font-size:14px;line-height:1.2;font-weight:500;" +
                "color:#25292e !important;background:#fff !important;" +
                "border:1px solid #b9bec7 !important;border-radius:6px !important;" +
                "cursor:pointer;transition:background-color .12s ease,border-color .12s ease}" +
                ".occ-clear:hover{background:#f2f3f5 !important;border-color:#8f959e !important}" +
                ".occ-clear:active{background:#e6e8ec !important}" +
                ".occ-clear:focus-visible{outline:2px solid #1f4e79 !important;outline-offset:2px}" +
                "@media (max-width:768px){.occ-clear{min-height:44px;padding:9px 15px !important;font-size:16px}}";
            document.head.appendChild(clearStyles);
        }

        var clearBtn = qContainer.querySelector("#button-clear") || qContainer.querySelector("button");
        if (clearBtn) {
            clearBtn.classList.add("occ-clear");
            clearBtn.addEventListener("click", function () {
                control.clear();
                storeSelection("", "");
            });
        }
    });
}};

})();
