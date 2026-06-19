// Curated "basics" vocabulary — the core building blocks (family, numbers,
// food, hobbies, colours, greetings). This is the single source of truth shared
// by the Basics browse/reference screen and the full-game practice mode, which
// feeds these entries into RevisionGame exactly like a campaign deck.

import type { VocabularyItem } from '../types/vocabulary'

export type CategoryId =
  | 'family' | 'numbers' | 'food' | 'hobbies' | 'colours' | 'greetings'
  | 'days' | 'weather' | 'body' | 'places' | 'countries' | 'adult'

export interface Entry {
  spanish: string
  english: string
  note?: string
}

export interface Category {
  id: CategoryId
  label: string
  icon: string
  blurb: string
  /** Difficulty band (1 = starter, 2 = core). Gates which topics a learner
   * sees at their level, and is stamped onto each word for pool filtering. */
  band: 1 | 2 | 3
  /** Numbers gets an extra "type the number" challenge mode. */
  hasChallenge?: boolean
  entries: Entry[]
}

const FAMILY: Entry[] = [
  { spanish: 'la familia', english: 'the family' },
  { spanish: 'los padres', english: 'the parents' },
  { spanish: 'el padre', english: 'father' },
  { spanish: 'la madre', english: 'mother' },
  { spanish: 'papá', english: 'dad' },
  { spanish: 'mamá', english: 'mum' },
  { spanish: 'el hijo', english: 'son' },
  { spanish: 'la hija', english: 'daughter' },
  { spanish: 'los hijos', english: 'children / sons' },
  { spanish: 'el hermano', english: 'brother' },
  { spanish: 'la hermana', english: 'sister' },
  { spanish: 'el abuelo', english: 'grandfather' },
  { spanish: 'la abuela', english: 'grandmother' },
  { spanish: 'el nieto', english: 'grandson' },
  { spanish: 'la nieta', english: 'granddaughter' },
  { spanish: 'el tío', english: 'uncle' },
  { spanish: 'la tía', english: 'aunt' },
  { spanish: 'el primo', english: 'cousin (m)' },
  { spanish: 'la prima', english: 'cousin (f)' },
  { spanish: 'el sobrino', english: 'nephew' },
  { spanish: 'la sobrina', english: 'niece' },
  { spanish: 'el esposo / el marido', english: 'husband' },
  { spanish: 'la esposa / la mujer', english: 'wife' },
  { spanish: 'el novio', english: 'boyfriend' },
  { spanish: 'la novia', english: 'girlfriend' },
  { spanish: 'el suegro', english: 'father-in-law' },
  { spanish: 'la suegra', english: 'mother-in-law' },
  { spanish: 'el cuñado', english: 'brother-in-law' },
  { spanish: 'la cuñada', english: 'sister-in-law' },
  { spanish: 'mi', english: 'my', note: 'e.g. mi hermano = my brother' },
  { spanish: 'tu', english: 'your (informal)' },
  { spanish: 'su', english: 'his / her / their' },
]

// Numbers: enough to cover the 1–1000 system without listing every integer.
// Patterns: 16–29 are usually one word (dieciséis, veintiuno…); 31+ uses
// "y" (treinta y uno). 200–900 agree in gender (doscientas casas).
const NUMBERS: Entry[] = [
  { spanish: 'cero', english: '0' },
  { spanish: 'uno', english: '1', note: 'becomes "un" before a masc. noun' },
  { spanish: 'dos', english: '2' },
  { spanish: 'tres', english: '3' },
  { spanish: 'cuatro', english: '4' },
  { spanish: 'cinco', english: '5' },
  { spanish: 'seis', english: '6' },
  { spanish: 'siete', english: '7' },
  { spanish: 'ocho', english: '8' },
  { spanish: 'nueve', english: '9' },
  { spanish: 'diez', english: '10' },
  { spanish: 'once', english: '11' },
  { spanish: 'doce', english: '12' },
  { spanish: 'trece', english: '13' },
  { spanish: 'catorce', english: '14' },
  { spanish: 'quince', english: '15' },
  { spanish: 'dieciséis', english: '16' },
  { spanish: 'diecisiete', english: '17' },
  { spanish: 'dieciocho', english: '18' },
  { spanish: 'diecinueve', english: '19' },
  { spanish: 'veinte', english: '20' },
  { spanish: 'veintiuno', english: '21', note: '21–29 are one word: veintidós, veintitrés…' },
  { spanish: 'veintidós', english: '22' },
  { spanish: 'treinta', english: '30' },
  { spanish: 'treinta y uno', english: '31', note: 'from 31 onwards use "y": cuarenta y dos…' },
  { spanish: 'cuarenta', english: '40' },
  { spanish: 'cincuenta', english: '50' },
  { spanish: 'sesenta', english: '60' },
  { spanish: 'setenta', english: '70' },
  { spanish: 'ochenta', english: '80' },
  { spanish: 'noventa', english: '90' },
  { spanish: 'cien', english: '100', note: 'becomes "ciento" before smaller numbers: ciento uno = 101' },
  { spanish: 'ciento uno', english: '101' },
  { spanish: 'doscientos', english: '200', note: '200–900 agree in gender: doscientas casas' },
  { spanish: 'trescientos', english: '300' },
  { spanish: 'cuatrocientos', english: '400' },
  { spanish: 'quinientos', english: '500', note: 'irregular — not "cincocientos"' },
  { spanish: 'seiscientos', english: '600' },
  { spanish: 'setecientos', english: '700', note: 'irregular — not "sietecientos"' },
  { spanish: 'ochocientos', english: '800' },
  { spanish: 'novecientos', english: '900', note: 'irregular — not "nuevecientos"' },
  { spanish: 'mil', english: '1000', note: 'no "un" — just "mil"' },
]

