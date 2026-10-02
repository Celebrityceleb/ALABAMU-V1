/* =========================================
   ALABAMU V1
   APPLICATION
========================================= */


// =========================================
// SUPABASE PRODUCT DATA
// =========================================

let products = [];


// =========================================
// LOAD PRODUCTS FROM SUPABASE
// =========================================

async function loadProducts() {

    const {
        data,
        error
    } = await supabaseClient
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error(
            "Could not load products:",
            error
        );

        return;

    }


    products = data || [];


    console.log(
        "ALABAMU products loaded:",
        products
    );


    renderProducts();

    renderSearchResults();

}


// =========================================
// CART
// =========================================

let cart = JSON.parse(
    localStorage.getItem("alabamuCart")
) || [];


function saveCart() {

    localStorage.setItem(
        "alabamuCart",
        JSON.stringify(cart)
    );

}


// =========================================
// DOM ELEMENTS
// =========================================

const productGrid =
    document.getElementById("productGrid");

const cartCount =
    document.getElementById("cartCount");

const mobileMenu =
    document.getElementById("mobileMenu");

const menuButton =
    document.getElementById("menuButton");


// =========================================
// HEADER ELEMENTS
// =========================================

const searchButton =
    document.getElementById("searchButton");

const accountButton =
    document.getElementById("accountButton");

const mobileAccountButton =
    document.getElementById("mobileAccountButton");

const searchPanel =
    document.getElementById("searchPanel");

const searchInput =
    document.getElementById("searchInput");

const searchResults =
    document.getElementById("searchResults");

const accountPanel =
    document.getElementById("accountPanel");

const accountCloseButton =
    document.getElementById("accountCloseButton");


// =========================================
// RENDER PRODUCTS
// =========================================

function renderProducts(category = "all") {

    if (!productGrid) return;


    const filteredProducts =
        category === "all"
            ? products
            : products.filter(
                product =>
                    product.category === category
            );


    productGrid.innerHTML = "";


    if (filteredProducts.length === 0) {

        productGrid.innerHTML = `

            <div class="product-empty">

                <p>
                    Products will appear here
                    when added by the admin.
                </p>

            </div>

        `;

        return;

    }


    filteredProducts.forEach(product => {

        const card =
            document.createElement("article");


        card.className =
            "product-card";


        card.addEventListener(
            "click",
            () => {
                openProduct(product.id);
            }
        );


        let imageHTML = `

            <div class="product-placeholder">

                Product image will appear here
                when uploaded by the admin.

            </div>

        `;


        if (product.image_url) {

            imageHTML = `

                <img
                    src="${product.image_url}"
                    alt="${product.name || "ALABAMU product"}"
                >

            `;

        }


        const priceHTML =
            product.price !== null &&
            product.price !== undefined
                ? `₦${Number(
                    product.price
                ).toLocaleString()}`
                : "Price not available yet";


        const categoryName =
            product.category ||
            "ALABAMU";


        card.innerHTML = `

            <div class="product-image">

                ${imageHTML}

            </div>


            <div class="product-info">

                <div class="product-category">

                    ${categoryName}

                </div>


                <div class="product-name">

                    ${product.name || "Product name not available"}

                </div>


                <div
                    class="product-price
                    ${
                        product.price === null ||
                        product.price === undefined
                            ? "empty"
                            : ""
                    }"
                >

                    ${priceHTML}

                </div>

            </div>

        `;


        productGrid.appendChild(card);

    });

}


// =========================================
// CATEGORY FILTER
// =========================================

const categoryButtons =
    document.querySelectorAll(
        ".category-button"
    );


categoryButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            categoryButtons.forEach(
                item =>
                    item.classList.remove("active")
            );


            button.classList.add("active");


            const category =
                button.dataset.category;


            renderProducts(category);

        }
    );

});


// =========================================
// OPEN PRODUCT
// =========================================

function openProduct(productId) {

    window.location.href =
        `product.html?id=${productId}`;

}


// =========================================
// MOBILE MENU
// =========================================

if (menuButton) {

    menuButton.addEventListener(
        "click",
        () => {

            if (!mobileMenu) return;


            const isOpen =
                mobileMenu.classList.toggle("open");


            menuButton.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );

        }
    );

}


