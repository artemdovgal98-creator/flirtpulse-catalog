/**
 * FlirtPulse — catalog seed dataset.
 *
 * Row format (kept compact on purpose so the catalog stays easy to extend):
 *   [ name, categories, _internal, _internal, geos, tags, qualityScore ]
 *
 *   categories   "d" = dating | "w" = webcam | "l" = live cams (combine: "dw")
 *   geos         space separated ISO-2 codes, or "ww" for worldwide
 *
 * The 3rd and 4th columns are legacy internal routing hints kept only so the
 * historical rows stay untouched — they are never written to the database and
 * never reach the browser.
 *
 * To add more items: append rows here and re-run POST /api/offers/seed.
 */

import { offerCovers } from "../../assets/files";
import { COMPANIES } from "./companies";

export type OfferRow = [string, string, string, number, string, string, number];

const CAT_MAP: Record<string, string> = { d: "dating", w: "webcam", l: "live_cams", u: "useful" };
/** The 106 flagship services pre-configured in the catalog. */
export const CRAKREVENUE_ROWS: OfferRow[] = [
  ["BeNaughty", "d", "s", 4, "us ca gb au", "casual,mainstream,mobile,top", 92],
  ["Flirt.com", "d", "s", 3.5, "us ca gb au nz", "flirt,casual,mainstream", 90],
  ["Together2Night", "d", "s", 3.2, "us ca gb", "hookup,night,casual", 86],
  ["IWantU", "d", "s", 3, "us ca au", "casual,mainstream", 82],
  ["Cheekylovers", "d", "s", 2.8, "us gb ie", "playful,casual", 79],
  ["WantMatures", "d", "s", 3.4, "us ca gb", "milf,mature", 84],
  ["OneNightFriend", "d", "s", 3.1, "us ca au nz", "hookup,casual", 83],
  ["NaughtyDate", "d", "s", 3.3, "us ca gb", "casual,hookup", 85],
  ["QuickFlirt", "d", "s", 2.9, "us ca gb au", "flirt,casual", 78],
  ["Iamnaughty", "d", "s", 2.7, "us gb", "casual,mainstream", 76],
  ["WildBuddies", "d", "s", 3, "us ca", "hookup,casual", 80],
  ["TenderMeets", "d", "o", 4.5, "us ca gb au", "serious,doi,relationship", 81],
  ["MeetVille", "d", "o", 4.2, "us ca gb", "serious,relationship", 77],
  ["LoveAgain", "d", "o", 4, "us ca gb au", "mature,serious", 75],
  ["FastFlirting", "d", "s", 2.5, "ww", "flirt,worldwide,nogeo", 72],
  ["XPress", "d", "p", 32, "us ca gb au", "hookup,pps,premium", 88],
  ["Fling", "d", "p", 38, "us ca", "hookup,pps,premium", 91],
  ["AdultFriendFinder", "d", "p", 42, "us ca gb au", "flagship,pps,premium,top", 96],
  ["SnapSext", "d", "p", 34, "us ca", "sexting,pps", 87],
  ["Instabang", "d", "p", 30, "us ca gb", "hookup,pps", 84],
  ["UberHorny", "d", "p", 28, "us ca au", "hookup,pps", 82],
  ["Ashley Madison", "d", "p", 45, "us ca gb au fr de", "affair,discreet,premium,top", 97],
  ["Victoria Milan", "d", "p", 36, "de at ch se no dk fi", "affair,europe,discreet", 85],
  ["C-Date", "d", "o", 6.5, "de at ch nl be", "casual,europe,doi", 83],
  ["Fuckbook", "d", "p", 29, "us ca gb", "social,pps,hookup", 80],
  ["MilfFinder", "d", "s", 3.6, "us ca gb au", "milf,mature", 81],
  ["LocalFlirt", "d", "s", 2.8, "us ca", "local,casual", 74],
  ["Xdating", "d", "s", 3.1, "us ca gb", "casual,hookup", 77],
  ["MeetSlavicGirls", "d", "m", 5.5, "us ca gb de fr", "slavic,international,romance", 79],
  ["SofiaDate", "d", "m", 6, "us ca gb au de", "international,romance,premium", 86],
  ["LatinFeels", "d", "m", 5.8, "us ca gb es", "latin,romance,international", 84],
  ["AmourFactory", "d", "m", 5.6, "us ca gb de", "romance,international", 80],
  ["JollyRomance", "d", "m", 5.4, "us ca au", "romance,international", 78],
  ["VictoriaHearts", "d", "m", 5.9, "us ca gb", "romance,slavic", 82],
  ["DateMyAge", "d", "m", 5.2, "us ca gb au", "mature,international", 81],
  ["BravoDate", "d", "m", 6.2, "us ca gb de fr", "international,romance", 83],
  ["TheLuckyDate", "d", "m", 5, "us ca gb au", "mainstream,romance", 79],
  ["AsianMelodies", "d", "m", 5.7, "us ca au sg", "asian,romance,international", 82],
  ["EasternHoneys", "d", "m", 6.1, "us ca gb au", "asian,romance,premium", 85],
  ["OrchidRomance", "d", "m", 5.3, "us ca gb", "asian,romance", 77],
  ["GoDateNow", "d", "m", 5.1, "us ca gb de", "slavic,romance", 76],
  ["LatamDate", "d", "m", 5.6, "us ca es mx", "latin,romance", 80],
  ["Charmerly", "d", "m", 4.9, "us ca gb", "international,romance", 74],
  ["UkraineBride4you", "d", "m", 5.4, "us ca gb au", "slavic,romance", 75],
  ["Chaturbate — Global", "w", "r", 20, "ww", "freemium,revshare,top,nogeo", 98],
  ["Chaturbate — Highlights", "w", "p", 3, "us ca gb au de", "freemium,ppl,pps", 94],
  ["Stripchat", "w", "r", 30, "ww", "freemium,revshare,top,nogeo", 95],
  ["Stripchat — Selected", "w", "m", 4.2, "us ca gb de fr", "freemium,multicpa", 90],
  ["LiveJasmin", "w", "m", 5, "us ca gb de fr it es", "premium,hd,top", 96],
  ["LiveJasmin — Premium", "w", "r", 35, "ww", "premium,revshare,nogeo", 93],
  ["BongaCams", "w", "r", 25, "ww", "freemium,revshare,nogeo", 89],
  ["MyFreeCams", "w", "p", 25, "us ca gb au", "freemium,pps", 87],
  ["CamSoda", "w", "m", 4.5, "us ca gb au", "freemium,multicpa", 88],
  ["Flirt4Free", "w", "p", 45, "us ca gb au de", "premium,pps,hd", 92],
  ["ImLive", "w", "p", 40, "ww", "veteran,pps,nogeo", 86],
  ["Cams.com", "w", "p", 38, "us ca gb au", "premium,pps", 88],
  ["XLoveCam", "w", "r", 30, "fr de it es be ch", "europe,revshare", 82],
  ["Streamate", "w", "m", 4.8, "us ca gb au de", "premium,multicpa", 90],
  ["Cam4", "w", "r", 28, "ww", "freemium,revshare,nogeo", 84],
  ["Royal Cams", "w", "r", 26, "ww", "freemium,nogeo", 79],
  ["Camster", "w", "p", 30, "us ca gb", "freemium,pps", 78],
  ["CamContacts", "w", "p", 35, "us gb au", "niche,pps", 74],
  ["MyDirtyHobby", "w", "p", 42, "de at ch", "german,amateur,pps", 85],
  ["Sexier", "w", "p", 33, "us ca gb", "premium,pps", 76],
  ["Camversity", "w", "r", 24, "us ca", "freemium,revshare", 72],
  ["Amateur.tv", "w", "r", 27, "es mx ar cl co", "spanish,amateur,latam", 77],
  ["xHamsterLive", "w", "r", 29, "ww", "tube,freemium,nogeo", 88],
  ["Jerkmate", "w", "m", 5.5, "us ca gb au de fr", "flagship,ai-match,top", 99],
  ["Jerkmate — Premium", "w", "r", 40, "ww", "flagship,revshare,nogeo,top", 95],
  ["Cherry.tv", "w", "r", 30, "us ca gb de", "new,freemium,revshare", 83],
  ["Naked.com", "w", "p", 36, "us ca gb au", "premium,pps", 80],
  ["BimBim", "w", "m", 4, "ww", "freemium,nogeo", 75],
  ["LiveSexAsian", "w", "m", 4.3, "us ca au sg jp", "asian,premium", 78],
  ["StripCash", "w", "r", 32, "ww", "revshare,network,nogeo", 86],
  ["Camsloveaholics", "w", "r", 25, "ww", "freemium,nogeo", 71],
  ["Chaturbate — DACH", "w", "m", 4.4, "de at ch", "german,dach,multicpa", 87],
  ["Stripchat — LATAM", "w", "m", 3.6, "br mx ar cl co", "latam,freemium", 84],
  ["LiveJasmin — Nordics", "w", "m", 5.4, "se no dk fi", "nordics,premium", 85],
  ["Slutroulette", "l", "m", 4.6, "us ca gb au", "roulette,live,multicpa", 89],
  ["Chatrandom", "l", "s", 2.4, "ww", "roulette,nogeo", 80],
  ["DirtyRoulette", "l", "m", 3.8, "us ca gb", "roulette,adult", 82],
  ["Shagle", "l", "s", 2.6, "ww", "roulette,nogeo", 81],
  ["CamSurf", "l", "s", 2.2, "ww", "roulette,nogeo", 74],
  ["Bazoocam", "l", "s", 2.3, "fr be ch ca", "roulette,french", 72],
  ["ChatSpin", "l", "s", 2.5, "ww", "roulette,nogeo", 76],
  ["Flingster", "l", "m", 4.1, "us ca gb au", "roulette,adult", 83],
  ["CooMeet", "l", "p", 30, "us ca gb de fr", "premium,roulette,pps", 87],
  ["CamGo", "l", "s", 2.4, "ww", "roulette,nogeo", 73],
  ["Emerald Chat", "l", "s", 2.1, "ww", "roulette,nogeo", 70],
  ["LuckyCrush", "l", "p", 32, "us ca gb au de", "premium,roulette,pps", 88],
  ["Chatiw Live", "l", "s", 2, "ww", "chat,nogeo", 68],
  ["FreeChatNow", "l", "s", 2.2, "us ca gb", "chat,roulette", 69],
  ["CamFrog Live", "l", "p", 26, "ww", "community,pps,nogeo", 71],
  ["OmeTV Adult", "l", "s", 2.3, "ww", "roulette,nogeo", 72],
  ["Chatroulette Plus", "l", "m", 3.5, "us ca gb", "roulette,multicpa", 77],
  ["Jerkmate Games", "wl", "m", 5, "us ca gb au", "games,interactive,flagship", 91],
  ["Chaturbate Apps", "w", "r", 22, "ww", "apps,revshare,nogeo", 79],
  ["Stripchat VR", "wl", "m", 4.8, "us ca gb de", "vr,innovation,live", 84],
  ["FuckbookHookups", "d", "s", 3.2, "us ca gb au", "hookup,casual", 78],
  ["MeetMilfy", "d", "s", 3.5, "us ca gb", "milf,mature", 80],
  ["HornyMatches", "d", "s", 3, "us ca", "hookup,casual", 75],
  ["AdultCamLover", "lw", "m", 4.2, "us ca gb au", "live,hybrid,multicpa", 79],
  ["LiveJasmin Mobile", "w", "m", 5.1, "ww", "mobile,premium,nogeo", 90],
  ["Cams.com — Premium", "w", "r", 35, "ww", "premium,revshare,nogeo", 84],
  ["Flirt4Free — Premium", "w", "r", 33, "ww", "premium,revshare,nogeo", 83],
  ["BeNaughty — Premium", "d", "o", 5.5, "us ca gb au", "casual,doi,premium", 89],
];

