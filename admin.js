
/* =========================================
   ALABAMU ADMIN
   AUTHENTICATION + PRODUCT MANAGEMENT
========================================= */

const supabaseClient = window.supabaseClient;

/* =========================================
   ADMIN LOGIN
========================================= */

const adminLoginForm = document.getElementById("adminLoginForm");

if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value;
        const message = document.getElementById("adminLoginMessage");
        const button = document.getElementById("adminLoginButton");

        if (!supabaseClient) {
            if (message) message.textContent = "Supabase is not ready. Refresh and try again.";
            return;
        }

        if (message) message.textContent = "Connecting to ALABAMU...";
        if (button) button.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            if (!data.user) throw new Error("No user was returned.");

            const { data: adminRecord, error: adminError } = await supabaseClient
                .from("admin_users")
                .select("id, email, role")
                .eq("id", data.user.id)
                .maybeSingle();

            if (adminError) throw adminError;

            if (!adminRecord || adminRecord.role !== "admin") {
                await supabaseClient.auth.signOut();
                throw new Error("This account is not authorised for admin access.");
            }

            if (message) message.textContent = "Access confirmed. Opening dashboard...";
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error("Admin login failed:", error);
            if (message) message.textContent = error.message || "Login failed.";
            if (button) button.disabled = false;
        }
    });
}

/* =========================================
   ADMIN ACCESS CHECK
========================================= */

async function requireAdmin() {
    if (!supabaseClient) {
        window.location.href = "index.html";
        return null;
    }

    const { data: { user }, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "index.html";
        return null;
    }

    const { data: adminRecord, error: adminError } =
        await supabaseClient
            .from("admin_users")
            .select("id, email, role")
            .eq("id", user.id)
            .maybeSingle();

    if (adminError || !adminRecord || adminRecord.role !== "admin") {
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
        return null;
    }

    return { user, adminRecord };
}

/* =========================================
   SHARED HELPERS
========================================= */

function showAdminMessage(message, isError = false) {
    let notice = document.getElementById("adminNotice");

    if (!notice) {
        notice = document.createElement("div");
        notice.id = "adminNotice";
        notice.className = "admin-notice";
        document.querySelector(".admin-main")?.prepend(notice);
    }

    notice.textContent = message;
    notice.classList.toggle("error", isError);
    notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatNaira(value) {
    if (value === null || value === undefined || value === "") {
        return "Price not set";
    }

    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(Number(value));
}

function parseList(value) {
    return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}

/* =========================================
   DASHBOARD INITIALISATION
========================================= */

const dashboardPage = document.querySelector(".admin-dashboard-page");

if (dashboardPage) {
    initializeAdminDashboard();
}

async function initializeAdminDashboard() {
    const admin = await requireAdmin();
    if (!admin) return;

    setupAdminNavigation();
    setupLogout();
    setupProductManager();

    await loadAdminOverview();
    await loadAdminProducts();
}

function setupLogout() {
    const button = document.getElementById("adminLogoutButton");

    if (button) {
        button.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            window.location.href = "index.html";
        });
    }
}


/* =========================================
   NAVIGATION
========================================= */

function setupAdminNavigation() {
    const navButtons = document.querySelectorAll(".admin-nav-button");
    const sections = document.querySelectorAll(".admin-section");
    const pageTitle = document.getElementById("adminPageTitle");

    navButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const sectionName = button.dataset.section;

            navButtons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");

            sections.forEach(section => section.classList.remove("active"));

            document
                .getElementById(`section-${sectionName}`)
                ?.classList.add("active");

            if (pageTitle) {
                pageTitle.textContent = sectionName.toUpperCase();
            }

            if (sectionName === "products") {
                await loadAdminProducts();
            }

            if (sectionName === "dashboard") {
                await loadAdminOverview();
            }

            if (sectionName === "orders") {
                await loadAdminOrders();
            }

            if (sectionName === "customers") {
                await loadAdminCustomers();
            }
          if (sectionName === "settings") {
    await loadAdminSettings();
          }
        });
    });
}


/* =========================================
   OVERVIEW CARDS
========================================= */

async function loadAdminOverview() {
    try {
        const [ordersResult, productsResult, customersResult] = await Promise.all([
            supabaseClient.from("orders").select("id, payment_status"),
            supabaseClient.from("products").select("id"),
            supabaseClient.from("profiles").select("id")
        ]);

        if (ordersResult.error) throw ordersResult.error;
        if (productsResult.error) throw productsResult.error;
        if (customersResult.error) throw customersResult.error;

        const orders = ordersResult.data || [];
        const products = productsResult.data || [];
        const customers = customersResult.data || [];

        const pending = orders.filter(order =>
            String(order.payment_status || "").toLowerCase() === "pending"
        ).length;

        document.getElementById("statOrders").textContent = orders.length;
        document.getElementById("statProducts").textContent = products.length;
        document.getElementById("statCustomers").textContent = customers.length;
        document.getElementById("statPendingPayments").textContent = pending;
    } catch (error) {
        console.error("Could not load overview:", error);
        showAdminMessage("Some overview figures could not be loaded.", true);
    }
}

/* =========================================
   PRODUCT MANAGER
========================================= */

let editingProductId = null;

function setupProductManager() {
    document.getElementById("addProductButton")?.addEventListener("click", () => {
        openProductForm();
    });
}

