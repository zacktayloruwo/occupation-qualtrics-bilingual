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

Qualtrics.SurveyEngine.addOnload(function () {
    var engine      = this;
    var qContainer  = this.getQuestionContainer();
    var questionId  = this.getQuestionInfo().QuestionID;
    // Distinct from the tomselect version's key. The two are near-identical and
    // may well sit in the same survey; sharing a key would let a selection made
    // in one silently pre-fill the other.
    var SESSION_KEY = "occupation_matches_code";

    // Set to "EN" or "FR" on a survey that offers only ONE language and therefore
    // has no language selector. Left null, the language is auto-detected, which
    // resolves to English whenever French cannot be positively identified -- so a
    // French-only survey that exposes neither Q_Language nor <html lang="fr">
    // would silently render in English. Setting this removes the guesswork.
    var FORCE_LANG = null;

    var SHOW_SUMMARY   = true;   // the line above the dropdown
    var SHOW_HINTS     = true;   // the per-row "e.g." line
    var MAX_SUMMARY    = 2;      // titles named in the summary line
    var MAX_HINTS      = 2;      // titles named per dropdown row
    var MIN_QUERY_LEN  = 2;      // below this, feedback stays hidden

    function waitForDeps(fn) {
        if (window.nocMatches && window.nocMatches.length && typeof TomSelect !== "undefined") {
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
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_noc_code",      code || "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_category_name", opt ? opt.label : "");
            Qualtrics.SurveyEngine.setJSEmbeddedData("occupation_lang",          lang);

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
                return this.getScoreFunction(search);
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

        var clearBtn = qContainer.querySelector("#button-clear") || qContainer.querySelector("button");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                control.clear();
                storeSelection("", currentLang, control.options);
                paintSummary("");
            });
        }
    });
});
