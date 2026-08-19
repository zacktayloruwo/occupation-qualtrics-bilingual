// June 9, 2026, 4:31pm
// Qualtrics occupation widget — powered by Tom Select (no jQuery required)
// Depends on: noc2021_bilingual.js (defines window.categories array)
//
// Embedded data written on selection:
//   __js_occupation_noc_code      — 5-digit NOC 2021 category code
//   __js_occupation_category_name — category name in the language active at selection
//   __js_occupation_lang          — "EN" or "FR"
//
// HTML required in the question body (both EN and FR translations):
//   <select></select>
//   <button type="button">Clear / Effacer</button>  (optional)
//
// When Qualtrics switches language it fully re-renders the question and fires
// addOnload again. sessionStorage is used to persist the selection across that
// re-render so the respondent does not lose their answer.

Qualtrics.SurveyEngine.addOnload(function () {
    var engine     = this;
    var qContainer = this.getQuestionContainer();
    var questionId = this.getQuestionInfo().QuestionID;
    var SESSION_KEY = "occupation_noc_code";

    // Set to "EN" or "FR" on a survey that offers only ONE language and therefore
    // has no language selector. Left null, the language is auto-detected, which
    // resolves to English whenever French cannot be positively identified -- so a
    // French-only survey that exposes neither Q_Language nor <html lang="fr">
    // would silently render in English. Setting this removes the guesswork.
    var FORCE_LANG = null;

    // ── Wait for CDN dependencies ─────────────────────────────────────────────

    function waitForDeps(fn) {
        if (window.categories && window.categories.length && typeof TomSelect !== "undefined") {
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
            return window.categories.map(function (cat) {
                return {
                    code:     cat.category_code,
                    label:    cat["category_" + lang] || cat["category_EN"],
                    keywords: (cat["occupations_" + lang] || []).join(" ")
                };
            });
        }

        // ── Store embedded data ───────────────────────────────────────────────

        function storeSelection(code, lang, options) {
            var opt = options[code];
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_noc_code",      code || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_category_name", opt ? opt.label : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_lang",          lang);

            // Persist code in sessionStorage so it survives a language re-render
            if (code) {
                sessionStorage.setItem(SESSION_KEY, code);
            } else {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        // ── Tom Select init ───────────────────────────────────────────────────

        var selectEl = qContainer.querySelector("select");
        if (!selectEl) {
            console.error("[occupation] <select> not found in question " + questionId);
            return;
        }

        var control = new TomSelect(selectEl, {
            maxItems:    1,
            valueField:  "code",
            labelField:  "label",
            searchField: ["label", "keywords"],
            options:     buildOptions(currentLang),
            create:      false,
            onChange: function (code) {
                storeSelection(code, currentLang, control.options);
            }
        });

        // ── Restore selection after language re-render ────────────────────────

        var savedCode = sessionStorage.getItem(SESSION_KEY);
        if (savedCode && control.options[savedCode]) {
            control.addItem(savedCode, /* silent = */ true);
            storeSelection(savedCode, currentLang, control.options);
        }

        // ── Clear button ──────────────────────────────────────────────────────

        var clearBtn = qContainer.querySelector("#button-clear") || qContainer.querySelector("button");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                control.clear();
                storeSelection("", currentLang, control.options);
            });
        }
    });
});
