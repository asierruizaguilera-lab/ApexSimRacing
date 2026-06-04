# APEX SimRacing — Guía de Configuración

## 1. Configurar variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores:

```bash
# Mínimo para funcionar en local:
NEXTAUTH_SECRET=cualquier-texto-largo-aleatorio
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://USUARIO:CONTRASEÑA@localhost:5432/apex_db
```

## 2. Configurar PostgreSQL

### Opción A: PostgreSQL local
```bash
# Crea la base de datos
psql -U postgres -c "CREATE DATABASE apex_db;"
```

### Opción B: Supabase (gratis)
1. Ve a https://supabase.com → Nuevo proyecto
2. Copia la "Connection string" de Settings → Database
3. Pégala en DATABASE_URL

### Opción C: Railway (para producción)
1. railway new → Add PostgreSQL
2. Copia la DATABASE_URL desde las variables de entorno del proyecto

## 3. Inicializar la base de datos

```bash
cd apex

# Crear tablas
npm run db:push

# Insertar datos de prueba
npm run db:seed
```

## 4. Discord OAuth (opcional)

1. Ve a https://discord.com/developers/applications
2. Crea una nueva aplicación
3. En OAuth2 → Redirects, añade: `http://localhost:3000/api/auth/callback/discord`
4. Copia Client ID y Client Secret a `.env.local`

## 5. Arrancar en desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Cuentas de prueba

| Rol   | Email              | Contraseña  |
|-------|--------------------|-------------|
| Admin | admin@apex.gg      | admin123    |
| Piloto| max@apex.gg        | piloto123   |
| Piloto| karlos@apex.gg     | piloto123   |

## Deploy en Railway

1. `railway login` y `railway new`
2. Conecta el repositorio GitHub
3. Añade PostgreSQL al proyecto
4. Añade las variables de entorno (NEXTAUTH_SECRET, DISCORD_*)
5. Railway usa `npm run start` (node server.js) automáticamente