async function loadAdminProducts() {
    const container = document.getElementById("adminProductsList");
    if (!container) return;

    container.innerHTML = '<p class="admin-placeholder">Loading products...</p>';

    try {
        const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <h3>No products yet</h3>
                    <p>Add your first ALABAMU product to start building the catalogue.</p>
                    <button type="button" class="admin-primary-button admin-small-button"
                        id="emptyAddProductButton">+ ADD PRODUCT</button>
                </div>
            `;

            document.getElementById("emptyAddProductButton")
                ?.addEventListener("click", () => openProductForm());

            return;
        }

        container.innerHTML = `
            <div class="admin-product-grid">
                ${data.map(product => renderProductCard(product)).join("")}
            </div>
        `;

        container.querySelectorAll("[data-edit-product]").forEach(button => {
            button.addEventListener("click", () => {
                const product = data.find(item =>
                    String(item.id) === button.dataset.editProduct
                );
                if (product) openProductForm(product);
            });
        });

        container.querySelectorAll("[data-toggle-product]").forEach(button => {
            button.addEventListener("click", async () => {
                const product = data.find(item =>
                    String(item.id) === button.dataset.toggleProduct
                );
                if (product) await toggleProductAvailability(product);
            });
        });

        container.querySelectorAll("[data-delete-product]").forEach(button => {
            button.addEventListener("click", async () => {
                const product = data.find(item =>
                    String(item.id) === button.dataset.deleteProduct
                );
                if (product) await deleteProduct(product);
            });
        });
    } catch (error) {
        console.error("Could not load products:", error);
        container.innerHTML = `
            <p class="admin-placeholder">
                Could not load products. Check your connection and product-table permissions, then refresh.
            </p>
        `;
    }
}

function renderProductCard(product) {
    const image = product.image_url
        ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}">`
        : `<div class="admin-product-no-image">NO IMAGE</div>`;

    const sizes = Array.isArray(product.sizes) ? product.sizes.join(", ") : "";
    const colours = Array.isArray(product.colours) ? product.colours.join(", ") : "";
    const published = product.is_available !== false;

    return `
        <article class="admin-product-card">
            <div class="admin-product-image">${image}</div>
            <div class="admin-product-card-body">
                <div class="admin-product-title-row">
                    <h3>${escapeHTML(product.name)}</h3>
                    <span class="admin-product-status ${published ? "published" : "hidden"}">
                        ${published ? "PUBLISHED" : "HIDDEN"}
                    </span>
                </div>

                <p class="admin-product-category">${escapeHTML(product.category || "Uncategorised")}</p>
                <strong class="admin-product-price">${escapeHTML(formatNaira(product.price))}</strong>

                <div class="admin-product-meta">
                    <p><b>Sizes:</b> ${escapeHTML(sizes || "Not set")}</p>
                    <p><b>Colours:</b> ${escapeHTML(colours || "Not set")}</p>
                </div>

                <div class="admin-product-actions">
                    <button type="button" class="admin-secondary-button"
                        data-edit-product="${escapeHTML(product.id)}">EDIT</button>
                    <button type="button" class="admin-secondary-button"
                        data-toggle-product="${escapeHTML(product.id)}">
                        ${published ? "HIDE" : "PUBLISH"}
                    </button>
                    <button type="button" class="admin-danger-button"
                        data-delete-product="${escapeHTML(product.id)}">DELETE</button>
                </div>
            </div>
        </article>
    `;
}

/* =========================================
   ADD / EDIT PRODUCT FORM
========================================= */

function openProductForm(product = null) {
    editingProductId = product ? product.id : null;

    document.getElementById("productFormModal")?.remove();

    const sizes = Array.isArray(product?.sizes) ? product.sizes.join(", ") : "";
    const colours = Array.isArray(product?.colours) ? product.colours.join(", ") : "";

    const modal = document.createElement("div");
    modal.id = "productFormModal";
    modal.className = "admin-modal-backdrop";

    modal.innerHTML = `
        <section class="admin-product-modal" role="dialog" aria-modal="true"
            aria-labelledby="productFormTitle">
            <div class="admin-modal-heading">
                <div>
                    <p class="admin-eyebrow">CATALOGUE MANAGEMENT</p>
                    <h2 id="productFormTitle">${product ? "EDIT PRODUCT" : "ADD PRODUCT"}</h2>
                </div>
                <button type="button" class="admin-modal-close" id="closeProductForm"
                    aria-label="Close form">&times;</button>
            </div>

            <form id="adminProductForm">
                <div class="admin-form-grid">
                    <div class="admin-form-field full-width">
                        <label for="productName">PRODUCT NAME *</label>
                        <input id="productName" name="name" required maxlength="150"
                            value="${escapeHTML(product?.name || "")}"
                            placeholder="e.g. Varsity Jacket">
                    </div>

                    <div class="admin-form-field">
                        <label for="productCategory">CATEGORY *</label>
                        <select id="productCategory" name="category" required>
                            <option value="">Select category</option>
                            ${[
                                "Outerwear",
                                "Tops & Bottoms",
                                "Matching Sets",
                                "Traditional Wear",
                                "Accessories",
                                "Footwear"
                            ].map(category => `
                                <option value="${escapeHTML(category)}"
                                    ${product?.category === category ? "selected" : ""}>
                                    ${escapeHTML(category)}
                                </option>
                            `).join("")}
                            <option value="Other" ${product?.category === "Other" ? "selected" : ""}>
                                Other
                            </option>
                        </select>
                    </div>

                    <div class="admin-form-field">
                        <label for="productPrice">PRICE (₦)</label>
                        <input id="productPrice" name="price" type="number" min="0"
                            step="0.01" value="${product?.price ?? ""}"
                            placeholder="e.g. 15000">
                    </div>

                    <div class="admin-form-field full-width">
                        <label for="productDescription">DESCRIPTION</label>
                        <textarea id="productDescription" name="description" rows="3"
                            placeholder="Describe the product">${escapeHTML(product?.description || "")}</textarea>
                    </div>

                    <div class="admin-form-field">
                        <label for="productMaterial">MATERIAL</label>
                        <input id="productMaterial" name="material"
                            value="${escapeHTML(product?.material || "")}"
                            placeholder="e.g. Cotton">
                    </div>

                    <div class="admin-form-field">
                        <label for="productFit">FIT</label>
                        <input id="productFit" name="fit"
                            value="${escapeHTML(product?.fit || "")}"
                            placeholder="e.g. Oversized">
                    </div>

                    <div class="admin-form-field full-width">
                        <label for="productCare">CARE INSTRUCTIONS</label>
                        <textarea id="productCare" name="care_instructions" rows="2"
                            placeholder="Washing and care instructions">${escapeHTML(product?.care_instructions || "")}</textarea>
                    </div>

                    <div class="admin-form-field full-width">
                        <label for="productSizes">AVAILABLE SIZES</label>
                        <input id="productSizes" name="sizes"
                            value="${escapeHTML(sizes)}"
                            placeholder="Comma-separated: S, M, L, XL">
                    </div>

                    <div class="admin-form-field full-width">
                        <label for="productColours">AVAILABLE COLOURS</label>
                        <input id="productColours" name="colours"
                            value="${escapeHTML(colours)}"
                            placeholder="Comma-separated: Black, White, Grey">
                    </div>

                    <div class="admin-form-field full-width">
                        <label for="productImage">PRODUCT IMAGE</label>
                        <input id="productImage" name="image" type="file"
                            accept="image/jpeg,image/png,image/webp">
                        <small>JPG, PNG or WebP. Maximum 5 MB.</small>
                        ${product?.image_url ? `
                            <img class="admin-current-image"
                                src="${escapeHTML(product.image_url)}"
                                alt="Current product image">
                            <p class="admin-current-image-note">
                                Choose a new file only if you want to replace this image.
                            </p>
                        ` : ""}
                    </div>

                    <div class="admin-form-field full-width">
                        <label class="admin-checkbox-label">
                            <input id="productPublished" type="checkbox"
                                ${product?.is_available !== false ? "checked" : ""}>
                            Publish product on the customer website
                        </label>
                    </div>
                </div>

                <p id="productFormMessage" class="admin-form-message" aria-live="polite"></p>

                <div class="admin-modal-actions">
                    <button type="button" class="admin-secondary-button" id="cancelProductForm">
                        CANCEL
                    </button>
                    <button type="submit" class="admin-primary-button" id="saveProductButton">
                        ${product ? "SAVE CHANGES" : "SAVE PRODUCT"}
                    </button>
                </div>
            </form>
        </section>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeProductForm").addEventListener("click", closeProductForm);
    document.getElementById("cancelProductForm").addEventListener("click", closeProductForm);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeProductForm();
    });

    document.getElementById("adminProductForm").addEventListener("submit", saveProduct);
}

function closeProductForm() {
    document.getElementById("productFormModal")?.remove();
    editingProductId = null;
}

/* =========================================
   SAVE PRODUCT + UPLOAD IMAGE
========================================= */

async function saveProduct(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = document.getElementById("productFormMessage");
    const button = document.getElementById("saveProductButton");

    button.disabled = true;
    message.textContent = "Saving product...";
    message.classList.remove("error");

    let uploadedImagePath = null;

    try {
        const name = document.getElementById("productName").value.trim();
        const category = document.getElementById("productCategory").value;
        const priceValue = document.getElementById("productPrice").value.trim();
        const price = priceValue === "" ? null : Number(priceValue);
      if (!name) throw new Error("Enter a product name.");
        if (!category) throw new Error("Choose a product category.");
        if (price !== null && (!Number.isFinite(price) || price < 0)) {
            throw new Error("Enter a valid price.");
        }

        const imageFile = document.getElementById("productImage").files[0];
        let imageUrl = null;

        if (editingProductId) {
            const { data: existing, error: existingError } = await supabaseClient
                .from("products")
                .select("image_url")
                .eq("id", editingProductId)
                .single();

            if (existingError) throw existingError;
            imageUrl = existing.image_url || null;
        }

        if (imageFile) {
            const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

            if (!allowedTypes.includes(imageFile.type)) {
                throw new Error("Choose a JPG, PNG or WebP image.");
            }
             if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error("The image must be 5 MB or smaller.");
            }

            const extension = imageFile.name.split(".").pop().toLowerCase();
            const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension)
                ? extension
                : "jpg";

            const imagePath = `${crypto.randomUUID()}.${safeExtension}`;

            message.textContent = "Uploading product image...";

            const { error: uploadError } = await supabaseClient.storage
                .from("product-images")
                .upload(imagePath, imageFile, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: imageFile.type
                });
           if (uploadError) throw uploadError;

            uploadedImagePath = imagePath;

            const { data: publicImage } = supabaseClient.storage
                .from("product-images")
                .getPublicUrl(imagePath);

            imageUrl = publicImage.publicUrl;
        }

        const productData = {
            name,
            category,
            price,
            description: document.getElementById("productDescription").value.trim() || null,
            material: document.getElementById("productMaterial").value.trim() || null,
            fit: document.getElementById("productFit").value.trim() || null,
            care_instructions: document.getElementById("productCare").value.trim() || null,
            sizes: parseList(document.getElementById("productSizes").value),
            colours: parseList(document.getElementById("productColours").value),
            image_url: imageUrl,
            is_available: document.getElementById("productPublished").checked
        };
      message.textContent = "Saving product details...";

        let result;

        if (editingProductId) {
            result = await supabaseClient
                .from("products")
                .update(productData)
                .eq("id", editingProductId)
                .select()
                .single();
        } else {
            result = await supabaseClient
                .from("products")
                .insert(productData)
                .select()
                .single();
        }

        if (result.error) throw result.error;

        const savedAsEdit = Boolean(editingProductId);

closeProductForm();

showAdminMessage(
    savedAsEdit ? "Product updated." : "Product saved."
);
        await loadAdminProducts();
        await loadAdminOverview();
    } catch (error) {
        console.error("Product save failed:", error);
  // Remove an image uploaded during a failed save so it doesn't become an orphan.
        if (uploadedImagePath) {
            const { error: cleanupError } = await supabaseClient.storage
                .from("product-images")
                .remove([uploadedImagePath]);

            if (cleanupError) {
                console.warn("Could not clean up unused image:", cleanupError);
            }
        }

        message.textContent = error.message || "Could not save the product.";
        message.classList.add("error");
    } finally {
         if (button.isConnected) button.disabled = false;
    }
}
/* =========================================
   PUBLISH / HIDE
========================================= */

async function toggleProductAvailability(product) {
    const currentlyPublished = product.is_available !== false;
    const nextValue = !currentlyPublished;

    const confirmation = nextValue
        ? `Publish "${product.name}" on the customer website?`
        : `Hide "${product.name}" from the customer website?`;

    if (!confirm(confirmation)) return;

    try {
        const { error } = await supabaseClient
            .from("products")
            .update({ is_available: nextValue })
            .eq("id", product.id);

        if (error) throw error;

        showAdminMessage(nextValue ? "Product published." : "Product hidden.");
        await loadAdminProducts();
        await loadAdminOverview();
    } catch (error) {
        console.error("Could not change product visibility:", error);
        showAdminMessage(error.message || "Could not update product visibility.", true);
    }
}
/* =========================================
   DELETE PRODUCT
========================================= */

async function deleteProduct(product) {
    const confirmation = confirm(
        `Delete "${product.name}" permanently?\n\nIf any order references this product, Supabase may reject deletion. In that case, hide the product instead.`
    );

    if (!confirmation) return;

    try {
        const { error } = await supabaseClient
            .from("products")
            .delete()
            .eq("id", product.id);

        if (error) throw error;

        showAdminMessage("Product deleted.");
        await loadAdminProducts();
        await loadAdminOverview();
    } catch (error) {
        console.error("Product deletion failed:", error);
        showAdminMessage(
            "Could not delete this product. It may be referenced by an order. Hide it instead. Details: " +
            (error.message || "Unknown error"),
            true
        );
    }
}


/* =========================================
   ADMIN ORDERS
========================================= */

let adminOrders = [];
let activeOrderView = "new";
let expandedAdminOrderId = null;

async function loadAdminOrders() {
    const list = document.getElementById("adminOrdersList");
    if (!list) return;

    list.innerHTML =
        `<p class="admin-placeholder">Loading orders...</p>`;

    try {
        const { data, error } = await supabaseClient
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        adminOrders = data || [];

        renderAdminOrders();
        updateAdminOrderSummary();

    } catch (error) {
        console.error("Could not load orders:", error);

        list.innerHTML =
            `<p class="admin-placeholder">Orders could not be loaded.</p>`;

        showAdminMessage("Could not load orders.", true);
    }
}

function updateAdminOrderSummary() {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText("ordersTotalCount", adminOrders.length);

    setText(
        "ordersAwaitingPayment",
        adminOrders.filter(order =>
            String(order.payment_status || "").toLowerCase() === "pending"
        ).length
    );

    setText(
        "ordersPaidCount",
        adminOrders.filter(order =>
            String(order.payment_status || "").toLowerCase() === "paid"
        ).length
    );

    setText(
        "ordersProcessingCount",
        adminOrders.filter(order =>
            String(order.order_status || "").toLowerCase() === "processing"
        ).length
    );
  setText(
        "ordersNewCount",
        adminOrders.filter(order =>
            String(order.order_status || "pending").toLowerCase() === "pending"
        ).length
    );

    setText(
        "ordersAwaitingViewCount",
        adminOrders.filter(order =>
            String(order.payment_status || "pending").toLowerCase() === "pending"
        ).length
    );
}

function renderAdminOrders() {
    const list = document.getElementById("adminOrdersList");
    if (!list) return;

    const search = (
        document.getElementById("ordersSearch")?.value || ""
    ).trim().toLowerCase();

    const statusFilter =
        document.getElementById("ordersStatusFilter")?.value || "all";

    const paymentFilter =
        document.getElementById("ordersPaymentFilter")?.value || "all";

    const filtered = adminOrders.filter(order => {
        const searchable = [
            order.reference,
            order.customer_name,
            order.customer_email,
            order.customer_phone,
            order.id
        ].join(" ").toLowerCase();

        const status = String(
            order.order_status || "pending"
        ).toLowerCase();

        const payment = String(
            order.payment_status || "pending"
        ).toLowerCase();

        let matchesView = true;

        if (activeOrderView === "new") {
            matchesView = status === "pending";
        } else if (activeOrderView === "awaiting") {
            matchesView = payment === "pending";
        } else if (activeOrderView === "processing") {
            matchesView = ["processing", "shipped"].includes(status);
        } else if (activeOrderView === "delivered") {
            matchesView = status === "delivered";
        }

        return searchable.includes(search)
            && matchesView
            && (statusFilter === "all" || status === statusFilter)
            && (paymentFilter === "all" || payment === paymentFilter);
    });

    // Keep the expanded order open only if it remains in this view.
    if (
        expandedAdminOrderId !== null &&
        !filtered.some(order =>
            String(order.id) === String(expandedAdminOrderId)
        )
    ) {
        expandedAdminOrderId = null;
    }

    if (!filtered.length) {
        let message = "No orders match this view and your filters.";

        if (adminOrders.length === 0) {
            message = "No orders have been placed yet.";
        } else if (activeOrderView === "new") {
            message = "There are no new orders right now.";
        } else if (activeOrderView === "awaiting") {
            message = "There are no orders awaiting payment.";
        } else if (activeOrderView === "processing") {
            message = "There are no orders being processed or shipped.";
        } else if (activeOrderView === "delivered") {
            message = "There are no delivered orders.";
        }

        list.innerHTML = `
            <p class="admin-empty-state">
                ${escapeHTML(message)}
            </p>
        `;
        return;
    }

    list.innerHTML = filtered.map(order => {
        const id = escapeHTML(String(order.id));

        const reference = escapeHTML(
            String(order.reference || order.id || "Order")
        );

        const customer = escapeHTML(
            String(order.customer_name || "Customer")
        );

        const payment = String(
            order.payment_status || "pending"
        ).toLowerCase();

        const status = String(
            order.order_status || "pending"
        ).toLowerCase();

        const total = escapeHTML(
            formatNaira(Number(order.total) || 0)
        );

        const date = order.created_at
            ? new Date(order.created_at).toLocaleString()
            : "Date unavailable";

        return `
            <article class="admin-order-card">
                <div class="admin-order-card-heading">
                    <div>
                        <h3>${reference}</h3>
                        <p>${escapeHTML(date)}</p>
                    </div>

                    <strong>${total}</strong>
                </div>

                <div class="admin-order-customer">
                    <strong>${customer}</strong>
                </div>

                <div class="admin-order-badges">
                    <span>Payment: ${escapeHTML(payment)}</span>
                    <span>Order: ${escapeHTML(status)}</span>
                </div>

                <button
                    type="button"
                    class="admin-primary-button admin-small-button admin-view-order-button"
                    data-view-order="${id}"
                    aria-expanded="false">
                    VIEW ORDER
                </button>

                <div
                    class="admin-order-detail"
                    id="order-detail-${id}"
                    hidden>
                </div>
            </article>
        `;
    }).join("");

    list.querySelectorAll("[data-view-order]").forEach(button => {
        button.addEventListener("click", async () => {
            const orderId = button.dataset.viewOrder;

            await toggleAdminOrderDetails(orderId);

            const detail = document.getElementById(
                `order-detail-${orderId}`
            );

            const isOpen = Boolean(detail && !detail.hidden);

            button.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );

            button.textContent = isOpen
                ? "CLOSE ORDER"
                : "VIEW ORDER";
        });
    });

    // Restore the expanded order after a list refresh.
    if (expandedAdminOrderId !== null) {
        const button = list.querySelector(
            `[data-view-order="${CSS.escape(String(expandedAdminOrderId))}"]`
        );

        if (button) {
            toggleAdminOrderDetails(expandedAdminOrderId).then(() => {
                const detail = document.getElementById(
                    `order-detail-${expandedAdminOrderId}`
                );

                if (detail && !detail.hidden) {
                    button.setAttribute("aria-expanded", "true");
                    button.textContent = "CLOSE ORDER";
                }
            });
        }
    }
}

async function updateAdminOrder(orderId, column, value, button) {
    const allowedValues = {
        payment_status: ["pending", "paid", "failed"],
        order_status: [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
        ]
    };

    if (
        !allowedValues[column] ||
        !allowedValues[column].includes(value)
    ) {
        showAdminMessage("Invalid status selected.", true);
        return;
    }

    const order = adminOrders.find(
        item => String(item.id) === String(orderId)
    );

    if (!order) {
        showAdminMessage("Order not found.", true);
        return;
    }

  // Prevent unpaid orders from entering fulfilment.
    if (
        column === "order_status" &&
        ["processing", "shipped", "delivered"].includes(
            String(value).toLowerCase()
        ) &&
        String(order.payment_status || "pending").toLowerCase() !== "paid"
    ) {
        showAdminMessage(
            "Confirm payment before processing, shipping or delivering this order.",
            true
        );
        return;
    }
    if (
        column === "payment_status" &&
        value === "paid" &&
        order.payment_status !== "paid"
    ) {
        const confirmed = window.confirm(
            "Have you checked the bank transfer and verified that the money was received?"
        );

        if (!confirmed) return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "SAVING...";

    try {
        const { data, error } = await supabaseClient
            .from("orders")
            .update({ [column]: value })
            .eq("id", order.id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                "No order was updated. Check admin permissions."
            );
        }

        order[column] = value;

        updateAdminOrderSummary();
        renderAdminOrders();

        showAdminMessage(
            column === "payment_status"
                ? "Payment status saved."
                : "Order status saved."
        );

    } catch (error) {
        console.error("Could not update order:", error);

        showAdminMessage(
            "Could not save the status. Check the console and Supabase permissions.",
            true
        );

        button.disabled = false;
        button.textContent = originalText;
    }
}

async function toggleAdminOrderDetails(orderId) {
    const order = adminOrders.find(
        item => String(item.id) === String(orderId)
    );

    const detail = document.getElementById(
        `order-detail-${orderId}`
    );

    if (!order || !detail) return;

    if (!detail.hidden) {
        detail.hidden = true;

        if (String(expandedAdminOrderId) === String(orderId)) {
            expandedAdminOrderId = null;
        }

        return;
    }

    detail.hidden = false;
    expandedAdminOrderId = String(orderId);
    detail.innerHTML = `<p>Loading order details...</p>`;

    try {
        const { data: items, error } = await supabaseClient
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

        if (error) throw error;

        const itemHTML = (items || []).map(item => `
            <div class="admin-order-item">
                <strong>${escapeHTML(
                    String(item.product_name || "Product")
                )}</strong>

                <p>
                    Quantity: ${Number(item.quantity) || 0}
                    · Size: ${escapeHTML(String(item.size || "—"))}
                    · Colour: ${escapeHTML(String(item.colour || "—"))}
                </p>

                <p>
                    Subtotal:
                    ${escapeHTML(
                        formatNaira(Number(item.subtotal) || 0)
                    )}
                </p>
            </div>
        `).join("");

        const paymentStatus = String(
            order.payment_status || "pending"
        ).toLowerCase();

        const orderStatus = String(
            order.order_status || "pending"
        ).toLowerCase();

        const phone = String(
            order.whatsapp_number ||
            order.customer_phone ||
            order.phone ||
            ""
        ).replace(/\D/g, "");

        const whatsappNumber = phone.startsWith("0")
            ? "234" + phone.slice(1)
            : phone;

        const whatsappHTML = whatsappNumber
            ? `<a
                class="admin-secondary-button"
                href="https://wa.me/${escapeHTML(whatsappNumber)}"
                target="_blank"
                rel="noopener noreferrer"
            >Contact on WhatsApp</a>`
            : "";

        detail.innerHTML = `
            <h4>Items ordered</h4>
            ${itemHTML || "<p>No order items found.</p>"}

            <h4>Customer information</h4>
            <p>Name: ${escapeHTML(String(
                order.customer_name || order.full_name || "Not provided"
            ))}</p>
            <p>Email: ${escapeHTML(String(
                order.customer_email || order.email || "Not provided"
            ))}</p>
            <p>Phone: ${escapeHTML(String(
                order.customer_phone || order.phone || "Not provided"
            ))}</p>

            <h4>Delivery information</h4>
            <p>${escapeHTML(String(
                order.delivery_address || "No address provided"
            ))}</p>
            <p>${escapeHTML(String(order.state || ""))}</p>
            <p>Payment method: ${escapeHTML(String(
                order.payment_method || "Not specified"
            ))}</p>
            <p>Order total: <strong>${escapeHTML(
                formatNaira(Number(order.total) || 0)
            )}</strong></p>

            <h4>Confirm payment</h4>
            <div class="admin-order-actions">
                <label>
                    Payment status
                    <select id="payment-status-${order.id}">
                        <option value="pending" ${
                            paymentStatus === "pending" ? "selected" : ""
                        }>Awaiting payment</option>
                        <option value="paid" ${
                            paymentStatus === "paid" ? "selected" : ""
                        }>Paid — verified</option>
                        <option value="failed" ${
                            paymentStatus === "failed" ? "selected" : ""
                        }>Failed</option>
                    </select>
                </label>

                <button type="button"
                    class="admin-secondary-button"
                    id="save-payment-${order.id}">
                    Save Payment
                </button>
            </div>

            <h4>Update order progress</h4>
            <div class="admin-order-actions">
                <label>
                    Order status
                    <select id="order-status-${order.id}">
                        <option value="pending" ${
                            orderStatus === "pending" ? "selected" : ""
                        }>New / Pending</option>
                        <option value="processing" ${
                            orderStatus === "processing" ? "selected" : ""
                        }>Processing</option>
                        <option value="shipped" ${
                            orderStatus === "shipped" ? "selected" : ""
                        }>Shipped</option>
                        <option value="delivered" ${
                            orderStatus === "delivered" ? "selected" : ""
                        }>Delivered</option>
                        <option value="cancelled" ${
                            orderStatus === "cancelled" ? "selected" : ""
                        }>Cancelled</option>
                    </select>
                </label>

                <button type="button"
                    class="admin-secondary-button"
                    id="save-order-status-${order.id}">
                    Save Status
                </button>
            </div>

            ${whatsappHTML}
        `;

        document.getElementById(`save-payment-${order.id}`)
            ?.addEventListener("click", function () {
                const select = document.getElementById(
                    `payment-status-${order.id}`
                );

                updateAdminOrder(
                    order.id,
                    "payment_status",
                    select.value,
                    this
                );
            });

        document.getElementById(`save-order-status-${order.id}`)
            ?.addEventListener("click", function () {
                const select = document.getElementById(
                    `order-status-${order.id}`
                );

                updateAdminOrder(
                    order.id,
                    "order_status",
                    select.value,
                    this
                );
            });

    } catch (error) {
        console.error("Could not load order details:", error);
        detail.innerHTML = `<p>Could not load order details.</p>`;
    }
}
function setupAdminOrders() {
    document.getElementById("refreshOrdersButton")
        ?.addEventListener("click", loadAdminOrders);

    document.getElementById("ordersSearch")
        ?.addEventListener("input", renderAdminOrders);

    document.getElementById("ordersStatusFilter")
        ?.addEventListener("change", renderAdminOrders);

    document.getElementById("ordersPaymentFilter")
        ?.addEventListener("change", renderAdminOrders);

    const orderTabs = document.querySelectorAll(
        "#adminOrderTabs [data-order-view]"
    );

    orderTabs.forEach(button => {
        button.setAttribute(
            "aria-pressed",
            button.classList.contains("active") ? "true" : "false"
        );

        button.addEventListener("click", () => {
            activeOrderView = button.dataset.orderView || "all";
            expandedAdminOrderId = null;

            orderTabs.forEach(tab => {
                const isActive = tab === button;

                tab.classList.toggle("active", isActive);
                tab.setAttribute(
                    "aria-pressed",
                    isActive ? "true" : "false"
                );
            });

            renderAdminOrders();
        });
    });
}

setupAdminOrders();

/* =========================================
   ADMIN CUSTOMERS
========================================= */

let adminCustomers = [];
let expandedAdminCustomerId = null;

/* Render customer list and search results */
function renderAdminCustomers() {
    const list = document.getElementById("adminCustomersList");
    const count = document.getElementById("adminCustomerSearchCount");
    const searchInput = document.getElementById("adminCustomerSearch");

    if (!list) return;

    const searchTerm = (searchInput?.value || "")
        .trim()
        .toLowerCase();

    const filteredCustomers = adminCustomers.filter(customer =>
        (customer.email || "").toLowerCase().includes(searchTerm)
    );

    if (count) {
        count.textContent =
            `${filteredCustomers.length} customer${
                filteredCustomers.length === 1 ? "" : "s"
            } found`;
    }

    if (filteredCustomers.length === 0) {
        list.innerHTML = `
            <p class="admin-placeholder">
                ${
                    searchTerm
                        ? "No customers match your search."
                        : "No registered customers found."
                }
            </p>
        `;
        return;
    }

    list.innerHTML = filteredCustomers.map(customer => {
        const id = escapeHTML(String(customer.id || ""));
        const email = escapeHTML(customer.email || "No email");

        const joined = customer.created_at
            ? new Date(customer.created_at).toLocaleDateString()
            : "Unknown";

        const lastSignIn = customer.last_sign_in_at
            ? new Date(customer.last_sign_in_at).toLocaleDateString()
            : "Never";

        const expanded =
            String(customer.id) === String(expandedAdminCustomerId);

        return `
            <div class="admin-customer-card">
                <button
                    type="button"
                    class="admin-customer-toggle"
                    data-customer-id="${id}"
                    aria-expanded="${expanded}"
                >
                    <h3>${email}</h3>

                    <p>Joined: ${escapeHTML(joined)}</p>

                    <p>Last sign-in: ${escapeHTML(lastSignIn)}</p>

                    <p>
                        Email confirmed:
                        ${customer.email_confirmed_at ? "Yes" : "No"}
                    </p>

                    <span>
                        ${expanded ? "Hide details ▲" : "View details ▼"}
                    </span>
                </button>

                <div
                    class="admin-customer-details"
                    id="customer-detail-${id}"
                    ${expanded ? "" : "hidden"}
                ></div>
            </div>
        `;
    }).join("");
}

/* Expand or collapse customer details */
async function toggleAdminCustomerDetails(customerId) {
    const customer = adminCustomers.find(
        item => String(item.id) === String(customerId)
    );

    const detail = document.getElementById(
        `customer-detail-${customerId}`
    );

    if (!customer || !detail) return;

    if (!detail.hidden) {
        expandedAdminCustomerId = null;
        renderAdminCustomers();
        return;
    }

    expandedAdminCustomerId = String(customerId);
    renderAdminCustomers();

    const openedDetail = document.getElementById(
        `customer-detail-${customerId}`
    );

    if (!openedDetail) return;

    openedDetail.innerHTML = `
        <p class="admin-placeholder">
            Loading customer order history...
        </p>
    `;

    try {
        /* Match orders using the authenticated customer's UUID */
        const { data: orders, error } = await supabaseClient
            .from("orders")
            .select(`
                id,
                customer_id,
                reference,
                created_at,
                order_status,
                payment_status,
                total
            `)
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        /* Ignore results if the customer panel changed during loading */
        if (
            String(expandedAdminCustomerId) !== String(customerId)
        ) {
            return;
        }

        const currentDetail = document.getElementById(
            `customer-detail-${customerId}`
        );

        if (!currentDetail || currentDetail.hidden) return;

        const customerOrders = orders || [];

        const paidOrders = customerOrders.filter(order =>
            String(order.payment_status || "").toLowerCase() === "paid"
        );

        const paidTotal = paidOrders.reduce(
            (total, order) =>
                total + (Number(order.total) || 0),
            0
        );

        const orderHistory = customerOrders.length
            ? customerOrders.map(order => {
                const reference = escapeHTML(
                    String(order.reference || `Order ${order.id}`)
                );

                const date = order.created_at
                    ? new Date(order.created_at).toLocaleDateString()
                    : "Unknown";

                const status = escapeHTML(
                    String(order.order_status || "pending")
                );

                const payment = escapeHTML(
                    String(order.payment_status || "pending")
                );

                const amount = formatNaira(
                    Number(order.total) || 0
                );

                return `
                    <div class="admin-customer-order">
                        <h4>${reference}</h4>

                        <p>Date: ${escapeHTML(date)}</p>

                        <p>Order status: ${status}</p>

                        <p>Payment status: ${payment}</p>

                        <p>
                            Order total:
                            <strong>${escapeHTML(amount)}</strong>
                        </p>
                    </div>
                `;
            }).join("")
            : `
                <p class="admin-placeholder">
                    This customer has not placed any orders.
                </p>
            `;

        currentDetail.innerHTML = `
            <h4>Customer order summary</h4>

            <p>Total orders: ${customerOrders.length}</p>

            <p>Verified paid orders: ${paidOrders.length}</p>

            <p>
                Total from paid orders:
                <strong>${escapeHTML(formatNaira(paidTotal))}</strong>
            </p>

            <h4>Order history</h4>

            ${orderHistory}
        `;

    } catch (error) {
        console.error(
            "Could not load customer order history:",
            error
        );

        const currentDetail = document.getElementById(
            `customer-detail-${customerId}`
        );

        if (currentDetail && !currentDetail.hidden) {
            currentDetail.innerHTML = `
                <p class="admin-placeholder">
                    Could not load this customer's orders.
                    Please try again.
                </p>
            `;
        }
    }
}

/* Load registered customers */
async function loadAdminCustomers() {
    const list = document.getElementById("adminCustomersList");

    if (!list) return;

    list.innerHTML = `
        <p class="admin-placeholder">Loading customers...</p>
    `;

    try {
        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
            throw new Error(
                "Your session has expired. Please sign in again."
            );
        }

        const { data, error } = await supabaseClient.functions.invoke(
            "admin-customers",
            { body: {} }
        );

        if (error) {
            throw new Error(
                error.message || "Could not load customers."
            );
        }

        if (!data || !Array.isArray(data.customers)) {
            throw new Error(
                data?.error || "The customer response was invalid."
            );
        }

        adminCustomers = data.customers;
        expandedAdminCustomerId = null;

        renderAdminCustomers();

    } catch (error) {
        console.error("Could not load customers:", error);

        list.innerHTML = `
            <p class="admin-placeholder">
                Customers could not be loaded. Please try again.
            </p>
        `;

        const count = document.getElementById(
            "adminCustomerSearchCount"
        );

        if (count) {
            count.textContent = "Customer list unavailable";
        }

        if (typeof showAdminMessage === "function") {
            showAdminMessage("Could not load customers.", true);
        }
    }
}

/* Handle customer card clicks */
document.addEventListener("click", event => {
    const button = event.target.closest(".admin-customer-toggle");

    if (!button) return;

    const customerId = button.dataset.customerId;

    if (customerId) {
        toggleAdminCustomerDetails(customerId);
    }
});

/* Live customer search */
document.addEventListener("input", event => {
    if (event.target?.id === "adminCustomerSearch") {
        expandedAdminCustomerId = null;
        renderAdminCustomers();
    }
});

/* =========================================
   ADMIN SETTINGS
========================================= */

function setAdminSettingsMessage(message, isError = false) {
    const element = document.getElementById("adminSettingsMessage");

    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#b42318" : "#18794e";
}


async function loadAdminSettings() {
    const form = document.getElementById("adminSettingsForm");

    if (!form) return;

    setAdminSettingsMessage("Loading settings...");

    try {
        const { data, error } = await window.supabaseClient
            .from("store_settings")
            .select("*")
            .order("id", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error("No settings record exists in the database.");
        }

        document.getElementById("settingStoreName").value =
            data.store_name || "";

        document.getElementById("settingTagline").value =
            data.tagline || "";

        document.getElementById("settingAboutText").value =
            data.about_text || "";

        document.getElementById("settingContactEmail").value =
            data.contact_email || "";

        document.getElementById("settingWhatsapp").value =
            data.whatsapp_number || "";

        document.getElementById("settingDeliveryInformation").value =
            data.delivery_information || "";

        document.getElementById("settingBankName").value =
            data.bank_name || "";

        document.getElementById("settingAccountName").value =
            data.account_name || "";

        document.getElementById("settingAccountNumber").value =
            data.account_number || "";

        form.dataset.settingsId = data.id;

        setAdminSettingsMessage("Settings loaded successfully.");

    } catch (error) {
        console.error("Settings loading error:", error);

        setAdminSettingsMessage(
            "Could not load settings: " + error.message,
            true
        );
    }
}


async function saveAdminSettings(event) {
    event.preventDefault();

    const form = document.getElementById("adminSettingsForm");
    const button = document.getElementById("saveAdminSettings");

    if (!form || !button) return;

    const settingsId = form.dataset.settingsId;

    if (!settingsId) {
        setAdminSettingsMessage(
            "Settings have not loaded. Open Settings again.",
            true
        );
        return;
    }

    button.disabled = true;
    button.textContent = "Saving...";

    setAdminSettingsMessage("Saving settings...");

    try {
        const settings = {
            store_name: document.getElementById("settingStoreName").value.trim(),
            tagline: document.getElementById("settingTagline").value.trim(),
            about_text: document.getElementById("settingAboutText").value.trim(),
            contact_email: document.getElementById("settingContactEmail").value.trim(),
            whatsapp_number: document.getElementById("settingWhatsapp").value.trim(),
            delivery_information: document.getElementById("settingDeliveryInformation").value.trim(),
            bank_name: document.getElementById("settingBankName").value.trim(),
            account_name: document.getElementById("settingAccountName").value.trim(),
            account_number: document.getElementById("settingAccountNumber").value.trim(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await window.supabaseClient
            .from("store_settings")
            .update(settings)
            .eq("id", settingsId)
            .select("id")
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "No settings row was updated. Check your Supabase permissions."
            );
        }

        setAdminSettingsMessage("Settings saved successfully.");

    } catch (error) {
        console.error("Settings saving error:", error);

        setAdminSettingsMessage(
            "Save failed: " + error.message,
            true
        );

    } finally {
        button.disabled = false;
        button.textContent = "Save settings";
    }
}


/* Connect the Settings form */

document.addEventListener("submit", function (event) {
    if (event.target && event.target.id === "adminSettingsForm") {
        saveAdminSettings(event);
    }
});
