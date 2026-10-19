
const resetForm = document.getElementById("resetPasswordForm");
const newPassword = document.getElementById("newPassword");
const confirmNewPassword = document.getElementById("confirmNewPassword");
const resetMessage = document.getElementById("resetMessage");
const resetButton = document.getElementById("resetPasswordButton");

let recoverySessionReady = false;
let isUpdating = false;

function showMessage(message) {
    if (resetMessage) {
        resetMessage.textContent = message;
    }
}

function setButton(disabled, text) {
    if (resetButton) {
        resetButton.disabled = disabled;
        resetButton.textContent = text;
    }
}

async function checkRecoverySession() {
    const client = window.supabaseClient;

    if (!client) {
        showMessage("The account service did not load. Refresh this page and try again.");
        return false;
    }

    try {
        const { data, error } = await client.auth.getSession();

        if (error) {
            console.error("Recovery session check failed:", error);
            showMessage("Could not verify this reset link. Request a new one.");
            return false;
        }

        recoverySessionReady = Boolean(data.session);

        if (recoverySessionReady) {
            showMessage("Enter your new password below.");
        } else {
            showMessage("Your reset link is invalid or expired. Request a new reset email.");
        }

        return recoverySessionReady;
    } catch (error) {
        console.error("Recovery session check failed:", error);
        showMessage("Could not verify this reset link. Request a new one.");
        return false;
    }
}

const clientAtLoad = window.supabaseClient;

if (!clientAtLoad) {
    showMessage("The account service did not load. Refresh this page and try again.");
    setButton(true, "UPDATE PASSWORD");
} else {
    clientAtLoad.auth.onAuthStateChange((event, session) => {
        console.log("ALABAMU auth event:", event);

        if (event === "PASSWORD_RECOVERY" && session) {
            recoverySessionReady = true;
            showMessage("Enter your new password below.");
        }
    });

    checkRecoverySession();
}

if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isUpdating) return;

        const password = newPassword.value;
        const confirmPassword = confirmNewPassword.value;

        // Always validate matching passwords before any network request.
        if (password !== confirmPassword) {
            showMessage("The passwords do not match. Please check both fields.");
            confirmNewPassword.focus();
            return;
        }

        if (password.length < 6) {
            showMessage("Password must be at least 6 characters.");
            newPassword.focus();
            return;
        }

        const client = window.supabaseClient;

        if (!client) {
            showMessage("The account service did not load. Refresh and try again.");
            return;
        }

        if (!recoverySessionReady) {
            const ready = await checkRecoverySession();

            if (!ready) return;
        }

        isUpdating = true;
        setButton(true, "UPDATING...");
        showMessage("Updating your password...");

        try {
            const { data, error } = await client.auth.updateUser({
                password: password
            });

            if (error) {
                console.error("Password update error:", error);
                showMessage("Password update failed. Request a fresh reset email and try again.");
                setButton(false, "UPDATE PASSWORD");
                return;
            }

            if (!data?.user) {
                showMessage("No confirmation was returned. Please try again with a fresh reset link.");
                setButton(false, "UPDATE PASSWORD");
                return;
            }

            showMessage("Password updated successfully. You can now log in using your new password.");
            setButton(true, "PASSWORD UPDATED");
            resetForm.reset();

        } catch (error) {
            console.error("Unexpected password update error:", error);
            showMessage("Something went wrong. Please request a new reset email and try again.");
            setButton(false, "UPDATE PASSWORD");
        } finally {
            isUpdating = false;
        }
    });
}
