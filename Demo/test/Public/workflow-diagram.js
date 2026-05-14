let workflowData = null;
let currentLanguage = "en";

const diagram = document.getElementById("workflowDiagram");
const details = document.getElementById("workflowDetails");
const edgesSvg = document.getElementById("workflowEdges");
const modeSelect = document.getElementById("workflowMode");
const mermaidSource = document.getElementById("mermaidSource");
const copyButton = document.getElementById("copyMermaid");
const copyStatus = document.getElementById("copyStatus");
const languageButtons = document.getElementById("languageButtons");
const jsonEditor = document.getElementById("workflowJsonEditor");
const saveConfigButton = document.getElementById("saveWorkflowConfig");
const reloadConfigButton = document.getElementById("reloadWorkflowConfig");
const saveStatus = document.getElementById("workflowSaveStatus");
let editorDirty = false;
let canSaveWorkflowConfig = false;

function text(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value[currentLanguage] || value.en || Object.values(value)[0] || fallback;
}

function t(key, fallback = "") {
  const language = workflowData.languages[currentLanguage] || workflowData.languages.en;
  return language[key] || fallback;
}

function fieldLabel(key) {
  const language = workflowData.languages[currentLanguage] || workflowData.languages.en;
  return language.fields[key] || key;
}

function nodeClass(node) {
  return ["node", node.type ? `is-${node.type}` : ""].filter(Boolean).join(" ");
}

function isEdgeVisible(edge, mode) {
  const view = workflowData.views[mode] || workflowData.views.full;

  if (!view || view.edges === "all") {
    return true;
  }

  return Array.isArray(view.edgeLabels) && view.edgeLabels.includes(edge.label);
}

function visibleModel(mode) {
  const edges = workflowData.edges.filter((edge) => isEdgeVisible(edge, mode));
  const nodeIds = new Set(edges.flatMap((edge) => [edge.from, edge.to]));

  if (mode === "full") {
    Object.keys(workflowData.nodes).forEach((nodeId) => nodeIds.add(nodeId));
  }

  return {
    nodes: Object.fromEntries(
      Object.entries(workflowData.nodes).filter(([nodeId]) => nodeIds.has(nodeId))
    ),
    edges
  };
}

function mermaidNodeShape(nodeId, node) {
  const label = `${text(node.title)}\\n${node.meta || ""}`;

  if (node.type === "decision") {
    return `${nodeId}{${label}}`;
  }

  if (node.type === "end") {
    return `${nodeId}([${label}])`;
  }

  return `${nodeId}[${label}]`;
}

function toMermaid(model) {
  const nodeLines = Object.entries(model.nodes).map(([nodeId, node]) => {
    return `  ${mermaidNodeShape(nodeId, node)}`;
  });

  const edgeLines = model.edges.map((edge) => {
    return `  ${edge.from} -->|${text(edge.labelText, edge.label)}| ${edge.to}`;
  });

  return ["flowchart LR", ...nodeLines, ...edgeLines].join("\n");
}

function renderLanguageButtons() {
  languageButtons.innerHTML = "";

  Object.entries(workflowData.languages).forEach(([languageCode, language]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = languageCode === currentLanguage ? "language-button is-active" : "language-button";
    button.dataset.language = languageCode;
    button.textContent = language.button || languageCode.toUpperCase();
    button.addEventListener("click", () => {
      currentLanguage = languageCode;
      render();
    });
    languageButtons.appendChild(button);
  });
}

function renderPageText() {
  const language = workflowData.languages[currentLanguage] || workflowData.languages.en;
  document.documentElement.lang = language.code || currentLanguage;
  document.getElementById("workflowEyebrow").textContent = language.eyebrow;
  document.getElementById("workflowTitle").textContent = language.title;
  document.getElementById("workflowSummary").textContent = language.summary;
  const backLink = document.getElementById("backLink");
  if (backLink) {
    backLink.textContent = language.back;
  }
  document.getElementById("viewLabel").textContent = language.view;
  document.getElementById("copyMermaid").textContent = language.copy;
  document.getElementById("sourceTitle").textContent = language.sourceTitle;
  document.getElementById("detailsTitle").textContent = language.detailsTitle;

  Array.from(modeSelect.options).forEach((option) => {
    option.textContent = language.views[option.value] || option.value;
  });
}

function renderNodes(model) {
  diagram.innerHTML = "";

  Object.entries(model.nodes).forEach(([nodeId, node]) => {
    const element = document.createElement("article");
    element.className = nodeClass(node);
    element.dataset.nodeId = nodeId;
    element.style.gridColumn = String(node.col);
    element.style.gridRow = String(node.row);
    element.innerHTML = `
      <div class="node-title"></div>
      <div class="node-detail"></div>
      <div class="node-meta"></div>
    `;
    element.querySelector(".node-title").textContent = text(node.title);
    element.querySelector(".node-detail").textContent = text(node.detail);
    element.querySelector(".node-meta").textContent = node.meta || "";
    diagram.appendChild(element);
  });
}

