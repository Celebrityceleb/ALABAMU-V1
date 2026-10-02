/* =========================================
   ALABAMU V1
   SUPABASE CONNECTION
========================================= */

const SUPABASE_URL =
    "https://snfhtyznypoukxmhetkl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Fat6XU5USrik_wEtT0mRfQ_ZcQM-cej";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

console.log("ALABAMU Supabase client initialized.");
supabaseClient.auth.getSession()
    .then(({ data, error }) => {
        if (error) {
            console.error("Supabase connection test failed:", error);
            return;
        }

        console.log("ALABAMU Supabase connection test successful.");
        console.log("Current session:", data.session);
    });
