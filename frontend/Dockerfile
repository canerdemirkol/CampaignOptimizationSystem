# Frontend Dockerfile - React + Vite Application
FROM node:20-alpine AS builder

WORKDIR /app

# Aynı origin: tarayıcı /api çağırır, nginx Cluster/Compose’ta backend’e proxy yapar.
# Gerekirse build sırasında: docker build --build-arg VITE_API_URL=https://api.example.com/api .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM nginx:alpine AS production

RUN apk add --no-cache wget

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

ENV BACKEND_HOST=campaign-backend
ENV BACKEND_PORT=3001

ENV NGINX_ENVSUBST_FILTER=BACKEND

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]