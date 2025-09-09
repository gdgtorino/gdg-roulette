# Docker Setup per The Draw

## 🚀 Avvio Rapido

1. **Clona il repository e entra nella directory:**
   ```bash
   cd the_draw
   ```

2. **Copia il file delle variabili d'ambiente:**
   ```bash
   cp .env.example .env
   ```

3. **Avvia tutti i servizi:**
   ```bash
   docker-compose up -d
   ```

4. **Accedi all'applicazione:**
   - **Frontend**: http://localhost:8090
   - **Backend API**: http://localhost:8090/api
   - **Traefik Dashboard**: http://localhost:8091
   - **Redis**: localhost:6380

## 📋 Servizi Inclusi

### 🌐 Traefik (Reverse Proxy)
- **Versione**: v3.1
- **Porte**: 8090 (HTTP), 8443 (HTTPS), 8091 (Dashboard)
- **Features**: Health checks, logging, auto-discovery

### 🗄️ Redis (Database)
- **Versione**: 7-alpine
- **Porta**: 6380
- **Configurazione**: 256MB max memory, LRU eviction
- **Features**: Persistence, health checks

### 🔧 Backend (API Server)
- **Tecnologia**: Node.js 18 + TypeScript
- **Porta**: 3001 (interna)
- **Features**: Health checks, multi-stage build, security optimized
- **Endpoints**: 
  - `/api/health` - Health check
  - `/api/auth/login` - Admin login
  - `/api/events` - Event management

### 🎨 Frontend (Next.js App)
- **Tecnologia**: Next.js 14 + React 18
- **Porta**: 3000 (interna)
- **Features**: Standalone build, health checks, optimized production build

## 🛠️ Comandi Utili

### Sviluppo
```bash
# Avvia in modalità development con logs
docker-compose up

# Ricostruisci le immagini
docker-compose build --no-cache

# Riavvia un singolo servizio
docker-compose restart backend
```

### Produzione
```bash
# Avvia in background
docker-compose up -d

# Visualizza i logs
docker-compose logs -f

# Controlla lo stato dei servizi
docker-compose ps
```

### Pulizia
```bash
# Ferma tutti i servizi
docker-compose down

# Rimuovi anche i volumi (ATTENZIONE: cancellerà i dati Redis)
docker-compose down -v

# Pulisci le immagini non utilizzate
docker system prune
```

## 📊 Monitoring e Health Checks

Tutti i servizi includono health checks:

```bash
# Controlla lo stato dei health checks
docker ps --format "table {{.Names}}\t{{.Status}}"

# Visualizza i dettagli di health check
docker inspect --format='{{json .State.Health}}' the-draw-backend | jq
```

## 🔧 Configurazione

### Variabili d'Ambiente
Modifica il file `.env` per personalizzare:

```bash
JWT_SECRET=your-super-secret-key-here
ADMIN_DEFAULT_USER=admin
ADMIN_DEFAULT_PASSWORD=your-secure-password
```

### Traefik Labels
I servizi sono configurati automaticamente tramite label Traefik:
- Backend: `localhost/api/*`
- Frontend: `localhost/*`

## 🔍 Troubleshooting

### I servizi non si avviano
```bash
# Controlla i logs
docker-compose logs

# Verifica lo stato dei container
docker-compose ps
```

### Problemi di connessione Redis
```bash
# Testa la connessione Redis
docker-compose exec redis redis-cli ping
```

### Health check falliti
```bash
# Controlla i logs del servizio specifico
docker-compose logs backend

# Testa manualmente l'endpoint health
curl http://localhost:8090/api/health
```

## 🚀 Deployment in Produzione

1. **Modifica le variabili d'ambiente** nel file `.env`
2. **Usa un JWT secret forte** e password sicure
3. **Configura HTTPS** se necessario
4. **Monitora i logs** con un sistema di logging esterno

## 📈 Performance

Il setup è ottimizzato per:
- ✅ Build multi-stage per immagini leggere
- ✅ Cache delle dipendenze
- ✅ Health checks per reliability
- ✅ Restart policy automatico
- ✅ Resource limits su Redis
- ✅ Security best practices