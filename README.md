# INFLUENCE

**Defense Lobbying & Foreign Funding Intelligence Platform**

Investigative OSINT tool that maps the influence network between U.S. defense contractors, Congress, foreign governments, FARA-registered lobby firms, revolving-door officials, and defense-funded think tanks.

Traces the full chain: **Foreign Government → Lobby Firm → Campaign Contribution → Congressional Committee → Arms Sale → Defense Contractor.**

No tool currently unifies FARA filings, defense contract data, congressional committee rosters, and arms sale records in a single searchable interface. Journalists and researchers at ProPublica, Quincy Institute, and OpenSecrets do this work manually across 5+ government databases. INFLUENCE automates the cross-referencing.

---

## Features

**Chain Tracer** — Select any two entities and trace every influence path connecting them. BFS pathfinding exposes multi-hop connections that take investigators hours to piece together manually. Example: Saudi Arabia → Brownstein Hyatt → Ed Royce (former HFAC Chair) → Senate Armed Services → Lockheed Martin → F-35I → Israel.

**Entity Profiles** — 190+ entities with plain-English summaries explaining who they are, what they do, and why they matter. Every summary is sourced from FARA filings, Quincy Institute research, OpenSecrets data, and congressional records.

**Network Graph** — Interactive D3.js force-directed visualization. Filter by connection type (arms sales, lobbying, revolving door, congressional oversight, think tank funding). Node size scales by degree centrality. Bridge nodes flagged in red.

**Graph Analysis Engine** — Degree centrality, betweenness centrality, bridge node detection, and a composite influence score. Quantifies what investigative journalists determine intuitively — who sits at the intersection of the most influence channels.

**Search** — Full-text search across all entities by name, country, committee, sector, title, or keyword. Results ranked by influence score.

---

## Data

All data is from public record. No API keys required. No authentication. 100% legal OSINT.

| Category | Count | Sources |
|---|---|---|
| Defense Contractors | 15 | SEC EDGAR, USAspending.gov (FY2023 contract values) |
| Congress Members | 14 | Congress.gov, committee rosters |
| Foreign Military Clients | 15 | DSCA notifications, SIPRI, FARA spending (OpenSecrets) |
| FARA Lobby Firms | 7 | FARA.gov (DOJ), OpenSecrets Foreign Lobby Watch |
| Revolving Door Individuals | 13 | SEC filings, FARA registrations, news reporting |
| Think Tanks | 7 | Annual reports, donor disclosures |
| **Verified Connections** | **120+** | Cross-referenced from all sources above |

### Key data points include:

- FY2023 DoD contract values for top defense contractors (USAspending.gov)
- FARA political activity counts and spending figures (Quincy Institute Brief No. 59, OpenSecrets)
- Specific FARA-disclosed contacts between lobby firms and Congress members
- Arms sale programs with dollar values (DSCA notifications)
- Revolving door timelines (e.g., Lloyd Austin: Raytheon board → SecDef → $1.4M compensation disclosed)
- Foreign government donations to think tanks (annual report disclosures)
- Campaign contributions from FARA-registered firms to Congress members (FEC/OpenSecrets)

---

## Getting Started

```bash
git clone https://github.com/dalibyte/INFLUENCE.git
cd influence-platform
npm install
npm start
```

Opens at `http://localhost:3000`.

No backend required. No API keys. No environment variables. Everything runs client-side.

### Deploy

```bash
npm run build
```

Deploy the `build/` folder to Vercel, Netlify, or GitHub Pages.

---

## Architecture

```
src/
  App.js          # Single-file React application
                  #   - ENTITIES[]     190+ entity records with summaries
                  #   - EDGES[]        120+ verified connections
                  #   - analyzeNetwork()  Graph analysis (centrality, bridges)
                  #   - findChains()     BFS chain tracer
                  #   - InfluencePlatform()  Main UI component (search, profile, graph views)
```

**Tech stack:** React 18, D3.js (force simulation, zoom, drag), Tailwind-style inline CSS.

The application is intentionally a single file. All data is embedded — no database, no API calls, no external dependencies beyond React and D3. This makes it portable, forkable, and deployable anywhere static files can be served.

---

## How the Chain Tracer Works

The chain tracer runs breadth-first search across the full entity graph. Given a start and end entity, it finds all paths up to 5 hops and returns them ranked by length.

Example query: **Saudi Arabia → Israel**

```
Path 1 (3 hops):
  Saudi Arabia → Patriot, Paveway, Stinger → RTX Corporation
  RTX Corporation → Iron Dome co-production, David's Sling → Israel

Path 2 (4 hops):
  Saudi Arabia → FARA: 107 dinners for Ambassador → Brownstein Hyatt Farber
  Brownstein Hyatt Farber → Begich met Reed (S. Korea) → Sen. Jack Reed
  Sen. Jack Reed → SASC: AUKUS oversight → Australia
  ...continues to Israel via shared defense contractors
```

This is the core differentiator. OpenSecrets has the raw data. FARA.gov has the filings. Neither connects them. INFLUENCE does.

---

## Methodology & Limitations

**What this tool does well:**
- Surfaces verified, documented connections from public record
- Quantifies network position through graph analysis
- Makes cross-database research accessible without specialized knowledge

**What this tool does NOT do:**
- Discover hidden or illegal connections (it only maps what's publicly disclosed)
- Replace investigative journalism (it's a research accelerator, not a replacement)
- Provide real-time data (the current version uses curated data; live API integration is planned)

**Data limitations:**
- FARA filings are self-reported and may undercount actual lobbying activity
- AIPAC and similar domestic lobby groups are not FARA-registered, creating blind spots
- Campaign contribution data is limited to disclosed FARA-linked contributions
- Think tank donor data comes from voluntary disclosures and may be incomplete
- The revolving door dataset focuses on high-profile cases; hundreds of lower-profile cases exist

---

## Roadmap

- [ ] **Phase 2: Live data** — Node.js backend proxying FARA.gov, FEC, USAspending, and DSCA APIs
- [ ] **FEC integration** — Campaign contribution data linked to FARA-registered individuals
- [ ] **Timeline view** — Visualize how relationships change over time (lobbying spikes around NDAA votes)
- [ ] **Export** — PDF/CSV reports for researchers
- [ ] **Expanded dataset** — 500+ entities covering all active FARA registrations

---

## Sources & References

- [FARA.gov](https://fara.gov) — Foreign Agents Registration Act filings (DOJ)
- [OpenSecrets Foreign Lobby Watch](https://www.opensecrets.org/fara) — FARA analysis and campaign finance
- [USAspending.gov](https://usaspending.gov) — Federal contract award data
- [Quincy Institute](https://quincyinst.org/research/foreign-lobbying-in-the-u-s/) — "Foreign Lobbying in the U.S." (Brief No. 59, July 2024)
- [Quincy Institute](https://quincyinst.org/research/the-emirati-lobby-in-america/) — "The Emirati Lobby in America" (December 2022)
- [DSCA](https://www.dsca.mil/press-media/major-arms-sales) — Defense Security Cooperation Agency major arms sale notifications
- [Congress.gov](https://www.congress.gov/committees) — Committee rosters and membership
- [POGO](https://www.pogo.org) — Project on Government Oversight FARA research
- [Defense Security Monitor](https://dsm.forecastinternational.com) — Top 100 Defense Contractors rankings

---

## License

MIT
