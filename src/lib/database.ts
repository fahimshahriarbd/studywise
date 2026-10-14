/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  fetchRowsFromSheet,
  insertRowToSheet,
  updateRowInSheet,
  deleteRowFromSheet,
  fetchAdminFromSheet,
  saveAdminToSheet,
} from './googleSheets';

import { getBangladeshTimeString, getBangladeshDateString, formatDayDate } from './time';
export { getBangladeshTimeString, getBangladeshDateString, formatDayDate };

const ADMIN_USER_KEY = 'studywise_admin_username';
const ADMIN_PIN_KEY = 'studywise_admin_pin';

let memoryAdmin = {
  username: localStorage.getItem(ADMIN_USER_KEY) || 'admin',
  pin: localStorage.getItem(ADMIN_PIN_KEY) || '5678',
};

// Check Google Sheets for updated admin credentials on start
fetchAdminFromSheet().then((creds) => {
  if (creds && creds.username && creds.pin) {
    memoryAdmin = creds;
    localStorage.setItem(ADMIN_USER_KEY, creds.username);
    localStorage.setItem(ADMIN_PIN_KEY, creds.pin);
  }
}).catch(() => {});

export const getAdminCredentials = () => {
  return {
    username: memoryAdmin.username || localStorage.getItem(ADMIN_USER_KEY) || 'admin',
    pin: memoryAdmin.pin || localStorage.getItem(ADMIN_PIN_KEY) || '5678',
  };
};

export const setAdminCredentials = (username: string, pin: string) => {
  memoryAdmin = { username: username.trim(), pin: pin.trim() };
  localStorage.setItem(ADMIN_USER_KEY, username.trim());
  localStorage.setItem(ADMIN_PIN_KEY, pin.trim());
  // Save directly to Google Sheet
  saveAdminToSheet(username.trim(), pin.trim()).catch((err) => {
    console.warn('Could not save admin credentials to Google Sheet:', err);
  });
};

export const resetAdminCredentials = () => {
  memoryAdmin = { username: 'admin', pin: '5678' };
  localStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(ADMIN_PIN_KEY);
  return memoryAdmin;
};

export const verifyAdminCredentials = (inputUsername: string, inputPin: string) => {
  const current = getAdminCredentials();
  const u = inputUsername.trim().toLowerCase();
  const p = inputPin.trim();

  return (
    u === current.username.toLowerCase() &&
    p === current.pin
  );
};

export const verifyAdminCredentialsAsync = async (inputUsername: string, inputPin: string) => {
  let current = getAdminCredentials();
  if (current.username === 'admin' && current.pin === '5678') {
    try {
      const remote = await fetchAdminFromSheet();
      if (remote && remote.username && remote.pin) {
        memoryAdmin = remote;
        localStorage.setItem(ADMIN_USER_KEY, remote.username);
        localStorage.setItem(ADMIN_PIN_KEY, remote.pin);
        current = remote;
      }
    } catch {
      // ignore
    }
  }

  const u = inputUsername.trim().toLowerCase();
  const p = inputPin.trim();

  return (
    u === current.username.toLowerCase() &&
    p === current.pin
  );
};

// Student Profile Editing Permission controlled by Admin
const PROFILE_EDIT_PERMISSION_KEY = 'studywise_allow_profile_edit';