/** Additional vitrines available through other partner networks. */
export const PARTNER_ROWS: Array<[...OfferRow, string]> = [
  ["Amorina", "d", "s", 3.4, "de at ch", "dach,casual", 81, "Advidi"],
  ["FlirtWave", "d", "s", 2.9, "nl be lu", "benelux,casual", 78, "Advidi"],
  ["MatchPulse", "d", "o", 4.8, "us ca", "serious,doi", 84, "Advidi"],
  ["DateBoom", "d", "s", 2.6, "pl cz hu ro", "cee,casual", 76, "AdCombo"],
  ["SecretTouch", "d", "p", 27, "gb ie", "affair,discreet", 82, "Advidi"],
  ["MidnightMatch", "d", "s", 3.1, "us ca au nz", "night,casual", 80, "ClickDealer"],
  ["VelvetDate", "d", "m", 5.2, "fr be ch", "french,romance", 79, "ClickDealer"],
  ["NeonHearts", "d", "s", 2.8, "es pt", "iberia,casual", 75, "AdCombo"],
  ["PulseDate", "d", "o", 4.4, "au nz", "oceania,serious", 77, "MaxBounty"],
  ["Cupidly", "d", "s", 3, "it gr", "south-europe,casual", 74, "AdCombo"],
  ["RougeMeet", "d", "m", 5.5, "fr ca be", "french,romance", 80, "ClickDealer"],
  ["LunaFlirt", "d", "s", 2.7, "tr", "turkey,casual", 71, "AdCombo"],
  ["SilkRomance", "d", "m", 5.8, "us ca gb", "romance,premium", 83, "Dating Factory"],
  ["EmberDate", "d", "s", 3.2, "se no dk fi", "nordics,casual", 82, "Advidi"],
  ["ScarletChat", "d", "s", 2.9, "ua pl", "cee,casual", 73, "AdCombo"],
  ["ObsidianDate", "d", "p", 31, "us ca gb", "premium,hookup", 85, "MaxBounty"],
  ["AuroraMeet", "d", "o", 4.6, "ie gb", "serious,doi", 76, "Dating Factory"],
  ["CrimsonFlirt", "d", "s", 3.3, "us ca", "casual,hookup", 79, "MaxBounty"],
  ["MoonlitDate", "d", "s", 2.5, "br mx ar", "latam,casual", 74, "LosPollos"],
  ["GildedHearts", "d", "m", 6, "us ca gb au", "premium,romance", 86, "Dating Factory"],
  ["HeatSeeker", "d", "p", 33, "us", "hookup,premium", 84, "MaxBounty"],
  ["Nocturna", "d", "s", 3, "es mx co cl", "spanish,casual", 77, "LosPollos"],
  ["ChicMatch", "d", "o", 5, "fr", "french,doi", 78, "ClickDealer"],
  ["IndigoDate", "d", "s", 2.8, "in ph th my id", "apac,casual", 70, "Mobidea"],
  ["SeraphimMeet", "d", "m", 5.1, "us ca gb", "romance,international", 79, "Dating Factory"],
  ["FirefliesDating", "d", "s", 3.1, "ww", "nogeo,casual", 75, "Traffic Company"],
  ["BlushLocal", "d", "s", 2.7, "gb ie au nz", "local,casual", 76, "Traffic Company"],
  ["VenusCircle", "d", "m", 5.4, "us ca gb de", "romance,premium", 81, "Golden Goose"],
  ["OpalDate", "d", "o", 4.3, "za ae il", "emerging,doi", 72, "Mobidea"],
  ["TwilightFlirt", "d", "s", 2.6, "jp kr sg", "asia,casual", 73, "Mobidea"],
  ["CamAurora", "w", "r", 28, "ww", "freemium,revshare,nogeo", 84, "TrafficStars"],
  ["NeonCams", "w", "m", 4.1, "us ca gb", "freemium,multicpa", 82, "TrafficStars"],
  ["VelvetCams", "w", "p", 34, "us ca gb au", "premium,pps", 83, "PlugRush"],
  ["PulseCams", "w", "r", 31, "ww", "revshare,nogeo", 80, "TrafficStars"],
  ["LiveEmber", "w", "m", 4.6, "de at ch", "dach,premium", 85, "Advidi"],
  ["CamNocturne", "w", "r", 26, "fr be ch", "french,revshare", 78, "TrafficStars"],
  ["SilkCams", "w", "p", 37, "us ca", "premium,pps", 84, "PlugRush"],
  ["RougeCams", "w", "m", 4.4, "es it pt", "south-europe,freemium", 77, "Adsterra"],
  ["MidnightCams", "w", "r", 29, "ww", "freemium,nogeo", 79, "Adsterra"],
  ["ScarletCams", "w", "m", 4.7, "se no dk fi", "nordics,premium", 83, "Advidi"],
  ["AmberLive", "w", "r", 27, "br mx ar cl", "latam,revshare", 76, "LosPollos"],
  ["CobaltCams", "w", "p", 32, "gb ie", "premium,pps", 80, "PlugRush"],
  ["OrionCams", "w", "m", 4.3, "pl cz hu ro", "cee,freemium", 74, "AdCombo"],
  ["ZephyrCams", "w", "r", 30, "ww", "revshare,nogeo", 78, "TrafficStars"],
  ["LumenCams", "w", "m", 5, "us ca gb au de", "premium,multicpa", 86, "Golden Goose"],
  ["NovaCams", "w", "r", 33, "ww", "revshare,nogeo,new", 81, "TrafficStars"],
  ["CrystalCams", "w", "p", 35, "au nz", "oceania,premium", 79, "MaxBounty"],
  ["EclipseCams", "w", "m", 4.2, "tr ae sa il", "mena,freemium", 71, "Adsterra"],
  ["SolsticeCams", "w", "r", 28, "jp kr sg th", "asia,revshare", 75, "Mobidea"],
  ["PrismCams", "w", "m", 4.9, "us ca", "premium,multicpa", 85, "Golden Goose"],
  ["RouletteNeon", "l", "s", 2.4, "ww", "roulette,nogeo", 77, "Adsterra"],
  ["FlashChat Live", "l", "m", 3.7, "us ca gb", "roulette,live", 79, "PlugRush"],
  ["PulseRoulette", "l", "s", 2.2, "ww", "roulette,nogeo", 73, "Adsterra"],
  ["SpinFlirt", "l", "m", 3.9, "de at ch", "dach,roulette", 81, "Advidi"],
  ["InstaCam Live", "l", "p", 28, "us ca gb au", "premium,roulette", 84, "MaxBounty"],
  ["OrbitChat", "l", "s", 2.3, "fr be", "french,roulette", 72, "ClickDealer"],
  ["HaloRoulette", "l", "s", 2.5, "es mx ar", "latam,roulette", 74, "LosPollos"],
  ["QuartzLive", "l", "m", 4, "se no dk fi", "nordics,live", 80, "Advidi"],
  ["VortexCam", "l", "p", 29, "us ca", "premium,roulette", 83, "MaxBounty"],
  ["SableChat", "l", "s", 2.1, "pl cz hu ua", "cee,roulette", 70, "AdCombo"],
];

