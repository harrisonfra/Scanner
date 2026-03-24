let allData = [];
let filteredData = [];
let currentSort = { key: null, asc: false }; // 🔥 start HIGH → LOW
let selectedItems = new Set();

//LOAD + FIX JSON
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


//CREATE CHECKBOXES
function createItemFilters() {
    const container = document.getElementById("item-filters");

    const uniqueItems = [...new Set(allData.map(d => d._item).filter(Boolean))];

    uniqueItems.forEach(item => {
        const label = document.createElement("label");

        label.innerHTML = `
            <input type="checkbox" value="${item}">
            <span>${item}</span>
        `;

        const checkbox = label.querySelector("input");

        checkbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                selectedItems.add(item);
            } else {
                selectedItems.delete(item);
            }

            applyFilters();
        });

        container.appendChild(label);
    });
}


//APPLY ALL FILTERS (search + checkboxes)
function applyFilters() {
    const searchValue = document.getElementById("search").value.trim().toLowerCase();

    filteredData = allData.filter(item => {

        const words = searchValue.split(" ").filter(Boolean);

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


//SEARCH EVENT
document.getElementById("search").addEventListener("input", applyFilters);


//SORTING WITH ARROWS
document.querySelectorAll("th[data-sort]").forEach(header => {
    header.innerHTML += '<span class="arrow"></span>';

    header.addEventListener("click", () => {
        const key = header.getAttribute("data-sort");

        if (currentSort.key === key) {
            currentSort.asc = !currentSort.asc;
        } else {
            currentSort.key = key;
            currentSort.asc = false; // high → low first
        }

        updateSortArrows();
        applySort();
    });
});


function updateSortArrows() {
    document.querySelectorAll("th .arrow").forEach(a => a.textContent = "");

    if (!currentSort.key) return;

    const activeHeader = document.querySelector(`th[data-sort="${currentSort.key}"] .arrow`);
    activeHeader.textContent = currentSort.asc ? "▲" : "▼";
}


function applySort() {
    let dataToSort = [...filteredData];

    if (currentSort.key) {
        dataToSort.sort((a, b) => {
            let valA = a[currentSort.key] ?? "";
            let valB = b[currentSort.key] ?? "";

            if (!isNaN(valA) && !isNaN(valB)) {
                return currentSort.asc ? valA - valB : valB - valA;
            }

            return currentSort.asc
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });
    }

    displayData(dataToSort);
}


//DISPLAY TABLE
function displayData(data) {
    const tbody = document.querySelector("#data-table tbody");
    tbody.innerHTML = "";

    data.forEach(item => {
        const row = document.createElement("tr");

        const query = encodeURIComponent(item.Query);
        const ebayURL = `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1&rt=nc&LH_ItemCondition=4`;

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


//CLEAR FILTERS BUTTON
document.getElementById("clear-filters").addEventListener("click", () => {
    selectedItems.clear();

    document.querySelectorAll("#item-filters input").forEach(cb => {
        cb.checked = false;
    });

    document.getElementById("search").value = "";

    applyFilters();
});


//DETAILS PANEL
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

document.getElementById("scan-vin-btn").addEventListener("click", () => {
    const readerDiv = document.getElementById("reader");
    readerDiv.style.display = "block";

    const html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
            html5QrCode.stop();
            readerDiv.style.display = "none";

            handleVIN(decodedText);
        }
    );
});

async function handleVIN(vin) {
    vin = vin.trim().toUpperCase();

    if (vin.length !== 17) {
        alert("Invalid VIN");
        return;
    }

    try {
        const res = await fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
        );
        const data = await res.json();
        const vehicle = data.Results[0];

        const year = vehicle.ModelYear;
        const make = vehicle.Make;
        const model = vehicle.Model;

        if (!year || !make || !model) {
            alert("Could not decode VIN");
            return;
        }

        // 🔥 Auto search using decoded info
        document.getElementById("search").value = `${make} ${model} ${year}`;
        applyFilters();

        if (filteredData.length === 0) {
            alert("No matching results found for this VIN.");
        }

    } catch (err) {
        console.error(err);
        alert("Error decoding VIN");
    }
}

document.getElementById("mobile-sort").addEventListener("change", (e) => {
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
        padding: "10px 15px",
        background: "black",
        color: "white",
        border: "none",
        borderRadius: "5px",
        zIndex: "1000"
    });
    document.body.appendChild(btn);

    btn.addEventListener("click", async () => {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        deferredPrompt = null;
        btn.remove();
    });
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./service-worker.js")
            .then(reg => console.log("Service worker registered.", reg))
            .catch(err => console.error("Service worker registration failed:", err));
    });
}