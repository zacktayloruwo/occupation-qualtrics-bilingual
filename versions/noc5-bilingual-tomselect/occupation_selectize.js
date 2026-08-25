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

(function () {
    "use strict";

    // Registered on a namespace rather than calling addOnload directly, so this
    // file can be hosted on a CDN and loaded once from Look & Feel -> Header.
    // A remote script that called addOnload itself would register too late to be
    // picked up. The question JavaScript is a stub that calls init():
    //
    //   Qualtrics.SurveyEngine.addOnload(function () {
    //     window.occupationWidget.tomselect.init(this, { fieldPrefix: "" });
    //   });
    //
    // Pasting this whole file into the question editor still works -- append the
    // same stub after it. Either way there is one copy of the logic.

    window.occupationWidget = window.occupationWidget || {};

    window.occupationWidget.tomselect = { init: function (engine, options) {

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
    var PLACEHOLDER = options.placeholder || { EN: "Enter your job title",
                        FR: "Entrez votre titre d'emploi" };

    var SESSION_KEY = FIELD_PREFIX + "occupation_noc_code";

    // Set to "EN" or "FR" on a survey that offers only ONE language and therefore
    // has no language selector. Left null, the language is auto-detected, which
    // resolves to English whenever French cannot be positively identified -- so a
    // French-only survey that exposes neither Q_Language nor <html lang="fr">
    // would silently render in English. Setting this removes the guesswork.
    var FORCE_LANG = options.forceLang || null;

    // ── Wait for CDN dependencies ─────────────────────────────────────────────

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
            if (window.categories && window.categories.length && typeof TomSelect !== "undefined") { fn(); return; }
            if (Date.now() - started >= DEPS_TIMEOUT_MS) {
                console.error("[occupation] dependencies never loaded after " + (DEPS_TIMEOUT_MS / 1000) +
                    "s. Missing: " +
                    [!(window.categories) ? "window.categories (add this version's data file to Look & Feel -> Header)" : null,
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

        function buildOptions(lang) {
            return window.categories.map(function (cat) {
                return {
                    code:     cat.category_code,
                    label:    cat["category_" + lang] || cat["category_EN"],
                    keywords: (cat["occupations_" + lang] || cat["occupations_EN"] || []).join(" ")
                };
            });
        }

        // ── Store embedded data ───────────────────────────────────────────────

        function storeSelection(code, lang, options) {
            var opt = options[code];
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_noc_code",      code || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_category_name", opt ? opt.label : "");
            // Blank on clear, like every other field. Previously the language
            // survived a clear, so a cleared answer still recorded a language.
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_lang",          code ? lang : "");

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

        // ── Relevance ranking ─────────────────────────────────────────────────
        // Tom Select's built-in score is (constant / field length): it matches each
        // query token independently anywhere in a category's concatenated keyword
        // blob, ignores whether the words appear together, and normalises by field
        // length. Two consequences, both bad here:
        //
        //   * "nurse" matches "Nursery", because matching is substring-based rather
        //     than word-based.
        //   * A category literally containing the title "Head nurse" is outranked by
        //     one that merely contains "Head grower" and "Nursery manager", purely
        //     because its keyword list is longer.
        //
        // Measured before this change, the query "head nurse" returned
        // "Managers in horticulture" first and "Nursing coordinators and
        // supervisors" second. Ranking below is tiered so that a whole-word match on
        // the complete phrase beats scattered substring hits. Items that matched
        // before still match -- only their order changes.

        function fold(str) {
            return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        }

        function isWordChar(ch) {
            return !!ch && /[a-z0-9]/.test(ch);
        }

        // `needle` occurs in `hay` as a whole word: preceded by a non-word character
        // and followed by one, allowing only a plural "s"/"es" to trail. The plural
        // allowance matters because NOC category names are plural while respondents
        // type the singular -- without it "teacher" whole-word-matches "teacher
        // assistants" but not "teachers", pushing the assistants category above the
        // teachers one. Restricting the suffix to s/es keeps "nurse" from matching
        // "nursery", which is the behaviour this ranking exists to fix.
        function hasWholeWord(hay, needle) {
            var from = 0, i, after;
            while ((i = hay.indexOf(needle, from)) !== -1) {
                if (!isWordChar(hay.charAt(i - 1))) {
                    after = i + needle.length;
                    if (!isWordChar(hay.charAt(after))) return true;
                    if (hay.charAt(after) === "s" && !isWordChar(hay.charAt(after + 1))) return true;
                    if (hay.substr(after, 2) === "es" && !isWordChar(hay.charAt(after + 2))) return true;
                }
                from = i + 1;
            }
            return false;
        }

        // Folded label, individual titles and a joined blob, per category code.
        var searchIndex = {};
        window.categories.forEach(function (cat) {
            var titles = (cat["occupations_" + currentLang] || []).map(fold);
            searchIndex[cat.category_code] = {
                label:  fold(cat["category_" + currentLang] || cat["category_EN"]),
                titles: titles,
                blob:   titles.join(" ")
            };
        });

        function tierFor(code, phrase, tokens) {
            var idx = searchIndex[code];
            if (!idx) return 1;

            // 6 — the whole phrase, as whole words, in the category name itself.
            if (hasWholeWord(idx.label, phrase)) return 6;

            var i;
            // 5 — the whole phrase, as whole words, in one occupation title.
            for (i = 0; i < idx.titles.length; i++) {
                if (hasWholeWord(idx.titles[i], phrase)) return 5;
            }
            // 4 — the whole phrase as a substring of a title ("nurse" in "Nursery").
            for (i = 0; i < idx.titles.length; i++) {
                if (idx.titles[i].indexOf(phrase) !== -1) return 4;
            }
            // 3 — every token as a whole word, all within a SINGLE title.
            for (i = 0; i < idx.titles.length; i++) {
                var title = idx.titles[i];
                if (tokens.every(function (t) { return hasWholeWord(title, t); })) return 3;
            }
            // 2 — every token as a whole word, anywhere in the category.
            if (tokens.every(function (t) { return hasWholeWord(idx.blob, t) || hasWholeWord(idx.label, t); })) return 2;

            // 1 — matched only as scattered substrings.
            return 1;
        }

        var control = new TomSelect(selectEl, {
            maxItems:    1,
            // Keep the dropdown shut until the respondent actually types. Without
            // this Tom Select opens the full list on focus, so an empty box shows
            // an arbitrary first entry ("Legislators", the lowest NOC code) before
            // anyone has expressed any intent.
            openOnFocus: false,
            onType: function (str) {
                // Deleting back to an empty box closes it again.
                if (!str) { this.close(); }
            },
            placeholder:  PLACEHOLDER[currentLang] || PLACEHOLDER.EN,
            valueField:  "code",
            labelField:  "label",
            searchField: ["label", "keywords"],
            options:     buildOptions(currentLang),
            create:      false,
            // Reorder matches; never change which items match. The base score still
            // decides that, and is kept as a within-tier tie-breaker.
            score: function (search) {
                var baseScore = this.getScoreFunction(search);
                var raw       = (typeof search === "string") ? search : (search && search.query) || "";
                var phrase    = fold(raw).trim().replace(/\s+/g, " ");
                var tokens    = phrase ? phrase.split(" ") : [];

                return function (item) {
                    var base = baseScore(item);
                    if (!base) return 0;              // unchanged: non-matches stay out
                    if (!phrase) return base;
                    return tierFor(item.code, phrase, tokens) + base;
                };
            },
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
                storeSelection("", currentLang, control.options);
            });
        }
    });
}};

})();
