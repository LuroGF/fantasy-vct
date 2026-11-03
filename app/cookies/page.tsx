import { LegalPage } from "@/components/LegalPage";

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies y almacenamiento" subtitle="Tecnologías necesarias">
      <section className="space-y-2">
        <h2>1. Uso actual</h2>
        <p>
          La aplicación utiliza cookies técnicas de Supabase necesarias para iniciar sesión, mantenerla de forma segura
          y proteger las áreas privadas. Estas tecnologías no se utilizan para publicidad ni seguimiento comercial.
        </p>
      </section>

      <section className="space-y-2">
        <h2>2. Almacenamiento local</h2>
        <p>
          El navegador puede guardar una preferencia técnica para recordar si instalaste o descartaste la instalación de
          la aplicación como PWA. Si activas notificaciones, también conserva la suscripción técnica requerida por el servicio push.
        </p>
      </section>

      <section className="space-y-2">
        <h2>3. Consentimiento</h2>
        <p>
          Actualmente no se instalan cookies analíticas, publicitarias o de personalización opcional, por lo que no se
          muestra un banner de consentimiento. Si se incorporan en el futuro, permanecerán desactivadas hasta que puedas
          aceptarlas o rechazarlas con el mismo nivel de facilidad.
        </p>
      </section>

      <section className="space-y-2">
        <h2>4. Control desde el navegador</h2>
        <p>
          Puedes eliminar las cookies y el almacenamiento desde la configuración del navegador. Bloquear las cookies
          técnicas puede impedir el inicio de sesión y el funcionamiento de las zonas privadas.
        </p>
      </section>
    </LegalPage>
  );
}
