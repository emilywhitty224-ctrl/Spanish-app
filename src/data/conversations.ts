// Scripted branching conversations for "Chat with Barny". Each conversation is
// a tree of nodes. Barny "says" a Spanish line, the learner picks from 2-3
// Spanish replies, and the choice routes to the next node. Replies have an
// `outcome` so we can score the conversation at the end:
//   - 'good'    : natural / correct reply (+1)
//   - 'okay'    : understandable but awkward (+0)
//   - 'bad'     : grammatically wrong / nonsensical (-1, counted as a miss)
// `english` is the literal translation, only revealed after the learner picks.
// `explanation` (optional) is the grammar / pragmatic note shown post-pick —
// most useful on 'okay' and 'bad' replies to explain *why*.

export interface ChoiceNode {
  id: string
  /** Barny's line in Spanish. */
  barny: string
  /** English translation (revealed alongside Barny's bubble). */
  barnyEnglish: string
  /** Up to 3 reply options. */
  replies: Reply[]
}

export interface Reply {
  spanish: string
  english: string
  outcome: 'good' | 'okay' | 'bad'
  /** Optional grammar / pragmatic note shown after picking. */
  explanation?: string
  /** Next node id. If null, the conversation ends. */
  next: string | null
}

export type ConversationCategory = 'greetings' | 'food-drink' | 'hobbies' | 'real-life'

export interface Conversation {
  id: string
  category: ConversationCategory
  title: string
  icon: string
  description: string
  startId: string
  nodes: Record<string, ChoiceNode>
}

