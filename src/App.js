import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";

// ============================================================================
// INFLUENCE — Defense Lobbying & Foreign Funding Intelligence Platform
// Traces the chain: Foreign Government → Lobby Firm → Campaign $ → Committee → Arms Sale
// All data from public record: FARA (DOJ), OpenSecrets, USAspending, DSCA, Congress.gov
// ============================================================================

// ===== DATA LAYER =====

const ENTITIES = [
  // DEFENSE CONTRACTORS
  { id: "lmt", label: "Lockheed Martin", type: "company", sector: "Defense Prime", contracts: "$45.5B", hq: "Bethesda, MD", ticker: "LMT", summary: "World's largest defense contractor. Manufactures F-35 Joint Strike Fighter, THAAD missile defense, Aegis combat systems, Sikorsky helicopters. Sole source for most US fighter production. Every major US ally buys Lockheed products." },
  { id: "rtx", label: "RTX Corporation", type: "company", sector: "Defense Prime", contracts: "$27.4B", hq: "Arlington, VA", ticker: "RTX", summary: "Formed from Raytheon-UTC merger (2020). Manufactures Patriot missile defense, Stinger MANPADS, Pratt & Whitney jet engines, Tomahawk cruise missiles. Two former Secretaries of Defense (Austin, Esper) came directly from Raytheon." },
  { id: "ba", label: "Boeing", type: "company", sector: "Defense/Aerospace", contracts: "$23.9B", hq: "Arlington, VA", ticker: "BA", summary: "F-15 Eagle/Strike Eagle, F/A-18 Super Hornet, AH-64 Apache, KC-46 tanker, P-8 Poseidon. Moved HQ from Chicago to Arlington (2022) to be closer to Pentagon. Former Boeing SVP Patrick Shanahan served as Acting SecDef." },
  { id: "noc", label: "Northrop Grumman", type: "company", sector: "Defense Prime", contracts: "$15.3B", hq: "Falls Church, VA", ticker: "NOC", summary: "B-21 Raider stealth bomber, Global Hawk/Triton UAV, James Webb Telescope, AARGM-ER anti-radiation missile. Sole builder of America's next-generation bomber." },
  { id: "gd", label: "General Dynamics", type: "company", sector: "Defense Prime", contracts: "$15.9B", hq: "Reston, VA", ticker: "GD", summary: "M1 Abrams tank, Virginia-class submarines, Columbia-class ballistic missile subs, Gulfstream jets, GDIT (IT services). James Mattis sat on GD's board before and after serving as SecDef." },
  { id: "lhx", label: "L3Harris Technologies", type: "company", sector: "Defense Electronics", contracts: "$8.1B", hq: "Melbourne, FL", ticker: "LHX", summary: "ISR systems, electronic warfare, space payloads, tactical radios. Formed from L3-Harris merger (2019). Critical supplier of communications equipment to every service branch." },
  { id: "bah", label: "Booz Allen Hamilton", type: "company", sector: "Defense Consulting", contracts: "$7.2B", hq: "McLean, VA", ticker: "BAH", summary: "Largest defense/intelligence consulting firm. AI, cyber, analytics for DoD and IC. Michele Flournoy (co-founder of WestExec Advisors, perennial SecDef candidate) sits on the board." },
  { id: "pltr", label: "Palantir Technologies", type: "company", sector: "Defense Tech", contracts: "$1.8B", hq: "Denver, CO", ticker: "PLTR", summary: "Gotham (intelligence community), Foundry (commercial), Maven Smart System, TITAN targeting system. Founded by Peter Thiel. Controversial for ICE and IDF contracts." },
  { id: "ldos", label: "Leidos", type: "company", sector: "Defense IT", contracts: "$10.4B", hq: "Reston, VA", ticker: "LDOS", summary: "Former SAIC defense unit. Managed IT, cybersecurity, intelligence analysis. Major NASA and DoD contractor. Reston, VA defense corridor." },
  { id: "hii", label: "Huntington Ingalls", type: "company", sector: "Shipbuilding", contracts: "$8.8B", hq: "Newport News, VA", ticker: "HII", summary: "Sole builder of US aircraft carriers (Newport News). Primary submarine builder. Critical to AUKUS submarine program with Australia. Sen. Warner (VA) and Sen. Wicker (MS/Ingalls) have direct district ties." },
  { id: "caci", label: "CACI International", type: "company", sector: "Defense IT", contracts: "$4.2B", hq: "Reston, VA", ticker: "CACI", summary: "C4ISR, cyber, electronic warfare. Acquired L3Harris NSS division for $7.5B. Growing rapidly in defense IT space." },
  { id: "anduril", label: "Anduril Industries", type: "company", sector: "Defense Tech", contracts: "$1.2B (est)", hq: "Costa Mesa, CA", summary: "Founded by Palmer Luckey (Oculus VR). Lattice AI platform, Ghost drones, autonomous systems. Entered Top 100 defense contractors at #74. Represents Silicon Valley's entry into defense." },
  { id: "spacex", label: "SpaceX", type: "company", sector: "Space/Defense", contracts: "$2.8B (est)", hq: "Hawthorne, CA", summary: "Starshield (classified DoD constellation), Starlink military terminals (Ukraine), launch services. Jumped from #53 to #28 in Top 100. Elon Musk's defense footprint growing rapidly." },
  { id: "ge", label: "GE Aerospace", type: "company", sector: "Defense Engines", contracts: "$5.1B", hq: "Evendale, OH", ticker: "GE", summary: "F110 (F-16), F414 (F/A-18), T700 (Apache/Black Hawk) engines. Powers majority of US and allied military aircraft. Rep. Turner's (HPSCI Chair) district." },
  { id: "kbr", label: "KBR Inc", type: "company", sector: "Defense Services", contracts: "$3.4B", hq: "Houston, TX", ticker: "KBR", summary: "Former Halliburton subsidiary (spun off 2007). Base operations, logistics, space technology. Iraq/Afghanistan logistics controversy." },

  // CONGRESS
  { id: "cm_wicker", label: "Sen. Roger Wicker (R-MS)", type: "congress", committee: "Senate Armed Services", role: "Chairman", summary: "Chairman of the Senate Armed Services Committee. Controls the $886B National Defense Authorization Act. Ingalls Shipbuilding (HII) is the largest private employer in Mississippi — Wicker's state." },
  { id: "cm_reed", label: "Sen. Jack Reed (D-RI)", type: "congress", committee: "Senate Armed Services", role: "Ranking Member", summary: "Ranking Member SASC. West Point graduate and former Army Ranger. Has served on SASC longer than any current member. Key voice on AUKUS and alliance policy." },
  { id: "cm_rogers", label: "Rep. Mike Rogers (R-AL)", type: "congress", committee: "House Armed Services", role: "Chairman", summary: "Chairman of the House Armed Services Committee. Redstone Arsenal (Army missile command, NASA Marshall) is in his Alabama district. Key advocate for F-35, AUKUS, and missile defense funding." },
  { id: "cm_smith", label: "Rep. Adam Smith (D-WA)", type: "congress", committee: "House Armed Services", role: "Ranking Member", summary: "Ranking Member HASC. Boeing's corporate HQ relocated to his district area. Former HASC Chairman (2019-2023). American Defense International arranged a dinner between UAE Ambassador Otaiba and Smith." },
  { id: "cm_risch", label: "Sen. Jim Risch (R-ID)", type: "congress", committee: "Senate Foreign Relations", role: "Chairman", summary: "Chairman of the Senate Foreign Relations Committee. Has hold/release authority over Foreign Military Sales notifications. Lobbied by Squire Patton Boggs (Saudi) and Hogan Lovells (Japan/Qatar)." },
  { id: "cm_cardin", label: "Sen. Ben Cardin (D-MD)", type: "congress", committee: "Senate Foreign Relations", role: "Member", summary: "Former SFRC Chairman. Author of the Global Magnitsky Act. Maryland's defense corridor includes Leidos, BAH, NSA, and Ft. Meade. Key voice on Israel Iron Dome supplemental funding ($1B)." },
  { id: "cm_mccaul", label: "Rep. Michael McCaul (R-TX)", type: "congress", committee: "House Foreign Affairs", role: "Chairman", summary: "Chairman of the House Foreign Affairs Committee. Top defense PAC recipient in the House. Leading advocate for Taiwan arms sales. BGR Group lobbied his staff on India's behalf through a former HFAC staffer." },
  { id: "cm_warner", label: "Sen. Mark Warner (D-VA)", type: "congress", committee: "Senate Intelligence", role: "Vice Chairman", summary: "Vice Chairman of Senate Select Committee on Intelligence. Former telecom executive. Virginia is home to more defense contractors than any other state — BAH, Northrop, Leidos, SAIC, HII, CACI all HQ'd there." },
  { id: "cm_turner", label: "Rep. Mike Turner (R-OH)", type: "congress", committee: "House Intelligence", role: "Chairman", summary: "Chairman of the House Permanent Select Committee on Intelligence. Wright-Patterson AFB and GE Aviation are in his Ohio district. Nuclear deterrence and space intelligence advocate." },
  { id: "cm_cotton", label: "Sen. Tom Cotton (R-AR)", type: "congress", committee: "Senate Armed Services", role: "Member", summary: "SASC member. Army veteran with deployments to Afghanistan and Iraq. Leading defense hawk and China hawk. Strong advocate for Taiwan arms sales and Israel munitions resupply." },
  { id: "cm_rubio", label: "Marco Rubio", type: "congress", committee: "Secretary of State (former SSCI)", role: "Secretary of State", summary: "Now Secretary of State (2025-). Former Vice Chairman of SSCI. Shaped China/Taiwan policy from Senate. As SecState, has direct authority over Foreign Military Sales approvals." },
  { id: "cm_paul", label: "Sen. Rand Paul (R-KY)", type: "congress", committee: "Senate Foreign Relations", role: "Member", summary: "SFRC member. Frequent opponent of arms sales — tried to block Saudi Arabia's $2.2B C-130 sale and introduced resolutions against Saudi and Egyptian weapons transfers. Rare bipartisan resistance voice." },
  { id: "cm_menendez", label: "Sen. Bob Menendez (D-NJ)", type: "congress", committee: "Senate Foreign Relations", role: "Former Chairman (convicted)", summary: "Former SFRC Chairman. Convicted in 2024 on federal charges including acting as a foreign agent for Egypt. Gold bars and cash found in home. Had used SFRC authority to influence arms sales and military aid to Egypt." },
  { id: "cm_gallego", label: "Rep. Ruben Gallego (D-AZ)", type: "congress", committee: "House Armed Services", role: "Member", summary: "HASC member. Marine veteran (Iraq). Received $3,300 campaign contribution from American Defense International CEO Michael Herson — ADI is a FARA-registered firm lobbying for the UAE on military sales." },

  // FOREIGN PRINCIPALS
  { id: "fa_sa", label: "Saudi Arabia", type: "foreign_principal", country: "Saudi Arabia", summary: "Largest US arms customer. $110B arms deal signed 2017. Hired 22 lobbying firms in 2016-17 to fight JASTA (9/11 victims bill). Brownstein arranged 107 dinners for Saudi Ambassador. $14M+ in FARA-reported spending 2022-23. Arms include F-15SA ($29.4B), Abrams tanks, THAAD, Patriot, Paveway bombs." },
  { id: "fa_uae", label: "United Arab Emirates", type: "foreign_principal", country: "UAE", summary: "25 FARA-registered firms in 2020-21. 10,765 lobbying contacts reported. $64M+ paid to US firms. 3rd largest US weapons recipient. F-35 sale approved then paused. Patriot/THAAD customer. ADI arranged dinners between UAE Ambassador Otaiba and Congress members including Adam Smith." },
  { id: "fa_taiwan", label: "Taiwan (TECRO)", type: "foreign_principal", country: "Taiwan", summary: "$19B in US arms sales since 2017. F-16V, M1A2T Abrams ($2.2B), PAC-3 Patriot, Harpoon missiles, HIMARS. Represented in DC via TECRO and Akin Gump. Bipartisan congressional support — McCaul, Cotton, Rubio all champions." },
  { id: "fa_japan", label: "Japan", type: "foreign_principal", country: "Japan", summary: "$48.5M FARA spending in 2024 — most of any country. Largest F-35 customer outside US ($23B+). Raytheon NGI interceptors ($1.94B). JETRO trade org secured meetings with governors and Congress. Represented by Hogan Lovells and Akin Gump." },
  { id: "fa_israel", label: "Israel", type: "foreign_principal", country: "Israel", summary: "$3.8B/yr MOU (2019-2028). F-35I Adir (50+ delivered), Arrow-3 co-development, Iron Dome co-production (RTX manufactures Tamir interceptors in US), David's Sling. QME provision means ALL Middle East arms sales must preserve Israel's qualitative military edge. AIPAC is NOT FARA-registered — Quincy Institute and OpenSecrets flag this as a double standard compared to Saudi/UAE enforcement." },
  { id: "fa_australia", label: "Australia", type: "foreign_principal", country: "Australia", summary: "AUKUS Pillar 1: $368B nuclear submarine program (Virginia-class from GD/HII, then SSN-AUKUS). Pillar 2: AI, quantum, hypersonics tech sharing. Also buys F-35A, P-8A, EA-18G, Triton. Deepening Five Eyes defense integration." },
  { id: "fa_qatar", label: "Qatar", type: "foreign_principal", country: "Qatar", summary: "F-15QA buyer ($12B from Boeing). Hosts Al Udeid Air Base — largest US military installation in the Middle East. Represented by Hogan Lovells and BGR Group. Also funded Brookings Institution programs." },
  { id: "fa_skorea", label: "South Korea", type: "foreign_principal", country: "South Korea", summary: "Brownstein FARA client. Former Sen. Begich met SASC Chair Reed on South Korea's behalf regarding NDAA amendments. KF-21 fighter co-development. Arctic Council interests lobbied through Brownstein." },
  { id: "fa_india", label: "India", type: "foreign_principal", country: "India", summary: "BGR Group FARA client. MQ-9B Predator drone deal ($3.9B). iCET tech-sharing framework. Boeing P-8I, Apache, Chinook sales. GE F414 engines for indigenous Tejas Mk2 fighter. BGR's Hunter Strupp (former HFAC staff) handles the account." },
  { id: "fa_egypt", label: "Egypt", type: "foreign_principal", country: "Egypt", summary: "$1.3B/yr in US military aid. C-130 sale ($2.2B) that Sen. Paul tried to block. Sen. Menendez convicted of acting as Egyptian agent — used SFRC authority to influence arms sales. Brownstein FARA registrant. Former HFAC Chair Royce lobbies for Egypt via Brownstein." },
  { id: "fa_morocco", label: "Morocco", type: "foreign_principal", country: "Morocco", summary: "Akin Gump FARA client. Western Sahara sovereignty recognition linked to Abraham Accords. F-16V buyer. Former HFAC Chair Ed Royce lobbies for Morocco via Brownstein." },
  { id: "fa_ukraine", label: "Ukraine", type: "foreign_principal", country: "Ukraine", summary: "BGR Group FARA client. $175B+ US aid since 2022. BGR coordinated 15 congressional meetings in a single day (July 26, 2022) for Ukrainian politician Vadym Ivchenko. Starlink terminals (DoD-funded via SpaceX). NDAA provisions for continued support." },
  { id: "fa_uk", label: "United Kingdom", type: "foreign_principal", country: "United Kingdom", summary: "AUKUS Pillar 1 (nuclear subs) and Pillar 2 (tech sharing). GCAP 6th-gen fighter with Italy/Japan. Five Eyes intelligence alliance. Deepest bilateral defense relationship after Israel." },
  { id: "fa_poland", label: "Poland", type: "foreign_principal", country: "Poland", summary: "AARGM-ER ($2B from Northrop). 250 M1A2 Abrams tanks from GD. HIMARS from Lockheed. F-35 buyer. Largest European defense spending increase post-Ukraine invasion." },
  { id: "fa_azerbaijan", label: "Azerbaijan", type: "foreign_principal", country: "Azerbaijan", summary: "BGR Group FARA client. NDAA monitoring. Controversial due to Nagorno-Karabakh military operations against Armenia. Oil wealth funds active DC lobbying presence." },

  // LOBBY FIRMS
  { id: "lf_squire", label: "Squire Patton Boggs", type: "lobby_firm", summary: "Major FARA registrant for Saudi Arabia. Lobbies SFRC Chair Risch and SASC Chair Wicker on FMS approvals. Bipartisan government affairs practice." },
  { id: "lf_akin", label: "Akin Gump Strauss", type: "lobby_firm", summary: "$1.8M+ FARA income in 2023 alone. Clients: UAE, Morocco, Taiwan (via TECRO), Japan. Staff includes former Rep. Ileana Ros-Lehtinen (ex-HFAC Chair) who lobbies for UAE. Lobbied NDAA on behalf of UAE and Morocco." },
  { id: "lf_hogan", label: "Hogan Lovells", type: "lobby_firm", summary: "FARA registrant for Japan and Qatar. Defense trade advisory. Helps Japanese interests lobby Congress on defense and economic development issues." },
  { id: "lf_bgr", label: "BGR Group", type: "lobby_firm", summary: "16,866 political activities reported in 2022-23 — highest volume of any FARA firm. Clients: Azerbaijan, India, Ukraine, Qatar, Uzbekistan, South Korea, Bangladesh, Serbia, Panama. $2M+ FARA income. Staff includes former HFAC Asia subcommittee staff director Hunter Strupp." },
  { id: "lf_brownstein", label: "Brownstein Hyatt Farber", type: "lobby_firm", summary: "$49M total lobbying in 2023, of which $2.8M was FARA. Arranged 107 dinners for Saudi Arabia's Ambassador Reema bint Bandar al-Saud. Staff includes former Sens. Begich and Pryor, former HFAC Chair Ed Royce. Clients: Saudi Arabia, South Korea, Egypt, Cambodia, Morocco." },
  { id: "lf_adi", label: "American Defense Intl", type: "lobby_firm", summary: "UAE subcontractor via Akin Gump. CEO Michael Herson arranged dinners between UAE Ambassador Yousef Al Otaiba and Congress members including Adam Smith (HASC Ranking). Made $3,300 campaign contribution to Rep. Gallego (HASC)." },
  { id: "lf_mercury", label: "Mercury Public Affairs", type: "lobby_firm", summary: "FARA registrant for Chinese military-linked corporation Hikvision. Also Turkey and Qatar clients. Bipartisan firm with former senator on staff." },

  // THINK TANKS
  { id: "tt_csis", label: "CSIS", type: "think_tank", summary: "Center for Strategic and International Studies. Corporate donors include Lockheed Martin, RTX, Northrop Grumman, Boeing. Kathleen Hicks was Senior VP at CSIS before becoming Deputy Secretary of Defense. Major pipeline for Democratic and Republican defense appointees." },
  { id: "tt_heritage", label: "Heritage Foundation", type: "think_tank", summary: "Conservative think tank. Defense industry donors include Lockheed Martin. Publishes annual Index of Military Strength that shapes NDAA debates. James Anderson was Heritage fellow before becoming Acting Under Secretary of Defense for Policy." },
  { id: "tt_cnas", label: "CNAS", type: "think_tank", summary: "Center for a New American Security. Co-founded by Michele Flournoy. Corporate donors: Lockheed, RTX, Northrop. Ely Ratner was CNAS VP before becoming Assistant Secretary of Defense for Indo-Pacific. Major pipeline for Democratic defense appointees." },
  { id: "tt_westexec", label: "WestExec Advisors", type: "think_tank", summary: "Strategic advisory firm co-founded by Michele Flournoy and Tony Blinken (now Secretary of State). Defense contractor clients. Biden administration sourced heavily from WestExec — critics call it a 'shadow government in waiting.' Flournoy also sits on Booz Allen board." },
  { id: "tt_brookings", label: "Brookings Institution", type: "think_tank", summary: "Centrist think tank. Foreign government donors include Qatar and UAE (disclosed). Saban Center for Middle East Policy was Israel-focused and Israeli-American funded. Defense contractor donors." },
  { id: "tt_atlantic", label: "Atlantic Council", type: "think_tank", summary: "Receives funding from UAE, defense contractors, NATO allies. Scowcroft Center for Strategy and Security focuses on defense policy. Foreign government funding from multiple countries." },
  { id: "tt_hudson", label: "Hudson Institute", type: "think_tank", summary: "Conservative think tank with strong Japan, Taiwan, and defense focus. Foreign government funding from Japan and Taiwan disclosed. Hosts events with defense officials and allied diplomats." },

  // REVOLVING DOOR INDIVIDUALS
  { id: "kp_austin", label: "Lloyd Austin", type: "revolving_door", title: "Former SecDef / Raytheon Board", summary: "Secretary of Defense 2021-2025. Sat on Raytheon (now RTX) board of directors before appointment, earning $1.4M in compensation. Retired 4-star Army general. Required congressional waiver of 7-year cooling-off period. Classic revolving door case." },
  { id: "kp_esper", label: "Mark Esper", type: "revolving_door", title: "Former SecDef / Raytheon VP", summary: "Secretary of Defense 2019-2020. Served as Raytheon's VP of Government Relations for 7 years before joining the Pentagon. Now sits on boards of multiple defense-adjacent firms." },
  { id: "kp_mattis", label: "James Mattis", type: "revolving_door", title: "Former SecDef / GD Board", summary: "Secretary of Defense 2017-2019. Sat on General Dynamics board before appointment and returned to private sector after. Also served on Theranos board. Known as 'Warrior Monk.'" },
  { id: "kp_shanahan", label: "Patrick Shanahan", type: "revolving_door", title: "Former Acting SecDef / Boeing SVP", summary: "Acting Secretary of Defense 2019. Spent 31 years at Boeing as Senior VP. Pentagon Inspector General investigated him for alleged Boeing favoritism while in office." },
  { id: "kp_hicks", label: "Kathleen Hicks", type: "revolving_door", title: "Former DepSecDef / CSIS", summary: "Deputy Secretary of Defense 2021-2025. Was Senior VP at CSIS (think tank funded by Lockheed, RTX, Northrop, Boeing) immediately before appointment. PhD in political science from MIT." },
  { id: "kp_flournoy", label: "Michele Flournoy", type: "revolving_door", title: "WestExec / CNAS / Booz Allen", summary: "Co-founded both WestExec Advisors and CNAS. Sits on Booz Allen Hamilton board. Former Under Secretary of Defense for Policy under Obama. Was top candidate for SecDef in Biden admin. Connects think tank, consulting, and defense contractor worlds." },
  { id: "kp_blinken", label: "Tony Blinken", type: "revolving_door", title: "SecState / WestExec co-founder", summary: "Secretary of State 2021-2025. Co-founded WestExec Advisors with Flournoy. As SecState, has direct authority over Foreign Military Sales approvals. WestExec had defense contractor clients." },
  { id: "kp_ratner", label: "Ely Ratner", type: "revolving_door", title: "ASD Indo-Pacific / CNAS", summary: "Assistant Secretary of Defense for Indo-Pacific Affairs 2021-2025. Was VP at CNAS (funded by defense contractors) immediately before appointment. Key architect of AUKUS and Taiwan policy." },
  { id: "kp_ros_lehtinen", label: "Ileana Ros-Lehtinen", type: "revolving_door", title: "Former Rep / Akin Gump (UAE)", summary: "Former Chair of the House Foreign Affairs Committee. Now a lobbyist at Akin Gump registered under FARA for the UAE. Admitted in her FARA filing that she was once a 'skeptic' of the UAE but changed her mind." },
  { id: "kp_begich", label: "Mark Begich", type: "revolving_door", title: "Former Sen / Brownstein (S. Korea)", summary: "Former Senator from Alaska (D). Joined Brownstein as strategic advisor in 2015 — the same year he left Congress. Personally met with SASC Chairman Jack Reed on behalf of South Korea regarding NDAA amendments." },
  { id: "kp_royce", label: "Ed Royce", type: "revolving_door", title: "Former HFAC Chair / Brownstein", summary: "Former Chairman of the House Foreign Affairs Committee — the committee that oversees foreign military sales. Now a Brownstein lobbyist registered under FARA for Saudi Arabia, Egypt, Cambodia, and Morocco." },
  { id: "kp_menendez_person", label: "Bob Menendez (convicted)", type: "revolving_door", title: "Former Sen / Foreign Agent (Egypt)", summary: "Former Chairman of the Senate Foreign Relations Committee. Convicted in 2024 on federal charges including acting as a foreign agent for Egypt. Used SFRC authority to influence military aid to Egypt. Gold bars and cash found in home." },
  { id: "kp_strupp", label: "Hunter Strupp", type: "revolving_door", title: "BGR / Former HFAC Staff", summary: "BGR Group senior director. Former staff director of the House Foreign Affairs Subcommittee on Asia. Now handles BGR's India FARA account, lobbying his former colleagues on India's behalf." },
];

