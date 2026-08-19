# Version: noc5-bilingual-categories
# Builds noc2021_bilingual_categories.js -- ONLY the ~516 NOC 2021 category
# names, sorted alphabetically within each language. No occupation titles are
# included, so there is nothing to search but the category names themselves.
#
# Uses NOC 2021 version 1
# https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593
#
# Reads from  <project root>/data-raw/
# Writes to   <project root>/versions/noc5-bilingual-categories/
# Run from anywhere inside the project (paths resolve via here::here()).

library(here)
library(tidyverse)
library(stringi)
library(jsonlite)

VERSION <- "noc5-bilingual-categories"

# Cleaning identical to the other versions so all four agree on codes and wording.

clean_elements <- function(df, keep_labels) {
  colnames(df) <- c("level", "category_code", "category_name", "label", "occupation_name")
  df |>
    filter(label %in% keep_labels) |>
    select(-level, -label) |>
    as_tibble() |>
    distinct() |>
    mutate(category_code = str_pad(category_code, width = 5, side = "left", pad = "0"))
}

en <- bind_rows(
  rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements.csv")),
  rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements-additional.csv"))
) |>
  clean_elements(c("Illustrative example(s)", "All examples"))

fr <- rio::import(here::here("data-raw", "cnp_2021_version_1.0_-_elements.csv")) |>
  clean_elements(c("Exemple(s) illustratif(s)", "Tous les exemples"))

# Category names only, alphabetical in each language's own collation ----

build_categories <- function(df, locale) {
  df |>
    distinct(category_code, category_name) |>
    transmute(code = category_code, label = category_name) |>
    arrange(stri_rank(label, locale = locale))
}

categories_en <- build_categories(en, "en")
categories_fr <- build_categories(fr, "fr")

message("EN categories: ", nrow(categories_en))
message("FR categories: ", nrow(categories_fr))

out <- list(EN = categories_en, FR = categories_fr)

js_code <- paste0(
  "window.nocCategories = window.nocCategories || ",
  toJSON(out, dataframe = "rows", pretty = FALSE, auto_unbox = TRUE),
  ";"
)

writeLines(
  js_code,
  here::here("versions", VERSION, "noc2021_bilingual_categories.js"),
  useBytes = TRUE
)

message("wrote noc2021_bilingual_categories.js")
