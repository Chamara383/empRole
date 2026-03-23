FROM node:20-alpine
WORKDIR /app/auth-service
ENV NODE_PATH=/app/auth-service/node_modules
COPY auth-service/package*.json ./
RUN npm install --omit=dev
COPY auth-service/ ./
COPY shared/ ../shared/
EXPOSE 5003
CMD ["npm", "start"]
