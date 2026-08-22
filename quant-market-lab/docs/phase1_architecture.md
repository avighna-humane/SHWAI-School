# Phase 1 Architecture

## Scope

Phase 1 establishes the smallest correct domain layer for the Quantitative Market Simulation Laboratory. It defines orders and trades only. The limit order book, matching engine, exchange orchestration, agents, simulation loop, risk analytics, experiments, and benchmarks are deliberately deferred to later phases.

The implementation will live under `quant-market-lab/` so the existing SHWAI School TypeScript application remains untouched.

## Module layout

```text
quant-market-lab/
├── pyproject.toml
├── README.md
├── src/
│   └── quant_market_lab/
│       ├── __init__.py
│       └── core/
│           ├── __init__.py
│           ├── order.py
│           └── trade.py
├── tests/
│   ├── test_order.py
│   └── test_trade.py
└── docs/
    └── phase1_architecture.md
```

## Domain types

| Type | Kind | Responsibility |
| --- | --- | --- |
| `Side` | String Enum | Represents whether an order is a buy or sell. Values are `BUY` and `SELL`, making logging and future JSON/CSV serialization straightforward. |
| `OrderType` | String Enum | Represents whether an order is a limit or market order. Values are `LIMIT` and `MARKET`, making logging and future JSON/CSV serialization straightforward. |
| `Order` | Frozen dataclass | Stores the immutable identity and submission attributes of an order, validates its fields, and exposes fill-state helpers. |
| `Trade` | Frozen dataclass | Records one execution between a buy order and a sell order, including execution price, quantity, and the two order identifiers. |

## `Order` responsibilities

`Order` contains the fields requested by the project brief:

```text
order_id: int
trader_id: str
side: Side
order_type: OrderType
price: int | None
quantity: int
remaining_quantity: int
timestamp: int
```

Prices use integer ticks internally. A limit order must have a positive integer tick price; a market order must have `price=None`. Quantities must be positive integers, remaining quantity must be an integer between zero and the original quantity, identifiers must be non-negative integers, timestamps must be non-negative integers, and trader identifiers must be non-empty strings. Boolean values are rejected even though Python considers booleans to be integers. These constraints make invalid market state impossible to represent silently.

The object exposes `is_market_order`, `is_limit_order`, `filled_quantity`, and `is_fully_filled` helpers. `quantity` remains the original quantity, while `remaining_quantity` records the currently unfilled amount and must satisfy `0 <= remaining_quantity <= quantity`. A `with_remaining_quantity` method returns a new order with an updated remaining quantity for later partial-fill handling; Phase 1 does not mutate order state and does not implement matching.

## `Trade` responsibilities

`Trade` records a single fill:

```text
trade_id: int
buy_order_id: int
sell_order_id: int
price: int
quantity: int
timestamp: int
```

The trade model validates that identifiers and timestamp are non-negative integers, while price and quantity are positive integer ticks/units. It also rejects identical buy and sell order IDs. The model is intentionally independent of the future matching engine so it can be used as a stable output record by later phases.

## Design decisions that affect later phases

1. **Integer ticks are the internal price representation.** A future exchange can choose a tick size for display conversion without introducing floating-point comparison errors into price-time priority.
2. **Orders are immutable value objects.** Partial fills will be represented by replacement instances rather than in-place mutation, which keeps matching behavior easier to test and replay.
3. **`quantity` and `remaining_quantity` are distinct.** The former is the original submitted quantity; the latter is the live unfilled quantity. `filled_quantity` is derived as `quantity - remaining_quantity`.
4. **Enums are string enums instead of free-form strings.** This gives agents and the matching engine a closed vocabulary while keeping logs and future serialization readable.
5. **Market orders carry no price.** The future matching engine will determine execution prices from available book liquidity.
6. **Timestamps are supplied by the caller.** The future exchange or simulator will own sequencing, allowing deterministic seeded simulations and reproducible tests.
7. **Trader identifiers are non-empty strings.** This supports both numeric-looking IDs and descriptive agent IDs without coupling the core domain to an agent implementation.
8. **Trade records use both buy and sell order IDs.** This preserves auditability and will support fill attribution, inventory updates, and adverse-selection analysis later.
9. **Trade records reject self-trades.** Self-trading prevention may eventually belong to the exchange layer as well, but an obviously invalid trade cannot be represented at the domain boundary.
10. **No real-market integrations are included.** This repository will remain a synthetic, educational simulation and will not connect to brokers, exchanges, real money, or live trading.

## Exception semantics

The models use `TypeError` when a value has the wrong type and `ValueError` when a correctly typed value violates a domain constraint. Exact integer checks use `type(value) is int`, so `True` and `False` cannot slip through as IDs, prices, quantities, or timestamps.

## Explicitly deferred

The following are out of scope for Phase 1: order-book storage, best-bid/ best-ask lookup, matching, cancellations, exchange APIs, agents, stochastic processes, Monte Carlo execution, P&L, transaction costs, Kelly sizing, plotting, web servers, databases, authentication, and performance optimization.

## Testing approach

Phase 1 tests cover valid construction, string enum values, exact-type validation including boolean rejection, invalid-field rejection, market-versus-limit invariants, remaining/fill quantity accounting, immutable partial-fill copies, self-trade rejection, and trade validation. Matching behavior will not be tested until the matching engine exists in a later phase.
