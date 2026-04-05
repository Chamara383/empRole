FROM node:20-alpine
WORKDIR /app/gateway-service
ENV NODE_PATH=/app/gateway-service/node_modules
COPY gateway-service/package*.json ./
RUN npm install --omit=dev
COPY gateway-service/ ./
COPY shared/ ../shared/
EXPOSE 5002
CMD ["npm", "start"]