const FOOD: Entry[] = [
  // Meals & general
  { spanish: 'la comida', english: 'food / meal' },
  { spanish: 'el desayuno', english: 'breakfast' },
  { spanish: 'el almuerzo / la comida', english: 'lunch' },
  { spanish: 'la cena', english: 'dinner' },
  { spanish: 'el plato', english: 'dish / plate' },
  { spanish: 'el restaurante', english: 'restaurant' },
  { spanish: 'la cuenta', english: 'the bill' },
  // Drinks
  { spanish: 'la bebida', english: 'drink' },
  { spanish: 'el agua', english: 'water', note: 'feminine but uses "el" in singular' },
  { spanish: 'el café', english: 'coffee' },
  { spanish: 'el té', english: 'tea' },
  { spanish: 'la leche', english: 'milk' },
  { spanish: 'el zumo / el jugo', english: 'juice' },
  { spanish: 'el vino', english: 'wine' },
  { spanish: 'la cerveza', english: 'beer' },
  { spanish: 'el refresco', english: 'soft drink' },
  // Staples
  { spanish: 'el pan', english: 'bread' },
  { spanish: 'el queso', english: 'cheese' },
  { spanish: 'el huevo', english: 'egg' },
  { spanish: 'el arroz', english: 'rice' },
  { spanish: 'la pasta', english: 'pasta' },
  { spanish: 'la sopa', english: 'soup' },
  { spanish: 'la ensalada', english: 'salad' },
  { spanish: 'la mantequilla', english: 'butter' },
  { spanish: 'el aceite', english: 'oil' },
  { spanish: 'la sal', english: 'salt' },
  { spanish: 'el azúcar', english: 'sugar' },
  // Meat & fish
  { spanish: 'la carne', english: 'meat' },
  { spanish: 'el pollo', english: 'chicken' },
  { spanish: 'la ternera', english: 'beef' },
  { spanish: 'el cerdo', english: 'pork' },
  { spanish: 'el jamón', english: 'ham' },
  { spanish: 'el pescado', english: 'fish (to eat)' },
  { spanish: 'las gambas', english: 'prawns / shrimp' },
  { spanish: 'el atún', english: 'tuna' },
  { spanish: 'la salchicha', english: 'sausage' },
  { spanish: 'el pavo', english: 'turkey' },
  // Fruit & veg
  { spanish: 'la fruta', english: 'fruit' },
  { spanish: 'la manzana', english: 'apple' },
  { spanish: 'la naranja', english: 'orange' },
  { spanish: 'el plátano', english: 'banana' },
  { spanish: 'la fresa', english: 'strawberry' },
  { spanish: 'la pera', english: 'pear' },
  { spanish: 'la uva', english: 'grape' },
  { spanish: 'el limón', english: 'lemon' },
  { spanish: 'la sandía', english: 'watermelon' },
  { spanish: 'la piña', english: 'pineapple' },
  { spanish: 'el melocotón / el durazno', english: 'peach' },
  { spanish: 'la verdura', english: 'vegetable' },
  { spanish: 'el tomate', english: 'tomato' },
  { spanish: 'la patata / la papa', english: 'potato' },
  { spanish: 'la cebolla', english: 'onion' },
  { spanish: 'el ajo', english: 'garlic' },
  { spanish: 'la zanahoria', english: 'carrot' },
  { spanish: 'la lechuga', english: 'lettuce' },
  { spanish: 'el pimiento', english: 'pepper (vegetable)' },
  { spanish: 'el champiñón / la seta', english: 'mushroom' },
  { spanish: 'los guisantes', english: 'peas' },
  // Desserts & sweets
  { spanish: 'el postre', english: 'dessert' },
  { spanish: 'el helado', english: 'ice cream' },
  { spanish: 'el pastel / la tarta', english: 'cake' },
  { spanish: 'el chocolate', english: 'chocolate' },
  { spanish: 'la galleta', english: 'biscuit / cookie' },
  // Useful phrases
  { spanish: 'tengo hambre', english: 'I am hungry' },
  { spanish: 'tengo sed', english: 'I am thirsty' },
  { spanish: 'quisiera…', english: 'I would like…' },
  { spanish: 'la carta / el menú', english: 'the menu' },
  { spanish: '¿qué me recomienda?', english: 'what do you recommend?' },
  { spanish: 'para llevar', english: 'to take away / to go' },
  { spanish: 'soy vegetariano / vegetariana', english: 'I am vegetarian' },
  { spanish: 'está delicioso', english: "it's delicious" },
  { spanish: 'la cuenta, por favor', english: 'the bill, please' },
  { spanish: 'la propina', english: 'the tip' },
]

