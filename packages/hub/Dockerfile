FROM node:10.1.0-alpine

WORKDIR /app

COPY package.json /app/
COPY package-lock.json /app/

RUN npm i --production
#&& npm cache clean

COPY . /app

ENV NODE_ENV production
ENTRYPOINT ["node", "./index.js"]
