# Giao diện Phòng khám Chúc Từ: build ứng dụng rồi phục vụ bằng nginx.
#   docker build -t chuctu-frontend .
#   docker run -p 8080:80 -e API_UPSTREAM=http://dia-chi-backend:4000 chuctu-frontend
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY index.html vite.config.js ./
COPY public public
COPY src src
# Để trống: gọi API cùng địa chỉ (/api, nginx chuyển sang API_UPSTREAM)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
# nginx thay ${API_UPSTREAM} trong template lúc khởi động container
ENV API_UPSTREAM=http://server:4000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
