# Build stage for Raspberry Pi / ARM
ARG TARGETPLATFORM=linux/arm/v7
FROM --platform=$TARGETPLATFORM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM --platform=$TARGETPLATFORM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_URL=http://localhost:8000
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]