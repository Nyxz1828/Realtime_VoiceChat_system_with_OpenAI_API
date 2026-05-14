import os
import requests


def check_model(model_name="gpt-realtime"):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    url = f"https://api.openai.com/v1/models/{model_name}"

    res = requests.get(
        url,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=20
    )

    print("Status:", res.status_code)

    if res.status_code == 200:
        print(f"✅ {model_name} is available")
        print(res.json())
        return True

    print(f"❌ {model_name} not available or request failed")
    print(res.text)
    return False


if __name__ == "__main__":
    check_model("gpt-realtime")
    print("-" * 50)
    check_model("gpt-realtime-2")