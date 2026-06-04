# StallionWear E-Commerce Platform

StallionWear is a modern, production-ready, full-stack MERN (MongoDB, Express, React, Node.js) e-commerce application designed for fashion and apparel retail. The platform provides a seamless shopping experience for customers and a comprehensive administrative portal for store managers. It solves the typical e-commerce challenges of secure authentication, inventory management with variations (sizes/colors), shopping cart and wishlist persistence, real-time product reviews, multi-stage order tracking, and sales analytics.

---

## 1. Project Title & Overview

**StallionWear E-Commerce** is a high-performance fashion retail store. 

*   **Purpose:** To offer an intuitive, visually stunning catalog and ordering platform for customers, combined with robust inventory, order, and sales dashboard tools for administrators.
*   **The Problem It Solves:** Prevents double-selling through strict variant-level stock validation, secures transactions with JWT access/refresh token dual-auth cookies, retains user baskets and wishlists across sessions, and aggregates operational metrics for store analytics.
*   **Primary Use Case:** Customers browse products, select size and color variants, manage their cart/wishlist, place orders (with Cash on Delivery, Stripe, or PayPal placeholders), and review their purchase history. Administrators manage products, update order statuses, and track revenue metrics via an analytical dashboard.

---

## 2. Architecture & Tech Stack

Based on the actual dependencies declared in the frontend and backend config files, the application uses the following stack:

### Frontend
*   **Core Library:** React `^19.1.0` & React DOM `^19.1.0`
*   **State Management:** Redux Toolkit `^2.8.2` & React Redux `^9.2.0`
*   **Routing:** React Router DOM `^7.7.1`
*   **Styling:** Tailwind CSS `^4.1.11` (via `@tailwindcss/vite` plugin) & Styled Components `^6.1.19`
*   **UI Components & Animation:** Swiper `^11.2.10` (for image carousels) & React Icons `^5.5.0`
*   **HTTP Client:** Axios `^1.11.0` (with custom interceptors for session validation)
*   **Bundler & Dev Server:** Vite `^7.0.4`

### Backend
*   **Framework:** Express `^5.1.0` (using the modern Express 5 release)
*   **Security & Safety:** Helmet `^8.1.0` (CORS/security headers) & Express Rate Limit `^8.0.1` (IP rate limiting)
*   **Data Validation:** Express Validator `^7.2.1` (strict payload schemas)
*   **Image Management:** Multer `^2.0.2` (multipart uploads) & Cloudinary SDK `^2.7.0` (remote asset storage)
*   **Authentication:** JSON Web Tokens (`jsonwebtoken ^9.0.2`) & Password Hashing (`bcryptjs ^3.0.2`)
*   **Cookies Parser:** Cookie Parser `^1.4.7`

### Database
*   **Database:** MongoDB Atlas (Cloud Database)
*   **Object Data Modeling (ODM):** Mongoose `^8.16.5`

### DevOps & Tools
*   **Local Process Manager:** Nodemon `^3.1.10` (Hot reloading)
*   **Cloud Deployment:** Vercel (Configured via `vercel.json` and `@vercel/node` serverless runtime)

---

## 3. Core Features

*   **Robust Session Authentication:** Secure register/login flow using access tokens (short-lived) and refresh tokens (long-lived). Tokens are attached automatically to Axios request headers via localStorage and cookie-parser.
*   **Variant-Level Inventory Tracking:** Products support multi-attribute variations (Size/Color) with separate stock volumes and custom price modifiers. The backend validates variant stock at checkout and deducts/restores stock dynamically on purchase/cancellation.
*   **Persistent User Profiles:** Baskets (Cart) and Wishlists are persisted as sub-documents directly within the User model in MongoDB, ensuring carts and wishlists follow customers across different browsers and devices.
*   **Multistage Order Processing:** Order tracking state-machine supporting transitions from `Pending` ➔ `Processing` ➔ `Confirmed` ➔ `Shipped` ➔ `Delivered` ➔ `Cancelled`. Users can cancel their own orders during the initial stages.
*   **Dynamic Product Reviews:** Customers who have ordered and received products can write ratings (1–5 stars) and comments (min 10 characters). The backend computes average product ratings using virtual properties.
*   **Administrative Dashboard Analytics:** Advanced admin aggregations that compute total revenue, average order value, sales trends over days, and top-selling products based on quantity sold.
*   **Secure Asset Storage:** Direct image pipelines from Multer local temp directory storage `/tmp` to Cloudinary cloud spaces, featuring clean-up hooks that delete local temp files after upload completes or fails.

