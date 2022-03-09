# build environment
FROM node:14.16.0-alpine as build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN npm install -g @vercel/ncc@0.33.3
RUN npx ncc build src/server/main.ts 

# production environment
FROM node:14.16.0-alpine
COPY --from=build /app/dist/index.js .    
ENTRYPOINT sh -c "node index.js"