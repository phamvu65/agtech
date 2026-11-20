.PHONY: run test lint format check
run:
	python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
test:
	python -m pytest
lint:
	python -m ruff check src tests
format:
	python -m ruff format src tests
check: lint test
