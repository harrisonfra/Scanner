let allData = [];

fetch("all_data.json")
    .then(res => res.json())
    .then(data => {
        allData = data;
        displayData(data);
    })
    .catch(err => console.error("Error loading JSON:", err));

function displayData(data) {
    const tbody = document.querySelector("#data-table tbody");
    tbody.innerHTML = "";

    data.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.VIN}</td>
            <td>${item.Year}</td>
            <td>${item.Make}</td>
            <td>${item.Model || "N/A"}</td>
            <td>$${item["Average Price"]}</td>
            <td>${item["Number of Sales"]}</td>
        `;

        // 👉 CLICK HANDLER
        row.addEventListener("click", () => showDetails(item));

        tbody.appendChild(row);
    });
}

// 🔍 SEARCH
document.getElementById("search").addEventListener("input", function () {
    const value = this.value.toLowerCase();

    const filtered = allData.filter(item =>
        (item.Make && item.Make.toLowerCase().includes(value)) ||
        (item.Model && item.Model.toLowerCase().includes(value))
    );

    displayData(filtered);
});

// 📊 DETAILS PANEL
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