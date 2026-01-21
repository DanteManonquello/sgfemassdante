/* ================================================================================
   DATABASE NOMI ITALIANI - TESTmess v2.2.2
   
   Database completo di nomi italiani per riconoscimento automatico genere
   e separazione intelligente Nome/Cognome
   ================================================================================ */

// ===== NOMI MASCHILI ITALIANI =====
const NOMI_MASCHILI = [
    // Nomi comuni moderni
    'andrea', 'alessandro', 'matteo', 'lorenzo', 'leonardo', 'francesco', 'gabriele',
    'riccardo', 'tommaso', 'davide', 'giuseppe', 'antonio', 'marco', 'luca', 'giovanni',
    'stefano', 'paolo', 'carlo', 'mario', 'roberto', 'michele', 'simone', 'federico',
    'alberto', 'fabio', 'massimo', 'daniele', 'claudio', 'vincenzo', 'salvatore',
    'emanuele', 'manuel', 'samuele', 'mattia', 'nicola', 'filippo', 'pietro', 'diego',
    
    // Nomi tradizionali
    'angelo', 'pasquale', 'domenico', 'luigi', 'franco', 'bruno', 'sergio', 'giorgio',
    'mauro', 'alessandro', 'enrico', 'raffaele', 'gennaro', 'carmine', 'ciro', 'rocco',
    'gaetano', 'armando', 'aldo', 'bruno', 'dario', 'enzo', 'guido', 'ivo', 'renzo',
    
    // Nomi biblici/religiosi
    'gabriele', 'michele', 'raffaele', 'daniele', 'samuele', 'emanuele', 'matteo',
    'marco', 'luca', 'giovanni', 'paolo', 'pietro', 'giacomo', 'simone', 'tommaso',
    
    // Nomi storici/letterari
    'dante', 'leonardo', 'michelangelo', 'raffaello', 'giotto', 'tiziano', 'donatello',
    'lorenzo', 'cosimo', 'alessandro', 'cesare', 'augusto', 'marco', 'giulio',
    
    // Nomi moderni/internazionali
    'kevin', 'christian', 'thomas', 'nicholas', 'michael', 'daniel', 'samuel', 'david',
    'nathan', 'ryan', 'alex', 'joshua', 'gabriel', 'mattia', 'noah', 'liam',
    
    // Nomi composti comuni
    'gianluca', 'gianmarco', 'pierpaolo', 'piergiorgio', 'gianfranco', 'giancarlo',
    
    // Altri nomi comuni
    'adriano', 'agostino', 'amedeo', 'arnaldo', 'arturo', 'attilio', 'aurelio',
    'benito', 'beniamino', 'bernardino', 'biagio', 'calogero', 'camillo', 'celso',
    'corrado', 'costantino', 'cristiano', 'damiano', 'demetrio', 'dino', 'edoardo',
    'egidio', 'eligio', 'elio', 'emilio', 'erasmo', 'ermanno', 'ernesto', 'ettore',
    'eugenio', 'ezio', 'fausto', 'felice', 'ferdinando', 'filiberto', 'flavio',
    'fulvio', 'germano', 'giacinto', 'gianni', 'gilberto', 'gino', 'gioele',
    'giordano', 'girolamo', 'giuliano', 'graziano', 'gregorio', 'guglielmo', 'gustavo',
    'igino', 'ignazio', 'innocenzo', 'italo', 'ivano', 'jacopo', 'lamberto',
    'leandro', 'leone', 'leopoldo', 'libero', 'lionello', 'livio', 'loris',
    'luciano', 'ludovico', 'manlio', 'manolo', 'marcello', 'mariano', 'marino',
    'martino', 'maurizio', 'mauro', 'mirko', 'moreno', 'nando', 'natale',
    'natalino', 'nazzareno', 'nello', 'neri', 'nino', 'nunzio', 'odoardo',
    'olindo', 'omar', 'omero', 'orazio', 'orlando', 'oscar', 'osvaldo',
    'ottavio', 'pacifico', 'palmiro', 'patrizio', 'quirino', 'raimondo', 'raniero',
    'raul', 'remo', 'renato', 'riccardo', 'rinaldo', 'rodolfo', 'rolando',
    'romano', 'romolo', 'rino', 'ruggero', 'sabatino', 'sabino', 'sandro',
    'santino', 'santo', 'saverio', 'sebastiano', 'secondo', 'serafino', 'severino',
    'severo', 'silvano', 'silverio', 'silvio', 'siro', 'sisto', 'taddeo',
    'tancredi', 'teodoro', 'tiberio', 'tito', 'tiziano', 'ubaldo', 'ugo',
    'umberto', 'urbano', 'valerio', 'valter', 'vasco', 'virgilio', 'vitale',
    'vito', 'vittorio', 'walter', 'wilmer', 'zeno'
];

