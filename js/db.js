// db.js
// IndexedDB wrapper — promise-based CRUD primitives + cascade delete helpers.
// See SCHEMA.md for the full schema documentation.

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StudyTrackerDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      db.createObjectStore("units", {
        keyPath: "id",
        autoIncrement: true
      });

      const subtopics = db.createObjectStore("subtopics", {
        keyPath: "id",
        autoIncrement: true
      });
      subtopics.createIndex("unitId", "unitId", { unique: false });

      const sessions = db.createObjectStore("sessions", {
        keyPath: "id",
        autoIncrement: true
      });
      sessions.createIndex("subtopicId", "subtopicId", { unique: false });
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function addRecord(storeName, record) {
  const db = await openDB();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const request = store.add(record);

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      resolve(event.target.result); // newly generated id
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function getRecord(storeName, id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function updateRecord(storeName, record) {
  const db = await openDB();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const request = store.put(record);

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function deleteRecord(storeName, id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function getAllByIndex(storeName, indexName, value) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// ---- Cascade delete helpers ----
// Note: composed from the primitives above (sequential small transactions)
// rather than one spanning transaction, for simplicity. See SCHEMA.md.

async function deleteSubtopicCascade(subtopicId) {
  const sessions = await getAllByIndex("sessions", "subtopicId", subtopicId);
  for (const session of sessions) {
    await deleteRecord("sessions", session.id);
  }
  await deleteRecord("subtopics", subtopicId);
}

async function deleteUnitCascade(unitId) {
  const subtopics = await getAllByIndex("subtopics", "unitId", unitId);
  for (const subtopic of subtopics) {
    await deleteSubtopicCascade(subtopic.id);
  }
  await deleteRecord("units", unitId);
}