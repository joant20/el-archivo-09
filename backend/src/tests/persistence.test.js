import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8080';

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('Flujo completo: Registro, Partida, No-Duplicación, Checkpoint y Muerte con Memoria Permanente', async () => {
  // 1. Verificar salud de API + MySQL
  const health = await api('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.database, 'connected');

  // 2. Registrar investigador de prueba único
  const username = `inv_${Date.now()}`;
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password: 'clave_segura_94' }),
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.data.token);
  const authHeader = { Authorization: `Bearer ${reg.data.token}` };

  // 3. Crear partida (inicializa Capas A, B y C)
  const createSave = await api('/api/saves', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ slotName: 'Test Expediente 09' }),
  });
  assert.equal(createSave.status, 201);
  const saveId = createSave.data.save.meta.id;
  assert.equal(createSave.data.save.checkpoint.checkpoint_key, 'cp_celda_b04');

  // 4. Registrar un documento por primera vez
  const docPayload = {
    entryKey: 'doc_memorando_ti',
    category: 'document',
    title: 'Memorando de Políticas TI',
    description: 'Contraseña = apellido del jefe de seguridad + año de fundación.',
    locationRoom: 'Celda de Observación B-04',
  };
  const firstDiscovery = await api(`/api/saves/${saveId}/investigation`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify(docPayload),
  });
  assert.equal(firstDiscovery.status, 201);
  assert.equal(firstDiscovery.data.created, true);

  // 5. Intentar registrar el MISMO documento de nuevo -> debe evitar duplicación
  const duplicateDiscovery = await api(`/api/saves/${saveId}/investigation`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify(docPayload),
  });
  assert.equal(duplicateDiscovery.status, 200);
  assert.equal(duplicateDiscovery.data.created, false);

  // 6. Resolver un enigma (Capa A)
  const solve = await api(`/api/saves/${saveId}/puzzles/solve`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      puzzleKey: 'puzzle_terminal_seguridad',
      puzzleTitle: 'Terminal de Seguridad',
      solutionSummary: 'Contraseña deducida: valdes1989',
      locationRoom: 'Sala de Seguridad y CCTV',
    }),
  });
  assert.equal(solve.status, 201);
  assert.equal(solve.data.created, true);

  // 7. Guardar un nuevo Punto de Control en Enfermería (Capa C) con 90 HP y 2 botiquines
  const cp = await api(`/api/saves/${saveId}/checkpoint`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      checkpointKey: 'cp_enfermeria',
      roomKey: 'enfermeria',
      posX: 420,
      posY: 310,
      hp: 90,
      sanity: 85,
      battery: 75,
      consumables: { medkit: 2, battery: 1, flare: 1 },
      keyItems: ['tarjeta_nivel_2'],
    }),
  });
  assert.equal(cp.status, 200);
  assert.equal(cp.data.checkpoint.checkpoint_key, 'cp_enfermeria');

  // 8. Simular daño y gasto total de consumibles en Capa B (Supervivencia)
  const hurt = await api(`/api/saves/${saveId}/survival`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      roomKey: 'generadores',
      posX: 110,
      posY: 95,
      hp: 5,
      sanity: 20,
      battery: 10,
      consumables: { medkit: 0, battery: 0, flare: 0 },
    }),
  });
  assert.equal(hurt.status, 200);
  assert.equal(hurt.data.survival.hp, 5);

  // 9. SIMULAR MUERTE DEL JUGADOR
  const death = await api(`/api/saves/${saveId}/death`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      cause: 'Atrapado por El Eco en Sala de Generadores',
      enemyType: 'echo_stalker',
      locationRoom: 'Sala de Generadores',
    }),
  });
  assert.equal(death.status, 200);

  const afterDeath = death.data.save;

  // Verificar que Capa B volvió EXACTAMENTE al checkpoint (Capa C)
  assert.equal(afterDeath.survival.room_key, 'enfermeria');
  assert.equal(afterDeath.survival.hp, 90);
  assert.equal(afterDeath.survival.battery, 75);
  assert.equal(afterDeath.survival.consumables.medkit, 2);
  // Verificar que objetos clave NO se perdieron
  assert.ok(afterDeath.survival.keyItems.includes('tarjeta_nivel_2'));

  // Verificar que Capa A (Investigación y Enigmas) PERMANECE 100% INTACTA y sin duplicados
  const docsWithKey = afterDeath.permanent.investigationEntries.filter(
    (e) => e.entry_key === 'doc_memorando_ti'
  );
  assert.equal(docsWithKey.length, 1, 'El documento debe existir exactamente una vez tras morir');
  assert.equal(afterDeath.permanent.solvedPuzzles.length, 1);
  assert.equal(afterDeath.permanent.solvedPuzzles[0].puzzle_key, 'puzzle_terminal_seguridad');

  // Verificar historial de muertes registrado
  assert.equal(afterDeath.meta.death_count, 1);
  assert.equal(afterDeath.permanent.deathHistory.length, 1);
  assert.equal(afterDeath.permanent.deathHistory[0].checkpoint_restored, 'cp_enfermeria');

  // Limpiar partida de prueba
  const del = await api(`/api/saves/${saveId}`, { method: 'DELETE', headers: authHeader });
  assert.equal(del.status, 200);
});
