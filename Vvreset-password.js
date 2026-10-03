import { supabaseClient } from "./supabase.js";

const resetForm =
    document.getElementById("resetPasswordForm");

const newPassword =
    document.getElementById("newPassword");

const confirmNewPassword =
    document.getElementById("confirmNewPassword");

const resetMessage =
    document.getElementById("resetMessage");

const resetButton =
    document.getElementById("resetPasswordButton");

let recoverySessionReady = false;


// ------------------------------------
// CHECK PASSWORD RECOVERY SESSION
// ------------------------------------

async function checkRecoverySession() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "Could not check recovery session:",
            error
        );

        if (resetMessage) {
            resetMessage.textContent =
                "Could not verify the password reset session.";
        }

        return;
    }


    if (session) {

        recoverySessionReady = true;

        if (resetMessage) {
            resetMessage.textContent =
                "Enter your new password below.";
        }

        return;
    }


    if (resetMessage) {

        resetMessage.textContent =
            "Waiting for password reset verification...";
    }
}


// ------------------------------------
// LISTEN FOR PASSWORD RECOVERY EVENT
// ------------------------------------

const {
    data: authListener
} = supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "ALABAMU auth event:",
            event
        );


        if (
            event === "PASSWORD_RECOVERY" &&
            session
        ) {

            recoverySessionReady = true;

            if (resetMessage) {

                resetMessage.textContent =
                    "Enter your new password below.";
            }
        }
    }
);


// ------------------------------------
// CHECK SESSION WHEN PAGE LOADS
// ------------------------------------

checkRecoverySession();


// ------------------------------------
// HANDLE PASSWORD UPDATE
// ------------------------------------

if (resetForm) {

    resetForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const password =
                newPassword?.value || "";

            const confirmPassword =
                confirmNewPassword?.value || "";


            // ------------------------------
            // CHECK SESSION
            // ------------------------------

            if (!recoverySessionReady) {

                await checkRecoverySession();

                if (!recoverySessionReady) {

                    if (resetMessage) {

                        resetMessage.textContent =
                            "This password reset link is invalid or has expired.";
                    }

                    return;
                }
            }


            // ------------------------------
            // CHECK PASSWORD LENGTH
            // ------------------------------

            if (password.length < 6) {

                if (resetMessage) {

                    resetMessage.textContent =
                        "Password must be at least 6 characters.";
                }

                return;
            }


            // ------------------------------
            // CHECK PASSWORD MATCH
            // ------------------------------

            if (password !== confirmPassword) {

                if (resetMessage) {

                    resetMessage.textContent =
                        "The passwords do not match.";
                }

                return;
            }


            // ------------------------------
            // DISABLE BUTTON
            // ------------------------------

            if (resetButton) {

                resetButton.disabled = true;

                resetButton.textContent =
                    "UPDATING...";
            }


            if (resetMessage) {

                resetMessage.textContent =
                    "Updating your password...";
            }


            // ------------------------------
            // UPDATE PASSWORD
            // ------------------------------

            const {
                data,
                error
            } =
                await supabaseClient.auth.updateUser({
                    password: password
                });


            // ------------------------------
            // HANDLE ERROR
            // ------------------------------

            if (error) {

                console.error(
                    "Password update error:",
                    error
                );


                if (resetMessage) {

                    resetMessage.textContent =
                        "Could not update your password. Please request a new reset link.";
                }


                if (resetButton) {

                    resetButton.disabled = false;

                    resetButton.textContent =
                        "UPDATE PASSWORD";
                }

                return;
            }


            // ------------------------------
            // CONFIRM SUCCESS
            // ------------------------------

            if (data?.user) {

                console.log(
                    "ALABAMU password updated successfully."
                );

                if (resetMessage) {

                    resetMessage.textContent =
                        "Password updated successfully. You can now log in with your new password.";
                }


                if (resetButton) {

                    resetButton.disabled = true;

                    resetButton.textContent =
                        "PASSWORD UPDATED";
                }

            } else {

                if (resetMessage) {

                    resetMessage.textContent =
                        "Password update completed. Please return to ALABAMU and log in.";
                }


                if (resetButton) {

                    resetButton.disabled = true;

                    resetButton.textContent =
                        "PASSWORD UPDATED";
                }
            }
        }
    );
}


// ------------------------------------
// CLEAN UP AUTH LISTENER
// ------------------------------------

// The listener remains active while this page
// is open. No sign-out is performed here because
// Supabase needs the recovery session to complete
// the password update correctly.