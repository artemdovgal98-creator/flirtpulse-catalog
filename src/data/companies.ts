/**
 * FlirtPulse — company partners.
 *
 * The five companies below are shown as a dedicated block on the home page and
 * are also part of the services catalog (category "useful"), so they can be
 * searched, filtered and opened like any other card.
 *
 * `slug` is the upsert key used by POST /api/offers/seed — never change it for
 * an existing company or the seeder will create a duplicate row.
 */

import { companyLogos } from "../../assets/files";

export interface Company {
  key: keyof typeof companyLogos;
  name: string;
  slug: string;
  /** Public website, used as the default destination of the catalog card. */
  site: string;
  logo: string;
  /** Short line used on the home page tiles. */
  tagline: string;
  /** Full copy used on the catalog card. */
  description: string;
  /** Tailwind gradient classes for the tile glow. */
  accent: string;
  geo: string[];
  tags: string;
  quality_score: number;
}

export const COMPANIES: Company[] = [
  {
    key: "zeydoo",
    name: "Zeydoo",
    slug: "company-zeydoo",
    site: "https://zeydoo.com/",
    logo: companyLogos.zeydoo,
    tagline: "Смартлинки и подписные сервисы",
    description:
      "Zeydoo — международная платформа монетизации трафика с собственными смартлинками, опросами, подписными сервисами и dating-направлением. Прозрачная статистика в реальном времени, быстрые выплаты и персональный менеджер для каждого партнёра.",
    accent: "from-cyan-400/25 to-blue-600/10",
    geo: ["worldwide"],
    tags: "компания,платформа,смартлинк,аналитика",
    quality_score: 96,
  },
  {
    key: "avwin",
    name: "Avwin",
    slug: "company-avwin",
    site: "https://avwin.com/",
    logo: companyLogos.avwin,
    tagline: "Монетизация dating-трафика",
    description:
      "Avwin — платформа для работы с dating- и entertainment-трафиком: гибкие условия сотрудничества, подробная аналитика по источникам и странам, регулярные выплаты и поддержка на русском и английском языках.",
    accent: "from-fuchsia-400/25 to-indigo-600/10",
    geo: ["worldwide"],
    tags: "компания,платформа,dating,аналитика",
    quality_score: 93,
  },
  {
    key: "mylead",
    name: "MyLead",
    slug: "company-mylead",
    site: "https://mylead.global/",
    logo: companyLogos.mylead,
    tagline: "Глобальная платформа с 4000+ программ",
    description:
      "MyLead — глобальная платформа с более чем 4000 программами в десятках направлений: знакомства, развлечения, финансы, мобильные приложения и e-commerce. Удобный кабинет, обучающая база знаний и вывод средств от небольших сумм.",
    accent: "from-emerald-400/25 to-teal-600/10",
    geo: ["worldwide"],
    tags: "компания,платформа,global,обучение",
    quality_score: 95,
  },
  {
    key: "crakrevenue",
    name: "CrakRevenue",
    slug: "company-crakrevenue",
    site: "https://www.crakrevenue.com/",
    logo: companyLogos.crakrevenue,
    tagline: "700+ проверенных сервисов 18+",
    description:
      "CrakRevenue — одна из самых известных мировых платформ в сегменте 18+: более 700 проверенных сервисов знакомств, вебкама и живых камер, умные смартлинки, подробная статистика и круглосуточная поддержка.",
    accent: "from-lime-400/25 to-emerald-600/10",
    geo: ["worldwide"],
    tags: "компания,платформа,dating,webcam,18+",
    quality_score: 97,
  },
  {
    key: "aiveksa",
    name: "Aiveksa",
    slug: "company-aiveksa",
    site: "https://aivix.com/",
    logo: companyLogos.aiveksa,
    tagline: "Аналитика и умная оптимизация",
    description:
      "Aiveksa — технологичная платформа с фокусом на аналитику: сквозные отчёты по источникам, автоматическая оптимизация связок, эксклюзивные направления и индивидуальные условия для активных партнёров.",
    accent: "from-indigo-400/25 to-violet-600/10",
    geo: ["worldwide"],
    tags: "компания,платформа,аналитика,оптимизация",
    quality_score: 92,
  },
];

/** Look-up used by the catalog card renderer to show a company logo instead of a photo. */
export const COMPANY_BY_NAME: Record<string, Company> = Object.fromEntries(
  COMPANIES.map((c) => [c.name.toLowerCase(), c])
);
