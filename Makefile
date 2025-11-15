.PHONY: help build up down restart logs clean ps shell

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

build-prod: ## Build all Docker images for production
	docker-compose -f docker-compose.prod.yml build

up: ## Start all services in development mode
	docker-compose up -d

up-prod: ## Start all services in production mode
	docker-compose -f docker-compose.prod.yml up -d

down: ## Stop all services
	docker-compose down

down-prod: ## Stop all production services
	docker-compose -f docker-compose.prod.yml down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-frontend: ## View logs from frontend service
	docker-compose logs -f frontend

ps: ## Show status of all services
	docker-compose ps

clean: ## Stop and remove all containers, networks, and volumes
	docker-compose down -v

clean-prod: ## Stop and remove all production containers, networks, and volumes
	docker-compose -f docker-compose.prod.yml down -v

shell-frontend: ## Open a shell in the frontend container
	docker-compose exec frontend /bin/sh

rebuild: ## Rebuild and restart all services
	docker-compose up -d --build

rebuild-prod: ## Rebuild and restart all production services
	docker-compose -f docker-compose.prod.yml up -d --build