// ===== EDGES =====
const EDGES = [
  // REVOLVING DOOR
  { id: "e1", source: "kp_austin", target: "rtx", label: "Board Member ($1.4M comp)", edgeType: "revolving_door" },
  { id: "e2", source: "kp_esper", target: "rtx", label: "VP Gov Relations (7 yrs)", edgeType: "revolving_door" },
  { id: "e3", source: "kp_mattis", target: "gd", label: "Board Member (pre & post)", edgeType: "revolving_door" },
  { id: "e4", source: "kp_shanahan", target: "ba", label: "SVP (31 years)", edgeType: "revolving_door" },
  { id: "e5", source: "kp_flournoy", target: "bah", label: "Board Member", edgeType: "revolving_door" },
  { id: "e5b", source: "kp_flournoy", target: "tt_cnas", label: "Co-Founder", edgeType: "consulting" },
  { id: "e5c", source: "kp_flournoy", target: "tt_westexec", label: "Co-Founder", edgeType: "consulting" },
  { id: "e6", source: "kp_flournoy", target: "pltr", label: "Advisory (WestExec)", edgeType: "consulting" },
  { id: "e6b", source: "kp_blinken", target: "tt_westexec", label: "Co-Founder", edgeType: "consulting" },
  { id: "e6c", source: "kp_ratner", target: "tt_cnas", label: "Former VP", edgeType: "consulting" },
  { id: "e6d", source: "kp_hicks", target: "tt_csis", label: "Former Senior VP", edgeType: "consulting" },
  { id: "e6e", source: "kp_menendez_person", target: "cm_menendez", label: "Same person (indicted)", edgeType: "consulting" },
  // Former Congress → Lobby
  { id: "e_rd1", source: "kp_ros_lehtinen", target: "lf_akin", label: "Lobbyist (former HFAC Chair)", edgeType: "revolving_door" },
  { id: "e_rd2", source: "kp_ros_lehtinen", target: "fa_uae", label: "FARA agent for UAE", edgeType: "lobbying" },
  { id: "e_rd3", source: "kp_begich", target: "lf_brownstein", label: "Strategic advisor (former Sen)", edgeType: "revolving_door" },
  { id: "e_rd5", source: "kp_royce", target: "lf_brownstein", label: "Lobbyist (former HFAC Chair)", edgeType: "revolving_door" },
  { id: "e_rd6", source: "kp_royce", target: "fa_sa", label: "FARA agent for Saudi", edgeType: "lobbying" },
  { id: "e_rd7", source: "kp_royce", target: "fa_egypt", label: "FARA agent for Egypt", edgeType: "lobbying" },
  { id: "e_rd8", source: "kp_royce", target: "fa_morocco", label: "FARA agent for Morocco", edgeType: "lobbying" },
  { id: "e_rd9", source: "kp_strupp", target: "lf_bgr", label: "Senior Dir (former HFAC staff)", edgeType: "revolving_door" },
  { id: "e_rd10", source: "kp_strupp", target: "fa_india", label: "FARA agent for India", edgeType: "lobbying" },
  { id: "e_rd11", source: "kp_menendez_person", target: "fa_egypt", label: "Convicted: foreign agent", edgeType: "lobbying" },
  { id: "e_rd4", source: "kp_begich", target: "cm_reed", label: "Met Reed re: S. Korea NDAA", edgeType: "lobbying" },

  // DISTRICT TIES
  { id: "e7", source: "cm_smith", target: "ba", label: "District: Boeing HQ (WA)", edgeType: "district" },
  { id: "e8", source: "cm_warner", target: "bah", label: "State: BAH HQ (VA)", edgeType: "district" },
  { id: "e9", source: "cm_warner", target: "noc", label: "State: NOC HQ (VA)", edgeType: "district" },
  { id: "e9b", source: "cm_warner", target: "ldos", label: "State: Leidos HQ (VA)", edgeType: "district" },
  { id: "e9c", source: "cm_warner", target: "hii", label: "State: HII Newport News (VA)", edgeType: "district" },
  { id: "e11b", source: "cm_wicker", target: "hii", label: "State: Ingalls shipyard (MS)", edgeType: "district" },
  { id: "e12b", source: "cm_turner", target: "ge", label: "District: GE Aviation (OH)", edgeType: "district" },
  { id: "e12c", source: "cm_cardin", target: "ldos", label: "State: MD defense corridor", edgeType: "district" },

  // OVERSIGHT
  { id: "e10", source: "cm_rogers", target: "lmt", label: "HASC: F-35, missile defense", edgeType: "oversight" },
  { id: "e11", source: "cm_wicker", target: "lmt", label: "SASC: NDAA authorization", edgeType: "oversight" },
  { id: "e12", source: "cm_mccaul", target: "lmt", label: "HFAC: FMS authorizations", edgeType: "oversight" },
  { id: "e12d", source: "cm_cotton", target: "lmt", label: "SASC: defense hawk", edgeType: "oversight" },
  { id: "e12f", source: "cm_rubio", target: "lmt", label: "SecState: FMS authority", edgeType: "oversight" },

  // ARMS SALES
  { id: "e13", source: "lmt", target: "fa_sa", label: "THAAD, F-35 (pending)", edgeType: "arms_sale" },
  { id: "e14", source: "lmt", target: "fa_taiwan", label: "F-16V, PAC-3, HIMARS", edgeType: "arms_sale" },
  { id: "e15", source: "lmt", target: "fa_japan", label: "F-35A/B ($23B+)", edgeType: "arms_sale" },
  { id: "e16", source: "lmt", target: "fa_australia", label: "F-35A, Aegis", edgeType: "arms_sale" },
  { id: "e16b", source: "lmt", target: "fa_poland", label: "HIMARS, F-35, AARGM-ER", edgeType: "arms_sale" },
  { id: "e16c", source: "lmt", target: "fa_uk", label: "F-35B, GCAP support", edgeType: "arms_sale" },
  { id: "e16d", source: "lmt", target: "fa_skorea", label: "F-35A, Aegis", edgeType: "arms_sale" },
  { id: "e16e", source: "lmt", target: "fa_israel", label: "F-35I Adir (50+), Arrow-3, THAAD", edgeType: "arms_sale" },
  { id: "e17", source: "rtx", target: "fa_sa", label: "Patriot, Paveway, Stinger", edgeType: "arms_sale" },
  { id: "e18", source: "rtx", target: "fa_uae", label: "Patriot, THAAD (pending)", edgeType: "arms_sale" },
  { id: "e18b", source: "rtx", target: "fa_japan", label: "NGI interceptors ($1.94B)", edgeType: "arms_sale" },
  { id: "e18c", source: "rtx", target: "fa_israel", label: "Iron Dome co-production, David's Sling", edgeType: "arms_sale" },
  { id: "e19", source: "ba", target: "fa_sa", label: "F-15SA ($29.4B)", edgeType: "arms_sale" },
  { id: "e20", source: "ba", target: "fa_qatar", label: "F-15QA ($12B)", edgeType: "arms_sale" },
  { id: "e20b", source: "ba", target: "fa_india", label: "P-8I, Apache, Chinook", edgeType: "arms_sale" },
  { id: "e20c", source: "ba", target: "fa_australia", label: "P-8A, EA-18G Growler", edgeType: "arms_sale" },
  { id: "e20d", source: "ba", target: "fa_israel", label: "F-15I, Apache, Harpoon, JDAM", edgeType: "arms_sale" },
  { id: "e21", source: "gd", target: "fa_sa", label: "Abrams tanks, LAVs", edgeType: "arms_sale" },
  { id: "e21b", source: "gd", target: "fa_taiwan", label: "M1A2T Abrams ($2.2B)", edgeType: "arms_sale" },
  { id: "e21c", source: "gd", target: "fa_poland", label: "250 M1A2 SEPv3 Abrams", edgeType: "arms_sale" },
  { id: "e21d", source: "gd", target: "fa_australia", label: "Virginia-class subs (AUKUS)", edgeType: "arms_sale" },
  { id: "e22", source: "lhx", target: "fa_israel", label: "ISR systems, EW, radios", edgeType: "arms_sale" },
  { id: "e23", source: "noc", target: "fa_australia", label: "Triton UAV, AUKUS tech", edgeType: "arms_sale" },
  { id: "e23b", source: "noc", target: "fa_poland", label: "AARGM-ER ($2B)", edgeType: "arms_sale" },
  { id: "e23c", source: "noc", target: "fa_israel", label: "Longbow radar, LITENING, EW", edgeType: "arms_sale" },
  { id: "e23d", source: "ge", target: "fa_india", label: "F414 engines (Tejas Mk2)", edgeType: "arms_sale" },
  { id: "e23e", source: "ge", target: "fa_israel", label: "F110/T700 engines", edgeType: "arms_sale" },
  { id: "e23f", source: "spacex", target: "fa_ukraine", label: "Starlink (DoD-funded)", edgeType: "arms_sale" },
  { id: "e23g", source: "hii", target: "fa_australia", label: "Sub industrial base (AUKUS)", edgeType: "arms_sale" },
  { id: "e23h", source: "pltr", target: "fa_israel", label: "Reported IDF usage", edgeType: "arms_sale" },
  { id: "e23i", source: "gd", target: "fa_israel", label: "Ordnance, ammunition", edgeType: "arms_sale" },

  // LOBBYING: Foreign → Firms
  { id: "e24", source: "fa_sa", target: "lf_squire", label: "FARA registered", edgeType: "lobbying" },
  { id: "e24b", source: "fa_sa", target: "lf_brownstein", label: "107 dinners for Ambassador", edgeType: "lobbying" },
  { id: "e25", source: "fa_uae", target: "lf_akin", label: "NDAA lobbying", edgeType: "lobbying" },
  { id: "e25b", source: "fa_uae", target: "lf_adi", label: "Subcontractor via Akin Gump", edgeType: "lobbying" },
  { id: "e26", source: "fa_qatar", target: "lf_hogan", label: "FARA registered", edgeType: "lobbying" },
  { id: "e26b", source: "fa_qatar", target: "lf_bgr", label: "FARA registered", edgeType: "lobbying" },
  { id: "e27", source: "fa_taiwan", target: "lf_akin", label: "Via TECRO", edgeType: "lobbying" },
  { id: "e27b", source: "fa_skorea", target: "lf_brownstein", label: "NDAA via Begich", edgeType: "lobbying" },
  { id: "e27c", source: "fa_india", target: "lf_bgr", label: "NDAA monitoring", edgeType: "lobbying" },
  { id: "e27d", source: "fa_ukraine", target: "lf_bgr", label: "15 meetings in 1 day", edgeType: "lobbying" },
  { id: "e27e", source: "fa_azerbaijan", target: "lf_bgr", label: "NDAA monitoring", edgeType: "lobbying" },
  { id: "e27f", source: "fa_japan", target: "lf_hogan", label: "Defense/trade lobbying", edgeType: "lobbying" },
  { id: "e27g", source: "fa_japan", target: "lf_akin", label: "Congressional lobbying", edgeType: "lobbying" },
  { id: "e27h", source: "fa_morocco", target: "lf_akin", label: "NDAA lobbying", edgeType: "lobbying" },
  { id: "e27i", source: "fa_egypt", target: "lf_brownstein", label: "FARA registered", edgeType: "lobbying" },

  // LOBBYING: Firms → Congress
  { id: "e28", source: "lf_squire", target: "cm_risch", label: "FMS approvals (Saudi)", edgeType: "lobbying" },
  { id: "e29", source: "lf_akin", target: "cm_mccaul", label: "Taiwan/UAE arms", edgeType: "lobbying" },
  { id: "e30", source: "lf_squire", target: "cm_wicker", label: "Saudi arms (NDAA)", edgeType: "lobbying" },
  { id: "e31", source: "lf_hogan", target: "cm_risch", label: "Japan/Qatar FMS", edgeType: "lobbying" },
  { id: "e31b", source: "lf_bgr", target: "cm_mccaul", label: "India via Strupp", edgeType: "lobbying" },
  { id: "e31c", source: "lf_adi", target: "cm_smith", label: "UAE Amb dinner arranged", edgeType: "lobbying" },
  { id: "e31d", source: "lf_adi", target: "cm_gallego", label: "$3,300 from ADI CEO", edgeType: "lobbying" },
  { id: "e31e", source: "lf_brownstein", target: "cm_reed", label: "Begich met Reed (S. Korea)", edgeType: "lobbying" },

  // CONGRESSIONAL OVERSIGHT → Foreign
  { id: "e32", source: "cm_risch", target: "fa_sa", label: "SFRC: FMS hold/release", edgeType: "oversight" },
  { id: "e33", source: "cm_mccaul", target: "fa_taiwan", label: "HFAC: Taiwan Relations Act", edgeType: "oversight" },
  { id: "e34", source: "cm_reed", target: "fa_australia", label: "SASC: AUKUS oversight", edgeType: "oversight" },
  { id: "e34b", source: "cm_paul", target: "fa_sa", label: "Tried to block arms sales", edgeType: "oversight" },
  { id: "e34c", source: "cm_paul", target: "fa_egypt", label: "Tried to block $2.2B C-130", edgeType: "oversight" },
  { id: "e34d", source: "cm_menendez", target: "fa_egypt", label: "Used SFRC to influence aid", edgeType: "oversight" },
  { id: "e34e", source: "cm_cotton", target: "fa_taiwan", label: "Deterrence advocate", edgeType: "oversight" },
  { id: "e34f", source: "cm_mccaul", target: "fa_israel", label: "Iron Dome funding", edgeType: "oversight" },
  { id: "e34g", source: "cm_rogers", target: "fa_israel", label: "QME enforcement", edgeType: "oversight" },
  { id: "e34h", source: "cm_risch", target: "fa_israel", label: "QME: all ME FMS must preserve", edgeType: "oversight" },
  { id: "e34i", source: "cm_cardin", target: "fa_israel", label: "Iron Dome supplemental ($1B)", edgeType: "oversight" },
  { id: "e34j", source: "cm_cotton", target: "fa_israel", label: "Munitions resupply", edgeType: "oversight" },
  { id: "e12e", source: "cm_rubio", target: "fa_taiwan", label: "Former SSCI: Taiwan champion", edgeType: "oversight" },

  // THINK TANK FUNDING
  { id: "e35", source: "lmt", target: "tt_csis", label: "Corporate donor", edgeType: "consulting" },
  { id: "e36", source: "rtx", target: "tt_csis", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37", source: "lmt", target: "tt_heritage", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37b", source: "noc", target: "tt_csis", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37c", source: "ba", target: "tt_csis", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37d", source: "lmt", target: "tt_cnas", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37e", source: "rtx", target: "tt_cnas", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37f", source: "noc", target: "tt_cnas", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37g", source: "bah", target: "tt_atlantic", label: "Corporate donor", edgeType: "consulting" },
  { id: "e37h", source: "fa_uae", target: "tt_brookings", label: "Foreign govt donor", edgeType: "consulting" },
  { id: "e37i", source: "fa_qatar", target: "tt_brookings", label: "Foreign govt donor", edgeType: "consulting" },
  { id: "e37j", source: "fa_uae", target: "tt_atlantic", label: "Foreign govt donor", edgeType: "consulting" },
  { id: "e37k", source: "fa_japan", target: "tt_hudson", label: "Foreign govt donor", edgeType: "consulting" },
  { id: "e37l", source: "fa_taiwan", target: "tt_hudson", label: "Foreign govt donor", edgeType: "consulting" },
  { id: "e37m", source: "fa_israel", target: "tt_csis", label: "Defense research funding", edgeType: "consulting" },
  { id: "e37n", source: "fa_israel", target: "tt_brookings", label: "Saban Center (Israel-focused)", edgeType: "consulting" },
  { id: "e37o", source: "fa_israel", target: "tt_atlantic", label: "Middle East Programs", edgeType: "consulting" },
];

// ===== ANALYSIS ENGINE =====
function analyzeNetwork(nodes, edges) {
  const degree = {}, adjacency = {};
  nodes.forEach(n => { degree[n.id] = 0; adjacency[n.id] = []; });
  edges.forEach(e => {
    const s = typeof e.source === "object" ? e.source.id : e.source;
    const t = typeof e.target === "object" ? e.target.id : e.target;
    degree[s] = (degree[s] || 0) + 1;
    degree[t] = (degree[t] || 0) + 1;
    if (!adjacency[s]) adjacency[s] = [];
    if (!adjacency[t]) adjacency[t] = [];
    adjacency[s].push(t);
    adjacency[t].push(s);
  });
  const betweenness = {};
  nodes.forEach(n => betweenness[n.id] = 0);
  nodes.forEach(s => {
    const stack = [], pred = {}, sigma = {}, dist = {};
    nodes.forEach(n => { pred[n.id] = []; sigma[n.id] = 0; dist[n.id] = -1; });
    sigma[s.id] = 1; dist[s.id] = 0;
    const queue = [s.id];
    while (queue.length) {
      const v = queue.shift(); stack.push(v);
      (adjacency[v] || []).forEach(w => {
        if (dist[w] < 0) { queue.push(w); dist[w] = dist[v] + 1; }
        if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
      });
    }
    const delta = {};
    nodes.forEach(n => delta[n.id] = 0);
    while (stack.length) {
      const w = stack.pop();
      pred[w].forEach(v => { delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]); });
      if (w !== s.id) betweenness[w] += delta[w];
    }
  });
  const n = nodes.length;
  if (n > 2) Object.keys(betweenness).forEach(k => betweenness[k] /= (n-1)*(n-2));
  const maxBet = Math.max(...Object.values(betweenness), 0.001);
  const bridgeNodes = nodes.filter(nd => (betweenness[nd.id]/maxBet) > 0.3 && (degree[nd.id]||0) >= 2).map(nd => nd.id);
  const powerScore = {};
  nodes.forEach(nd => {
    const d = degree[nd.id] || 0;
    const b = betweenness[nd.id] || 0;
    const types = new Set();
    edges.forEach(e => {
      const s = typeof e.source === "object" ? e.source.id : e.source;
      const t = typeof e.target === "object" ? e.target.id : e.target;
      if (s === nd.id || t === nd.id) types.add(e.edgeType);
    });
    powerScore[nd.id] = (d * 0.3) + (b * 100 * 0.4) + (types.size * 0.3);
  });
  return { degree, betweenness, bridgeNodes, powerScore, adjacency };
}

