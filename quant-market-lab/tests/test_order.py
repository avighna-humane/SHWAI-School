from dataclasses import FrozenInstanceError

import pytest

from quant_market_lab.core.order import Order, OrderType, Side


def limit_buy(**overrides) -> Order:
    values = {
        "order_id": 1,
        "trader_id": "TRADER_001",
        "side": Side.BUY,
        "order_type": OrderType.LIMIT,
        "price": 10_000,
        "quantity": 100,
        "remaining_quantity": 100,
        "timestamp": 1,
    }
    values.update(overrides)
    return Order(**values)


@pytest.mark.parametrize("side", [Side.BUY, Side.SELL])
def test_valid_limit_orders(side):
    order = limit_buy(side=side)

    assert order.side is side
    assert order.is_limit_order
    assert not order.is_market_order
    assert order.filled_quantity == 0
    assert not order.is_fully_filled


@pytest.mark.parametrize("side", [Side.BUY, Side.SELL])
def test_valid_market_orders(side):
    order = limit_buy(side=side, order_type=OrderType.MARKET, price=None)

    assert order.side is side
    assert order.is_market_order
    assert not order.is_limit_order


@pytest.mark.parametrize("field", ["order_id", "quantity", "remaining_quantity", "timestamp"])
def test_integer_fields_reject_booleans(field):
    with pytest.raises(TypeError, match=field):
        limit_buy(**{field: True})


def test_order_id_must_be_non_negative_integer():
    with pytest.raises(ValueError, match="order_id"):
        limit_buy(order_id=-1)
    with pytest.raises(TypeError, match="order_id"):
        limit_buy(order_id="1")


def test_timestamp_must_be_non_negative_integer():
    with pytest.raises(ValueError, match="timestamp"):
        limit_buy(timestamp=-1)
    with pytest.raises(TypeError, match="timestamp"):
        limit_buy(timestamp=1.5)


@pytest.mark.parametrize("trader_id", ["", "   "])
def test_trader_id_must_be_non_empty(trader_id):
    with pytest.raises(ValueError, match="trader_id"):
        limit_buy(trader_id=trader_id)


def test_trader_id_must_be_string():
    with pytest.raises(TypeError, match="trader_id"):
        limit_buy(trader_id=123)


@pytest.mark.parametrize("quantity", [0, -1])
def test_quantity_must_be_positive(quantity):
    with pytest.raises(ValueError, match="quantity"):
        limit_buy(quantity=quantity)


@pytest.mark.parametrize("remaining_quantity", [-1, 101])
def test_remaining_quantity_must_be_within_original_quantity(remaining_quantity):
    with pytest.raises(ValueError, match="remaining_quantity"):
        limit_buy(remaining_quantity=remaining_quantity)


def test_limit_order_requires_positive_integer_price():
    with pytest.raises(TypeError, match="price"):
        limit_buy(price=None)
    with pytest.raises(TypeError, match="price"):
        limit_buy(price=100.5)
    with pytest.raises(TypeError, match="price"):
        limit_buy(price=True)
    with pytest.raises(ValueError, match="price"):
        limit_buy(price=0)
    with pytest.raises(ValueError, match="price"):
        limit_buy(price=-1)


def test_market_order_requires_none_price():
    with pytest.raises(ValueError, match="market order price"):
        limit_buy(order_type=OrderType.MARKET, price=10_000)


def test_order_requires_domain_enums():
    with pytest.raises(TypeError, match="side"):
        limit_buy(side="BUY")
    with pytest.raises(TypeError, match="order_type"):
        limit_buy(order_type="LIMIT")


def test_fill_accounting():
    order = limit_buy(remaining_quantity=40)

    assert order.quantity == 100
    assert order.remaining_quantity == 40
    assert order.filled_quantity == 60
    assert not order.is_fully_filled


def test_fully_filled_order():
    order = limit_buy(remaining_quantity=0)

    assert order.filled_quantity == 100
    assert order.is_fully_filled


def test_with_remaining_quantity_returns_new_order():
    original = limit_buy()
    updated = original.with_remaining_quantity(40)

    assert updated is not original
    assert original.remaining_quantity == 100
    assert updated.remaining_quantity == 40
    assert updated.filled_quantity == 60
    assert updated.order_id == original.order_id
    assert updated.timestamp == original.timestamp


def test_with_remaining_quantity_revalidates_input():
    order = limit_buy()

    with pytest.raises(TypeError, match="remaining_quantity"):
        order.with_remaining_quantity(True)
    with pytest.raises(ValueError, match="remaining_quantity"):
        order.with_remaining_quantity(101)


def test_order_is_immutable():
    order = limit_buy()

    with pytest.raises(FrozenInstanceError):
        order.quantity = 500


def test_enums_have_serializable_string_values():
    assert Side.BUY.value == "BUY"
    assert Side.SELL.value == "SELL"
    assert OrderType.LIMIT.value == "LIMIT"
    assert OrderType.MARKET.value == "MARKET"
