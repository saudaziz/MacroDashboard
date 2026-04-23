# Build Stage
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files
COPY frontend_angular/package*.json ./
RUN npm install

# Copy source and build
COPY frontend_angular/ .
RUN npm run build

# Runtime Stage
FROM nginx:alpine
COPY --from=build /app/dist/frontend_angular/browser /usr/share/nginx/html
# Copy custom nginx config if needed, but default is usually fine for simple SPAs
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
