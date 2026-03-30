let allData = [];
let filteredData = [];
let currentSort = { key: null, asc: false };
let selectedItems = new Set();

/* =========================
   LOAD DATA
========================= */
fetch("all_data.json")
    .then(res => res.text())
    .then(text => {
        const fixedText = text.replace(/NaN/g, "null");
        const data = JSON.parse(fixedText);

        allData = data.map(item => ({
            ...item,
            Make: item.Make || "",
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

        label.innerHTML = `
            <input type="checkbox" value="${item}">
            <span>${item}</span>
        `;

        const checkbox = label.querySelector("input");

        checkbox.addEventListener("change", () => {
            checkbox.checked
                ? selectedItems.add(item)
                : selectedItems.delete(item);

            applyFilters();
        });

        container.appendChild(label);
    });
}

/* =========================
   SEARCH + FILTER LOGIC
========================= */
function applyFilters() {
    const searchValue = document.getElementById("search").value.trim().toLowerCase();
    const words = searchValue.split(" ").filter(Boolean);

    filteredData = allData.filter(item => {
        const matchesSearch = words.every(word =>
            item.Make.toLowerCase().includes(word) ||
            item.Model.toLowerCase().includes(word) ||
            String(item.Year).includes(word) ||
            item._item.toLowerCase().includes(word)
        );

        const matchesItem =
            selectedItems.size === 0 || selectedItems.has(item._item);

        return matchesSearch && matchesItem;
    });

    applySort();
}

document.getElementById("search").addEventListener("input", applyFilters);

/* =========================
   SORTING
========================= */
function normalizeValue(val) {
    if (val === null || val === undefined) return 0;

    if (typeof val === "string") {
        val = val.replace(/[$,]/g, "").trim();
    }

    if (!isNaN(val) && val !== "") return Number(val);

    return String(val).toLowerCase();
}

function applySort() {
    let dataToSort = [...filteredData];

    if (currentSort.key) {
        dataToSort.sort((a, b) => {
            let valA = normalizeValue(a[currentSort.key]);
            let valB = normalizeValue(b[currentSort.key]);

            if (valA < valB) return currentSort.asc ? -1 : 1;
            if (valA > valB) return currentSort.asc ? 1 : -1;
            return 0;
        });
    }

    displayData(dataToSort);
}

/* =========================
   DESKTOP SORT
========================= */
document.querySelectorAll("th[data-sort]").forEach(header => {
    header.innerHTML += '<span class="arrow"></span>';

    header.addEventListener("click", () => {
        const key = header.getAttribute("data-sort");

        if (currentSort.key === key) {
            currentSort.asc = !currentSort.asc;
        } else {
            currentSort.key = key;
            currentSort.asc = false;
        }

        updateSortArrows();
        applySort();
    });
});

function updateSortArrows() {
    document.querySelectorAll("th .arrow").forEach(a => a.textContent = "");

    if (!currentSort.key) return;

    const active = document.querySelector(`th[data-sort="${currentSort.key}"] .arrow`);
    active.textContent = currentSort.asc ? "▲" : "▼";
}

/* =========================
   MOBILE SORT
========================= */
const mobileSort = document.getElementById("mobile-sort");

if (mobileSort) {
    mobileSort.addEventListener("change", (e) => {
        const key = e.target.value;
        if (!key) return;

        if (currentSort.key === key) {
            currentSort.asc = !currentSort.asc;
        } else {
            currentSort.key = key;
            currentSort.asc = false;
        }

        applySort();
    });
}

/* =========================
   DISPLAY DATA
========================= */
function displayData(data) {
    const tbody = document.querySelector("#data-table tbody");
    tbody.innerHTML = "";

    data.forEach(item => {
        const row = document.createElement("tr");

        const query = encodeURIComponent(item.Query);
        const ebayURL = `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1`;

        row.innerHTML = `
            <td data-label="VIN"><span>${item.VIN}</span></td>
            <td data-label="Year"><span>${item.Year}</span></td>
            <td data-label="Make"><span>${item.Make}</span></td>
            <td data-label="Model"><span>${item.Model || "N/A"}</span></td>
            <td data-label="Avg Price"><span>$${item["Average Price"]}</span></td>
            <td data-label="Median Price"><span>$${item["Median Price"]}</span></td>
            <td data-label="Item"><span>${item._item}</span></td>
            <td data-label="Sales"><span>${item["Number of Sales"]}</span></td>
            <td data-label="eBay"><button class="ebay-btn">Search</button></td>
        `;

        row.addEventListener("click", (e) => {
            if (!e.target.classList.contains("ebay-btn")) {
                showDetails(item);
            }
        });

        row.querySelector(".ebay-btn").addEventListener("click", () => {
            window.open(ebayURL, "_blank");
        });

        tbody.appendChild(row);
    });
}

/* =========================
   CLEAR FILTERS
========================= */
document.getElementById("clear-filters").addEventListener("click", () => {
    selectedItems.clear();

    document.querySelectorAll("#item-filters input").forEach(cb => {
        cb.checked = false;
    });

    document.getElementById("search").value = "";

    applyFilters();
});

/* =========================
   DETAILS PANEL
========================= */
function showDetails(item) {
    document.getElementById("details").classList.remove("hidden");

    document.getElementById("d-vin").textContent = item.VIN;
    document.getElementById("d-query").textContent = item.Query;
    document.getElementById("d-year").textContent = item.Year;
    document.getElementById("d-make").textContent = item.Make;
    document.getElementById("d-model").textContent = item.Model || "N/A";
    document.getElementById("d-avg").textContent = item["Average Price"];
    document.getElementById("d-med").textContent = item["Median Price"];
    document.getElementById("d-sales").textContent = item["Number of Sales"];
}

function closeDetails() {
    document.getElementById("details").classList.add("hidden");
}

/* =========================
   VIN SCANNER (FIXED BLACK SCREEN)
========================= */
let codeReader;

document.getElementById("scan-vin-btn")?.addEventListener("click", async () => {
    const readerDiv = document.getElementById("reader");
    readerDiv.style.display = "block";

    codeReader = new ZXing.BrowserMultiFormatReader();

    try {
        const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();

        let selectedDeviceId = devices.find(d =>
            d.label.toLowerCase().includes("back")
        )?.deviceId;

        if (!selectedDeviceId) {
            selectedDeviceId = devices[devices.length - 1]?.deviceId;
        }

        await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            "reader",
            (result) => {
                if (result) {
                    const rawText = result.getText();

                    codeReader.reset();
                    readerDiv.style.display = "none";

                    handleVIN(rawText);
                }
            }
        );

        // 🔥 FIX: force video to render (Safari + black screen fix)
        setTimeout(() => {
            const video = document.querySelector("#reader video");
            if (video) {
                video.setAttribute("playsinline", true);
                video.muted = true;
                video.play();
            }
        }, 500);

    } catch (err) {
        console.error(err);
        alert("Camera error");
    }
});

/* =========================
   VIN HANDLER
========================= */
function extractVIN(text) {
    const match = text.match(/[A-HJ-NPR-Z0-9]{17}/);
    return match ? match[0] : null;
}

async function handleVIN(rawText) {
    const vin = extractVIN(rawText);

    if (!vin) {
        alert("Could not detect a valid VIN");
        return;
    }

    try {
        const res = await fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
        );
        const data = await res.json();
        const v = data.Results[0];

        const searchString = `${v.Make} ${v.Model} ${v.ModelYear}`;

        document.getElementById("search").value = searchString;
        applyFilters();

        if (filteredData.length === 0) {
            alert("No matching results found.");
        }

    } catch (err) {
        console.error(err);
        alert("VIN decode failed");
    }
}

/* =========================
   PWA INSTALL
========================= */
let deferredPrompt;

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;

    const btn = document.createElement("button");
    btn.textContent = "Install App";

    Object.assign(btn.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "10px",
        background: "black",
        color: "white",
        border: "none",
        borderRadius: "6px",
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