// =========================================
// CLOSE MOBILE MENU AFTER NAVIGATION
// =========================================

document
    .querySelectorAll(".mobile-menu a")
    .forEach(link => {

        link.addEventListener(
            "click",
            () => {

                if (!mobileMenu) return;


                mobileMenu.classList.remove(
                    "open"
                );


                if (menuButton) {

                    menuButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );

    });


// =========================================
// OPEN SEARCH
// =========================================

function openSearch() {

    // If search panel exists on this page,
    // open it directly.

    if (searchPanel) {

    searchPanel.hidden = false;
    searchPanel.classList.add("open");


        if (searchInput) {

            setTimeout(
                () => searchInput.focus(),
                50
            );

        }


        renderSearchResults();

        return;

    }


    // On other pages, return to homepage
    // and tell the homepage to open search.

    window.location.href =
        "index.html#search";

}


// =========================================
// CLOSE SEARCH
// =========================================

function closeSearch() {

    if (!searchPanel) return;

    searchPanel.classList.remove("open");
searchPanel.hidden = true;

}


// =========================================
// SEARCH BUTTON
// =========================================

if (searchButton) {

    searchButton.addEventListener(
        "click",
        openSearch
    );

}
const searchCloseButton =
    document.getElementById("searchCloseButton");

if (searchCloseButton) {

    searchCloseButton.addEventListener(
        "click",
        closeSearch
    );

}


// =========================================
// SEARCH PRODUCTS
// =========================================

function renderSearchResults() {

    if (!searchResults) return;


    const query =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    if (!query) {

        searchResults.innerHTML = `

            <p class="search-empty">

                Start typing to search ALABAMU products.

            </p>

        `;

        return;

    }


    const matches =
        products.filter(product => {

            const name =
                String(
                    product.name || ""
                ).toLowerCase();


            const category =
                String(
                    product.category || ""
                ).toLowerCase();


            const description =
                String(
                    product.description || ""
                ).toLowerCase();


            return (
                name.includes(query) ||
                category.includes(query) ||
                description.includes(query)
            );

        });


    if (matches.length === 0) {

        searchResults.innerHTML = `

            <p class="search-empty">

                No products found.

            </p>

        `;

        return;

    }


    searchResults.innerHTML = "";


    matches.forEach(product => {

        const result =
            document.createElement("button");


        result.type =
            "button";


        result.className =
            "search-result";


        const price =
            product.price !== null &&
            product.price !== undefined
                ? `₦${Number(
                    product.price
                ).toLocaleString()}`
                : "Price not available yet";


        result.innerHTML = `

            <span class="search-result-name">

                ${product.name || "Product"}

            </span>


            <span class="search-result-price">

                ${price}

            </span>

        `;


        result.addEventListener(
            "click",
            () => {

                openProduct(product.id);

            }
        );


        searchResults.appendChild(result);

    });

}


// =========================================
// SEARCH INPUT
// =========================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderSearchResults
    );

}


// =========================================
// OPEN ACCOUNT
// =========================================

