# 🕵️‍♂️ LinkedIn Job Scraper & AI Evaluator (LinkUG Extract Mod)

Este microservicio es un extractor (scraper) orgánico, gratuito y de alto rendimiento diseñado en **TypeScript** y **Node.js** para recolectar vacantes públicas de empleo (especialmente pasantías y cargos Junior) desde LinkedIn, procesando y estructurando la información mediante **Inteligencia Artificial (Gemini 1.5 Flash)**.

Fue desarrollado inicialmente como parte de la infraestructura de **LinkUG** (la plataforma de vinculación universitaria de la Universidad de Guayaquil) y se ha independizado para ser utilizado como una herramienta abierta de búsqueda inteligente de empleo y portafolio profesional.

---

## 🚀 Características Clave

1. **Extracción Orgánica y Gratuita ($0/mes):** No requiere el uso de APIs de pago de LinkedIn ni tokens de autenticación de usuario. Utiliza peticiones a la API pública de invitados de LinkedIn.
2. **Estrategia Anti-Scraping Robusta:**
   - **Rotación Dinámica de Cabeceras (User-Agents):** Simula diferentes navegadores modernos en cada consulta.
   - **Espera Inteligente y Aleatoria (Jitter):** Aplica retrasos variables (entre 3 y 8 segundos por llamada) para evitar límites de tasa (Rate Limiting).
   - **Estructuración Limpia:** Limpia automáticamente parámetros de seguimiento y tokens innecesarios de las URLs de empleo.
3. **Clasificación Inteligente por IA (Gemini 1.5 Flash):**
   - Evalúa si el cargo es realmente apto para estudiantes universitarios (nivel Junior o Pasantía) analizando los años de experiencia exigidos en la descripción.
   - Mapea las vacantes de forma automatizada con carreras universitarias de destino.
   - Extrae habilidades requeridas (skills match) y modalidad (Presencial, Híbrido, Remoto).
   - Redacta un resumen refinado de las responsabilidades principales del cargo.
   - Utiliza la funcionalidad nativa de **JSON estructurado** de Gemini API (`responseMimeType: "application/json"`) para garantizar datos 100% legibles por código.
4. **Almacenamiento Local o Nube:** Guarda el resultado consolidado en un archivo local `scraped_jobs.json`, listo para ser consumido por un backend o front-end web.

---

## 🛠️ Tecnologías y Librerías Utilizadas

* **Node.js & TypeScript:** Entorno de ejecución y tipado estricto para un código limpio y mantenible.
* **TSX:** Ejecutor ultra veloz de TypeScript en desarrollo que evita la necesidad de compilar manualmente en cada cambio.
* **Axios:** Cliente HTTP para gestionar las peticiones web de forma asíncrona y robusta.
* **Cheerio:** Parser HTML de alta velocidad que emula jQuery en el servidor para interactuar con los selectores del DOM.
* **Gemini 1.5 Flash API:** LLM de Google AI Studio para clasificación avanzada de lenguaje natural.
* **Dotenv:** Carga y gestión segura de variables de entorno locales.

---

## 📂 Estructura del Proyecto

```bash
linkedin-scraper/
├── src/
│   ├── config.ts     # Configuración centralizada, rotación de User-Agents y Jitter
│   ├── parser.ts     # Extracción y parsing HTML de LinkedIn con Cheerio
│   ├── pipeline.ts   # Integración y prompts estructurados para Gemini API
│   └── index.ts      # Orquestador del scraper (CLI Runner)
├── .env.example      # Ejemplo de configuración y API Keys
├── .gitignore        # Exclusión de credenciales y node_modules
├── package.json      # Dependencias y scripts de ejecución
└── tsconfig.json     # Configuración del compilador TypeScript
```

---

## ⚙️ Configuración e Instalación

### 1. Prerrequisitos
* Tener instalado **Node.js** (v18 o superior).
* Contar con una API Key de **Google AI Studio**. Es 100% gratuita y la puedes obtener en [Google AI Studio](https://aistudio.google.com/).

### 2. Instalación de Dependencias
Clona el repositorio e instala las dependencias necesarias:
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo `.env.example` y renómbralo a `.env`:
```bash
cp .env.example .env
```
Abre el archivo `.env` y añade tu clave de Gemini y ajusta los términos de búsqueda si lo deseas:
```env
LINKEDIN_KEYWORDS="pasante software,practicas preprofesionales,desarrollador junior"
LINKEDIN_GEOGRAPHY="Ecuador"
GEMINI_API_KEY="TU_GEMINI_API_KEY"
```

---

## 🏃‍♂️ Cómo Ejecutar

### Modo Desarrollo (con recarga automática ante cambios):
```bash
npm run dev
```

### Compilar a Producción:
```bash
npm run build
```

### Ejecutar Versión Compilada:
```bash
npm run start
```

Al finalizar la ejecución, el scraper generará un archivo llamado `scraped_jobs.json` en la raíz del proyecto, con la siguiente estructura de datos:

```json
[
  {
    "id": "395821034",
    "title": "Pasante de Desarrollo de Software",
    "company": "Empresa Tecnológica S.A.",
    "location": "Guayaquil, Guayas, Ecuador",
    "url": "https://www.linkedin.com/jobs/view/395821034",
    "postedTime": "2026-07-18",
    "description": "...",
    "isSuitableForInternship": true,
    "compatibleCareers": [
      "Ingeniería en Software",
      "Ingeniería en Sistemas"
    ],
    "requiredSkills": [
      "TypeScript",
      "Node.js",
      "React",
      "Bases de Datos Relacionales",
      "Git"
    ],
    "workModality": "Híbrido",
    "refinedSummary": "Apoyo en el desarrollo del frontend de portales internos y mantenimiento de APIs REST construidas sobre Node.js."
  }
]
```

---

## 🛡️ Licencia

Este proyecto está bajo la Licencia **MIT**. Puedes usarlo y modificarlo libremente.
