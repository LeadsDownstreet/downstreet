# -*- coding: utf-8 -*-
"""Privacy policy and terms of use for Downstreet and Downstreet Pro, in English and Spanish.

Plain-language drafts written to match what the site actually does (see apps-script/Code.gs and
src/runtime.js). Have a lawyer review them before running ads. When the business name, contact
details or data practices change, update both languages here and rebuild.

[PHONE] and [EMAIL] are filled in from site.json at build time.
"""

UPDATED = {'en': 'November 22, 2026', 'es': '22 de noviembre de 2026'}
OPERATOR = 'Leads by Delta'

PRIVACY_EN = '''
<p class="lede">Downstreet helps homeowners in and around Fort Worth find a local pro. Downstreet Pro is the side of the same business that works with contractors. Both are run by {op} (“we”, “us”). This policy explains what we collect, why, and who sees it.</p>

<h2>What we collect</h2>
<h3>When you ask for a pro</h3>
<ul>
<li>The kind of job, your ZIP code, your name and your mobile number.</li>
<li>Anything you choose to write about the job.</li>
</ul>
<h3>When a contractor applies or reports a job</h3>
<ul>
<li>Business name, contact name, phone, email and website.</li>
<li>Trade, shop ZIP code, service area, visit times, smallest job, and licensing and insurance status.</li>
<li>For job reports: the lead number, what happened, amounts collected and dates.</li>
</ul>
<h3>Sent automatically with a form</h3>
<ul>
<li>The page you sent it from, the site language, your browser type, how long the page was open, and the page that linked you to us.</li>
<li>If you arrived from an ad or a tagged link: the campaign tags in that link (for example the ad source, campaign name and click ID).</li>
<li>The exact call-and-text consent wording shown next to the button you tapped, so we have a record of what you agreed to.</li>
</ul>
<p>We don’t ask for your street address on the site, and we never ask for payment details from homeowners.</p>

<h2>How we use it</h2>
<ul>
<li>To call or text you about your request and match you with a local pro.</li>
<li>To review contractor applications and run our partner program, including tracking which jobs came from us and billing referral fees.</li>
<li>To see which ads and pages bring in requests, and to keep spam out.</li>
<li>To meet legal obligations and keep business records.</li>
</ul>

<h2>Who we share it with</h2>
<ul>
<li><strong>The local pro we match you with.</strong> We send your request (name, number, ZIP and job details) to the pro we match you with for that job, so they can reach you. We don’t send your request to a list of companies.</li>
<li><strong>Service providers that run our tools.</strong> Form entries are stored in Google Sheets and email alerts go through Gmail (Google). The site is hosted by GitHub, and the page fonts load from Google Fonts. If we turn on advertising tools such as Meta Pixel or Google Analytics, those companies receive information about your visit (see below).</li>
<li><strong>When the law requires it</strong>, or to protect our rights or someone’s safety.</li>
<li><strong>If the business is sold or reorganized</strong>, to the new owner, under this policy.</li>
</ul>
<p><strong>We don’t sell your personal information.</strong> We don’t share your mobile number or your consent to receive texts with third parties or affiliates for their own marketing.</p>

<h2>Calls and texts</h2>
<p>If you give us your number and tap the button, you agree that we and the pro we match you with may call or text you about your request, including by automated means. You don’t have to agree in order to buy anything. Message and data rates may apply. Reply STOP to any text to stop texts, or tell us on a call that you don’t want more calls.</p>

<h2>Cookies, browser storage and ads</h2>
<ul>
<li>The site saves small settings in your browser, such as light or dark mode, and remembers the ad or link that brought you here for up to 30 days so a request can be credited to it.</li>
<li>We may use tools from Meta (Facebook and Instagram) and Google to measure our ads. When they’re on, they set cookies and tell those companies that someone visited a page or sent a request. You can limit this in your Facebook and Google ad settings, or by blocking third-party cookies in your browser.</li>
</ul>

<h2>How long we keep it</h2>
<p>We keep requests, applications and job reports as long as we need them to connect you with a pro, track the outcome of the job (contractor referrals count for 12 months), bill fees and keep business records. After that we delete them or strip out what identifies you.</p>

<h2>Your choices</h2>
<p>You can ask us what we have about you, ask us to correct it, or ask us to delete it. Email [EMAIL] or call [PHONE]. We may need to keep some records the law requires.</p>

<h2>Security</h2>
<p>We limit who can see form entries and use the security controls of the services above. No method of sending or storing information is completely secure.</p>

<h2>Children</h2>
<p>Our services are for adults. We don’t knowingly collect information from anyone under 18.</p>

<h2>Changes</h2>
<p>If we change this policy, we’ll update the date at the top of this page.</p>

<h2>Contact</h2>
<p>{op} · Fort Worth, Texas · [EMAIL] · [PHONE]</p>
'''

