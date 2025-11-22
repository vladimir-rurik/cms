#!/bin/bash

set -e

echo "  Building Universal CMS Microservices..."

# Build all Docker images
echo "Building API Gateway..."
cd services/api-gateway
docker build -t universal-cms/api-gateway .

echo "Building Component Service..."
cd ../component-service
docker build -t universal-cms/component-service .

echo "Building Page Service..."
cd ../page-service
docker build -t universal-cms/page-service .

echo "Building Plugin Service..."
cd ../plugin-service
docker build -t universal-cms/plugin-service .

echo "Building Configuration Service..."
cd ../config-service
docker build -t universal-cms/config-service .

echo "✅ All services built successfully!"

echo "  Image sizes:"
docker images | grep universal-cms

echo "  To start all services, run:"
echo "   docker-compose up -d"

echo "  To push to registry:"
echo "   docker push universal-cms/api-gateway"
echo "   docker push universal-cms/component-service"
echo "   docker push universal-cms/page-service"
echo "   docker push universal-cms/plugin-service"
echo "   docker push universal-cms/config-service"