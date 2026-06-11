let allData = [];
let filteredData = [];
let currentSort = { key: null, asc: false };
let selectedItems = new Set();

/* =========================
   THEME
========================= */
function applyTheme(light) {
    document.body.classList.toggle("light", light);
    localStorage.setItem("theme", light ? "light" : "dark");
}

applyTheme(true);

/* =========================
   LOAD DATA
========================= */
fetch("all_data.json")
    .then(res => res.text())
    .then(text => {
        const data = JSON.parse(text.replace(/NaN/g, "null"));

        allData = data.map(item => ({
            ...item,
            Make:  item.Make  || "",
            Model: item.Model || "",
            _item: item._item || ""
        }));

        createItemFilters();
        applyFilters();
    })
    .catch(err => console.error("Error loading JSON:", err));

/* =========================
   FILTERS
========================= */
function createItemFilters() {
    const container = document.getElementById("item-filters");
    container.innerHTML = "";

    const uniqueItems = [...new Set(allData.map(d => d._item).filter(Boolean))];

    uniqueItems.forEach(item => {
        const label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${item}"><span>${item}</span>`;

        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", () => {
            checkbox.checked ? selectedItems.add(item) : selectedItems.delete(item);
            label.classList.toggle("active", checkbox.checked);
            applyFilters();
        });

        container.appendChild(label);
    });
}

document.getElementById("clear-filters").addEventListener("click", () => {
    selectedItems.clear();
    document.querySelectorAll("#item-filters input").forEach(cb => {
        cb.checked = false;
        cb.parentElement.classList.remove("active");
    });
    document.getElementById("search").value = "";
    applyFilters();
});

/* =========================
   SEARCH + FILTER
========================= */
function applyFilters() {
    const words = document.getElementById("search").value.trim().toLowerCase().split(" ").filter(Boolean);

    filteredData = allData.filter(item => {
        const matchesSearch = words.every(word =>
            item.Make.toLowerCase().includes(word)  ||
            item.Model.toLowerCase().includes(word) ||
            String(item.Year).includes(word)         ||
            item._item.toLowerCase().includes(word)
        );
        const matchesItem = selectedItems.size === 0 || selectedItems.has(item._item);
        return matchesSearch && matchesItem;
    });

    applySort();
}

document.getElementById("search").addEventListener("input", applyFilters);

/* =========================
   SORT
========================= */
function normalizeValue(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === "string") val = val.replace(/[$,]/g, "").trim();
    if (!isNaN(val) && val !== "") return Number(val);
    return String(val).toLowerCase();
}

function applySort() {
    let data = [...filteredData];

    if (currentSort.key) {
        data.sort((a, b) => {
            const valA = normalizeValue(a[currentSort.key]);
            const valB = normalizeValue(b[currentSort.key]);
            if (valA < valB) return currentSort.asc ? -1 : 1;
            if (valA > valB) return currentSort.asc ? 1 : -1;
            return 0;
        });
    }

    displayData(data);
}

const sortSelect = document.getElementById("sort-select");
sortSelect.addEventListener("change", e => {
    const key = e.target.value;
    if (!key) { currentSort = { key: null, asc: false }; applySort(); return; }
    if (currentSort.key === key) {
        currentSort.asc = !currentSort.asc;
    } else {
        currentSort.key = key;
        currentSort.asc = false;
    }
    applySort();
});

/* =========================
   DISPLAY CARDS
========================= */
function displayData(data) {
    const container = document.getElementById("cards-container");
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `<div class="empty-state">No results found.</div>`;
        return;
    }

    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "data-card";

        const query = encodeURIComponent(item.Query);
        const ebayURL = `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1&LH_ItemCondition=4`;

        card.innerHTML = `
            <div class="card-top">
                <div class="card-info">
                    <div class="card-title">${item._item}</div>
                    <div class="card-sub">
                        ${item.Year} ${item.Make} ${item.Model || ""}
                        &nbsp;·&nbsp;<span class="card-vin">${item.VIN}</span>
                    </div>
                </div>
                <div class="card-price">
                    <div class="price-main">$${item["Average Price"]}</div>
                    <div class="price-label">avg</div>
                </div>
            </div>
            <div class="card-divider"></div>
            <div class="card-meta">
                <div>
                    <div class="meta-label">Median</div>
                    <div class="meta-val">$${item["Median Price"]}</div>
                </div>
                <div>
                    <div class="meta-label">Sales</div>
                    <div class="meta-val">${item["Number of Sales"]}</div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-ghost details-btn">Details</button>
                <button class="btn-primary ebay-btn">eBay ↗</button>
            </div>
        `;

        card.querySelector(".details-btn").addEventListener("click", e => {
            e.stopPropagation();
            showDetails(item);
        });

        card.querySelector(".ebay-btn").addEventListener("click", e => {
            e.stopPropagation();
            window.open(ebayURL, "_blank");
        });

        card.addEventListener("click", () => showDetails(item));

        container.appendChild(card);
    });
}

