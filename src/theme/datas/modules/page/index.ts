import { defineModuleData, defineModuleEntries, defineModuleEntryData, defineModuleReferenceData } from '@/platform/datas';

const picture = (id: string) => defineModuleReferenceData('image', id);

export default defineModuleData({
  id: 'page',
  fields: {},
  entries: defineModuleEntries({
    home: defineModuleEntryData({
      id: 'home',
      routeKey: '/',
      fields: { title: "Linework Studio | Sites", description: "Corporate sites, agents, Shopify, apps, mini programs, and admin systems. The development cost is public. 12 years in software. New clients: 600 yuan a day." },
      slots: { 'page.main': [
        {
          "id": "home-hero",
          "key": "home-hero",
          "settings": {
            "kicker": "Yubei, Chongqing, China",
            "h1": "Sites",
            "lead": "The development cost is public.",
            "body": "A studio in Yubei, Chongqing. 12 years in software. The studio and AI write what used to take a team. If something breaks, the studio owns it.",
            "priceLink": {
              "href": "/price/",
              "label": "See pricing"
            },
            "contactLink": {
              "href": "/contact/",
              "label": "Contact"
            },
            "heroImage": {
              "label": "Studio + AI",
              "file": picture('page-hero')
            },
            "placeholderCaption": "Placeholder",
            "schema": {
              "name": "Linework Studio",
              "description": "Corporate sites, agents, Shopify, apps, mini programs, and admin systems. The development cost is public. 12 years in software. New clients: 600 yuan a day.",
              "addressCountry": "CN",
              "addressRegion": "Chongqing",
              "addressLocality": "Yubei District",
              "knowsLanguage": [
                "zh-CN",
                "en"
              ],
              "offers": [
                {
                  "name": "New client, per day",
                  "price": "600",
                  "priceCurrency": "CNY",
                  "unitText": "DAY"
                },
                {
                  "name": "New client, per month",
                  "price": "12000",
                  "priceCurrency": "CNY",
                  "unitText": "MON"
                },
                {
                  "name": "Returning client, per day",
                  "price": "500",
                  "priceCurrency": "CNY",
                  "unitText": "DAY"
                },
                {
                  "name": "Returning client, per month",
                  "price": "10000",
                  "priceCurrency": "CNY",
                  "unitText": "MON"
                }
              ]
            }
          },
          "messages": {}
        },
        {
          "id": "home-services",
          "key": "home-services",
          "settings": {
            "servicesTitle": "This work",
            "servicesNote": "Build, later changes, plugins, themes.",
            "services": [
              {
                "id": "service-1",
                "text": "Corporate"
              },
              {
                "id": "service-2",
                "text": "Agent"
              },
              {
                "id": "service-3",
                "text": "Shopify"
              },
              {
                "id": "service-4",
                "text": "App"
              },
              {
                "id": "service-5",
                "text": "Mini program"
              },
              {
                "id": "service-6",
                "text": "Admin"
              }
            ],
            "agentLine": "Also: a studio agent. Talk to the AI. Five assistants handle the topics, drafts, quotes, contract, and prototype. You do the delivery. Buying it includes the operating curriculum, a peer community, and the latest studio agent version, kept current.",
            "agentLink": {
              "href": "/services/",
              "label": "See services ›"
            }
          },
          "messages": {}
        },
        {
          "id": "home-compare",
          "key": "home-compare",
          "settings": {
            "compareTitle": "The studio, writing with AI",
            "compareBody": "Nine years inside a company, and how a job is staffed is understood and practiced: sales, a project manager, several developers. The part that writes pages and features is now the studio, plus AI.",
            "compareBody2": "The quote therefore has no sales, no office, and no standing staff. The work is not cheap. The structure is. The rate is this studio’s rate. A smaller part is tax, paid as required.",
            "before": "Then, a team",
            "now": "Now, the studio + AI"
          },
          "messages": {}
        },
        {
          "id": "home-work",
          "key": "home-work",
          "settings": {
            "workTitle": "Work",
            "workMask": "Client anonymized",
            "workName": "Tibetan ornament culture",
            "workFacts": [
              {
                "id": "fact-1",
                "label": "When",
                "value": "From 2024, introduced by an existing client"
              },
              {
                "id": "fact-2",
                "label": "Scope",
                "value": "Build, later changes, plugins, theme"
              },
              {
                "id": "fact-3",
                "label": "Size",
                "value": "1 project, 8 rounds"
              }
            ],
            "workLink": {
              "href": "/work/",
              "label": "See this job ›"
            },
            "workImage": {
              "label": "Tibetan ornament culture",
              "file": picture('page-shopify-client')
            },
            "placeholderCaption": "Placeholder"
          },
          "messages": {}
        },
        {
          "id": "home-team",
          "key": "home-team",
          "settings": {
            "teamTitle": "Day and night",
            "teamBody": "Sites by day. At night, an open-source CMS that follows Shopify’s structure. The repository is not public yet.",
            "teamImage": {
              "label": "Yubei, Chongqing",
              "file": picture('page-night')
            },
            "placeholderCaption": "Placeholder"
          },
          "messages": {}
        },
        {
          "id": "home-price",
          "key": "home-price",
          "settings": {
            "priceTitle": "The development cost is public",
            "priceNote": "Tax included. 22 working days count as one month. A returning client is a repeat order.",
            "priceColumns": {
              "client": "Client",
              "day": "Per day",
              "month": "Per month"
            },
            "priceRows": [
              {
                "id": "row-1",
                "client": "New",
                "day": "600 yuan",
                "month": "12,000 yuan"
              },
              {
                "id": "row-2",
                "client": "Returning",
                "day": "500 yuan",
                "month": "10,000 yuan"
              }
            ],
            "priceMore": {
              "href": "/price/",
              "label": "Full rate card ›"
            }
          },
          "messages": {}
        },
        {
          "id": "home-news",
          "key": "home-news",
          "settings": {
            "newsTitle": "Notes",
            "newsAll": {
              "href": "/news/",
              "label": "All ›"
            },
            "newsCount": 4,
            "placeholderCaption": "Placeholder"
          },
          "messages": {}
        },
        {
          "id": "home-rules",
          "key": "home-rules",
          "settings": {
            "rulesTitle": "Five rules",
            "rules": [
              {
                "id": "rule-1",
                "text": "Changes land in a demo environment first. The live site moves only after you confirm."
              },
              {
                "id": "rule-2",
                "text": "Test before launch."
              },
              {
                "id": "rule-3",
                "text": "Ship increments. Do not overwrite, do not drop work."
              },
              {
                "id": "rule-4",
                "text": "Every change is recorded and backed up."
              },
              {
                "id": "rule-5",
                "text": "Source and docs are yours. Any past version can be taken. You are not locked in."
              }
            ]
          },
          "messages": {}
        }
      ] },
    }),
    work: defineModuleEntryData({
      id: 'work',
      routeKey: '/work',
      fields: { title: "Work | Linework Studio", description: "Clients we worked with. Cases and showcases go up as the work is done, and the page keeps updating. To protect client privacy, public pages do not show client details directly." },
      slots: { 'page.main': [
        {
          "id": "work-case",
          "key": "work-case",
          "settings": {
            "mask": "Clients we worked with",
            "h1": "Work",
            "lead": "Cases and showcases go up as the work is done. The page keeps updating. To protect client privacy, public pages do not show client details directly.",
            "image": {
              "label": "Tibetan ornament culture",
              "file": picture('page-shopify-client')
            },
            "placeholderCaption": "Placeholder",
            "name": "Tibetan ornament culture",
            "summary": "This store sells Tibetan ornaments on Shopify.",
            "facts": [
              {
                "id": "fact-1",
                "label": "When",
                "value": "From 2024, introduced by an existing client"
              },
              {
                "id": "fact-2",
                "label": "Scope",
                "value": "Build, later changes, plugins, theme"
              },
              {
                "id": "fact-3",
                "label": "Size",
                "value": "1 project, 8 rounds"
              }
            ],
            "storyTitle": "Someone else, then AI, then back",
            "story": "Once the studio had no room. He hired someone else. Checkout conversion fell, and he came back. Ten minutes to restore a local copy, two hours to turn off plugins that were not needed, one day to move the work. He also tried to make pages with AI. They did not match the theme. The rescue worked because he held the source.",
            "quote": "Quick to respond, problems get solved, the price is low, reliable.",
            "more": {
              "href": "/news/shopify-client",
              "label": "The full note ›"
            }
          },
          "messages": {}
        },
        {
          "id": "work-case-listed",
          "key": "work-case",
          "settings": {
            "mask": "",
            "h1": "",
            "lead": "",
            "image": {
              "label": "Adhesive products factory site",
              "file": picture('page-listed-adhesive')
            },
            "placeholderCaption": "Placeholder",
            "name": "Adhesive products factory site",
            "summary": "A Shopify store first, then a corporate site.",
            "facts": [
              {
                "id": "fact-1",
                "label": "When",
                "value": "From 2024"
              },
              {
                "id": "fact-2",
                "label": "Scope",
                "value": "Shopify store, corporate site, agent"
              },
              {
                "id": "fact-3",
                "label": "Size",
                "value": "3 projects, twenty-some requests"
              }
            ],
            "storyTitle": "It stayed with me",
            "story": "They never hired anyone else. The team keeps studying AI workflows, and the site work still lands on me. Google search, and problems around it, I implemented with them. AI knows a great deal. Whether the work is good takes someone who does this work. AI is not everything.",
            "quote": "Your fee is too low. You take responsibility. When something comes up, it gets solved.",
            "more": {
              "href": "/news/listed-adhesive",
              "label": "The full note ›"
            }
          },
          "messages": {}
        },
        {
          "id": "work-case-patch",
          "key": "work-case",
          "settings": {
            "mask": "",
            "h1": "",
            "lead": "",
            "image": {
              "label": "App for a temperature patch",
              "file": picture('page-temp-patch')
            },
            "placeholderCaption": "Placeholder",
            "name": "App for a temperature patch",
            "summary": "A medical device company's temperature patch. The patch is hardware. I connected it to the phone, and I wrote the app natively on Android and on iOS.",
            "facts": [
              {
                "id": "fact-1",
                "label": "When",
                "value": "From 2025"
              },
              {
                "id": "fact-2",
                "label": "Scope",
                "value": "Native app, Bluetooth hardware, Java server"
              },
              {
                "id": "fact-3",
                "label": "Size",
                "value": "1 project, 3 rounds"
              }
            ],
            "storyTitle": "He looked, and it stunned him",
            "story": "Someone asked me to build the temperature-patch app. I connected the hardware and wrote Android and iOS natively. My friend put the design next to the screens. The match stunned him. His other app was botched. The moment it broke, I was the first person he thought of. The botched one is not this job.",
            "quote": "I match a design very closely. What is on the draft is what lands on the screen.",
            "more": {
              "href": "/news/temp-patch",
              "label": "The full note ›"
            }
          },
          "messages": {}
        },
        {
          "id": "work-case-charter",
          "key": "work-case",
          "settings": {
            "mask": "",
            "h1": "",
            "lead": "",
            "image": {
              "label": "Case image placeholder"
            },
            "placeholderCaption": "Placeholder",
            "name": "Charter mini program",
            "summary": "Anyone can open it and book a car. Vehicle, destination, date, number of people. The map shows the route. WeChat Pay takes the payment.",
            "facts": [
              {
                "id": "fact-1",
                "label": "When",
                "value": "From 2024"
              },
              {
                "id": "fact-2",
                "label": "Scope",
                "value": "Mini program, Java server"
              },
              {
                "id": "fact-3",
                "label": "Size",
                "value": "3 projects, ten-some requests"
              }
            ],
            "storyTitle": "I left to take the work",
            "story": "I resigned and started taking contract work. My old company's tech director introduced this job. The client is a company boss who runs charters. I built the mini program. About three months, three mini programs. This is one of them. The technical work was strong enough that he came back.",
            "quote": "The design was matched very closely. It felt fast to use. A high-performance Java backend. The technical work was strong.",
            "more": {
              "href": "/news/charter",
              "label": "The full note ›"
            }
          },
          "messages": {}
        }
      ] },
    }),
    open: defineModuleEntryData({
      id: 'open',
      routeKey: '/open',
      fields: { title: "Open source | Linework Studio", description: "A site system for AI to use, in Shopify's direction. This site runs on it. Install Node.js and it runs, with no third-party service." },
      slots: { 'page.main': [
        {
          "id": "open-list",
          "key": "open-list",
          "settings": {
            "h1": "Open source",
            "lead": "A site system for AI to use, in Shopify's direction. This site runs on it. Install Node.js and it runs, with no third-party service.",
            "placeholderCaption": "Placeholder",
            "items": [
              {
                "id": "item-1",
                "status": "Linework Studio",
                "name": "Open-source site system",
                "detail": "This site runs on it. Content lives in datas, presentation in theme. Multiple languages, server-rendered. Install Node.js and it runs, with no third-party service.",
                "points": [
                  { "id": "i18n", "label": "Languages", "text": "Another language covers only the fields that change." },
                  { "id": "split", "label": "Content", "text": "Content lives in datas. Presentation lives in theme." },
                  { "id": "meta", "label": "Meta", "text": "Properties and models are defined first." },
                  { "id": "function", "label": "Compute", "text": "Controllers, services, and middleware live in function." },
                  { "id": "seo", "label": "Search", "text": "Title, description, and structured data, by language, the whole site, a module, or one page." },
                  { "id": "consent", "label": "Consent", "text": "Privacy choices and the cookie policy sit in the system." },
                  { "id": "injection", "label": "Injections", "text": "Scripts stay apart from the page body." },
                  { "id": "dev", "label": "Develop", "text": "Install Node.js and it runs. No third-party service required." },
                  { "id": "deploy", "label": "Deploy", "text": "Node, Cloudflare, or a container." },
                  { "id": "ssr", "label": "Render", "text": "Server-rendered, and built for speed." }
                ],
                "repository": {
                  "href": "https://github.com/yaocoreai/webunit",
                  "label": "github.com/yaocoreai/webunit"
                },
                "image": {
                  "label": "This site’s structure"
                }
              }
            ]
          },
          "messages": {}
        }
      ] },
    }),
    services: defineModuleEntryData({
      id: 'services',
      routeKey: '/services',
      fields: { title: "Services | Linework Studio", description: "If you are still looking, read on. One of them may fit what you need now." },
      slots: { 'page.main': [
        {
          "id": "services-body",
          "key": "services-body",
          "settings": {
            "h1": "Services",
            "lead": "If you are still looking, read on. One of them may fit what you need now.",
            "customTitle": "Custom development",
            "custom": [
              {
                "id": "custom-1",
                "text": "Corporate"
              },
              {
                "id": "custom-2",
                "text": "Agent"
              },
              {
                "id": "custom-3",
                "text": "Shopify"
              },
              {
                "id": "custom-4",
                "text": "App"
              },
              {
                "id": "custom-5",
                "text": "Mini program"
              },
              {
                "id": "custom-6",
                "text": "Admin"
              }
            ],
            "customNote": "Builds, later changes, plugins, and themes. Days follow the job.",
            "agentTitle": "Studio agent",
            "agentLead": "You do the delivery. Topics, drafts, quotes, the contract, and the prototype sit with five roles. Talk to the AI the whole way. It does the work, like five assistants. Talk through a step, and that piece comes back. Clients from messages stay on record. So does which piece brought them.",
            "rolesTitle": "Five roles, one job each",
            "roles": [
              {
                "id": "role-1",
                "name": "Operations",
                "detail": "Pick the next piece, and accept the draft"
              },
              {
                "id": "role-2",
                "name": "Presales",
                "detail": "Requirements, quote, and contract in one pass"
              },
              {
                "id": "role-3",
                "name": "Product",
                "detail": "The brief, and a prototype you can click"
              },
              {
                "id": "role-4",
                "name": "Writer",
                "detail": "One piece, split into versions you can post"
              },
              {
                "id": "role-5",
                "name": "Site",
                "detail": "Live fast, AI maintains it, no code needed"
              }
            ],
            "stepsTitle": "Talk through a step. Get that piece.",
            "steps": [
              {
                "id": "step-1",
                "name": "Topics",
                "detail": "Not sure what to post. The next piece gets chosen."
              },
              {
                "id": "step-2",
                "name": "Material",
                "detail": "The facts that can be published, picked out first."
              },
              {
                "id": "step-3",
                "name": "Drafts",
                "detail": "Turned into a piece you can post."
              },
              {
                "id": "step-4",
                "name": "Distribution",
                "detail": "One piece, split for each platform."
              },
              {
                "id": "step-5",
                "name": "Leads",
                "detail": "One message, one lead. Requirements, quote, brief, prototype, and contract come out of it. Which piece brought the client shows up in the review."
              },
              {
                "id": "step-6",
                "name": "Requirements",
                "detail": "What the client wants, written so you can check it."
              },
              {
                "id": "step-7",
                "name": "Requirements quote",
                "detail": "Days and price, from that requirements note."
              },
              {
                "id": "step-8",
                "name": "Product brief",
                "detail": "The next pass after the requirements. Features split by product, with how each one gets built."
              },
              {
                "id": "step-9",
                "name": "Product quote",
                "detail": "Priced from the brief, on the same rate as the requirements quote."
              },
              {
                "id": "step-10",
                "name": "Contract template",
                "detail": "The scope goes into the contract, readable before you sign."
              },
              {
                "id": "step-11",
                "name": "Product prototype",
                "detail": "With a product list, a note for each surface, and a prototype you can click."
              },
              {
                "id": "step-12",
                "name": "Site",
                "detail": "No code needed. It goes live fast, and AI maintains it after that."
              },
              {
                "id": "step-13",
                "name": "Compliance",
                "detail": "The tax on this job, calculated and written down. Tax is paid as required."
              }
            ],
            "teach": "Topics, quotes, and the contract. Follow the steps, and you can do them yourself.",
            "fitTitle": "If you can finish the work, you can use it",
            "fit": [
              {
                "id": "fit-1",
                "text": "A developer taking their own jobs"
              },
              {
                "id": "fit-2",
                "text": "A designer taking their own jobs"
              },
              {
                "id": "fit-3",
                "text": "A studio already delivering"
              }
            ],
            "includedTitle": "Buy the studio agent, included",
            "included": [
              {
                "id": "included-1",
                "text": "The operating curriculum"
              },
              {
                "id": "included-3",
                "text": "A peer community"
              },
              {
                "id": "included-4",
                "text": "The latest studio agent version, kept current"
              }
            ],
            "agentNote": "600 yuan a day and 12,000 a month are the custom-development rate. For the agent’s price, contact us.",
            "price": {
              "href": "/price/",
              "label": "See pricing ›"
            },
            "courseTitle": "Operating curriculum",
            "courseLead": "Buy the studio agent, and this curriculum comes with it. We teach you how to put this studio model into practice. Positioning, structure, profit, content, the sale, delivery, and compliance, in that order. You run it. You take the work. You deliver it.",
            "lessonsTitle": "In this order",
            "lessons": [
              {
                "id": "lesson-1",
                "name": "Positioning",
                "detail": "The front says the sites you build, and the development cost stays public."
              },
              {
                "id": "lesson-2",
                "name": "Structure",
                "detail": "The quote has no sales, no office, and no standing staff. The rate is public, tax included."
              },
              {
                "id": "lesson-7",
                "name": "Profit",
                "detail": "The work is not cheap. The structure is. The number does not change by who asks. The returning rate is for a repeat order. Under 22 days, the job is billed by the day. At 22 days, it is billed by the month. The studio plus AI writes what used to take a team. Tax is paid as required."
              },
              {
                "id": "lesson-3",
                "name": "Content",
                "detail": "Topics, drafts, a version for each platform, and a review at month’s end. Content brings people in."
              },
              {
                "id": "lesson-4",
                "name": "The sale",
                "detail": "One message, one client. Requirements, the quote, and the contract lined up in one pass."
              },
              {
                "id": "lesson-5",
                "name": "Delivery",
                "detail": "Source and documents go to the client. Progress is visible each week. The person responsible stays the same."
              },
              {
                "id": "lesson-6",
                "name": "Compliance",
                "detail": "The tax on the job is written down. Tax is paid as required."
              }
            ],
            "courseFitTitle": "If you want to run it yourself",
            "courseFit": [
              {
                "id": "course-fit-1",
                "text": "Already taking work, and want it as one system"
              },
              {
                "id": "course-fit-2",
                "text": "A studio whose content, quotes, and contracts are still separate"
              }
            ],
            "courseNote": "Buy the studio agent, and this curriculum is included.",
            "contact": {
              "href": "/contact/",
              "label": "Contact ›"
            }
          },
          "messages": {}
        }
      ] },
    }),
    price: defineModuleEntryData({
      id: 'price',
      routeKey: '/price',
      fields: { title: "Pricing | Linework Studio", description: "New clients: 600 yuan a day, 12,000 a month. Returning clients: 500 yuan a day, 10,000 a month. Tax included, one year of aftercare." },
      slots: { 'page.main': [
        {
          "id": "price-body",
          "key": "price-body",
          "settings": {
            "studio": "Studio",
            "h1": "Pricing",
            "lead": "The number does not change by who asks.",
            "columns": {
              "client": "Client",
              "day": "Per day",
              "month": "Per month"
            },
            "rows": [
              {
                "id": "row-1",
                "client": "New",
                "day": "600 yuan",
                "month": "12,000 yuan"
              },
              {
                "id": "row-2",
                "client": "Returning",
                "day": "500 yuan",
                "month": "10,000 yuan"
              }
            ],
            "note": "A returning client is a repeat order. 22 working days count as one month. Under 22 days, the whole job is billed by the day. Tax included.",
            "afterTitle": "After launch",
            "after": "Each job includes one year: bug fixes, server upkeep, and small adjustments. New features are quoted before work starts.",
            "invoiceTitle": "",
            "invoice": "",
            "freeTitle": "Free before you sign",
            "free": [
              {
                "id": "free-1",
                "text": "Say what you need"
              },
              {
                "id": "free-2",
                "text": "A basic requirements pass"
              },
              {
                "id": "free-3",
                "text": "A written quote, good for 15 days"
              }
            ],
            "freeNote": "No charge if you walk away. A full requirements pass and outside design are quoted separately. Basic design is inside the build days.",
            "whyTitle": "Why this number",
            "why": "No sales, no office, and no standing staff. The work is not cheap. The structure is. The rate is this studio’s rate. A smaller part is tax, paid as required.",
            "contact": {
              "href": "/contact/",
              "label": "Contact"
            },
            "quote": {
              "copy": {
                "title": "Quote calculator",
                "lead": "Person-days are a row in the service list. Services start checked. Turn off what you do not need. In the totals, change the client, and the contract total follows. Market price, reference only.",
                "scene": "Scope",
                "client": "Client",
                "invoice": "",
                "servicesTitle": "Service list",
                "quoteTitle": "Totals",
                "categories": [
                  {
                    "id": "app",
                    "label": "App"
                  },
                  {
                    "id": "mini",
                    "label": "Mini program"
                  },
                  {
                    "id": "site",
                    "label": "Corporate site"
                  },
                  {
                    "id": "shop",
                    "label": "Shopify store"
                  }
                ],
                "clients": [
                  {
                    "id": "new",
                    "label": "New"
                  },
                  {
                    "id": "returning",
                    "label": "Returning"
                  }
                ],
                "invoices": [
                  {
                    "id": "normal",
                    "label": ""
                  },
                  {
                    "id": "special",
                    "label": ""
                  }
                ],
                "included": [
                  {
                    "name": "Consultation",
                    "detail": "Say what you need. Free, even if you do not sign."
                  },
                  {
                    "name": "A basic quote",
                    "detail": "Free. Good for 15 days. The written quote is separate."
                  },
                  {
                    "name": "A basic requirements pass",
                    "detail": "Free, even if you do not sign."
                  },
                  {
                    "name": "Basic design",
                    "detail": "Inside the build days. Not a separate bill."
                  },
                  {
                    "name": "Page prototype",
                    "detail": "No separate charge."
                  },
                  {
                    "name": "Demo and test",
                    "detail": "Confirm on a demo, then the live site. Inside the build."
                  },
                  {
                    "name": "Updates and backups",
                    "detail": "Incremental updates, records, backups. Nothing overwritten, nothing lost. Inside the build."
                  },
                  {
                    "name": "Weekly progress",
                    "detail": "Inside the build."
                  },
                  {
                    "name": "Launch",
                    "detail": "Inside the build."
                  },
                  {
                    "name": "Source and documents",
                    "detail": "Source, documents, and design files come to you. Inside the build."
                  },
                  {
                    "name": "Acceptance",
                    "detail": "Checked line by line against the feature list. Inside the build."
                  },
                  {
                    "name": "The contract",
                    "detail": "No separate charge."
                  },
                  {
                    "name": "The schedule",
                    "detail": "Same scope, and the days run over: no extra charge."
                  },
                  {
                    "name": "One year after launch",
                    "detail": "With every job: bug fixes, server upkeep, small adjustments. A reply within 24 hours. New features are quoted first."
                  }
                ],
                "scenarios": [
                  {
                    "id": "app-client",
                    "category": "app",
                    "name": "One client app",
                    "detail": "No quoted person-days for an app yet. Fill them in.",
                    "days": null
                  },
                  {
                    "id": "app-admin",
                    "category": "app",
                    "name": "Client app + server",
                    "detail": "No quoted person-days for this shape yet. Fill them in.",
                    "days": null
                  },
                  {
                    "id": "mini-demand",
                    "category": "mini",
                    "name": "Client + admin, requirements pass",
                    "detail": "A real quote, client anonymized. 28.5 person-days.",
                    "days": 28.5
                  },
                  {
                    "id": "mini-product",
                    "category": "mini",
                    "name": "Same scope, split into a product list",
                    "detail": "The same job after the split. 41.5 person-days. Client anonymized.",
                    "days": 41.5
                  },
                  {
                    "id": "site-pages",
                    "category": "site",
                    "name": "A brochure site",
                    "detail": "No quoted person-days yet. Fill them in.",
                    "days": null
                  },
                  {
                    "id": "site-admin",
                    "category": "site",
                    "name": "A business admin on the desktop",
                    "detail": "A real quote, client anonymized. 18 person-days.",
                    "days": 18
                  },
                  {
                    "id": "shop-build",
                    "category": "shop",
                    "name": "A new store",
                    "detail": "No total was written down. Fill it in.",
                    "days": null
                  },
                  {
                    "id": "shop-extend",
                    "category": "shop",
                    "name": "Build, later changes, plugins, theme",
                    "detail": "The jewelry store was this scope, client anonymized. No total was written down.",
                    "days": null
                  }
                ],
                "functionName": "Build total",
                "serviceSum": "Service total",
                "otherName": "",
                "contractName": "Contract total",
                "payName": "A common split",
                "presets": [
                  {
                    "id": "domain",
                    "name": "Domain, 1 year",
                    "detail": "Turn it off if you do not need it. 80 is a reference, at market price.",
                    "amount": 0
                  },
                  {
                    "id": "server",
                    "name": "Server, 1 year",
                    "detail": "Turn it off if you do not need it. 1,500 is a reference. One job was 2 cores, 4 GB.",
                    "amount": 0
                  },
                  {
                    "id": "filing",
                    "name": "Server filing",
                    "detail": "Turn it off if you do not need it. 300 is a reference, at market price.",
                    "amount": 0
                  },
                  {
                    "id": "store",
                    "name": "App store listing",
                    "detail": "Turn it off if you do not need it. 300 is a reference, at market price.",
                    "amount": 0
                  },
                  {
                    "id": "print",
                    "name": "Third-party service",
                    "detail": "Turn it off if you do not need it. 500 is a reference, at market price.",
                    "amount": 0
                  },
                  {
                    "id": "design",
                    "name": "Outside design",
                    "detail": "Turn it off if you do not need it. 1,500 is a reference, at market price. Not folded into the day rate.",
                    "amount": 0
                  }
                ],
                "daysLabel": "Total person-days",
                "daysUnit": "day",
                "daysHint": "Counted per person, per day. Under 22 days, the day rate. From 22, months plus the remainder. Zero still shows a total. Turn it off and the days leave the build total.",
                "daysInvalid": "Use a number, with at most one decimal place.",
                "marketNote": "Checked by default. Turn one off and it leaves the total. The price can still be edited. Market price, reference only.",
                "addService": "Add a line",
                "customName": "Name",
                "removeService": "Remove",
                "valid": "Good for 15 days. A reference. The written quote is separate.",
                "hoursName": "Person-days",
                "rateName": "Rate",
                "calcName": "Calculation",
                "blankAmount": "This amount is not a number, so it stays out of the service total.",
                "yuanSuffix": "yuan",
                "notesTitle": "Included with this job"
              },
              "rates": {
                "newClient": {
                  "dayAmount": 600,
                  "monthAmount": 12000,
                  "day": "600",
                  "month": "12,000"
                },
                "returning": {
                  "dayAmount": 500,
                  "monthAmount": 10000,
                  "day": "500",
                  "month": "10,000"
                }
              }
            }
          },
          "messages": {}
        }
      ] },
    }),
    news: defineModuleEntryData({
      id: 'news',
      routeKey: '/news',
      fields: { title: "Notes | Linework Studio", description: "Quotes, jobs already done, and what the studio has seen." },
      slots: { 'page.main': [
        {
          "id": "news-list",
          "key": "news-list",
          "settings": {
            "studio": "Studio",
            "h1": "Notes",
            "lead": "Quotes, jobs already done, and what the studio has seen.",
            "placeholderCaption": "Placeholder"
          },
          "messages": {}
        }
      ] },
    }),
    contact: defineModuleEntryData({
      id: 'contact',
      routeKey: '/contact',
      fields: { title: "Contact | Linework Studio", description: "The studio is in Yubei District, Chongqing, China. Message “陈工不摸鱼” on Xiaohongshu, WeChat Channels, or Douyin, or email YAOCOREAI@gmail.com." },
      slots: { 'page.main': [
        {
          "id": "contact-body",
          "key": "contact-body",
          "settings": {
            "kicker": "Yubei, Chongqing, China",
            "h1": "Contact",
            "lead": "Say which site you need.",
            "body": "Message “陈工不摸鱼” on Xiaohongshu, WeChat Channels, or Douyin. Or email YAOCOREAI@gmail.com. Basic design sits inside the build days. A full requirements pass and outside design are quoted separately.",
            "stepsTitle": "How a job starts",
            "steps": [
              {
                "id": "step-1",
                "text": "Send the brief by message or email"
              },
              {
                "id": "step-2",
                "text": "A basic requirements pass is free, even if you do not sign"
              },
              {
                "id": "step-3",
                "text": "Days are estimated from ordinary market effort, not padded"
              },
              {
                "id": "step-4",
                "text": "A written quote, good for 15 days"
              },
              {
                "id": "step-5",
                "text": "Sign, start, and see progress every week"
              }
            ],
            "teamTitle": "Where",
            "mapTitle": "Wuyue Plaza, Central Park, Chongqing",
            "mapUrl": "https://www.google.com/maps/embed?pb=!1m13!1m8!1m3!1d6929.762422300062!2d106.5768!3d29.7232!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjnCsDQzJzIzLjUiTiAxMDbCsDM0JzM2LjUiRQ!5e0!3m2!1sen!2s!4v1790712489157!5m2!1sen!2s",
            "team": "Yubei, Chongqing. No street address. Progress every week. Source and docs are yours.",
            "price": {
              "href": "/price/",
              "label": "See pricing first ›"
            }
          },
          "messages": {}
        }
      ] },
    }),
    privacy: defineModuleEntryData({
      id: 'privacy',
      routeKey: '/privacy',
      fields: { title: "Privacy | Linework Studio", description: "This site does not ask for optional tracking. No account, no form." },
      slots: { 'page.main': [
        {
          id: "policy-body",
          key: "policy-body",
          settings: {
            h1: "Privacy",
            lead: "This site does not ask for optional tracking.",
            paragraphs: [
              { id: "p1", text: "There is no account and no form. To reach the studio, message “陈工不摸鱼” on Xiaohongshu, WeChat Channels, or Douyin, or email YAOCOREAI@gmail.com." },
              { id: "p2", text: "The contact page embeds a map. English loads Google Maps. Chinese loads Amap." },
              { id: "p3", text: "Published prices and the public jobs do not name the client." },
            ],
          },
          messages: {},
        },
      ] },
    }),
    cookies: defineModuleEntryData({
      id: 'cookies',
      routeKey: '/cookies',
      fields: { title: "Cookies | Linework Studio", description: "This site does not ask for optional cookies." },
      slots: { 'page.main': [
        {
          id: "policy-body",
          key: "policy-body",
          settings: {
            h1: "Cookies",
            lead: "This site does not ask for optional cookies.",
            paragraphs: [
              { id: "p1", text: "A privacy choice, if stored, uses one cookie named privacy_consent. It lasts 180 days." },
              { id: "p2", text: "Analytics, marketing, preferences, and sale of data are not requested." },
              { id: "p3", text: "The map on the contact page can store its own cookies. Those belong to the map site." },
            ],
          },
          messages: {},
        },
      ] },
    }),
  }),
});