const HOBBIES: Entry[] = [
  // General
  { spanish: 'el pasatiempo / la afición', english: 'hobby' },
  { spanish: 'el tiempo libre', english: 'free time' },
  { spanish: 'el deporte', english: 'sport' },
  { spanish: 'la música', english: 'music' },
  { spanish: 'la película', english: 'film / movie' },
  { spanish: 'el cine', english: 'cinema' },
  { spanish: 'el libro', english: 'book' },
  { spanish: 'el videojuego', english: 'video game' },
  { spanish: 'la foto / la fotografía', english: 'photo / photography' },
  // Sports
  { spanish: 'el fútbol', english: 'football / soccer' },
  { spanish: 'el baloncesto', english: 'basketball' },
  { spanish: 'el tenis', english: 'tennis' },
  { spanish: 'el voleibol', english: 'volleyball' },
  { spanish: 'el béisbol', english: 'baseball' },
  { spanish: 'el rugby', english: 'rugby' },
  { spanish: 'el golf', english: 'golf' },
  { spanish: 'el ciclismo', english: 'cycling' },
  { spanish: 'la natación', english: 'swimming' },
  { spanish: 'el atletismo', english: 'athletics / track and field' },
  { spanish: 'el boxeo', english: 'boxing' },
  { spanish: 'el esquí', english: 'skiing' },
  { spanish: 'el senderismo', english: 'hiking' },
  { spanish: 'el monopatín', english: 'skateboarding / skateboard' },
  { spanish: 'la equitación', english: 'horse riding' },
  { spanish: 'las artes marciales', english: 'martial arts' },
  { spanish: 'el gimnasio', english: 'gym' },
  { spanish: 'el equipo', english: 'team' },
  { spanish: 'el partido', english: 'match / game' },
  { spanish: 'la pelota / el balón', english: 'ball', note: 'pelota = small ball; balón = large/football' },
  // More sports
  { spanish: 'el hockey', english: 'hockey' },
  { spanish: 'el balonmano', english: 'handball' },
  { spanish: 'el bádminton', english: 'badminton' },
  { spanish: 'el tenis de mesa / el ping-pong', english: 'table tennis' },
  { spanish: 'el surf', english: 'surfing' },
  { spanish: 'el buceo', english: 'scuba diving' },
  { spanish: 'la vela', english: 'sailing' },
  { spanish: 'el remo', english: 'rowing' },
  { spanish: 'la escalada', english: 'climbing' },
  { spanish: 'el patinaje', english: 'skating' },
  // People & equipment
  { spanish: 'el jugador / la jugadora', english: 'player' },
  { spanish: 'el entrenador / la entrenadora', english: 'coach' },
  { spanish: 'el árbitro', english: 'referee' },
  { spanish: 'la raqueta', english: 'racket' },
  { spanish: 'las zapatillas', english: 'trainers / sneakers' },
  { spanish: 'el casco', english: 'helmet' },
  { spanish: 'la portería', english: 'goal (net)' },
  { spanish: 'el campeonato', english: 'championship' },
  { spanish: 'la medalla', english: 'medal' },
  { spanish: 'el ocio', english: 'leisure' },
  // Other hobbies
  { spanish: 'la lectura', english: 'reading' },
  { spanish: 'la pintura', english: 'painting' },
  { spanish: 'el dibujo', english: 'drawing' },
  { spanish: 'la jardinería', english: 'gardening' },
  { spanish: 'la cocina', english: 'cooking' },
  { spanish: 'la costura', english: 'sewing' },
  { spanish: 'el ajedrez', english: 'chess' },
  { spanish: 'los juegos de mesa', english: 'board games' },
  { spanish: 'el baile', english: 'dancing' },
  { spanish: 'el canto', english: 'singing' },
  { spanish: 'el teatro', english: 'theatre / drama' },
  { spanish: 'el coleccionismo', english: 'collecting' },
  { spanish: 'la papiroflexia', english: 'origami' },
  // Activities (verbs)
  { spanish: 'leer', english: 'to read' },
  { spanish: 'escribir', english: 'to write' },
  { spanish: 'bailar', english: 'to dance' },
  { spanish: 'cantar', english: 'to sing' },
  { spanish: 'cocinar', english: 'to cook' },
  { spanish: 'dibujar', english: 'to draw' },
  { spanish: 'pintar', english: 'to paint' },
  { spanish: 'nadar', english: 'to swim' },
  { spanish: 'correr', english: 'to run' },
  { spanish: 'caminar', english: 'to walk' },
  { spanish: 'viajar', english: 'to travel' },
  { spanish: 'jugar', english: 'to play (a game/sport)' },
  { spanish: 'entrenar', english: 'to train / work out' },
  { spanish: 'ganar', english: 'to win' },
  { spanish: 'perder', english: 'to lose' },
  { spanish: 'esquiar', english: 'to ski' },
  { spanish: 'patinar', english: 'to skate' },
  { spanish: 'pescar', english: 'to fish' },
  { spanish: 'acampar', english: 'to camp' },
  { spanish: 'coleccionar', english: 'to collect' },
  // Phrases
  { spanish: 'tocar la guitarra', english: 'to play the guitar' },
  { spanish: 'tocar el piano', english: 'to play the piano' },
  { spanish: 'escuchar música', english: 'to listen to music' },
  { spanish: 'ver la televisión', english: 'to watch TV' },
  { spanish: 'hacer deporte', english: 'to do sport / exercise' },
  { spanish: 'hacer yoga', english: 'to do yoga' },
  { spanish: 'jugar al fútbol', english: 'to play football', note: 'jugar a + el sport: jugar al tenis, jugar al baloncesto' },
  { spanish: 'montar en bici', english: 'to ride a bike' },
  { spanish: 'montar a caballo', english: 'to ride a horse' },
  { spanish: 'ir de excursión', english: 'to go hiking / on a trip' },
  { spanish: 'sacar fotos', english: 'to take photos' },
  { spanish: 'me gusta…', english: 'I like…', note: 'add a verb: me gusta leer = I like to read' },
  { spanish: 'me encanta…', english: 'I love…' },
  { spanish: '¿qué te gusta hacer?', english: 'what do you like to do?' },
  { spanish: '¿practicas algún deporte?', english: 'do you play any sport?' },
]

