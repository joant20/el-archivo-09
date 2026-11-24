import { pool } from '../config/db.js';
import { investigationModel } from '../models/investigationModel.js';
import { puzzleModel } from '../models/puzzleModel.js';
import { survivalModel } from '../models/survivalModel.js';
import { saveModel } from '../models/saveModel.js';

export const deathMemoryService = {
  /**
   * Hidrata una partida completa devolviendo explícitamente las 3 capas separadas:
   * - permanent (Capa A): investigationEntries, solvedPuzzles, exploredRooms, deathHistory
   * - survival (Capa B): estado temporal actual (hp, cordura, batería, consumibles, posición)
   * - checkpoint (Capa C): último Nodo de Estabilización
   */
  async loadFullSaveState(saveSlotId, userId, connection = pool) {
    const slot = await saveModel.findOwnedSlot(saveSlotId, userId, connection);
    if (!slot) return null;

    const [
      investigationEntries,
      solvedPuzzles,
      exploredRooms,
      deathHistory,
      survivalState,
      checkpointState,
    ] = await Promise.all([
      investigationModel.listEntries(saveSlotId, connection),
      puzzleModel.listSolved(saveSlotId, connection),
      investigationModel.listExploredRooms(saveSlotId, connection),
      investigationModel.listDeathHistory(saveSlotId, connection),
      survivalModel.getSurvivalState(saveSlotId, connection),
      survivalModel.getCheckpointState(saveSlotId, connection),
    ]);

    return {
      meta: slot,
      permanent: {
        investigationEntries,
        solvedPuzzles,
        exploredRooms,
        deathHistory,
      },
      survival: survivalState,
      checkpoint: checkpointState,
    };
  },

  /**
   * MECÁNICA CENTRAL: Muerte con Memoria Permanente (Transacción ACID).
   * 1. Incrementa el contador de muertes en save_slots.
   * 2. Registra la muerte en death_history (Capa A).
   * 3. Registra el acontecimiento en investigation_entries (Capa A).
   * 4. Lee el último punto de control (Capa C).
   * 5. Restaura survival_states (Capa B) desde Capa C, conservando objetos clave (key_items_json).
   * 6. JAMÁS modifica ni elimina documentos, fotos, grabaciones, códigos, pistas, habitaciones ni enigmas resueltos.
   */
  async handlePlayerDeath(saveSlotId, userId, { cause, enemyType, locationRoom }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const slot = await saveModel.findOwnedSlot(saveSlotId, userId, connection);
      if (!slot) {
        await connection.rollback();
        return null;
      }

      const nextDeathNumber = Number(slot.death_count || 0) + 1;

      await connection.query(
        'UPDATE save_slots SET death_count = ? WHERE id = ?',
        [nextDeathNumber, saveSlotId]
      );

      // Leer Capa C (último punto de control)
      const checkpoint = await survivalModel.getCheckpointState(saveSlotId, connection);
      if (!checkpoint) {
        throw new Error('No se encontró un punto de control válido para esta partida.');
      }

      // Guardar en historial de muertes (Capa A - Inmutable)
      await connection.query(
        `INSERT INTO death_history
           (save_slot_id, death_number, cause, enemy_type, location_room, checkpoint_restored)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          saveSlotId,
          nextDeathNumber,
          cause || 'Colapso vital en las instalaciones',
          enemyType || 'entidad_desconocida',
          locationRoom || 'Ubicación desconocida',
          checkpoint.checkpoint_key,
        ]
      );

      // Registrar acontecimiento en el Archivo de Investigación (Capa A - Inmutable)
      await investigationModel.recordEntry(
        saveSlotId,
        {
          entryKey: `evt_muerte_${nextDeathNumber}`,
          category: 'event',
          title: `Reconstrucción #${nextDeathNumber} tras fallecimiento`,
          description: `Causa: ${cause || 'Ataque letal'} (${enemyType || 'amenaza desconocida'}). Tu cuerpo fue reconstruido en el Nodo ${checkpoint.checkpoint_key}; tu memoria e investigación permanecieron intactas.`,
          contentData: {
            deathNumber: nextDeathNumber,
            enemyType: enemyType || 'entidad_desconocida',
            checkpointRestored: checkpoint.checkpoint_key,
          },
          locationRoom: locationRoom || 'Instalación Archivo 09',
          isResolved: true,
        },
        connection
      );

      // Restaurar Capa B (survival_states) desde Capa C (checkpoint_states)
      // Importante: key_items_json NO se borra para que enigmas ya resueltos no puedan bloquear la partida
      await connection.query(
        `UPDATE survival_states
         SET room_key = ?,
             pos_x = ?,
             pos_y = ?,
             hp = ?,
             sanity = ?,
             stamina = 100,
             battery = ?,
             consumables_json = ?
         WHERE save_slot_id = ?`,
        [
          checkpoint.room_key,
          checkpoint.pos_x,
          checkpoint.pos_y,
          checkpoint.hp,
          checkpoint.sanity,
          checkpoint.battery,
          JSON.stringify(checkpoint.consumables),
          saveSlotId,
        ]
      );

      await connection.commit();

      // Devolver el estado completo recién consolidado
      return await this.loadFullSaveState(saveSlotId, userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
