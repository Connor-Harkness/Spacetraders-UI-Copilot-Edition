# Ship Automation Workplan

References
- SpaceTraders docs and API: https://spacetraders.io

Goals
- Automate repetitive ship workflows with guardrails and safe API usage.
- Support:
  - Mining loops (with surveys, cooldown handling, auto-sell).
  - Contract fulfillment: acquire required goods by mining or purchasing if price is favorable, then deliver on time.
- Scale to multiple ships with independent policies and a shared budget.

Non-Goals (MVP)
- No complex multi-hop arbitrage routing beyond simple “best nearby market.”
- No external services; client-only scheduling/persistence.

Core Concepts
- Behavior: a reusable automation (MiningBehavior, ContractBehavior).
- Policy: user-defined constraints/preferences (price caps, fuel min, stop conditions).
- Plan: a dynamic set of Steps (navigate, dock, buy, sell, orbit, extract, survey, deliver).
- Orchestrator: runs behaviors per ship, handles cooldowns/rate limits, retries, and persistence.
- Market Intel: cached, periodically refreshed market data to inform purchasing decisions.

Architecture
- Automation Orchestrator (per agent)
  - Manages a registry of behaviors per ship.
  - Tick loop (poll interval) + event-driven wake-ups (cooldown complete).
  - Central rate-limit coordinator (queue + backoff for 429).
- Behavior Plugins
  - MiningBehavior
  - ContractBehavior (with AcquirePlan: mine vs buy)
- Scheduler/Action Runner
  - Ensures preconditions: nav status (dock/orbit), fuel, cargo space, waypoint type.
  - Executes one API action at a time per ship; dedupe via idempotency keys.
- State Store
  - In-memory + IndexedDB snapshot (resume after reload).
- Services
  - Route Planner (shortest path, fuel planning; prefer local system on MVP).
  - Market Intel (markets cache + price evaluation).
  - Survey Cache (validity/expiration, prioritization).
- UI Integration
  - Automation screen: per-ship toggle, policy editor, live status/logs.
  - Ship card: “Automate: Mine,” “Automate: Contract,” start/stop.
  - Policy presets and inline warnings.

Supported Behaviors

1) MiningBehavior (MVP)
- Flow
  - If ship not at target asteroid field: plan route → refuel if needed → navigate.
  - Ensure Orbit, handle cooldown.
  - Optional Survey:
    - Use available surveys first; create new survey when beneficial and allowed.
  - Extract until:
    - Cargo ≥ threshold or holds target good units → then sell.
  - Auto-sell:
    - Dock at best market within radius where sell price is acceptable.
    - Sell all or targeted goods; refuel; return to field.
- Policies
  - minFuel%, refuelAt≤%, maxJumpsForField, useSurveys: on/off.
  - sellWhenCargo≥% or contains goods in allowlist.
  - marketSellRadius, minSellPricePerUnit, avoidWaypoints (tags).
- Safeguards
  - Never extract unless in Orbit.
  - Stop if hull below threshold or no fuel path.
  - Respect cooldowns (don’t spam extract/survey).
  - Backoff on 429/5xx and resume.

2) ContractBehavior (MVP)
- Inputs
  - Contract terms: good type, total units, pickup/delivery waypoints, deadline, payout.
- Flow
  - Assess remaining units and time-to-deadline.
  - AcquirePlan:
    - Option A: Mine the requested good:
      - Identify nearest asteroid fields that yield the good (via surveys/history).
      - Estimate time/unit and total cycles.
    - Option B: Purchase:
      - Scan nearby markets within radius; find stock and price.
      - Compute “is price right?” using policy and contract payout/time.
  - Choose the faster/surer plan that meets deadline and policy.
  - Execute:
    - If buy: navigate → dock → buy (bounded by credits, cargo, needed units).
    - If mine: run MiningBehavior sub-plan focused on the requested good.
    - Navigate to destination → dock → deliver.
  - Loop until fulfilled; collect payout; stop or pick next contract.
- Policies
  - maxBuyPricePerUnit (absolute) or price ≤ k% of expected value.
  - acquisitionRadius (jumps), preferBuyIfETAAdvantage≥X minutes.
  - reserveCredits for fuel/repairs; minTimeBuffer before deadline.
- Safeguards
  - If ETA cannot meet deadline → stop and alert (no-credit burn).
  - If insufficient credits to buy → fall back to mining.
  - Verify dock/orbit state before buy/deliver actions.
  - Partial deliveries allowed when supported.

Market-Aware Decisions
- Price signal
  - Favor markets with export/supply tags and historically lower prices.
  - Reject buys above policy max or if projected margin vs contract payout is poor.
