(() => {
  const testBtn = document.getElementById("testBtn");

  let activeStep = null;
  let activeAudio = null;
  let runtimeFlow = null;
  let workflowDataPromise = null;
  let lastReply = "";
  let lastReplyAt = 0;
  const scheduledTimes = [];
  window.voaiScheduledTimes = scheduledTimes;

  function log(message) {
    if (window.voaiAudio?.write) {
      window.voaiAudio.write(message);
      return;
    }

    console.log(message);
  }

  function cleanReply(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[.!?。！？\s]+$/g, "");
  }

  function parseTimeReply(text) {
    const raw = String(text || "").trim();
    const match = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2})[:\/](\d{2})(?:\s*\|\s*(specified time|not specified time|.+))?$/i);

    if (!match) return null;

    const parsedDate = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5])
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const parsedDayStart = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    const finalDate = parsedDayStart < todayStart ? now : parsedDate;
    const datetime = formatLocalDateTime(finalDate);

    return {
      datetime,
      summary: normalizeTimeSpecificity(match[6]),
      raw
    };
  }

  function normalizeTimeSpecificity(value) {
    const summary = String(value || "").trim().toLowerCase();

    if (summary === "not specified time") {
      return "not specified time";
    }

    if (summary === "specified time") {
      return "specified time";
    }

    if (summary.includes("not") || summary.includes("broad") || summary.includes("relative")) {
      return "not specified time";
    }

    return "specified time";
  }

  function formatLocalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }

  function isDuplicateReply(text) {
    const now = Date.now();
    const normalized = String(text || "").trim();

    if (normalized && normalized === lastReply && now - lastReplyAt < 1500) {
      return true;
    }

    lastReply = normalized;
    lastReplyAt = now;
    return false;
  }

  function setTestButtonEnabled(enabled) {
    if (testBtn) {
      testBtn.disabled = !enabled;
    }
  }

  async function loadWorkflowData() {
    if (!workflowDataPromise) {
      workflowDataPromise = fetch("/workflow-config", { cache: "no-store" })
        .then(async (response) => {
          if (response.ok) {
            return response.json();
          }

          const fallback = await fetch("workflow-data.json", { cache: "no-store" });
          if (!fallback.ok) {
            throw new Error("Failed to load workflow config: HTTP " + response.status);
          }

          log("Loaded workflow-data.json in read-only mode. Start the Express server to save edits.");
          return fallback.json();
        });
    }

    return workflowDataPromise;
  }

  function createRuntimeFlow(workflowData) {
    const nodes = workflowData.nodes || {};

    function stepFromNode(nodeId) {
      const node = nodes[nodeId];
      const data = node?.data || {};
      const noNode = data.noNext ? nodes[data.noNext] : null;

      return {
        mode: data.mode || "test",
        audio: data.audio,
        history: data.prompt,
        yesNext: data.yesNext,
        noNext: data.noNext,
        noAudio: data.noAudio || noNode?.data?.audio,
        okAudio: data.okAudio,
        invalidNext: data.invalidNext,
        unclearNext: data.unclearNext
      };
    }

    return {
      identity: stepFromNode("identity"),
      interest: stepFromNode("interest"),
      time: stepFromNode("time")
    };
  }

  async function getRuntimeFlow() {
    if (!runtimeFlow) {
      runtimeFlow = createRuntimeFlow(await loadWorkflowData());
    }

    return runtimeFlow;
  }

  async function playDialogueAudio(src) {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    activeAudio = new Audio(src);
    await activeAudio.play();
  }

  async function replayCurrentAudio(reason) {
    if (!activeStep) return;

    const flow = await getRuntimeFlow();
    const step = flow[activeStep];
    await window.voaiAudio.addSystemHistory(reason);
    await window.voaiAudio.setInstructionMode(step.mode);
    await playDialogueAudio(step.audio);
    log("Replayed " + step.audio + ". Waiting for clearer speech...");
  }

  async function waitForRealtimeSession() {
    if (window.voaiAudio?.isSessionReady?.()) {
      return;
    }

    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (window.voaiAudio?.isSessionReady?.()) {
        return;
      }
    }

    throw new Error("Realtime session is not ready.");
  }

  async function ensureTestSession() {
    await window.voaiAudio.setInstructionMode("test");

    if (!window.voaiAudio.isSessionReady()) {
      log("Starting voice session for text-only analysis...");
      await window.voaiAudio.startVoice();
      await waitForRealtimeSession();
    }

    await window.voaiAudio.setInstructionMode("test");
  }

  async function enterStep(stepName) {
    const flow = await getRuntimeFlow();
    const step = flow[stepName];
    activeStep = stepName;
    lastReply = "";
    lastReplyAt = 0;

    await window.voaiAudio.addSystemHistory(step.history);
    await window.voaiAudio.setInstructionMode(step.mode);
    await playDialogueAudio(step.audio);
    log("Played " + step.audio + ". Waiting for person speech...");
  }

  async function endFlow(audioPath, reason) {
    activeStep = null;
    await window.voaiAudio.addSystemHistory(reason);
    await playDialogueAudio(audioPath);
    log("Played " + audioPath + ". Test flow stopped.");
    setTestButtonEnabled(true);
  }

  async function startTestFlow() {
    if (!window.voaiAudio) {
      throw new Error("Voice controls are not ready.");
    }

    setTestButtonEnabled(false);
    await getRuntimeFlow();
    await ensureTestSession();
    await enterStep("identity");
  }

  async function handleDecisionReply(text) {
    const decision = cleanReply(text);

    if (decision !== "yes" && decision !== "no") {
      await replayCurrentAudio("AI returned unclear for " + activeStep + ". Replaying the same audio.");
      return;
    }

    const flow = await getRuntimeFlow();
    const step = flow[activeStep];

    if (decision === "no") {
      await endFlow(step.noAudio, "AI detected no for " + activeStep + ". Ending conversation.");
      return;
    }

    await window.voaiAudio.addSystemHistory("AI detected yes for " + activeStep + ".");
    await enterStep(step.yesNext);
  }

  async function handleTimeReply(text) {
    const parsed = parseTimeReply(text);

    if (!parsed) {
      await replayCurrentAudio("AI could not extract a valid appointment time. Replaying time_inquiry.wav.");
      return;
    }

    scheduledTimes.push(parsed);
    const flow = await getRuntimeFlow();
    await endFlow(
      flow.time.okAudio,
      "Appointment time saved: " + parsed.datetime + " | " + parsed.summary + ". Played ok.wav and ended conversation."
    );
  }

  async function handleAssistantReply(event) {
    if (!activeStep) return;

    const text = event.detail?.text;
    if (isDuplicateReply(text)) return;

    if (activeStep === "time") {
      await handleTimeReply(text);
      return;
    }

    await handleDecisionReply(text);
  }

  if (testBtn) {
    testBtn.addEventListener("click", async () => {
      try {
        await startTestFlow();
      } catch (error) {
        activeStep = null;
        setTestButtonEnabled(true);
        log("Test error: " + error.message);
        console.error(error);
      }
    });
  }

  window.addEventListener("voai:assistant-reply", (event) => {
    handleAssistantReply(event).catch((error) => {
      activeStep = null;
      setTestButtonEnabled(true);
      log("Test reply handling error: " + error.message);
      console.error(error);
    });
  });

  window.addEventListener("voai:workflow-config-updated", () => {
    runtimeFlow = null;
    workflowDataPromise = null;
    log("Workflow config reloaded for the next test run.");
  });
})();
