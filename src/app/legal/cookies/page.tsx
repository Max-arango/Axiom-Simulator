import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Información sobre el uso de cookies y almacenamiento local en AXIOM.",
  robots: { index: true, follow: false },
};

const UPDATED = "25 de septiembre de 2026";
const CONTACT = "ma@urpeailab.com";

export default function CookiesPage() {
  return (
    <article className="prose prose-stone max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-vermilion prose-a:no-underline hover:prose-a:underline">
      <p className="font-mono text-xs text-graphite">Última actualización: {UPDATED}</p>

      <h1>Política de Cookies</h1>

      <p>
        Esta política explica qué cookies y mecanismos de almacenamiento local utiliza AXIOM,
        para qué sirven y cómo puedes controlarlos.
      </p>

      {/* 1 */}
      <h2>1. ¿Qué es una cookie?</h2>
      <p>
        Una cookie es un pequeño archivo de texto que un sitio web guarda en tu navegador.
        Las cookies pueden ser de sesión (desaparecen al cerrar el navegador) o persistentes
        (permanecen durante un tiempo determinado).
      </p>

      {/* 2 */}
      <h2>2. Cookies que usamos</h2>

      <h3>2.1 Cookies estrictamente necesarias</h3>
      <p>
        Son imprescindibles para el funcionamiento del sitio. No requieren tu consentimiento
        (art. 22.2 LSSI y Considerando 25 de la Directiva ePrivacy).
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie / clave</th>
            <th>Proveedor</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-*-auth-token</code></td>
            <td>Supabase</td>
            <td>Token de sesión de autenticación. Solo se establece si inicias sesión.</td>
            <td>7 días (refresh token); 1 hora (access token)</td>
          </tr>
          <tr>
            <td><code>sb-*-auth-token-code-verifier</code></td>
            <td>Supabase</td>
            <td>Verificador PKCE para flujos OAuth seguros.</td>
            <td>Sesión</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 Cookies de analítica (sin identificación personal)</h3>
      <p>
        Vercel Analytics no establece cookies de seguimiento tradicionales. Usa técnicas de
        privacidad diferencial para agregar datos de uso sin identificar usuarios individuales.
        No recoge dirección IP completa ni información personal.
      </p>
      <table>
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Datos recogidos</th>
            <th>Identificación personal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel Analytics</td>
            <td>Páginas visitadas, país/región, dispositivo, navegador, tiempos de carga.</td>
            <td>No</td>
          </tr>
          <tr>
            <td>Vercel Speed Insights</td>
            <td>Métricas Core Web Vitals (LCP, FID, CLS) agregadas.</td>
            <td>No</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Almacenamiento local (localStorage)</h3>
      <p>
        El simulador guarda datos <strong>únicamente en tu dispositivo</strong> mediante
        <code>localStorage</code>. Estos datos <strong>nunca se envían a nuestros servidores</strong>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Clave</th>
            <th>Contenido</th>
            <th>Se envía al servidor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>axiom.life.boards</code></td>
            <td>Tableros del Juego de la Vida guardados por ti.</td>
            <td>No</td>
          </tr>
          <tr>
            <td><code>axiom.quantum.circuits</code></td>
            <td>Circuitos cuánticos guardados.</td>
            <td>No</td>
          </tr>
          <tr>
            <td><code>axiom.notebook.*</code></td>
            <td>Experimentos del notebook (autoguardado).</td>
            <td>No</td>
          </tr>
        </tbody>
      </table>

      {/* 3 */}
      <h2>3. Cookies que NO usamos</h2>
      <ul>
        <li>Google Analytics o cualquier producto de Google.</li>
        <li>Facebook Pixel u otras redes publicitarias.</li>
        <li>Cookies de perfilado o retargeting.</li>
        <li>Scripts de terceros para publicidad.</li>
      </ul>

      {/* 4 */}
      <h2>4. Cómo gestionar las cookies</h2>

      <h3>Desde tu navegador</h3>
      <p>
        Puedes ver, bloquear o eliminar cookies en la configuración de tu navegador:
      </p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
        <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Firefox</a></li>
        <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
        <li><a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">Edge</a></li>
      </ul>

      <h3>localStorage del simulador</h3>
      <p>
        Para borrar los datos locales del simulador puedes usar las herramientas de desarrollo
        de tu navegador (F12 → Application → Local Storage → borrar las claves{" "}
        <code>axiom.*</code>) o usar los botones de eliminación dentro del propio simulador.
      </p>

      <h3>Consecuencias de bloquear cookies</h3>
      <p>
        Bloquear las cookies de Supabase (<code>sb-*</code>) impedirá iniciar sesión.
        El simulador de matemáticas funciona completamente sin cookies ni sesión.
      </p>

      {/* 5 */}
      <h2>5. Actualizaciones</h2>
      <p>
        Si añadimos nuevos servicios que usen cookies lo reflejaremos en esta política y
        actualizaremos la fecha. El uso continuado del sitio implica la aceptación de los cambios.
      </p>

      {/* 6 */}
      <h2>6. Contacto</h2>
      <p>
        Cualquier duda sobre el uso de cookies: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>

      <hr />
      <p className="text-sm text-graphite">
        Ver también:{" "}
        <Link href="/legal/privacidad">Política de Privacidad y Tratamiento de Datos</Link>
      </p>
    </article>
  );
}
