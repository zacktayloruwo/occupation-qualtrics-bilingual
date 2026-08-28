# Version: noc5-bilingual-matches-freq
# Builds noc2021_bilingual_matches_freq.js -- all ~500 NOC 2021 5-digit unit
# groups, EN + FR, each with its illustrative-example occupation titles AND the
# number of workers recorded in that category by the 2021 Census, used to order
# the dropdown so commoner occupations surface first.
#
# The data are deliberately IDENTICAL in shape and content to the
# noc5-bilingual-tomselect version; only the global variable name differs, so
# the two can coexist on one page. This version differs from tomselect purely
# in the widget, which surfaces WHICH occupation titles matched what the
# respondent typed instead of keeping them hidden.
#
# Uses NOC 2021 version 1
# https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593
#
# Reads from  <project root>/data-raw/
# Writes to   <project root>/versions/noc5-bilingual-matches-freq/
# Run from anywhere inside the project (paths resolve via here::here()).

library(here)
library(tidyverse)
library(data.table)
library(stringi)
library(readr)

# English ----

en <- rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements.csv"))
en_add <- rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements-additional.csv"))

colnames(en) <- c("level", 
                  "category_code", 
                  "category_name", 
                  "label",
                  "occupation_name"
                  )

colnames(en_add) <- c("level", 
                  "category_code", 
                  "category_name", 
                  "label",
                  "occupation_name"
)

en <- en |>
  bind_rows(en_add) |>
  filter(label %in% c("Illustrative example(s)", "All examples")) |>
  select(-level, -label) |>
  as_tibble() |>
  distinct() |>
  # go to sentence case
  mutate(occupation_name = str_replace(occupation_name, "^.", ~ toupper(.x))) |>
  # fix quotes within quotes
  mutate(occupation_name = str_replace_all(occupation_name, '"', "'")) |> 
  # sort alpha -- explicit locale so the build is reproducible across machines
  arrange(stri_rank(occupation_name, locale = "en")) |>
  # leading zeros on category code
  mutate(category_code = str_pad(category_code, width = 5, side = "left", pad = "0"))

# French ----

fr <- rio::import(here::here("data-raw", "cnp_2021_version_1.0_-_elements.csv"))

colnames(fr) <- c("level", 
                  "category_code", 
                  "category_name", 
                  "label",
                  "occupation_name"
)

fr <- fr |>
  filter(label %in% c("Exemple(s) illustratif(s)", "Tous les exemples")) |>
  select(-level, -label) |>
  as_tibble() |>
  distinct() |>
  # go to sentence case
  mutate(occupation_name = str_replace(occupation_name, "^.", ~ toupper(.x))) |>
  # fix quotes within quotes
  mutate(occupation_name = str_replace_all(occupation_name, '"', "'")) |> 
  # sort alpha -- explicit locale so the build is reproducible across machines
  arrange(stri_rank(occupation_name, locale = "fr")) |>
  # leading zeros on category code
  mutate(category_code = str_pad(category_code, width = 5, side = "left", pad = "0"))

# Build bilingual JSON structure approach ----

library(jsonlite)

# Build bilingual structure
bilingual_tbl <- en %>%
  group_by(category_code, category_name) %>%
  summarise(occupations_EN = list(occupation_name), .groups = "drop") %>%
  left_join(
    fr %>%
      group_by(category_code, category_name) %>%
      summarise(occupations_FR = list(occupation_name), .groups = "drop") %>%
      rename(category_FR = category_name),
    by = "category_code"
  ) %>%
  rename(category_EN = category_name)


# Census frequencies ----
# 2021 Census counts of workers per 5-digit NOC category. The source codes are
# unpadded ("10" for Legislators), so they need the same zero-padding as the
# classification files before they will join.

freq <- readr::read_csv(
  here::here("data-raw", "census_2021_NOC_5_frequency.csv"),
  show_col_types = FALSE
) |>
  transmute(
    category_code = str_pad(as.character(NOC21_5), width = 5, side = "left", pad = "0"),
    freq          = as.integer(VALUE)
  ) |>
  distinct(category_code, .keep_all = TRUE)

message("frequency rows: ", nrow(freq))

# The census file collapses 00011-00015 (the senior-manager unit groups) into a
# single aggregate, 00018, which is not itself a unit group in the classification.
# Those five therefore have no count of their own and are left at 0, which sorts
# them last. Everything else joins.
bilingual_tbl <- bilingual_tbl |>
  left_join(freq, by = "category_code") |>
  mutate(freq = tidyr::replace_na(freq, 0L))

message("categories without a frequency: ", sum(bilingual_tbl$freq == 0))
message("total workers represented: ", format(sum(bilingual_tbl$freq), big.mark = ","))

# Convert to JSON for Qualtrics
json_code <- toJSON(bilingual_tbl, dataframe = "rows", pretty = TRUE, auto_unbox = TRUE)

# Wrap in JS variable assignment
js_code <- paste0("window.nocMatchesFreq = window.nocMatchesFreq || ", json_code, ";")

# Write to file (UTF-8)
writeLines(
  js_code,
  here::here("versions", "noc5-bilingual-matches-freq", "noc2021_bilingual_matches_freq.js"),
  useBytes = TRUE
)

message("wrote noc2021_bilingual_matches_freq.js")

# English-only build ----
# Same structure and the same global name, with the French half dropped. The
# widget falls back to the English fields when a French one is absent, so this
# file is a drop-in replacement in the header for an English-only survey. It is
# roughly a third of the size: French accounts for about 63% of the bilingual
# file, which is all download the respondent waits through for nothing.

en_only <- bilingual_tbl |>
  select(category_code, category_EN, occupations_EN, freq)

writeLines(
  paste0("window.nocMatchesFreq = window.nocMatchesFreq || ",
         toJSON(en_only, dataframe = "rows", pretty = FALSE, auto_unbox = TRUE), ";"),
  here::here("versions", "noc5-bilingual-matches-freq", "noc2021_en_matches_freq.js"),
  useBytes = TRUE
)

message("wrote noc2021_en_matches_freq.js")
