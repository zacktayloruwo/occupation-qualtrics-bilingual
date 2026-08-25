// Qualtrics occupation widget — MATCH FEEDBACK, powered by Tom Select
// Depends on: noc2021_bilingual_matches.js (defines window.nocMatches)
//
// Behaviourally identical to noc5-bilingual-tomselect: the ~516 NOC 2021
// category names are the only selectable rows, the occupation titles behind
// them are searched, and matches are ordered by relevance. The difference is
// that this version SHOWS the respondent which occupation titles their typing
// matched, instead of matching against them invisibly.
//
// Two feedback mechanisms, either can be switched off below:
//
//   SHOW_SUMMARY  a line above the dropdown naming the closest matching
//                 occupation titles overall ("Closest examples: Head nurse,
//                 Assistant head nurse"). Answers "did it understand me?"
//
//   SHOW_HINTS    a muted second line on each dropdown row naming the titles
//                 from THAT category which matched. Answers "why is this
//                 category being offered, and does it cover my job?"
//
// Embedded data written on selection (same three fields as tomselect):
//   __js_occupation_noc_code      — 5-digit NOC 2021 category code
//   __js_occupation_category_name — category name in the language active at selection
//   __js_occupation_lang          — "EN" or "FR"
//
// HTML required in the question body (both EN and FR translations) — unchanged
// from tomselect, the feedback element is created by this script:
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
    //     window.occupationWidget.matches.init(this, { fieldPrefix: "" });
    //   });
    //
    // Pasting this whole file into the question editor still works -- append the
    // same stub after it. Either way there is one copy of the logic.

    window.occupationWidget = window.occupationWidget || {};

    window.occupationWidget.matches = { init: function (engine, options) {

    options = options || {};
    var qContainer  = engine.getQuestionContainer();
    var questionId  = engine.getQuestionInfo().QuestionID;
    // Distinct from the tomselect version's key. The two are near-identical and
    // may well sit in the same survey; sharing a key would let a selection made
    // in one silently pre-fill the other.
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

    var SESSION_KEY = FIELD_PREFIX + "occupation_matches_code";

    // Set to "EN" or "FR" on a survey that offers only ONE language and therefore
    // has no language selector. Left null, the language is auto-detected, which
    // resolves to English whenever French cannot be positively identified -- so a
    // French-only survey that exposes neither Q_Language nor <html lang="fr">
    // would silently render in English. Setting this removes the guesswork.
    var FORCE_LANG = options.forceLang || null;

    var SHOW_SUMMARY   = options.showSummary !== false;   // the line above the dropdown
    var SHOW_HINTS     = options.showHints !== false;   // the per-row "e.g." line
    var MAX_SUMMARY    = options.maxSummary || 2;      // titles named in the summary line
    var MAX_HINTS      = options.maxHints || 2;      // titles named per dropdown row
    var MIN_QUERY_LEN  = options.minQueryLen || 2;      // below this, feedback stays hidden

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
            if (window.nocMatches && window.nocMatches.length && typeof TomSelect !== "undefined") { fn(); return; }
            if (Date.now() - started >= DEPS_TIMEOUT_MS) {
                console.error("[occupation-matches] dependencies never loaded after " + (DEPS_TIMEOUT_MS / 1000) +
                    "s. Missing: " +
                    [!(window.nocMatches) ? "window.nocMatches (add this version's data file to Look & Feel -> Header)" : null,
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

        var TEXT = {
            EN: { closest: "Closest examples: ", none: "No matching occupation examples" },
            FR: { closest: "Exemples les plus proches : ", none: "Aucun exemple d'emploi correspondant" }
        }[currentLang];

        // ── Accent- and case-insensitive folding ──────────────────────────────
        // French titles are full of accents and the respondent will not type
        // them, so matching has to ignore diacritics as well as case.

        function fold(s) {
            return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        }

        // ── Title index ───────────────────────────────────────────────────────
        // Flat list of every occupation title in the active language, folded
        // once up front so each keystroke is a plain substring scan.

        var titleIndex = [];
        window.nocMatches.forEach(function (cat) {
            var titles = cat["occupations_" + currentLang] || [];
            for (var i = 0; i < titles.length; i++) {
                titleIndex.push({ code: cat.category_code, title: titles[i], folded: fold(titles[i]) });
            }
        });

        // Matches for the current query: overall best few, and a per-category
        // lookup used to annotate the dropdown rows.
        var bestOverall  = [];
        var byCategory   = {};

        function computeMatches(rawQuery) {
            bestOverall = [];
            byCategory  = {};

            var q = fold((rawQuery || "").trim());
            if (q.length < MIN_QUERY_LEN) return;

            var hits = [];
            for (var i = 0; i < titleIndex.length; i++) {
                var pos = titleIndex[i].folded.indexOf(q);
                if (pos === -1) continue;

                // Rank: a title starting with what was typed beats one where the
                // match starts a later word, which beats a match mid-word.
                var rank = pos === 0 ? 0
                         : (titleIndex[i].folded[pos - 1] === " " ? 1 : 2);
                hits.push({ code: titleIndex[i].code, title: titleIndex[i].title,
                            rank: rank, len: titleIndex[i].title.length });
            }

            hits.sort(function (a, b) {
                return (a.rank - b.rank) || (a.len - b.len) || a.title.localeCompare(b.title);
            });

            for (var j = 0; j < hits.length; j++) {
                var h = hits[j];
                if (!byCategory[h.code]) byCategory[h.code] = [];
                if (byCategory[h.code].length < MAX_HINTS) byCategory[h.code].push(h.title);
            }
            bestOverall = hits.slice(0, MAX_SUMMARY).map(function (h) { return h.title; });
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
        window.nocMatches.forEach(function (cat) {
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

        // ── Option builder (unchanged from tomselect) ─────────────────────────

        function buildOptions(lang) {
            return window.nocMatches.map(function (cat) {
                return {
                    code:     cat.category_code,
                    label:    cat["category_" + lang] || cat["category_EN"],
                    keywords: (cat["occupations_" + lang] || []).join(" ")
                };
            });
        }

        // ── Store embedded data (unchanged from tomselect) ────────────────────

        function storeSelection(code, lang, options) {
            var opt = options[code];
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_noc_code",      code || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_category_name", opt ? opt.label : "");
            // Blank on clear, like every other field. Previously the language
            // survived a clear, so a cleared answer still recorded a language.
            Qualtrics.SurveyEngine.setJSEmbeddedData(FIELD_PREFIX + "occupation_lang",          code ? lang : "");

            if (code) {
                sessionStorage.setItem(SESSION_KEY, code);
            } else {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        // ── Styles ────────────────────────────────────────────────────────────
        // Injected rather than added to the Qualtrics theme so the version is
        // self-contained and can be dropped into any survey.

        if (!document.getElementById("occ-match-styles")) {
            var st = document.createElement("style");
            st.id = "occ-match-styles";
            st.textContent =
                ".occ-summary{font-size:13px;line-height:1.45;margin:0 0 6px;min-height:19px;color:#444}" +
                ".occ-summary .occ-none{color:#8a8f98;font-style:italic}" +
                ".occ-summary b{font-weight:600}" +
                ".occ-hint{display:block;font-size:12px;color:#6b7280;margin-top:2px}";
            document.head.appendChild(st);
        }

        // ── Tom Select init ───────────────────────────────────────────────────

        var selectEl = qContainer.querySelector("select");
        if (!selectEl) {
            console.error("[occupation-matches] <select> not found in question " + questionId);
            return;
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
            // Tom Select's _onInput() calls refreshOptions() BEFORE it fires the
            // "type" event, so matches cannot be computed in a type handler --
            // the rows would already have rendered against the previous query.
            // settings.score is invoked once per search, before any row is
            // built, which makes it the only reliable place to hook. The base
            // scoring function is returned untouched so relevance ordering
            // stays exactly as it is in the tomselect version.
            score: function (search) {
                var q = (typeof search === "string") ? search
                      : (search && search.query) ? search.query : "";
                computeMatches(q);
                if (typeof control !== "undefined" && control) {
                    if (typeof control.clearCache === "function") control.clearCache();
                    else control.renderCache = { item: {}, option: {} };
                }
                // Same tiered ranking as noc5-bilingual-tomselect, so the two stay
                // ordering-equivalent and comparing them isolates the feedback
                // rather than confounding it with a scoring difference.
                var baseScore = this.getScoreFunction(search);
                var phrase    = fold(q).trim().replace(/\s+/g, " ");
                var tokens    = phrase ? phrase.split(" ") : [];

                return function (item) {
                    var base = baseScore(item);
                    if (!base) return 0;              // unchanged: non-matches stay out
                    if (!phrase) return base;
                    return tierFor(item.code, phrase, tokens) + base;
                };
            },
            render: SHOW_HINTS ? {
                option: function (data, escape) {
                    var hits = byCategory[data.code];
                    var html = "<div>" + escape(data.label);
                    if (hits && hits.length) {
                        html += '<span class="occ-hint">' + escape(hits.join(", ")) + "</span>";
                    }
                    return html + "</div>";
                }
            } : {},
            onChange: function (code) {
                storeSelection(code, currentLang, control.options);
            }
        });

        // ── Feedback element ──────────────────────────────────────────────────
        // Placed immediately above the control that Tom Select built.

        var summaryEl = null;
        if (SHOW_SUMMARY) {
            summaryEl = document.createElement("div");
            summaryEl.className = "occ-summary";
            control.wrapper.parentNode.insertBefore(summaryEl, control.wrapper);
        }

        function escapeHtml(s) {
            return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        function paintSummary(rawQuery) {
            if (!summaryEl) return;
            var q = (rawQuery || "").trim();
            if (q.length < MIN_QUERY_LEN) { summaryEl.innerHTML = ""; return; }
            if (!bestOverall.length) {
                summaryEl.innerHTML = '<span class="occ-none">' + TEXT.none + "</span>";
                return;
            }
            summaryEl.innerHTML = TEXT.closest +
                bestOverall.map(function (t) { return "<b>" + escapeHtml(t) + "</b>"; }).join(", ");
        }

        // Recompute on every keystroke, before Tom Select refreshes the list, so
        // the per-row hints rendered below are for the current query. The render
        // cache has to be dropped or Tom Select reuses last query's markup.
        // The summary line is independent of row rendering, so it is safe to
        // paint it from the "type" event. Note this fires on a 300 ms
        // refreshThrottle, not on every keypress.
        control.on("type", function (str) {
            if ((str || "").trim().length < MIN_QUERY_LEN) computeMatches("");
            paintSummary(str);
        });

        // Clearing the box (or choosing something) should not leave stale text.
        control.on("blur",   function () { paintSummary(""); });
        control.on("change", function () { paintSummary(""); });

        // ── Restore selection after language re-render (unchanged) ────────────

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
                paintSummary("");
            });
        }
    });
}};

})();