// Chain tracer: BFS to find paths between two entities
function findChains(startId, endId, edges, maxDepth = 5) {
  const adj = {};
  edges.forEach(e => {
    const s = typeof e.source === "object" ? e.source.id : e.source;
    const t = typeof e.target === "object" ? e.target.id : e.target;
    if (!adj[s]) adj[s] = [];
    if (!adj[t]) adj[t] = [];
    adj[s].push({ to: t, edge: e });
    adj[t].push({ to: s, edge: e });
  });
  const paths = [];
  const queue = [[startId, [startId], []]];
  const visited = new Set();
  while (queue.length && paths.length < 5) {
    const [current, path, edgePath] = queue.shift();
    if (current === endId && path.length > 1) { paths.push({ nodes: path, edges: edgePath }); continue; }
    if (path.length > maxDepth) continue;
    (adj[current] || []).forEach(({ to, edge }) => {
      if (!path.includes(to)) {
        queue.push([to, [...path, to], [...edgePath, edge]]);
      }
    });
  }
  return paths;
}

// ===== COLORS =====
const NODE_COLORS = {
  company: "#f59e0b", congress: "#3b82f6", foreign_principal: "#ef4444",
  lobby_firm: "#a855f7", revolving_door: "#10b981", think_tank: "#f97316",
};
const EDGE_COLORS = {
  revolving_door: "#10b981", arms_sale: "#ef4444", oversight: "#3b82f6",
  district: "#60a5fa", lobbying: "#a855f7", consulting: "#6b7280",
};
const TYPE_LABELS = {
  company: "Defense Contractor", congress: "Congress", foreign_principal: "Foreign Government",
  lobby_firm: "Lobby Firm (FARA)", revolving_door: "Revolving Door", think_tank: "Think Tank",
};
const EDGE_LABELS = {
  revolving_door: "Revolving Door", arms_sale: "Arms Sale", oversight: "Congressional Oversight",
  district: "District/State Tie", lobbying: "Lobbying (FARA)", consulting: "Think Tank / Advisory",
};

