import Link from "next/link";

const faqSections = [
  {
    title: "Primeros pasos",
    items: [
      {
        question: "¿Cómo empiezo a jugar?",
        answer:
          "Crea una liga o únete con su código. Al entrar recibirás presupuesto y una plantilla inicial. Antes de cada jornada revisa que tengas cinco titulares válidos.",
      },
      {
        question: "¿Qué competiciones y jugadores aparecen?",
        answer:
          "La temporada está preparada para VCT 2027 con las cuatro regiones: EMEA, Americas, Pacific y China. Solo entran equipos franquiciados de la temporada. Las plantillas provisionales se sustituyen cuando los fichajes se hacen oficiales.",
      },
      {
        question: "¿Puedo estar en varias ligas?",
        answer:
          "Sí. Cada liga mantiene de forma independiente tu plantilla, presupuesto, pujas, clasificación y recompensas.",
      },
    ],
  },
  {
    title: "Plantilla y jornadas",
    items: [
      {
        question: "¿Quién puntúa en una jornada?",
        answer:
          "Solo puntúan los cinco jugadores que figuren como titulares cuando comienza la jornada. Los suplentes permanecen en tu plantilla y pueden aparecer en el mercado, pero no suman puntos mientras estén en el banquillo.",
      },
      {
        question: "¿Puedo cambiar la alineación después del inicio?",
        answer:
          "No. La alineación se bloquea al comenzar la jornada y se guarda una copia inmutable. Los cambios posteriores se aplicarán a la siguiente jornada.",
      },
      {
        question: "¿Qué ocurre con un jugador suplente o sin equipo?",
        answer:
          "Un jugador suplente en su club puede permanecer en el mercado, pero no puntuará si no juega. Los jugadores de tu banquillo fantasy siguen en tu plantilla y tampoco puntúan. Un jugador sin equipo elegible no puede escogerse ni aparecer en el mercado.",
      },
      {
        question: "¿Dónde veo los puntos de otro entrenador?",
        answer:
          "Entra en la clasificación de la liga, abre su plantilla y selecciona la pestaña Puntos. Podrás consultar la alineación congelada y la aportación de cada titular por jornada.",
      },
    ],
  },
  {
    title: "Mercado",
    items: [
      {
        question: "¿Cómo funcionan las pujas?",
        answer:
          "Las pujas son ocultas. El importe queda comprometido hasta el cierre, aunque el saldo contable no se descuenta hasta ganar. Puedes modificar o retirar una puja mientras la subasta siga abierta.",
      },
      {
        question: "¿Qué significa saldo disponible y exposición?",
        answer:
          "El saldo es tu presupuesto actual. La exposición suma el dinero comprometido en pujas. El disponible es lo que todavía puedes utilizar sin superar tu presupuesto.",
      },
      {
        question: "¿Qué es un clausulazo?",
        answer:
          "Permite fichar a un jugador de un rival pagando su cláusula cuando no está protegido. La operación cambia al jugador de propietario, mueve el dinero de forma atómica y avisa a ambos entrenadores.",
      },
      {
        question: "¿Por qué no veo a un jugador en el mercado?",
        answer:
          "Puede pertenecer ya a una plantilla de esa liga, no estar asociado a un equipo VCT 2027 elegible, estar sin equipo o no formar parte del ciclo de mercado actual.",
      },
    ],
  },
  {
    title: "Puntos, dinero y avisos",
    items: [
      {
        question: "¿Cómo se calculan los puntos?",
        answer:
          "Se utilizan kills, muertes, asistencias, primeras bajas, primeras muertes y ACS. MVP y clutches solo se aplican cuando la fuente los ofrece de forma fiable. La fórmula completa está en Reglas y puntuación.",
      },
      {
        question: "¿Cómo funciona la recompensa diaria?",
        answer:
          "Cada día puedes reclamar 500.000 € desde la campana de notificaciones. Debes reclamarla manualmente y no se acumula si un día no entras.",
      },
      {
        question: "¿Qué notificaciones recibiré?",
        answer:
          "La app puede avisarte de fichajes, clausulazos, ofertas, actividad de mercado, inicio de jornada, revisión del quinteto y recompensa diaria. Puedes elegir las categorías desde Más > Notificaciones.",
      },
      {
        question: "¿Los puntos pueden cambiar después de un partido?",
        answer:
          "Los datos en directo son provisionales. La puntuación puede ajustarse si la fuente corrige estadísticas; el resultado se consolida cuando la serie queda finalizada.",
      },
    ],
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-6 sm:max-w-xl sm:px-6 lg:max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/more"
          aria-label="Volver a Más"
          className="text-v-white/20 transition-colors hover:text-v-white"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Ayuda</h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-v-red">
            Preguntas frecuentes
          </p>
        </div>
      </div>

      <div className="v-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-black italic uppercase">¿Buscas la fórmula exacta?</p>
          <p className="mt-1 text-xs leading-relaxed text-v-white/45">
            Consulta el desglose de puntuación, premios y recompensa diaria.
          </p>
        </div>
        <Link href="/more/rules" className="v-btn-secondary shrink-0 px-5 py-3 text-[9px]">
          Ver reglas
        </Link>
      </div>

      {faqSections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-black italic uppercase tracking-tight text-v-white">
            {section.title}
          </h2>
          <div className="v-panel divide-y divide-white/5 overflow-hidden">
            {section.items.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-left text-[11px] font-black uppercase tracking-wide text-v-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-v-red">
                  {item.question}
                  <span className="shrink-0 text-lg text-v-red transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-5 text-xs leading-6 text-v-white/50">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="border border-white/5 bg-white/[0.025] p-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-v-white/35">
          La aplicación está en beta privada
        </p>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-v-white/45">
          El canal oficial de soporte se publicará cuando estén definidos el nombre y el dominio. No se promete todavía un tiempo de respuesta.
        </p>
      </div>
    </div>
  );
}
