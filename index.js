require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const Groq = require('groq-sdk');

// --- КОНФИГУРАЦИЯ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const KNOWLEDGE_FILE = 'system.txt';
// Модель, указанная пользователем
const MODEL_NAME = 'openai/gpt-oss-120b';

if (!BOT_TOKEN || !GROQ_API_KEY) {
    console.error("❌ Ошибка: BOT_TOKEN или GROQ_API_KEY не указаны в файле .env");
    process.exit(1);
}

// Инициализация клиентов
const bot = new Telegraf(BOT_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

// Пайдаланушы мәліметтерін сақтау (Жадта)
const userLanguages = new Map();
const userContexts = new Map();

// --- БІЛІМ БАЗАСЫН ОҚУ ---
let knowledgeBase = "";
try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
        knowledgeBase = fs.readFileSync(KNOWLEDGE_FILE, 'utf-8');
        console.log(`✅ '${KNOWLEDGE_FILE}' файлы сәтті оқылды.`);
    } else {
        console.error(`❌ '${KNOWLEDGE_FILE}' файлы табылмады!`);
    }
} catch (error) {
    console.error(`❌ Файлды оқу қатесі: ${error}`);
}

// --- ТІЛДІК ПАКЕТТЕР ---
const LANG_DATA = {
    kk: {
        start: "Сәлеметсіз бе! 👋 Мен — Атырау университетінің AI-ассистентімін.\nТөмендегі мәзірден таңдаңыз:",
        help: "Маған кез келген сұрақ қойыңыз, мысалы:\n- Грантқа түсу үшін не істеу керек?\n- Platonus жүйесіне қалай кірем?",
        thinking: "Ойланудамын... 🧠",
        error: "Кешіріңіз, жүйеде қате пайда болды. Кейінірек қайталап көріңіз 🙏",
        no_info: "Кешіріңіз, бұл сұрақ бойынша менде нақты ақпарат жоқ.",
        reset: "🔄 Диалог тазаланды.",
        lang_selected: "✅ Тіл: Қазақша",
        menu: {
            programs: '📚 Қандай білім беру бағыттары бар?',
            dates: '📅 Қабылдау мерзімі',
            price: '💰 Оқу ақысы',
            contact: '📞 Байланыс',
            clear: '🔄 Сөйлесуді тазалау',
            lang: '🌐 Тілді өзгерту'
        }
    },
    ru: {
        start: "Здравствуйте! 👋 Я — AI-ассистент Атырауского университета.\nВыберите пункт меню ниже:",
        help: "Задайте вопрос, например:\n- Как поступить на грант?\n- Как войти в систему Platonus?",
        thinking: "Думаю... 🧠",
        error: "Извините, произошла системная ошибка. Попробуйте позже 🙏",
        no_info: "Извините, информации по этому вопросу нет.",
        reset: "🔄 Диалог очищен.",
        lang_selected: "✅ Язык: Русский",
        menu: {
            programs: '📚 Образовательные программы',
            dates: '📅 Сроки приёма',
            price: '💰 Стоимость обучения',
            contact: '📞 Контакты',
            clear: '🔄 Очистить диалог',
            lang: '🌐 Сменить язык'
        }
    },
    en: {
        start: "Hello! 👋 I'm AI Assistant of Atyrau University.\nChoose a menu option below:",
        help: "Ask me anything, e.g.:\n- How to apply for a grant?\n- How to access Platonus?",
        thinking: "Thinking... 🧠",
        error: "Sorry, a system error occurred. Please try again later 🙏",
        no_info: "Sorry, I don’t have information on that.",
        reset: "🔄 Reset Dialog.",
        lang_selected: "✅ Language: English",
        menu: {
            programs: '📚 Study Programs',
            dates: '📅 Admission Dates',
            price: '💰 Tuition Fee',
            contact: '📞 Contacts',
            clear: '🔄 Reset Dialog',
            lang: '🌐 Change Language'
        }
    }
};

// --- КӨМЕКШІ ФУНКЦИЯЛАР ---

function getMainKeyboard(lang) {
    const m = LANG_DATA[lang].menu;
    return Markup.keyboard([
        [m.programs],
        [m.dates, m.price],
        [m.contact, m.clear],
        [m.lang]
    ]).resize();
}

function getInlineLangKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback("🇰🇿 Қазақша", "lang_kk")],
        [Markup.button.callback("🇷🇺 Русский", "lang_ru")],
        [Markup.button.callback("🇬🇧 English", "lang_en")]
    ]);
}