const COLOURS: Entry[] = [
  { spanish: 'el color', english: 'colour' },
  { spanish: 'rojo', english: 'red', note: 'agrees with the noun: roja, rojos, rojas' },
  { spanish: 'azul', english: 'blue' },
  { spanish: 'verde', english: 'green' },
  { spanish: 'amarillo', english: 'yellow' },
  { spanish: 'naranja', english: 'orange', note: 'invariable — la camisa naranja' },
  { spanish: 'morado / púrpura', english: 'purple' },
  { spanish: 'rosa', english: 'pink' },
  { spanish: 'negro', english: 'black' },
  { spanish: 'blanco', english: 'white' },
  { spanish: 'gris', english: 'grey' },
  { spanish: 'marrón', english: 'brown' },
  { spanish: 'claro', english: 'light (colour)', note: 'azul claro = light blue' },
  { spanish: 'oscuro', english: 'dark (colour)', note: 'verde oscuro = dark green' },
]

const GREETINGS: Entry[] = [
  { spanish: 'hola', english: 'hello' },
  { spanish: 'adiós', english: 'goodbye' },
  { spanish: 'buenos días', english: 'good morning' },
  { spanish: 'buenas tardes', english: 'good afternoon' },
  { spanish: 'buenas noches', english: 'good evening / night' },
  { spanish: 'hasta luego', english: 'see you later' },
  { spanish: 'hasta mañana', english: 'see you tomorrow' },
  { spanish: '¿cómo estás?', english: 'how are you?' },
  { spanish: 'bien, gracias', english: 'fine, thanks' },
  { spanish: '¿y tú?', english: 'and you?' },
  { spanish: 'por favor', english: 'please' },
  { spanish: 'gracias', english: 'thank you' },
  { spanish: 'de nada', english: "you're welcome" },
  { spanish: 'lo siento', english: "I'm sorry" },
  { spanish: 'perdón', english: 'excuse me / sorry' },
  { spanish: 'sí', english: 'yes' },
  { spanish: 'no', english: 'no' },
  { spanish: '¿cómo te llamas?', english: "what's your name?" },
  { spanish: 'me llamo…', english: 'my name is…' },
  { spanish: 'mucho gusto', english: 'nice to meet you' },
  { spanish: '¿de dónde eres?', english: 'where are you from?' },
  { spanish: 'soy de…', english: "I'm from…" },
  { spanish: 'no entiendo', english: "I don't understand" },
  { spanish: '¿hablas inglés?', english: 'do you speak English?' },
]

