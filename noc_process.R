# Process NOC files
# Uses NOC 2021 version 1
# https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593

library(tidyverse)
library(data.table)
library(stringi)
library(readr)

# English ----

en <- rio::import("noc_2021_version_1.0_-_elements.csv")
en_add <- rio::import("noc_2021_version_1.0_-_elements-additional.csv")

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
  # sort alpha
  arrange(occupation_name) |>
  # leading zeros on category code
  mutate(category_code = str_pad(category_code, width = 5, side = "left", pad = "0"))

# French ----

fr <- rio::import("cnp_2021_version_1.0_-_elements.csv")

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
  # sort alpha
  arrange(occupation_name) |>
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

# Convert to JSON for Qualtrics
json_code <- toJSON(bilingual_tbl, dataframe = "rows", pretty = TRUE, auto_unbox = TRUE)

# Wrap in JS variable assignment
js_code <- paste0("window.categories = window.categories || ", json_code, ";")

# Write to file (UTF-8)
writeLines(js_code, "noc2021_bilingual.js", useBytes = TRUE)
