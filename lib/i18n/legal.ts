import type { Locale } from "./config";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  warning?: string;
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  sections: LegalSection[];
};

type LegalCatalog = {
  common: { version: string; legalNotice: string; privacy: string; terms: string; cookies: string };
  notice: LegalDocument;
  privacy: LegalDocument;
  terms: LegalDocument;
  cookies: LegalDocument;
};

export const legalCatalog: Record<Locale, LegalCatalog> = {
  es: {
    common: { version: "Versión provisional · 3 de noviembre de 2026", legalNotice: "Aviso legal", privacy: "Privacidad", terms: "Términos", cookies: "Cookies" },
    notice: {
      title: "Aviso legal", subtitle: "Información jurídica del sitio web", sections: [
        { heading: "Identificación del titular", paragraphs: ["En cumplimiento con la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa que el sitio web es titularidad de:"], bullets: ["Titular: [NOMBRE Y APELLIDOS PENDIENTES]", "Situación: particular residente en España", "Domicilio profesional: [PENDIENTE]", "Email de contacto: [CORREO DEFINITIVO PENDIENTE]", "Actividad: plataforma digital de gestión de ligas fantasy basadas en competiciones de esports (VCT)."], warning: "Documento provisional. Los datos identificativos se completarán antes del lanzamiento público." },
        { heading: "Objeto", paragraphs: ["Este sitio web ofrece una plataforma de gestión de ligas fantasy basadas en competiciones de esports, permitiendo crear ligas, gestionar equipos y participar en dinámicas competitivas virtuales."] },
        { heading: "Condiciones de uso", paragraphs: ["Para registrarse es necesario tener al menos 16 años y aceptar los Términos de uso.", "El usuario se compromete a usar adecuadamente el sitio, respetar la legalidad vigente y evitar las siguientes conductas:"], bullets: ["Realizar actividades ilícitas o contrarias a la buena fe.", "Intentar acceder a cuentas de otros usuarios.", "Manipular resultados o sistemas de la plataforma.", "Introducir software malicioso o dañar el sistema."] },
        { heading: "Funcionamiento del servicio", paragraphs: ["La plataforma permite participar en ligas fantasy basadas en competiciones de esports como el VCT (Valorant Champions Tour).", "Los resultados, puntuaciones y dinámicas son simulaciones basadas en datos de rendimiento y reglas internas; no representan apuestas ni juegos de azar."] },
        { heading: "Propiedad intelectual", paragraphs: ["Los contenidos del sitio web —diseño, textos, código, logos e interfaz— pertenecen al titular o cuentan con licencia y están protegidos por la normativa de propiedad intelectual.", "Las referencias a equipos, jugadores o competiciones pertenecen a sus respectivos propietarios y se utilizan con fines informativos.", "[NOMBRE DE LA APLICACIÓN] no está respaldada por Riot Games y no refleja las opiniones de Riot Games ni de ninguna persona involucrada oficialmente en la producción o gestión de sus propiedades. Riot Games y todas sus propiedades asociadas son marcas comerciales o registradas de Riot Games, Inc."] },
        { heading: "Responsabilidad", paragraphs: ["El titular no se hace responsable de:"], bullets: ["Errores en los datos o puntuaciones mostradas.", "Interrupciones del servicio por causas técnicas.", "Uso indebido de la plataforma por parte de los usuarios."], warning: "Se intentará garantizar la disponibilidad y el correcto funcionamiento del servicio en todo momento." },
        { heading: "Enlaces externos", paragraphs: ["El sitio puede contener enlaces a páginas externas. El titular no se responsabiliza del contenido ni del funcionamiento de dichas webs."] },
        { heading: "Protección de datos", paragraphs: ["El tratamiento de datos personales se rige por el Reglamento General de Protección de Datos (RGPD) y la normativa aplicable. Consulta la Política de privacidad para obtener más información."] },
        { heading: "Contacto", paragraphs: ["Para cualquier consulta legal o relacionada con el sitio web, puedes contactar en: [CORREO DEFINITIVO PENDIENTE]."] },
      ],
    },
    privacy: {
      title: "Política de privacidad", subtitle: "Cómo tratamos tus datos", sections: [
        { heading: "1. Responsable", bullets: ["Titular: [NOMBRE Y APELLIDOS PENDIENTES]", "Situación: particular residente en España", "Contacto de privacidad: [CORREO DEFINITIVO PENDIENTE]"], warning: "Esta política se completará con la identidad y el domicilio profesional antes del lanzamiento público." },
        { heading: "2. Datos tratados", bullets: ["Correo electrónico, identificador de cuenta, nombre de usuario y datos opcionales del perfil.", "Ligas, plantillas, alineaciones, puntos, presupuestos virtuales, pujas, ofertas y movimientos del mercado.", "Reportes entre miembros y comunicaciones necesarias para moderar las ligas.", "Preferencias de notificaciones y, si las activas, la suscripción técnica necesaria para enviar avisos push.", "Datos técnicos de sesión, dirección IP y registros de seguridad generados por los proveedores de infraestructura."], paragraphs: ["La aplicación no almacena tu contraseña en texto legible; la autenticación es gestionada por Supabase."] },
        { heading: "3. Finalidades y bases jurídicas", bullets: ["Prestación del servicio: crear la cuenta y gestionar ligas, mercado, clasificaciones y recompensas virtuales. Base: ejecución de los términos de uso.", "Notificaciones push: enviar los avisos que actives. Base: consentimiento, revocable desde Notificaciones.", "Seguridad y moderación: prevenir fraude, abuso y accesos indebidos, y tramitar reportes. Base: interés legítimo en proteger el servicio y a sus usuarios.", "Obligaciones legales: atender solicitudes o requerimientos válidos. Base: cumplimiento de obligaciones legales."], paragraphs: ["No se enviarán correos promocionales ni se venderán datos personales."] },
        { heading: "4. Información visible", paragraphs: ["Otros entrenadores pueden ver tu nombre de usuario, avatar, perfil, ligas compartidas, plantilla, alineaciones, puntos y posición. Tu correo electrónico no se muestra públicamente."] },
        { heading: "5. Proveedores y transferencias", paragraphs: ["Se utilizan Supabase para autenticación y base de datos, y Vercel para alojamiento y entrega. Estos proveedores pueden emplear subencargados y realizar tratamientos internacionales con las garantías contractuales correspondientes. Sus condiciones y ubicaciones se revisarán antes del lanzamiento definitivo."] },
        { heading: "6. Conservación", bullets: ["Los datos de cuenta se conservan mientras la cuenta permanezca activa.", "Al eliminarla, el perfil y los datos operativos asociados se borran inmediatamente de los sistemas activos.", "Las copias de seguridad pueden permanecer hasta ser sobrescritas conforme al ciclo técnico de los proveedores, sin utilizarse para finalidades ordinarias.", "Ante una incidencia, reclamación u obligación legal podrán conservarse de forma restringida los registros mínimos necesarios durante un máximo de 12 meses, o durante el plazo legal obligatorio si fuese superior."] },
        { heading: "7. Tus derechos y eliminación", paragraphs: ["Puedes solicitar acceso, rectificación, supresión, limitación, oposición y portabilidad mediante el correo de privacidad. Puedes descargar una copia estructurada desde Más → Perfil → Descargar mis datos y eliminar la cuenta desde Más → Perfil → Eliminar cuenta. Si consideras que el tratamiento incumple la normativa, puedes reclamar ante la Agencia Española de Protección de Datos."] },
        { heading: "8. Edad mínima", paragraphs: ["Es necesario tener al menos 16 años para registrarse y utilizar la aplicación."] },
      ],
    },
    terms: {
      title: "Términos de uso", subtitle: "Reglas del servicio fantasy", sections: [
        { heading: "1. Servicio y aceptación", paragraphs: ["[NOMBRE DE LA APLICACIÓN] es un fantasy gratuito basado en competiciones de VCT. Al crear una cuenta aceptas estos términos y declaras que tienes al menos 16 años. El servicio se encuentra en fase beta."] },
        { heading: "2. Cuenta", paragraphs: ["Debes facilitar información válida, proteger tus credenciales y no acceder a cuentas ajenas. No se permite crear cuentas para manipular ligas, mercados, recompensas o clasificaciones."] },
        { heading: "3. Reglas del fantasy", paragraphs: ["Las reglas de puntuación, alineaciones, mercado, cláusulas y recompensas publicadas dentro de la aplicación forman parte de estos términos. Las estadísticas en directo son provisionales y podrán corregirse si cambia la fuente."] },
        { heading: "4. Moneda virtual", paragraphs: ["Los presupuestos y cantidades expresados en euros son exclusivamente virtuales. No representan dinero real, no pueden comprarse, retirarse, venderse ni convertirse en efectivo y no constituyen apuestas o premios económicos."] },
        { heading: "5. Conducta y moderación", bullets: ["No manipular el servicio, explotar errores ni automatizar acciones abusivas.", "No acosar, suplantar, amenazar ni realizar conductas antideportivas.", "No introducir contenido malicioso ni intentar eludir las medidas de seguridad."], paragraphs: ["Los líderes pueden gestionar participantes y reportes dentro de sus ligas. Las infracciones graves pueden ocasionar restricciones, expulsión o suspensión de la cuenta."] },
        { heading: "6. Disponibilidad y cambios", paragraphs: ["Al tratarse de una beta gratuita, no se garantiza disponibilidad ininterrumpida. Podrán corregirse errores, modificar reglas o suspender funciones. Los cambios importantes se comunicarán dentro de la aplicación."] },
        { heading: "7. Baja", paragraphs: ["Puedes eliminar la cuenta desde tu perfil. El liderazgo de tus ligas se transferirá al miembro más antiguo; si eres su único miembro, la liga se eliminará. Esta acción es definitiva."] },
        { heading: "8. Propiedad intelectual y Riot Games", paragraphs: ["Las marcas, competiciones, equipos, jugadores y materiales de terceros pertenecen a sus respectivos titulares. [NOMBRE DE LA APLICACIÓN] no está respaldada por Riot Games y no refleja sus opiniones ni las de ninguna persona involucrada oficialmente en la producción o gestión de sus propiedades. Riot Games y todas sus propiedades asociadas son marcas comerciales o registradas de Riot Games, Inc."] },
        { heading: "9. Legislación", paragraphs: ["Estos términos se rigen por la legislación española, sin limitar las normas imperativas de protección que correspondan al usuario por su país de residencia."] },
      ],
    },
    cookies: {
      title: "Cookies y almacenamiento", subtitle: "Tecnologías necesarias", sections: [
        { heading: "1. Uso actual", paragraphs: ["La aplicación utiliza cookies técnicas de Supabase necesarias para iniciar sesión, mantenerla de forma segura y proteger las áreas privadas. No se utilizan para publicidad ni seguimiento comercial."] },
        { heading: "2. Almacenamiento local", paragraphs: ["El navegador puede guardar una preferencia técnica para recordar si instalaste o descartaste la instalación PWA. Si activas notificaciones, también conserva la suscripción técnica requerida por el servicio push."] },
        { heading: "3. Consentimiento", paragraphs: ["Actualmente no se instalan cookies analíticas, publicitarias o de personalización opcional, por lo que no se muestra un banner de consentimiento. Si se incorporan en el futuro, permanecerán desactivadas hasta que puedas aceptarlas o rechazarlas con la misma facilidad."] },
        { heading: "4. Control desde el navegador", paragraphs: ["Puedes eliminar las cookies y el almacenamiento desde la configuración del navegador. Bloquear las cookies técnicas puede impedir el inicio de sesión y el funcionamiento de las zonas privadas."] },
      ],
    },
  },
  en: {
    common: { version: "Provisional version · 3 November 2026", legalNotice: "Legal notice", privacy: "Privacy", terms: "Terms", cookies: "Cookies" },
    notice: {
      title: "Legal notice", subtitle: "Legal information about the website", sections: [
        { heading: "Owner identification", paragraphs: ["In accordance with Spanish Law 34/2002 on Information Society Services and Electronic Commerce (LSSI-CE), this website is owned by:"], bullets: ["Owner: [NAME AND SURNAME PENDING]", "Status: private individual residing in Spain", "Professional address: [PENDING]", "Contact email: [FINAL EMAIL PENDING]", "Activity: digital platform for managing fantasy leagues based on esports competitions (VCT)."], warning: "Provisional document. Identification details will be completed before the public launch." },
        { heading: "Purpose", paragraphs: ["This website provides a platform for managing fantasy leagues based on esports competitions, allowing users to create leagues, manage teams and participate in virtual competitive activities."] },
        { heading: "Conditions of use", paragraphs: ["You must be at least 16 years old and accept the Terms of use to register.", "Users must use the website appropriately, comply with applicable law and avoid the following conduct:"], bullets: ["Illegal activities or conduct contrary to good faith.", "Attempting to access other users’ accounts.", "Manipulating results or platform systems.", "Introducing malicious software or damaging the system."] },
        { heading: "How the service works", paragraphs: ["The platform supports fantasy leagues based on esports competitions such as the VCT (Valorant Champions Tour).", "Results, scores and game mechanics are simulations based on performance data and internal rules; they are not betting or gambling."] },
        { heading: "Intellectual property", paragraphs: ["Website content—including design, text, code, logos and interface—is owned by the operator or properly licensed and protected by intellectual-property law.", "References to esports teams, players or competitions belong to their respective owners and are used for information purposes.", "[APPLICATION NAME] is not endorsed by Riot Games and does not reflect the views of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc."] },
        { heading: "Liability", paragraphs: ["The owner is not liable for:"], bullets: ["Errors in displayed data or scores.", "Service interruptions caused by technical issues.", "Misuse of the platform by users."], warning: "Reasonable efforts will be made to keep the service available and operating correctly." },
        { heading: "External links", paragraphs: ["The website may link to external pages. The owner is not responsible for their content or operation."] },
        { heading: "Data protection", paragraphs: ["Personal-data processing is governed by the General Data Protection Regulation (GDPR) and applicable law. See the Privacy policy for further information."] },
        { heading: "Contact", paragraphs: ["For legal or website-related enquiries, contact: [FINAL EMAIL PENDING]."] },
      ],
    },
    privacy: {
      title: "Privacy policy", subtitle: "How we process your data", sections: [
        { heading: "1. Controller", bullets: ["Owner: [NAME AND SURNAME PENDING]", "Status: private individual residing in Spain", "Privacy contact: [FINAL EMAIL PENDING]"], warning: "The identity and professional address will be added before the public launch." },
        { heading: "2. Data processed", bullets: ["Email address, account identifier, username and optional profile information.", "Leagues, squads, lineups, points, virtual budgets, bids, offers and market transactions.", "Reports between members and communications needed to moderate leagues.", "Notification preferences and, if enabled, the technical subscription required for push alerts.", "Session technical data, IP address and security logs generated by infrastructure providers."], paragraphs: ["The application does not store your password in readable form; authentication is managed by Supabase."] },
        { heading: "3. Purposes and legal bases", bullets: ["Providing the service: creating accounts and managing leagues, market, rankings and virtual rewards. Basis: performance of the terms of use.", "Push notifications: sending the alerts you enable. Basis: consent, which can be withdrawn under Notifications.", "Security and moderation: preventing fraud, abuse and unauthorized access and processing reports. Basis: legitimate interest in protecting the service and its users.", "Legal duties: responding to valid requests or requirements. Basis: compliance with legal obligations."], paragraphs: ["No promotional emails will be sent and personal data will not be sold."] },
        { heading: "4. Visible information", paragraphs: ["Other coaches can see your username, avatar, profile, shared leagues, squad, lineups, points and position. Your email address is not displayed publicly."] },
        { heading: "5. Providers and transfers", paragraphs: ["Supabase is used for authentication and databases, and Vercel for hosting and delivery. These providers may use subprocessors and process data internationally under the applicable contractual safeguards. Their terms and locations will be reviewed before the final launch."] },
        { heading: "6. Retention", bullets: ["Account data is retained while the account remains active.", "When the account is deleted, its profile and associated operational data are immediately removed from active systems.", "Backups may remain until overwritten under providers’ technical cycles and are not used for ordinary purposes.", "If an incident, claim or legal obligation exists, the minimum necessary records may be restricted and retained for up to 12 months, or for a longer mandatory legal period."] },
        { heading: "7. Your rights and deletion", paragraphs: ["You can request access, rectification, erasure, restriction, objection and portability through the privacy contact. Download a structured copy under More → Profile → Download my data and delete your account under More → Profile → Delete account. You may lodge a complaint with the Spanish Data Protection Agency if you believe processing breaches the law."] },
        { heading: "8. Minimum age", paragraphs: ["You must be at least 16 years old to register and use the application."] },
      ],
    },
    terms: {
      title: "Terms of use", subtitle: "Fantasy service rules", sections: [
        { heading: "1. Service and acceptance", paragraphs: ["[APPLICATION NAME] is a free fantasy game based on VCT competitions. By creating an account, you accept these terms and confirm that you are at least 16 years old. The service is currently in beta."] },
        { heading: "2. Account", paragraphs: ["You must provide valid information, protect your credentials and never access another person’s account. Accounts may not be created to manipulate leagues, markets, rewards or rankings."] },
        { heading: "3. Fantasy rules", paragraphs: ["The scoring, lineup, market, clause and reward rules published in the application form part of these terms. Live statistics are provisional and may be corrected when the source changes."] },
        { heading: "4. Virtual currency", paragraphs: ["Budgets and euro-denominated amounts are entirely virtual. They are not real money, cannot be bought, withdrawn, sold or converted into cash and do not constitute betting or financial prizes."] },
        { heading: "5. Conduct and moderation", bullets: ["Do not manipulate the service, exploit errors or automate abusive actions.", "Do not harass, impersonate, threaten or engage in unsporting conduct.", "Do not introduce malicious content or try to bypass security measures."], paragraphs: ["League leaders may manage participants and reports within their leagues. Serious breaches may result in restrictions, removal or account suspension."] },
        { heading: "6. Availability and changes", paragraphs: ["As a free beta, uninterrupted availability is not guaranteed. Errors may be fixed, rules changed or features suspended. Important changes will be communicated within the application."] },
        { heading: "7. Account closure", paragraphs: ["You can delete your account from your profile. Leadership of your leagues will transfer to the longest-standing member; a league will be deleted if you are its only member. This action is permanent."] },
        { heading: "8. Intellectual property and Riot Games", paragraphs: ["Third-party trademarks, competitions, teams, players and materials belong to their respective owners. [APPLICATION NAME] is not endorsed by Riot Games and does not reflect its views or those of anyone officially involved in producing or managing its properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc."] },
        { heading: "9. Governing law", paragraphs: ["These terms are governed by Spanish law, without limiting any mandatory consumer-protection rules applicable in the user’s country of residence."] },
      ],
    },
    cookies: {
      title: "Cookies and storage", subtitle: "Necessary technologies", sections: [
        { heading: "1. Current use", paragraphs: ["The application uses technical Supabase cookies needed to sign in, maintain a secure session and protect private areas. They are not used for advertising or commercial tracking."] },
        { heading: "2. Local storage", paragraphs: ["The browser may store a technical preference remembering whether you installed or dismissed the PWA installation. If notifications are enabled, it also retains the technical subscription required for push delivery."] },
        { heading: "3. Consent", paragraphs: ["No analytics, advertising or optional personalization cookies are currently installed, so no consent banner is shown. If they are introduced later, they will remain disabled until you can accept or reject them with equal ease."] },
        { heading: "4. Browser controls", paragraphs: ["You can remove cookies and storage through your browser settings. Blocking technical cookies may prevent sign-in and private areas from working."] },
      ],
    },
  },
  fr: {
    common: { version: "Version provisoire · 3 novembre 2026", legalNotice: "Mentions légales", privacy: "Confidentialité", terms: "Conditions", cookies: "Cookies" },
    notice: {
      title: "Mentions légales", subtitle: "Informations juridiques du site", sections: [
        { heading: "Identification du responsable", paragraphs: ["Conformément à la loi espagnole 34/2002 relative aux services de la société de l’information et au commerce électronique (LSSI-CE), ce site appartient à :"], bullets: ["Titulaire : [NOM ET PRÉNOM EN ATTENTE]", "Situation : particulier résidant en Espagne", "Adresse professionnelle : [EN ATTENTE]", "E-mail de contact : [E-MAIL DÉFINITIF EN ATTENTE]", "Activité : plateforme numérique de gestion de ligues fantasy basées sur des compétitions d’esport (VCT)."], warning: "Document provisoire. Les informations d’identification seront complétées avant le lancement public." },
        { heading: "Objet", paragraphs: ["Ce site propose une plateforme de gestion de ligues fantasy basées sur des compétitions d’esport, permettant de créer des ligues, gérer des équipes et participer à des activités compétitives virtuelles."] },
        { heading: "Conditions d’utilisation", paragraphs: ["Vous devez avoir au moins 16 ans et accepter les Conditions d’utilisation pour vous inscrire.", "L’utilisateur s’engage à utiliser correctement le site, à respecter la loi et à éviter les comportements suivants :"], bullets: ["Activités illégales ou contraires à la bonne foi.", "Tentative d’accès au compte d’un autre utilisateur.", "Manipulation des résultats ou des systèmes de la plateforme.", "Introduction de logiciels malveillants ou dégradation du système."] },
        { heading: "Fonctionnement du service", paragraphs: ["La plateforme permet de participer à des ligues fantasy basées sur des compétitions d’esport telles que le VCT (Valorant Champions Tour).", "Les résultats, scores et mécaniques sont des simulations fondées sur des données de performance et des règles internes ; ils ne constituent ni paris ni jeux d’argent."] },
        { heading: "Propriété intellectuelle", paragraphs: ["Les contenus du site — conception, textes, code, logos et interface — appartiennent au titulaire ou sont utilisés sous licence et sont protégés par le droit de la propriété intellectuelle.", "Les références aux équipes, joueurs ou compétitions appartiennent à leurs propriétaires respectifs et sont utilisées à titre informatif.", "[NOM DE L’APPLICATION] n’est pas soutenue par Riot Games et ne reflète pas les opinions de Riot Games ni de toute personne officiellement impliquée dans la production ou la gestion de ses propriétés. Riot Games et toutes ses propriétés associées sont des marques commerciales ou déposées de Riot Games, Inc."] },
        { heading: "Responsabilité", paragraphs: ["Le titulaire n’est pas responsable de :"], bullets: ["Erreurs dans les données ou scores affichés.", "Interruptions du service pour raisons techniques.", "Utilisation abusive de la plateforme par les utilisateurs."], warning: "Des efforts raisonnables seront déployés pour assurer la disponibilité et le bon fonctionnement du service." },
        { heading: "Liens externes", paragraphs: ["Le site peut contenir des liens vers des pages externes. Le titulaire n’est pas responsable de leur contenu ni de leur fonctionnement."] },
        { heading: "Protection des données", paragraphs: ["Le traitement des données personnelles est régi par le Règlement général sur la protection des données (RGPD) et la réglementation applicable. Consultez la Politique de confidentialité pour plus d’informations."] },
        { heading: "Contact", paragraphs: ["Pour toute question juridique ou relative au site : [E-MAIL DÉFINITIF EN ATTENTE]."] },
      ],
    },
    privacy: {
      title: "Politique de confidentialité", subtitle: "Comment nous traitons vos données", sections: [
        { heading: "1. Responsable", bullets: ["Titulaire : [NOM ET PRÉNOM EN ATTENTE]", "Situation : particulier résidant en Espagne", "Contact confidentialité : [E-MAIL DÉFINITIF EN ATTENTE]"], warning: "L’identité et l’adresse professionnelle seront ajoutées avant le lancement public." },
        { heading: "2. Données traitées", bullets: ["Adresse e-mail, identifiant de compte, nom d’utilisateur et informations facultatives du profil.", "Ligues, effectifs, alignements, points, budgets virtuels, enchères, offres et mouvements de marché.", "Signalements entre membres et communications nécessaires à la modération des ligues.", "Préférences de notification et, si elles sont activées, abonnement technique requis pour les notifications push.", "Données techniques de session, adresse IP et journaux de sécurité générés par les fournisseurs d’infrastructure."], paragraphs: ["L’application ne stocke pas votre mot de passe sous forme lisible ; l’authentification est gérée par Supabase."] },
        { heading: "3. Finalités et bases juridiques", bullets: ["Fourniture du service : création du compte et gestion des ligues, du marché, des classements et récompenses virtuelles. Base : exécution des conditions d’utilisation.", "Notifications push : envoi des alertes activées. Base : consentement, révocable dans Notifications.", "Sécurité et modération : prévention de la fraude, des abus et des accès non autorisés, et traitement des signalements. Base : intérêt légitime à protéger le service et ses utilisateurs.", "Obligations légales : réponse aux demandes ou exigences valides. Base : respect des obligations légales."], paragraphs: ["Aucun e-mail promotionnel ne sera envoyé et les données personnelles ne seront pas vendues."] },
        { heading: "4. Informations visibles", paragraphs: ["Les autres entraîneurs peuvent voir votre nom d’utilisateur, avatar, profil, ligues partagées, effectif, alignements, points et position. Votre adresse e-mail n’est pas affichée publiquement."] },
        { heading: "5. Fournisseurs et transferts", paragraphs: ["Supabase est utilisé pour l’authentification et la base de données, et Vercel pour l’hébergement et la diffusion. Ces fournisseurs peuvent recourir à des sous-traitants et effectuer des traitements internationaux avec les garanties contractuelles appropriées. Leurs conditions et localisations seront vérifiées avant le lancement définitif."] },
        { heading: "6. Conservation", bullets: ["Les données du compte sont conservées tant que celui-ci reste actif.", "Lors de la suppression, le profil et les données opérationnelles associées sont immédiatement effacés des systèmes actifs.", "Les sauvegardes peuvent subsister jusqu’à leur écrasement selon le cycle technique des fournisseurs, sans usage ordinaire.", "En cas d’incident, de réclamation ou d’obligation légale, les données minimales nécessaires peuvent être conservées de façon restreinte pendant 12 mois maximum, ou durant une période légale obligatoire plus longue."] },
        { heading: "7. Vos droits et suppression", paragraphs: ["Vous pouvez demander l’accès, la rectification, l’effacement, la limitation, l’opposition et la portabilité via le contact confidentialité. Téléchargez une copie structurée dans Plus → Profil → Télécharger mes données et supprimez votre compte dans Plus → Profil → Supprimer le compte. Vous pouvez saisir l’Agence espagnole de protection des données si vous estimez que le traitement enfreint la loi."] },
        { heading: "8. Âge minimum", paragraphs: ["Vous devez avoir au moins 16 ans pour vous inscrire et utiliser l’application."] },
      ],
    },
    terms: {
      title: "Conditions d’utilisation", subtitle: "Règles du service fantasy", sections: [
        { heading: "1. Service et acceptation", paragraphs: ["[NOM DE L’APPLICATION] est un fantasy gratuit basé sur les compétitions VCT. En créant un compte, vous acceptez ces conditions et confirmez avoir au moins 16 ans. Le service est actuellement en bêta."] },
        { heading: "2. Compte", paragraphs: ["Vous devez fournir des informations valides, protéger vos identifiants et ne pas accéder au compte d’autrui. Il est interdit de créer des comptes pour manipuler les ligues, marchés, récompenses ou classements."] },
        { heading: "3. Règles du fantasy", paragraphs: ["Les règles de score, d’alignement, de marché, de clauses et de récompenses publiées dans l’application font partie des présentes conditions. Les statistiques en direct sont provisoires et peuvent être corrigées si la source change."] },
        { heading: "4. Monnaie virtuelle", paragraphs: ["Les budgets et montants exprimés en euros sont exclusivement virtuels. Ils ne représentent pas de l’argent réel, ne peuvent être achetés, retirés, vendus ou convertis en espèces et ne constituent ni paris ni récompenses financières."] },
        { heading: "5. Conduite et modération", bullets: ["Ne pas manipuler le service, exploiter les erreurs ni automatiser des actions abusives.", "Ne pas harceler, usurper une identité, menacer ni adopter un comportement antisportif.", "Ne pas introduire de contenu malveillant ni contourner les mesures de sécurité."], paragraphs: ["Les responsables peuvent gérer les participants et signalements de leurs ligues. Les infractions graves peuvent entraîner des restrictions, une expulsion ou la suspension du compte."] },
        { heading: "6. Disponibilité et modifications", paragraphs: ["En tant que bêta gratuite, la disponibilité continue n’est pas garantie. Des erreurs peuvent être corrigées, les règles modifiées ou des fonctions suspendues. Les changements importants seront communiqués dans l’application."] },
        { heading: "7. Suppression", paragraphs: ["Vous pouvez supprimer votre compte depuis votre profil. La direction de vos ligues sera transférée au membre le plus ancien ; la ligue sera supprimée si vous en êtes le seul membre. Cette action est définitive."] },
        { heading: "8. Propriété intellectuelle et Riot Games", paragraphs: ["Les marques, compétitions, équipes, joueurs et contenus tiers appartiennent à leurs propriétaires respectifs. [NOM DE L’APPLICATION] n’est pas soutenue par Riot Games et ne reflète pas ses opinions ni celles de toute personne officiellement impliquée dans la production ou la gestion de ses propriétés. Riot Games et toutes ses propriétés associées sont des marques commerciales ou déposées de Riot Games, Inc."] },
        { heading: "9. Droit applicable", paragraphs: ["Ces conditions sont régies par le droit espagnol, sans limiter les règles impératives de protection applicables dans le pays de résidence de l’utilisateur."] },
      ],
    },
    cookies: {
      title: "Cookies et stockage", subtitle: "Technologies nécessaires", sections: [
        { heading: "1. Utilisation actuelle", paragraphs: ["L’application utilise des cookies techniques Supabase nécessaires à la connexion, au maintien sécurisé de la session et à la protection des zones privées. Ils ne servent ni à la publicité ni au suivi commercial."] },
        { heading: "2. Stockage local", paragraphs: ["Le navigateur peut enregistrer une préférence technique indiquant si vous avez installé ou refusé l’installation PWA. Si vous activez les notifications, il conserve aussi l’abonnement technique requis pour le service push."] },
        { heading: "3. Consentement", paragraphs: ["Aucun cookie analytique, publicitaire ou de personnalisation facultative n’est actuellement installé ; aucune bannière de consentement n’est donc affichée. S’ils sont ajoutés, ils resteront désactivés jusqu’à ce que vous puissiez les accepter ou les refuser avec la même facilité."] },
        { heading: "4. Contrôle depuis le navigateur", paragraphs: ["Vous pouvez supprimer les cookies et le stockage dans les paramètres du navigateur. Le blocage des cookies techniques peut empêcher la connexion et le fonctionnement des zones privées."] },
      ],
    },
  },
};
