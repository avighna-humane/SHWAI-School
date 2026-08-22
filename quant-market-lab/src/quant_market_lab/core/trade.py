"""Trade execution record for the synthetic exchange."""

from dataclasses import dataclass

from .order import _require_exact_int, _require_non_negative_int


@dataclass(frozen=True, slots=True)
class Trade:
    """A single execution between distinct buy and sell orders."""

    trade_id: int
    buy_order_id: int
    sell_order_id: int
    price: int
    quantity: int
    timestamp: int

    def __post_init__(self) -> None:
        _require_non_negative_int(self.trade_id, "trade_id")
        _require_non_negative_int(self.buy_order_id, "buy_order_id")
        _require_non_negative_int(self.sell_order_id, "sell_order_id")

        if self.buy_order_id == self.sell_order_id:
            raise ValueError("buy_order_id and sell_order_id must be different")

        _require_exact_int(self.price, "price")
        if self.price <= 0:
            raise ValueError("price must be positive")

        _require_exact_int(self.quantity, "quantity")
        if self.quantity <= 0:
            raise ValueError("quantity must be positive")

        _require_non_negative_int(self.timestamp, "timestamp")