- Scoring
  - score = (payout or sellPrice) − (buyPrice + fuelCost + timeCost).
  - Add penalty for distance/hops; bonus for stock sufficiency.
- Data freshness
  - Cache markets with TTL; refresh when chosen for buy/sell.

Data Model (sketch)
- AutomationProfile
  - id, agentSymbol, shipSymbol, behavior: "mining" | "contract"
  - config: policy object (per behavior)
  - status: idle | planning | navigating | orbiting | mining | buying | selling | delivering | cooldown | error
  - progress: counters (unitsMined, unitsBought, unitsDelivered), timestamps, lastAction
- Policy
  - miningPolicy { useSurveys, minFuelPct, sellCargoPct, minSellPrice, marketSellRadius }
  - contractPolicy { maxBuyPrice, acquisitionRadius, minDeadlineBufferMin, preferBuyIfETAAdvantageMin, reserveCredits }
- Plan/Step
  - steps: [ { type, params, preconditions, retry } ]
  - example types: NAVIGATE, DOCK, ORBIT, REFUEL, SURVEY, EXTRACT, BUY, SELL, DELIVER, WAIT_COOLDOWN

Execution Semantics
- One in-flight step per ship; serialize API calls.
- Preconditions enforce correct ship state and capacity/fuel.
- Cooldown manager waits until expiration before eligible actions.
- Retry policy with exponential backoff and jitter for transient errors.
- Persistence
  - Save AutomationProfile + Plan after each state change.
  - Recover on reload: re-fetch ship, reconcile plan, continue or re-plan.

API Coverage (consult spacetraders.io)
- Ships: navigate, dock, orbit, refuel, extract, survey, jettison, transfer, deliver, cargo, cooldown.
- Markets: get listings/prices, purchase, sell.
- Contracts: list, accept (manual/UI), deliver, fulfill.
- Systems/Waypoints: scan, metadata for filters (asteroid fields, markets).
- Agent: credits for budget checks.
- Respect rate limits; use backoff on 429.

Prechecks and Guards
- Navigation: ensure route is traversable with current fuel; insert refuel steps.
- Cargo: ensure space before extract/buy; auto-sell/jettison only if policy permits.
- Dock/Orbit: enforce required state per action.
- Deadlines: compute ETA; enforce min buffer.
- Funds: enforce reserveCredits; block buys if budget violated.

UI Plan
- Automation Screen
  - Fleet table: ship, active behavior, status, progress, next action ETA, stop/pause.
  - Policy Editor: presets and advanced JSON view; validation and hints.
  - Activity Log: last N actions with API result summaries.
- Ship Detail
  - Inline automation toggle and quick policy (e.g., “Mine + Auto-sell”).
- Notifications
  - Errors, deadline risk, low fuel, cooldown complete (optional).

Milestones
- M1: Orchestrator scaffold, per-ship action queue, cooldown/rate-limit handling; MiningBehavior happy-path to nearest sell.
- M2: Market Intel service + best-sell selection; survey usage; mining autosell loop stabilization.
- M3: ContractBehavior with AcquirePlan (mine vs buy), deadline/ETA checks, partial deliveries.
- M4: UI integration (Automation screen, policy editor), persistence and resume.
- M5: Multi-ship concurrency limits, polish, metrics, acceptance tests.

Acceptance Tests
- MiningBehavior
  - Given asteroid field and fuel, ship mines to cargo threshold, sells at best nearby market, returns, repeats.
  - Uses surveys when available and respects cooldowns; stops on low fuel/hull thresholds.
- ContractBehavior
  - With a contract for GOOD_X, system selects purchase if price ≤ maxBuyPrice and ETA improves by policy margin; otherwise mines and delivers before deadline.
  - Falls back to mining when market stock/credits insufficient; performs partial deliveries when possible.
- Guards
  - Action buttons disabled during cooldown; retries succeed after backoff.
  - Prevents extract while docked; prevents buy if cargo full or budget violated.
- Persistence
  - Reload resumes in-progress plan; no duplicate actions (idempotent).

Future Enhancements
- Advanced route optimization (multi-hop, jump/warp, fuel depots).
- Dynamic trade lanes and arbitrage loops with risk-adjusted scoring.
- Multi-ship coordination (miners + haulers), convoy handoffs.
- Adaptive policies from historical yields and price trends.
- WebWorker background executor for smoother UI.

Notes
- Always follow API requirements and limits documented at spacetraders.io (cooldowns, rate limiting, required ship states).
- Keep tokens secure; redact in logs; use correct token (agent vs account) per action context.
