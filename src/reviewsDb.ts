const DB_NAME = "SimpleLogDB";
const STORE_NAME = "logs";
const DB_VERSION = 1;

interface Review {
  mora: string;
  text: string;
  durationMs: number;
}

interface LogEntry {
  timestamp: number;
  data: Record<string, any>;
}

let dbInstance: IDBDatabase | null = null;

async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "timestamp" });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function insertLog(data: Review): Promise<void> {
  console.log("logging", data);
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const entry: LogEntry = { timestamp: Date.now(), data };
  store.add(entry);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportLogsAsCSV(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    const logs: LogEntry[] = request.result;
    const csvContent = ["timestamp,data"]
      .concat(logs.map((log) => `${log.timestamp},${JSON.stringify(log.data)}`))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
}