PRIVACY_ES = '''
<p class="lede">Downstreet ayuda a dueños de casa de Fort Worth y sus alrededores a encontrar un profesional local. Downstreet Pro es la parte del mismo negocio que trabaja con contratistas. Ambos son operados por {op} (“nosotros”). Esta política explica qué datos recopilamos, para qué y quién los ve.</p>

<h2>Qué recopilamos</h2>
<h3>Cuando pide un profesional</h3>
<ul>
<li>El tipo de trabajo, su código postal, su nombre y su número de celular.</li>
<li>Lo que usted decida escribir sobre el trabajo.</li>
</ul>
<h3>Cuando un contratista se inscribe o reporta un trabajo</h3>
<ul>
<li>Nombre del negocio, nombre de contacto, teléfono, correo y sitio web.</li>
<li>Oficio, código postal del negocio, zona de servicio, horarios de visita, trabajo más chico que acepta, y si tiene licencia y seguro.</li>
<li>En los reportes: el número de cliente, qué pasó, montos cobrados y fechas.</li>
</ul>
<h3>Lo que se envía automáticamente con un formulario</h3>
<ul>
<li>La página desde donde lo envió, el idioma del sitio, el tipo de navegador, cuánto tiempo estuvo abierta la página y la página que lo trajo a nosotros.</li>
<li>Si llegó desde un anuncio o un enlace etiquetado: las etiquetas de campaña de ese enlace (por ejemplo, la fuente del anuncio, el nombre de la campaña y el identificador del clic).</li>
<li>El texto exacto de consentimiento para llamadas y mensajes que aparecía junto al botón que tocó, para tener constancia de lo que aceptó.</li>
</ul>
<p>En el sitio no pedimos su dirección, y nunca pedimos datos de pago a los dueños de casa.</p>

<h2>Para qué lo usamos</h2>
<ul>
<li>Para llamarle o escribirle sobre su solicitud y conectarle con un profesional local.</li>
<li>Para revisar solicitudes de contratistas y operar nuestro programa de socios, incluido saber qué trabajos vinieron de nosotros y cobrar las comisiones por referencia.</li>
<li>Para ver qué anuncios y páginas traen solicitudes, y para bloquear el spam.</li>
<li>Para cumplir con la ley y llevar los registros del negocio.</li>
</ul>

<h2>Con quién lo compartimos</h2>
<ul>
<li><strong>El profesional local que le asignamos.</strong> Enviamos su solicitud (nombre, número, código postal y detalles del trabajo) al profesional que le asignamos para ese trabajo, para que se comunique con usted. No enviamos su solicitud a una lista de empresas.</li>
<li><strong>Proveedores que operan nuestras herramientas.</strong> Los formularios se guardan en Google Sheets y los avisos por correo pasan por Gmail (Google). El sitio está alojado en GitHub y las fuentes tipográficas se cargan desde Google Fonts. Si activamos herramientas de publicidad como Meta Pixel o Google Analytics, esas empresas reciben información sobre su visita (vea abajo).</li>
<li><strong>Cuando la ley lo exige</strong>, o para proteger nuestros derechos o la seguridad de alguien.</li>
<li><strong>Si el negocio se vende o se reorganiza</strong>, al nuevo dueño, bajo esta misma política.</li>
</ul>
<p><strong>No vendemos su información personal.</strong> No compartimos su número de celular ni su consentimiento para recibir mensajes con terceros ni afiliados para su propia publicidad.</p>

<h2>Llamadas y mensajes</h2>
<p>Si nos da su número y toca el botón, usted acepta que nosotros y el profesional que le asignemos le llamemos o le enviemos mensajes sobre su solicitud, incluso por medios automatizados. No tiene que aceptar para comprar nada. Pueden aplicarse tarifas de mensajes y datos. Responda STOP a cualquier mensaje para dejar de recibirlos, o díganos en una llamada que no quiere más llamadas.</p>

<h2>Cookies, almacenamiento del navegador y anuncios</h2>
<ul>
<li>El sitio guarda pequeñas preferencias en su navegador, como el modo claro u oscuro, y recuerda durante un máximo de 30 días el anuncio o enlace que lo trajo, para atribuirle la solicitud.</li>
<li>Podemos usar herramientas de Meta (Facebook e Instagram) y de Google para medir nuestros anuncios. Cuando están activas, ponen cookies y les avisan a esas empresas que alguien visitó una página o envió una solicitud. Puede limitarlo en la configuración de anuncios de Facebook y de Google, o bloqueando las cookies de terceros en su navegador.</li>
</ul>

<h2>Cuánto tiempo lo guardamos</h2>
<p>Guardamos solicitudes, inscripciones y reportes mientras los necesitemos para conectarle con un profesional, dar seguimiento al resultado del trabajo (las referencias a contratistas cuentan por 12 meses), cobrar comisiones y llevar registros del negocio. Después los borramos o quitamos lo que le identifica.</p>

<h2>Sus opciones</h2>
<p>Puede pedirnos qué datos tenemos sobre usted, pedir que los corrijamos o pedir que los borremos. Escriba a [EMAIL] o llame al [PHONE]. Es posible que debamos conservar algunos registros que exige la ley.</p>

<h2>Seguridad</h2>
<p>Limitamos quién puede ver los formularios y usamos los controles de seguridad de los servicios mencionados. Ningún método para enviar o guardar información es completamente seguro.</p>

<h2>Menores de edad</h2>
<p>Nuestros servicios son para adultos. No recopilamos a sabiendas información de menores de 18 años.</p>

<h2>Cambios</h2>
<p>Si cambiamos esta política, actualizaremos la fecha al inicio de esta página.</p>

<h2>Contacto</h2>
<p>{op} · Fort Worth, Texas · [EMAIL] · [PHONE]</p>
'''

