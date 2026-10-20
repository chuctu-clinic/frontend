# Giao diện Phòng khám Chúc Từ: build client-users và client-admin rồi phục vụ bằng nginx.
# Build từ thư mục gốc dự án (cần shared/ và package-lock.json):
#   docker build -f client/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/client-users/package.json client/client-users/
COPY client/client-admin/package.json client/client-admin/
RUN npm ci --ignore-scripts

COPY shared shared
COPY client client
RUN npm run build -w client-users && npm run build -w client-admin

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/client-users/dist /usr/share/nginx/html
COPY --from=build /app/client/client-admin/dist /usr/share/nginx/html/noi-bo
EXPOSE 80
