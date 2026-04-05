FROM node:20-alpine
WORKDIR /app/finance-service
ENV NODE_PATH=/app/finance-service/node_modules
COPY finance-service/package*.json ./
RUN npm install --omit=dev
COPY finance-service/ ./
COPY shared/ ../shared/
EXPOSE 5005
CMD ["npm", "start"]
