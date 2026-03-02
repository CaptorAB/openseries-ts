SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: run upgrade deps python-run npm-run node-deps

PYTHON := python3

# ---- Default target ----
run: upgrade deps python-run npm-run

upgrade:
	$(PYTHON) -m pip install --upgrade pip

deps:
	$(PYTHON) -m pip install --upgrade openseries requests

python-run:
	$(PYTHON) scripts/load_py_openseries_data.py

node-deps:
	npm install

npm-run: node-deps
	npm run compare-metrics