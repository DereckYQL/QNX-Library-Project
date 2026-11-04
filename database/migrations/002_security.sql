ALTER TABLE Usuarios ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Usuarios ADD COLUMN deleted_at TEXT DEFAULT NULL;
ALTER TABLE Libros ADD COLUMN deleted_at TEXT DEFAULT NULL;
CREATE TRIGGER IF NOT EXISTS historial_usuario_no_borrar BEFORE DELETE ON Usuarios
      WHEN EXISTS(SELECT 1 FROM Prestamos WHERE usuario_id=OLD.id)
      BEGIN SELECT RAISE(ABORT,'Usuario con historial; usa baja logica'); END;
    CREATE TRIGGER IF NOT EXISTS historial_libro_no_borrar BEFORE DELETE ON Libros
      WHEN EXISTS(SELECT 1 FROM Prestamos WHERE libro_id=OLD.id)
      BEGIN SELECT RAISE(ABORT,'Libro con historial; usa baja logica'); END;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamo_pendiente_unico ON Prestamos(usuario_id,libro_id) WHERE estado IN ('activo','vencido');
    CREATE TRIGGER IF NOT EXISTS stock_no_negativo_insert BEFORE INSERT ON Libros WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT,'stock negativo'); END;
    CREATE TRIGGER IF NOT EXISTS stock_no_negativo_update BEFORE UPDATE OF stock ON Libros WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT,'stock negativo'); END;
