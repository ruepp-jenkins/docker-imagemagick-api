# ImageMagick API

Eine RESTful API für ImageMagick-Funktionalitäten, die in einem Docker-Container läuft.

## Features

- **Swagger UI** - Interaktive API-Dokumentation und Browser-basiertes Testen
- **Terminal Dithering Effect** - Floyd-Steinberg Dithering für Terminal-Anzeige
- **Image Resize** - Größenänderung mit automatischer Seitenverhältnis-Berechnung
- **Format Conversion** - Konvertierung zwischen verschiedenen Bildformaten
- **Rotation & Flip** - Bilder drehen und spiegeln
- **Image Cropping** - Manuelle oder automatische Zuschneidung
- **Image Optimization** - Qualitätsoptimierung für kleinere Dateigrößen
- **Optional Authentication** - Token-basierte Authentifizierung
- **Parallel Processing** - Asynchrone Verarbeitung mehrerer Anfragen

## Quick Start

### Mit Docker Compose (empfohlen)

```bash
# 1. Repository klonen oder Dateien herunterladen
cd imagemagick-api

# 2. Container bauen und starten
docker-compose up -d

# 3. API ist verfügbar auf http://localhost:3000
curl http://localhost:3000/health

# 4. Öffnen Sie Swagger UI im Browser zum Testen
# http://localhost:3000/api-docs
```

### Swagger UI - Browser-basiertes Testen

Nach dem Start können Sie die API direkt im Browser testen:

1. Öffnen Sie **http://localhost:3000/api-docs** in Ihrem Browser
2. Sie sehen eine interaktive API-Dokumentation
3. Klicken Sie auf einen Endpunkt (z.B. `/terminal`)
4. Klicken Sie auf "Try it out"
5. Laden Sie ein Bild hoch und klicken Sie auf "Execute"
6. Die Response wird direkt im Browser angezeigt

**Authentifizierung in Swagger:**

- Falls `API_TOKEN` gesetzt ist, klicken Sie auf "Authorize" (oben rechts)
- Geben Sie Ihren Token ein (ohne "Bearer")
- Klicken Sie auf "Authorize" und schließen Sie das Fenster

````

### Mit Docker

```bash
# Image bauen
docker build -t imagemagick-api .

# Container starten
docker run -d -p 3000:3000 --name imagemagick-api imagemagick-api

# Mit Authentifizierung
docker run -d -p 3000:3000 -e API_TOKEN="your-secret-token" imagemagick-api
````

## Konfiguration

### Umgebungsvariablen

| Variable        | Beschreibung                                     | Default            |
| --------------- | ------------------------------------------------ | ------------------ |
| `API_TOKEN`     | Optional: API-Token für Authentifizierung        | (leer, keine Auth) |
| `PORT`          | Server-Port                                      | 3000               |
| `NODE_ENV`      | Umgebung (production/development)                | production         |
| `MAX_FILE_SIZE` | Maximale Upload-Größe in Bytes                   | 52428800 (50 MB)   |
| `CLEANUP_DELAY` | Verzögerung beim Löschen temporärer Dateien (ms) | 0                  |

### Authentifizierung aktivieren

Bearbeiten Sie die `docker-compose.yml` und setzen Sie `API_TOKEN`:

```yaml
environment:
  - API_TOKEN=mein-geheimes-token-12345