async function getGroqAnswer(question, lang) {
    const systemPrompt = `
Сен — Халел Досмұхамедов атындағы Атырау университетінің студенттеріне көмектесетін AI-ассистентсің.
Сен тек төменде берілген білім базасы негізінде жауап бер.
Өзіңнен ештеңе қоспа. Егер жауап базада жоқ болса, "${LANG_DATA[lang].no_info}" деп жауап бер.
Пайдаланушының тілінде (${lang}) жауап бер.

--- БІЛІМ БАЗАСЫ ---
${knowledgeBase}
--- БІЛІМ БАЗАСЫ СОҢЫ ---
`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question }
            ],
            model: MODEL_NAME,
            temperature: 0.3,
            max_tokens: 2048,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Groq API Error:", error);
        return LANG_DATA[lang].error;
    }
}

// --- ХЕНДЛЕРЛЕР ---

bot.start((ctx) => {
    const lang = userLanguages.get(ctx.from.id) || 'kk';
    ctx.reply(LANG_DATA[lang].start, getMainKeyboard(lang));
});

bot.command('language', (ctx) => {
    ctx.reply("Тілді таңдаңыз / Выберите язык / Choose language:", getInlineLangKeyboard());
});

bot.action(/lang_(kk|ru|en)/, async (ctx) => {
    const langCode = ctx.match[1];
    userLanguages.set(ctx.from.id, langCode);
    
    await ctx.editMessageText(LANG_DATA[langCode].lang_selected);
    await ctx.reply(LANG_DATA[langCode].start, getMainKeyboard(langCode));
    await ctx.answerCbQuery();
});

// Мәзір командалары
bot.hears(['🌐 Тілді өзгерту', '🌐 Сменить язык', '🌐 Change Language'], (ctx) => {
    ctx.reply("Тілді таңдаңыз / Выберите язык / Choose language:", getInlineLangKeyboard());
});

bot.hears(['🔄 Сөйлесуді тазалау', '🔄 Очистить диалог', '🔄 Reset Dialog'], (ctx) => {
    const lang = userLanguages.get(ctx.from.id) || 'kk';
    userContexts.delete(ctx.from.id);
    ctx.reply(LANG_DATA[lang].reset);
});

// Мәзірдің статикалық жауаптары
bot.hears(['📚 Қандай білім беру бағыттары бар?', '📚 Образовательные программы', '📚 Study Programs'], (ctx) => {
    ctx.reply("Педагогикалық ғылымдар; Өнер және гуманитарлық ғылымдар; Әлеуметтік ғылымдар, журналистика және ақпараттандыру; Бизнес, басқару және құқық; Жаратылыстану ғылымдар, математика және статистика; Ақпараттық - комуникациялық технологиялар; Инженерлік, өңдеу және құрылыс салалары; Ауылшаруашылық және биоресустары; Қызмет көрсету");
});

bot.hears(['📅 Қабылдау мерзімі', '📅 Сроки приёма', '📅 Admission Dates'], (ctx) => {
    ctx.reply("Құжаттарды қабылдау ағымдағы жылдың 20 маусым - 25 тамыз аралығында жүзеге асырылады.");
});

bot.hears(['💰 Оқу ақысы', '💰 Стоимость обучения', '💰 Tuition Fee'], (ctx) => {
    ctx.reply("Оқу ақысы таңдалған бағдарламаға байланысты. Нақты ақпаратты университет сайты https://atyrau.edu.kz/ru білуге болады.");
});

bot.hears(['📞 Байланыс', '📞 Контакты', '📞 Contacts'], (ctx) => {
    ctx.reply("Қабылдау комиссиясы:\n📍 Атырау қ., Студенттер даңғылы, 1\n📞 +7 (7122) 27-63-23\n✉️ kense@asu.edu.kz");
});

// AI арқылы еркін мәтінді өңдеу
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const lang = userLanguages.get(userId) || 'kk';

    // Егер хабарлама мәзір батырмаларына ұқсаса, оны елемеу
    if (text.startsWith('📚') || text.startsWith('📅') || text.startsWith('💰') || text.startsWith('📞') || text.startsWith('🔄') || text.startsWith('🌐')) {
        return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] ${ctx.from.username || 'user'}: ${text}`);

    // "Ойлану" хабарламасын жіберу
    const waitMsg = await ctx.reply(LANG_DATA[lang].thinking);
    await ctx.sendChatAction('typing');

    try {
        // Groq-тан жауап алу
        const answer = await getGroqAnswer(text, lang);
        
        // Уақытша хабарламаны жауаппен алмастыру
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            waitMsg.message_id, 
            null, 
            answer, 
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error(error);
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            waitMsg.message_id, 
            null, 
            LANG_DATA[lang].error
        );
    }
});

// Боты іске қосу
bot.launch().then(() => {
    console.log("🤖 Атырау университетінің AI боты іске қосылды (Groq API, Node.js)...");
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
