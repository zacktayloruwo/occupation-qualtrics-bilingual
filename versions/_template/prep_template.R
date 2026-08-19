# Version: <version-name>
# Builds <data-file>.js -- <one-line description of the output>
#
# Uses NOC 2021 version 1
# https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593
#
# Reads from  <project root>/data-raw/
# Writes to   <project root>/versions/<version-name>/
# Run from anywhere inside the project (paths resolve via here::here()).

library(here)
library(tidyverse)
library(jsonlite)

VERSION <- "<version-name>"

# Read ----

en <- rio::import(here::here("data-raw", "noc_2021_version_1.0_-_elements.csv"))
fr <- rio::import(here::here("data-raw", "cnp_2021_version_1.0_-_elements.csv"))

# Transform ----

# ... version-specific filtering / aggregation ...

# Write ----

# js_code <- paste0("window.categories = window.categories || ",
#                   toJSON(out, dataframe = "rows", pretty = TRUE, auto_unbox = TRUE),
#                   ";")
#
# writeLines(
#   js_code,
#   here::here("versions", VERSION, "<data-file>.js"),
#   useBytes = TRUE
# )
