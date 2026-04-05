FROM node:20-alpine
WORKDIR /app/workforce-service
ENV NODE_PATH=/app/workforce-service/node_modules
COPY workforce-service/package*.json ./
RUN npm install --omit=dev
COPY workforce-service/ ./
COPY shared/ ../shared/
EXPOSE 5004
CMD ["npm", "start"]