function openAccount() {

    // If account panel exists on this page,
    // open it directly.

    if (accountPanel) {

    accountPanel.hidden = false;
    accountPanel.classList.add("open");


        if (mobileMenu) {

            mobileMenu.classList.remove(
                "open"
            );

        }


        if (menuButton) {

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        return;

    }


    // On other pages, return to homepage
    // and tell the homepage to open account.

    window.location.href =
        "index.html#account";

}


// =========================================
// CLOSE ACCOUNT
// =========================================

function closeAccount() {

    if (!accountPanel) return;

    accountPanel.classList.remove("open");
accountPanel.hidden = true;

}


// =========================================
// ACCOUNT BUTTON
// =========================================

if (accountButton) {

    accountButton.addEventListener(
        "click",
        openAccount
    );

}


// =========================================
// MOBILE ACCOUNT BUTTON
// =========================================

if (mobileAccountButton) {

    mobileAccountButton.addEventListener(
        "click",
        openAccount
    );

}
if (editAccountButton) {

    editAccountButton.addEventListener(
        "click",
        () => {

            const editForm =
                document.getElementById("editAccountForm");

            const nameInput =
                document.getElementById("editAccountName");

            const phoneInput =
                document.getElementById("editAccountPhone");

            const addressInput =
                document.getElementById("editAccountAddress");

            const stateInput =
                document.getElementById("editAccountState");


            if (!editForm) return;


            nameInput.value =
                accountName?.textContent !== "Not provided"
                    ? accountName.textContent
                    : "";

            phoneInput.value =
                accountPhone?.textContent !== "Not provided"
                    ? accountPhone.textContent
                    : "";

            addressInput.value =
                accountAddress?.textContent !== "Not provided"
                    ? accountAddress.textContent
                    : "";

            stateInput.value =
                accountState?.textContent !== "Not provided"
                    ? accountState.textContent
                    : "";


            const accountView =
    document.getElementById("accountView");

if (accountView) {
    accountView.style.display = "none";
}

editForm.style.display = "grid";

        }
    );

}
const cancelEditAccountButton =
    document.getElementById("cancelEditAccountButton");

if (cancelEditAccountButton) {

    cancelEditAccountButton.addEventListener(
        "click",
        () => {

            const accountView =
                document.getElementById("accountView");

            const editForm =
                document.getElementById("editAccountForm");

            if (editForm) {
                editForm.style.display = "none";
            }

            if (accountView) {
                accountView.style.display = "block";
            }

        }
    );

}
const saveAccountButton =
    document.getElementById("saveAccountButton");

if (saveAccountButton) {

    saveAccountButton.addEventListener(
        "click",
        async () => {

            const editName =
                document.getElementById("editAccountName");

            const editPhone =
                document.getElementById("editAccountPhone");

            const editAddress =
                document.getElementById("editAccountAddress");

            const editState =
                document.getElementById("editAccountState");

            const editMessage =
                document.getElementById("editAccountMessage");

            const accountView =
                document.getElementById("accountView");

            const editForm =
                document.getElementById("editAccountForm");


            const name = editName?.value.trim() || "";
            const phone = editPhone?.value.trim() || "";
            const address = editAddress?.value.trim() || "";
            const state = editState?.value.trim() || "";


            if (!name) {
                if (editMessage) {
                    editMessage.textContent =
                        "Please enter your full name.";
                }
                return;
            }


            if (editMessage) {
                editMessage.textContent =
                    "Saving your changes...";
            }


            const {
                data: { user },
                error: userError
            } = await supabaseClient.auth.getUser();


            if (userError || !user) {

                if (editMessage) {
                    editMessage.textContent =
                        "Please log in again before saving.";
                }

                return;
            }


            const { error } = await supabaseClient
                .from("profiles")
                .update({
                    full_name: name,
                    phone: phone,
                    delivery_address: address,
                    state: state,
                    updated_at: new Date().toISOString()
                })
                .eq("id", user.id);


            if (error) {

                console.error(
                    "Could not update profile:",
                    error
                );

                if (editMessage) {
                    editMessage.textContent =
                        "Could not save your changes. Please try again.";
                }

                return;
            }


            // Refresh the account information
            await loadCustomerProfile(user);


            if (editForm) {
                editForm.style.display = "none";
            }

            if (accountView) {
                accountView.style.display = "block";
            }

            if (editMessage) {
                editMessage.textContent = "";
            }

        }
    );

}
const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

if (forgotPasswordButton) {

    forgotPasswordButton.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();

            const emailInput =
                document.getElementById("authEmail");

            const authMessage =
                document.getElementById("authMessage");

            const email =
                emailInput?.value.trim() || "";


            if (!email) {

                if (authMessage) {
                    authMessage.textContent =
                        "Enter your email address first.";
                }

                emailInput?.focus();

                return;
            }


            if (authMessage) {
                authMessage.textContent =
                    "Sending password reset email...";
            }


            const resetUrl =
    new URL("reset-password.html", window.location.href).href;


            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo: resetUrl
                    }
                );


            if (error) {

                console.error(
                    "Password reset error:",
                    error
                );

                if (authMessage) {
                    authMessage.textContent =
                        "Could not send the reset email. Please try again.";
                }

                return;
            }


            if (authMessage) {
                authMessage.textContent =
                    "If an account exists with that email, a password reset link has been sent.";
            }

        }
    );

}


