# build environment
FROM node:14.19.3-alpine as build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
RUN rm -r src
RUN mv dist src
RUN npm install -g @vercel/ncc@0.34.0
RUN npx ncc build src/server/main.js

# production environment
FROM node:14.19.3-alpine
RUN apk add --no-cache \
  git \
  openssh-client \
  ca-certificates
COPY --from=build /app/dist/index.js .    
# For reading the version number
COPY --from=build /app/package.json .
RUN npm install -g forever@4.0.3
ENTRYPOINT sh -c "forever index.js"