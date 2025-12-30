// Excel Parser Utility
import * as XLSX from 'xlsx';
import { Task } from '../types';

export interface ParseResult {
  success: boolean;
  tasks?: Task[];
  error?: string;
}

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, error: 'No sheets found in the Excel file' };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
    
    if (jsonData.length === 0) {
      return { success: false, error: 'No data found in the Excel file' };
    }
    
    // Find the task name column (required)
    const firstRow = jsonData[0];
    const taskNameColumn = findColumn(firstRow, [
      '과제명', '과제 명', 'task_name', 'taskname', 'task name', 'name', '이름', 'title', '제목', 'project', '프로젝트'
    ]);
    
    if (!taskNameColumn) {
      return { 
        success: false, 
        error: 'Required column "과제명" (or task_name/name/title) not found. Please ensure your Excel file has a column for task names.' 
      };
    }
    
    // Find optional description column
    const descriptionColumn = findColumn(firstRow, [
      '과제 설명', '과제설명', 'description', 'desc', '설명', 'context', '내용', 'detail', '상세'
    ]);
    
    // Parse tasks
    const tasks: Task[] = [];
    let idCounter = 1;
    
    for (const row of jsonData) {
      const taskName = String(row[taskNameColumn] || '').trim();
      
      if (!taskName) {
        continue; // Skip empty rows
      }
      
      const task: Task = {
        task_id: `task_${Date.now()}_${idCounter++}`,
        task_name: taskName,
      };
      
      if (descriptionColumn && row[descriptionColumn]) {
        task.description = String(row[descriptionColumn]).trim();
      }
      
      tasks.push(task);
    }
    
    if (tasks.length === 0) {
      return { success: false, error: 'No valid tasks found in the Excel file' };
    }
    
    if (tasks.length > 42) {
      return { 
        success: false, 
        error: `Too many tasks (${tasks.length}). Maximum allowed is 42 tasks.` 
      };
    }
    
    return { success: true, tasks };
  } catch (error) {
    console.error('Excel parsing error:', error);
    return { 
      success: false, 
      error: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

function findColumn(row: Record<string, unknown>, possibleNames: string[]): string | null {
  const keys = Object.keys(row);
  
  for (const name of possibleNames) {
    const found = keys.find(key => 
      key.toLowerCase().trim() === name.toLowerCase() ||
      key.toLowerCase().includes(name.toLowerCase())
    );
    if (found) {
      return found;
    }
  }
  
  return null;
}

// Export function to create a sample Excel template
export function createSampleTemplate(): Uint8Array {
  const data = [
    { '과제명': '신규 AI 플랫폼 구축', '과제 설명': 'AI 기반 의사결정 지원 시스템 구축' },
    { '과제명': '레거시 시스템 마이그레이션', '과제 설명': '기존 온프레미스 시스템을 클라우드로 이전' },
    { '과제명': '모바일 앱 리뉴얼', '과제 설명': 'UX 개선 및 신규 기능 추가' },
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}