// Days, months & time. Note: days and months are lowercase in Spanish.
const DAYS: Entry[] = [
  { spanish: 'el día', english: 'day' },
  { spanish: 'la semana', english: 'week' },
  { spanish: 'el mes', english: 'month' },
  { spanish: 'el año', english: 'year' },
  { spanish: 'hoy', english: 'today' },
  { spanish: 'mañana', english: 'tomorrow', note: 'also means "morning"' },
  { spanish: 'ayer', english: 'yesterday' },
  { spanish: 'el fin de semana', english: 'weekend' },
  { spanish: 'lunes', english: 'Monday', note: 'days are lowercase in Spanish' },
  { spanish: 'martes', english: 'Tuesday' },
  { spanish: 'miércoles', english: 'Wednesday' },
  { spanish: 'jueves', english: 'Thursday' },
  { spanish: 'viernes', english: 'Friday' },
  { spanish: 'sábado', english: 'Saturday' },
  { spanish: 'domingo', english: 'Sunday' },
  { spanish: 'enero', english: 'January', note: 'months are lowercase too' },
  { spanish: 'febrero', english: 'February' },
  { spanish: 'marzo', english: 'March' },
  { spanish: 'abril', english: 'April' },
  { spanish: 'mayo', english: 'May' },
  { spanish: 'junio', english: 'June' },
  { spanish: 'julio', english: 'July' },
  { spanish: 'agosto', english: 'August' },
  { spanish: 'septiembre', english: 'September' },
  { spanish: 'octubre', english: 'October' },
  { spanish: 'noviembre', english: 'November' },
  { spanish: 'diciembre', english: 'December' },
  { spanish: 'la primavera', english: 'spring' },
  { spanish: 'el verano', english: 'summer' },
  { spanish: 'el otoño', english: 'autumn / fall' },
  { spanish: 'el invierno', english: 'winter' },
]

const WEATHER: Entry[] = [
  { spanish: 'el tiempo', english: 'the weather' },
  { spanish: '¿qué tiempo hace?', english: "what's the weather like?" },
  { spanish: 'hace sol', english: "it's sunny" },
  { spanish: 'hace calor', english: "it's hot" },
  { spanish: 'hace frío', english: "it's cold" },
  { spanish: 'hace viento', english: "it's windy" },
  { spanish: 'hace buen tiempo', english: 'the weather is good' },
  { spanish: 'hace mal tiempo', english: 'the weather is bad' },
  { spanish: 'está nublado', english: "it's cloudy" },
  { spanish: 'llueve', english: 'it rains / it’s raining', note: 'from llover; "está lloviendo" = it is raining' },
  { spanish: 'nieva', english: 'it snows / it’s snowing', note: 'from nevar; "está nevando" = it is snowing' },
  { spanish: 'la lluvia', english: 'rain' },
  { spanish: 'la nieve', english: 'snow' },
  { spanish: 'el sol', english: 'sun' },
  { spanish: 'el viento', english: 'wind' },
  { spanish: 'la nube', english: 'cloud' },
  { spanish: 'la tormenta', english: 'storm' },
  { spanish: 'el grado', english: 'degree', note: 'hace 20 grados = it’s 20 degrees' },
  { spanish: 'el paraguas', english: 'umbrella' },
]

