import { supabaseClient } from "./supabase.js";

const resetForm = document.getElementById("resetPasswordForm");
const newPassword = document.getElementById("newPassword");
const confirmNewPassword = document.getElementById("confirmNewPassword");
const resetMessage = document.getElementById("resetMessage");
const resetButton = document.getElementById("resetPasswordButton");

let recoverySessionReady = false;


// Wait for Supabase to confirm that this is a password-recovery session
supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        if (event === "PASSWORD_RECOVERY" && session) {

            recoverySessionReady = true;

            if (resetMessage) {
                resetMessage.textContent =
                    "Enter your new password below.";
            }
        }
    }
);


// Handle password update
if (resetForm) {

    resetForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const password =
                newPassword?.value || "";

            const confirmPassword =
                confirmNewPassword?.value || "";


            if (!recoverySessionReady) {

                if (resetMessage) {
                    resetMessage.textContent =
                        "This password reset link is invalid or has expired.";
                }

                return;
            }


            if (password.length < 6) {

                if (resetMessage) {
                    resetMessage.textContent =
                        "Password must be at least 6 characters.";
                }

                return;
            }


            if (password !== confirmPassword) {

                if (resetMessage) {
                    resetMessage.textContent =
                        "The passwords do not match.";
                }

                return;
            }


            if (resetButton) {
                resetButton.disabled = true;
                resetButton.textContent = "UPDATING...";
            }

            if (resetMessage) {
                resetMessage.textContent =
                    "Updating your password...";
            }


            const { error } =
                await supabaseClient.auth.updateUser({
                    password: password
                });


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
                    resetButton.textContent = "UPDATE PASSWORD";
                }

                return;
            }


            if (resetMessage) {
                resetMessage.textContent =
                    "Password updated successfully. Returning to ALABAMU...";
            }


            await supabaseClient.auth.signOut();


            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        }
    );
}
