-- ============================================================================
-- EL ARCHIVO 09 - Esquema de Base de Datos (MySQL 8.4)
-- Separación estricta en 3 capas:
--   CAPA A (Permanente / Inmutable al morir):
--     investigation_entries, solved_puzzles, explored_rooms, death_history
--   CAPA B (Temporal de Supervivencia / Se reinicia al morir):
--     survival_states
--   CAPA C (Último Punto de Control / Fuente de restauración):
--     checkpoint_states
-- ============================================================================

CREATE DATABASE IF NOT EXISTS archivo09
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE archivo09;

-- 1. Usuarios / Investigadores
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

-- 2. Partidas guardadas por usuario
CREATE TABLE IF NOT EXISTS save_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  slot_name VARCHAR(80) NOT NULL DEFAULT 'Expediente #09',
  death_count INT NOT NULL DEFAULT 0,
  play_time_seconds INT NOT NULL DEFAULT 0,
  ending_reached VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_save_slots_user (user_id),
  CONSTRAINT fk_save_slots_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. CAPA C: Estado del último Punto de Control (Nodo de Estabilización)
CREATE TABLE IF NOT EXISTS checkpoint_states (
  id INT AUTO_INCREMENT PRIMARY KEY,
  save_slot_id INT NOT NULL,
  checkpoint_key VARCHAR(64) NOT NULL DEFAULT 'cp_celda_b04',
  room_key VARCHAR(64) NOT NULL DEFAULT 'celda_b04',
  pos_x FLOAT NOT NULL DEFAULT 180,
  pos_y FLOAT NOT NULL DEFAULT 180,
  hp INT NOT NULL DEFAULT 100,
  sanity INT NOT NULL DEFAULT 100,
  battery FLOAT NOT NULL DEFAULT 100,
  consumables_json JSON NOT NULL,
  saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_checkpoint_save (save_slot_id),
  CONSTRAINT fk_checkpoint_save
    FOREIGN KEY (save_slot_id) REFERENCES save_slots(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. CAPA B: Progreso temporal de supervivencia (se reinicia al morir excepto objetos clave)
CREATE TABLE IF NOT EXISTS survival_states (
  id INT AUTO_INCREMENT PRIMARY KEY,
  save_slot_id INT NOT NULL,
  room_key VARCHAR(64) NOT NULL DEFAULT 'celda_b04',
  pos_x FLOAT NOT NULL DEFAULT 180,
  pos_y FLOAT NOT NULL DEFAULT 180,
  hp INT NOT NULL DEFAULT 100,
  sanity INT NOT NULL DEFAULT 100,
  stamina FLOAT NOT NULL DEFAULT 100,
  battery FLOAT NOT NULL DEFAULT 100,
  consumables_json JSON NOT NULL,
  key_items_json JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_survival_save (save_slot_id),
  CONSTRAINT fk_survival_save
    FOREIGN KEY (save_slot_id) REFERENCES save_slots(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. CAPA A: Archivo de Investigación (INMUTABLE AL MORIR)
-- Restricción UNIQUE (save_slot_id, entry_key) garantiza cero duplicados a nivel de BD
CREATE TABLE IF NOT EXISTS investigation_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  save_slot_id INT NOT NULL,
  entry_key VARCHAR(100) NOT NULL,
  category ENUM('document', 'photo', 'recording', 'code', 'clue', 'event') NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  content_data JSON NULL,
  location_room VARCHAR(100) NOT NULL,
  is_resolved TINYINT(1) NOT NULL DEFAULT 0,
  discovered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_save_entry (save_slot_id, entry_key),
  INDEX idx_investigation_save_cat (save_slot_id, category),
  CONSTRAINT fk_investigation_save
    FOREIGN KEY (save_slot_id) REFERENCES save_slots(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. CAPA A: Enigmas resueltos (INMUTABLE AL MORIR)
CREATE TABLE IF NOT EXISTS solved_puzzles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  save_slot_id INT NOT NULL,
  puzzle_key VARCHAR(100) NOT NULL,
  puzzle_title VARCHAR(180) NOT NULL,
  solution_summary VARCHAR(255) NOT NULL,
  location_room VARCHAR(100) NOT NULL,
  solved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_save_puzzle (save_slot_id, puzzle_key),
  CONSTRAINT fk_solved_puzzles_save
    FOREIGN KEY (save_slot_id) REFERENCES save_slots(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. CAPA A: Habitaciones exploradas (INMUTABLE AL MORIR)
CREATE TABLE IF NOT EXISTS explored_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  save_slot_id INT NOT NULL,
  room_key VARCHAR(64) NOT NULL,
  room_name VARCHAR(120) NOT NULL,
  first_visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visit_count INT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_save_room (save_slot_id, room_key),
  CONSTRAINT fk_explored_rooms_save
    FOREIGN KEY (save_slot_id) REFERENCES save_slots(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. CAPA A: Historial de muertes (INMUTABLE AL MORIR)
CREATE TABLE IF NOT EXISTS death_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  save_slot_id INT NOT NULL,
  death_number INT NOT NULL,
  cause VARCHAR(200) NOT NULL,
  enemy_type VARCHAR(80) NOT NULL DEFAULT 'desconocido',
  location_room VARCHAR(100) NOT NULL,
  checkpoint_restored VARCHAR(64) NOT NULL,
  died_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_death_save_num (save_slot_id, death_number),
  CONSTRAINT fk_death_history_save
    FOREIGN KEY (save_slot_id) REFERENCES save_slots(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