// =========================================
// ACCOUNT CLOSE BUTTON
// =========================================

if (accountCloseButton) {

    accountCloseButton.addEventListener(
        "click",
        closeAccount
    );

}


// =========================================
// CLOSE PANELS WITH ESCAPE
// =========================================

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }


        closeSearch();

        closeAccount();

    }
);


// =========================================
// CHECK HASH FOR SEARCH / ACCOUNT
// =========================================

if (
    window.location.hash === "#search"
) {

    openSearch();

}


if (
    window.location.hash === "#account"
) {

    openAccount();

}


// =========================================
// INITIALISE
// =========================================

renderProducts();

updateCartCount();


console.log(
    "ALABAMU V1 initialized."
);
// =========================================
// PRODUCT PAGE ELEMENTS
// =========================================

const quantityMinus =
    document.getElementById("quantity-minus");

const quantityPlus =
    document.getElementById("quantity-plus");

const productQuantity =
    document.getElementById("product-quantity");

const addToCartButton =
    document.getElementById("add-to-cart");

const productSize =
    document.getElementById("product-size");

const productColour =
    document.getElementById("product-colour");


// =========================================
// GET SELECTED PRODUCT
// =========================================

function getSelectedProduct() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const productId =
        Number(
            params.get("id")
        );


    return products.find(
        product =>
            Number(product.id) === productId
    );

}


// =========================================
// UPDATE CART COUNT
// =========================================

function updateCartCount() {

    if (!cartCount) return;


    const totalItems =
        cart.reduce(
            (total, item) =>
                total + Number(item.quantity || 0),
            0
        );


    cartCount.textContent =
        totalItems;

}


// =========================================
// PRODUCT QUANTITY - MINUS
// =========================================

if (quantityMinus) {

    quantityMinus.addEventListener(
        "click",
        () => {

            if (!productQuantity) return;


            let quantity =
                Number(
                    productQuantity.textContent
                );


            if (quantity > 1) {
                quantity--;
            }


            productQuantity.textContent =
                quantity;

        }
    );

}


// =========================================
// PRODUCT QUANTITY - PLUS
// =========================================

if (quantityPlus) {

    quantityPlus.addEventListener(
        "click",
        () => {

            if (!productQuantity) return;


            let quantity =
                Number(
                    productQuantity.textContent
                );


            quantity++;


            productQuantity.textContent =
                quantity;

        }
    );

}


// =========================================
// ADD TO CART
// =========================================

if (addToCartButton) {

    addToCartButton.addEventListener(
        "click",
        () => {

            const product =
                getSelectedProduct();


            if (!product) {

                alert(
                    "This product could not be found."
                );

                return;

            }


            const quantity =
                Number(
                    productQuantity
                        ? productQuantity.textContent
                        : 1
                );


            const selectedSize =
                productSize
                    ? productSize.value
                    : "";


            const selectedColour =
                productColour
                    ? productColour.value
                    : "";


            if (
                product.sizes &&
                product.sizes.length > 0 &&
                !selectedSize
            ) {

                alert(
                    "Please select a size."
                );

                return;

            }


            if (
                product.colours &&
                product.colours.length > 0 &&
                !selectedColour
            ) {

                alert(
                    "Please select a colour."
                );

                return;

            }


            if (
                product.price === null ||
                product.price === undefined
            ) {

                alert(
                    "This product is not available for purchase yet."
                );

                return;

            }


            const cartItem = {

                productId:
                    product.id,

                name:
                    product.name,

                price:
                    Number(product.price),

                size:
                    selectedSize,

                colour:
                    selectedColour,

                quantity:
                    quantity

            };


            cart.push(cartItem);


            saveCart();

            updateCartCount();


            alert(
                `${product.name} added to cart.`
            );

        }
    );

}


// =========================================
// CART PAGE
// =========================================

const cartItemsContainer =
    document.getElementById("cartItems");

const cartTotalElement =
    document.getElementById("cartTotal");

const checkoutButton =
    document.getElementById("checkoutButton");


// =========================================
// CHECKOUT BUTTON
// =========================================

