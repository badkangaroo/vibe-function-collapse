import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project } from '../types';

interface WFCDB extends DBSchema {
  projects: {
    key: string; // Project Name
    value: Project;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'wfc-projects';
const DB_VERSION = 1;

/**
 * Storage Utility class for IndexedDB operations
 */
export class StorageUtil {
  private static dbPromise: Promise<IDBPDatabase<WFCDB>> | null = null;

  /**
   * Initialize and return DB connection
   */
  private static getDB(): Promise<IDBPDatabase<WFCDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<WFCDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore('projects', { keyPath: 'name' });
          store.createIndex('by-date', 'modifiedAt');
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Save a project to IndexedDB
   */
  static async saveProject(project: Project): Promise<void> {
    const db = await this.getDB();
    await db.put('projects', project);
  }

  /**
   * Load a project by name
   */
  static async loadProject(name: string): Promise<Project | undefined> {
    const db = await this.getDB();
    return db.get('projects', name);
  }

  /**
   * Get all saved projects
   */
  static async getAllProjects(): Promise<Project[]> {
    const db = await this.getDB();
    // Sort by modifiedAt desc
    const projects = await db.getAllFromIndex('projects', 'by-date');
    return projects.reverse();
  }

  /**
   * Delete a project
   */
  static async deleteProject(name: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('projects', name);
  }
}