/**
 * "Полезное" — everyday services and platforms that complement the catalog.
 * Row format: [ name, geos, tags, qualityScore, description ]
 */
export type UsefulRow = [string, string, string, number, string];

export const USEFUL_ROWS: UsefulRow[] = [
  ["VPN Shield 24", "ww", "приватность,безопасность,vpn", 93,
   "Быстрый VPN с серверами в 60 странах: скрывает реальный IP, шифрует трафик и открывает сайты, недоступные в вашем регионе. Работает на телефоне, компьютере и в браузере."],
  ["SafeSurf Browser", "ww", "приватность,браузер,безопасность", 88,
   "Браузер с встроенной защитой от трекеров и рекламы. Приватные вкладки не сохраняют историю, а отдельные профили помогают держать личное отдельно от рабочего."],
  ["IdentiCheck", "us ca gb au de fr", "безопасность,проверка,знакомства", 90,
   "Сервис проверки анкет: находит фото из чужих профилей, проверяет, где ещё встречается снимок, и подсказывает признаки поддельного аккаунта. Полезно перед первой встречей."],
  ["PhotoBoost AI", "ww", "фото,ии,анкета", 92,
   "Улучшение фотографий для профиля: подтягивает свет и резкость, убирает лишний фон и выбирает самые удачные кадры из вашей галереи. Готовый набор снимков — за пару минут."],
  ["Lumea Portrait Studio", "ww", "фото,ии,портрет", 87,
   "Генератор студийных портретов по вашим обычным фото. Десятки стилей — от делового до курортного, все снимки скачиваются в высоком разрешении."],
  ["TransLingua Chat", "ww", "перевод,общение,языки", 91,
   "Живой перевод переписки в 90+ языках прямо в окне чата. Понимает разговорные фразы и сленг, поэтому общение с собеседником из другой страны остаётся естественным."],
  ["IceBreaker AI", "ww", "общение,ии,знакомства", 89,
   "Подсказывает первое сообщение под конкретную анкету и помогает поддержать разговор, когда он заходит в тупик. Несколько вариантов тона: от дружеского до дерзкого."],
  ["Cupido Coach", "us ca gb de fr es", "общение,советы,знакомства", 84,
   "Короткие видеоуроки и разборы переписок от практикующих психологов: как начинать разговор, как назначать встречу и как спокойно реагировать на отказ."],
  ["GiftExpress International", "ww", "подарки,доставка", 86,
   "Доставка цветов, сладостей и подарков более чем в 100 стран. Можно отправить сюрприз анонимно и приложить открытку на нужном языке."],
  ["FlowerRoute", "de fr it es nl be pl", "цветы,доставка,европа", 82,
   "Курьерская доставка свежих букетов по Европе в день заказа. Фото букета перед отправкой и уведомление, когда подарок вручён."],
  ["DateSpot Finder", "ww", "свидания,места,карта", 85,
   "Подборки мест для свидания рядом с вами: тихие бары, смотровые площадки, необычные музеи. Фильтры по бюджету, атмосфере и времени суток."],
  ["TableNow", "us gb fr es it de", "рестораны,бронирование", 83,
   "Бронирование столиков в ресторанах без звонков: свободное время видно сразу, отмена бесплатная. Есть подборки заведений для первого свидания."],
  ["EventPulse", "ww", "события,афиша,досуг", 81,
   "Афиша концертов, вечеринок и фестивалей в вашем городе с покупкой билетов в пару касаний. Напоминания приходят за день до события."],
  ["VoiceMask Live", "ww", "видеочат,голос,приватность", 80,
   "Изменение голоса в реальном времени для видеочатов и звонков. Несколько естественных пресетов и шумоподавление, чтобы вас было хорошо слышно."],
  ["CamStudio Lite", "ww", "стрим,видео,камера", 88,
   "Лёгкая программа для видеотрансляций: виртуальный фон, ретушь, сцены и переходы. Запускается даже на слабом ноутбуке и не грузит систему."],
  ["StreamKit Pro", "us ca gb de fr", "стрим,оборудование,техника", 85,
   "Магазин оборудования для трансляций: кольцевые лампы, микрофоны, вебкамеры 4K и готовые комплекты для домашней студии с доставкой."],
  ["RingLight Shop", "ww", "свет,техника,фото", 78,
   "Свет для фото и видео: кольцевые лампы, софтбоксы и мини-панели с регулировкой температуры. Подробные гайды, как поставить свет дома."],
  ["PrivatePay Cards", "us ca gb de fr es it nl", "платежи,приватность,карты", 90,
   "Виртуальные карты для онлайн-оплат: своя карта под каждый сервис, лимит на списание и отключение в один клик. В выписке видно только псевдоним карты."],
  ["AnonMail", "ww", "почта,приватность,регистрация", 87,
   "Одноразовые и постоянные почтовые псевдонимы: письма приходят на основной ящик, а реальный адрес остаётся скрытым. Псевдоним можно отключить в любой момент."],
  ["NumberBox", "ww", "номера,приватность,sms", 84,
   "Виртуальные номера для регистраций и подтверждений по SMS более чем в 50 странах. Личный номер телефона нигде не светится."],
  ["PassGuard", "ww", "пароли,безопасность", 91,
   "Менеджер паролей с автозаполнением и генератором: один мастер-пароль вместо десятков. Предупреждает, если ваш логин попал в утечку."],
  ["CloudVault", "ww", "хранилище,приватность,файлы", 86,
   "Облако со сквозным шифрованием для личных фото и документов. Папки открываются по ссылке с паролем и сроком жизни."],
  ["AdBlock Prime", "ww", "реклама,браузер,скорость", 79,
   "Блокировщик навязчивой рекламы, всплывающих окон и трекеров. Страницы грузятся заметно быстрее, а трафик на мобильном расходуется меньше."],
  ["MindCalm", "ww", "здоровье,сон,медитация", 85,
   "Медитации, дыхательные практики и звуки для сна. Короткие сессии по 5 минут помогают снять тревогу перед важной встречей."],
  ["FitPulse", "ww", "здоровье,спорт,тренировки", 83,
   "Домашние тренировки без оборудования и планы питания под вашу цель. Программа подстраивается под расписание и уровень подготовки."],
  ["HealthCheck Home", "us gb de fr es it", "здоровье,тесты,конфиденциально", 88,
   "Домашние экспресс-тесты и лабораторные анализы с курьером: результаты приходят в приложение, доступ к ним есть только у вас."],
  ["StyleBox", "us ca gb de fr", "стиль,одежда,подписка", 80,
   "Персональный стилист подбирает комплекты под вашу фигуру и бюджет и присылает коробку с примеркой дома. Что не подошло — возвращаете бесплатно."],
  ["ScentClub", "us gb de fr es it", "парфюм,подписка,стиль", 77,
   "Подписка на нишевую парфюмерию: каждый месяц новый аромат в удобном формате 8 мл и подсказки, к какому случаю он подходит."],
  ["TravelDeal Radar", "ww", "путешествия,билеты,скидки", 89,
   "Ловит дешёвые авиабилеты и ошибочные тарифы и присылает уведомление раньше поисковиков. Можно следить за конкретным направлением или ждать любое."],
  ["StayFinder", "ww", "отели,жильё,путешествия", 84,
   "Сравнение цен на отели и апартаменты сразу по десяткам площадок. Показывает итоговую стоимость со всеми сборами и бесплатной отменой."],
  ["RideSaver", "us gb fr de es br mx", "такси,транспорт,скидки", 76,
   "Сравнивает цены такси и каршеринга в вашем городе и показывает, где поездка дешевле прямо сейчас. Промокоды подтягиваются автоматически."],
  ["LangDuo", "ww", "языки,обучение,общение", 86,
   "Разговорные курсы 20 языков по 10 минут в день с живой практикой в чате. Отдельные модули про свидания и путешествия."],
  ["LegalGuard Online", "us gb de fr es nl", "право,приватность,поддержка", 82,
   "Юридическая поддержка по вопросам приватности в интернете: удаление данных из открытых источников, жалобы на утечки, консультации онлайн."],
  ["GiftCardHub", "ww", "подарки,сертификаты", 75,
   "Подарочные сертификаты сотен сервисов с мгновенной доставкой на почту. Удобно, когда подарок нужен прямо сейчас."],
];

