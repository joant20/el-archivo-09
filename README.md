# EL ARCHIVO 09

Videojuego **3D en primera persona** de **terror psicológico, supervivencia e investigación deductiva** desarrollado con **Three.js (WebGL2 PBR) + React + Tailwind CSS + Node.js + Express + MySQL 8.4 + Docker Compose**.

## Cómo iniciar el proyecto (1 solo comando)

1. Asegúrate de tener **Docker Desktop** abierto.
2. Si aún no existe el archivo `.env`, copia la plantilla:
   ```bash
   cp .env.example .env
   ```
3. Inicia todos los servicios (Base de Datos MySQL 8.4, Backend Express y Frontend):
   ```bash
   docker compose up --build
   ```
4. Abre el juego en tu navegador:
   - **Juego**: `http://localhost:5173`
   - **Estado de la API**: `http://localhost:8080/api/health`

Para detener los servicios **sin borrar tus partidas ni tu base de datos**:
```bash
docker compose down
```

## Separación de Estado (Mecánica de Muerte y Memoria)

- **Capa A — Progreso Permanente de Investigación (`investigation_entries`, `solved_puzzles`, `explored_rooms`, `death_history`)**: Nunca se borra al morir. Cada descubrimiento guarda fecha, hora, ubicación y descripción sin duplicados (`UNIQUE KEY`).
- **Capa B — Progreso Temporal de Supervivencia (`survival_states`)**: Salud, cordura, resistencia, batería y consumibles que se reinician al último punto de control tras morir.
- **Capa C — Último Punto de Control (`checkpoint_states`)**: Instantánea del último Nodo de Estabilización usado para reconstruir al jugador tras morir.

## Pruebas automatizadas del Backend

Con los servicios levantados (`docker compose up -d`):
```bash
npm --prefix backend test
```
