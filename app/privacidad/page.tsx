import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" subtitle="Cómo tratamos tus datos">
      <section className="space-y-2">
        <h2>1. Responsable</h2>
        <p>
          <strong>Titular:</strong> [NOMBRE Y APELLIDOS PENDIENTES]<br />
          <strong>Situación:</strong> particular residente en España<br />
          <strong>Contacto de privacidad:</strong> [CORREO DEFINITIVO PENDIENTE]
        </p>
        <p>Esta política se completará con la identidad y el domicilio profesional antes del lanzamiento público.</p>
      </section>

      <section className="space-y-2">
        <h2>2. Datos tratados</h2>
        <ul>
          <li>Correo electrónico, identificador de cuenta, nombre de usuario y datos opcionales del perfil.</li>
          <li>Ligas, plantillas, alineaciones, puntos, presupuestos virtuales, pujas, ofertas y movimientos del mercado.</li>
          <li>Reportes entre miembros y comunicaciones necesarias para moderar las ligas.</li>
          <li>Preferencias de notificaciones y, si las activas, la suscripción técnica necesaria para enviar avisos push.</li>
          <li>Datos técnicos de sesión, dirección IP y registros de seguridad generados por los proveedores de infraestructura.</li>
        </ul>
        <p>La aplicación no almacena tu contraseña en texto legible; la autenticación es gestionada por Supabase.</p>
      </section>

      <section className="space-y-2">
        <h2>3. Finalidades y bases jurídicas</h2>
        <ul>
          <li><strong>Prestación del servicio:</strong> crear la cuenta, gestionar ligas, mercado, clasificaciones y recompensas virtuales. Base: ejecución de los términos de uso.</li>
          <li><strong>Notificaciones push:</strong> enviar los avisos que actives. Base: consentimiento, que puedes retirar desde Notificaciones.</li>
          <li><strong>Seguridad y moderación:</strong> prevenir fraude, abuso y accesos indebidos, y tramitar reportes. Base: interés legítimo en proteger el servicio y a sus usuarios.</li>
          <li><strong>Obligaciones legales:</strong> atender solicitudes o requerimientos válidos. Base: cumplimiento de obligaciones legales.</li>
        </ul>
        <p>No se enviarán correos promocionales ni se venderán datos personales.</p>
      </section>

      <section className="space-y-2">
        <h2>4. Información visible</h2>
        <p>
          Otros entrenadores pueden ver tu nombre de usuario, avatar, perfil, ligas compartidas, plantilla,
          alineaciones, puntos y posición. Tu correo electrónico no se muestra públicamente.
        </p>
      </section>

      <section className="space-y-2">
        <h2>5. Proveedores y transferencias</h2>
        <p>
          Se utilizan Supabase para autenticación y base de datos, y Vercel para alojamiento y entrega de la aplicación.
          Estos proveedores pueden emplear subencargados y realizar tratamientos internacionales con las garantías
          contractuales que correspondan. Sus condiciones y ubicaciones se revisarán antes del lanzamiento definitivo.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Conservación</h2>
        <ul>
          <li>Los datos de cuenta se conservan mientras la cuenta permanezca activa.</li>
          <li>Al eliminarla, el perfil y los datos operativos asociados se borran de los sistemas activos de forma inmediata.</li>
          <li>Las copias de seguridad pueden permanecer hasta ser sobrescritas conforme al ciclo técnico de los proveedores, sin utilizarse para ninguna finalidad ordinaria.</li>
          <li>Solo cuando exista una incidencia, reclamación u obligación legal podrán conservarse de forma restringida los registros mínimos necesarios durante un máximo de 12 meses, o durante el plazo legal obligatorio si fuese superior.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>7. Tus derechos y eliminación</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, limitación, oposición y portabilidad mediante el correo de
          privacidad. También puedes eliminar directamente la cuenta desde <strong>Más → Perfil → Eliminar cuenta</strong>.
          Si consideras que el tratamiento incumple la normativa, puedes reclamar ante la Agencia Española de Protección de Datos.
        </p>
      </section>

      <section className="space-y-2">
        <h2>8. Edad mínima</h2>
        <p>Es necesario tener al menos 16 años para registrarse y utilizar la aplicación.</p>
      </section>
    </LegalPage>
  );
}
