# SpaceTraders UI Workplan

References
- New Game: https://spacetraders.io/quickstart/new-game
- First Mission: https://spacetraders.io/quickstart/first-mission
- Purchase Ship: https://spacetraders.io/quickstart/purchase-ship
- Mine Asteroids: https://spacetraders.io/quickstart/mine-asteroids
- Sell Cargo: https://spacetraders.io/quickstart/sell-cargo
- Last Steps: https://spacetraders.io/quickstart/last-steps

Goals
- Guide a new player through creating an agent, completing the first contract, purchasing a ship, mining, selling cargo, and next steps.
- Provide safe, state-aware actions (cooldowns, docking/orbit, fuel).
- Enable growth into automation and fleet operations.
- Support onboarding via Account Token to create agents in-app; manage multiple agents/tokens and quick context switching.

Scope (MVP)
- Client-side UI consuming SpaceTraders REST API.
- Token storage and management: Account Token (for agent registration) and per-agent tokens; Agent Switcher for active context.
- Local caching for systems/markets/surveys; action queue for simple loops.

UI Sitemap
- Dashboard
- Start/New Game
- Agents (list, switch, create via Account Token)
- Contracts
- Map
- Ships
- Shipyard
- Mining
- Markets
- Operations
- Settings (Account & Tokens)

Core Flows (mapped to quickstart)

1) New Game
- Token & Agent Onboarding:
  - Choose token source:
    - Option A: Enter Account Token → Register Agent (symbol, faction) → receive Agent Token → store → set active agent.
    - Option B: Paste existing Agent Token → validate → set active agent.
  - Persist tokens securely; allow multiple agents.
- Start/New Game screen:
  - Register agent with faction selection (when using Account Token).
  - Capture and store token locally (with copy/confirm).
  - Test API call to validate token.
- Post-registration:
  - Show agent profile, HQ, starting credits, starting ship(s).

2) First Mission
- Contracts screen:
  - Fetch contracts, highlight starter contract, Accept.
- Mission Runner (wizard):
  - Step: Navigate to origin → Dock.
  - Step: Purchase required goods.
  - Step: Undock/Orbit → Navigate to destination → Dock.
  - Step: Deliver and Complete.
- Helpers:
  - Required cargo amounts, price/availability, fuel plan, cooldown timers.
  - Map highlights for origin/destination.

3) Purchase Ship
- Shipyard screen:
  - List shipyards and available frames; filter by role/cost.
  - Show player credits, cargo, crew, mining capability.
  - Purchase flow with confirmation, nickname, and role tag.
- Tips:
  - Refuel, set waypoint pins for mining/markets.

4) Mine Asteroids
- Mining screen:
  - Select ship → Navigate to asteroid field → Ensure Orbit.
  - Actions: Survey (if available), Extract, handle cooldown.
  - Auto-loop toggle with stop conditions (fuel min, cargo near full, hull).
- Indicators:
  - Cargo %, cooldowns, yield history, survey expiration.
- Cache surveys locally and prioritize best-yield ones.

5) Sell Cargo
- Markets screen:
  - Browse markets; show buy/sell prices and player cargo.
  - Suggest best sell target from current location.
  - One-click pipeline: Navigate → Dock → Sell (with confirmation).
- Profit helper:
  - Expected revenue and fuel/time considerations.

6) Last Steps
- Operations screen:
  - Fleet overview, quick refuel/repair, role assignments (miner/hauler/explorer).
  - Simple task queue (e.g., “mine then sell” loop).
- Exploration:
  - Systems/waypoints discovery view, bookmarks and notes.

Components
- TokenManager (Account + Agent), AgentSwitcher, AgentList.
- RateLimitBanner, CooldownChip.
- SystemMap (systems/waypoints, filters), RoutePlanner.
- MarketTable, CargoTable, ShipCard, ContractCard.
- ActionTray (Dock/Undock/Orbit/Navigate/Refuel/Extract/Survey/Deliver).
- Wizard with progress and guardrails.

Client/Backend Layer
- Auth/Token Context:
  - Maintain Account Token and a map of Agent Tokens (by agent symbol).
  - Middleware selects correct Authorization:
    - Account Token for agent registration.
    - Agent Token for all agent-scoped actions.
  - Handle 401/403 by prompting for correct token type.
- API client:
  - Endpoint groups: Account (register agent), Agent, Contracts, Systems/Waypoints, Ships (navigate/dock/orbit/refuel/extract/survey/transfer/jettison/deliver), Markets, Shipyards.
  - Token injection, retries with backoff, simple rate limiter.
- Caching:
  - Long-lived: systems, waypoints, static ship frames.
  - Short-lived: markets, shipyard listings, surveys (with expiry).
- Scheduler:
  - Poll ship state/cooldowns; queued actions for auto-mine loop.
- Persistence:
  - Secure local storage: Account Token and agent tokens vault (symbol → token mapping). Optional passphrase using WebCrypto.

State Model
- Global: accountToken, agents[] (symbol, name, tokenRef), currentAgentSymbol, credits (from current agent), rate-limit status.
- Entities: systems, waypoints, markets, contracts, ships, surveys, tasks.
- Derived: currentAgentToken, best sell target, route plans, fuel/cargo risk flags.

Safeguards
- Pre-checks: docking/orbit state, fuel sufficiency, cargo space, waypoint type.
- Token guards:
  - Use Account Token only for registration; block agent-scoped calls with Account Token.
  - Warn if no active agent; disable agent actions until selected.
- Cooldown awareness; disable actions that would fail or 429.
- Clear errors with fixes (e.g., “Orbit before Extract”).
- Confirmations for contract acceptance and purchases.

Milestones
- M0: Account Token onboarding, agent registration flow, Agent Switcher, token persistence.
- M1: Project setup, API client, Dashboard (agent, ships) using currentAgentToken.
- M2: Contracts list/accept; Map + basic Navigate/Dock/Orbit/Refuel.
- M3: Shipyard browse and purchase.
- M4: Mining flow with cooldown handling and auto-loop.
- M5: Markets browse, best-sell suggestion, navigate+dock+sell pipeline.
- M6: Mission wizard tying steps 2–5.
- M7: Operations panel, bookmarks, task queue; polish and tests.

Acceptance Tests
- Account Token: enter token, register new agent, receive and store Agent Token, active context set.
- Agent Token: paste existing token, validate, active context set.
- Switch Agent: select another agent, API uses its token; UI updates agent/ship data.
- First Mission: accept starter contract, complete delivery via wizard (with agent context).
- Purchase Ship: buy ship, refuel, appears in fleet list.
- Mine: navigate, orbit, extract with cooldowns, auto-loop stops on thresholds.
- Sell: pick best market, navigate+dock+sell, credits increase.
- Rate limit/cooldown: UI disables actions appropriately; retries succeed.

Non-Functional
- Basic accessibility, responsive layout, offline cache for static data.
- Error resilience with retries/backoff.
- Security: minimize token exposure (scoped storage, optional passphrase encryption), redact tokens in logs.
- Telemetry: minimal client events for flow success/failure (optional).

Future Enhancements
- Multi-ship automation, background task executor.
- Advanced route optimization and trade calculators.
- Alerts (cooldown complete, low fuel, market changes).
- Fleet roles and templated behaviors per ship.

RESTRICTIONS
- no more than 2 Reqs/second to the space traders API
- our site must be mobile accessible.
