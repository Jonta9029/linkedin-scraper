import axios from 'axios';
import { CONFIG } from './config.js';
import { LinkedInJob } from './parser.js';

export interface EvaluatedJob extends LinkedInJob {
  isSuitableForInternship: boolean;
  compatibleCareers: string[];
  requiredSkills: string[];
  workModality: 'Presencial' | 'Híbrido' | 'Remoto';
  refinedSummary: string;
  hasActiveAgreement: boolean;
  agreementCode: string | null;
  agreementFaculty: string | null;
}

export class JobPipeline {
  private geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  /**
   * Procesa la vacante con Gemini 1.5 Flash para clasificarla y estructurar la información en JSON.
   */
  async evaluateJobWithAI(job: LinkedInJob): Promise<EvaluatedJob | null> {
    if (!CONFIG.GEMINI_API_KEY) {
      console.warn('No se ha configurado GEMINI_API_KEY. Saltando clasificación por IA.');
      return this.fallbackEvaluation(job);
    }

    if (!job.description) {
      console.warn(`Vacante ${job.id} no tiene descripción. Saltando.`);
      return null;
    }

    const url = `${this.geminiUrl}?key=${CONFIG.GEMINI_API_KEY}`;
    
    // Prompt altamente estructurado para clasificar la vacante para la Universidad de Guayaquil (UG)
    const prompt = `
Analiza la siguiente oferta de empleo publicada en LinkedIn y determina si es apta para estudiantes universitarios que buscan realizar sus Prácticas Preprofesionales (Pasantías) o graduados recientes (cargos Junior con < 2 años de experiencia).

Información de la vacante:
- Título: ${job.title}
- Empresa: ${job.company}
- Ubicación: ${job.location}
- Descripción original:
${job.description}

Instrucciones de clasificación:
1. "isSuitableForInternship": Determina si es apta para pasantías/pasantías universitarias o puestos de nivel entrada (Entry-Level / Junior). Si exige más de 2 años de experiencia o es senior, pon false.
2. "compatibleCareers": Listado de carreras universitarias que aplican a esta vacante de entre las siguientes opciones: [Ingeniería en Software, Ingeniería en Sistemas, Licenciatura en Tecnologías de la Información, Ingeniería en Teleinformática, Ingeniería Industrial, Diseño Gráfico, Contabilidad y Auditoría, Administración de Empresas]. Si no coincide con ninguna, deja el arreglo vacío.
3. "requiredSkills": Lista de tecnologías, herramientas o habilidades blandas clave requeridas (máximo 7).
4. "workModality": Identifica la modalidad de trabajo. Debe ser estrictamente una de estas opciones: "Presencial", "Híbrido" o "Remoto".
5. "refinedSummary": Redacta un resumen corto y profesional del cargo (máximo 4 líneas) resaltando las responsabilidades principales.

Devuelve estrictamente un objeto JSON con la siguiente estructura (no agregues bloques de markdown como \`\`\`json ni texto introductorio):
{
  "isSuitableForInternship": boolean,
  "compatibleCareers": string[],
  "requiredSkills": string[],
  "workModality": "Presencial" | "Híbrido" | "Remoto",
  "refinedSummary": string
}
`;

    try {
      const response = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error('Respuesta vacía de Gemini API.');
      }

      const result = JSON.parse(responseText.trim());

      return {
        ...job,
        isSuitableForInternship: !!result.isSuitableForInternship,
        compatibleCareers: Array.isArray(result.compatibleCareers) ? result.compatibleCareers : [],
        requiredSkills: Array.isArray(result.requiredSkills) ? result.requiredSkills : [],
        workModality: ['Presencial', 'Híbrido', 'Remoto'].includes(result.workModality) 
          ? result.workModality 
          : 'Presencial',
        refinedSummary: result.refinedSummary || '',
        hasActiveAgreement: false,
        agreementCode: null,
        agreementFaculty: null,
      };
    } catch (error: any) {
      console.error(`Error en evaluación de Gemini para la vacante ${job.id}: ${error.message}`);
      return this.fallbackEvaluation(job);
    }
  }

  /**
   * Método de respaldo básico en caso de que falle la API de Gemini o falte la clave de API.
   */
  private fallbackEvaluation(job: LinkedInJob): EvaluatedJob {
    const lowercaseTitle = job.title.toLowerCase();
    
    // Clasificación heurística muy básica
    const isJuniorOrIntern = 
      lowercaseTitle.includes('pasante') || 
      lowercaseTitle.includes('intern') || 
      lowercaseTitle.includes('practicante') || 
      lowercaseTitle.includes('junior') || 
      lowercaseTitle.includes('jr');

    const compatibleCareers: string[] = [];
    if (lowercaseTitle.includes('software') || lowercaseTitle.includes('desarrollador') || lowercaseTitle.includes('developer')) {
      compatibleCareers.push('Ingeniería en Software', 'Ingeniería en Sistemas');
    }

    return {
      ...job,
      isSuitableForInternship: isJuniorOrIntern,
      compatibleCareers,
      requiredSkills: [],
      workModality: 'Presencial',
      refinedSummary: job.description ? job.description.slice(0, 150) + '...' : 'Sin descripción simplificada.',
      hasActiveAgreement: false,
      agreementCode: null,
      agreementFaculty: null,
    };
  }
}
