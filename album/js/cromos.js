/*
 * Catálogo de cromos. Para agregar uno nuevo:
 *   1. Suma un objeto con un id nuevo (no reutilices ids: el progreso se guarda por id).
 *   2. Guarda su retrato cuadrado en img/p<id>.webp (el service worker lo descarga solo).
 *   3. Sube APP_VERSION en js/version.js y cuenta la novedad en APP_NOTES.
 */
const CATEGORIES = {
    'Física':      { color: '#2F6BFF', soft: '#E6EEFF', icon: 'atom' },
    'Química':     { color: '#D63AF9', soft: '#FBE8FF', icon: 'flask' },
    'Biología':    { color: '#16A34A', soft: '#E3F8EA', icon: 'leaf' },
    'Astronomía':  { color: '#7B2FF7', soft: '#EFE6FF', icon: 'planet' },
    'Computación': { color: '#F2671F', soft: '#FFEDE2', icon: 'chip' }
};

const commons = file => 'https://commons.wikimedia.org/wiki/File:' + file;

const CROMOS = [
    // Física
    { id: 1, code: 'XQZT', name: 'Albert Einstein', category: 'Física', dates: '1879-1955', nationality: 'Alemana/Estadounidense', desc: 'Formuló la teoría de la relatividad, transformando nuestra comprensión del espacio, el tiempo y la gravedad con un enfoque matemático.',
      photo: { author: 'Oren Jack Turner', license: 'Dominio público', url: commons('Albert_Einstein_Head_cleaned.jpg') } },
    { id: 2, code: 'BFWL', name: 'Lise Meitner', category: 'Física', dates: '1878-1968', nationality: 'Austríaca/Sueca', desc: 'Descubrió el mecanismo de la fisión nuclear, explicando cómo el núcleo del átomo se divide para liberar enormes cantidades de energía.',
      photo: { author: 'Harris & Ewing', license: 'Dominio público', url: commons('Lise_Meitner_NatGeo.jpg') } },
    { id: 3, code: 'MJVD', name: 'Isaac Newton', category: 'Física', dates: '1643-1727', nationality: 'Inglesa', desc: 'Estableció las leyes del movimiento y la gravitación universal, proporcionando el marco matemático para predecir el comportamiento físico del universo.',
      photo: { author: 'Godfrey Kneller', license: 'Dominio público', url: commons('Portrait_of_Sir_Isaac_Newton,_1689_(brightened).jpg') } },
    { id: 4, code: 'KPHR', name: 'Chien-Shiung Wu', category: 'Física', dates: '1912-1997', nationality: 'China/Estadounidense', desc: 'Diseñó experimentos de gran precisión que refutaron la ley de conservación de la paridad, cambiando las reglas de la física cuántica.',
      photo: { author: 'Smithsonian Institution', license: 'Sin restricciones conocidas', url: commons('Chien-shiung_Wu_(1912-1997)_C.jpg') } },
    // Química
    { id: 5, code: 'NYCD', name: 'Marie Curie', category: 'Química', dates: '1867-1934', nationality: 'Polaca/Francesa', desc: 'Pionera en radiactividad y primera persona en ganar dos premios Nobel en distintas disciplinas científicas, aislando elementos como el radio.',
      photo: { author: 'Henri Manuel', license: 'Dominio público', url: commons('Marie_Curie_c._1920s.jpg') } },
    { id: 6, code: 'GLXW', name: 'Dmitri Mendeléyev', category: 'Química', dates: '1834-1907', nationality: 'Rusa', desc: 'Desarrolló la primera tabla periódica de los elementos, clasificándolos por peso atómico y logrando predecir la existencia de componentes desconocidos.',
      photo: { author: 'Autor desconocido', license: 'Dominio público', url: commons('Dmitri_Mendeleev.jpg') } },
    { id: 7, code: 'TZQF', name: 'Rosalind Franklin', category: 'Química', dates: '1920-1958', nationality: 'Inglesa', desc: 'Utilizó la cristalografía de rayos X para capturar la estructura de doble hélice del ADN, revelando la base molecular de la genética.',
      photo: { author: 'MRC Laboratory of Molecular Biology', license: 'CC BY-SA 4.0', url: commons('Rosalind_Franklin_(retouched).jpg') } },
    { id: 8, code: 'VRKM', name: 'Mario Molina', category: 'Química', dates: '1943-2020', nationality: 'Mexicana', desc: 'Explicó cómo los gases clorofluorocarbonos destruyen la capa de ozono, impulsando políticas globales fundamentales para proteger la atmósfera de nuestro planeta.',
      photo: { author: 'Janwikifoto', license: 'CC BY-SA 3.0', url: commons('Mario_Molina_1c389_8387.jpg') } },
    // Biología
    { id: 9, code: 'DJBP', name: 'Charles Darwin', category: 'Biología', dates: '1809-1882', nationality: 'Inglesa', desc: 'Propuso la teoría de la evolución mediante selección natural, detallando cómo los organismos se adaptan gradualmente a sus entornos.',
      photo: { author: 'Henry Maull y John Fox', license: 'Dominio público', url: commons('Charles_Darwin_seated_crop.jpg') } },
    { id: 10, code: 'HWNS', name: 'Jane Goodall', category: 'Biología', dates: '1934-2025', nationality: 'Inglesa', desc: 'Revolucionó la primatología mediante la observación de chimpancés, demostrando que fabrican herramientas y mantienen complejas estructuras sociales.',
      photo: { author: 'U.S. Department of State', license: 'Dominio público', url: commons("Deputy_Secretary_Higginbottom_Poses_for_a_Photo_With_Dr._Jane_Goodall_and_the_State_Department's_Global_Health_Diplomacy_Director_Jordan_in_Washington_(22365513310)_(2)_(cropped_2).jpg") } },
    { id: 11, code: 'QFCY', name: 'Alexander Fleming', category: 'Biología', dates: '1881-1955', nationality: 'Escocesa', desc: 'Descubrió la penicilina al observar cómo un hongo inhibía el crecimiento bacteriano, marcando el inicio de la era de los antibióticos.',
      photo: { author: 'Fotógrafo oficial (Ministerio de Información, R.U.)', license: 'Dominio público', url: commons('Synthetic_Production_of_Penicillin_TR1468.jpg') } },
    { id: 12, code: 'PLZG', name: 'Barbara McClintock', category: 'Biología', dates: '1902-1992', nationality: 'Estadounidense', desc: 'Demostró que los genes pueden cambiar de posición en los cromosomas, revelando un dinamismo en el genoma que desafió modelos tradicionales.',
      photo: { author: 'Smithsonian Institution / Science Service', license: 'Dominio público', url: commons('Barbara_McClintock_(1902-1992)_shown_in_her_laboratory_in_1947.jpg') } },
    // Astronomía
    { id: 13, code: 'SXTJ', name: 'Galileo Galilei', category: 'Astronomía', dates: '1564-1642', nationality: 'Italiana', desc: 'Perfeccionó el telescopio para observaciones precisas, aportando pruebas empíricas que confirmaron que la Tierra orbita alrededor del Sol.',
      photo: { author: 'Justus Sustermans', license: 'Dominio público', url: commons('Galileo_Galilei_(1564-1642)_RMG_BHC2700.tiff') } },
    { id: 14, code: 'CWRM', name: 'Vera Rubin', category: 'Astronomía', dates: '1928-2016', nationality: 'Estadounidense', desc: 'Analizó matemáticamente la velocidad de rotación de las galaxias y proporcionó la primera evidencia sólida sobre la existencia de materia oscura.',
      photo: { author: 'Mark Godfrey, cortesía de AIP Emilio Segrè Visual Archives', license: 'Atribución', url: commons('Vera_Rubin_with_antique_globes.jpg') } },
    // Computación
    { id: 15, code: 'FKVD', name: 'Ada Lovelace', category: 'Computación', dates: '1815-1852', nationality: 'Inglesa', desc: 'Escribió el primer algoritmo diseñado para ser procesado por una máquina, estableciendo los fundamentos de la programación informática.',
      photo: { author: 'Antoine Claudet', license: 'Dominio público', url: commons('Ada_Lovelace_daguerreotype_by_Antoine_Claudet_1843_-_cropped.png') } },
    { id: 16, code: 'BNQH', name: 'Alan Turing', category: 'Computación', dates: '1912-1954', nationality: 'Británica', desc: 'Formalizó los conceptos de algoritmo con su máquina teórica, sentando las bases de la informática moderna y el procesamiento de datos.',
      photo: { author: 'Elliott & Fry', license: 'Dominio público', url: commons('Alan_turing_header.jpg') } }
];