TERMS_EN = '''
<p class="lede">These terms cover your use of the Downstreet and Downstreet Pro websites, run by {op} (“we”, “us”). By using the sites or sending a request, you agree to them.</p>

<h2>What Downstreet is</h2>
<p>Downstreet is a free referral service. You tell us about a job and we connect you with an independent local contractor who does that kind of work. We are not a contractor. We don’t do the work, we don’t employ the pros, and we’re not a party to any agreement between you and a pro.</p>

<h2>Free for homeowners, paid by pros</h2>
<p>Homeowners never pay Downstreet. Contractors in our partner program pay us a referral fee on jobs they complete for people we connect them with. You’re never obligated to hire anyone we refer.</p>

<h2>About the pros</h2>
<p>We review contractors before we refer them, but we can’t guarantee their licensing, insurance, work quality, prices, timing or conduct. Before you hire anyone, check their license where Texas requires one, ask for proof of insurance and references, and get a written estimate. Any contract, warranty or dispute about the work is between you and the pro.</p>

<h2>Your information</h2>
<p>Give us accurate information and only a phone number you’re allowed to use. Our <a href="{privacy}">privacy policy</a> explains how we use it and how we contact you.</p>

<h2>For contractors</h2>
<p>The Downstreet Pro site describes our partner program, and its calculators show examples. They aren’t an offer or a contract. Your fees, territory, reporting and other terms are set only by the partner agreement you sign with us; if the site and the agreement differ, the agreement controls.</p>

<h2>Using the sites</h2>
<p>Don’t send false or spam requests, try to break or overload the sites, or copy our content, names or logos for your own use. We may remove requests or block access when these terms are broken.</p>

<h2>No warranties</h2>
<p>The sites and our referral service are provided “as is.” We try to keep them accurate and available, but we don’t promise they always will be, or that a pro will be available for every job or area.</p>

<h2>Limits on our liability</h2>
<p>To the extent the law allows, we aren’t liable for the work, products, prices or conduct of any contractor, or for indirect or consequential losses from using the sites. Because our service is free to homeowners, to the extent the law allows our total liability to a homeowner is limited to $100.</p>

<h2>Texas law</h2>
<p>These terms are governed by the laws of Texas. Disputes will be handled in the courts of Tarrant County, Texas, unless the law requires otherwise.</p>

<h2>Changes</h2>
<p>We may update these terms. The date at the top shows the latest version.</p>

<h2>Contact</h2>
<p>{op} · Fort Worth, Texas · [EMAIL] · [PHONE]</p>
'''

