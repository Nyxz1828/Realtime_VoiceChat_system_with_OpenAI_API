from pathlib import Path
import argparse
import time
from typing import Optional
import winsound

import requests

from EZUCPhoneAPI import EZUCPhoneAPI


BASE_DIR = Path(__file__).resolve().parent
DIALOGUE_DIR = BASE_DIR / "DIALOGUE"
SERVER_URL = "http://localhost:3000"

AUDIO_BY_ACTION = {
    "confirmed": DIALOGUE_DIR / "intro.wav",
    "rejected": DIALOGUE_DIR / "bye.wav",
    "ending": DIALOGUE_DIR / "ending.wav",
}

KEYWORDS_BY_ACTION = {
    "confirmed": [
        "我先簡單介紹一下",
        "簡單介紹",
        "介紹一下",
        "確認是本人",
    ],
    "rejected": [
        "不好意思打擾",
        "不是本人",
        "不方便",
        "拒絕",
        "不要",
    ],
    "ending": [
        "感謝您的時間",
        "謝謝您的時間",
        "再見",
        "稍後會",
        "真人客服",
    ],
}


def play_audio(file_path: Path, async_play: bool = True):
    if not file_path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    flags = winsound.SND_FILENAME
    if async_play:
        flags |= winsound.SND_ASYNC

    winsound.PlaySound(str(file_path), flags)


def get_conversation(server_url: str):
    response = requests.get(f"{server_url}/conversation", timeout=10)
    response.raise_for_status()
    return response.json()


def get_latest_assistant_reply(server_url: str):
    data = get_conversation(server_url)
    latest = data.get("latestAssistantReply") or ""

    if latest:
        return latest

    for message in reversed(data.get("conversation", [])):
        if message.get("role") == "assistant":
            return message.get("text", "")

    return ""


def choose_action(reply_text: str):
    normalized = reply_text.strip()
    if not normalized:
        return None

    for action, keywords in KEYWORDS_BY_ACTION.items():
        if any(keyword in normalized for keyword in keywords):
            return action

    return None


def setup_phone(phone_number: Optional[str], ezuc_port: int):
    if not phone_number:
        return None

    phone = EZUCPhoneAPI(port=ezuc_port)
    result = phone.test_connection()
    print("Connection test:", result)

    if not result.get("reachable"):
        print("Phone API is not reachable.")
        return None

    dial_result = phone.dial(phone_number, "lead_001")
    print("Dial result:", dial_result)
    return phone


def run(
    server_url: str,
    phone_number: Optional[str],
    ezuc_port: int,
    poll_seconds: float,
    play_greeting: bool,
):
    print("Starting test runner")
    print("Reading conversation from:", server_url)

    phone = setup_phone(phone_number, ezuc_port)

    if play_greeting:
        greeting = DIALOGUE_DIR / "hi.wav"
        print("Playing greeting:", greeting)
        play_audio(greeting)

    last_reply = ""

    try:
        while True:
            try:
                latest_reply = get_latest_assistant_reply(server_url)
            except requests.RequestException as error:
                print("Server read failed:", error)
                time.sleep(poll_seconds)
                continue

            if latest_reply and latest_reply != last_reply:
                last_reply = latest_reply
                print("Latest assistant reply:", latest_reply)

                action = choose_action(latest_reply)
                print("Selected action:", action or "none")

                if action:
                    audio_path = AUDIO_BY_ACTION[action]
                    print("Playing:", audio_path)
                    play_audio(audio_path)

                    if action in {"rejected", "ending"} and phone is not None:
                        try:
                            print("Hanging up phone")
                            phone.hangup()
                        except Exception as error:
                            print("Hangup failed:", error)

            time.sleep(poll_seconds)

    except KeyboardInterrupt:
        print("Stopped by user")
        if phone is not None:
            try:
                phone.hangup()
            except Exception:
                pass


def parse_args():
    parser = argparse.ArgumentParser(
        description="Poll the local Realtime server and play local dialogue audio based on assistant replies."
    )
    parser.add_argument("--server-url", default=SERVER_URL)
    parser.add_argument("--phone", default=None, help="Optional phone number to dial through EZUCPhoneAPI.")
    parser.add_argument("--ezuc-port", type=int, default=8780)
    parser.add_argument("--poll-seconds", type=float, default=0.5)
    parser.add_argument("--no-greeting", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(
        server_url=args.server_url,
        phone_number=args.phone,
        ezuc_port=args.ezuc_port,
        poll_seconds=args.poll_seconds,
        play_greeting=not args.no_greeting,
    )
