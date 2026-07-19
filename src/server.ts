import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { CONFIG, waitRandomDelay } from './config.js';
import { LinkedInParser, LinkedInJob } from './parser.js';
import { JobPipeline, EvaluatedJob } from './pipeline.js';
import { DatabaseService } from './db.js';

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

const jsonPath = path.resolve('scraped_jobs.json');

// Inicializar servicios
const parser = new LinkedInParser();
const pipeline = new JobPipeline();
const db = new DatabaseService();

/**
 * Lee el archivo scraped_jobs.json de forma segura.
 */
function readSavedJobs(): EvaluatedJob[] {
  try {
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error: any) {
    console.error('Error al leer el archivo scraped_jobs.json:', error.message);
  }
  return [];
}

/**
 * Guarda el listado de trabajos en scraped_jobs.json.
 */
function saveJobs(jobs: EvaluatedJob[]) {
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(jobs, null, 2), 'utf8');
  } catch (error: any) {
    console.error('Error al guardar el archivo scraped_jobs.json:', error.message);
  }
}

// Endpoint: Obtener listado de vacantes
app.get('/api/jobs', (req, res) => {
  const jobs = readSavedJobs();
  res.json(jobs);
});

// Endpoint: Realizar búsqueda y scraping en vivo
app.post('/api/search', async (req, res) => {
  const { keyword, location } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: 'La palabra clave (keyword) es requerida.' });
  }

  const targetLocation = location || CONFIG.GEOGRAPHY;
  console.log(`Peticion de busqueda recibida: "${keyword}" en "${targetLocation}"`);

  try {
    const savedJobs = readSavedJobs();
    const existingIds = new Set(savedJobs.map((j) => j.id));

    // 1. Obtener la lista preliminar de trabajos
    const rawJobs = await parser.fetchJobs(keyword, targetLocation, 0);
    const newEvaluatedJobs: EvaluatedJob[] = [];

    // 2. Filtrar únicamente los que no han sido procesados previamente
    const unregisteredJobs = rawJobs.filter((job) => !existingIds.has(job.id));
    console.log(`De las ${rawJobs.length} vacantes encontradas, ${unregisteredJobs.length} son nuevas.`);

    // Procesar solo los nuevos
    for (const job of unregisteredJobs) {
      console.log(`Procesando nueva vacante: "${job.title}" de la empresa "${job.company}"`);

      // Introducir delay para evitar rate limits
      await waitRandomDelay();

      // Obtener descripción completa de la vacante
      const description = await parser.fetchJobDescription(job.id);
      
      if (!description) {
        console.warn(`No se pudo obtener la descripcion de la vacante ${job.id}. Saltando.`);
        continue;
      }

      job.description = description;

      // Clasificación con Gemini
      console.log('Evaluando con IA Gemini 1.5 Flash...');
      const evaluatedJob = await pipeline.evaluateJobWithAI(job);

      if (evaluatedJob) {
        // Cruce con la base de datos de convenios UG
        console.log('Verificando convenio activo en la base de datos de la UG...');
        const agreement = await db.findActiveAgreement(job.company);
        if (agreement) {
          console.log(`Convenio encontrado: ${agreement.company_name} (${agreement.code})`);
          evaluatedJob.hasActiveAgreement = true;
          evaluatedJob.agreementCode = agreement.code;
          evaluatedJob.agreementFaculty = agreement.faculty;
        } else {
          console.log('No se encontro convenio activo.');
        }

        newEvaluatedJobs.push(evaluatedJob);
      }
    }

    // 3. Unificar y guardar resultados
    if (newEvaluatedJobs.length > 0) {
      // Agregar los nuevos trabajos al principio de la lista
      const updatedJobs = [...newEvaluatedJobs, ...savedJobs];
      saveJobs(updatedJobs);
      console.log(`Se agregaron ${newEvaluatedJobs.length} nuevas vacantes al listado.`);
      res.json(updatedJobs);
    } else {
      console.log('No se agregaron nuevas vacantes al listado.');
      res.json(savedJobs);
    }

  } catch (error: any) {
    console.error('Error en proceso de busqueda en vivo:', error.message);
    res.status(500).json({ error: 'Error interno en el proceso de scraping en vivo.' });
  }
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`Servidor API del Scraper corriendo en http://localhost:${PORT}`);
  console.log('==================================================');
});

// Manejar apagado limpio de base de datos
process.on('SIGINT', async () => {
  console.log('\nApagando servidor...');
  await db.close();
  process.exit(0);
});
