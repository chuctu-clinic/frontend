# Giao diện Phòng khám Chúc Từ: build client-users và client-admin rồi phục vụ bằng nginx.
#   docker build -t chuctu-frontend .
#   docker run -p 8080:80 -e API_UPSTREAM=http://<địa-chỉ-backend>:4000 chuctu-frontend
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY shared/package.json shared/
COPY client-users/package.json client-users/
COPY client-admin/package.json client-admin/
RUN npm ci --ignore-scripts

COPY shared shared
COPY client-users client-users
COPY client-admin client-admin
# Kiểm tra kiểu TypeScript rồi build hai ứng dụng
RUN npm run build

FROM nginx:1.27-alpine
# Địa chỉ API mà nginx chuyển /api tới
ENV API_UPSTREAM=http://host.docker.internal:4000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/client-users/dist /usr/share/nginx/html
COPY --from=build /app/client-admin/dist /usr/share/nginx/html/noi-bo
EXPOSE 80
