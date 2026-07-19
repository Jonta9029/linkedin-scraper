import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUserAgent } from './config.js';

export interface LinkedInJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  postedTime?: string;
}

/**
 * Servicio encargado de interactuar con el portal público de LinkedIn.
 */
export class LinkedInParser {
  private baseUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings';

  /**
   * Obtiene la lista de vacantes públicas de LinkedIn para una palabra clave y locación dadas.
   */
  async fetchJobs(keyword: string, location: string, start: number = 0): Promise<LinkedInJob[]> {
    const url = `${this.baseUrl}?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&start=${start}`;
    
    console.log(`🌐 Buscando en LinkedIn: "${keyword}" en "${location}" (Página inicio: ${start})...`);

    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Referer': 'https://www.linkedin.com/',
    };

    try {
      const response = await axios.get(url, { headers, timeout: 10000 });
      const $ = cheerio.load(response.data);
      const jobs: LinkedInJob[] = [];

      $('li').each((_, element) => {
        const titleAnchor = $(element).find('.base-card__full-link');
        const title = titleAnchor.text().trim();
        const rawUrl = titleAnchor.attr('href') || '';
        
        // Limpiar URL eliminando tracking tokens
        const url = rawUrl.split('?')[0];

        const company = $(element).find('.base-card__subtitle').text().trim();
        const location = $(element).find('.job-search-card__location').text().trim();
        const postedTime = $(element).find('time').attr('datetime') || $(element).find('time').text().trim();

        // Obtener ID del trabajo de la URL o atributos
        let id = $(element).find('.base-card').attr('data-entity-urn')?.split(':').pop() || '';
        if (!id && url) {
          const match = url.match(/\/view\/(\d+)/) || url.match(/-(\d+)$/);
          if (match) id = match[1];
        }

        if (title && company && id) {
          jobs.push({
            id,
            title,
            company,
            location,
            url,
            postedTime,
          });
        }
      });

      console.log(`✨ Se encontraron ${jobs.length} vacantes preliminares.`);
      return jobs;
    } catch (error: any) {
      console.error(`❌ Error al obtener listado de LinkedIn: ${error.message}`);
      if (error.response?.status === 429) {
        console.warn('⚠️ Se ha detectado Rate Limit (429) de LinkedIn.');
      }
      return [];
    }
  }

  /**
   * Obtiene la descripción detallada de una vacante pública usando su ID.
   */
  async fetchJobDescription(jobId: string): Promise<string> {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobChecking/${jobId}`;
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Referer': 'https://www.linkedin.com/',
    };

    try {
      const response = await axios.get(url, { headers, timeout: 8000 });
      const $ = cheerio.load(response.data);
      
      // La API interna de guests suele devolver una estructura compacta del detalle del empleo
      const description = $('.show-more-less-html__markup').text().trim();
      return description || $('.description__text').text().trim() || 'No se pudo extraer la descripción.';
    } catch (error: any) {
      // Si la API de checking falla, intentamos la URL de vista estándar de invitado
      try {
        const fallbackUrl = `https://www.linkedin.com/jobs/view/${jobId}`;
        const fallbackResponse = await axios.get(fallbackUrl, { headers, timeout: 8000 });
        const $ = cheerio.load(fallbackResponse.data);
        return $('.show-more-less-html__markup').text().trim() || 'No se pudo extraer la descripción.';
      } catch (fallbackError: any) {
        console.error(`❌ Error al extraer descripción del trabajo ${jobId}: ${fallbackError.message}`);
        return '';
      }
    }
  }
}