if (checkoutButton) {

    checkoutButton.addEventListener(
        "click",
        () => {

            if (cart.length === 0) {
                return;
            }


            window.location.href =
                "checkout.html";

        }
    );

}


// =========================================
// RENDER SAVED CART
// =========================================

function renderCart() {

    if (!cartItemsContainer) return;


    // CART EMPTY

    if (cart.length === 0) {

        cartItemsContainer.innerHTML = `

            <div class="cart-empty">

                <h2>
                    YOUR CART IS EMPTY
                </h2>


                <p>
                    Add something from the collection
                    to get started.
                </p>


                <a
                    href="index.html#shop"
                    class="primary-button"
                >
                    SHOP NOW
                </a>

            </div>

        `;


        if (cartTotalElement) {

            cartTotalElement.textContent =
                "₦0";

        }


        if (checkoutButton) {

            checkoutButton.disabled =
                true;

        }


        return;

    }


    // CART HAS ITEMS

    cartItemsContainer.innerHTML =
        "";


    let total = 0;


    cart.forEach(
        (item, index) => {

            const subtotal =
                Number(item.price) *
                Number(item.quantity);


            total += subtotal;


            const itemElement =
                document.createElement("div");


            itemElement.className =
                "cart-item";


            itemElement.innerHTML = `

                <div class="cart-item-info">

                    <h3>
                        ${item.name}
                    </h3>


                    <p>
                        Size:
                        ${item.size || "Not specified"}
                    </p>


                    <p>
                        Colour:
                        ${item.colour || "Not specified"}
                    </p>


                    <p>
                        Quantity:
                        ${item.quantity}
                    </p>

                </div>


                <div class="cart-item-price">

                    <strong>
                        ₦${subtotal.toLocaleString()}
                    </strong>


                    <button
                        type="button"
                        class="remove-cart-item"
                        data-index="${index}"
                    >
                        REMOVE
                    </button>

                </div>

            `;


            cartItemsContainer.appendChild(
                itemElement
            );

        }
    );


    if (cartTotalElement) {

        cartTotalElement.textContent =
            `₦${total.toLocaleString()}`;

    }


    if (checkoutButton) {

        checkoutButton.disabled =
            false;

    }


    // REMOVE BUTTONS

    document
        .querySelectorAll(
            ".remove-cart-item"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        );


                    cart.splice(
                        index,
                        1
                    );


                    saveCart();

                    updateCartCount();

                    renderCart();

                }
            );

        });

}


// =========================================
// LOAD CART PAGE
// =========================================

renderCart();


// =========================================
// CHECKOUT PAGE
// =========================================

const checkoutItemsContainer =
    document.getElementById(
        "checkoutItems"
    );

const checkoutTotalElement =
    document.getElementById(
        "checkoutTotal"
    );

const checkoutForm =
    document.getElementById(
        "checkoutForm"
    );


// =========================================
// RENDER CHECKOUT
// =========================================

function renderCheckout() {

    if (!checkoutItemsContainer) {
        return;
    }


    if (cart.length === 0) {

        checkoutItemsContainer.innerHTML = `

            <p>
                Your cart is empty.
            </p>


            <a
                href="index.html#shop"
                class="primary-button"
            >
                RETURN TO SHOP
            </a>

        `;


        if (checkoutTotalElement) {

            checkoutTotalElement.textContent =
                "₦0";

        }


        return;

    }


    checkoutItemsContainer.innerHTML =
        "";


    let total = 0;


    cart.forEach(item => {

        const subtotal =
            Number(item.price) *
            Number(item.quantity);


        total += subtotal;


        const checkoutItem =
            document.createElement("div");


        checkoutItem.className =
            "checkout-item";


        checkoutItem.innerHTML = `

            <div class="checkout-item-info">

                <h3>
                    ${item.name}
                </h3>


                <p>
                    Size:
                    ${item.size || "Not specified"}
                </p>


                <p>
                    Colour:
                    ${item.colour || "Not specified"}
                </p>


                <p>
                    Quantity:
                    ${item.quantity}
                </p>

            </div>


            <div class="checkout-item-price">

                ₦${subtotal.toLocaleString()}

            </div>

        `;


        checkoutItemsContainer.appendChild(
            checkoutItem
        );

    });


    if (checkoutTotalElement) {

        checkoutTotalElement.textContent =
            `₦${total.toLocaleString()}`;

    }

}