```

Oder beim direkten Start mit Docker:

```bash
docker run -d -p 3000:3000 -e API_TOKEN="mein-geheimes-token-12345" imagemagick-api
```

Anfragen müssen dann den Token im Header enthalten:

```bash
Authorization: Bearer mein-geheimes-token-12345
```

## API Endpunkte

### GET /

API-Informationen und verfügbare Endpunkte

```bash
curl http://localhost:3000/
```

### GET /health

Health-Check Endpunkt

```bash
curl http://localhost:3000/health
```

### POST /terminal

Terminal-Dithering-Effekt anwenden (Floyd-Steinberg Dithering)

**Parameter:**

- `image` (file, required) - Bilddatei

**Beispiel:**

```bash
curl -X POST http://localhost:3000/terminal \
  -F "image=@innenstadt.png" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "format": "png",
  "effect": "terminal-dithering"
}
```

### POST /resize

Bildgröße ändern mit optionaler Seitenverhältnis-Berechnung

**Parameter:**

- `image` (file, required) - Bilddatei
- `width` (number, optional) - Zielbreite in Pixel
- `height` (number, optional) - Zielhöhe in Pixel
- `format` (string, required) - Ausgabeformat (png, jpg, webp, etc.)

**Verhalten:**

- Beide angegeben: Exakte Größe (kann verzerren)
- Nur width: Höhe wird automatisch berechnet
- Nur height: Breite wird automatisch berechnet

**Beispiel:**

```bash
curl -X POST http://localhost:3000/resize \
  -F "image=@photo.jpg" \
  -F "width=800" \
  -F "format=png" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "format": "png",
  "width": 800,
  "height": "auto"
}
```

### POST /convert

Bildformat konvertieren

**Parameter:**

- `image` (file, required) - Bilddatei
- `format` (string, required) - Zielformat (png, jpg, webp, gif, bmp, tiff, svg)
- `quality` (number, optional) - Qualität für JPG/WebP (1-100)

**Beispiel:**

```bash
curl -X POST http://localhost:3000/convert \
  -F "image=@image.png" \
  -F "format=jpg" \
  -F "quality=85" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "quality": 85
}
```

### POST /rotate

Bild drehen oder spiegeln

**Parameter:**

- `image` (file, required) - Bilddatei
- `operation` (string, required) - "rotate" oder "flip"
- `value` (string/number, required) -
  - Bei rotate: 90, 180, 270 (Grad)
  - Bei flip: "horizontal" oder "vertical"
- `format` (string, required) - Ausgabeformat

**Beispiel Rotation:**

```bash
curl -X POST http://localhost:3000/rotate \
  -F "image=@photo.jpg" \
  -F "operation=rotate" \
  -F "value=90" \
  -F "format=jpg" \
  > response.json
```

**Beispiel Flip:**

```bash
curl -X POST http://localhost:3000/rotate \
  -F "image=@photo.jpg" \
  -F "operation=flip" \
  -F "value=horizontal" \
  -F "format=jpg" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "operation": "rotate",
  "value": "90"
}
```

### POST /crop

Bild zuschneiden

**Parameter:**

- `image` (file, required) - Bilddatei
- `mode` (string, required) - "manual" oder "trim"
- `format` (string, required) - Ausgabeformat

**Für mode="manual":**

- `width` (number, required) - Breite des Zuschnitts
- `height` (number, required) - Höhe des Zuschnitts
- `x` (number, required) - X-Offset
- `y` (number, required) - Y-Offset

**Beispiel Manual Crop:**

```bash
curl -X POST http://localhost:3000/crop \
  -F "image=@photo.jpg" \
  -F "mode=manual" \
  -F "width=500" \
  -F "height=500" \
  -F "x=100" \
  -F "y=50" \
  -F "format=jpg" \
  > response.json
```

**Beispiel Auto-Trim:**

```bash
curl -X POST http://localhost:3000/crop \
  -F "image=@photo.jpg" \
  -F "mode=trim" \
  -F "format=jpg" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "mode": "manual",
  "width": 500,
  "height": 500,
  "x": 100,
  "y": 50
}
```

### POST /optimize

Bildqualität und Dateigröße optimieren

**Parameter:**

- `image` (file, required) - Bilddatei
- `quality` (number, required) - Qualität 1-100 (niedriger = kleinere Datei)
- `format` (string, required) - Ausgabeformat

**Beispiel:**

```bash
curl -X POST http://localhost:3000/optimize \
  -F "image=@photo.jpg" \
  -F "quality=70" \
  -F "format=jpg" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "quality": 70
}
```

## Response Format

Alle Endpunkte liefern JSON-Responses:

### Erfolg

```json
{
  "success": 1,
  "image": "base64-encoded-image-data",
  "format": "png",
  ...
}
```

### Fehler

```json
{
  "success": 0,
  "errormessage": "Fehlerbeschreibung"
}
```

## Base64 zu Datei konvertieren

Das `image` Feld enthält Base64-kodierte Bilddaten. So konvertieren Sie diese:

### JavaScript/Node.js

```javascript
const fs = require("fs");
const response = require("./response.json");

