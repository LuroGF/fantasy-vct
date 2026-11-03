import Link from "next/link";

export default function AvisoLegalPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="v-panel p-6 sm:p-8 space-y-8">
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Aviso legal</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red mt-2">
            Información jurídica del sitio web
          </p>
        </div>

        <div className="space-y-6 text-sm text-v-white/75 leading-relaxed">

          {/* IDENTIFICACIÓN */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Identificación del titular</h2>
            <p>
              En cumplimiento con lo dispuesto en la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE),
              se informa que el presente sitio web es titularidad de:
            </p>
            <p>
              <strong>Titular:</strong> [NOMBRE Y APELLIDOS PENDIENTES]<br />
              <strong>Situación:</strong> particular residente en España<br />
              <strong>Domicilio profesional:</strong> [PENDIENTE]<br />
              <strong>Email de contacto:</strong> [CORREO DEFINITIVO PENDIENTE]<br />
              <strong>Actividad:</strong> Plataforma digital de gestión de ligas fantasy basadas en competiciones de esports (VCT).
            </p>
            <p className="text-v-red">
              Documento provisional. Los datos identificativos se completarán antes del lanzamiento público.
            </p>
          </section>

          {/* OBJETO */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Objeto</h2>
            <p>
              El presente sitio web tiene como finalidad ofrecer a los usuarios una plataforma de gestión de ligas fantasy basadas en competiciones
              de esports, permitiendo la creación de ligas, gestión de equipos y participación en dinámicas competitivas virtuales.
            </p>
          </section>

          {/* CONDICIONES DE USO */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Condiciones de uso</h2>
            <p>
              Para registrarse es necesario tener al menos 16 años y aceptar los{" "}
              <Link href="/terminos" className="font-black text-v-red hover:underline">Términos de uso</Link>.
            </p>
            <p>
              El usuario se compromete a hacer un uso adecuado del sitio, respetando la legalidad vigente y evitando:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Realizar actividades ilícitas o contrarias a la buena fe</li>
              <li>Intentar acceder a cuentas de otros usuarios</li>
              <li>Manipular resultados o sistemas de la plataforma</li>
              <li>Introducir software malicioso o dañar el sistema</li>
            </ul>
          </section>

          {/* FUNCIONAMIENTO */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Funcionamiento del servicio</h2>
            <p>
              La plataforma permite la participación en ligas fantasy basadas en competiciones de esports como el VCT (Valorant Champions Tour).
            </p>
            <p>
              Los resultados, puntuaciones y dinámicas del juego son simulaciones basadas en datos de rendimiento y reglas internas de la plataforma,
              no representando apuestas ni juegos de azar.
            </p>
          </section>

          {/* PROPIEDAD INTELECTUAL */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Propiedad intelectual</h2>
            <p>
              Todos los contenidos del sitio web (diseño, textos, código, logos, interfaz, etc.) son propiedad del titular o cuentan con licencia,
              estando protegidos por la normativa de propiedad intelectual.
            </p>
            <p>
              Las referencias a equipos, jugadores o competiciones de esports pertenecen a sus respectivos propietarios y se utilizan con fines informativos.
            </p>
            <p>
              [NOMBRE DE LA APLICACIÓN] no está respaldada por Riot Games y no refleja las opiniones de Riot Games ni de ninguna persona involucrada oficialmente en la producción o gestión de las propiedades de Riot Games. Riot Games y todas sus propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
            </p>
          </section>

          {/* RESPONSABILIDAD */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Responsabilidad</h2>
            <p>
              El titular no se hace responsable de:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Errores en los datos o puntuaciones mostradas</li>
              <li>Interrupciones del servicio por causas técnicas</li>
              <li>Uso indebido de la plataforma por parte de los usuarios</li>
            </ul>
            <p>
              Se intentará garantizar la disponibilidad y correcto funcionamiento del servicio en todo momento.
            </p>
          </section>

          {/* ENLACES */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Enlaces externos</h2>
            <p>
              Este sitio puede contener enlaces a páginas externas. El titular no se responsabiliza del contenido ni del funcionamiento de dichas webs.
            </p>
          </section>

          {/* PROTECCIÓN DE DATOS */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Protección de datos</h2>
            <p>
              El tratamiento de datos personales se rige por el Reglamento General de Protección de Datos (RGPD) y la normativa aplicable.
            </p>
            <p>
              Para más información, consulta la{" "}
              <Link href="/privacidad" className="font-black text-v-red hover:underline">Política de privacidad</Link>.
            </p>
          </section>

          {/* CONTACTO */}
          <section className="space-y-2">
            <h2 className="text-xl italic uppercase">Contacto</h2>
            <p>
              Para cualquier consulta legal o relacionada con el sitio web, puedes contactar en:
            </p>
            <p>
              <strong>Email:</strong> [CORREO DEFINITIVO PENDIENTE]
            </p>
          </section>

          <nav className="flex flex-wrap gap-4 border-t border-white/10 pt-5 text-[10px] font-black uppercase tracking-wider">
            <Link href="/privacidad" className="hover:text-v-red">Privacidad</Link>
            <Link href="/terminos" className="hover:text-v-red">Términos</Link>
            <Link href="/cookies" className="hover:text-v-red">Cookies</Link>
          </nav>

        </div>
      </div>
    </div>
  );
}