export const CATEGORIES: { id: ConversationCategory; label: string; icon: string; description: string }[] = [
  { id: 'greetings',  label: 'Greetings & Small Talk', icon: '👋', description: 'Say hi, introduce yourself, make small talk.' },
  { id: 'food-drink', label: 'Food & Drink',           icon: '🍽️', description: 'Cafés, restaurants, markets, tapas bars.' },
  { id: 'hobbies',    label: 'Hobbies & Free Time',    icon: '🎨', description: 'Talk about what you like to do.' },
  { id: 'real-life',  label: 'Real-life Valencia',     icon: '🇪🇸', description: 'Flat hunting, TIE card, bank — life admin in Spain.' },
]

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'greetings',
    category: 'greetings',
    title: 'Greetings',
    icon: '👋',
    description: 'Bump into Barny in the park and say hello.',
    startId: 'g1',
    nodes: {
      g1: {
        id: 'g1',
        barny: '¡Hola! ¿Cómo estás?',
        barnyEnglish: 'Hi! How are you?',
        replies: [
          { spanish: 'Estoy muy bien, gracias.', english: "I'm very well, thanks.", outcome: 'good', next: 'g2' },
          { spanish: 'Más o menos.',             english: 'So-so.',                 outcome: 'okay', next: 'g2',
            explanation: "Understood, but quite lukewarm. 'Bien, gracias' or 'Estoy regular' feel more natural in greeting." },
          { spanish: 'Me llamo café.',           english: 'My name is coffee.',     outcome: 'bad',  next: 'g2',
            explanation: "That answers '¿Cómo te llamas?' (what's your name?), not '¿Cómo estás?' (how are you?). 'Cómo estás' uses estar to ask about your state — reply with 'Estoy bien.'" },
        ],
      },
      g2: {
        id: 'g2',
        barny: '¡Qué bueno! ¿Cómo te llamas?',
        barnyEnglish: 'Great! What is your name?',
        replies: [
          { spanish: 'Me llamo Emily. ¿Y tú?', english: "I'm Emily. And you?", outcome: 'good', next: 'g3' },
          { spanish: 'Soy Emily.',             english: "I'm Emily.",          outcome: 'okay', next: 'g3',
            explanation: "Grammatically fine, but Spanish speakers usually answer '¿Cómo te llamas?' with 'Me llamo…' — using the verb that mirrors the question." },
          { spanish: 'Tengo hambre.',          english: "I'm hungry.",         outcome: 'bad',  next: 'g3',
            explanation: "That answers a different question. 'Tengo hambre' uses tener for a state you 'have'. Here Barny is asking your name — 'Me llamo Emily.'" },
        ],
      },
      g3: {
        id: 'g3',
        barny: 'Me llamo Barny. ¡Mucho gusto!',
        barnyEnglish: "I'm Barny. Nice to meet you!",
        replies: [
          { spanish: 'Igualmente, Barny.', english: 'Likewise, Barny.',     outcome: 'good', next: 'g4' },
          { spanish: 'Encantada.',         english: 'Pleased to meet you.', outcome: 'good', next: 'g4',
            explanation: "Tip: 'Encantada' (feminine) / 'Encantado' (masculine) — Spanish adjectives agree with the speaker's gender." },
          { spanish: 'No, gracias.',       english: 'No, thanks.',          outcome: 'bad',  next: 'g4',
            explanation: "'Mucho gusto' is a polite 'nice to meet you' — not an offer to refuse. Mirror it with 'Igualmente' or 'Encantado/a'." },
        ],
      },
      g4: {
        id: 'g4',
        barny: '¡Hasta luego!',
        barnyEnglish: 'See you later!',
        replies: [
          { spanish: '¡Hasta luego!',  english: 'See you later!', outcome: 'good', next: null },
          { spanish: '¡Adiós!',        english: 'Goodbye!',       outcome: 'good', next: null },
          { spanish: 'Buenos días.',   english: 'Good morning.',  outcome: 'okay', next: null,
            explanation: "'Buenos días' is a greeting, not a farewell. To say goodbye use 'Adiós', 'Hasta luego' or 'Hasta pronto'." },
        ],
      },
    },
  },
  {
    id: 'cafe',
    category: 'food-drink',
    title: 'At the Café',
    icon: '☕',
    description: 'Order a drink at a Spanish café. Barny is the waiter.',
    startId: 'c1',
    nodes: {
      c1: {
        id: 'c1',
        barny: '¡Buenas tardes! ¿Qué quieres tomar?',
        barnyEnglish: 'Good afternoon! What would you like to drink?',
        replies: [
          { spanish: 'Quiero un café, por favor.', english: 'I want a coffee, please.', outcome: 'good', next: 'c2' },
          { spanish: 'Un café.',                   english: 'A coffee.',                outcome: 'okay', next: 'c2',
            explanation: "Understood, but bare. Adding a verb and 'por favor' is more polite: 'Quiero un café, por favor.'" },
          { spanish: 'Me gusta el perro.',         english: 'I like the dog.',          outcome: 'bad',  next: 'c2',
            explanation: "'I like the dog' isn't an order. Use 'quiero' + drink: 'Quiero un café.'" },
        ],
      },
      c2: {
        id: 'c2',
        barny: '¿Algo más? ¿Algo para comer?',
        barnyEnglish: 'Anything else? Something to eat?',
        replies: [
          { spanish: 'Sí, quiero unas tapas.', english: 'Yes, I want some tapas.', outcome: 'good', next: 'c3' },
          { spanish: 'No, gracias.',           english: 'No, thanks.',             outcome: 'good', next: 'c4' },
          { spanish: 'Tengo sueño.',           english: "I'm sleepy.",             outcome: 'bad',  next: 'c4',
            explanation: "'I'm sleepy' doesn't answer 'anything to eat?'. Reply with 'sí, quiero…' or 'no, gracias.'" },
        ],
      },
      c3: {
        id: 'c3',
        barny: '¡Perfecto! ¿Te gustan las patatas fritas?',
        barnyEnglish: 'Perfect! Do you like chips?',
        replies: [
          { spanish: 'Sí, me gustan mucho.', english: 'Yes, I like them a lot.', outcome: 'good', next: 'c4' },
          { spanish: 'Sí, me gusta.',        english: 'Yes, I like it.',         outcome: 'bad',  next: 'c4',
            explanation: "Agreement: 'patatas' is plural, so gustar takes the plural form too — 'me gustan' (not 'me gusta'). Gustar agrees with the thing liked, not with you." },
          { spanish: 'No, no me gustan.',    english: "No, I don't like them.",  outcome: 'good', next: 'c4' },
        ],
      },
      c4: {
        id: 'c4',
        barny: 'Muy bien. ¿Cómo vas a pagar?',
        barnyEnglish: 'Very good. How will you pay?',
        replies: [
          { spanish: 'Con tarjeta, por favor.', english: 'With card, please.', outcome: 'good', next: 'c5' },
          { spanish: 'En efectivo.',            english: 'In cash.',           outcome: 'good', next: 'c5' },
          { spanish: 'Estoy bien.',             english: "I'm fine.",          outcome: 'bad',  next: 'c5',
            explanation: "'I'm fine' answers '¿cómo estás?', not '¿cómo pagas?'. Reply with the method: 'En efectivo' or 'Con tarjeta.'" },
        ],
      },
      c5: {
        id: 'c5',
        barny: '¡Gracias! ¡Que tengas un buen día!',
        barnyEnglish: 'Thanks! Have a good day!',
        replies: [
          { spanish: 'Gracias, igualmente.', english: 'Thanks, you too.',  outcome: 'good', next: null },
          { spanish: 'De nada.',             english: "You're welcome.",   outcome: 'okay', next: null,
            explanation: "'De nada' is the reply to 'gracias' — here Barny is *wishing* you a good day, so 'igualmente' (same to you) fits better." },
          { spanish: 'Hasta mañana.',        english: 'See you tomorrow.', outcome: 'good', next: null },
        ],
      },
    },
  },
  {
    id: 'hobbies',
    category: 'hobbies',
    title: 'Talking Hobbies',
    icon: '🎨',
    description: 'Barny asks what you like to do in your free time.',
    startId: 'h1',
    nodes: {
      h1: {
        id: 'h1',
        barny: '¿Qué te gusta hacer los fines de semana?',
        barnyEnglish: 'What do you like to do on weekends?',
        replies: [
          { spanish: 'Me gusta leer libros.', english: 'I like reading books.', outcome: 'good', next: 'h2' },
          { spanish: 'Me gusta bailar.',      english: 'I like dancing.',       outcome: 'good', next: 'h2' },
          { spanish: 'Me gustan cocinar.',    english: 'I like to cook.',       outcome: 'bad',  next: 'h2',
            explanation: "When the thing liked is a verb (an infinitive like 'cocinar'), gustar stays singular: 'Me gusta cocinar.' Use 'me gustan' only when followed by a plural noun." },
        ],
      },
      h2: {
        id: 'h2',
        barny: '¡Qué interesante! ¿Y te gusta la música?',
        barnyEnglish: 'How interesting! And do you like music?',
        replies: [
          { spanish: 'Sí, me encanta la música.', english: 'Yes, I love music.',     outcome: 'good', next: 'h3' },
          { spanish: 'Sí, me gusta escuchar.',    english: 'Yes, I like listening.', outcome: 'okay', next: 'h3',
            explanation: "Grammatical, but 'escuchar' (to listen) needs an object — listen to what? Try 'Me gusta escuchar música.'" },
          { spanish: 'No me gustan la música.',   english: "I don't like music.",    outcome: 'bad',  next: 'h3',
            explanation: "'La música' is singular, so use the singular gustar: 'No me gusta la música.'" },
        ],
      },
      h3: {
        id: 'h3',
        barny: '¿Practicas algún deporte?',
        barnyEnglish: 'Do you play any sport?',
        replies: [
          { spanish: 'Me gusta correr por la mañana.', english: 'I like running in the morning.', outcome: 'good', next: 'h4' },
          { spanish: 'Juego al fútbol los sábados.',   english: 'I play football on Saturdays.',  outcome: 'good', next: 'h4',
            explanation: "Tip: with sports, Spanish uses 'jugar a + el/la' — so 'jugar al fútbol', 'jugar al tenis'." },
          { spanish: 'No, prefiero descansar.',        english: 'No, I prefer to rest.',          outcome: 'good', next: 'h4' },
        ],
      },
      h4: {
        id: 'h4',
        barny: '¡Genial! Y a mí me gusta perseguir pelotas. 🎾',
        barnyEnglish: 'Cool! And I like chasing balls.',
        replies: [
          { spanish: '¡Qué divertido!',              english: 'How fun!',           outcome: 'good', next: null },
          { spanish: 'A mí también me gusta jugar.', english: 'I also like to play.', outcome: 'good', next: null,
            explanation: "Nice — 'A mí también' is the natural way to say 'me too' when reacting to a 'me gusta' sentence." },
          { spanish: 'Tengo frío.',                  english: "I'm cold.",          outcome: 'bad',  next: null,
            explanation: "Doesn't react to Barny's joke. React with '¡Qué divertido!' or share something you also like." },
        ],
      },
    },
  },
  {
    id: 'hobbies-extra',
    category: 'hobbies',
    title: 'Weekend Plans',
    icon: '🎬',
    description: 'Barny wants to know what you\'re up to this weekend.',
    startId: 'he1',
    nodes: {
      he1: {
        id: 'he1',
        barny: '¿Qué vas a hacer este fin de semana?',
        barnyEnglish: 'What are you going to do this weekend?',
        replies: [
          { spanish: 'Voy a ver una película.',  english: "I'm going to watch a film.",         outcome: 'good', next: 'he2',
            explanation: "Nice use of 'ir a + infinitive' for future plans — the standard way to say 'going to do X'." },
          { spanish: 'Voy a pasear con amigos.', english: "I'm going for a walk with friends.", outcome: 'good', next: 'he2' },
          { spanish: 'Soy hambre.',              english: 'I am hunger.',                       outcome: 'bad',  next: 'he2',
            explanation: "Two issues: hunger uses *tener*, not *ser* — and that's a different topic anyway. Hunger = 'Tengo hambre' (literally 'I have hunger'). For weekend plans use 'Voy a…'" },
        ],
      },
      he2: {
        id: 'he2',
        barny: '¡Suena bien! ¿Te gusta el cine?',
        barnyEnglish: 'Sounds good! Do you like the cinema?',
        replies: [
          { spanish: 'Sí, me encantan las películas.', english: 'Yes, I love films.',        outcome: 'good', next: 'he3' },
          { spanish: 'Prefiero leer en casa.',         english: 'I prefer reading at home.', outcome: 'good', next: 'he3' },
          { spanish: 'Me gusta los películas.',        english: 'I like films.',             outcome: 'bad',  next: 'he3',
            explanation: "Two fixes: 'película' is feminine (las películas, not los), and since it's plural the verb is 'me gustan'. Correct: 'Me gustan las películas.'" },
        ],
      },
      he3: {
        id: 'he3',
        barny: '¿Tocas algún instrumento?',
        barnyEnglish: 'Do you play an instrument?',
        replies: [
          { spanish: 'Toco la guitarra a veces.', english: 'I play the guitar sometimes.', outcome: 'good', next: 'he4',
            explanation: "For instruments Spanish uses 'tocar' (literally 'to touch'). For sports/games it's 'jugar'." },
          { spanish: 'No, pero me gusta cantar.', english: "No, but I like singing.",      outcome: 'good', next: 'he4' },
          { spanish: 'No, no toco nada.',         english: "No, I don't play anything.",   outcome: 'good', next: 'he4' },
        ],
      },
      he4: {
        id: 'he4',
        barny: '¡Qué guay! Yo solo toco la pelota con el hocico. 🎾',
        barnyEnglish: 'Cool! I only play with the ball with my nose.',
        replies: [
          { spanish: '¡Eres muy talentoso, Barny!', english: "You're very talented, Barny!", outcome: 'good', next: null },
          { spanish: '¡Qué divertido!',             english: 'How fun!',                     outcome: 'good', next: null },
          { spanish: 'Estoy cansada.',              english: "I'm tired.",                   outcome: 'okay', next: null,
            explanation: "Grammatically perfect ('cansada' agrees if you're female; 'cansado' if male). But it doesn't react to Barny's joke — try '¡Qué divertido!'" },
        ],
      },
    },
  },
  {
    id: 'restaurant',
    category: 'food-drink',
    title: 'At the Restaurant',
    icon: '🍽️',
    description: 'Order dinner — Barny is your waiter again.',
    startId: 'r1',
    nodes: {
      r1: {
        id: 'r1',
        barny: '¡Buenas noches! ¿Una mesa para cuántas personas?',
        barnyEnglish: 'Good evening! A table for how many people?',
        replies: [
          { spanish: 'Una mesa para dos, por favor.', english: 'A table for two, please.', outcome: 'good', next: 'r2' },
          { spanish: 'Para mí, sola.',                english: 'For me, alone.',           outcome: 'good', next: 'r2',
            explanation: "Nice — 'sola' agrees with a female speaker; a male speaker would say 'solo'." },
          { spanish: 'Quiero un perro.',              english: 'I want a dog.',            outcome: 'bad',  next: 'r2',
            explanation: "'I want a dog' doesn't answer 'a table for how many?'. Reply with a number: 'Para dos, por favor.'" },
        ],
      },
      r2: {
        id: 'r2',
        barny: 'Muy bien. Aquí tiene la carta. ¿Quiere empezar con algo?',
        barnyEnglish: 'Very good. Here is the menu. Would you like to start with something?',
        replies: [
          { spanish: 'Sí, una sopa, por favor.', english: 'Yes, a soup, please.', outcome: 'good', next: 'r3' },
          { spanish: 'Quiero una ensalada.',     english: 'I want a salad.',      outcome: 'good', next: 'r3' },
          { spanish: 'No tengo hambre.',         english: "I'm not hungry.",      outcome: 'okay', next: 'r3',
            explanation: "Grammatically perfect, but odd at a restaurant — the waiter is offering a starter. 'No, gracias, esperamos al plato principal' would be more natural." },
        ],
      },
      r3: {
        id: 'r3',
        barny: '¿Y de plato principal?',
        barnyEnglish: 'And for the main course?',
        replies: [
          { spanish: 'La paella, por favor.',          english: 'The paella, please.',           outcome: 'good', next: 'r4' },
          { spanish: 'El pescado del día.',            english: "The fish of the day.",          outcome: 'good', next: 'r4' },
          { spanish: 'Pollo con patatas, por favor.',  english: 'Chicken with potatoes, please.', outcome: 'good', next: 'r4' },
        ],
      },
      r4: {
        id: 'r4',
        barny: '¿Y para beber?',
        barnyEnglish: 'And to drink?',
        replies: [
          { spanish: 'Una copa de vino tinto.',  english: 'A glass of red wine.',   outcome: 'good', next: 'r5' },
          { spanish: 'Agua con gas, por favor.', english: 'Sparkling water, please.', outcome: 'good', next: 'r5' },
          { spanish: 'Me gusta el chocolate.',   english: 'I like chocolate.',      outcome: 'bad',  next: 'r5',
            explanation: "Stating a preference isn't an order. To answer '¿Para beber?' name a drink: 'Una copa de vino' or 'Agua, por favor.'" },
        ],
      },
      r5: {
        id: 'r5',
        barny: '¿Y de postre? Tenemos flan, helado y tarta de queso.',
        barnyEnglish: 'And for dessert? We have flan, ice cream and cheesecake.',
        replies: [
          { spanish: 'Quiero el flan, por favor.',     english: 'I want the flan, please.',      outcome: 'good', next: 'r6' },
          { spanish: 'Un helado de chocolate.',        english: 'A chocolate ice cream.',         outcome: 'good', next: 'r6' },
          { spanish: 'No, gracias, estoy llena.',      english: "No, thanks, I'm full.",         outcome: 'good', next: 'r6' },
        ],
      },
      r6: {
        id: 'r6',
        barny: '¡Perfecto! La cuenta, ¿cuándo la quiere?',
        barnyEnglish: 'Perfect! When would you like the bill?',
        replies: [
          { spanish: 'Ahora mismo, por favor.', english: 'Right now, please.', outcome: 'good', next: null },
          { spanish: 'Después del postre.',     english: 'After dessert.',     outcome: 'good', next: null,
            explanation: "Nice use of 'después de + el → del'. Spanish always contracts 'de + el' to 'del'." },
          { spanish: 'Tengo sueño.',            english: "I'm sleepy.",        outcome: 'bad',  next: null,
            explanation: "Tells the waiter you're sleepy — doesn't say when you want the bill. Reply with a time: 'ahora' or 'después.'" },
        ],
      },
    },
  },
  {
    id: 'market',
    category: 'food-drink',
    title: 'At the Market',
    icon: '🥕',
    description: 'Buy fresh food at the Spanish market.',
    startId: 'm1',
    nodes: {
      m1: {
        id: 'm1',
        barny: '¡Buenos días! ¿Qué le pongo?',
        barnyEnglish: 'Good morning! What can I get you?',
        replies: [
          { spanish: 'Un kilo de tomates, por favor.', english: 'A kilo of tomatoes, please.', outcome: 'good', next: 'm2' },
          { spanish: 'Medio kilo de manzanas.',        english: 'Half a kilo of apples.',      outcome: 'good', next: 'm2' },
          { spanish: 'Estoy bien, gracias.',           english: "I'm fine, thanks.",           outcome: 'bad',  next: 'm2',
            explanation: "'¿Qué le pongo?' literally means 'what shall I put for you?' — i.e. 'what would you like?'. It's not a how-are-you. Answer with what you want to buy." },
        ],
      },
      m2: {
        id: 'm2',
        barny: '¿Algo más? Tenemos pan fresco hoy.',
        barnyEnglish: 'Anything else? We have fresh bread today.',
        replies: [
          { spanish: 'Sí, una barra de pan.',     english: 'Yes, a loaf of bread.', outcome: 'good', next: 'm3' },
          { spanish: 'No, gracias, eso es todo.', english: "No, thanks, that's all.", outcome: 'good', next: 'm4' },
          { spanish: 'Quiero dos perros.',        english: 'I want two dogs.',      outcome: 'bad',  next: 'm3',
            explanation: "Markets don't sell dogs! Stick to food. To say 'no more' use 'eso es todo' (that's all)." },
        ],
      },
      m3: {
        id: 'm3',
        barny: '¿Quiere también queso o jamón?',
        barnyEnglish: 'Would you like cheese or ham as well?',
        replies: [
          { spanish: 'Un poco de queso manchego.',     english: 'A little manchego cheese.',     outcome: 'good', next: 'm4' },
          { spanish: 'Cien gramos de jamón.',          english: 'A hundred grams of ham.',        outcome: 'good', next: 'm4' },
          { spanish: 'No, gracias.',                   english: 'No, thanks.',                    outcome: 'good', next: 'm4' },
        ],
      },
      m4: {
        id: 'm4',
        barny: 'Son ocho euros con cincuenta. ¿Cómo paga?',
        barnyEnglish: "That's eight euros fifty. How are you paying?",
        replies: [
          { spanish: 'En efectivo, aquí tiene.', english: 'In cash, here you go.', outcome: 'good', next: 'm5' },
          { spanish: 'Con tarjeta, por favor.',  english: 'With card, please.',    outcome: 'good', next: 'm5' },
          { spanish: 'No tengo dinero.',         english: "I don't have money.",   outcome: 'okay', next: 'm5',
            explanation: "Awkward after ordering — you've already asked for things! Reply with a payment method: 'efectivo' or 'tarjeta'." },
        ],
      },
      m5: {
        id: 'm5',
        barny: '¡Gracias! ¡Hasta la próxima!',
        barnyEnglish: 'Thanks! See you next time!',
        replies: [
          { spanish: '¡Hasta luego!',  english: 'See you later!', outcome: 'good', next: null },
          { spanish: 'Muchas gracias.', english: 'Thanks a lot.',  outcome: 'good', next: null },
          { spanish: 'De nada.',        english: "You're welcome.", outcome: 'okay', next: null,
            explanation: "'De nada' replies to 'gracias' — here Barny is *thanking* you, so reply with 'a ti / gracias a ti' or a farewell." },
        ],
      },
    },
  },
  {
    id: 'tapas',
    category: 'food-drink',
    title: 'Tapas Bar',
    icon: '🍤',
    description: 'Share tapas with Barny at a bustling bar.',
    startId: 't1',
    nodes: {
      t1: {
        id: 't1',
        barny: '¡Hola! ¿Qué tapas te apetecen?',
        barnyEnglish: 'Hi! Which tapas do you fancy?',
        replies: [
          { spanish: 'Me apetecen las patatas bravas.', english: 'I fancy patatas bravas.',  outcome: 'good', next: 't2',
            explanation: "Like 'gustar', 'apetecer' agrees with the thing — 'patatas' is plural, so 'me apetecen'." },
          { spanish: 'Quiero croquetas, por favor.',    english: 'I want croquettes, please.', outcome: 'good', next: 't2' },
          { spanish: 'Tengo frío.',                     english: "I'm cold.",                 outcome: 'bad',  next: 't2',
            explanation: "Doesn't order anything. To order tapas: 'Quiero [tapa], por favor' or 'Me apetecen [tapas]'." },
        ],
      },
      t2: {
        id: 't2',
        barny: '¿Y para beber? Tenemos sangría, cerveza y vino.',
        barnyEnglish: 'And to drink? We have sangria, beer and wine.',
        replies: [
          { spanish: 'Una jarra de sangría, por favor.', english: 'A jug of sangria, please.',   outcome: 'good', next: 't3' },
          { spanish: 'Una caña, gracias.',               english: 'A small beer, thanks.',        outcome: 'good', next: 't3' },
          { spanish: 'Un vaso de agua.',                 english: 'A glass of water.',            outcome: 'good', next: 't3' },
        ],
      },
      t3: {
        id: 't3',
        barny: '¿Te gusta el picante?',
        barnyEnglish: 'Do you like spicy food?',
        replies: [
          { spanish: 'Sí, me encanta el picante.',       english: 'Yes, I love spicy food.',     outcome: 'good', next: 't4' },
          { spanish: 'Un poco, no mucho.',               english: 'A little, not much.',          outcome: 'good', next: 't4' },
          { spanish: 'No, no me gusta nada.',            english: "No, I don't like it at all.",  outcome: 'good', next: 't4' },
        ],
      },
      t4: {
        id: 't4',
        barny: '¿Compartimos una tortilla española también?',
        barnyEnglish: 'Shall we share a Spanish omelette too?',
        replies: [
          { spanish: '¡Claro que sí, vamos!',            english: 'Of course, let\'s go!',        outcome: 'good', next: 't5' },
          { spanish: 'Vale, buena idea.',                english: 'Okay, good idea.',              outcome: 'good', next: 't5' },
          { spanish: 'No, gracias, ya estoy lleno.',     english: "No thanks, I'm already full.", outcome: 'good', next: 't5' },
        ],
      },
      t5: {
        id: 't5',
        barny: '¡Qué rico todo! ¡Salud!',
        barnyEnglish: 'How delicious! Cheers!',
        replies: [
          { spanish: '¡Salud!',         english: 'Cheers!',          outcome: 'good', next: null },
          { spanish: '¡Buen provecho!', english: 'Enjoy your meal!', outcome: 'good', next: null },
          { spanish: 'Adiós.',          english: 'Goodbye.',         outcome: 'okay', next: null,
            explanation: "Works as a farewell, but Barny just said '¡Salud!' (a toast) — match it with '¡Salud!' for the moment." },
        ],
      },
    },
  },
  {
    id: 'coffee-shop',
    category: 'food-drink',
    title: 'Coffee Shop',
    icon: '🥐',
    description: 'Grab breakfast at a Spanish cafetería.',
    startId: 'cs1',
    nodes: {
      cs1: {
        id: 'cs1',
        barny: '¡Buenos días! ¿Qué desayuna hoy?',
        barnyEnglish: 'Good morning! What are you having for breakfast?',
        replies: [
          { spanish: 'Un café con leche y una tostada.', english: 'A coffee with milk and toast.', outcome: 'good', next: 'cs2' },
          { spanish: 'Un cruasán, por favor.',           english: 'A croissant, please.',          outcome: 'good', next: 'cs2' },
          { spanish: 'Quiero dormir.',                   english: 'I want to sleep.',              outcome: 'okay', next: 'cs2',
            explanation: "True but doesn't order breakfast. Try 'Quiero un café' to wake up first!" },
        ],
      },
      cs2: {
        id: 'cs2',
        barny: '¿Cómo quiere el café? ¿Solo, cortado o con leche?',
        barnyEnglish: 'How would you like the coffee? Black, with a splash, or with milk?',
        replies: [
          { spanish: 'Con leche, por favor.',            english: 'With milk, please.',            outcome: 'good', next: 'cs3' },
          { spanish: 'Solo, sin azúcar.',                english: 'Black, no sugar.',              outcome: 'good', next: 'cs3' },
          { spanish: 'Un cortado, gracias.',             english: 'A cortado, thanks.',            outcome: 'good', next: 'cs3' },
        ],
      },
      cs3: {
        id: 'cs3',
        barny: '¿Quiere también un zumo de naranja?',
        barnyEnglish: 'Would you also like an orange juice?',
        replies: [
          { spanish: 'Sí, un zumo natural, por favor.', english: 'Yes, a fresh juice, please.', outcome: 'good', next: 'cs4',
            explanation: "'Natural' here means freshly squeezed — the way Spanish cafés label it." },
          { spanish: 'No, gracias, así está bien.',     english: "No thanks, that's fine.",     outcome: 'good', next: 'cs4' },
          { spanish: 'Me gustan las naranjas.',         english: 'I like oranges.',             outcome: 'okay', next: 'cs4',
            explanation: "Doesn't answer yes or no — Barny still doesn't know whether to bring the juice. Reply with 'sí' or 'no, gracias.'" },
        ],
      },
      cs4: {
        id: 'cs4',
        barny: '¿Para tomar aquí o para llevar?',
        barnyEnglish: 'To have here or to take away?',
        replies: [
          { spanish: 'Para tomar aquí, gracias.', english: 'To have here, thanks.', outcome: 'good', next: 'cs5' },
          { spanish: 'Para llevar, por favor.',   english: 'To take away, please.', outcome: 'good', next: 'cs5' },
          { spanish: 'Tengo prisa.',              english: "I'm in a hurry.",       outcome: 'okay', next: 'cs5',
            explanation: "Implies take-away but doesn't say it. Be direct: 'Para llevar, por favor.'" },
        ],
      },
      cs5: {
        id: 'cs5',
        barny: '¡Que aproveche! ¡Hasta mañana!',
        barnyEnglish: 'Enjoy! See you tomorrow!',
        replies: [
          { spanish: 'Gracias, hasta mañana.', english: 'Thanks, see you tomorrow.', outcome: 'good', next: null },
          { spanish: '¡Igualmente!',           english: 'Same to you!',              outcome: 'good', next: null,
            explanation: "'Igualmente' is the go-to reply to '¡que aproveche!' or '¡buen día!' — 'same to you'." },
          { spanish: 'De nada.',               english: "You're welcome.",           outcome: 'okay', next: null,
            explanation: "'De nada' replies to 'gracias' — here Barny is wishing you well, so 'igualmente' fits better." },
        ],
      },
    },
  },
  {
    id: 'flat-viewing',
    category: 'real-life',
    title: 'Looking at a Flat',
    icon: '🏠',
    description: 'Visit a piso in Valencia. Barny is the landlord.',
    startId: 'f1',
    nodes: {
      f1: {
        id: 'f1',
        barny: '¡Hola! ¿Vienes a ver el piso?',
        barnyEnglish: 'Hi! Are you here to see the flat?',
        replies: [
          { spanish: 'Sí, tengo una cita a las cinco.', english: 'Yes, I have an appointment at five.', outcome: 'good', next: 'f2' },
          { spanish: 'Sí, soy yo.',                    english: "Yes, it's me.",                       outcome: 'good', next: 'f2' },
          { spanish: 'Tengo un perro.',                english: 'I have a dog.',                       outcome: 'bad',  next: 'f2',
            explanation: "Doesn't answer the question. To confirm you're here for the viewing: 'Sí, vengo a ver el piso.'" },
        ],
      },
      f2: {
        id: 'f2',
        barny: '¡Perfecto! Pasa. El piso tiene dos habitaciones. ¿Qué te parece?',
        barnyEnglish: 'Perfect! Come in. The flat has two bedrooms. What do you think?',
        replies: [
          { spanish: 'Me gusta mucho, es muy luminoso.', english: 'I like it a lot, it’s very bright.', outcome: 'good', next: 'f3',
            explanation: "'Luminoso' (bright) is a great word for flat hunting in Spain — landlords always mention it." },
          { spanish: 'Es bonito, pero un poco pequeño.', english: 'It’s nice, but a bit small.',        outcome: 'good', next: 'f3' },
          { spanish: 'Tengo hambre.',                    english: "I'm hungry.",                        outcome: 'bad',  next: 'f3',
            explanation: "Not a reaction to the flat. Say what you think: 'Me gusta' or 'Es pequeño.'" },
        ],
      },
      f3: {
        id: 'f3',
        barny: '¿Tienes alguna pregunta?',
        barnyEnglish: 'Do you have any questions?',
        replies: [
          { spanish: '¿Cuánto cuesta el alquiler?',    english: 'How much is the rent?',              outcome: 'good', next: 'f4',
            explanation: "'Alquiler' is the rent. The verb is 'alquilar' (to rent)." },
          { spanish: '¿Están incluidos los gastos?',   english: 'Are the bills included?',            outcome: 'good', next: 'f4',
            explanation: "'Gastos' = bills/utilities. Always ask — sometimes water/community fees are extra." },
          { spanish: 'Me llamo Emily.',                english: 'My name is Emily.',                  outcome: 'bad',  next: 'f4',
            explanation: "Not a question about the flat. Ask about price, bills, or the contract." },
        ],
      },
      f4: {
        id: 'f4',
        barny: 'Son ochocientos euros al mes, gastos no incluidos.',
        barnyEnglish: 'It’s eight hundred euros a month, bills not included.',
        replies: [
          { spanish: 'Vale. ¿Cuánto es la fianza?',   english: 'Okay. How much is the deposit?',     outcome: 'good', next: 'f5',
            explanation: "'Fianza' = deposit. Usually one or two months' rent in Spain." },
          { spanish: 'Me lo pienso y te digo.',       english: "I'll think about it and let you know.", outcome: 'good', next: 'f5',
            explanation: "'Me lo pienso' is a natural way to say 'let me think it over' without committing." },
          { spanish: 'Es muy barato.',                english: "It's very cheap.",                   outcome: 'okay', next: 'f5',
            explanation: "Probably not true for Valencia in 2026! Ask a follow-up question or say you'll think about it." },
        ],
      },
      f5: {
        id: 'f5',
        barny: '¡Perfecto! Avísame pronto, por favor.',
        barnyEnglish: 'Perfect! Let me know soon, please.',
        replies: [
          { spanish: 'Claro, te llamo mañana.',       english: 'Sure, I’ll call you tomorrow.',      outcome: 'good', next: null },
          { spanish: 'Gracias por enseñarme el piso.', english: 'Thanks for showing me the flat.',   outcome: 'good', next: null,
            explanation: "'Enseñar' means both 'to teach' and 'to show' — context tells you which." },
          { spanish: 'Hasta luego.',                   english: 'See you later.',                    outcome: 'okay', next: null,
            explanation: "Polite but a bit cold — landlords appreciate 'gracias por enseñarme el piso' before the farewell." },
        ],
      },
    },
  },
  {
    id: 'tie-card',
    category: 'real-life',
    title: 'TIE Card Appointment',
    icon: '🪪',
    description: 'Pick up your TIE card at the police station.',
    startId: 'ti1',
    nodes: {
      ti1: {
        id: 'ti1',
        barny: 'Buenos días. ¿Para qué viene?',
        barnyEnglish: 'Good morning. What are you here for?',
        replies: [
          { spanish: 'Vengo a recoger mi TIE.',       english: 'I’m here to collect my TIE.',       outcome: 'good', next: 'ti2',
            explanation: "'Recoger' = to collect/pick up. The standard verb for picking up your card." },
          { spanish: 'Tengo cita a las diez.',        english: 'I have an appointment at ten.',     outcome: 'good', next: 'ti2' },
          { spanish: 'Quiero un café.',               english: 'I want a coffee.',                  outcome: 'bad',  next: 'ti2',
            explanation: "This is a police station, not a café! State your reason: 'Vengo a recoger mi TIE.'" },
        ],
      },
      ti2: {
        id: 'ti2',
        barny: '¿Me enseña su pasaporte, por favor?',
        barnyEnglish: 'Can you show me your passport, please?',
        replies: [
          { spanish: 'Sí, aquí tiene.',               english: 'Yes, here you go.',                 outcome: 'good', next: 'ti3',
            explanation: "'Aquí tiene' is the polite way to hand something over — like 'here you are'." },
          { spanish: 'Un momento, por favor.',        english: 'One moment, please.',               outcome: 'good', next: 'ti3' },
          { spanish: 'No lo sé.',                     english: "I don't know.",                     outcome: 'bad',  next: 'ti3',
            explanation: "You're being asked for your passport — answer by handing it over: 'Aquí tiene.'" },
        ],
      },
      ti3: {
        id: 'ti3',
        barny: 'Gracias. ¿Trae el justificante de la tasa?',
        barnyEnglish: 'Thanks. Did you bring the fee receipt?',
        replies: [
          { spanish: 'Sí, lo tengo aquí.',            english: 'Yes, I have it here.',              outcome: 'good', next: 'ti4',
            explanation: "'Justificante' = official receipt/proof. You always need one for trámites in Spain." },
          { spanish: 'Lo pagué ayer, aquí está.',     english: 'I paid it yesterday, here it is.',  outcome: 'good', next: 'ti4' },
          { spanish: 'No, no traigo nada.',           english: "No, I didn't bring anything.",       outcome: 'bad',  next: 'ti4',
            explanation: "Without the justificante they won't give you the card. In real life, double-check the requirements beforehand." },
        ],
      },
      ti4: {
        id: 'ti4',
        barny: 'Perfecto. Firme aquí, por favor.',
        barnyEnglish: 'Perfect. Sign here, please.',
        replies: [
          { spanish: 'Vale, ahora mismo.',            english: 'Okay, right now.',                  outcome: 'good', next: 'ti5' },
          { spanish: '¿Dónde firmo exactamente?',     english: 'Where exactly do I sign?',          outcome: 'good', next: 'ti5',
            explanation: "Good — asking 'dónde' (where) is more useful than just saying 'sí' if you're unsure." },
          { spanish: 'No entiendo.',                  english: "I don't understand.",               outcome: 'okay', next: 'ti5',
            explanation: "Honest but vague — better to ask the specific question: '¿Puede repetir, por favor?'" },
        ],
      },
      ti5: {
        id: 'ti5',
        barny: 'Ya está. Aquí tiene su TIE. ¡Bienvenida a España!',
        barnyEnglish: 'All done. Here’s your TIE. Welcome to Spain!',
        replies: [
          { spanish: '¡Muchas gracias!',              english: 'Thanks a lot!',                     outcome: 'good', next: null },
          { spanish: 'Gracias, muy amable.',          english: 'Thanks, very kind.',                outcome: 'good', next: null,
            explanation: "'Muy amable' is a lovely Spanish phrase for thanking someone for being helpful." },
          { spanish: 'Adiós.',                        english: 'Goodbye.',                          outcome: 'okay', next: null,
            explanation: "Works, but add 'gracias' — Spanish is warmer than English with closing pleasantries." },
        ],
      },
    },
  },
  {
    id: 'bank-account',
    category: 'real-life',
    title: 'Opening a Bank Account',
    icon: '🏦',
    description: 'Open a Spanish bank account. Barny is the cashier.',
    startId: 'b1',
    nodes: {
      b1: {
        id: 'b1',
        barny: '¡Hola! ¿En qué puedo ayudarle?',
        barnyEnglish: 'Hi! How can I help you?',
        replies: [
          { spanish: 'Quiero abrir una cuenta, por favor.', english: 'I want to open an account, please.', outcome: 'good', next: 'b2',
            explanation: "'Abrir una cuenta' = to open an account. The exact phrase you'll need." },
          { spanish: 'Necesito una cuenta bancaria.',       english: 'I need a bank account.',            outcome: 'good', next: 'b2' },
          { spanish: 'Tengo frío.',                         english: "I'm cold.",                         outcome: 'bad',  next: 'b2',
            explanation: "Tell the cashier what you need: 'Quiero abrir una cuenta.'" },
        ],
      },
      b2: {
        id: 'b2',
        barny: 'Muy bien. ¿Es residente en España?',
        barnyEnglish: 'Very good. Are you a resident in Spain?',
        replies: [
          { spanish: 'Sí, tengo mi TIE.',                   english: 'Yes, I have my TIE.',               outcome: 'good', next: 'b3',
            explanation: "Resident accounts are easier and cheaper — always say yes if you have a TIE/NIE." },
          { spanish: 'Todavía no, pero tengo NIE.',         english: 'Not yet, but I have an NIE.',       outcome: 'good', next: 'b3',
            explanation: "'Todavía no' = not yet. Useful in lots of admin situations." },
          { spanish: 'No sé.',                              english: "I don't know.",                     outcome: 'okay', next: 'b3',
            explanation: "Avoid 'no sé' for facts about yourself — say what documents you have instead." },
        ],
      },
      b3: {
        id: 'b3',
        barny: '¿Trae su pasaporte y un comprobante de domicilio?',
        barnyEnglish: 'Did you bring your passport and proof of address?',
        replies: [
          { spanish: 'Sí, aquí está todo.',                 english: 'Yes, here is everything.',          outcome: 'good', next: 'b4' },
          { spanish: 'Tengo el pasaporte, pero no el otro.', english: 'I have the passport, but not the other one.', outcome: 'good', next: 'b4',
            explanation: "Honest answer. They'll usually tell you what else you need to bring back." },
          { spanish: 'Sí, me gusta el banco.',              english: 'Yes, I like the bank.',             outcome: 'bad',  next: 'b4',
            explanation: "Answer the document question, not whether you like the bank!" },
        ],
      },
      b4: {
        id: 'b4',
        barny: 'Perfecto. ¿Quiere una tarjeta de débito también?',
        barnyEnglish: 'Perfect. Would you like a debit card too?',
        replies: [
          { spanish: 'Sí, por favor.',                      english: 'Yes, please.',                      outcome: 'good', next: 'b5' },
          { spanish: '¿La tarjeta tiene comisiones?',       english: 'Does the card have fees?',          outcome: 'good', next: 'b5',
            explanation: "'Comisiones' = bank fees. Always worth asking — Spanish banks love them." },
          { spanish: 'No me gusta el queso.',               english: "I don't like cheese.",              outcome: 'bad',  next: 'b5',
            explanation: "Off-topic. Answer yes/no or ask about fees: '¿Tiene comisiones?'" },
        ],
      },
      b5: {
        id: 'b5',
        barny: 'Vale, su cuenta está abierta. Recibirá la tarjeta en casa en una semana.',
        barnyEnglish: 'Okay, your account is open. You’ll get the card at home in a week.',
        replies: [
          { spanish: 'Muchas gracias por su ayuda.',        english: 'Thanks a lot for your help.',       outcome: 'good', next: null },
          { spanish: 'Perfecto, hasta luego.',              english: 'Perfect, see you later.',           outcome: 'good', next: null },
          { spanish: 'De nada.',                            english: "You're welcome.",                   outcome: 'okay', next: null,
            explanation: "'De nada' is a reply to 'gracias' — here you're the one being helped, so thank them." },
        ],
      },
    },
  },
]

export function findConversation(id: string): Conversation | undefined {
  return CONVERSATIONS.find((c) => c.id === id)
}