/* =========================
   DETAILS SHEET
========================= */
function showDetails(item) {
    document.getElementById("details").classList.remove("hidden");
    document.getElementById("d-vin").textContent    = item.VIN;
    document.getElementById("d-query").textContent  = item.Query;
    document.getElementById("d-year").textContent   = item.Year;
    document.getElementById("d-make").textContent   = item.Make;
    document.getElementById("d-model").textContent  = item.Model || "N/A";
    document.getElementById("d-avg").textContent    = `$${item["Average Price"]}`;
    document.getElementById("d-med").textContent    = `$${item["Median Price"]}`;
    document.getElementById("d-sales").textContent  = item["Number of Sales"];
}

function closeDetails() {
    document.getElementById("details").classList.add("hidden");
}

document.getElementById("close-details-btn").addEventListener("click", closeDetails);

/* =========================
   VIN SCANNER
========================= */
let scannerOpen = false;
let scanning = false;
let detectorBound = false;
let lastVin = "";
let lastTime = 0;
let scannerMatches = [];
let scannerMatchSort = { key: null, asc: true };

const vinInput      = document.getElementById("vin-input");
const scannerStatus = document.getElementById("scanner-status");
const scannerError  = document.getElementById("scanner-error");
const scannerResult = document.getElementById("scanner-result");

function openScanner() {
    scannerOpen = true;
    document.getElementById("scanner-card").classList.remove("hidden");
    document.getElementById("scanner-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeScanner() {
    scannerOpen = false;
    document.getElementById("scanner-card").classList.add("hidden");
    stopScanner();
}

document.getElementById("toggle-scanner-btn").addEventListener("click", () => {
    scannerOpen ? closeScanner() : openScanner();
});

document.getElementById("scanner-close-btn").addEventListener("click", closeScanner);

document.getElementById("scanner-start-btn").addEventListener("click", startScanner);
document.getElementById("scanner-stop-btn").addEventListener("click", stopScanner);
document.getElementById("scanner-decode-btn").addEventListener("click", decodeVIN);

function startScanner() {
    if (scanning) return;
    scannerError.textContent = "";

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector("#scanner-viewport"),
            constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        },
        locator: { patchSize: "medium", halfSample: false },
        decoder: { readers: ["code_39_reader", "code_128_reader"] },
        locate: false
    }, function (err) {
        if (err) {
            console.error(err);
            scannerError.textContent = "Failed to access camera.";
            return;
        }
        if (!detectorBound) {
            Quagga.onDetected(onDetected);
            detectorBound = true;
        }
        Quagga.start();
        scanning = true;
    });
}

function stopScanner() {
    if (!scanning) return;
    Quagga.offDetected(onDetected);
    Quagga.stop();
    const video = document.querySelector("#scanner-viewport video");
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }
    detectorBound = false;
    scanning = false;
}

function onDetected(result) {
    const cleaned = result.codeResult.code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const vinMatch = cleaned.match(/[A-HJ-NPR-Z0-9]{17}/);
    if (!vinMatch) {
        scannerStatus.textContent = `Scanned: ${cleaned}`;
        return;
    }
    const vin = vinMatch[0];
    const now = Date.now();
    if (vin === lastVin && now - lastTime < 1000) return;
    lastVin = vin;
    lastTime = now;
    scannerStatus.textContent = "Detected: " + vin;
    vinInput.value = vin;
    stopScanner();
    decodeVIN();
}

