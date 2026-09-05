const supabaseUrl =
    "https://nkxuthkmrzrnjgcpzirz.supabase.co";

const supabaseKey =
    "sb_publishable_jK6URxBT79_gY6FZn1i-Sw_FdikkUly";

const supabaseClient =
    supabase.createClient(
        supabaseUrl,
        supabaseKey
    );


const USER_MAPPINGS = {
    "michael_huber@gmx.ch": "Michi",
    "sabrina_graf@bluewin.ch": "Sabrina"
};


let editingExpenseId = null;
let expensesCache = [];
let currentUserId = null;
let currentUserName = null;
let activityLimit = 3;
let expandedActivities = false;
let expenseLimit = 5;
let expandedExpenses = false;

const loginContainer =
    document.getElementById("loginContainer");

const appContainer =
    document.getElementById("appContainer");

const loginForm =
    document.getElementById("loginForm");

const expenseForm =
    document.getElementById("expenseForm");

const saveButton =
    expenseForm.querySelector(
        'button[type="submit"]'
    );


loginForm.addEventListener(
    "submit",
    loginUser
);

expenseForm.addEventListener(
    "submit",
    saveExpense
);


initializeApp();


async function initializeApp() {

    setToday();

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        showLogin();
        return;
    }

    if (data.session) {
        await initializeLoggedInUser(
            data.session.user
        );
    } else {
        showLogin();
    }
}


async function initializeLoggedInUser(user) {

    currentUserId = user.id;

    const email =
        (user.email || "").toLowerCase();

    currentUserName =
        USER_MAPPINGS[email] || null;

document.getElementById("payer").value =
    currentUserName;

    if (!currentUserName) {

        alert(
            "Dieses Benutzerkonto ist für BärliSplit nicht freigeschaltet."
        );

        await supabaseClient.auth.signOut();

        showLogin();
        return;
    }


    await showApp();
}


async function loginUser(event) {

    event.preventDefault();

    const email =
        document
            .getElementById("loginEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;

    const submitButton =
        loginForm.querySelector(
            'button[type="submit"]'
        );

    submitButton.disabled = true;

    submitButton.textContent =
        "Anmeldung läuft...";

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    submitButton.disabled = false;

    submitButton.textContent =
        "Anmelden";

    if (error) {

        alert(
            "Anmeldung fehlgeschlagen: " +
            error.message
        );

        return;
    }

    loginForm.reset();

    await initializeLoggedInUser(
        data.user
    );
}


function showLogin() {

    currentUserId = null;
    currentUserName = null;
    editingExpenseId = null;
    expensesCache = [];

    appContainer.style.display = "none";
    loginContainer.style.display = "block";

    document
        .getElementById("loginEmail")
        .focus();
}


async function showApp() {

    loginContainer.style.display = "none";
    appContainer.style.display = "block";

    await Promise.all([
        loadExpenses(),
        loadActivities()
    ]);
}


async function logoutUser() {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {

        alert(
            "Abmelden fehlgeschlagen: " +
            error.message
        );

        return;
    }

    resetForm();
    showLogin();
}

function setToday() {

    document.getElementById("expenseDate").value =
        new Date()
            .toISOString()
            .split("T")[0];
}


async function saveExpense(event) {

    event.preventDefault();

    const expenseDate =
        document
            .getElementById("expenseDate")
            .value;

    const amount =
        Number(
            document
                .getElementById("amount")
                .value
        );

    const payer =
        document
            .getElementById("payer")
            .value;

    const category =
        document
            .getElementById("category")
            .value;

    const description =
        document
            .getElementById("description")
            .value
            .trim();

const beneficiary =
    document
        .getElementById("beneficiary")
        .value;

const expenseData = {
    expense_date: expenseDate,
    amount: amount,
    payer: payer,
    beneficiary: beneficiary,
    category: category,
    description: description,
    actor_name: currentUserName
};


    if (!expenseDate) {

        alert(
            "Bitte ein Datum auswählen."
        );

        return;
    }


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Bitte einen gültigen Betrag grösser als 0 eingeben."
        );

        return;
    }

    let result;


    if (editingExpenseId === null) {

        result =
            await supabaseClient
                .from("expenses")
                .insert([
                    expenseData
                ]);

    } else {

        result =
            await supabaseClient
                .from("expenses")
                .update(expenseData)
                .eq(
                    "id",
                    editingExpenseId
                );
    }


    if (result.error) {

        alert(
            result.error.message
        );

        return;
    }


    resetForm();

    await Promise.all([
        loadExpenses(),
        loadActivities()
    ]);
}