const BODY: Entry[] = [
  { spanish: 'el cuerpo', english: 'body' },
  { spanish: 'la cabeza', english: 'head' },
  { spanish: 'el pelo / el cabello', english: 'hair' },
  { spanish: 'la cara', english: 'face' },
  { spanish: 'el ojo', english: 'eye' },
  { spanish: 'la nariz', english: 'nose' },
  { spanish: 'la boca', english: 'mouth' },
  { spanish: 'la oreja', english: 'ear' },
  { spanish: 'el diente', english: 'tooth' },
  { spanish: 'el cuello', english: 'neck' },
  { spanish: 'el hombro', english: 'shoulder' },
  { spanish: 'el brazo', english: 'arm' },
  { spanish: 'la mano', english: 'hand', note: 'feminine despite ending in -o: la mano' },
  { spanish: 'el dedo', english: 'finger' },
  { spanish: 'la pierna', english: 'leg' },
  { spanish: 'la rodilla', english: 'knee' },
  { spanish: 'el pie', english: 'foot' },
  { spanish: 'el estómago / la barriga', english: 'stomach' },
  { spanish: 'la espalda', english: 'back' },
  { spanish: 'el corazón', english: 'heart' },
  { spanish: 'me duele…', english: '… hurts', note: 'me duele la cabeza = my head hurts' },
]

const PLACES: Entry[] = [
  { spanish: 'el lugar / el sitio', english: 'place' },
  { spanish: 'la ciudad', english: 'city' },
  { spanish: 'el pueblo', english: 'town / village' },
  { spanish: 'la casa', english: 'house / home' },
  { spanish: 'el piso / el apartamento', english: 'flat / apartment' },
  { spanish: 'la calle', english: 'street' },
  { spanish: 'la tienda', english: 'shop' },
  { spanish: 'el supermercado', english: 'supermarket' },
  { spanish: 'el mercado', english: 'market' },
  { spanish: 'el banco', english: 'bank' },
  { spanish: 'el hospital', english: 'hospital' },
  { spanish: 'la farmacia', english: 'pharmacy' },
  { spanish: 'la escuela / el colegio', english: 'school' },
  { spanish: 'la universidad', english: 'university' },
  { spanish: 'el trabajo / la oficina', english: 'work / office' },
  { spanish: 'el restaurante', english: 'restaurant' },
  { spanish: 'la cafetería', english: 'café' },
  { spanish: 'el hotel', english: 'hotel' },
  { spanish: 'el aeropuerto', english: 'airport' },
  { spanish: 'la estación', english: 'station' },
  { spanish: 'el parque', english: 'park' },
  { spanish: 'la playa', english: 'beach' },
  { spanish: 'el museo', english: 'museum' },
  { spanish: 'la iglesia', english: 'church' },
  { spanish: 'el baño / el aseo', english: 'bathroom / toilet' },
  { spanish: '¿dónde está…?', english: 'where is…?' },
]

const COUNTRIES: Entry[] = [
  // Countries
  { spanish: 'el país', english: 'country' },
  { spanish: 'España', english: 'Spain' },
  { spanish: 'México', english: 'Mexico' },
  { spanish: 'Argentina', english: 'Argentina' },
  { spanish: 'Colombia', english: 'Colombia' },
  { spanish: 'Perú', english: 'Peru' },
  { spanish: 'Chile', english: 'Chile' },
  { spanish: 'Inglaterra', english: 'England' },
  { spanish: 'el Reino Unido', english: 'the United Kingdom' },
  { spanish: 'Irlanda', english: 'Ireland' },
  { spanish: 'Escocia', english: 'Scotland' },
  { spanish: 'Gales', english: 'Wales' },
  { spanish: 'los Estados Unidos', english: 'the United States' },
  { spanish: 'Francia', english: 'France' },
  { spanish: 'Alemania', english: 'Germany' },
  { spanish: 'Italia', english: 'Italy' },
  { spanish: 'Portugal', english: 'Portugal' },
  // Nationalities (masculine / feminine)
  { spanish: 'español / española', english: 'Spanish' },
  { spanish: 'mexicano / mexicana', english: 'Mexican' },
  { spanish: 'argentino / argentina', english: 'Argentinian' },
  { spanish: 'inglés / inglesa', english: 'English' },
  { spanish: 'británico / británica', english: 'British' },
  { spanish: 'irlandés / irlandesa', english: 'Irish' },
  { spanish: 'estadounidense', english: 'American (US)', note: 'same form for masculine & feminine' },
  { spanish: 'francés / francesa', english: 'French' },
  { spanish: 'alemán / alemana', english: 'German' },
  { spanish: 'italiano / italiana', english: 'Italian' },
  // Languages & phrases
  { spanish: 'el idioma / la lengua', english: 'language' },
  { spanish: 'el español / el castellano', english: 'Spanish (the language)' },
  { spanish: 'el inglés', english: 'English (the language)' },
  { spanish: '¿de dónde eres?', english: 'where are you from? (informal)' },
  { spanish: '¿de dónde es usted?', english: 'where are you from? (formal)' },
  { spanish: 'soy de…', english: 'I am from…' },
  { spanish: 'vivo en…', english: 'I live in…' },
  { spanish: 'hablo español', english: 'I speak Spanish' },
  { spanish: '¿hablas inglés?', english: 'do you speak English?' },
]