TERMS_ES = '''
<p class="lede">Estos términos aplican al uso de los sitios de Downstreet y Downstreet Pro, operados por {op} (“nosotros”). Al usar los sitios o enviar una solicitud, usted los acepta.</p>

<h2>Qué es Downstreet</h2>
<p>Downstreet es un servicio de referencias gratuito. Usted nos cuenta sobre un trabajo y le conectamos con un contratista local independiente que hace ese tipo de trabajo. No somos contratistas. No hacemos el trabajo, no empleamos a los profesionales y no somos parte de ningún acuerdo entre usted y un profesional.</p>

<h2>Gratis para dueños de casa, lo pagan los profesionales</h2>
<p>Los dueños de casa nunca le pagan a Downstreet. Los contratistas de nuestro programa de socios nos pagan una comisión por referencia en los trabajos que terminan para personas que les conectamos. Usted nunca está obligado a contratar a nadie que le refiramos.</p>

<h2>Sobre los profesionales</h2>
<p>Revisamos a los contratistas antes de referirlos, pero no podemos garantizar su licencia, su seguro, la calidad de su trabajo, sus precios, sus tiempos ni su conducta. Antes de contratar a alguien, verifique su licencia donde Texas la exige, pida comprobante de seguro y referencias, y obtenga un presupuesto por escrito. Cualquier contrato, garantía o disputa sobre el trabajo es entre usted y el profesional.</p>

<h2>Su información</h2>
<p>Denos información correcta y solo un número de teléfono que tenga derecho a usar. Nuestra <a href="{privacy}">política de privacidad</a> explica cómo la usamos y cómo nos comunicamos con usted.</p>

<h2>Para contratistas</h2>
<p>El sitio de Downstreet Pro describe nuestro programa de socios y sus calculadoras muestran ejemplos. No son una oferta ni un contrato. Sus comisiones, zona, reportes y demás términos los fija únicamente el acuerdo de socio que firme con nosotros; si el sitio y el acuerdo no coinciden, manda el acuerdo.</p>

<h2>Uso de los sitios</h2>
<p>No envíe solicitudes falsas ni spam, no intente dañar ni saturar los sitios, y no copie nuestro contenido, nombres ni logotipos para su propio uso. Podemos eliminar solicitudes o bloquear el acceso si se incumplen estos términos.</p>

<h2>Sin garantías</h2>
<p>Los sitios y nuestro servicio de referencias se ofrecen “tal cual”. Procuramos que sean correctos y estén disponibles, pero no prometemos que siempre lo estén, ni que haya un profesional disponible para cada trabajo o zona.</p>

<h2>Límites de nuestra responsabilidad</h2>
<p>En la medida en que la ley lo permita, no somos responsables del trabajo, productos, precios o conducta de ningún contratista, ni de pérdidas indirectas por usar los sitios. Como nuestro servicio es gratis para los dueños de casa, en la medida en que la ley lo permita nuestra responsabilidad total ante un dueño de casa se limita a $100.</p>

<h2>Leyes de Texas</h2>
<p>Estos términos se rigen por las leyes de Texas. Las disputas se resolverán en los tribunales del condado de Tarrant, Texas, salvo que la ley disponga otra cosa.</p>

<h2>Cambios</h2>
<p>Podemos actualizar estos términos. La fecha al inicio muestra la versión más reciente.</p>

<h2>Contacto</h2>
<p>{op} · Fort Worth, Texas · [EMAIL] · [PHONE]</p>
'''

# (lang, kind) -> path under the site root, page title, short description, heading, body
PAGES = {
    ('en', 'privacy'): ('privacy/', 'Privacy policy · Downstreet', 'How Downstreet and Downstreet Pro collect, use and share information.', 'Privacy policy', PRIVACY_EN),
    ('en', 'terms'): ('terms/', 'Terms of use · Downstreet', 'Terms for using the Downstreet and Downstreet Pro websites.', 'Terms of use', TERMS_EN),
    ('es', 'privacy'): ('es/privacidad/', 'Política de privacidad · Downstreet', 'Cómo Downstreet y Downstreet Pro recopilan, usan y comparten información.', 'Política de privacidad', PRIVACY_ES),
    ('es', 'terms'): ('es/terminos/', 'Términos de uso · Downstreet', 'Términos para usar los sitios de Downstreet y Downstreet Pro.', 'Términos de uso', TERMS_ES),
}

LABELS = {
    'en': {'updated': 'Last updated', 'home': 'Downstreet home', 'pro': 'Downstreet Pro', 'other_lang': 'Español',
           'privacy': 'Privacy policy', 'terms': 'Terms of use', 'skip': 'Skip to content'},
    'es': {'updated': 'Última actualización', 'home': 'Inicio de Downstreet', 'pro': 'Downstreet Pro', 'other_lang': 'English',
           'privacy': 'Política de privacidad', 'terms': 'Términos de uso', 'skip': 'Ir al contenido'},
}
