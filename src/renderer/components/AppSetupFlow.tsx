import React, { useState } from 'react';
import './AppSetupFlow.css';

interface AppSetupFlowProps {
  onComplete: () => void;
}

const AppSetupFlow: React.FC<AppSetupFlowProps> = ({ onComplete }) => {
  const [lastfmKey, setLastfmKey] = useState('');
  const [lastfmSecret, setLastfmSecret] = useState('');
  const [discogsId, setDiscogsId] = useState('');
  const [discogsSecret, setDiscogsSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lastfmKey || !lastfmSecret) {
      setError('Las llaves de Last.fm son obligatorias.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use relative path since frontend is served by the backend in production
      const response = await fetch('/api/v1/auth/app-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastfmApiKey: lastfmKey,
          lastfmApiSecret: lastfmSecret,
          discogsClientId: discogsId,
          discogsClientSecret: discogsSecret,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onComplete(); // Setup finished
      } else {
        setError(data.error || 'Error al guardar las credenciales');
      }
    } catch {
      setError('Error de conexión con el servidor. ¿Está ejecutándose el backend?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="setup-flow">
      <div className="setup-container">
        <div className="setup-header">
          <div className="setup-logo">
            <span className="material-icons-round setup-icon">build_circle</span>
          </div>
          <h1>Configuración Inicial</h1>
          <p>
            ¡Bienvenido a DiscogScrobbler! Esta aplicación no tiene archivos .env preconfigurados.
            Por favor, ingresa las llaves de desarrollo de la aplicación para continuar.
            <b> Solo tendrás que hacer esto una vez.</b>
          </p>
        </div>

        {error && <div className="setup-error">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          <section className="setup-section">
            <div className="section-header">
              <h2>1. Last.fm API (Obligatorio)</h2>
              <a 
                href="https://www.last.fm/api/account/create" 
                target="_blank" 
                rel="noreferrer"
                className="help-link"
              >
                Obtener aquí <span className="material-icons-round">open_in_new</span>
              </a>
            </div>
            <p className="help-text">
              Registra una app con Callback URL: <code>http://localhost:3001/api/v1/auth/lastfm/callback</code>
            </p>
            <div className="form-group">
              <label>API Key</label>
              <input
                type="text"
                value={lastfmKey}
                onChange={(e) => setLastfmKey(e.target.value)}
                placeholder="ej: 1c8bfb2d..."
                required
              />
            </div>
            <div className="form-group">
              <label>Shared Secret</label>
              <input
                type="text"
                value={lastfmSecret}
                onChange={(e) => setLastfmSecret(e.target.value)}
                placeholder="ej: e4b7a99..."
                required
              />
            </div>
          </section>

          <section className="setup-section">
            <div className="section-header">
              <h2>2. Discogs API (Opcional)</h2>
              <a 
                href="https://www.discogs.com/settings/developers" 
                target="_blank" 
                rel="noreferrer"
                className="help-link"
              >
                Obtener aquí <span className="material-icons-round">open_in_new</span>
              </a>
            </div>
            <p className="help-text">
              Recomendado para colecciones grandes (aumenta el límite de descarga de 25 a 60 items por minuto).
            </p>
            <div className="form-group">
              <label>Consumer Key</label>
              <input
                type="text"
                value={discogsId}
                onChange={(e) => setDiscogsId(e.target.value)}
                placeholder="ej: fuaJYR..."
              />
            </div>
            <div className="form-group">
              <label>Consumer Secret</label>
              <input
                type="text"
                value={discogsSecret}
                onChange={(e) => setDiscogsSecret(e.target.value)}
                placeholder="ej: wpUkh..."
              />
            </div>
          </section>

          <button 
            type="submit" 
            className="setup-submit-btn" 
            disabled={isSubmitting || !lastfmKey || !lastfmSecret}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar e Iniciar Aplicación'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AppSetupFlow;
