import fs from 'fs';
import path from 'path';
import { CONFIG, waitRandomDelay } from './config.js';
import { LinkedInParser, LinkedInJob } from './parser.js';
import { JobPipeline, EvaluatedJob } from './pipeline.js';
import { DatabaseService } from './db.js';

async function main() {
  console.log('==================================================');
  console.log('LinkUG - LinkedIn Job Scraper para CV/Portafolio');
  console.log('==================================================');
  console.log(`Palabras clave: ${CONFIG.KEYWORDS.join(', ')}`);
  console.log(`Geografía: ${CONFIG.GEOGRAPHY}`);
  console.log('--------------------------------------------------');

  const parser = new LinkedInParser();
  const pipeline = new JobPipeline();
  const db = new DatabaseService();

  const allEvaluatedJobs: EvaluatedJob[] = [];

  for (const keyword of CONFIG.KEYWORDS) {
    try {
      // 1. Obtener la lista preliminar de trabajos
      const rawJobs = await parser.fetchJobs(keyword, CONFIG.GEOGRAPHY, 0);

      if (rawJobs.length === 0) {
        console.log(`No se obtuvieron vacantes para la búsqueda: "${keyword}".`);
        continue;
      }

      // 2. Procesar cada vacante
      for (const job of rawJobs) {
        console.log(`\nProcesando vacante: "${job.title}" de la empresa "${job.company}"`);

        // Introducir delay para evitar rate limits
        await waitRandomDelay();

        // Obtener descripción completa de la vacante
        console.log(`Descargando descripción detallada para el trabajo ID: ${job.id}`);
        const description = await parser.fetchJobDescription(job.id);
        
        if (!description) {
          console.warn('No se pudo extraer la descripción de este trabajo. Saltando...');
          continue;
        }

        job.description = description;

        // Evaluar y enriquecer la vacante usando IA (Gemini 1.5 Flash)
        console.log('Clasificando con IA Gemini 1.5 Flash...');
        const evaluatedJob = await pipeline.evaluateJobWithAI(job);

        if (evaluatedJob) {
          console.log(`Clasificación terminada.`);

          // Buscar si la empresa tiene convenio activo registrado en la base de datos de la UG
          console.log('Verificando convenio activo en la base de datos de la UG...');
          const agreement = await db.findActiveAgreement(job.company);
          if (agreement) {
            console.log(`Coincidencia de convenio encontrada: ${agreement.company_name} (${agreement.code})`);
            evaluatedJob.hasActiveAgreement = true;
            evaluatedJob.agreementCode = agreement.code;
            evaluatedJob.agreementFaculty = agreement.faculty;
          } else {
            console.log('No se encontro ningun convenio activo para esta empresa.');
          }

          console.log(`   - ¿Apta para pasantías?: ${evaluatedJob.isSuitableForInternship ? 'SI' : 'NO'}`);
          console.log(`   - Carreras compatibles: ${evaluatedJob.compatibleCareers.join(', ') || 'Ninguna'}`);
          console.log(`   - Modalidad: ${evaluatedJob.workModality}`);
          console.log(`   - Habilidades clave: ${evaluatedJob.requiredSkills.join(', ')}`);
          console.log(`   - ¿Convenio Activo UG?: ${evaluatedJob.hasActiveAgreement ? `SI (${evaluatedJob.agreementCode})` : 'NO'}`);
          
          allEvaluatedJobs.push(evaluatedJob);
        }
      }
    } catch (keywordError: any) {
      console.error(`Error procesando palabra clave "${keyword}": ${keywordError.message}`);
    }
  }

  // 3. Guardar resultados localmente en un archivo JSON (ideal para cachear o visualizar)
  const outputPath = path.join(process.cwd(), 'scraped_jobs.json');
  try {
    fs.writeFileSync(outputPath, JSON.stringify(allEvaluatedJobs, null, 2), 'utf8');
    console.log('\n==================================================');
    console.log(`Proceso completado exitosamente.`);
    console.log(`Guardadas ${allEvaluatedJobs.length} vacantes evaluadas en: ${outputPath}`);
    console.log('==================================================');
  } catch (saveError: any) {
    console.error(`Error al guardar el archivo de resultados: ${saveError.message}`);
  } finally {
    // Cerrar el pool de base de datos
    await db.close();
  }
}

main().catch(error => {
  console.error('Error crítico en la ejecución del Scraper:', error);
});