---

## 4. Project Structure

A high-level tree representing the structure of the application:

```
StallionWear E-commerce/
├── StallionWear-E-commerce-BackEnd/    # Backend Express Application
│   ├── api/
│   │   └── index.js                    # Main serverless entry point for Vercel
│   ├── public/                         # Static assets
│   ├── vercel.json                     # Vercel deployment and routing rules
│   └── src/
│       ├── app.js                      # Express App and Middleware initialization
│       ├── server.js                   # Local server entry point
│       ├── configs/
│       │   └── db.config.js            # MongoDB Mongoose database connection
│       ├── controllers/                # Request handlers & DB interactions
│       │   ├── cart.controller.js
│       │   ├── order.controller.js
│       │   ├── product.controller.js
│       │   ├── review.controller.js
│       │   ├── user.controller.js
│       │   └── wishlist.controller.js
│       ├── middlewares/
│       │   ├── auth.middleware.js      # JWT authentication and user parser
│       │   ├── multer.middleware.js    # Image upload configuration
│       │   ├── rateLimiter.middleware.js # API rate limiting rules
│       │   └── validation.middleware.js  # express-validator schemas
│       ├── models/                     # Mongoose Schema Definitions
│       │   ├── order.model.js
│       │   ├── product.model.js
│       │   └── user.model.js
│       ├── routes/                     # API routers
│       │   ├── cart.route.js
│       │   ├── order.route.js
│       │   ├── product.route.js
│       │   ├── review.route.js
│       │   ├── user.route.js
│       │   └── wishList.route.js
│       └── utils/                      # Helper classes and helper functions
│           ├── ApiError.js             # Standardized error wrapper
│           ├── ApiResponse.js          # Standardized response wrapper
│           ├── asyncHandler.js         # Express async handler wrapper
│           ├── cloudinary.js           # Cloudinary upload/delete client
│           └── validateEnv.js          # Startup environment variable validation
│
└── StallionWear-E-commerce-FrontEnd/   # Frontend Vite + React SPA
    ├── index.html                      # Single page entry point
    ├── vite.config.js                  # Vite configuration file
    ├── eslint.config.js                # ESLint code styling rules
    └── src/
        ├── App.jsx                     # Root React Component
        ├── main.jsx                    # React mounting module
        ├── index.css                   # Global CSS directives for Tailwind
        ├── app/
        │   └── store.js                # Redux Toolkit global store configuration
        ├── utils/
        │   ├── axios.js                # Custom Axios instance with interceptors
        │   └── logger.js               # Utility logger
        ├── Pages/                      # Page components
        │   ├── Admin.jsx               # Admin control panel & charts
        │   ├── Checkout.jsx            # Shipping details and payment forms
        │   ├── ProductPage.jsx         # Product details and reviews component
        │   ├── Login.jsx / Register.jsx # Authentication pages
        │   └── Cart.jsx / Wishlist.jsx # shopping basket and wishlist displays
        ├── features/                   # Redux slices grouped by domain
        │   ├── Products/               # Product catalog state slice
        │   ├── User/                   # Authentication and profile slice
        │   └── Cart/ / Wishlist/       # Persistence management slices
        └── Components/                 # Common visual widgets
            ├── ProtectedRoute.jsx      # Navigation route guard (role-based)
            ├── Router.jsx              # Application URL routing tables
            └── Product.jsx             # Singular product card display
```

---

## 5. Prerequisites & Environment Variables

### Prerequisites
*   **Node.js:** version `18.x` or higher installed.
*   **MongoDB:** A running MongoDB instance locally, or a remote MongoDB Atlas database cluster.
*   **Cloudinary:** An active account to retrieve API credentials for image storage.

### Environment Variables

#### Backend Environment Variables (`.env`)

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment state | `development` |
| `PORT` | Local port for backend server | `5000` |
| `MONGO_URI` | Connection URI string for MongoDB database | `mongodb+srv://...` |
| `ACCESS_TOKEN_SECRET` | Secret key for generating access token JWTs | `[32-byte hash string]` |
| `ACCESS_TOKEN_EXPIRY` | Lifespan of access tokens | `15m` |
| `REFRESH_TOKEN_SECRET` | Secret key for generating refresh token JWTs | `[32-byte hash string]` |
| `REFRESH_TOKEN_EXPIRY` | Lifespan of refresh tokens | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary storage account name | `my_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET`| Cloudinary API Secret Key | `[cloudinary secret hash]` |

