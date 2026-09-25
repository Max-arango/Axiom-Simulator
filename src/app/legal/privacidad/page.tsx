import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Información sobre cómo AXIOM trata tus datos personales.",
  robots: { index: true, follow: false },
};

const UPDATED = "25 de septiembre de 2026";
const CONTACT = "ma@urpeailab.com";
const SITE = "https://axiom-simulator.vercel.app";

export default function PrivacidadPage() {
  return (
    <article className="prose prose-stone max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-vermilion prose-a:no-underline hover:prose-a:underline">
      <p className="font-mono text-xs text-graphite">Última actualización: {UPDATED}</p>

      <h1>Política de Privacidad y Tratamiento de Datos</h1>

      <p>
        Esta política describe qué datos recoge AXIOM (<em>{SITE}</em>), con qué finalidad,
        durante cuánto tiempo y cuáles son tus derechos. La leemos y actualizamos nosotros mismos;
        no hay letra pequeña.
      </p>

      {/* 1 */}
      <h2>1. Responsable del tratamiento</h2>
      <p>
        AXIOM es un proyecto de código abierto desarrollado de manera independiente.<br />
        Contacto: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>

      {/* 2 */}
      <h2>2. Qué datos recogemos y por qué</h2>

      <h3>2.1 Cuenta de usuario (opcional)</h3>
      <p>
        Si te registras o inicias sesión, recogemos:
      </p>
      <ul>
        <li><strong>Correo electrónico</strong> — para identificarte y enviarte comunicaciones relacionadas con tu cuenta (restablecimiento de contraseña, notificaciones de seguridad).</li>
        <li><strong>Hash de contraseña</strong> — nunca almacenamos tu contraseña en texto plano.</li>
        <li><strong>Metadatos de sesión</strong> — tokens JWT de corta duración gestionados por Supabase Auth para mantener la sesión activa.</li>
      </ul>
      <p>
        Base legal: ejecución de un contrato (art. 6.1.b RGPD) — la cuenta es necesaria para
        acceder a funcionalidades restringidas.
      </p>

      <h3>2.2 Analítica de uso (anónima)</h3>
      <p>
        Usamos <strong>Vercel Analytics</strong> y <strong>Vercel Speed Insights</strong> para
        medir el rendimiento y el uso agregado del sitio. Estos servicios recogen:
      </p>
      <ul>
        <li>Páginas visitadas y tiempos de carga.</li>
        <li>País/región (no ciudad), tipo de dispositivo, navegador.</li>
        <li><strong>No recogen</strong> dirección IP completa, nombre, correo ni ningún identificador personal.</li>
        <li><strong>No usan cookies de seguimiento</strong>; Vercel Analytics utiliza técnicas de privacidad diferencial.</li>
      </ul>
      <p>
        Base legal: interés legítimo (art. 6.1.f RGPD) — mejorar el rendimiento del servicio
        sin identificar usuarios individuales.
      </p>

      <h3>2.3 Datos almacenados localmente en tu navegador</h3>
      <p>
        El simulador guarda en <code>localStorage</code> de tu propio navegador:
      </p>
      <ul>
        <li>Tableros del Juego de la Vida guardados.</li>
        <li>Circuitos cuánticos guardados.</li>
        <li>Experimentos del notebook.</li>
      </ul>
      <p>
        Estos datos <strong>nunca salen de tu dispositivo</strong> ni son enviados a nuestros
        servidores. Puedes borrarlos en cualquier momento desde la configuración de tu navegador.
      </p>

      <h3>2.4 Datos que NO recogemos</h3>
      <ul>
        <li>No usamos Google Analytics, Facebook Pixel ni ninguna red publicitaria.</li>
        <li>No vendemos ni cedemos datos a terceros.</li>
        <li>No recogemos datos de menores de 14 años de forma deliberada.</li>
      </ul>

      {/* 3 */}
      <h2>3. Transferencias internacionales</h2>
      <p>
        Los datos de cuenta se almacenan en infraestructura de <strong>Supabase</strong> (bases de
        datos alojadas en AWS dentro de la región EU West). La analítica se procesa en servidores
        de <strong>Vercel</strong> (EE.UU.), que cuenta con las garantías adecuadas bajo las
        cláusulas contractuales estándar de la UE.
      </p>

      {/* 4 */}
      <h2>4. Plazos de retención</h2>
      <table>
        <thead>
          <tr>
            <th>Dato</th>
            <th>Retención</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Datos de cuenta</td>
            <td>Hasta que elimines tu cuenta, más 30 días de seguridad.</td>
          </tr>
          <tr>
            <td>Tokens de sesión</td>
            <td>1 hora (JWT) + refresh token de 7 días.</td>
          </tr>
          <tr>
            <td>Datos de analítica</td>
            <td>90 días agregados; nunca a nivel individual.</td>
          </tr>
          <tr>
            <td>localStorage</td>
            <td>Indefinido en tu dispositivo, bajo tu control.</td>
          </tr>
        </tbody>
      </table>

      {/* 5 */}
      <h2>5. Tus derechos</h2>
      <p>
        Con arreglo al RGPD (y legislación equivalente), tienes derecho a:
      </p>
      <ul>
        <li><strong>Acceso</strong> — saber qué datos tenemos sobre ti.</li>
        <li><strong>Rectificación</strong> — corregir datos inexactos.</li>
        <li><strong>Supresión</strong> — solicitar el borrado de tus datos.</li>
        <li><strong>Portabilidad</strong> — recibir tus datos en formato estructurado.</li>
        <li><strong>Oposición</strong> — oponerte al tratamiento basado en interés legítimo.</li>
        <li><strong>Limitación</strong> — restringir el tratamiento en determinadas circunstancias.</li>
      </ul>
      <p>
        Para ejercer cualquier derecho escríbenos a{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Respondemos en un plazo máximo de 30 días.
        También puedes reclamar ante la autoridad de control competente (en España, la{" "}
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">AEPD</a>).
      </p>

      {/* 6 */}
      <h2>6. Seguridad</h2>
      <p>
        Las comunicaciones usan TLS. Las contraseñas se almacenan con bcrypt/Argon2 (nunca en
        texto plano). Los tokens de sesión son HttpOnly y Secure. Revisamos periódicamente
        nuestras medidas de seguridad.
      </p>

      {/* 7 */}
      <h2>7. Cambios en esta política</h2>
      <p>
        Si realizamos cambios sustanciales lo notificaremos en el propio sitio y actualizaremos
        la fecha al inicio de este documento. El uso continuado del servicio tras la notificación
        implica la aceptación de los cambios.
      </p>

      {/* 8 */}
      <h2>8. Contacto</h2>
      <p>
        Cualquier consulta sobre privacidad: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>

      <hr />
      <p className="text-sm text-graphite">
        Ver también:{" "}
        <Link href="/legal/cookies">Política de Cookies</Link>
      </p>
    </article>
  );
}