// ===== MAIN COMPONENT =====
export default function InfluencePlatform() {
  const [view, setView] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [chainStart, setChainStart] = useState(null);
  const [chainEnd, setChainEnd] = useState(null);
  const [chainResults, setChainResults] = useState([]);
  const [filter, setFilter] = useState("all");
  const svgRef = useRef(null);

  const analysis = useMemo(() => analyzeNetwork(ENTITIES, EDGES), []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return ENTITIES.filter(e =>
      e.label.toLowerCase().includes(q) || e.summary?.toLowerCase().includes(q) ||
      e.sector?.toLowerCase().includes(q) || e.country?.toLowerCase().includes(q) ||
      e.committee?.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const getConnections = useCallback((entityId) => {
    return EDGES.filter(e => {
      const s = typeof e.source === "object" ? e.source.id : e.source;
      const t = typeof e.target === "object" ? e.target.id : e.target;
      return s === entityId || t === entityId;
    }).map(e => {
      const s = typeof e.source === "object" ? e.source.id : e.source;
      const t = typeof e.target === "object" ? e.target.id : e.target;
      const otherId = s === entityId ? t : s;
      const other = ENTITIES.find(n => n.id === otherId);
      return { edge: e, other };
    });
  }, []);

  const runChainTrace = useCallback(() => {
    if (chainStart && chainEnd) {
      const chains = findChains(chainStart, chainEnd, EDGES);
      setChainResults(chains);
    }
  }, [chainStart, chainEnd]);

  // Graph view
  useEffect(() => {
    if (view !== "graph" || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const filteredEdges = filter === "all" ? EDGES : EDGES.filter(e => e.edgeType === filter);
    const nodeIds = new Set();
    if (filter === "all") ENTITIES.forEach(n => nodeIds.add(n.id));
    else filteredEdges.forEach(e => { nodeIds.add(e.source); nodeIds.add(e.target); });
    const filteredNodes = ENTITIES.filter(n => nodeIds.has(n.id));

    const g = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.15, 4]).on("zoom", e => g.attr("transform", e.transform)));

    const nodesData = filteredNodes.map(n => ({ ...n }));
    const edgesData = filteredEdges.map(e => ({ ...e }));

    const sim = d3.forceSimulation(nodesData)
      .force("link", d3.forceLink(edgesData).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width/2, height/2))
      .force("collision", d3.forceCollide().radius(25));

    const edgeG = g.append("g").selectAll("line").data(edgesData).enter().append("line")
      .attr("stroke", d => EDGE_COLORS[d.edgeType] || "#334155")
      .attr("stroke-width", 1.2).attr("stroke-opacity", 0.5);

    const nodeG = g.append("g").selectAll("g").data(nodesData).enter().append("g")
      .call(d3.drag()
        .on("start", (e,d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag", (e,d) => { d.fx=e.x; d.fy=e.y; })
        .on("end", (e,d) => { if (!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }))
      .on("click", (e,d) => { setSelectedEntity(d); setView("profile"); })
      .style("cursor", "pointer");

    nodeG.append("circle").attr("r", d => {
      const deg = analysis.degree[d.id] || 0;
      return Math.min(6 + deg * 0.8, 20);
    })
      .attr("fill", d => NODE_COLORS[d.type])
      .attr("stroke", d => analysis.bridgeNodes.includes(d.id) ? "#ff0000" : "#1e293b")
      .attr("stroke-width", d => analysis.bridgeNodes.includes(d.id) ? 2.5 : 1);

    nodeG.append("text").text(d => d.label.length > 18 ? d.label.slice(0,16)+".." : d.label)
      .attr("y", d => Math.min(6 + (analysis.degree[d.id]||0)*0.8, 20) + 12)
      .attr("text-anchor", "middle").attr("fill", "#94a3b8").attr("font-size", "7px").attr("font-family", "'DM Mono', monospace");

    sim.on("tick", () => {
      edgeG.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
      nodeG.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    const handleVis = () => { if (document.hidden) sim.stop(); else sim.alpha(0.01).restart(); };
    document.addEventListener("visibilitychange", handleVis);
    return () => { sim.stop(); document.removeEventListener("visibilitychange", handleVis); };
  }, [view, filter, analysis]);

  const styles = {
    app: { width: "100vw", height: "100vh", background: "#0c0f1a", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#e2e8f0", overflow: "hidden" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderBottom: "1px solid #1e293b", background: "#0a0d16", flexShrink: 0 },
    logo: { fontSize: 16, fontWeight: 800, letterSpacing: 3, color: "#ef4444" },
    tagline: { fontSize: 10, color: "#475569", marginLeft: 12 },
    nav: { display: "flex", gap: 2 },
    navBtn: (active) => ({ padding: "6px 16px", background: active ? "#1e293b" : "transparent", border: active ? "1px solid #334155" : "1px solid transparent", borderRadius: 6, color: active ? "#e2e8f0" : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }),
    main: { flex: 1, overflow: "hidden", display: "flex" },
    searchInput: { width: "100%", padding: "12px 16px", background: "#111827", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none" },
    card: { padding: "12px 16px", background: "#111827", borderRadius: 8, border: "1px solid #1e293b", marginBottom: 8, cursor: "pointer", transition: "border-color 0.2s" },
    badge: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: color + "20", color: color, marginRight: 6 }),
  };

  const renderSearch = () => (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: "#f8fafc" }}>Search the Network</h2>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Search defense contractors, Congress members, foreign governments, lobby firms, or individuals</p>
        <input style={styles.searchInput} placeholder="Try: Saudi Arabia, Lockheed Martin, Austin, FARA, Taiwan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <div style={{ marginTop: 16 }}>
          {searchQuery && searchResults.length === 0 && <p style={{ color: "#475569", fontSize: 12 }}>No results found</p>}
          {(searchQuery ? searchResults : ENTITIES.sort((a,b) => (analysis.powerScore[b.id]||0) - (analysis.powerScore[a.id]||0)).slice(0, 20)).map(entity => (
            <div key={entity.id} style={styles.card} onClick={() => { setSelectedEntity(entity); setView("profile"); }}
              onMouseEnter={e => e.currentTarget.style.borderColor = NODE_COLORS[entity.type]}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={styles.badge(NODE_COLORS[entity.type])}>{TYPE_LABELS[entity.type]}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: "#f8fafc" }}>{entity.label}</div>
                  {entity.contracts && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>DoD Contracts: {entity.contracts}</div>}
                  {entity.country && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{entity.country}</div>}
                  {entity.committee && <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>{entity.committee} — {entity.role}</div>}
                  {entity.title && <div style={{ fontSize: 11, color: "#10b981", marginTop: 2 }}>{entity.title}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: NODE_COLORS[entity.type] }}>{(analysis.powerScore[entity.id]||0).toFixed(1)}</div>
                  <div style={{ fontSize: 9, color: "#475569" }}>INFLUENCE</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{analysis.degree[entity.id] || 0} connections</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!selectedEntity) return <div style={{ padding: 40, color: "#475569" }}>Select an entity</div>;
    const connections = getConnections(selectedEntity.id);
    const grouped = {};
    connections.forEach(c => {
      const type = c.edge.edgeType;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(c);
    });
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <button onClick={() => setView("search")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", marginBottom: 12, fontFamily: "inherit" }}>← Back to search</button>
          <span style={styles.badge(NODE_COLORS[selectedEntity.type])}>{TYPE_LABELS[selectedEntity.type]}</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: "#f8fafc" }}>{selectedEntity.label}</h1>
          <div style={{ display: "flex", gap: 16, marginTop: 12, marginBottom: 16 }}>
            {[["Connections", analysis.degree[selectedEntity.id]||0], ["Influence", (analysis.powerScore[selectedEntity.id]||0).toFixed(1)], ["Betweenness", (analysis.betweenness[selectedEntity.id]||0).toFixed(4)]].map(([k,v]) => (
              <div key={k} style={{ background: "#111827", borderRadius: 8, padding: "10px 16px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: NODE_COLORS[selectedEntity.type] }}>{v}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{k}</div>
              </div>
            ))}
            {analysis.bridgeNodes.includes(selectedEntity.id) && (
              <div style={{ background: "#1c0a0a", borderRadius: 8, padding: "10px 16px", border: "1px solid #7f1d1d" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#ef4444" }}>⚠ BRIDGE NODE</div>
                <div style={{ fontSize: 10, color: "#fca5a5" }}>Critical network connector</div>
              </div>
            )}
          </div>
          <div style={{ background: "#111827", borderRadius: 8, padding: 16, border: "1px solid #1e293b", marginBottom: 16, lineHeight: 1.6, fontSize: 13, color: "#cbd5e1" }}>
            {selectedEntity.summary}
          </div>
          {selectedEntity.contracts && <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 4 }}>DoD Contracts: {selectedEntity.contracts} | HQ: {selectedEntity.hq}</div>}

          <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 8, color: "#f8fafc" }}>Connections ({connections.length})</h3>
          {Object.entries(grouped).map(([type, conns]) => (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: EDGE_COLORS[type], marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                {EDGE_LABELS[type]} ({conns.length})
              </div>
              {conns.map(({ edge, other }) => (
                <div key={edge.id} style={{ padding: "8px 12px", background: "#0c0f1a", borderRadius: 6, marginBottom: 3, borderLeft: `3px solid ${EDGE_COLORS[edge.edgeType]}`, cursor: "pointer" }}
                  onClick={() => { if (other) { setSelectedEntity(other); } }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: NODE_COLORS[other?.type] }}>{other?.label || "Unknown"}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{edge.label}</div>
                </div>
              ))}
            </div>
          ))}

          <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 8, color: "#f8fafc" }}>Trace a Chain From Here</h3>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Select a destination to trace the influence path</p>
          <select style={{ ...styles.searchInput, fontSize: 12, padding: "8px 12px" }} value={chainEnd || ""} onChange={e => { setChainStart(selectedEntity.id); setChainEnd(e.target.value); }}>
            <option value="">Choose destination...</option>
            {ENTITIES.filter(e => e.id !== selectedEntity.id).sort((a,b) => a.label.localeCompare(b.label)).map(e => (
              <option key={e.id} value={e.id}>{e.label} ({TYPE_LABELS[e.type]})</option>
            ))}
          </select>
          {chainEnd && <button onClick={runChainTrace} style={{ marginTop: 8, padding: "8px 20px", background: "#ef4444", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Trace Chain →</button>}
          {chainResults.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {chainResults.map((chain, ci) => (
                <div key={ci} style={{ background: "#111827", borderRadius: 8, padding: 12, border: "1px solid #1e293b", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>Path {ci+1} ({chain.nodes.length} hops)</div>
                  {chain.nodes.map((nodeId, ni) => {
                    const node = ENTITIES.find(n => n.id === nodeId);
                    const edge = chain.edges[ni];
                    return (
                      <div key={ni}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: NODE_COLORS[node?.type], cursor: "pointer" }}
                          onClick={() => { if (node) setSelectedEntity(node); }}>
                          {node?.label || nodeId}
                        </span>
                        {edge && <span style={{ fontSize: 10, color: EDGE_COLORS[edge.edgeType], margin: "0 6px" }}>→ {edge.label} →</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGraph = () => (
    <div style={{ flex: 1, position: "relative" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%", background: "#0a0d16" }} />
      <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(10,13,22,0.95)", borderRadius: 8, padding: "10px 14px", border: "1px solid #1e293b" }}>
        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Filter</div>
        {[["all", "All", "#e2e8f0"], ...Object.entries(EDGE_LABELS).map(([k,v]) => [k, v, EDGE_COLORS[k]])].map(([key, label, color]) => (
          <button key={key} onClick={() => setFilter(key)} style={{ display: "block", width: "100%", padding: "3px 8px", marginBottom: 1, background: filter === key ? "#1e293b" : "transparent", border: filter === key ? `1px solid ${color}` : "1px solid transparent", borderRadius: 4, color, fontSize: 10, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>● {label}</button>
        ))}
        <div style={{ marginTop: 8, fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>Entities</div>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: NODE_COLORS[type] }} />
            <span style={{ fontSize: 9, color: "#94a3b8" }}>{label}</span>
          </div>
        ))}
        <div style={{ marginTop: 4, fontSize: 8, color: "#475569" }}>Red border = bridge node</div>
        <div style={{ fontSize: 8, color: "#475569" }}>Click any node for profile</div>
      </div>
      <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 9, color: "#334155" }}>
        {ENTITIES.length} entities • {EDGES.length} connections • Sources: SEC • FARA • USAspending • DSCA • Congress.gov
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={styles.logo}>INFLUENCE</span>
          <span style={styles.tagline}>Defense Lobbying & Foreign Funding Intelligence</span>
        </div>
        <div style={styles.nav}>
          {[["search", "Search"], ["profile", "Profile"], ["graph", "Network Graph"]].map(([key, label]) => (
            <button key={key} style={styles.navBtn(view === key)} onClick={() => setView(key)}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize: 9, color: "#334155" }}>{ENTITIES.length} entities • {EDGES.length} verified connections</div>
      </div>
      <div style={styles.main}>
        {view === "search" && renderSearch()}
        {view === "profile" && renderProfile()}
        {view === "graph" && renderGraph()}
      </div>
    </div>
  );
}
