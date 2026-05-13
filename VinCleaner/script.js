let originalData = [];
let filteredData = [];

const fileInput = document.getElementById("fileInput");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const rowCount = document.getElementById("rowCount");
const downloadBtn = document.getElementById("downloadBtn");
const searchInput = document.getElementById("searchInput");
const removeIncompleteBtn = document.getElementById("removeIncompleteBtn");

fileInput.addEventListener("change", loadJSON);
downloadBtn.addEventListener("click", downloadJSON);
searchInput.addEventListener("input", searchRows);
removeIncompleteBtn.addEventListener("click", removeIncompleteRows);

function loadJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    let text = e.target.result;

    // Clean encoding artifacts
    text = text.replace(/^\uFEFF/, "").trim();

    // Fix invalid JSON tokens (from JS/Python exports)
    text = text
      .replace(/\bNaN\b/g, "null")
      .replace(/\bInfinity\b/g, "null")
      .replace(/\b-Infinity\b/g, "null");

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("JSON parse failed:", err);
      alert("Invalid JSON file. Check console for details.");
      return;
    }

    // Normalize to array
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    // Remove empty/broken rows safely
    originalData = parsed.filter(row =>
      row && typeof row === "object" && Object.keys(row).length > 0
    );

    filteredData = [...originalData];

    renderTable(filteredData);
  };

  reader.readAsText(file);
}

function renderTable(data) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  rowCount.textContent = data.length;

  if (!data.length) return;

  const keys = Object.keys(data[0]);

  const headerRow = document.createElement("tr");

  keys.forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });

  const actionTh = document.createElement("th");
  actionTh.textContent = "Actions";
  headerRow.appendChild(actionTh);

  tableHead.appendChild(headerRow);

  data.forEach((row, index) => {
    const tr = document.createElement("tr");

    keys.forEach(key => {
      const td = document.createElement("td");
      td.textContent = row[key] ?? "";
      tr.appendChild(td);
    });

    const actionTd = document.createElement("td");

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";

    deleteBtn.onclick = () => {
      filteredData.splice(index, 1);
      renderTable(filteredData);
    };

    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    tableBody.appendChild(tr);
  });
}

function searchRows() {
  const term = searchInput.value.toLowerCase();

  filteredData = originalData.filter(row =>
    Object.values(row).some(v =>
      String(v).toLowerCase().includes(term)
    )
  );

  renderTable(filteredData);
}

function removeIncompleteRows() {
  filteredData = filteredData.filter(row =>
    Object.values(row).every(v =>
      v !== null &&
      v !== undefined &&
      String(v).trim() !== ""
    )
  );

  renderTable(filteredData);
}

function downloadJSON() {
  const blob = new Blob(
    [JSON.stringify(filteredData, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "cleaned-vins.json";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}