renderCheckout();


// =========================================
// PLACE ORDER
// =========================================

if (checkoutForm) {

    checkoutForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            if (cart.length === 0) {

                alert(
                    "Your cart is empty."
                );


                window.location.href =
                    "index.html#shop";


                return;

            }


            const customerName =
                document
                    .getElementById(
                        "customerName"
                    )
                    .value
                    .trim();


            const customerPhone =
                document
                    .getElementById(
                        "customerPhone"
                    )
                    .value
                    .trim();


            const customerEmail =
                document
                    .getElementById(
                        "customerEmail"
                    )
                    .value
                    .trim();


            const deliveryAddress =
                document
                    .getElementById(
                        "deliveryAddress"
                    )
                    .value
                    .trim();


            const customerState =
                document
                    .getElementById(
                        "customerState"
                    )
                    .value
                    .trim();


            if (
                !customerName ||
                !customerPhone ||
                !customerEmail ||
                !deliveryAddress ||
                !customerState
            ) {

                alert(
                    "Please complete all customer information."
                );


                return;

            }


            let orderTotal = 0;


            cart.forEach(item => {

                orderTotal +=
                    Number(item.price) *
                    Number(item.quantity);

            });


            const orderReference =
                "ALA-" +
                Date.now()
                    .toString()
                    .slice(-8);


            const order = {

                reference:
                    orderReference,

                customer: {

                    name:
                        customerName,

                    phone:
                        customerPhone,

                    email:
                        customerEmail,

                    address:
                        deliveryAddress,

                    state:
                        customerState

                },

                items:
                    cart,

                total:
                    orderTotal,

                paymentMethod:
                    "Bank Transfer",

                status:
                    "Pending Payment",

                createdAt:
                    new Date().toISOString()

            };


            const existingOrders =
                JSON.parse(
                    localStorage.getItem(
                        "alabamuOrders"
                    )
                ) || [];


            existingOrders.push(
                order
            );


            localStorage.setItem(
                "alabamuOrders",
                JSON.stringify(
                    existingOrders
                )
            );


            cart = [];


            saveCart();

            updateCartCount();


            localStorage.setItem(
                "alabamuLatestOrder",
                JSON.stringify(order)
            );


            window.location.href =
                "order-success.html";

        }
    );

}
// =========================================
// ORDER SUCCESS PAGE
// =========================================

const successOrderReference =
    document.getElementById(
        "successOrderReference"
    );

const successOrderTotal =
    document.getElementById(
        "successOrderTotal"
    );


if (
    successOrderReference &&
    successOrderTotal
) {

    const latestOrder =
        JSON.parse(
            localStorage.getItem(
                "alabamuLatestOrder"
            )
        );


    if (latestOrder) {

        successOrderReference.textContent =
            latestOrder.reference;


        successOrderTotal.textContent =
            `₦${Number(
                latestOrder.total
            ).toLocaleString()}`;

    }

}


// =========================================
// SUPABASE AUTHENTICATION
// =========================================

const authForm =
    document.getElementById(
        "authForm"
    );

const authTitle =
    document.getElementById(
        "authTitle"
    );

const authEmail =
    document.getElementById(
        "authEmail"
    );

const authPassword =
    document.getElementById(
        "authPassword"
    );

const authMessage =
    document.getElementById(
        "authMessage"
    );

const authSubmitButton =
    document.getElementById(
        "authSubmitButton"
    );

const authSwitchButton =
    document.getElementById(
        "authSwitchButton"
    );

const registerName =
    document.getElementById(
        "registerName"
    );

const registerPhone =
    document.getElementById(
        "registerPhone"
    );

const registerAddress =
    document.getElementById(
        "registerAddress"
    );

const registerState =
    document.getElementById(
        "registerState"
    );

