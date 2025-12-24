# Use Debian Bookworm with Node.js LTS
FROM node:lts-bookworm

# Install ImageMagick and required dependencies
RUN apt-get update && apt-get install -y \
    imagemagick \
    librsvg2-bin \
    inkscape \
    fontconfig \
    libfreetype6 \
    libpng16-16 \
    libjpeg62-turbo \
    dnsutils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Create temporary files directory
RUN mkdir -p /app/tmpfiles && chmod 777 /app/tmpfiles

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