/** GEO packs used to build additional localized editions of the strongest items. */
const GEO_PACKS: Array<[string, string, string]> = [
  ["DACH", "de at ch", "dach"],
  ["Nordics", "se no dk fi", "nordics"],
  ["CEE", "pl cz hu ro", "cee"],
  ["LATAM", "br mx ar cl co", "latam"],
  ["Benelux", "nl be", "benelux"],
  ["APAC", "jp kr sg th ph", "apac"],
  ["Iberia", "es pt", "iberia"],
  ["Tier-1", "us ca gb au", "tier1"],
];

const VITRINE_BASES: Array<[string, string, string, number, string]> = [
  ["Jerkmate", "w", "m", 5.5, "flagship,ai-match"],
  ["Chaturbate", "w", "r", 26, "freemium"],
  ["Stripchat", "w", "m", 4.2, "freemium"],
  ["LiveJasmin", "w", "m", 5, "premium,hd"],
  ["BeNaughty", "d", "s", 3.6, "casual,mainstream"],
  ["AdultFriendFinder", "d", "p", 38, "flagship"],
  ["Flirt.com", "d", "s", 3.2, "flirt,casual"],
  ["Slutroulette", "l", "m", 4.3, "roulette,live"],
];

/**
 * A seeded catalog item. `network` and `offer_url` stay server-side only —
 * `/api/offers` omits them so they can never reach the browser.
 */
