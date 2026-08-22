from dataclasses import FrozenInstanceError

import pytest

from quant_market_lab.core.trade import Trade


def valid_trade(**overrides) -> Trade:
    values = {
        "trade_id": 1,
        "buy_order_id": 10,
        "sell_order_id": 20,
        "price": 10_000,
        "quantity": 60,
        "timestamp": 2,
    }
    values.update(overrides)
    return Trade(**values)


def test_valid_trade_can_be_constructed():
    trade = valid_trade()

    assert trade.trade_id == 1
    assert trade.buy_order_id == 10
    assert trade.sell_order_id == 20
    assert trade.price == 10_000
    assert trade.quantity == 60
    assert trade.timestamp == 2


@pytest.mark.parametrize("field", ["trade_id", "buy_order_id", "sell_order_id", "timestamp"])
def test_non_negative_identifier_fields_reject_booleans(field):
    with pytest.raises(TypeError, match=field):
        valid_trade(**{field: True})


@pytest.mark.parametrize("field", ["trade_id", "buy_order_id", "sell_order_id", "timestamp"])
def test_non_negative_identifier_fields_reject_negative_values(field):
    with pytest.raises(ValueError, match=field):
        valid_trade(**{field: -1})


@pytest.mark.parametrize("field", ["trade_id", "buy_order_id", "sell_order_id", "timestamp"])
def test_non_negative_identifier_fields_require_integers(field):
    with pytest.raises(TypeError, match=field):
        valid_trade(**{field: "1"})


def test_trade_rejects_self_trade():
    with pytest.raises(ValueError, match="different"):
        valid_trade(buy_order_id=10, sell_order_id=10)


@pytest.mark.parametrize("price", [0, -1])
def test_trade_price_must_be_positive(price):
    with pytest.raises(ValueError, match="price"):
        valid_trade(price=price)


def test_trade_price_must_be_an_integer_and_not_boolean():
    with pytest.raises(TypeError, match="price"):
        valid_trade(price=10.5)
    with pytest.raises(TypeError, match="price"):
        valid_trade(price=True)


@pytest.mark.parametrize("quantity", [0, -1])
def test_trade_quantity_must_be_positive(quantity):
    with pytest.raises(ValueError, match="quantity"):
        valid_trade(quantity=quantity)


def test_trade_quantity_must_be_an_integer_and_not_boolean():
    with pytest.raises(TypeError, match="quantity"):
        valid_trade(quantity=10.5)
    with pytest.raises(TypeError, match="quantity"):
        valid_trade(quantity=False)


def test_trade_is_immutable():
    trade = valid_trade()

    with pytest.raises(FrozenInstanceError):
        trade.price = 10_001
