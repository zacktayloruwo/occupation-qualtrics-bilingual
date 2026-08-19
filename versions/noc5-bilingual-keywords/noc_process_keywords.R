# Version: noc5-bilingual-keywords
# Builds noc2021_bilingual_keywords.js -- ONLY the illustrative occupation
# titles ("keyword examples"), sorted alphabetically within each language.
# Category names are NOT selectable; they are kept in a lookup so the widget can
# report which category a chosen title rolls up to.
#
# Uses NOC 2021 version 1
# https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593
#
# Reads from  <project root>/data-raw/
# Writes to   <project root>/versions/noc5-bilingual-keywords/
# Run from anywhere inside the project (paths resolve via here::here()).

library(here)
library(tidyverse)
library(stringi)
library(jsonlite)

VERSION <- "noc5-bilingual-keywords"

# Cleaning identical to the other versions so all four agree on codes and wording.

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

en <- bind_rows(
  rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements.csv")),
  rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements-additional.csv"))
) |>
  clean_elements(c("Illustrative example(s)", "All examples"))

fr <- rio::import(here::here("data-raw", "cnp_2021_version_1.0_-_elements.csv")) |>
  clean_elements(c("Exemple(s) illustratif(s)", "Tous les exemples"))

# Occupation titles only, alphabetical in each language's own collation ----

build_keywords <- function(df, locale) {
  df |>
    distinct(category_code, occupation_name) |>
    transmute(code = category_code, label = occupation_name) |>
    arrange(stri_rank(label, locale = locale))
}

keywords_en <- build_keywords(en, "en")
keywords_fr <- build_keywords(fr, "fr")

# Category-code -> names lookup, so a chosen title can report its category.

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

message("EN titles: ", nrow(keywords_en))
message("FR titles: ", nrow(keywords_fr))
message("categories in lookup: ", length(categories_map))

out <- list(categories = categories_map, EN = keywords_en, FR = keywords_fr)

js_code <- paste0(
  "window.nocKeywords = window.nocKeywords || ",
  toJSON(out, dataframe = "rows", pretty = FALSE, auto_unbox = TRUE),
  ";"
)

writeLines(
  js_code,
  here::here("versions", VERSION, "noc2021_bilingual_keywords.js"),
  useBytes = TRUE
)

message("wrote noc2021_bilingual_keywords.js")
