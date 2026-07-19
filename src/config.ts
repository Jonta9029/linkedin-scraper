import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || '3001',
  KEYWORDS: (process.env.LINKEDIN_KEYWORDS || 'pasante software,practicas preprofesionales,desarrollador junior')
    .split(',')
    .map(k => k.trim()),
  GEOGRAPHY: process.env.LINKEDIN_GEOGRAPHY || 'Ecuador',
  DELAY_MIN: parseInt(process.env.SCRAPE_DELAY_MIN_MS || '3000', 10),
  DELAY_MAX: parseInt(process.env.SCRAPE_DELAY_MAX_MS || '8000', 10),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
};

// Lista de User-Agents modernos para simular navegadores reales y evitar bloqueos
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
];

/**
 * Retorna un User-Agent aleatorio de la lista para rotar en las peticiones.
 */
export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}

/**
 * Pausa la ejecución por un tiempo aleatorio entre DELAY_MIN y DELAY_MAX (Jitter)
 * para simular navegación humana.
 */
export function waitRandomDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * (CONFIG.DELAY_MAX - CONFIG.DELAY_MIN + 1)) + CONFIG.DELAY_MIN;
  console.log(`⏳ Esperando ${ms / 1000} segundos antes del siguiente paso...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}
