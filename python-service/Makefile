.PHONY: help install install-dev run run-dev encrypt-env encrypt-env-backend test lint format clean

help:
	@echo "Campaign Optimization Python Service - Available commands:"
	@echo ""
	@echo "  make install              Install dependencies"
	@echo "  make install-dev          Install with dev dependencies"
	@echo "  make run                  Run the service (uvicorn, no reload - safe for long-running jobs)"
	@echo "  make run-dev              Run with --reload (hot reload for active development)"
	@echo "  make encrypt-env          Encrypt sensitive .env values (requires cryptography)"
	@echo "  make encrypt-env-backend  Use backend's npm run encrypt-env (alternative)"
	@echo "  make test                 Run tests"
	@echo "  make lint                 Run linting"
	@echo "  make format               Format code with black"
	@echo "  make clean                Clean up generated files"

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements.txt

run:
	uvicorn app.main:app --host 0.0.0.0 --port 8000

run-dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

encrypt-env:
	@echo "🔐 Encrypting .env file..."
	@echo "Note: This requires 'cryptography' to be installed"
	@echo ""
	python scripts/encrypt_env.py

encrypt-env-backend:
	@echo "🔐 Using backend's encrypt-env script..."
	@echo "Make sure you have cryptography installed: pip install cryptography>=41.0.0"
	@echo ""
	@if [ -f "../backend/scripts/encrypt-env.ts" ]; then \
		echo "📝 Backend found. Running npm run encrypt-env..."; \
		cd backend && npm run encrypt-env; \
		echo ""; \
		echo "✅ Copy the encrypted values from backend output to .env:"; \
		echo "   SERVICE_USERNAME=ENC:..."; \
		echo "   SERVICE_PASSWORD=ENC:..."; \
	else \
		echo "❌ Backend not found or encrypt-env.ts missing"; \
	fi

test:
	pytest --cov=app tests/

lint:
	isort app/
	black --check app/
	mypy app/

format:
	isort app/
	black app/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .mypy_cache .coverage htmlcov/
