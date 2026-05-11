from urllib.parse import urljoin
import requests


class EZUCPhoneAPI:
    def __init__(self, host="localhost", port=8780, protocol="http", timeout=5):
        self.host = host
        self.port = port
        self.protocol = protocol
        self.timeout = timeout

    @property
    def base_url(self):
        return f"{self.protocol}://{self.host}:{self.port}"

    def build_url(self, path):
        return urljoin(self.base_url, path)

    def request(self, path, params=None):
        if params is None:
            params = {}

        # remove empty values like JS version
        clean_params = {
            key: value
            for key, value in params.items()
            if value is not None and value != ""
        }

        url = self.build_url(path)

        response = requests.get(
            url,
            params=clean_params,
            timeout=self.timeout
        )

        return {
            "ok": response.ok,
            "status": response.status_code,
            "url": response.url,
            "data": response.text
        }

    def dial(self, number, link_id=""):
        if not number:
            raise ValueError("dial(number): number is required")
        return self.request("/dialout", {"number": number, "linkId": link_id})

    def hangup(self):
        return self.request("/hangup")

    def dial_hardphone(self, number, link_id=""):
        if not number:
            raise ValueError("dial_hardphone(number): number is required")
        return self.request(
            "/dialout",
            {
                "hardphoneOnly": 1,
                "number": number,
                "linkId": link_id
            }
        )

    def hangup_hardphone(self):
        return self.request("/hangup", {"hardphoneOnly": 1})

    def open_chat_room(self, room_name):
        if not room_name:
            raise ValueError("open_chat_room(room_name): room_name is required")
        return self.request("/popupRoom", {"name": room_name})

    def test_connection(self):
        try:
            result = self.request("/hangup")
            return {"reachable": True, **result}
        except Exception as error:
            return {"reachable": False, "error": str(error)}
        
        
if __name__ == "__main__":
    phone = EZUCPhoneAPI(port=8780)

    result = phone.test_connection()
    print("Connection test:", result)

    dial_result = phone.dial("0975408241", "lead_001")
    print("Dial result:", dial_result)
    if dial_result["ok"]:
        print("Dial successfully initiated.")


    # hangup_result = phone.hangup()
    # print("Hangup result:", hangup_result)