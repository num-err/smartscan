# Smart Scan Meal Service

A web application built to manage beneficiary verification and meal distribution using QR codes.

The system was designed to replace manual verification processes with a faster digital workflow. Beneficiaries are assigned unique QR codes that can be scanned during distribution events to verify eligibility and record transactions in real time.

## Features

* QR code-based beneficiary identification
* Eligibility verification before distribution
* Distribution transaction tracking
* Beneficiary management
* PostgreSQL-backed data storage
* REST API built with Node.js

## Tech Stack

* Node.js
* Express
* PostgreSQL
* AWS
* HTML
* CSS
* JavaScript

## How It Works

1. A beneficiary receives a unique QR code.
2. Staff scan the QR code at a distribution site.
3. The application checks eligibility against the database.
4. A transaction record is created.
5. Distribution status is updated immediately.

This process reduces manual lookups and helps maintain accurate distribution records.

## Project Structure

```text
.
├── models/
├── routes/
├── app.js
├── server.mjs
├── package.json
├── index.html
├── style.css
└── README.md
```

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd smart-scan-meal-service
```

Install dependencies:

```bash
npm install
```

Configure database credentials and environment variables.

Start the server:

```bash
npm start
```

For development:

```bash
npm run dev
```

## Future Improvements

* Admin dashboard
* Reporting and analytics
* Mobile scanning interface
* SMS notifications
* Offline synchronization support

## License

MIT License
