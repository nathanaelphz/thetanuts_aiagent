import json

def load_market_data(path="market-data.json"):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


data = load_market_data()

print("=== PYTHON MARKET DATA TEST ===")
print("Chain ID:", data["optionBook"]["chainId"])
print("Live orders:", len(data["optionBook"]["orders"]))
print("BTC:", data["market"]["prices"]["BTC"])
print("ETH:", data["market"]["prices"]["ETH"])
print("BTC IV:", data["market"]["volatility"]["BTC"]["current"])
print("ETH IV:", data["market"]["volatility"]["ETH"]["current"])