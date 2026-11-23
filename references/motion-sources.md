# Десять motion-источников

Ниже перечислены закреплённые публичные версии. Это выборочные справочные снимки, не полные клоны. Исходные байты, пути и хеши находятся в INDEX каждого пакета; активный локальный sound helper проверяется отдельно.

| Источник | Commit | Лицензия | Применение |
| --- | --- | --- | --- |
| [gongnyang/reelforge](https://github.com/gongnyang/reelforge/tree/740bf70dc1f068734e054e922c0a602e50f69ebd) | `740bf70dc1f0` | Apache-2.0 | ReelForge: фрагменты и переходы |
| [gkurt/tegaki](https://github.com/gkurt/tegaki/tree/bf18556996d9683326e8f2130bd50e7632e9f187) | `bf18556996d9` | MIT | Tegaki: рукописные акценты |
| [omkamal/animated-diagrams-skill](https://github.com/omkamal/animated-diagrams-skill/tree/3de812d90c94baa4f9761684f36c3c322f1fb38c) | `3de812d90c94` | Apache-2.0 | Animated Diagrams: объясняющие схемы |
| [AgentsORG/design-engineering](https://github.com/AgentsORG/design-engineering/tree/a79af5c5161dfa36a5cf2ab6423528936bc76df3) | `a79af5c5161d` | MIT | Design Engineering: звук по движению |
| [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design/tree/59065698ad63f87ea1532c126c87f488d4f93fd6) | `59065698ad63` | MIT | Huashu: камера и GSAP |
| [nateherkai/herk-edit-kit](https://github.com/nateherkai/herk-edit-kit/tree/10511e5af86fc47756ea89803b397422e2d89284) | `10511e5af86f` | MIT (brand exclusions) | Herk Edit Kit: карточки и ритм |
| [nutllwhy/hyperframes-motion-library](https://github.com/nutllwhy/hyperframes-motion-library/tree/98c40ca18f23d7dc021a5d84308ab10599482cff) | `98c40ca18f23` | MIT | Motion Library: данные и объяснения |
| [tugrawork-creator/saas-motion-kit](https://github.com/tugrawork-creator/saas-motion-kit/tree/bc7a414d6b66ceb09dfaa511e6237f382571bc84) | `bc7a414d6b66` | MIT (fonts separate) | SaaS Motion Kit: подача проморолика |
| [AbubakrChan/product-launch-motion](https://github.com/AbubakrChan/product-launch-motion/tree/edbfb105382f21507bad895d8b5f6e0faa67487c) | `edbfb105382f` | MIT | Product Launch Motion: непрерывный объект |
| [openai/plugins](https://github.com/openai/plugins/tree/981b02c0c44058b595f3b4180002c3ae3c806d40) | `981b02c0c440` | Apache-2.0 | HyperFrames: официальный контракт |

Поиск и проверка: `node scripts/motion-catalog.mjs search --query "camera"`, `node scripts/motion-catalog.mjs verify`.

ReelForge содержит 31 каталогизированный фрагмент; Herk — 408 реальных HTML-карточек (число в исходном registry отличается); Motion Library — 27 ID шаблонов с 29 композициями; SaaS Motion — 101 тема. Всего 569 рецептов. Прочие источники дают технику, контракт, движок или звук.

Tegaki: код MIT, шрифты имеют отдельные лицензии. Демо использует открытый Noto Sans и Caveat с OFL; файлы лицензий лежат в `motion/v2/assets`. Встроенный Caveat проверяется на нужные символы отдельно.

Herk: код MIT; брендовые AIS assets не входят в эту поставку. Product Launch: код/документация MIT, демонстрационные фильмы и stills не включены согласно исходному NOTICE. SaaS Motion: LICENSE MIT, права на сторонние шрифты/медиа отдельно. Для HyperFrames сохранены исходные notices. Не переносите чужие фильмы, логотипы или музыку только на основании лицензии кода.

Код адаптеров и общей учебной обвязки — Apache-2.0. Оригинальные LICENSE/NOTICE сохранены без изменений. Облачные фабрики, загрузчики и установщики источников не подключены к адаптерам; [карта API](api-map-v2.md).
