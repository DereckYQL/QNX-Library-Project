-- A backup restore rotates this epoch so pre-restore tokens cannot be reused.
CREATE TABLE SecurityState(id INTEGER PRIMARY KEY CHECK(id=1), epoch TEXT NOT NULL);
INSERT INTO SecurityState(id,epoch) VALUES(1,lower(hex(randomblob(32))));