// 18+ everyday Spanish: real slang, common swearing (with strength notes), and
// practical sexual-health vocab. Ungated and always visible, but it only enters a
// practice deck when the learner explicitly picks this topic.
const ADULT: Entry[] = [
  // Everyday slang (mostly Spain unless noted)
  { spanish: 'guay', english: 'cool / great', note: 'Spain' },
  { spanish: 'chido / padre', english: 'cool / great', note: 'Mexico' },
  { spanish: 'molar', english: 'to be cool / to like', note: 'e.g. "me mola" = I love it (Spain)' },
  { spanish: 'flipar', english: 'to freak out / be amazed' },
  { spanish: 'el tío / la tía', english: 'guy / girl, mate, dude', note: 'informal, Spain' },
  { spanish: 'el chaval / la chavala', english: 'kid / young person' },
  { spanish: 'currar', english: 'to work', note: 'slang, Spain' },
  { spanish: 'la pasta', english: 'money / cash', note: 'slang' },
  { spanish: 'la resaca', english: 'hangover' },
  { spanish: 'estar de coña', english: 'to be joking / kidding', note: 'informal' },
  { spanish: '¿qué pasa? / ¿qué tal?', english: "what's up? / how's it going?" },
  { spanish: 'vale', english: 'okay / alright', note: 'Spain' },
  // Swearing & insults — register notes show strength
  { spanish: 'mierda', english: 'shit / damn', note: 'vulgar; also "¡mierda!" as an exclamation' },
  { spanish: 'joder', english: "f*** / damn it", note: 'very common interjection; vulgar' },
  { spanish: 'coño', english: 'damn / bloody hell', note: 'vulgar exclamation, Spain' },
  { spanish: 'hostia', english: 'bloody hell / wow', note: 'vulgar, Spain; surprise or anger' },
  { spanish: 'cabrón / cabrona', english: 'bastard / jerk', note: 'strong insult; vulgar' },
  { spanish: 'gilipollas', english: 'idiot / jerk', note: 'vulgar, Spain' },
  { spanish: 'pendejo / pendeja', english: 'idiot / dumbass', note: 'vulgar, Mexico' },
  { spanish: '¡vete a la mierda!', english: "f*** off / go to hell", note: 'very rude' },
  { spanish: 'estar cabreado / cabreada', english: 'to be pissed off', note: 'informal' },
  { spanish: 'maldito / maldita', english: 'damn / cursed', note: 'mild' },
  // Sexual health & practical
  { spanish: 'el sexo', english: 'sex' },
  { spanish: 'el condón / el preservativo', english: 'condom' },
  { spanish: 'los anticonceptivos', english: 'contraceptives' },
  { spanish: 'la píldora', english: 'the (contraceptive) pill' },
  { spanish: 'el lubricante', english: 'lubricant' },
  { spanish: 'protegerse', english: 'to use protection / protect oneself' },
  { spanish: 'la ITS', english: 'STI', note: 'infección de transmisión sexual' },
  { spanish: 'hacerse una prueba', english: 'to get tested' },
  { spanish: 'el embarazo', english: 'pregnancy' },
  { spanish: '¿tienes condones?', english: 'do you have condoms?' },
  { spanish: '¿dónde puedo comprar preservativos?', english: 'where can I buy condoms?' },
]