export const getProfileEditPermission = (): boolean => {
  try {
    const val = localStorage.getItem(PROFILE_EDIT_PERMISSION_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

export const setProfileEditPermission = (allowed: boolean) => {
  try {
    localStorage.setItem(PROFILE_EDIT_PERMISSION_KEY, String(allowed));
    window.dispatchEvent(new Event('studywise_permission_changed'));
  } catch {
    // ignore
  }
};

// Per-Student Profile Editing Permission (Individually controlled per student)
export const getStudentProfileEditPermission = (studentId: string, studentRecord?: Student | null): boolean => {
  try {
    const individualKey = `studywise_allow_profile_edit_${studentId}`;
    const individualVal = localStorage.getItem(individualKey);
    if (individualVal !== null) {
      return individualVal === 'true';
    }
    if (studentRecord && typeof studentRecord.edit_allowed === 'boolean') {
      return studentRecord.edit_allowed;
    }
    return false; // Locked by default until admin enables for this student
  } catch {
    return false;
  }
};

export const setStudentProfileEditPermission = (studentId: string, allowed: boolean) => {
  try {
    const individualKey = `studywise_allow_profile_edit_${studentId}`;
    localStorage.setItem(individualKey, String(allowed));
    window.dispatchEvent(new Event('studywise_permission_changed'));
    // Persist to Google Sheet
    supabase.from('students').update({ edit_allowed: allowed }).eq('id', studentId).then(() => {}).catch(() => {});
  } catch {
    // ignore
  }
};

export const format6DigitId = (id: string | number | undefined | null): string => {
  if (!id) return '100001';
  const str = String(id).trim();
  const num = parseInt(str, 10);
  if (!isNaN(num) && num > 0) {
    if (str.length < 6) {
      return str.padStart(6, '0');
    }
    return str;
  }
  return str;
};

export const generateNext6DigitId = (existingIds: (string | number)[]): string => {
  const numericIds = existingIds
    .map((id) => parseInt(String(id).trim(), 10))
    .filter((n) => !isNaN(n) && n >= 100000 && n <= 999999);
  if (numericIds.length > 0) {
    const max = Math.max(...numericIds);
    if (max < 999999) return String(max + 1);
  }
  return '100001';
};

export interface Student {
  id: string;
  name: string;
  class_name: string;
  subjects: string;
  image_url: string | null;
  pin: string;
  created_at: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: 'Male' | 'Female' | string;
  institution?: string;
  guardian_phone?: string;
  blood_group?: string;
  edit_allowed?: boolean;
}

export interface StudyDay {
  id: string;
  student_id: string;
  day_label: string;
  day_date: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  study_day_id: string;
  subject: string;
  short_note: string;
  pdf_url: string | null;
  test_enabled: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  lesson_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  created_at: string;
}

export interface ReviewItem {
  question: string;
  studentChoice: string | null;
  studentText: string;
  correctChoice: string;
  correctText: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizResult {
  id: string;
  student_id: string;
  lesson_id: string;
  score: number;
  total: number;
  percentage: number;
  review: ReviewItem[];
  created_at: string;
}

export function calculateProfileCompleteness(student: Student | null): {
  percent: number;
  isComplete: boolean;
  missingFields: string[];
} {
  if (!student) return { percent: 0, isComplete: false, missingFields: [] };

  const fieldDefs: { key: keyof Student; label: string }[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'class_name', label: 'Class / Grade' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'address', label: 'Address' },
    { key: 'gender', label: 'Gender' },
    { key: 'institution', label: 'Institution' },
    { key: 'guardian_phone', label: "Guardian's Phone" },
    { key: 'image_url', label: 'Profile Photo' },
  ];

  const missingFields: string[] = [];
  let filledCount = 0;

  for (const f of fieldDefs) {
    const val = f.key === 'guardian_phone' 
      ? (student.guardian_phone || student.blood_group) 
      : student[f.key];
    if (val && String(val).trim().length > 0) {
      filledCount++;
    } else {
      missingFields.push(f.label);
    }
  }

  const percent = Math.round((filledCount / fieldDefs.length) * 100);
  return {
    percent,
    isComplete: percent === 100,
    missingFields,
  };
}

// ---------------------------------------------------------------------------
// GOOGLE SHEETS DIRECT DATABASE ADAPTER (ALL OTHER DATABASES DISABLED)
// ---------------------------------------------------------------------------

function saveTableToStorage(tableName: string, data: any[]) {
  try {
    localStorage.setItem(`studywise_cache_${tableName}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not save ${tableName} to localStorage:`, e);
  }
}

function loadTableFromStorage(tableName: string): any[] {
  try {
    const raw = localStorage.getItem(`studywise_cache_${tableName}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

const tableCache: Record<string, any[]> = {
  students: loadTableFromStorage('students'),
  study_days: loadTableFromStorage('study_days'),
  lessons: loadTableFromStorage('lessons'),
  questions: loadTableFromStorage('questions'),
  quiz_results: loadTableFromStorage('quiz_results'),
};

const lastFetchedAt: Record<string, number> = {};
const CACHE_DEBOUNCE_MS = 2500;

function deduplicateList(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, any>();
  for (const item of list) {
    if (!item) continue;
    const key = item.id != null ? String(item.id).trim() : JSON.stringify(item);
    map.set(key, item);
  }
  return Array.from(map.values());
}

interface FilterCondition {
  column: string;
  value: any;
}

class SheetQueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private tableName: string;
  private filters: FilterCondition[] = [];
  private orderCol?: string;
  private ascending = true;
  private limitCount?: number;
  private isSingle = false;
  private isMaybeSingle = false;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private actionData: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(...args: any[]) {
    void args;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.actionData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.actionData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(data: any, ...options: any[]) {
    void options;
    this.action = 'upsert';
    this.actionData = data;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  private async executeAsync(): Promise<{ data: any; error: any }> {
    const matchesFilters = (item: any) => {
      return this.filters.every((f) => {
        const itemVal = item[f.column] != null ? String(item[f.column]).trim().toLowerCase() : '';
        const filterVal = f.value != null ? String(f.value).trim().toLowerCase() : '';
        return itemVal === filterVal;
      });
    };

    // 1. INSERT: Directly write to Google Sheet and local cache
    if (this.action === 'insert') {
      const itemsToInsert = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const insertedList: any[] = [];

      const table = tableCache[this.tableName] || loadTableFromStorage(this.tableName) || [];

      for (const item of itemsToInsert) {
        const id =
          item.id ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `id-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
        const newItem = {
          created_at: item.created_at || getBangladeshTimeString(),
          ...item,
          id: String(id).trim(),
        };

        try {
          await insertRowToSheet(this.tableName, newItem);
        } catch (insertErr) {
          console.warn(`Google Sheets insert error for ${this.tableName}:`, insertErr);
        }

        const existingIdx = table.findIndex((r: any) => String(r.id).trim() === String(newItem.id));
        if (existingIdx >= 0) {
          table[existingIdx] = { ...table[existingIdx], ...newItem };
        } else {
          table.push(newItem);
        }
        insertedList.push(newItem);
      }

      tableCache[this.tableName] = deduplicateList(table);
      saveTableToStorage(this.tableName, tableCache[this.tableName]);
      lastFetchedAt[this.tableName] = Date.now();
      const res = Array.isArray(this.actionData) ? insertedList : insertedList[0];
      return { data: res, error: null };
    }

    // 2. UPDATE: Directly update in local cache and sync to Google Sheet
    if (this.action === 'update') {
      const table = tableCache[this.tableName] || loadTableFromStorage(this.tableName) || [];
      const updatedList: any[] = [];
      let updatedCount = 0;

      for (let i = 0; i < table.length; i++) {
        if (matchesFilters(table[i])) {
          const targetId = table[i].id;
          if (targetId) {
            try {
              await updateRowInSheet(this.tableName, targetId, this.actionData, table[i]);
            } catch (updateErr) {
              console.warn(`Google Sheets update error for ${this.tableName}:`, updateErr);
            }
          }
          table[i] = { ...table[i], ...this.actionData };
          updatedList.push(table[i]);
          updatedCount++;
        }
      }

      // If item was not found in table (e.g. record not in memory), check for id filter and insert/update
      if (updatedCount === 0) {
        const idFilter = this.filters.find((f) => f.column === 'id');
        if (idFilter && idFilter.value) {
          const targetId = String(idFilter.value).trim();
          const newItem = {
            id: targetId,
            created_at: getBangladeshTimeString(),
            ...this.actionData,
          };
          table.push(newItem);
          updatedList.push(newItem);
          try {
            await updateRowInSheet(this.tableName, targetId, this.actionData);
          } catch {
            // ignore
          }
        }
      }

      tableCache[this.tableName] = deduplicateList(table);
      saveTableToStorage(this.tableName, tableCache[this.tableName]);
      lastFetchedAt[this.tableName] = Date.now();
      const res = this.isSingle ? (updatedList[0] || null) : updatedList;
      return { data: res, error: null };
    }

    // 3. DELETE: Directly delete from Google Sheet and await completion
    if (this.action === 'delete') {
      let table = tableCache[this.tableName] || [];
      if (table.length === 0) {
        try {
          const fresh = await fetchRowsFromSheet(this.tableName);
          table = deduplicateList(fresh || []);
          tableCache[this.tableName] = table;
        } catch {
          // ignore
        }
      }

      const itemsToDelete = table.filter(matchesFilters);
      for (const item of itemsToDelete) {
        if (item.id) {
          const success = await deleteRowFromSheet(this.tableName, item.id);
          if (!success) {
            return { data: null, error: { message: `Google Sheets delete failed for ${this.tableName}` } };
          }
        }
      }

      tableCache[this.tableName] = table.filter((item) => !matchesFilters(item));
      lastFetchedAt[this.tableName] = Date.now();
      return { data: null, error: null };
    }

    // 4. UPSERT: Update or Insert directly in Google Sheet
    if (this.action === 'upsert') {
      const itemsToUpsert = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      let table = tableCache[this.tableName] || [];
      if (table.length === 0) {
        try {
          const fresh = await fetchRowsFromSheet(this.tableName);
          table = deduplicateList(fresh || []);
          tableCache[this.tableName] = table;
        } catch {
          // ignore
        }
      }

      const resultList: any[] = [];
      for (const item of itemsToUpsert) {
        let existingIdx = -1;
        if (this.tableName === 'quiz_results' && item.student_id && item.lesson_id) {
          existingIdx = table.findIndex(
            (r: any) => r.student_id === item.student_id && r.lesson_id === item.lesson_id
          );
        } else if (item.id) {
          existingIdx = table.findIndex((r: any) => r.id === item.id);
        }

        if (existingIdx >= 0) {
          const targetId = table[existingIdx].id;
          const success = await updateRowInSheet(this.tableName, targetId, item);
          if (!success) {
            return { data: null, error: { message: `Google Sheets upsert update failed for ${this.tableName}` } };
          }
          table[existingIdx] = { ...table[existingIdx], ...item };
          resultList.push(table[existingIdx]);
        } else {
          const newItem = {
            id:
              item.id ||
              (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `id-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
            created_at: item.created_at || getBangladeshTimeString(),
            ...item,
          };
          const success = await insertRowToSheet(this.tableName, newItem);
          if (!success) {
            return { data: null, error: { message: `Google Sheets upsert insert failed for ${this.tableName}` } };
          }
          table.push(newItem);
          resultList.push(newItem);
        }
      }

      tableCache[this.tableName] = deduplicateList(table);
      lastFetchedAt[this.tableName] = Date.now();
      const res = this.isSingle
        ? (resultList[0] || null)
        : Array.isArray(this.actionData)
        ? resultList
        : resultList[0];
      return { data: res, error: null };
    }

    // 5. SELECT: Read directly from Google Sheet
    const now = Date.now();
    const last = lastFetchedAt[this.tableName] || 0;
    const isExpired = now - last > CACHE_DEBOUNCE_MS;

    if (isExpired || !tableCache[this.tableName] || tableCache[this.tableName].length === 0) {
      try {
        const sheetRows = await fetchRowsFromSheet(this.tableName);
        if (Array.isArray(sheetRows)) {
          tableCache[this.tableName] = deduplicateList(sheetRows);
          saveTableToStorage(this.tableName, tableCache[this.tableName]);
        }
        lastFetchedAt[this.tableName] = Date.now();
      } catch (e) {
        console.warn(`Could not fetch ${this.tableName} from Google Sheets:`, e);
      }
    }

    const table = tableCache[this.tableName] || [];
    let filtered = deduplicateList(table.filter(matchesFilters));

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.ascending;
      filtered.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === undefined || valB === undefined) return 0;
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    if (typeof this.limitCount === 'number') {
      filtered = filtered.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      if (filtered.length === 0) {
        return { data: null, error: { message: 'Row not found in Google Sheets' } };
      }
      return { data: filtered[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: filtered[0] || null, error: null };
    }

    return { data: filtered, error: null };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeAsync().then(onfulfilled, onrejected);
  }
}

// Google Sheets Database Client (Sole active database)
export const sheetsDb = {
  from: (tableName: string) => new SheetQueryBuilder(tableName),
};

export const db = sheetsDb;
export const supabase = sheetsDb;