async function decodeVIN() {
    const vin = vinInput.value.trim().toUpperCase();
    scannerResult.innerHTML = "";
    scannerError.textContent = "";

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        scannerError.textContent = "Invalid VIN. Must be 17 characters, no I, O, or Q.";
        return;
    }

    scannerResult.innerHTML = "<p style='color:var(--text-muted);font-size:13px;'>Loading…</p>";

    try {
        const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
        if (!response.ok) throw new Error("Network response failed");
        const data = await response.json();
        const results = data.Results;

        function get(label) {
            const item = results.find(r => r.Variable === label);
            return (!item || item.Value === null || item.Value === "" || item.Value === "Not Applicable") ? "N/A" : item.Value;
        }

        const year  = get("Model Year");
        const make  = get("Make");
        const model = get("Model");

        const sections = [
            { heading: "Vehicle", fields: [
                ["Year", year], ["Make", make], ["Model", model],
                ["Trim", get("Trim")], ["Body Class", get("Body Class")], ["Vehicle Type", get("Vehicle Type")]
            ]},
            { heading: "Engine / Drivetrain", fields: [
                ["Displacement", get("Displacement (L)") !== "N/A" ? get("Displacement (L)") + "L" : "N/A"],
                ["Cylinders", get("Engine Number of Cylinders")],
                ["Horsepower", get("Engine Brake (hp) From") !== "N/A" ? get("Engine Brake (hp) From") + " hp" : "N/A"],
                ["Fuel Type", get("Fuel Type - Primary")],
                ["Drive Type", get("Drive Type")],
                ["Transmission", get("Transmission Style")]
            ]},
            { heading: "Safety", fields: [
                ["ABS", get("Anti-lock Braking System (ABS)")],
                ["ESC", get("Electronic Stability Control (ESC)")],
                ["Backup Camera", get("Backup Camera")],
                ["TPMS", get("Tire Pressure Monitoring System (TPMS) Type")]
            ]}
        ];

        let html = `<h3>NHTSA — ${escapeHtml(vin)}</h3>`;
        for (const section of sections) {
            html += `<h3>${section.heading}</h3><div class="vehicle-info-grid">`;
            for (const [label, value] of section.fields) {
                html += `<div class="vehicle-info-card">
                    <div class="label">${escapeHtml(label)}</div>
                    <div class="value">${escapeHtml(value)}</div>
                </div>`;
            }
            html += `</div>`;
        }

        scannerMatches = allData.filter(item =>
            item.Make.toLowerCase()  === make.toLowerCase()  &&
            item.Model.toLowerCase() === model.toLowerCase() &&
            parseInt(item.Year, 10)  === parseInt(year, 10)
        );
        scannerMatchSort = { key: null, asc: true };

        html += `<div id="scanner-matches-section"></div>`;
        scannerResult.innerHTML = html;
        renderMatchesTable();

    } catch (err) {
        console.error(err);
        scannerError.textContent = "Failed to fetch VIN data from NHTSA.";
        scannerResult.innerHTML = "";
    }
}

function renderMatchesTable() {
    const section = document.getElementById("scanner-matches-section");
    if (!section) return;

    const sorted = [...scannerMatches].sort((a, b) => {
        if (!scannerMatchSort.key) return 0;
        const valA = normalizeValue(a[scannerMatchSort.key]);
        const valB = normalizeValue(b[scannerMatchSort.key]);
        if (valA < valB) return scannerMatchSort.asc ? -1 : 1;
        if (valA > valB) return scannerMatchSort.asc ? 1 : -1;
        return 0;
    });

    const columns = [
        { label: "Item",      key: "_item" },
        { label: "Avg Price", key: "Average Price" },
        { label: "Median",    key: "Median Price" },
        { label: "Sales",     key: "Number of Sales" },
    ];

    let html = `<h3>Matching Inventory (${scannerMatches.length})</h3>`;

    if (scannerMatches.length === 0) {
        html += `<p class="no-matches">No entries in inventory match this vehicle.</p>`;
        section.innerHTML = html;
        return;
    }

    html += `<table class="scanner-matches-table"><thead><tr>`;
    for (const col of columns) {
        const active = scannerMatchSort.key === col.key;
        const arrow = active ? (scannerMatchSort.asc ? " ▲" : " ▼") : "";
        html += `<th data-sort-key="${col.key}" class="sortable">${col.label}${arrow}</th>`;
    }
    html += `<th>eBay</th></tr></thead><tbody>`;

    for (const item of sorted) {
        const query = encodeURIComponent(item.Query);
        const ebayURL = `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1&LH_ItemCondition=4`;
        html += `<tr>
            <td>${escapeHtml(item._item)}</td>
            <td>$${escapeHtml(String(item["Average Price"]))}</td>
            <td>$${escapeHtml(String(item["Median Price"]))}</td>
            <td>${escapeHtml(String(item["Number of Sales"]))}</td>
            <td><a href="${ebayURL}" target="_blank" class="btn-primary" style="text-decoration:none;display:inline-block;padding:4px 10px;font-size:12px;border-radius:6px;">eBay ↗</a></td>
        </tr>`;
    }
    html += `</tbody></table>`;
    section.innerHTML = html;

    section.querySelectorAll("th[data-sort-key]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.getAttribute("data-sort-key");
            if (scannerMatchSort.key === key) {
                scannerMatchSort.asc = !scannerMatchSort.asc;
            } else {
                scannerMatchSort.key = key;
                scannerMatchSort.asc = true;
            }
            renderMatchesTable();
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* =========================
   PWA INSTALL
========================= */
let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;

    const btn = document.createElement("button");
    btn.textContent = "Install App";
    btn.className = "scan-btn";
    Object.assign(btn.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: "1000"
    });

    document.body.appendChild(btn);
    btn.addEventListener("click", async () => {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        btn.remove();
    });
});

/* =========================
   SERVICE WORKER
========================= */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./service-worker.js")
            .catch(err => console.error(err));
    });
}