export const CATEGORIES: Category[] = [
  {
    id: 'family',
    band: 1,
    label: 'Family',
    icon: '👨‍👩‍👧',
    blurb: 'Describe the people in your life — parents, siblings, in-laws.',
    entries: FAMILY,
  },
  {
    id: 'numbers',
    band: 1,
    label: 'Numbers (0–1000)',
    icon: '🔢',
    blurb: 'The full counting system, plus the patterns that get you anywhere up to 1000.',
    hasChallenge: true,
    entries: NUMBERS,
  },
  {
    id: 'food',
    band: 2,
    label: 'Food & Drink',
    icon: '🍽️',
    blurb: 'Meals, staples, drinks, and a few phrases for ordering.',
    entries: FOOD,
  },
  {
    id: 'hobbies',
    band: 2,
    label: 'Hobbies & Free Time',
    icon: '🎨',
    blurb: 'Sports, music, and the verbs to say what you like doing.',
    entries: HOBBIES,
  },
  {
    id: 'colours',
    band: 1,
    label: 'Colours',
    icon: '🌈',
    blurb: 'The basic colours, plus light/dark and how they agree with nouns.',
    entries: COLOURS,
  },
  {
    id: 'greetings',
    band: 1,
    label: 'Greetings & Phrases',
    icon: '👋',
    blurb: 'Say hello, be polite, and handle a first conversation.',
    entries: GREETINGS,
  },
  {
    id: 'days',
    band: 2,
    label: 'Days, Months & Time',
    icon: '📆',
    blurb: 'Days, months, seasons and the words for today, tomorrow, yesterday.',
    entries: DAYS,
  },
  {
    id: 'weather',
    band: 2,
    label: 'Weather',
    icon: '⛅',
    blurb: 'Talk about the weather — hace sol, llueve, está nublado.',
    entries: WEATHER,
  },
  {
    id: 'body',
    band: 2,
    label: 'The Body',
    icon: '🧍',
    blurb: 'Parts of the body, plus how to say something hurts.',
    entries: BODY,
  },
  {
    id: 'places',
    band: 2,
    label: 'Places in Town',
    icon: '🏙️',
    blurb: 'Shops, buildings and places — and how to ask where something is.',
    entries: PLACES,
  },
  {
    id: 'countries',
    band: 2,
    label: 'Countries & Nationalities',
    icon: '🌍',
    blurb: 'Countries, nationalities, languages — and how to say where you’re from.',
    entries: COUNTRIES,
  },
  {
    id: 'adult',
    band: 1,
    label: 'Slang & Adult Topics (18+) 🔞',
    icon: '🔞',
    blurb: '18+ only. Real slang, common swearing (with strength notes), and practical sexual-health vocab.',
    entries: ADULT,
  },
]

export function categoryById(id: string | null): Category | null {
  return CATEGORIES.find((c) => c.id === id) ?? null
}

// Resolve a comma-separated list of topic ids (e.g. "family,weather,body")
// into the matching categories, preserving the canonical CATEGORIES order.
export function categoriesByIds(ids: string | null): Category[] {
  if (!ids) return []
  const wanted = new Set(ids.split(',').map((s) => s.trim()).filter(Boolean))
  return CATEGORIES.filter((c) => wanted.has(c.id))
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ARTICLE_RE = /^(el|la|los|las|un|una|mi|tu|su)\s/i

// Rough part-of-speech guess so the game's hints/labels read sensibly. Only
// matters cosmetically — grading uses the Spanish/English strings directly.
function guessType(e: Entry): VocabularyItem['type'] {
  const en = e.english.toLowerCase()
  if (en.startsWith('to ')) return 'verb'
  const sp = e.spanish.trim()
  if (sp.includes(' ') && !ARTICLE_RE.test(sp)) return 'phrase'
  return 'noun'
}

// Convert a Basics category into the VocabularyItem[] shape the RevisionGame
// engine consumes — giving Basics topics the same full capabilities (all game
// modes, SRS tracking, scoring, speech) as the main campaigns.
export function categoryToVocab(cat: Category): VocabularyItem[] {
  return cat.entries.map((e) => ({
    id: `basics:${cat.id}:${slugify(e.spanish)}`,
    spanish_word: e.spanish,
    english_translation: e.english,
    type: guessType(e),
    tags: ['basics', cat.id],
    difficulty: cat.band,
    mastery_level: 0,
    next_review_date: '',
    beginner_safe: cat.band === 1,
  }))
}

// Every Basics word across all categories, in the RevisionGame vocab shape.
// Used when the learner opts to fold Basics into the Weekly Sprint.
export function allBasicsVocab(): VocabularyItem[] {
  return CATEGORIES.flatMap(categoryToVocab)
}
