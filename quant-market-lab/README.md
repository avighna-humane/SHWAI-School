# Quantitative Market Simulation Laboratory

## Phase 1: Domain Models

The **Quantitative Market Simulation Laboratory** is an educational and research-oriented project for investigating how randomness, information, costs, risk, and market structure affect the apparent profitability and robustness of trading strategies in a synthetic electronic market.

> This project does not connect to real brokers, real exchanges, real money, or live trading. It is not financial advice.

Phase 1 intentionally establishes only the domain foundation: immutable, validated `Order` and `Trade` records. The order book and matching engine will be added only after this foundation is reviewed and extended in later phases.

## Phase 1 architecture

```text
quant-market-lab/
├── src/quant_market_lab/
│   └── core/
│       ├── order.py   # Side, OrderType, Order
│       └── trade.py   # Trade
├── tests/
│   ├── test_order.py
│   └── test_trade.py
└── docs/phase1_architecture.md
```

The `Order` model uses integer ticks for internal prices and distinguishes original `quantity` from current `remaining_quantity`. It provides derived fill-state properties and returns validated replacement objects for partial fills. The `Trade` model records a single execution and rejects self-trades at the domain boundary.

## Requirements

Python 3.11 or later is required. The runtime domain models use only the Python standard library. Pytest is required for the test suite.

## Installation

From this directory, create and activate a virtual environment, then install the project with its test dependency:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[test]"
```

## Quick start

```python
from quant_market_lab.core.order import Order, OrderType, Side
from quant_market_lab.core.trade import Trade

order = Order(
    order_id=1,
    trader_id="TRADER_001",
    side=Side.BUY,
    order_type=OrderType.LIMIT,
    price=10_000,
    quantity=100,
    remaining_quantity=100,
    timestamp=1,
)

partially_filled = order.with_remaining_quantity(40)
print(partially_filled.filled_quantity)  # 60

trade = Trade(
    trade_id=1,
    buy_order_id=1,
    sell_order_id=2,
    price=10_000,
    quantity=60,
    timestamp=2,
)
print(trade)
```

## Run the tests

```bash
python -m pytest -q
```

The Phase 1 suite covers valid limit and market orders, string enum values, strict integer validation that rejects booleans, market-versus-limit price invariants, quantity and fill accounting, immutable replacement behavior, trade validation, self-trade prevention, and frozen dataclass immutability.

## Explicitly deferred

Phase 1 does not implement the limit order book, price-time priority, matching, cancellations, exchange orchestration, agents, stochastic processes, Monte Carlo experiments, P&L, transaction costs, Kelly sizing, plotting, databases, web servers, or live-market integrations.

See [`docs/phase1_architecture.md`](docs/phase1_architecture.md) for the complete design and the decisions that will constrain later phases.