function editExpense(id) {

    const expense =
        expensesCache.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!expense) {

        alert(
            "Die ausgewählte Buchung wurde nicht gefunden."
        );

        return;
    }

    editingExpenseId =
        expense.id;


    document.getElementById("expenseDate").value =
        expense.expense_date;

    document.getElementById("amount").value =
        expense.amount;

    document.getElementById("payer").value =
        expense.payer;

document.getElementById("beneficiary").value =
    expense.beneficiary || "Beide";

    document.getElementById("category").value =
        expense.category;

    document.getElementById("description").value =
        expense.description || "";


    saveButton.textContent =
        "Änderung speichern";

    saveButton.classList.add(
        "edit-save-button"
    );


    expenseForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    document
        .getElementById("amount")
        .focus();
}


function resetForm() {

    editingExpenseId = null;

    expenseForm.reset();

    setToday();

document.getElementById("payer").value =
    currentUserName;

    saveButton.textContent =
        "Speichern";

    saveButton.classList.remove(
        "edit-save-button"
    );
}


async function loadExpenses() {

    const { data, error } =
        await supabaseClient
            .from("expenses")
            .select("*")
            .order(
                "expense_date",
                {
                    ascending: false
                }
            )
            .order(
                "id",
                {
                    ascending: false
                }
            );


if (error) {
    console.error(error);

    if (error.message?.includes("JWT issued at future")) {
        await supabaseClient.auth.signOut();
        alert(
            "Die Anmeldung ist ungültig geworden. Bitte erneut anmelden."
        );
        showLogin();
        return;
    }

    alert(
        "Die Buchungen konnten nicht geladen werden: " +
        error.message
    );
    return;
}


    /*
     * Supabase RLS liefert bereits nur:
     * - gemeinsame Buchungen
     * - eigene private Buchungen
     */
    expensesCache = data || [];


    renderExpensesTable(
        expensesCache
    );

loadAnalysis();

let michiAnteil = 0;
let sabrinaAnteil = 0;

expensesCache.forEach(expense => {
    const amount = Number(expense.amount || 0);

    if (expense.beneficiary === "Beide") {
        michiAnteil += amount / 2;
        sabrinaAnteil += amount / 2;
    }

    if (expense.beneficiary === "Michi") {
        michiAnteil += amount;
    }

    if (expense.beneficiary === "Sabrina") {
        sabrinaAnteil += amount;
    }
});

updateSaldo(
    michiAnteil,
    sabrinaAnteil
);

}


