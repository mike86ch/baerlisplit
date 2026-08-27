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


    table.innerHTML = "";


    if (expenses.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    Keine sichtbaren Buchungen vorhanden.
                </td>
            </tr>
        `;

        return;
    }


    expenses.forEach(expense => {

        const amount =
            Number(
                expense.amount
            );


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
        : "👤 " + expense.beneficiary;


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
                        aria-label="Buchung bearbeiten">
                        ✎
                    </button>

                    <button
                        type="button"
                        class="delete-button"
                        onclick="deleteExpense(${expense.id})"
                        title="Buchung löschen"
                        aria-label="Buchung löschen">
                        ×
                    </button>
                </td>
            </tr>
        `;
    });
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

console.log("ACTIVITIES", data);


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