# Peter Parts

Peterparts is an E-commerce that sells Kitchenaid and Cuisinart gears and appliances.

This repo describes the source code of the main E-commerce website, made with Node.js.

## Technologies and versions

- Node: 24.11.1

## App Features

- Homepage

- Product Search via:
  - Keywords
  - Categories
  - Price
  - Brand
  - Gear ID

- Product Description Page with:
  - Images
  - Title
  - Product Description
  - Related Products
  - Reviews

- Product Forum where people can:
  - Ask questions
  - Answer questions
  - Upvote questions
  - Close questions

- Admin View with:
  - Orders Management
  - Users Management
  - Products Management
  - Clients and Customers Management, with client tagging
  - Email Marketing Drag and Drop Builder and SMTP Server

- Low Stock Products Client Notifications

- Client View with:
  - Past and Current Orders
  - Total Money Spent
  - Client Level (determined by amount of purchases)
  - Past Questions
  - Favorite Products

- Login/SignUp with Google

- Security Features such as:
  - Rate Limiting by IP
  - Headers Check
  - Authentication Middlewares

## Requerimientos:

1. Node Version Manager (nvm)

# Instalación

1. `nvm use`
2. `npm install`

## Scripts

- Dev (runs TypeScript directly with auto-reload): `npm run dev`
- Build (transpiles TypeScript to `dist/`): `npm run build`
- Start (runs compiled JavaScript from `dist/`): `npm start`
- Prisma Setup `npx prisma init --datasource-provider postgresql --output ../generated/prisma`