const buffer = Buffer.from(response.image, "base64");
fs.writeFileSync("output.png", buffer);
```

### Python

```python
import json
import base64

with open('response.json', 'r') as f:
    response = json.load(f)

image_data = base64.b64decode(response['image'])
with open('output.png', 'wb') as f:
    f.write(image_data)
```

### Bash

```bash
cat response.json | jq -r '.image' | base64 -d > output.png
```

## Unterstützte Bildformate

- PNG
- JPEG/JPG
- WebP
- GIF
- BMP
- TIFF
- SVG

## Architektur

```
imagemagick-api/
├── src/
│   ├── middleware/
│   │   ├── auth.js              # Authentifizierungs-Middleware
│   │   └── errorHandler.js      # Globaler Error Handler
│   ├── routes/
│   │   ├── terminal.js          # Terminal Dithering Endpoint
│   │   ├── resize.js            # Resize Endpoint
│   │   ├── convert.js           # Format Conversion Endpoint
│   │   ├── rotate.js            # Rotation/Flip Endpoint
│   │   ├── crop.js              # Crop Endpoint
│   │   └── optimize.js          # Optimization Endpoint
│   ├── utils/
│   │   ├── fileHandler.js       # Datei-Management Utilities
│   │   ├── imagemagick.js       # ImageMagick Command Wrapper
│   │   └── response.js          # Response Formatting
│   └── server.js                # Express Server & Routing
├── tmpfiles/                    # Temporäre Dateien (automatisch erstellt)
├── Dockerfile                   # Docker Build Konfiguration
├── docker-compose.yml           # Docker Compose Konfiguration
├── package.json                 # Node.js Dependencies
└── .env.example                 # Beispiel Konfiguration
```

## Fehlerbehandlung

Die API behandelt verschiedene Fehlertypen:

- **401 Unauthorized** - Fehlender Authorization Header
- **403 Forbidden** - Ungültiger API-Token
- **413 Payload Too Large** - Datei überschreitet MAX_FILE_SIZE
- **400 Bad Request** - Fehlende oder ungültige Parameter
- **404 Not Found** - Unbekannter Endpunkt
- **500 Internal Server Error** - ImageMagick oder Server-Fehler

## Entwicklung

### Lokale Entwicklung ohne Docker

```bash
# Dependencies installieren
npm install

# ImageMagick installieren (je nach OS)
# macOS:
brew install imagemagick

# Ubuntu/Debian:
sudo apt-get install imagemagick

# Development Server starten
npm run dev
```

### Logs anzeigen

```bash
# Docker Compose Logs
docker-compose logs -f

# Docker Logs
docker logs -f imagemagick-api
```

## Performance & Skalierung

- **Parallele Verarbeitung**: Node.js verarbeitet mehrere Anfragen asynchron
- **Resource Limits**: In docker-compose.yml konfigurierbar
- **Automatisches Cleanup**: Temporäre Dateien werden sofort gelöscht
- **Health Check**: Container-Health-Monitoring integriert

## Sicherheit

- **Optional Authentication**: Token-basierte Authentifizierung
- **File Size Limits**: Schutz vor zu großen Uploads
- **MIME Type Validation**: Nur Bilddateien werden akzeptiert
- **Temporary File Isolation**: Sichere Verarbeitung in tmpfiles/
- **Error Information**: Keine sensitiven Daten in Fehlermeldungen

## Troubleshooting

### Container startet nicht

```bash
docker-compose logs
```

### ImageMagick Befehle funktionieren nicht

Prüfen Sie ob alle Dependencies installiert sind:

```bash
docker exec -it imagemagick-api sh
magick --version
```

### Temporäre Dateien werden nicht gelöscht

Prüfen Sie `CLEANUP_DELAY` in der Konfiguration.

## Support

Bei Problemen oder Fragen erstellen Sie bitte ein Issue im Repository.
