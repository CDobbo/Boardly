import { db, convertDoc, convertCollection } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export class FirestoreService {
  constructor(collectionName) {
    this.collection = db.collection(collectionName);
  }

  async create(data) {
    const docData = {
      ...data,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };
    
    const docRef = await this.collection.add(docData);
    const doc = await docRef.get();
    return convertDoc(doc);
  }

  async findById(id) {
    const doc = await this.collection.doc(id.toString()).get();
    return convertDoc(doc);
  }

  async findAll(conditions = {}) {
    let query = this.collection;
    
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.where(key, '==', value);
    });
    
    const querySnapshot = await query.get();
    return convertCollection(querySnapshot);
  }

  async findOne(conditions = {}) {
    const results = await this.findAll(conditions);
    return results.length > 0 ? results[0] : null;
  }

  async update(id, data) {
    const updateData = {
      ...data,
      updated_at: FieldValue.serverTimestamp()
    };
    
    await this.collection.doc(id.toString()).update(updateData);
    return this.findById(id);
  }

  async delete(id) {
    await this.collection.doc(id.toString()).delete();
    return { success: true };
  }

  async count(conditions = {}) {
    const results = await this.findAll(conditions);
    return results.length;
  }

  // Custom queries
  async findByMultiple(conditions = {}) {
    let query = this.collection;
    
    Object.entries(conditions).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.where(key, 'in', value);
      } else {
        query = query.where(key, '==', value);
      }
    });
    
    const querySnapshot = await query.get();
    return convertCollection(querySnapshot);
  }

  async findWithOrder(orderBy, direction = 'asc', conditions = {}) {
    let query = this.collection;
    
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.where(key, '==', value);
    });
    
    query = query.orderBy(orderBy, direction);
    
    const querySnapshot = await query.get();
    return convertCollection(querySnapshot);
  }
}

// Create service instances
export const usersService = new FirestoreService('users');
export const projectsService = new FirestoreService('projects');
export const boardsService = new FirestoreService('boards');
export const columnsService = new FirestoreService('columns');
export const tasksService = new FirestoreService('tasks');
export const projectMembersService = new FirestoreService('project_members');
export const eventsService = new FirestoreService('events');
export const diaryService = new FirestoreService('diary_entries');
export const goalsService = new FirestoreService('goals');