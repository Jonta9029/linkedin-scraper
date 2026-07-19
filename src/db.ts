import pg from 'pg';
import { CONFIG } from './config.js';

const { Pool } = pg;

export interface Agreement {
  code: string;
  company_name: string;
  process_type: string;
  start_date: Date | null;
  end_date: Date | null;
  faculty: string | null;
}

export class DatabaseService {
  private pool: pg.Pool | null = null;

  constructor() {
    if (CONFIG.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: CONFIG.DATABASE_URL,
      });
    } else {
      console.log('Base de datos no configurada en DATABASE_URL. El cruce de convenios estara desactivado.');
    }
  }

  /**
   * Busca si existe un convenio activo para una empresa dada.
   * Realiza una limpieza del nombre de la empresa y una busqueda difusa (case-insensitive).
   */
  async findActiveAgreement(companyName: string): Promise<Agreement | null> {
    if (!this.pool) {
      return null;
    }

    // Limpieza basica del nombre de la empresa (remover sufijos corporativos comunes)
    let cleanName = companyName
      .replace(/(S\.A\.|S\.A\.S\.|S\.A|S\.A\.S|C\.A\.|C\.A|Cia\. Ltda\.|Ltda\.)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanName.length < 2) {
      cleanName = companyName.trim();
    }

    const query = `
      SELECT code, company_name, process_type, start_date, end_date, faculty
      FROM ug_agreements
      WHERE 
        -- Coincidencia exacta insensible a mayusculas
        company_name ILIKE $1
        -- Coincidencia parcial: El nombre de la DB contiene el nombre limpio de LinkedIn
        OR company_name ILIKE $2
        -- Coincidencia parcial: El nombre de LinkedIn contiene el nombre de la DB
        OR $3 ILIKE '%' || company_name || '%'
      LIMIT 1
    `;

    const values = [
      companyName.trim(),
      `%${cleanName}%`,
      companyName.trim()
    ];

    try {
      const res = await this.pool.query(query, values);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        
        // Verificar si esta vigente
        const now = new Date();
        const endDate = row.end_date ? new Date(row.end_date) : null;
        
        // Si no tiene fecha de fin, asumimos que sigue activo. Si la tiene, validamos la fecha actual.
        const isActive = !endDate || endDate >= now;

        if (isActive) {
          return {
            code: row.code,
            company_name: row.company_name,
            process_type: row.process_type,
            start_date: row.start_date,
            end_date: row.end_date,
            faculty: row.faculty
          };
        }
      }
      return null;
    } catch (error: any) {
      console.error(`Error al buscar convenio para la empresa ${companyName}:`, error.message);
      return null;
    }
  }

  /**
   * Cierra las conexiones activas del pool.
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
