"""Order domain model for the synthetic exchange.

The model deliberately uses integer ticks for prices.  Floating-point price
conversion belongs at an application boundary, not in the matching domain.
"""

from dataclasses import dataclass, replace
from enum import Enum


class Side(str, Enum):
    """The direction of an order."""

    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    """The execution instruction attached to an order."""

    LIMIT = "LIMIT"
    MARKET = "MARKET"


def _require_exact_int(value: object, field_name: str) -> None:
    """Require a real integer, explicitly excluding booleans."""

    if type(value) is not int:
        raise TypeError(f"{field_name} must be an integer")


def _require_non_negative_int(value: object, field_name: str) -> None:
    _require_exact_int(value, field_name)
    if value < 0:  # type narrowing is unnecessary after the exact check.
        raise ValueError(f"{field_name} must be non-negative")


@dataclass(frozen=True, slots=True)
class Order:
    """An immutable order submitted to the future exchange.

    ``quantity`` is the original submitted quantity.  ``remaining_quantity``
    is the currently unfilled quantity and may be reduced by creating a new
    instance with :meth:`with_remaining_quantity`.
    """

    order_id: int
    trader_id: str
    side: Side
    order_type: OrderType
    price: int | None
    quantity: int
    remaining_quantity: int
    timestamp: int

    def __post_init__(self) -> None:
        _require_non_negative_int(self.order_id, "order_id")

        if type(self.trader_id) is not str:
            raise TypeError("trader_id must be a string")
        if not self.trader_id.strip():
            raise ValueError("trader_id must be a non-empty string")

        if not isinstance(self.side, Side):
            raise TypeError("side must be a Side")
        if not isinstance(self.order_type, OrderType):
            raise TypeError("order_type must be an OrderType")

        _require_exact_int(self.quantity, "quantity")
        if self.quantity <= 0:
            raise ValueError("quantity must be positive")

        _require_exact_int(self.remaining_quantity, "remaining_quantity")
        if not 0 <= self.remaining_quantity <= self.quantity:
            raise ValueError("remaining_quantity must be between 0 and quantity")

        _require_non_negative_int(self.timestamp, "timestamp")

        if self.order_type is OrderType.LIMIT:
            _require_exact_int(self.price, "price")
            if self.price <= 0:
                raise ValueError("limit order price must be positive")
        elif self.price is not None:
            raise ValueError("market order price must be None")

    @property
    def is_market_order(self) -> bool:
        """Whether this order must consume available liquidity."""

        return self.order_type is OrderType.MARKET

    @property
    def is_limit_order(self) -> bool:
        """Whether this order may rest at its specified price."""

        return self.order_type is OrderType.LIMIT

    @property
    def filled_quantity(self) -> int:
        """The quantity already executed for this order."""

        return self.quantity - self.remaining_quantity

    @property
    def is_fully_filled(self) -> bool:
        """Whether no quantity remains available for execution."""

        return self.remaining_quantity == 0

    def with_remaining_quantity(self, remaining_quantity: int) -> "Order":
        """Return a validated replacement with updated unfilled quantity."""

        return replace(self, remaining_quantity=remaining_quantity)