// ===== NOMI FEMMINILI ITALIANI =====
const NOMI_FEMMINILI = [
    // Nomi comuni moderni
    'sofia', 'giulia', 'aurora', 'alice', 'ginevra', 'emma', 'giorgia', 'greta',
    'beatrice', 'anna', 'chiara', 'sara', 'martina', 'francesca', 'alessia', 'elena',
    'valentina', 'federica', 'silvia', 'laura', 'maria', 'giovanna', 'rosa', 'angela',
    'caterina', 'elisa', 'monica', 'paola', 'barbara', 'lucia', 'teresa', 'rita',
    'camilla', 'vittoria', 'rebecca', 'nicole', 'marta', 'eleonora', 'ludovica',
    
    // Nomi tradizionali
    'antonia', 'carmela', 'concetta', 'filomena', 'giuseppina', 'immacolata', 'rosaria',
    'assunta', 'addolorata', 'annunziata', 'raffaella', 'maddalena', 'grazia', 'nunzia',
    
    // Nomi biblici/religiosi
    'rachele', 'rebecca', 'sara', 'miriam', 'debora', 'ester', 'noemi', 'ruth',
    'giuditta', 'susanna', 'elisabetta', 'maddalena',
    
    // Nomi storici/letterari
    'beatrice', 'bianca', 'carlotta', 'caterina', 'cleopatra', 'diana', 'eleonora',
    'isabella', 'lavinia', 'livia', 'lucrezia', 'margherita', 'matilde', 'vittoria',
    
    // Nomi moderni/internazionali
    'emily', 'jessica', 'jennifer', 'ashley', 'michelle', 'amanda', 'melissa', 'sarah',
    'rebecca', 'nicole', 'stephanie', 'sophia', 'emma', 'olivia', 'ava', 'mia',
    
    // Altri nomi comuni
    'ada', 'adele', 'adriana', 'agata', 'agnese', 'alberta', 'alda', 'alessandra',
    'alfonsina', 'allegra', 'alma', 'amalia', 'ambra', 'amelia', 'anita', 'annalisa',
    'antonella', 'arianna', 'armida', 'assunta', 'ausilia', 'azzurra', 'benedetta',
    'berenice', 'berta', 'bruna', 'brunella', 'carla', 'carolina', 'cassandra',
    'cecilia', 'celeste', 'cinzia', 'clara', 'claudia', 'clelia', 'clotilde',
    'colomba', 'consolata', 'corinna', 'cornelia', 'costanza', 'cristiana', 'cristina',
    'dafne', 'dalila', 'daniela', 'danila', 'daria', 'debora', 'delia', 'delinda',
    'diletta', 'dina', 'dolores', 'domenica', 'donata', 'donatella', 'dora', 'dorina',
    'edda', 'edvige', 'elettra', 'egle', 'elda', 'elide', 'eloisa', 'elvira',
    'emanuela', 'emilia', 'enrichetta', 'enrica', 'erika', 'erna', 'ernesta', 'ersilia',
    'ester', 'eugenia', 'eunice', 'eva', 'evelina', 'fabia', 'fabiana', 'fabiola',
    'fatima', 'fausta', 'felicia', 'fernanda', 'fiorella', 'fiorenza', 'flaminia',
    'flavia', 'flora', 'franca', 'fulvia', 'gabriella', 'gaia', 'gemma', 'genziana',
    'gerarda', 'germana', 'gilda', 'gina', 'gioia', 'giordana', 'giovanna', 'gisella',
    'giuditta', 'giuliana', 'giuseppina', 'gloria', 'graziella', 'guglielmina', 'ida',
    'ilaria', 'ileana', 'ilenia', 'ines', 'ingrid', 'iolanda', 'irene', 'iride',
    'iris', 'irma', 'isa', 'isabella', 'ivana', 'ivonne', 'lara', 'lea',
    'leandra', 'leda', 'leila', 'lena', 'leonia', 'leonilda', 'letizia', 'lia',
    'liana', 'libera', 'licia', 'lidia', 'lilia', 'liliana', 'lina', 'linda',
    'lisa', 'lisetta', 'loredana', 'lorella', 'lorena', 'lorenza', 'luana', 'luciana',
    'lucilla', 'lucrezia', 'luisa', 'luna', 'mafalda', 'manuela', 'marcella', 'margherita',
    'maria', 'mariangela', 'mariapia', 'mariarosa', 'mariella', 'marilena', 'marina',
    'marinella', 'marisa', 'maristella', 'marita', 'marzia', 'massima', 'matilde',
    'maura', 'michela', 'milena', 'miranda', 'mirella', 'miriam', 'moira', 'morena',
    'nadia', 'natalia', 'natalina', 'nerina', 'nicoletta', 'nina', 'nives', 'norma',
    'noemi', 'nunzia', 'ofelia', 'olga', 'olimpia', 'ombretta', 'ondina', 'oriana',
    'orietta', 'ornella', 'orsola', 'ortensia', 'ottavia', 'palmira', 'pamela',
    'patrizia', 'perla', 'pia', 'piera', 'pierina', 'pina', 'priscilla', 'prisca',
    'quirina', 'rachele', 'raffaella', 'ramona', 'raquel', 'regina', 'renata', 'rina',
    'rita', 'roberta', 'romana', 'romilda', 'romina', 'rosa', 'rosalba', 'rosalia',
    'rosalinda', 'rosanna', 'rosaria', 'rosella', 'rosetta', 'rosina', 'rossana',
    'rossella', 'sabina', 'sabrina', 'samantha', 'sandra', 'santa', 'sara', 'sarita',
    'savina', 'seconda', 'selvaggia', 'serafina', 'serena', 'silvana', 'silvia',
    'simona', 'simonetta', 'sofia', 'sonia', 'stella', 'stefania', 'susanna', 'sveva',
    'tamara', 'tania', 'tatiana', 'tea', 'tecla', 'teodora', 'teodosia', 'teresa',
    'tiziana', 'tosca', 'trina', 'tullia', 'uberta', 'uliana', 'ulrike', 'ursula',
    'valeria', 'vanda', 'vanessa', 'vanna', 'vera', 'veronica', 'vilma', 'vincenza',
    'viola', 'violetta', 'virginia', 'vitalia', 'vivia', 'viviana', 'wanda', 'zaira',
    'zelinda', 'zelia', 'zita', 'zoe'
];

// ===== EXPORT FUNZIONI =====
window.NOMI_MASCHILI = NOMI_MASCHILI;
window.NOMI_FEMMINILI = NOMI_FEMMINILI;

console.log(`✅ Database nomi italiani caricato: ${NOMI_MASCHILI.length} maschili, ${NOMI_FEMMINILI.length} femminili`);
