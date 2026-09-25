import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos de Servicio",
  description: "Condiciones de uso del simulador matemático AXIOM.",
  robots: { index: true, follow: false },
};

const UPDATED = "25 de septiembre de 2026";
const CONTACT = "ma@urpeailab.com";

export default function TerminosPage() {
  return (
    <article className="prose prose-stone max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-vermilion prose-a:no-underline hover:prose-a:underline">
      <p className="font-mono text-xs text-graphite">Última actualización: {UPDATED}</p>

      <h1>Términos de Servicio</h1>

      <p>
        Al acceder o usar AXIOM (<em>axiom-simulator.vercel.app</em>) aceptas estos términos.
        Si no los aceptas, no uses el servicio.
      </p>

      {/* 1 */}
      <h2>1. Descripción del servicio</h2>
      <p>
        AXIOM es un entorno de exploración matemática de código abierto que proporciona
        herramientas interactivas para graficación, fractales, topología, sistemas dinámicos,
        geometría 4D, computación cuántica, autómatas celulares y documentación matemática.
        El servicio se ofrece de forma gratuita y sin garantías.
      </p>

      {/* 2 */}
      <h2>2. Uso aceptable</h2>
      <p>Al usar AXIOM te comprometes a:</p>
      <ul>
        <li>No realizar scraping masivo automatizado que degrade el rendimiento del servicio.</li>
        <li>No intentar acceder a áreas restringidas (panel de administración, APIs internas).</li>
        <li>No usar el servicio para actividades ilegales bajo la legislación aplicable.</li>
        <li>No suplantar identidades de otros usuarios o del equipo de AXIOM.</li>
        <li>No introducir malware, virus o código malicioso de ningún tipo.</li>
      </ul>
      <p>
        Nos reservamos el derecho a suspender cuentas o bloquear accesos que violen estas
        condiciones, sin previo aviso y sin responsabilidad.
      </p>

      {/* 3 */}
      <h2>3. Cuentas de usuario</h2>
      <p>
        Algunas funcionalidades requieren registro. Eres responsable de:
      </p>
      <ul>
        <li>Mantener la confidencialidad de tus credenciales.</li>
        <li>Toda la actividad que ocurra bajo tu cuenta.</li>
        <li>Notificarnos inmediatamente si sospechas acceso no autorizado a tu cuenta.</li>
      </ul>
      <p>
        Puedes solicitar la eliminación de tu cuenta en cualquier momento escribiendo a{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      {/* 4 */}
      <h2>4. Propiedad intelectual</h2>
      <p>
        AXIOM es software de código abierto distribuido bajo la{" "}
        <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">
          Licencia MIT
        </a>
        . El código fuente está disponible en{" "}
        <a href="https://github.com/Max-arango/Axiom-Simulator" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        .
      </p>
      <p>
        La marca "AXIOM" y el logotipo son propiedad de sus autores. La licencia MIT
        no otorga derechos sobre la marca.
      </p>
      <p>
        Los cálculos, gráficas y outputs generados por el simulador a partir de tus inputs
        son tuyos. No reclamamos propiedad sobre el contenido matemático que produces.
      </p>

      {/* 5 */}
      <h2>5. Exclusión de garantías</h2>
      <p>
        El servicio se proporciona <strong>"tal cual"</strong> (<em>as is</em>) y{" "}
        <strong>"según disponibilidad"</strong> (<em>as available</em>), sin garantías de
        ningún tipo, expresas o implícitas, incluyendo pero no limitándose a:
      </p>
      <ul>
        <li>Exactitud de los cálculos matemáticos (úsalos como referencia, no como fuente única para decisiones críticas).</li>
        <li>Disponibilidad continua o ininterrumpida del servicio.</li>
        <li>Ausencia de errores o bugs.</li>
        <li>Compatibilidad con todos los navegadores y dispositivos.</li>
      </ul>

      {/* 6 */}
      <h2>6. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley aplicable, AXIOM y sus autores no serán
        responsables de ningún daño directo, indirecto, incidental, especial, consecuente
        o punitivo derivado del uso o la imposibilidad de uso del servicio, incluyendo
        pérdida de datos, pérdida de beneficios o interrupción de actividad.
      </p>
      <p>
        Esta limitación aplica incluso si se ha notificado la posibilidad de tales daños.
      </p>

      {/* 7 */}
      <h2>7. Contenido de terceros y enlaces externos</h2>
      <p>
        AXIOM puede enlazar a recursos externos (GitHub, documentación matemática, etc.).
        No controlamos ni somos responsables del contenido, políticas de privacidad o
        prácticas de sitios de terceros.
      </p>

      {/* 8 */}
      <h2>8. Modificaciones del servicio y los términos</h2>
      <p>
        Nos reservamos el derecho a modificar, suspender o discontinuar el servicio
        (o cualquier parte de él) en cualquier momento, con o sin previo aviso.
      </p>
      <p>
        Si modificamos estos términos, lo notificaremos actualizando la fecha de esta página.
        El uso continuado del servicio tras la publicación de cambios implica su aceptación.
      </p>

      {/* 9 */}
      <h2>9. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por la legislación española. Para cualquier controversia,
        las partes se someten a los juzgados y tribunales del domicilio del usuario,
        sin perjuicio de la normativa imperativa de protección al consumidor aplicable.
      </p>

      {/* 10 */}
      <h2>10. Contacto</h2>
      <p>
        Para cualquier cuestión relacionada con estos términos:{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>

      <hr />
      <p className="text-sm text-graphite">
        Ver también:{" "}
        <Link href="/legal/privacidad">Política de Privacidad</Link>
        {" · "}
        <Link href="/legal/cookies">Política de Cookies</Link>
      </p>
    </article>
  );
}
