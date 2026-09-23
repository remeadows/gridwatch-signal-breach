#!/bin/sh
# Validate the staged patch, not unrelated unstaged work. Git detects newly
# introduced conflict markers and whitespace errors without reading binaries.
set -eu
exec git diff --cached --check