function renderDetails(model) {
  details.innerHTML = "";

  Object.entries(model.nodes).forEach(([nodeId, node]) => {
    const item = document.createElement("article");
    item.className = "detail-card";

    const rows = Object.entries(node.data || {})
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => {
        return `
          <div class="detail-row">
            <dt>${fieldLabel(key)}</dt>
            <dd>${String(value)}</dd>
          </div>
        `;
      })
      .join("");

    item.innerHTML = `
      <h3>${text(node.title)}</h3>
      <p>${text(node.detail)}</p>
      <dl>${rows}</dl>
      <div class="detail-id">${nodeId}</div>
    `;
    details.appendChild(item);
  });
}

function clearEdgeLabels() {
  document.querySelectorAll(".edge-label").forEach((label) => label.remove());
}

function centerFor(nodeElement, shellRect) {
  const rect = nodeElement.getBoundingClientRect();
  return {
    x: rect.left - shellRect.left + rect.width / 2,
    y: rect.top - shellRect.top + rect.height / 2
  };
}

function drawEdges(model) {
  const shell = document.querySelector(".diagram-shell");
  const shellRect = shell.getBoundingClientRect();
  const width = Math.max(shell.scrollWidth, shell.clientWidth);
  const height = Math.max(shell.scrollHeight, shell.clientHeight);

  edgesSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  edgesSvg.setAttribute("width", String(width));
  edgesSvg.setAttribute("height", String(height));
  edgesSvg.innerHTML = `
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#71717a"></path>
      </marker>
    </defs>
  `;
  clearEdgeLabels();

  model.edges.forEach((edge) => {
    const fromElement = diagram.querySelector(`[data-node-id="${edge.from}"]`);
    const toElement = diagram.querySelector(`[data-node-id="${edge.to}"]`);
    if (!fromElement || !toElement) return;

    const from = centerFor(fromElement, shellRect);
    const to = centerFor(toElement, shellRect);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const controlOffset = Math.max(36, Math.abs(to.x - from.x) / 2);
    path.setAttribute("d", `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#71717a");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("marker-end", "url(#arrow)");
    edgesSvg.appendChild(path);

    const label = document.createElement("span");
    label.className = "edge-label";
    label.textContent = text(edge.labelText, edge.label);
    label.style.left = `${midX}px`;
    label.style.top = `${midY}px`;
    shell.appendChild(label);
  });
}

function render() {
  renderPageText();
  renderLanguageButtons();

  const model = visibleModel(modeSelect.value);
  mermaidSource.textContent = toMermaid(model);
  renderNodes(model);
  renderDetails(model);
  if (jsonEditor && !editorDirty) {
    jsonEditor.value = JSON.stringify(workflowData, null, 2);
  }
  requestAnimationFrame(() => drawEdges(model));
}

async function copyMermaid() {
  try {
    await navigator.clipboard.writeText(mermaidSource.textContent);
    copyStatus.textContent = t("copied", "Copied");
    setTimeout(() => {
      copyStatus.textContent = "";
    }, 1600);
  } catch {
    copyStatus.textContent = t("copyFailed", "Copy failed");
  }
}

async function init() {
  try {
    let response = await fetch("/workflow-config", { cache: "no-store" });
    canSaveWorkflowConfig = response.ok;

    if (!response.ok) {
      response = await fetch("workflow-data.json", { cache: "no-store" });
      canSaveWorkflowConfig = false;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    workflowData = await response.json();
    currentLanguage = workflowData.defaultLanguage || "en";
    render();
    if (saveStatus && !canSaveWorkflowConfig) {
      saveStatus.textContent = "Read-only: start with node server.js to save JSON";
    }
  } catch (error) {
    workflowData = {
      languages: {
        en: {
          loadError: "Could not load workflow-data.json. Open this page through the test server instead of file explorer."
        }
      }
    };
    diagram.textContent = workflowData.languages.en.loadError;
    console.error(error);
  }
}

async function saveWorkflowConfig() {
  if (!jsonEditor) return;

  try {
    if (!canSaveWorkflowConfig) {
      throw new Error("Cannot save from static/file mode. Run `node server.js` in the test folder and open http://localhost:3000/");
    }

    const nextConfig = JSON.parse(jsonEditor.value);
    const response = await fetch("/workflow-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Save failed");
    }

    workflowData = data.config || nextConfig;
    editorDirty = false;
    saveStatus.textContent = "Saved";
    window.dispatchEvent(new CustomEvent("voai:workflow-config-updated", { detail: { config: workflowData } }));
    render();

    if (window.voaiAudio?.setInstructionMode) {
      await window.voaiAudio.setInstructionMode();
    }

    setTimeout(() => {
      saveStatus.textContent = "";
    }, 1800);
  } catch (error) {
    saveStatus.textContent = "Save failed: " + error.message;
  }
}

modeSelect.addEventListener("change", render);
copyButton.addEventListener("click", copyMermaid);
if (jsonEditor) {
  jsonEditor.addEventListener("input", () => {
    editorDirty = true;
    if (saveStatus) {
      saveStatus.textContent = "Unsaved changes";
    }
  });
}
if (saveConfigButton) {
  saveConfigButton.addEventListener("click", saveWorkflowConfig);
}
if (reloadConfigButton) {
  reloadConfigButton.addEventListener("click", async () => {
    editorDirty = false;
    await init();
    if (saveStatus) {
      saveStatus.textContent = "Reloaded";
      setTimeout(() => {
        saveStatus.textContent = "";
      }, 1200);
    }
  });
}
window.addEventListener("resize", () => requestAnimationFrame(render));

init();
