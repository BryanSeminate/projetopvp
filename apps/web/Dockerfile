# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# API URL embutida no bundle (browser → API). Sobrescreva no build se necessário.
ARG VITE_API_URL=http://localhost:3333
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- runtime (nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
