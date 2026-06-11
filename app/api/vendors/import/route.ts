import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, isAuthError } from '@/lib/auth';
import type { ResultSetHeader } from 'mysql2';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (!rows.length) {
    return NextResponse.json({ error: 'CSV is empty or has no data rows' }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = row['name'] ?? '';
    if (!name) { skipped++; continue; }

    const phone = row['phone'] || null;
    const notes = row['notes'] || null;

    try {
      await db.query<ResultSetHeader>(
        'INSERT INTO vendors (name, phone, notes) VALUES (?, ?, ?)',
        [name, phone, notes]
      );
      imported++;
    } catch (e: unknown) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'ER_DUP_ENTRY') {
        errors.push(`"${name}" already exists — skipped`);
        skipped++;
      } else {
        errors.push(`"${name}" failed to import`);
        skipped++;
      }
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
