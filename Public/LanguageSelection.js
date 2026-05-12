  const langEnBtn = document.getElementById("lang-en");
  const langZhBtn = document.getElementById("lang-zh");
  const langButtons = [langEnBtn, langZhBtn];

  const translations = {
    en: {
      htmlLang: "en",
      pageTitle: "Voice to Voice Demo",
      headerTag: "Realtime Demo",
      mainTitle: "Voice to Voice Demo",
      mainDesc: "Live session interface with transcript, console log, and prompt panel.",
      start: "Start",
      stop: "Stop",
      phoneCall: "Phone Call",
      call: "Call",
      endCall: "End Call",
      language: "Language",
      chatLogTitle: "Chat Log",
      chatLogDesc: "Conversation transcript and assistant messages",
      conversationTitle: "Conversation",
      conversationDesc: "What you said and what the assistant replied",
      aiReplyTitle: "AI Reply Text",
      aiReplyDesc: "Latest assistant reply transcript",
      aiReplyText: "No reply yet.",
      consoleLogTitle: "Console Log",
      consoleLogDesc: "Realtime events, state changes, and debug output",
      promptTitle: "Prompt",
      promptDesc: "Current instruction payload / loaded prompt",
      audioSectionTitle: "Audio Device Settings",
      audioSectionDesc: "Choose the microphone input and speaker output for the voice session.",
      audioInputLabel: "Audio Input",
      audioInputHint: "Uses your system default microphone if no device is selected.",
      audioOutputLabel: "Audio Output",
      audioOutputHint: "Uses your system default speaker if no device is selected.",
      defaultInput: "Default System Input",
      defaultOutput: "Default System Output",
      loading: "Loading..."
    },
    zh: {
      htmlLang: "zh-Hant",
      pageTitle: "語音對語音示範",
      headerTag: "即時示範",
      mainTitle: "語音對語音示範",
      mainDesc: "即時對話介面，包含對話紀錄、主控台日誌與提示詞面板。",
      start: "開始",
      stop: "停止",
      phoneCall: "電話通話",
      call: "撥號",
      endCall: "結束通話",
      language: "語言",
      chatLogTitle: "聊天紀錄",
      chatLogDesc: "對話逐字稿與助理訊息",
      conversationTitle: "對話",
      conversationDesc: "你說的內容與助理回覆",
      aiReplyTitle: "AI 回覆文字",
      aiReplyDesc: "最新助理回覆逐字稿",
      aiReplyText: "尚無回覆。",
      consoleLogTitle: "主控台日誌",
      consoleLogDesc: "即時事件、狀態變更與除錯輸出",
      promptTitle: "提示詞",
      promptDesc: "目前載入的指令內容 / 提示詞",
      audioSectionTitle: "音訊裝置設定",
      audioSectionDesc: "選擇語音通話要使用的麥克風輸入與喇叭輸出。",
      audioInputLabel: "音訊輸入",
      audioInputHint: "若未選擇裝置，將使用系統預設麥克風。",
      audioOutputLabel: "音訊輸出",
      audioOutputHint: "若未選擇裝置，將使用系統預設喇叭。",
      defaultInput: "系統預設輸入",
      defaultOutput: "系統預設輸出",
      loading: "載入中..."
    }
  };

  function setButtonActive(activeBtn) {
    langButtons.forEach((btn) => {
      btn.className =
        "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800";
    });

    activeBtn.className =
      "rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white";
  }

  function setLanguage(lang) {
    const t = translations[lang];

    document.documentElement.lang = t.htmlLang;
    document.title = t.pageTitle;

    document.querySelector("header p.text-xs.uppercase.tracking-\\[0\\.25em\\].text-zinc-500").textContent = t.headerTag;
    document.querySelector("header h1").textContent = t.mainTitle;
    document.querySelector("header h1 + p").textContent = t.mainDesc;

    document.getElementById("startBtn").textContent = t.start;
    document.getElementById("startBtn").title = t.start;

    document.getElementById("stopBtn").textContent = t.stop;
    document.getElementById("stopBtn").title = t.stop;

    document.querySelector('p.mt-2.text-sm.text-zinc-400').textContent = t.phoneCall;

    document.getElementById("callBtn").textContent = t.call;
    document.getElementById("callBtn").title = t.call;

    document.getElementById("end_callBtn").textContent = t.endCall;
    document.getElementById("end_callBtn").title = t.endCall;

    document.querySelector("span.px-2.text-xs.font-medium.uppercase.tracking-widest.text-zinc-500").textContent = t.language;
    document.getElementById("lang-zh").textContent = "繁中";
    document.getElementById("lang-en").textContent = "EN";

    document.getElementById("conversationTitle").textContent = t.conversationTitle || "Conversation";
    document.getElementById("conversationDesc").textContent = t.conversationDesc || "What you said and what the assistant replied";
    document.getElementById("aiReplyTitle").textContent = t.aiReplyTitle || "AI Reply Text";
    document.getElementById("aiReplyDesc").textContent = t.aiReplyDesc || "Latest assistant reply transcript";
    document.getElementById("consoleTitle").textContent = t.consoleLogTitle;
    document.getElementById("consoleDesc").textContent = t.consoleLogDesc;
    document.getElementById("promptTitle").textContent = t.promptTitle;
    document.getElementById("promptDesc").textContent = t.promptDesc;

    const output = document.getElementById("output");
    if (output.textContent.trim() === "Loading..." || output.textContent.trim() === "載入中...") {
      output.textContent = t.loading;
    }

    const aiReplyText = document.getElementById("aiReplyText");
    if (aiReplyText.textContent.trim() === "No reply yet." || aiReplyText.textContent.trim() === "尚無回覆。") {
      aiReplyText.textContent = t.aiReplyText;
    }

    const audioSectionTitle = document.getElementById("audioSectionTitle");
    const audioSectionDesc = document.getElementById("audioSectionDesc");
    const audioInputLabel = document.getElementById("audioInputLabel");
    const audioInputHint = document.getElementById("audioInputHint");
    const audioOutputLabel = document.getElementById("audioOutputLabel");
    const audioOutputHint = document.getElementById("audioOutputHint");
    const audioInputSelect = document.getElementById("audioInputSelect");
    const audioOutputSelect = document.getElementById("audioOutputSelect");

    if (audioSectionTitle) audioSectionTitle.textContent = t.audioSectionTitle;
    if (audioSectionDesc) audioSectionDesc.textContent = t.audioSectionDesc;
    if (audioInputLabel) audioInputLabel.textContent = t.audioInputLabel;
    if (audioInputHint) audioInputHint.textContent = t.audioInputHint;
    if (audioOutputLabel) audioOutputLabel.textContent = t.audioOutputLabel;
    if (audioOutputHint) audioOutputHint.textContent = t.audioOutputHint;

    if (audioInputSelect) {
      const firstInputOption = audioInputSelect.querySelector('option[value=""]');
      if (firstInputOption) {
        firstInputOption.textContent = t.defaultInput;
      }
    }

    if (audioOutputSelect) {
      const firstOutputOption = audioOutputSelect.querySelector('option[value=""]');
      if (firstOutputOption) {
        firstOutputOption.textContent = t.defaultOutput;
      }
    }

    localStorage.setItem("pageLanguage", lang);
    setButtonActive(lang === "zh" ? langZhBtn : langEnBtn);
  }

  langEnBtn.addEventListener("click", () => setLanguage("en"));
  langZhBtn.addEventListener("click", () => setLanguage("zh"));

  const savedLang = localStorage.getItem("pageLanguage") || "zh";
  setLanguage(savedLang);
