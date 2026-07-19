import { useState, useEffect } from 'react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  postedTime: string;
  description: string;
  isSuitableForInternship: boolean;
  compatibleCareers: string[];
  requiredSkills: string[];
  workModality: 'Presencial' | 'Híbrido' | 'Remoto';
  refinedSummary: string;
  hasActiveAgreement: boolean;
  agreementCode: string | null;
  agreementFaculty: string | null;
  isDirectPost: boolean;
  recruiterName: string | null;
  recruiterTitle: string | null;
  contactEmail: string | null;
  applicationSubject: string | null;
  // Dynamic property computed in frontend
  matchScore?: number;
}

const PREDEFINED_INTERESTS = [
  'Node.js',
  'Angular',
  'React',
  'TypeScript',
  'JavaScript',
  'C#',
  '.NET 8',
  'SQL Server',
  'Bases de Datos',
  'Git',
  'Soporte Técnico',
  'Infraestructura',
  'Windows Server',
  'Redes Básicas',
  'Control de Calidad',
  'Excel Avanzado',
  'Diseño Gráfico',
  'Redacción'
];

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [agreementFilter, setAgreementFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<'all' | 'intern' | 'formal'>('all');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'jobboard' | 'recruiter'>('all');

  // CV Matching States
  const [userCvText, setUserCvText] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<'interests' | 'cv'>('interests');

  // Active Job Details Modal
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  
  // Pitch Generator Modal
  const [pitchJob, setPitchJob] = useState<Job | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [generatedPitchText, setGeneratedPitchText] = useState('');

  // Live Scraping states
  const [liveSearchTerm, setLiveSearchTerm] = useState('');
  const [liveLocationTerm, setLiveLocationTerm] = useState('Ecuador');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingMessage, setScrapingMessage] = useState('');

  // Fetch jobs data on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/jobs')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Job[]) => {
        setJobs(data);
        setLoading(false);
      })
      .catch(() => {
        console.log('Servidor backend local offline o inalcanzable. Cargando vacantes locales desde JSON estatico.');
        fetch('./scraped_jobs.json')
          .then((res) => {
            if (!res.ok) {
              throw new Error('No se pudo cargar el archivo de vacantes scraped_jobs.json');
            }
            return res.json();
          })
          .then((data: Job[]) => {
            setJobs(data);
            setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setError(err.message);
            setLoading(false);
          });
      });
  }, []);

  // Handler for Live Scraping on LinkedIn
  const handleLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSearchTerm.trim()) return;

    setIsScraping(true);
    setScrapingMessage('Iniciando búsqueda en vivo en LinkedIn...');

    // Simulador de avance de carga para mayor interactividad en la interfaz gráfica
    const messages = [
      'Buscando ofertas publicadas en LinkedIn en vivo...',
      'Evitando sistemas anti-bloqueo y cargando resultados...',
      'Descargando descripciones detalladas de vacantes...',
      'Clasificando requisitos, modalidad y aptitud con IA Gemini...',
      'Verificando convenios institucionales activos con la base de datos UG...'
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      if (msgIdx < messages.length - 1) {
        msgIdx++;
        setScrapingMessage(messages[msgIdx]);
      }
    }, 4500);

    try {
      const response = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyword: liveSearchTerm,
          location: liveLocationTerm
        })
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor del scraper.');
      }

      const updatedJobs = await response.json();
      setJobs(updatedJobs);
      setIsScraping(false);
      setLiveSearchTerm('');
      alert('Búsqueda completada con éxito. Se han integrado los nuevos resultados.');
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setIsScraping(false);
      alert('No se pudo conectar con el backend. Asegúrate de iniciar el servidor con "npm run start-server" en la carpeta principal del scraper.');
    }
  };

  // Helper to convert postedTime string to approximate hours ago for sorting
  const getPostedHoursAgo = (postedTime: string): number => {
    const timeStr = (postedTime || '').toLowerCase();
    if (!timeStr) return 999999;
    
    const match = timeStr.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 1;
    
    if (timeStr.includes('segundo') || timeStr.includes('second')) {
      return num / 3600;
    }
    if (timeStr.includes('minuto') || timeStr.includes('minute')) {
      return num / 60;
    }
    if (timeStr.includes('hora') || timeStr.includes('hour')) {
      return num;
    }
    if (timeStr.includes('día') || timeStr.includes('dia') || timeStr.includes('day')) {
      return num * 24;
    }
    if (timeStr.includes('semana') || timeStr.includes('week')) {
      return num * 24 * 7;
    }
    if (timeStr.includes('mes') || timeStr.includes('month')) {
      return num * 24 * 30;
    }
    
    return 999999;
  };

  // Helper to extract province from location string
  const getProvince = (location: string): string => {
    const loc = location.toLowerCase();
    if (loc.includes('guayas') || loc.includes('guayaquil') || loc.includes('duran')) return 'Guayas';
    if (loc.includes('pichincha') || loc.includes('quito')) return 'Pichincha';
    if (loc.includes('cotopaxi') || loc.includes('lasso') || loc.includes('latacunga')) return 'Cotopaxi';
    if (loc.includes('azuay') || loc.includes('cuenca')) return 'Azuay';
    if (loc.includes('manabi') || loc.includes('manta') || loc.includes('portoviejo')) return 'Manabí';
    return 'Otras / Remoto';
  };

  // Toggle user interests
  const handleInterestToggle = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
  };

  // Compute matching scores dynamically
  const computeMatchScore = (job: Job): number => {
    const jobSkills = job.requiredSkills.map((s) => s.toLowerCase());
    const jobText = (job.title + ' ' + job.description + ' ' + job.refinedSummary).toLowerCase();

    if (matchMode === 'interests') {
      if (selectedInterests.length === 0) return 0;
      let matchedCount = 0;
      
      selectedInterests.forEach((interest) => {
        const intLower = interest.toLowerCase();
        if (jobSkills.includes(intLower) || jobText.includes(intLower)) {
          matchedCount++;
        }
      });
      
      return Math.round((matchedCount / selectedInterests.length) * 100);
    } else {
      if (!userCvText.trim()) return 0;
      const cvTextLower = userCvText.toLowerCase();
      if (job.requiredSkills.length === 0) return 0;
      
      let matchedCount = 0;
      job.requiredSkills.forEach((skill) => {
        if (cvTextLower.includes(skill.toLowerCase())) {
          matchedCount++;
        }
      });
      
      return Math.round((matchedCount / job.requiredSkills.length) * 100);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let result = jobs.map((job) => ({
      ...job,
      matchScore: computeMatchScore(job)
    }));

    // Filter by text search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.description.toLowerCase().includes(searchLower) ||
          job.requiredSkills.some((s) => s.toLowerCase().includes(searchLower))
      );
    }

    // Filter by active agreement
    if (agreementFilter === 'yes') {
      result = result.filter((job) => job.hasActiveAgreement === true);
    } else if (agreementFilter === 'no') {
      result = result.filter((job) => job.hasActiveAgreement !== true);
    }

    // Filter by job type (internship vs formal work)
    if (jobTypeFilter === 'intern') {
      result = result.filter((job) => job.isSuitableForInternship);
    } else if (jobTypeFilter === 'formal') {
      result = result.filter((job) => !job.isSuitableForInternship);
    }

    // Filter by province
    if (provinceFilter !== 'all') {
      result = result.filter((job) => getProvince(job.location) === provinceFilter);
    }

    // Filter by source (job board vs direct recruiter post)
    if (sourceFilter === 'jobboard') {
      result = result.filter((job) => !job.isDirectPost);
    } else if (sourceFilter === 'recruiter') {
      result = result.filter((job) => job.isDirectPost);
    }

    // Sort by Match Score (descending) first (if matching input active), and by Recency (most recent first = lowest hours ago) as tie-breaker
    const hasActiveMatchInput =
      (matchMode === 'interests' && selectedInterests.length > 0) ||
      (matchMode === 'cv' && userCvText.trim().length > 0);

    result.sort((a, b) => {
      if (hasActiveMatchInput) {
        const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
      }
      return getPostedHoursAgo(a.postedTime) - getPostedHoursAgo(b.postedTime);
    });

    setFilteredJobs(result);
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [jobs, searchTerm, agreementFilter, jobTypeFilter, provinceFilter, sourceFilter, userCvText, selectedInterests, matchMode]);

  // Generate customized pitch cover letter
  useEffect(() => {
    if (!pitchJob) return;

    const name = userName.trim() || '[Tu Nombre]';
    const email = userEmail.trim() || '[Tu Email]';
    const skillsText = selectedInterests.length > 0 
      ? selectedInterests.join(', ')
      : 'desarrollo de software y soporte técnico';

    let pitch = '';

    if (pitchJob.isDirectPost) {
      pitch = `Asunto: ${pitchJob.applicationSubject || 'Postulacion a Vacante'}\n\n`;
      pitch += `Estimado/a ${pitchJob.recruiterName || 'Equipo de Seleccion'},\n\n`;
      pitch += `Mi nombre es ${name} y me pongo en contacto con usted en referencia a su publicacion de LinkedIn para la posicion de ${pitchJob.title} en Guayaquil.\n\n`;
      pitch += `Actualmente soy estudiante de ultimos semestres en el area de TI. Cuento con conocimientos y experiencia practica en habilidades como ${skillsText}, lo cual considero me permite aportar valor inmediato en las actividades de soporte e infraestructura de su prestigiosa organizacion.\n\n`;
      pitch += `Adjunto mi hoja de vida para su revision. Quedo a su disposicion para mantener una entrevista y conversar sobre mi perfil.\n\n`;
      pitch += `Atentamente,\n`;
      pitch += `${name}\n`;
      pitch += `Contacto: ${email}\n`;
    } else {
      pitch = `Estimado Equipo de Talent Acquisition de ${pitchJob.company},\n\n`;
      pitch += `Me dirijo a ustedes para postularme a la vacante de ${pitchJob.title} publicada en LinkedIn.\n\n`;
      pitch += `Como estudiante de la Universidad de Guayaquil, destaco que mi perfil se alinea con los requerimientos tecnicos del puesto. Tengo formacion y proyectos relacionados con ${skillsText}.\n\n`;
      
      if (pitchJob.hasActiveAgreement) {
        pitch += `Cabe recalcar que ${pitchJob.company} mantiene actualmente un convenio de pasantias institucional activo con la Universidad de Guayaquil (Codigo: ${pitchJob.agreementCode}), lo que facilitaria la gestion administrativa de mi convalidacion de horas de manera inmediata.\n\n`;
      }

      pitch += `Agradezco de antemano su tiempo para revisar mi perfil y adjunto mi CV para mas detalles.\n\n`;
      pitch += `Atentamente,\n`;
      pitch += `${name}\n`;
      pitch += `Contacto: ${email}\n`;
    }

    setGeneratedPitchText(pitch);
  }, [pitchJob, userName, userEmail, selectedInterests]);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(generatedPitchText);
    alert('Texto copiado al portapapeles');
  };

  const handleSendEmail = () => {
    if (pitchJob && pitchJob.contactEmail) {
      const subject = encodeURIComponent(pitchJob.applicationSubject || 'Postulación a vacante');
      const body = encodeURIComponent(generatedPitchText);
      window.location.href = `mailto:${pitchJob.contactEmail}?subject=${subject}&body=${body}`;
    }
  };

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE) || 1;
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-title-area">
          <h1>LinkUG - Empleo y Pasantías</h1>
          <p>Plataforma inteligente de matching de vacantes y convenios institucionales</p>
        </div>
        <div className="app-stats">
          <span className="badge badge-convenio-active">
            Convenios Activos cargados: {jobs.filter(j => j.hasActiveAgreement).length}
          </span>
        </div>
      </header>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <strong>Error de carga:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Cargando vacantes y base de datos de convenios...</p>
        </div>
      ) : (
        <div className="main-grid">
          {/* Sidebar / Filters */}
          <aside className="sidebar-panel">
            <div className="panel-section" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 className="panel-section-title" style={{ color: '#2563eb' }}>Búsqueda en Vivo (LinkedIn)</h4>
              <form onSubmit={handleLiveSearch}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Cargo / Palabra Clave
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Ej. Desarrollador C#"
                    value={liveSearchTerm}
                    onChange={(e) => setLiveSearchTerm(e.target.value)}
                    disabled={isScraping}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Ubicación / País
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Ej. Ecuador"
                    value={liveLocationTerm}
                    onChange={(e) => setLiveLocationTerm(e.target.value)}
                    disabled={isScraping}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isScraping || !liveSearchTerm.trim()}
                >
                  {isScraping ? 'Buscando...' : 'Buscar en LinkedIn'}
                </button>
              </form>
            </div>

            <div className="panel-section">
              <h4 className="panel-section-title">Buscar en Resultados</h4>
              <input
                type="text"
                className="search-input"
                placeholder="Cargo, empresa o habilidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="panel-section">
              <h4 className="panel-section-title">Convenio con la UG</h4>
              <select
                className="filter-select"
                value={agreementFilter}
                onChange={(e) => setAgreementFilter(e.target.value as any)}
              >
                <option value="all">Todos los convenios</option>
                <option value="yes">Con convenio activo (Sí)</option>
                <option value="no">Sin convenio (No)</option>
              </select>
            </div>

            <div className="panel-section">
              <h4 className="panel-section-title">Tipo de Empleo</h4>
              <select
                className="filter-select"
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value as any)}
              >
                <option value="all">Todas las modalidades</option>
                <option value="intern">Pasantías universitarias</option>
                <option value="formal">Trabajo formal / Completo</option>
              </select>
            </div>

            <div className="panel-section">
              <h4 className="panel-section-title">Provincia (Ecuador)</h4>
              <select
                className="filter-select"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
              >
                <option value="all">Todas las provincias</option>
                <option value="Guayas">Guayas (Guayaquil)</option>
                <option value="Pichincha">Pichincha (Quito)</option>
                <option value="Cotopaxi">Cotopaxi (Lasso)</option>
                <option value="Azuay">Azuay (Cuenca)</option>
                <option value="Otras / Remoto">Otras / Remoto</option>
              </select>
            </div>

            <div className="panel-section">
              <h4 className="panel-section-title">Origen de Publicación</h4>
              <select
                className="filter-select"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
              >
                <option value="all">Todos los orígenes</option>
                <option value="jobboard">Buscador formal de LinkedIn</option>
                <option value="recruiter">Publicación de Talento Humano</option>
              </select>
            </div>

            {/* Smart Matching Section */}
            <div className="panel-section" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <h4 className="panel-section-title" style={{ color: '#2563eb' }}>Calcular Afinidad</h4>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  className={`btn ${matchMode === 'interests' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexGrow: 1, padding: '0.4rem' }}
                  onClick={() => setMatchMode('interests')}
                >
                  Intereses
                </button>
                <button
                  className={`btn ${matchMode === 'cv' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexGrow: 1, padding: '0.4rem' }}
                  onClick={() => setMatchMode('cv')}
                >
                  Pegar CV
                </button>
              </div>

              {matchMode === 'interests' ? (
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Selecciona tus habilidades para ordenar las vacantes por mayor compatibilidad:
                  </p>
                  <div className="skills-tags-container">
                    {PREDEFINED_INTERESTS.map((interest) => {
                      const isActive = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          className={`skill-tag-toggle ${isActive ? 'active' : ''}`}
                          onClick={() => handleInterestToggle(interest)}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Pega el texto de tu hoja de vida para calcular el porcentaje de match con cada vacante:
                  </p>
                  <textarea
                    className="cv-paste-area"
                    placeholder="Ej. Estudiante de software con experiencia en C#, SQL Server y Git..."
                    value={userCvText}
                    onChange={(e) => setUserCvText(e.target.value)}
                  />
                </div>
              )}
            </div>
          </aside>

          {/* Content Area / Job Cards List */}
          <main className="content-area">
            <div className="results-meta">
              <span className="results-count">
                Mostrando {filteredJobs.length} vacantes encontradas
              </span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="empty-state">
                <h3 className="empty-state-title">No se encontraron vacantes</h3>
                <p className="empty-state-text">Intenta ajustar los filtros de búsqueda o seleccionar otros intereses.</p>
              </div>
            ) : (
              <>
                {paginatedJobs.map((job) => {
                  const showScore = 
                    (matchMode === 'interests' && selectedInterests.length > 0) ||
                    (matchMode === 'cv' && userCvText.trim().length > 0);

                  return (
                    <article key={job.id} className="job-card">
                      <div className="job-card-header">
                        <div className="job-title-container">
                          <h3 className="job-title">{job.title}</h3>
                          <div className="job-company">
                            {job.company}
                          </div>
                        </div>

                        {showScore && job.matchScore !== undefined && job.matchScore > 0 && (
                          <div className="match-score-badge">
                            {job.matchScore}% Match
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="badge-group">
                        <span className={`badge ${job.hasActiveAgreement ? 'badge-convenio-active' : 'badge-convenio-inactive'}`}>
                          {job.hasActiveAgreement ? `Convenio Activo UG: Sí` : 'Sin Convenio UG'}
                        </span>
                        <span className={`badge ${job.isSuitableForInternship ? 'badge-internship' : 'badge-formal'}`}>
                          {job.isSuitableForInternship ? 'Pasantía' : 'Trabajo Formal'}
                        </span>
                        <span className="badge badge-modality">{job.workModality}</span>
                        {job.isDirectPost && (
                          <span className="badge badge-recruiter-post">Publicación de Reclutador</span>
                        )}
                      </div>

                      {/* Recruiter specific info */}
                      {job.isDirectPost && job.recruiterName && (
                        <div className="recruiter-profile-section">
                          <div className="recruiter-avatar-mock">
                            {job.recruiterName.charAt(0)}
                          </div>
                          <div className="recruiter-info-text">
                            <h5>{job.recruiterName}</h5>
                            <p>{job.recruiterTitle}</p>
                          </div>
                        </div>
                      )}

                      <p className="job-summary">
                        {job.refinedSummary || job.description}
                      </p>

                      {/* Skills Tags */}
                      {job.requiredSkills.length > 0 && (
                        <div className="skills-list">
                          {job.requiredSkills.map((skill) => (
                            <span key={skill} className="skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="job-card-footer">
                        <div className="job-meta-location">
                          <span>{job.location}</span>
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <span>{job.postedTime}</span>
                        </div>

                        <div className="card-actions">
                          <button
                            className="btn btn-secondary"
                            onClick={() => setActiveJob(job)}
                          >
                            Ver Detalles
                          </button>
                          
                          <button
                            className="btn btn-primary"
                            onClick={() => setPitchJob(job)}
                          >
                            Generar Postulación
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* Pagination Nav Controls */}
                {totalPages > 1 && (
                  <div className="pagination-container">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setCurrentPage((prev) => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    <span className="page-indicator">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {/* Details Modal */}
      {activeJob && (
        <div className="modal-overlay" onClick={() => setActiveJob(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeJob.title}</h3>
              <button className="modal-close-btn" onClick={() => setActiveJob(null)}>×</button>
            </div>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                {activeJob.company}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Ubicación: {activeJob.location} | Provincia: {getProvince(activeJob.location)}
              </div>
            </div>

            <div className="badge-group" style={{ marginBottom: '1.5rem' }}>
              <span className={`badge ${activeJob.hasActiveAgreement ? 'badge-convenio-active' : 'badge-convenio-inactive'}`}>
                {activeJob.hasActiveAgreement 
                  ? `Convenio Activo UG: ${activeJob.agreementCode} (Facultad: ${activeJob.agreementFaculty})` 
                  : 'Sin Convenio Activo UG'}
              </span>
              <span className={`badge ${activeJob.isSuitableForInternship ? 'badge-internship' : 'badge-formal'}`}>
                {activeJob.isSuitableForInternship ? 'Pasantía Académica' : 'Trabajo Formal'}
              </span>
              <span className="badge badge-modality">Modalidad: {activeJob.workModality}</span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Descripción Completa del Puesto</h4>
              <p style={{ fontSize: '0.925rem', color: '#334155', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {activeJob.description}
              </p>
            </div>

            {activeJob.compatibleCareers.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: '#475569' }}>Carreras Universitarias Compatibles</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {activeJob.compatibleCareers.map(career => (
                    <span key={career} className="badge badge-internship">{career}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setActiveJob(null)}>
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={() => { setPitchJob(activeJob); setActiveJob(null); }}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pitch cover letter modal */}
      {pitchJob && (
        <div className="modal-overlay" onClick={() => setPitchJob(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generador de Postulación</h3>
              <button className="modal-close-btn" onClick={() => setPitchJob(null)}>×</button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
                Ingresa tus datos para redactar automáticamente una propuesta/carta de motivación personalizada para {pitchJob.company}:
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Tu Nombre
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Ej. Steven Quijije"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                    Tu Email / Celular
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Ej. squijijeq@ug.edu.ec"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                Propuesta de Mensaje Generada por IA
              </label>
              <textarea
                className="pitch-textarea"
                readOnly
                value={generatedPitchText}
              />
            </div>

            <div className="pitch-actions">
              <button className="btn btn-secondary" onClick={() => setPitchJob(null)}>
                Cancelar
              </button>
              
              <button className="btn btn-outline" onClick={handleCopyPitch}>
                Copiar Texto
              </button>

              {pitchJob.isDirectPost && pitchJob.contactEmail ? (
                <button className="btn btn-primary" onClick={handleSendEmail}>
                  Enviar Correo Directo
                </button>
              ) : (
                <a href={pitchJob.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  Aplicar en LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {isScraping && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #2563eb', 
              borderRadius: '50%', 
              width: '50px', 
              height: '50px', 
              animation: 'spin 1.5s linear infinite',
              margin: '0 auto 1.5rem auto'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <h3 style={{ marginBottom: '0.5rem' }}>Búsqueda en Curso</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.4' }}>
              {scrapingMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
