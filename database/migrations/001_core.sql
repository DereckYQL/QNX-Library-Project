CREATE TABLE IF NOT EXISTS Libros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      autor TEXT NOT NULL,
      genero TEXT,
      anio INTEGER,
      disponible INTEGER NOT NULL DEFAULT 1,
      stock INTEGER NOT NULL DEFAULT 3,
      imagen_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'visitante' CHECK(rol IN ('admin','visitante','user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Prestamos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      libro_id INTEGER NOT NULL,
      fecha_prestamo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_devolucion DATE DEFAULT NULL,
      fecha_devuelto DATETIME DEFAULT NULL,
      estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo','devuelto','vencido')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (libro_id) REFERENCES Libros(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_libros_genero ON Libros(genero);
    CREATE INDEX IF NOT EXISTS idx_libros_disponible ON Libros(disponible);
    CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON Prestamos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_prestamos_libro ON Prestamos(libro_id);
