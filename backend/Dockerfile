FROM node:22-alpine

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de capas de Docker
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código fuente
COPY src ./src

# Ejecutar como usuario no-root por seguridad
RUN chown -R node:node /app
USER node

EXPOSE 8080

CMD ["node", "src/server.js"]