#### Frontend Environment Variables (`.env.local` / `.env.production`)

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Destination URL of the StallionWear API server | `http://localhost:5000` |
| `VITE_NODE_ENV` | Environment identifier for Vite client | `development` |

---

## 6. Local Development & Installation

Follow these steps to run StallionWear locally on your machine. Docker configurations are not currently included in this repository.

### Step 1: Run the Backend Services
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd StallionWear-E-commerce-BackEnd
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the backend folder using the variables described in Section 5:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ACCESS_TOKEN_SECRET=your_access_token_secret
   ACCESS_TOKEN_EXPIRY=15m
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   REFRESH_TOKEN_EXPIRY=7d
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
4. Start the backend developer server (with Nodemon):
   ```bash
   npm run dev
   ```

### Step 2: Run the Frontend Client
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd StallionWear-E-commerce-FrontEnd
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root of the frontend folder:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_NODE_ENV=development
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. To test or compile the production bundle:
   ```bash
   npm run build
   ```

---

## 7. API Reference

All endpoints are prefixed with `/api` except health checks.

### User & Authentication (`/api/user`)
*   `POST /register` - Registers a new user. Uploads profile picture to Cloudinary. Apply rate limits.
*   `POST /login` - Authenticates user. Attaches tokens and returns details. Apply rate limits.
*   `POST /logout` - Clears authentication token session. *(Requires authentication)*
*   `POST /refresh-token` - Generates new access token using refresh tokens.

### Products (`/api/product`)
*   `GET /` - Fetches all products. Supports pagination (`page`, `limit`), text `search` indexing, price ranges (`minPrice`/`maxPrice`), categories list (comma separated or JSON array), and sorting (`sortBy`, `sortOrder`).
*   `GET /newArrivals` - Aggregates and returns the single newest product from the top 10 categories.
*   `GET /topSelling` - Aggregates sold order quantities and returns the top 5 selling items.
*   `GET /:id` - Fetches single product details by ID.
*   `POST /create` - Creates a new product. Uploads images array (max 10) to Cloudinary. *(Requires Admin)*
*   `PUT /update/:id` - Updates product and replaces image references. *(Requires Admin)*
*   `DELETE /:id` - Removes product. *(Requires Admin)*

### Shopping Cart (`/api/cart`)
*(All Cart routes require authentication)*
*   `GET /` - Gets all cart items and subtotal summary populated with product details.
*   `POST /add` - Adds item to cart. Validates product price modifiers, and variant stock availability.
*   `PATCH /remove` - Removes specific item variant (by product ID, size, and color) from cart.
*   `DELETE /clear` - Clears entire shopping cart array.
*   `PATCH /decrement` - Decrements variant quantity in cart by 1.
*   `PATCH /increment` - Increments variant quantity in cart by 1.

### Wishlist (`/api/wishlist`)
*(All Wishlist routes require authentication)*
*   `GET /` - Gets the user's wishlist items with product name, images, and price details.
*   `POST /add` - Adds product variant to user's wishlist.
*   `DELETE /remove` - Removes item variant from the wishlist.
*   `DELETE /clear` - Clears entire wishlist.
*   `POST /moveToCart` - Transfers item variant from wishlist to shopping cart.

### Orders & Checkout (`/api/order`)
*(All Order routes require authentication)*
*   `POST /` - Places a new order. Performs inventory check on each variant, updates variant stock, clears user cart.
*   `GET /my-orders` - Returns paginated orders list for the authenticated user.
*   `GET /:orderId` - Retrieves order details. Admins can view all orders; users can view only their own.
*   `PATCH /:orderId/cancel` - Cancels order if in `Pending`, `Processing` or `Confirmed` state and restores stock.
*   `GET /admin/all` - Lists all platform orders with advanced date and status filters. *(Requires Admin)*
*   `PATCH /:orderId/status` - Updates order state and tracking numbers. *(Requires Admin)*
*   `GET /admin/analytics` - Computes daily revenue and top-selling product list over variable days. *(Requires Admin)*

### Product Reviews (`/api/review`)
*   `GET /:productId/reviews` - Returns paginated reviews and rating distribution for a product.
*   `GET /orders` - Lists user orders that are eligible for a product review. *(Requires authentication)*
*   `POST /add` - Submits a 1-5 rating review. Verifies that user purchased the product. *(Requires authentication)*
*   `DELETE /:productId/reviews/:reviewId` - Deletes product review. *(Requires authentication)*

### System Health
*   `GET /health` - Returns 200 server uptime and DB status response.