function renderExpensesTable(expenses) {
    const table =
        document.getElementById(
            "expensesTable"
        );

    const expandContainer =
        document.getElementById(
            "expensesExpand"
        );

    table.innerHTML = "";

    if (expenses.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    Keine sichtbaren Buchungen vorhanden.
                </td>
            </tr>
        `;

        expandContainer.style.display =
            "none";

        return;
    }

    const visibleExpenses =
        expandedExpenses
            ? expenses
            : expenses.slice(
                0,
                expenseLimit
            );

    visibleExpenses.forEach(expense => {
        const amount =
            Number(expense.amount);

        const formattedDate =
            new Date(
                expense.expense_date +
                "T00:00:00"
            ).toLocaleDateString(
                "de-CH"
            );

        const beneficiaryLabel =
            expense.beneficiary === "Beide"
                ? "👥 Beide"
                : "👤 " +
                  escapeHtml(
                      expense.beneficiary
                  );

        table.innerHTML += `
            <tr>
                <td>
                    ${formattedDate}
                </td>

                <td>
                    CHF ${amount.toFixed(2)}
                </td>

                <td>
                    ${escapeHtml(
                        expense.payer || ""
                    )}
                </td>

                <td>
                    ${beneficiaryLabel}
                </td>

                <td>
                    ${escapeHtml(
                        expense.category || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        expense.description || ""
                    )}
                </td>

                <td class="action-buttons">
                    <button
                        type="button"
                        class="edit-button"
                        onclick="editExpense(${expense.id})"
                        title="Buchung bearbeiten"
                        aria-label="Buchung bearbeiten"
                    >
                        ✎
                    </button>

                    <button
                        type="button"
                        class="delete-button"
                        onclick="deleteExpense(${expense.id})"
                        title="Buchung löschen"
                        aria-label="Buchung löschen"
                    >
                        ×
                    </button>
                </td>
            </tr>
        `;
    });

    if (expenses.length > expenseLimit) {
        expandContainer.style.display =
            "block";

        expandContainer.innerHTML = `
            <button
                type="button"
                class="secondary-button"
                onclick="toggleExpenses()"
            >
                ${
                    expandedExpenses
                        ? "▲ Weniger anzeigen"
                        : `▼ Mehr anzeigen (${expenses.length - expenseLimit})`
                }
            </button>
        `;
    } else {
        expandContainer.style.display =
            "none";
    }
}

function toggleExpenses() {
    expandedExpenses =
        !expandedExpenses;

    renderExpensesTable(
        expensesCache
    );
}

function updateSaldo(
    michiAnteil,
    sabrinaAnteil
) {
    let michiBezahlt = 0;
    let sabrinaBezahlt = 0;

    expensesCache.forEach(expense => {
        const amount = Number(expense.amount || 0);

        if (expense.payer === "Michi") {
            michiBezahlt += amount;
        }

        if (expense.payer === "Sabrina") {
            sabrinaBezahlt += amount;
        }
    });

    const michiSaldo =
        michiBezahlt - michiAnteil;

    const saldoBox =
        document.getElementById(
            "saldoBox"
        );

    if (Math.abs(michiSaldo) < 0.01) {

        saldoBox.innerHTML = `
            Michi bezahlt: CHF ${michiBezahlt.toFixed(2)}
            <br>
            Sabrina bezahlt: CHF ${sabrinaBezahlt.toFixed(2)}
            <br><br>
            <span class="saldo-balanced">
                Alles ausgeglichen
            </span>
        `;

    } else if (michiSaldo > 0) {

        saldoBox.innerHTML = `
            Michi bezahlt: CHF ${michiBezahlt.toFixed(2)}
            <br>
            Sabrina bezahlt: CHF ${sabrinaBezahlt.toFixed(2)}
            <br><br>
            <span class="saldo-positive">
                Sabrina schuldet Michi:
                CHF ${michiSaldo.toFixed(2)}
            </span>
        `;

    } else {

        saldoBox.innerHTML = `
            Michi bezahlt: CHF ${michiBezahlt.toFixed(2)}
            <br>
            Sabrina bezahlt: CHF ${sabrinaBezahlt.toFixed(2)}
            <br><br>
            <span class="saldo-negative">
                Michi schuldet Sabrina:
                CHF ${Math.abs(michiSaldo).toFixed(2)}
            </span>
        `;

    }
}


async function deleteExpense(id) {

    const expense =
        expensesCache.find(
            item =>
                Number(item.id) === Number(id)
        );

    if (!expense) {
        alert(
            "Die Buchung wurde nicht gefunden."
        );
        return;
    }

    const confirmed =
        confirm(
            "Buchung wirklich löschen?"
        );

    if (!confirmed) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("expenses")
            .update({
                actor_name: currentUserName
            })
            .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

const { error: deleteError } =
    await supabaseClient
        .from("expenses")
        .delete()
        .eq("id", id);

if (deleteError) {
    alert(deleteError.message);
    return;
}

    if (
        Number(editingExpenseId) ===
        Number(id)
    ) {
        resetForm();
    }

    await Promise.all([
        loadExpenses(),
        loadActivities()
    ]);
}


async function loadActivities() {

    const activityFeed =
        document.getElementById(
            "activityFeed"
        );


    if (!activityFeed) {
        return;
    }


    const { data, error } =
        await supabaseClient
            .from("activity_log")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(20);

    if (error) {

        console.error(error);

        activityFeed.innerHTML = `
            <p class="empty-message">
                Aktivitäten konnten nicht geladen werden.
            </p>
        `;

        return;
    }


    renderActivityFeed(
        data || []
    );
}


function renderActivityFeed(activities) {

    const feed =
        document.getElementById(
            "activityFeed"
        );

    if (!feed) {
        return;
    }

    const visibleActivities =
        expandedActivities
            ? activities
            : activities.slice(0, activityLimit);

    if (activities.length === 0) {

        feed.innerHTML = `
            <p class="empty-message">
                Noch keine Aktivitäten vorhanden.
            </p>
        `;

        return;
    }

    feed.innerHTML =
        visibleActivities
            .map(activity => {

                const actionLabel =
                    getActionLabel(
                        activity.action_type
                    );

                const actorName =
                    escapeHtml(
                        activity.actor_name ||
                        "Unbekannt"
                    );

                const description =
                    escapeHtml(
                        activity.description ||
                        "Ohne Beschreibung"
                    );

                const category =
                    escapeHtml(
                        activity.category ||
                        ""
                    );

const payer =
    escapeHtml(
        activity.payer || ""
    );

const beneficiary =
    escapeHtml(
        activity.beneficiary || ""
    );

                const amount =
                    Number(
                        activity.amount || 0
                    ).toFixed(2);

const typeLabel =
    activity.beneficiary === "Beide"
        ? "👥 Beide"
        : "👤 " + activity.beneficiary;

                const formattedTime =
                    formatActivityTime(
                        activity.created_at
                    );

                return `
                    <div class="activity-line">

                        <strong>
                            ${formattedTime}
                        </strong>

                        ·

                        ${actorName}

                        ${actionLabel}

                        "<strong>${description}</strong>"

                        <br>

<span class="activity-meta">
CHF ${amount}
· ${category}
· ${payer} → ${beneficiary}
</span>

                    </div>
                `;
            })
            .join("");


    if (
    activities.length > 3
) {

        feed.innerHTML += `
            <div class="activity-expand">

                <button
                    type="button"
                    class="secondary-button"
                    onclick="toggleActivities()">

                    ${
                        expandedActivities
                            ? "▲ Weniger anzeigen"
                            : "▼ Mehr anzeigen"
                    }

                </button>

            </div>
        `;
    }
}

function getActionLabel(actionType) {

    const labels = {
        created: "hat hinzugefügt",
        updated: "hat bearbeitet",
        deleted: "hat gelöscht"
    };

    return (
        labels[actionType] ||
        "hat geändert"
    );
}


function formatActivityTime(dateValue) {

    const date =
        new Date(dateValue);

    const today =
        new Date();

    const yesterday =
        new Date();

    yesterday.setDate(
        today.getDate() - 1
    );


    const sameDay =
        (
            firstDate,
            secondDate
        ) =>
            firstDate.getFullYear() ===
                secondDate.getFullYear() &&
            firstDate.getMonth() ===
                secondDate.getMonth() &&
            firstDate.getDate() ===
                secondDate.getDate();


    const time =
        date.toLocaleTimeString(
            "de-CH",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    if (sameDay(date, today)) {
        return "Heute, " + time;
    }


    if (sameDay(date, yesterday)) {
        return "Gestern, " + time;
    }


    return date.toLocaleString(
        "de-CH",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        if (
            event === "SIGNED_OUT" ||
            !session
        ) {
            showLogin();
        }
    }
);

function toggleActivities() {

    expandedActivities =
        !expandedActivities;

    loadActivities();
}

let categoryChart = null;
let payerChart = null;
let trendChart = null;

const CATEGORY_COLORS = {
    "Lebensmittel & Haushalt": "#55a868",
    "Essen auswärts": "#f2c14e",
    "Wohnen": "#8e6ccf",
    "Auto": "#2f7cf6",
    "Freizeit & Ferien": "#e76f51",
    "Gesundheit": "#4db6ac",
    "Abos": "#f28e8e",
    "Sonstiges": "#9e9e9e"
};

const PAYER_COLORS = {
    "Michi": "#2f7cf6",
    "Sabrina": "#e76f51"
};

function updateAnalysisPeriods() {
    const periodType =
        document.getElementById(
            "analysisPeriod"
        ).value;

    const periodSelect =
        document.getElementById(
            "analysisPeriodValue"
        );

    const periodContainer =
        document.getElementById(
            "analysisPeriodValueContainer"
        );

    if (periodType === "all") {
        periodContainer.style.display =
            "none";

        periodSelect.innerHTML = "";

        return;
    }

    periodContainer.style.display =
        "block";

    const currentValue =
        periodSelect.value;

    if (periodType === "month") {
        const months =
            [
                ...new Set(
                    expensesCache.map(
                        expense =>
                            expense.expense_date
                                .slice(0, 7)
                    )
                )
            ].sort(
                (a, b) =>
                    b.localeCompare(a)
            );

        periodSelect.innerHTML =
            months.map(monthKey => {
                const [year, month] =
                    monthKey.split("-");

                const label =
                    new Date(
                        Number(year),
                        Number(month) - 1,
                        1
                    ).toLocaleDateString(
                        "de-CH",
                        {
                            month: "long",
                            year: "numeric"
                        }
                    );

                return `
                    <option value="${monthKey}">
                        ${label}
                    </option>
                `;
            }).join("");
    }

    if (periodType === "year") {
        const years =
            [
                ...new Set(
                    expensesCache.map(
                        expense =>
                            expense.expense_date
                                .slice(0, 4)
                    )
                )
            ].sort(
                (a, b) =>
                    Number(b) -
                    Number(a)
            );

        periodSelect.innerHTML =
            years.map(year => `
                <option value="${year}">
                    ${year}
                </option>
            `).join("");
    }

    const optionStillExists =
        [
            ...periodSelect.options
        ].some(
            option =>
                option.value ===
                currentValue
        );

    if (optionStillExists) {
        periodSelect.value =
            currentValue;
    }
}

function loadAnalysis() {
    const periodType =
        document.getElementById(
            "analysisPeriod"
        ).value;

    updateAnalysisPeriods();

    const periodValue =
        document.getElementById(
            "analysisPeriodValue"
        ).value;

    const perspective =
        document.getElementById(
            "analysisPerspective"
        ).value;

    const expenseType =
        document.getElementById(
            "analysisExpenseType"
        ).value;

    const filteredExpenses =
        expensesCache.filter(expense => {
            if (
                expenseType !== "all" &&
                expense.beneficiary !==
                    expenseType
            ) {
                return false;
            }

            if (periodType === "month") {
                return (
                    expense.expense_date
                        .slice(0, 7) ===
                    periodValue
                );
            }

            if (periodType === "year") {
                return (
                    expense.expense_date
                        .slice(0, 4) ===
                    periodValue
                );
            }

            return true;
        });

    const perspectiveExpenses =
        applyPerspective(
            filteredExpenses,
            perspective
        );

    buildCategoryAnalysis(
        perspectiveExpenses
    );

    buildPayerAnalysis(
        perspectiveExpenses
    );

    buildTopExpenses(
        perspectiveExpenses
    );
}

function applyPerspective(
    expenses,
    perspective
) {
    return expenses
        .map(expense => {
            let analysisAmount =
                Number(expense.amount || 0);

            if (perspective === "Michi") {
                if (
                    expense.beneficiary ===
                    "Beide"
                ) {
                    analysisAmount =
                        analysisAmount / 2;
                } else if (
                    expense.beneficiary !==
                    "Michi"
                ) {
                    analysisAmount = 0;
                }
            }

            if (perspective === "Sabrina") {
                if (
                    expense.beneficiary ===
                    "Beide"
                ) {
                    analysisAmount =
                        analysisAmount / 2;
                } else if (
                    expense.beneficiary !==
                    "Sabrina"
                ) {
                    analysisAmount = 0;
                }
            }

            return {
                ...expense,
                analysisAmount:
                    analysisAmount
            };
        })
        .filter(
            expense =>
                expense.analysisAmount > 0
        );
}

function buildCategoryAnalysis(expenses) {
    const totals = {};

    expenses.forEach(expense => {
        const category =
            expense.category ||
            "Sonstiges";

        if (!totals[category]) {
            totals[category] = 0;
        }

        totals[category] +=
            expense.analysisAmount;
    });

    renderCategorySummary(totals);
    renderCategoryChart(totals);
}

function renderCategorySummary(totals) {
    const summary =
        document.getElementById(
            "analysisSummary"
        );

    const entries =
        Object.entries(totals)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );

    const grandTotal =
        entries.reduce(
            (sum, entry) =>
                sum + entry[1],
            0
        );

    if (entries.length === 0) {
        summary.innerHTML = `
            <p class="empty-message">
                Für diese Auswahl sind keine
                Ausgaben vorhanden.
            </p>
        `;

        return;
    }

    let html = `
        <p class="analysis-total">
            Gesamtausgaben:
            ${formatCurrency(grandTotal)}
        </p>

        <div class="analysis-categories">
    `;

    entries.forEach(
        ([category, amount]) => {
            const percentage =
                grandTotal > 0
                    ? (
                        amount /
                        grandTotal
                    ) * 100
                    : 0;

            const color =
                CATEGORY_COLORS[
                    category
                ] || "#9e9e9e";

            html += `
                <div class="analysis-category">
                    <span
                        class="category-color"
                        style="
                            background-color:
                            ${color};
                        "
                    ></span>

                    <div class="category-details">
                        <div class="category-name">
                            ${escapeHtml(category)}
                        </div>

                        <div class="category-value">
                            ${formatCurrency(amount)}
                            (${percentage.toFixed(1)} %)
                        </div>
                    </div>
                </div>
            `;
        }
    );

    html += `</div>`;

    summary.innerHTML = html;
}

function renderCategoryChart(totals) {
    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }

    const labels =
        Object.keys(totals);

    const values =
        Object.values(totals);

    if (labels.length === 0) {
        canvas.style.display = "none";
        return;
    }

    canvas.style.display = "block";

    categoryChart =
        new Chart(canvas, {
            type: "pie",

            data: {
                labels: labels,

                datasets: [{
                    data: values,

                    backgroundColor:
                        labels.map(
                            category =>
                                CATEGORY_COLORS[
                                    category
                                ] ||
                                "#9e9e9e"
                        ),

                    borderColor: "#ffffff",
                    borderWidth: 2
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label:
                                function(
                                    context
                                ) {
                                    return (
                                        context.label +
                                        ": " +
                                        formatCurrency(
                                            context.raw
                                        )
                                    );
                                }
                        }
                    }
                }
            }
        });
}

function buildPayerAnalysis(expenses) {
    const payerTotals = {
        "Michi": 0,
        "Sabrina": 0
    };

    expenses.forEach(expense => {
        if (
            payerTotals[
                expense.payer
            ] !== undefined
        ) {
            payerTotals[
                expense.payer
            ] +=
                expense.analysisAmount;
        }
    });

    renderPayerSummary(payerTotals);
}

function renderPayerSummary(
    payerTotals
) {
    const container =
        document.getElementById(
            "payerSummary"
        );

    const total =
        payerTotals.Michi +
        payerTotals.Sabrina;

    if (total === 0) {
        container.innerHTML = `
            <p class="empty-message">
                Keine Zahlungen vorhanden.
            </p>
        `;

        return;
    }

    const michiPercentage =
        (
            payerTotals.Michi /
            total
        ) * 100;

    const sabrinaPercentage =
        (
            payerTotals.Sabrina /
            total
        ) * 100;

    container.innerHTML = `
        <div class="payer-row">
            <span
                class="category-color"
                style="
                    background-color:
                    ${PAYER_COLORS.Michi};
                "
            ></span>

            <div>
                <div class="category-name">
                    Michi
                </div>

                <div class="category-value">
                    ${formatCurrency(
                        payerTotals.Michi
                    )}
                    (${michiPercentage.toFixed(1)} %)
                </div>
            </div>
        </div>

        <div class="payer-row">
            <span
                class="category-color"
                style="
                    background-color:
                    ${PAYER_COLORS.Sabrina};
                "
            ></span>

            <div>
                <div class="category-name">
                    Sabrina
                </div>

                <div class="category-value">
                    ${formatCurrency(
                        payerTotals.Sabrina
                    )}
                    (${sabrinaPercentage.toFixed(1)} %)
                </div>
            </div>
        </div>
    `;
}

function renderPayerChart(
    payerTotals
) {
    const canvas =
        document.getElementById(
            "payerChart"
        );

    if (payerChart) {
        payerChart.destroy();
        payerChart = null;
    }

    const total =
        payerTotals.Michi +
        payerTotals.Sabrina;

    if (total === 0) {
        canvas.style.display = "none";
        return;
    }

    canvas.style.display = "block";

    payerChart =
        new Chart(canvas, {
            type: "doughnut",

            data: {
                labels: [
                    "Michi",
                    "Sabrina"
                ],

                datasets: [{
                    data: [
                        payerTotals.Michi,
                        payerTotals.Sabrina
                    ],

                    backgroundColor: [
                        PAYER_COLORS.Michi,
                        PAYER_COLORS.Sabrina
                    ],

                    borderColor: "#ffffff",
                    borderWidth: 2
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "60%",

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label:
                                function(
                                    context
                                ) {
                                    return (
                                        context.label +
                                        ": " +
                                        formatCurrency(
                                            context.raw
                                        )
                                    );
                                }
                        }
                    }
                }
            }
        });
}

function buildTopExpenses(expenses) {
    const container =
        document.getElementById(
            "topExpenses"
        );

    const sortedExpenses =
        [...expenses]
            .sort(
                (a, b) =>
                    b.analysisAmount -
                    a.analysisAmount
            )
            .slice(0, 5);

    if (sortedExpenses.length === 0) {
        container.innerHTML = `
            <p class="empty-message">
                Keine Ausgaben vorhanden.
            </p>
        `;

        return;
    }

    container.innerHTML =
        sortedExpenses
            .map(
                (expense, index) => {
                    const description =
                        expense.description ||
                        expense.category ||
                        "Ohne Beschreibung";

                    return `
                        <div class="top-expense-row">
                            <div class="top-expense-rank">
                                ${index + 1}
                            </div>

                            <div class="top-expense-details">
                                <div class="category-name">
                                    ${escapeHtml(
                                        description
                                    )}
                                </div>

                                <div class="category-value">
                                    ${escapeHtml(
                                        expense.category ||
                                        "Sonstiges"
                                    )}
                                    ·
                                    ${formatCurrency(
                                        expense.analysisAmount
                                    )}
                                </div>
                            </div>
                        </div>
                    `;
                }
            )
            .join("");
}

function buildTrendAnalysis(
    expenses,
    period
) {
    const monthlyTotals = {};

    expenses.forEach(expense => {
        const date = new Date(
            expense.expense_date +
            "T00:00:00"
        );

        const key =
            date.getFullYear() +
            "-" +
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        if (!monthlyTotals[key]) {
            monthlyTotals[key] = 0;
        }

        monthlyTotals[key] +=
            expense.analysisAmount;
    });

    let entries =
        Object.entries(monthlyTotals)
            .sort(
                (a, b) =>
                    a[0].localeCompare(
                        b[0]
                    )
            );

    if (period === "month") {
        entries = entries.slice(-1);
    }

    renderTrendChart(entries);
}

function renderTrendChart(entries) {
    const canvas =
        document.getElementById(
            "trendChart"
        );

    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }

    if (entries.length === 0) {
        canvas.style.display = "none";
        return;
    }

    canvas.style.display = "block";

    const labels =
        entries.map(([key]) => {
            const [
                year,
                month
            ] = key.split("-");

            const date = new Date(
                Number(year),
                Number(month) - 1,
                1
            );

            return date.toLocaleDateString(
                "de-CH",
                {
                    month: "short",
                    year: "numeric"
                }
            );
        });

    const values =
        entries.map(
            entry => entry[1]
        );

    trendChart =
        new Chart(canvas, {
            type: "line",

            data: {
                labels: labels,

                datasets: [{
                    label: "Ausgaben",
                    data: values,
                    borderColor: "#2f7cf6",
                    backgroundColor:
                        "rgba(47, 124, 246, 0.15)",
                    fill: true,
                    tension: 0.25,
                    pointRadius: 4,
                    pointBackgroundColor:
                        "#2f7cf6"
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    y: {
                        beginAtZero: true,

                        ticks: {
                            callback:
                                function(value) {
                                    return (
                                        "CHF " +
                                        value
                                    );
                                }
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label:
                                function(
                                    context
                                ) {
                                    return formatCurrency(
                                        context.raw
                                    );
                                }
                        }
                    }
                }
            }
        });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat(
        "de-CH",
        {
            style: "currency",
            currency: "CHF"
        }
    ).format(
        Number(amount || 0)
    );
}

document
    .getElementById("analysisPeriod")
    .addEventListener(
        "change",
        loadAnalysis
    );

document
    .getElementById("analysisPeriodValue")
    .addEventListener(
        "change",
        loadAnalysis
    );

document
    .getElementById("analysisPerspective")
    .addEventListener(
        "change",
        loadAnalysis
    );

document
    .getElementById("analysisExpenseType")
    .addEventListener(
        "change",
        loadAnalysis
    );