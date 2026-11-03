import { LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage title="Términos de uso" subtitle="Reglas del servicio fantasy">
      <section className="space-y-2">
        <h2>1. Servicio y aceptación</h2>
        <p>
          [NOMBRE DE LA APLICACIÓN] es un fantasy gratuito basado en competiciones de VCT. Al crear una cuenta aceptas
          estos términos y declaras que tienes al menos 16 años. El servicio se encuentra actualmente en fase beta.
        </p>
      </section>

      <section className="space-y-2">
        <h2>2. Cuenta</h2>
        <p>
          Debes facilitar información válida, proteger tus credenciales y no acceder a cuentas ajenas. No se permite
          crear cuentas para manipular ligas, mercados, recompensas o clasificaciones.
        </p>
      </section>

      <section className="space-y-2">
        <h2>3. Reglas del fantasy</h2>
        <p>
          Las reglas de puntuación, alineaciones, mercado, cláusulas y recompensas publicadas dentro de la aplicación
          forman parte de estos términos. Las estadísticas en directo son provisionales y podrán corregirse si cambia la fuente.
        </p>
      </section>

      <section className="space-y-2">
        <h2>4. Moneda virtual</h2>
        <p>
          Los presupuestos y cantidades expresados en euros son exclusivamente virtuales. No representan dinero real,
          no pueden comprarse, retirarse, venderse ni convertirse en efectivo y no constituyen apuestas o premios económicos.
        </p>
      </section>

      <section className="space-y-2">
        <h2>5. Conducta y moderación</h2>
        <ul>
          <li>No manipular el servicio, explotar errores ni automatizar acciones abusivas.</li>
          <li>No acosar, suplantar, amenazar ni realizar conductas antideportivas.</li>
          <li>No introducir contenido malicioso ni intentar eludir las medidas de seguridad.</li>
        </ul>
        <p>
          Los líderes pueden gestionar participantes y reportes dentro de sus ligas. Las infracciones graves pueden
          ocasionar restricciones, expulsión o suspensión de la cuenta.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Disponibilidad y cambios</h2>
        <p>
          Al tratarse de una beta gratuita, no se garantiza disponibilidad ininterrumpida. Podrán corregirse errores,
          modificar reglas o suspender funciones. Los cambios importantes se comunicarán dentro de la aplicación.
        </p>
      </section>

      <section className="space-y-2">
        <h2>7. Baja</h2>
        <p>
          Puedes eliminar la cuenta desde tu perfil. El liderazgo de tus ligas se transferirá al miembro más antiguo;
          si eres su único miembro, la liga se eliminará. Esta acción es definitiva.
        </p>
      </section>

      <section className="space-y-2">
        <h2>8. Propiedad intelectual y Riot Games</h2>
        <p>
          Las marcas, competiciones, equipos, jugadores y materiales de terceros pertenecen a sus respectivos titulares.
          [NOMBRE DE LA APLICACIÓN] no está respaldada por Riot Games y no refleja las opiniones de Riot Games ni de
          ninguna persona involucrada oficialmente en la producción o gestión de las propiedades de Riot Games. Riot Games
          y todas sus propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
        </p>
      </section>

      <section className="space-y-2">
        <h2>9. Legislación</h2>
        <p>
          Estos términos se rigen por la legislación española, sin limitar las normas imperativas de protección que
          correspondan al usuario por su país de residencia.
        </p>
      </section>
    </LegalPage>
  );
}