const registerConfirmPassword =
    document.getElementById(
        "registerConfirmPassword"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const loggedOutAccount =
    document.getElementById(
        "loggedOutAccount"
    );

const loggedInAccount =
    document.getElementById(
        "loggedInAccount"
    );

const accountWelcome =
    document.getElementById(
        "accountWelcome"
    );

const accountName =
    document.getElementById(
        "accountName"
    );

const accountEmail =
    document.getElementById(
        "accountEmail"
    );

const accountPhone =
    document.getElementById(
        "accountPhone"
    );

const accountAddress =
    document.getElementById(
        "accountAddress"
    );

const accountState =
    document.getElementById(
        "accountState"
    );


// =========================================
// AUTH MODE
// =========================================

let authMode =
    "register";


// =========================================
// SET AUTH MODE
// =========================================

function setAuthMode(mode) {

    authMode =
        mode === "login"
            ? "login"
            : "register";


    if (authTitle) {

        authTitle.textContent =
            authMode === "login"
                ? "LOGIN"
                : "CREATE ACCOUNT";

    }


    if (authSubmitButton) {

        authSubmitButton.textContent =
            authMode === "login"
                ? "LOGIN"
                : "CREATE ACCOUNT";

    }


    // -----------------------------------------
    // AUTH SWITCH TEXT
    // -----------------------------------------

    const authSwitchText =
        document.getElementById("authSwitchText");


    if (authSwitchText) {

        authSwitchText.textContent =
            authMode === "login"
                ? "Need an account?"
                : "Already have an account?";

    }


    if (authSwitchButton) {

        authSwitchButton.textContent =
            authMode === "login"
                ? "CREATE ACCOUNT"
                : "LOGIN";

    }


    // -----------------------------------------
    // REGISTRATION-ONLY FIELDS
    // -----------------------------------------

    const registerNameField =
        document.getElementById("registerNameField");

    const registerPhoneField =
        document.getElementById("registerPhoneField");

    const registerAddressField =
        document.getElementById("registerAddressField");

    const registerStateField =
        document.getElementById("registerStateField");

    const confirmPasswordField =
        document.getElementById("confirmPasswordField");
const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

    const registrationFields = [
        registerNameField,
        registerPhoneField,
        registerAddressField,
        registerStateField,
        confirmPasswordField
    ];


    registrationFields.forEach(field => {

        if (!field) return;

        field.style.display =
            authMode === "login"
                ? "none"
                : "";

    });
  if (forgotPasswordButton) {
    forgotPasswordButton.style.display =
        authMode === "login" ? "block" : "none";
}


    // -----------------------------------------
    // PASSWORD AUTOCOMPLETE
    // -----------------------------------------

    if (authPassword) {

        authPassword.autocomplete =
            authMode === "login"
                ? "current-password"
                : "new-password";

    }


    // -----------------------------------------
    // CLEAR MESSAGE
    // -----------------------------------------

    if (authMessage) {

        authMessage.textContent = "";

    }

}

// =========================================
// AUTH MODE SWITCH
// =========================================

if (authSwitchButton) {

    authSwitchButton.addEventListener(
        "click",
        () => {

            setAuthMode(
                authMode === "register"
                    ? "login"
                    : "register"
            );

        }
    );

}


// =========================================
// LOAD CUSTOMER PROFILE
// =========================================

async function loadCustomerProfile(user) {

    if (!user) return;


    const {
        data: profile,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();


    if (error) {

        console.error(
            "Could not load customer profile:",
            error
        );


        if (accountWelcome) {

            accountWelcome.textContent =
                `WELCOME, ${
                    user.user_metadata?.full_name ||
                    "CUSTOMER"
                }`;

        }


        if (accountEmail) {

            accountEmail.textContent =
                user.email ||
                "Not provided";

        }


        return;

    }


    if (accountWelcome) {

        accountWelcome.textContent =
            `WELCOME, ${
                profile.full_name ||
                "CUSTOMER"
            }`;

    }


    if (accountName) {

        accountName.textContent =
            profile.full_name ||
            "Not provided";

    }


    if (accountEmail) {

        accountEmail.textContent =
            profile.email ||
            user.email ||
            "Not provided";

    }


    if (accountPhone) {

        accountPhone.textContent =
            profile.phone ||
            "Not provided";

    }


    if (accountAddress) {

        accountAddress.textContent =
            profile.delivery_address ||
            "Not provided";

    }


    if (accountState) {

        accountState.textContent =
            profile.state ||
            "Not provided";

    }

}


// =========================================
// UPDATE ACCOUNT UI
// =========================================

async function updateAccountUI(session) {

    if (
        !loggedOutAccount ||
        !loggedInAccount
    ) {

        return;

    }


    if (
        session &&
        session.user
    ) {

        loggedOutAccount.style.display =
            "none";


        loggedInAccount.style.display =
            "block";


        await loadCustomerProfile(
            session.user
        );


        return;

    }


    loggedOutAccount.style.display =
        "block";


    loggedInAccount.style.display =
        "none";


    setAuthMode("register");

}


// =========================================
// CREATE ACCOUNT / LOGIN
// =========================================

if (authForm) {

    authForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!authMessage) {
                return;
            }


            authMessage.textContent =
                "";


            const email =
                authEmail
                    ? authEmail.value
                        .trim()
                    : "";


            const password =
                authPassword
                    ? authPassword.value
                    : "";


            if (!email || !password) {

                authMessage.textContent =
                    "Please enter your email and password.";

                return;

            }


            // =================================
            // LOGIN
            // =================================

            if (
                authMode === "login"
            ) {

                authMessage.textContent =
                    "Logging in...";


                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .auth
                        .signInWithPassword({

                            email:
                                email,

                            password:
                                password

                        });


                if (error) {

                    console.error(
                        "Login error:",
                        error
                    );


                    authMessage.textContent =
                        error.message;


                    return;

                }


                authMessage.textContent =
                    "Login successful.";


                await updateAccountUI(
                    data.session
                );


                return;

            }


            // =================================
            // CREATE ACCOUNT
            // =================================

            const fullName =
                registerName
                    ? registerName.value
                        .trim()
                    : "";


            const phone =
                registerPhone
                    ? registerPhone.value
                        .trim()
                    : "";


            const address =
                registerAddress
                    ? registerAddress.value
                        .trim()
                    : "";


            const state =
                registerState
                    ? registerState.value
                        .trim()
                    : "";


            const confirmPassword =
                registerConfirmPassword
                    ? registerConfirmPassword.value
                    : "";


            if (
                !fullName ||
                !phone ||
                !address ||
                !state
            ) {

                authMessage.textContent =
                    "Please complete all account fields.";

                return;

            }


            if (
                password !==
                confirmPassword
            ) {

                authMessage.textContent =
                    "Passwords do not match.";

                return;

            }


            if (
                password.length < 6
            ) {

                authMessage.textContent =
                    "Password must be at least 6 characters.";

                return;

            }


            authMessage.textContent =
                "Creating your account...";


            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .signUp({

                        email:
                            email,

                        password:
                            password,

                        options: {

                            data: {

                                full_name:
                                    fullName,

                                phone:
                                    phone,

                                delivery_address:
                                    address,

                                state:
                                    state

                            }

                        }

                    });


            if (error) {

                console.error(
                    "Registration error:",
                    error
                );


                authMessage.textContent =
                    error.message;


                return;

            }


            console.log(
                "Registration successful:",
                data
            );


            authMessage.textContent =
                "Account created. Please check your email to confirm your account.";


            if (authForm) {

                authForm.reset();

            }

        }
    );

}


// =========================================
// LOGOUT
// =========================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();


            if (error) {

                console.error(
                    "Logout error:",
                    error
                );


                alert(
                    "Could not log out. Please try again."
                );


                return;

            }


            await updateAccountUI(
                null
            );


            if (accountPanel) {

                accountPanel.classList.add(
                    "open"
                );

            }

        }
    );

}


// =========================================
// CHECK CURRENT SESSION
// =========================================

async function checkCurrentSession() {

    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getSession();


    if (error) {

        console.error(
            "Session check failed:",
            error
        );


        return;

    }


    await updateAccountUI(
        data.session
    );

}


// =========================================
// AUTH STATE CHANGES
// =========================================

supabaseClient.auth.onAuthStateChange(
    async (
        event,
        session
    ) => {

        console.log(
            "Auth state changed:",
            event
        );


        await updateAccountUI(
            session
        );

    }
);


// =========================================
// START AUTH
// =========================================

setAuthMode(
    "register"
);


checkCurrentSession();


// =========================================
// LOAD PRODUCTS
// =========================================

loadProducts();