-- Normalize availability, then maintain it from stock for every SQL writer.
UPDATE Libros SET disponible=CASE WHEN stock>0 THEN 1 ELSE 0 END;
CREATE TRIGGER stock_entero_insert BEFORE INSERT ON Libros
  WHEN typeof(NEW.stock) != 'integer' OR NEW.stock < 0
  BEGIN SELECT RAISE(ABORT,'stock negativo o no entero'); END;
CREATE TRIGGER stock_entero_update BEFORE UPDATE OF stock ON Libros
  WHEN typeof(NEW.stock) != 'integer' OR NEW.stock < 0
  BEGIN SELECT RAISE(ABORT,'stock negativo o no entero'); END;
CREATE TRIGGER disponibilidad_insert AFTER INSERT ON Libros
  WHEN NEW.disponible != CASE WHEN NEW.stock>0 THEN 1 ELSE 0 END
  BEGIN UPDATE Libros SET disponible=CASE WHEN stock>0 THEN 1 ELSE 0 END WHERE id=NEW.id; END;
CREATE TRIGGER disponibilidad_update AFTER UPDATE OF stock,disponible ON Libros
  WHEN NEW.disponible != CASE WHEN NEW.stock>0 THEN 1 ELSE 0 END
  BEGIN UPDATE Libros SET disponible=CASE WHEN stock>0 THEN 1 ELSE 0 END WHERE id=NEW.id; END;
