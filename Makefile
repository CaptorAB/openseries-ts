.PHONY: run install

PYTHON := python3

install:
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install --upgrade openseries requests

run: install
	$(PYTHON) scripts/load_py_openseries_data.py