export interface OfferSeed {
  name: string;
  slug: string;
  description: string;
  category: string[];
  network: string;
  geo: string[];
  tags: string;
  quality_score: number;
  offer_url: string;
  image_url: string;
  launch_date: string;
  is_featured: string;
  is_custom: string;
  status: string;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Removes every affiliate/payout term from the searchable tag list so nothing
 * network-related is ever displayed or searchable in the public catalog.
 */
const TAG_BLOCKLIST = new Set([
  "pps", "ppl", "soi", "doi", "cpa", "multicpa", "multi_cpa", "revshare",
  "network", "smartlink", "traffic", "epc",
]);
const TAG_RENAMES: Record<string, string> = {
  nogeo: "worldwide",
  vitrine: "regional",
  ppl: "popular",
};

function cleanTags(tags: string): string {
  const out: string[] = [];
  for (const raw of tags.split(",")) {
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    const renamed = TAG_RENAMES[tag];
    if (renamed) {
      if (!out.includes(renamed)) out.push(renamed);
      continue;
    }
    if (TAG_BLOCKLIST.has(tag)) continue;
    if (!out.includes(tag)) out.push(tag);
  }
  return out.join(",");
}

/** Human, service-oriented copy — no networks, payouts or conversion wording. */
const KIND_PHRASES: Record<string, string[]> = {
  dating: [
    "сервис знакомств с живой аудиторией и удобным поиском по интересам",
    "платформа для знакомств и лёгкого общения без долгих анкет",
    "сайт знакомств с быстрой регистрацией и умными подсказками собеседников",
  ],
  webcam: [
    "вебкам-платформа с большим выбором трансляций в высоком качестве",
    "площадка с живыми видеотрансляциями, чатом и приватными комнатами",
    "вебкам-сервис с HD-качеством картинки и понятным интерфейсом",
  ],
  live_cams: [
    "сервис живых видеочатов со случайными собеседниками",
    "площадка live-чатов с мгновенным подключением и фильтрами по странам",
    "видеочат-рулетка, которая находит собеседника за пару секунд",
  ],
  hybrid: [
    "гибридная площадка: вебкам-трансляции и живые видеочаты в одном месте",
    "сервис, который объединяет трансляции и общение один на один",
  ],
};

const EXTRA_PHRASES = [
  "Работает прямо в браузере — устанавливать ничего не нужно.",
  "Есть удобная мобильная версия и тёмная тема.",
  "Регистрация занимает меньше минуты.",
  "Интерфейс переведён на несколько языков.",
  "Поддержка отвечает круглосуточно.",
];

function describe(name: string, cats: string[], geos: string[], seed: number): string {
  const key =
    cats.includes("webcam") && cats.includes("live_cams")
      ? "hybrid"
      : cats.includes("webcam")
        ? "webcam"
        : cats.includes("live_cams")
          ? "live_cams"
          : "dating";
  const pool = KIND_PHRASES[key];
  const kind = pool[seed % pool.length];
  const geoText = geos.includes("worldwide")
    ? "Доступен по всему миру без региональных ограничений."
    : `Лучше всего работает в странах: ${geos
        .slice(0, 4)
        .map((g) => g.toUpperCase())
        .join(", ")}.`;
  // Math.floor rather than >> : the seed exceeds 2^31 and a bit-shift would go negative.
  const extra = EXTRA_PHRASES[Math.floor(seed / 8) % EXTRA_PHRASES.length];
  return `${name} — ${kind}. ${geoText} ${extra}`;
}

function buildOffer(row: OfferRow, network: string, index: number): OfferSeed {
  const [name, cats, , , geos, tags, quality] = row;

  const category = cats.split("").map((c) => CAT_MAP[c]).filter(Boolean);
  const geo = geos === "ww" ? ["worldwide"] : geos.split(" ").filter(Boolean);

  // Deterministic "random" values so re-seeding always produces the same catalog.
  const seed = (index * 2654435761) % 4294967296;
  const daysAgo = seed % 900;
  const launch = new Date(Date.UTC(2026, 8, 6) - daysAgo * 86400000);

  return {
    name,
    slug: slugify(`${name}-${network}`),
    description: describe(name, category, geo, seed),
    category,
    network,
    geo,
    tags: cleanTags(tags),
    quality_score: quality,
    // Hidden tracking destination. Visitors always go through /go/{id} instead.
    offer_url: `https://www.crakrevenue.com/offers/${slugify(name)}/`,
    image_url: offerCovers[index % offerCovers.length],
    launch_date: launch.toISOString(),
    is_featured: quality >= 90 ? "yes" : "no",
    is_custom: "no",
    status: "active",
  };
}

function buildUseful(row: UsefulRow, index: number): OfferSeed {
  const [name, geos, tags, quality, description] = row;
  const geo = geos === "ww" ? ["worldwide"] : geos.split(" ").filter(Boolean);
  const seed = (index * 2654435761) % 4294967296;
  const launch = new Date(Date.UTC(2026, 8, 6) - (seed % 700) * 86400000);

  return {
    name,
    slug: slugify(`${name}-useful`),
    description,
    category: ["useful"],
    network: "Direct",
    geo,
    tags: cleanTags(tags),
    quality_score: quality,
    offer_url: `https://flirtpulse.link/s/${slugify(name)}`,
    image_url: offerCovers[index % offerCovers.length],
    launch_date: launch.toISOString(),
    is_featured: quality >= 89 ? "yes" : "no",
    is_custom: "no",
    status: "active",
  };
}

/**
 * The five partner companies, rendered as regular catalog cards so they can be
 * searched and filtered exactly like every other service.
 */
export function buildCompanySeeds(): OfferSeed[] {
  return COMPANIES.map((company, i) => ({
    name: company.name,
    slug: company.slug,
    description: company.description,
    category: ["useful"],
    network: "Direct",
    geo: company.geo,
    tags: cleanTags(company.tags),
    quality_score: company.quality_score,
    offer_url: company.site,
    image_url: company.logo,
    launch_date: new Date(Date.UTC(2026, 8, 10) - i * 86400000).toISOString(),
    is_featured: "yes",
    is_custom: "no",
    status: "active",
  }));
}

/** Builds the complete catalog: dating, webcam, live cams, regional editions and useful services. */
export function buildOfferSeeds(): OfferSeed[] {
  const seeds: OfferSeed[] = [...buildCompanySeeds()];

  CRAKREVENUE_ROWS.forEach((row, i) => seeds.push(buildOffer(row, "CrakRevenue", i)));

  PARTNER_ROWS.forEach((row, i) => {
    const network = row[7];
    seeds.push(buildOffer(row.slice(0, 7) as OfferRow, network, CRAKREVENUE_ROWS.length + i));
  });

  let cursor = seeds.length;
  VITRINE_BASES.forEach(([base, cats, models, amount, tags]) => {
    GEO_PACKS.forEach(([packName, packGeos, packTag]) => {
      const row: OfferRow = [
        `${base} — ${packName} Edition`,
        cats,
        models,
        amount,
        packGeos,
        `${tags},${packTag},vitrine`,
        Math.max(60, 88 - (cursor % 17)),
      ];
      seeds.push(buildOffer(row, "CrakRevenue", cursor));
      cursor += 1;
    });
  });

  USEFUL_ROWS.forEach((row, i) => seeds.push(buildUseful(row, cursor + i)));

  return seeds;
}

export const TOTAL_SEED_COUNT =
  COMPANIES.length +
  CRAKREVENUE_ROWS.length +
  PARTNER_ROWS.length +
  VITRINE_BASES.length * GEO_PACKS.length +
  USEFUL_ROWS.length;
