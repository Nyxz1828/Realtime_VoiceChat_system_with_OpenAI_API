  const callBtn = document.getElementById("callBtn");
  const endCallBtn = document.getElementById("end_callBtn");
  const log_phone = document.getElementById("log");

  function write(message) {
    if (log_phone) {
      log_phone.textContent += message + "\n";
    } else {
      console.log(message);
    }
  }




  //call button will trigger this function, which sends a request to the server to start a call. The server will then use the EZUCPhoneAPI to dial the specified number. The response from the server is logged in the console log panel.
  async function startCall() {
    try {
      callBtn.disabled = true;
      write("Calling...");

      const response = await fetch("http://localhost:3000/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Call failed");
      }

      write("Call started.");
      endCallBtn.disabled = false;
    } catch (err) {
      write("Call error: " + err.message);
      console.error(err);
      callBtn.disabled = false;
      endCallBtn.disabled = false;
    }
  }

  //end call button will trigger this function, which sends a request to the server to end the call. The server will then use the EZUCPhoneAPI to hang up the call. The response from the server is logged in the console log panel.
  async function endCall() {
    try {
      endCallBtn.disabled = true;
      write("Ending call...");

      const response = await fetch("http://localhost:3000/hangup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Hangup failed");
      }

      write("Call ended.");
      callBtn.disabled = false;
    } catch (err) {
      write("Hangup error: " + err.message);
      console.error(err);
      endCallBtn.disabled = false;
    }
  }

  callBtn.addEventListener("click", startCall);
  endCallBtn.addEventListener("click", endCall);