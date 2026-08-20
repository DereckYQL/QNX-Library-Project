create database if not exists biblioteca_crs
use biblioteca_crs

create table if not exists libros (
    id_lib int auto_increment primary key
    titulo varchar(100) not null, 
    autor varchar(100) not null, 
    genero varchar(100)
    disponibles boolean true
    fecha_registro timestamp default current_timestamp
);

insert into libros (titulo, autor, genero, disponibles) values
("cien años de soledad", "Gabriel Garcia Marques", "Novela", true), 
("1984", "George Orwell", "Ciencia ficcion" true), 
("El Principito", "Antoine de Saint-Exupéry", "Fábula", FALSE),
('Don Quijote de la Mancha', 'Miguel de Cervantes', 'Novela clásica', TRUE);
