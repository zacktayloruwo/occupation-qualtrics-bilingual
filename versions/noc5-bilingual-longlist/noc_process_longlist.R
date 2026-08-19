# Version: noc5-bilingual-longlist
# Builds noc2021_bilingual_longlist.js -- a FLAT dropdown list in which every
# category name AND every illustrative occupation title is its own separate
# entry, sorted alphabetically within each language.
#
# Contrast with noc5-bilingual-tomselect, where the ~516 categories are the only
# visible rows and the occupation titles are hidden search keywords.
#
# Uses NOC 2021 version 1
# https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593
#
# Reads from  <project root>/data-raw/
# Writes to   <project root>/versions/noc5-bilingual-longlist/
# Run from anywhere inside the project (paths resolve via here::here()).

library(here)
library(tidyverse)
library(stringi)
library(jsonlite)

VERSION <- "noc5-bilingual-longlist"

# Shared cleaning ----
# Identical to the noc5-bilingual-tomselect prep, so the two versions agree on
# codes and wording. Sort collation is pinned to an explicit locale to keep the
# build reproducible regardless of the machine's LC_COLLATE.

clean_elements <- function(df, keep_labels) {
  colnames(df) <- c("level", "category_code", "category_name", "label", "occupation_name")
  df |>
    filter(label %in% keep_labels) |>
    select(-level, -label) |>
    as_tibble() |>
    distinct() |>
    # go to sentence case
    mutate(occupation_name = str_replace(occupation_name, "^.", ~ toupper(.x))) |>
    # fix quotes within quotes
    mutate(occupation_name = str_replace_all(occupation_name, '"', "'")) |>
    # leading zeros on category code
    mutate(category_code = str_pad(category_code, width = 5, side = "left", pad = "0"))
}

# English ----

en <- bind_rows(
  rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements.csv")),
  rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements-additional.csv"))
) |>
  clean_elements(c("Illustrative example(s)", "All examples"))

# French ----

fr <- rio::import(here::here("data-raw", "cnp_2021_version_1.0_-_elements.csv")) |>
  clean_elements(c("Exemple(s) illustratif(s)", "Tous les exemples"))

# Build the flat long list ----
# type "C" = category name, type "T" = illustrative occupation title.
# Rows are sorted alphabetically by label using the language's own collation.

build_longlist <- function(df, locale) {
  categories <- df |>
    distinct(category_code, category_name) |>
    transmute(code = category_code, label = category_name, type = "C")

  titles <- df |>
    distinct(category_code, occupation_name) |>
    transmute(code = category_code, label = occupation_name, type = "T")

  bind_rows(categories, titles) |>
    distinct(code, label, .keep_all = TRUE) |>
    arrange(stri_rank(label, locale = locale))
}

longlist_en <- build_longlist(en, "en")
longlist_fr <- build_longlist(fr, "fr")

# Category-code -> names lookup, so the widget can report the category name for
# a picked title without repeating it on all ~58,000 rows.

cat_names <- en |>
  distinct(category_code, category_name) |>
  rename(EN = category_name) |>
  full_join(
    fr |> distinct(category_code, category_name) |> rename(FR = category_name),
    by = "category_code"
  ) |>
  arrange(category_code)

categories_map <- cat_names |>
  select(EN, FR) |>
  pmap(function(EN, FR) list(EN = EN, FR = FR)) |>
  setNames(cat_names$category_code)

# Report ----

message("EN rows: ", nrow(longlist_en),
        " (", sum(longlist_en$type == "C"), " categories, ",
        sum(longlist_en$type == "T"), " titles)")
message("FR rows: ", nrow(longlist_fr),
        " (", sum(longlist_fr$type == "C"), " categories, ",
        sum(longlist_fr$type == "T"), " titles)")
message("categories in lookup: ", length(categories_map))

# Write ----
# Compact (not pretty) -- ~58,000 rows, so whitespace is a large share of the
# file that respondents have to download.

out <- list(
  categories = categories_map,
  EN = longlist_en,
  FR = longlist_fr
)

json_code <- toJSON(out, dataframe = "rows", pretty = FALSE, auto_unbox = TRUE)

js_code <- paste0("window.nocLonglist = window.nocLonglist || ", json_code, ";")

writeLines(
  js_code,
  here::here("versions", VERSION, "noc2021_bilingual_longlist.js"),
  useBytes = TRUE
)

message("wrote noc2021_bilingual_longlist.js")
