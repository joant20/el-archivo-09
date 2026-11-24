import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Seguridad de la Capa A: deathMemoryService nunca ejecuta DELETE sobre tablas de investigación', () => {
  const servicePath = path.resolve(__dirname, '../services/deathMemoryService.js');
  const source = fs.readFileSync(servicePath, 'utf8');

  assert.match(source, /beginTransaction/, 'Debe usar transacción ACID al registrar una muerte');
  assert.match(source, /commit/, 'Debe confirmar la transacción atómicamente');
  assert.match(source, /rollback/, 'Debe revertir en caso de error');
  assert.match(source, /INSERT INTO death_history/, 'Debe registrar cada muerte en death_history');
  assert.match(source, /UPDATE survival_states/, 'Debe restaurar Capa B desde checkpoint');

  // Garantía estructural: nunca borrar tablas de Capa A al morir
  assert.doesNotMatch(source, /DELETE\s+FROM\s+investigation_entries/i);
  assert.doesNotMatch(source, /DELETE\s+FROM\s+solved_puzzles/i);
  assert.doesNotMatch(source, /DELETE\s+FROM\s+explored_rooms/i);
  assert.doesNotMatch(source, /DELETE\s+FROM\s+death_history/i);
});

test('Esquema SQL: restricciones UNIQUE contra duplicados presentes en init.sql', () => {
  const initSqlPath = path.resolve(__dirname, '../../../database/init.sql');
  const sql = fs.readFileSync(initSqlPath, 'utf8');

  assert.match(sql, /UNIQUE KEY uq_save_entry \(save_slot_id, entry_key\)/);
  assert.match(sql, /UNIQUE KEY uq_save_puzzle \(save_slot_id, puzzle_key\)/);
  assert.match(sql, /UNIQUE KEY uq_save_room \(save_slot_id, room_key\)/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS death_history/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS checkpoint_states/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS survival_states/);
});
