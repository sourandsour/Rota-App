# RotaApp

RotaApp is a workplace scheduling application designed for small businesses. It is designed to help managers efficiently manage employee rotas while supporting staff collaboration and communication.

## Features

- Create and manage employee schedules
- View weekly rotas
- Allow staff to submit shift change requests
- Allow staff to declare unavailability
- Auto-allocate weekly schedules
- Intuitive and easy-to-use interface

## Tech Stack

### Frontend
- JavaScript
- HTML
- CSS

### Backend
- Node.js
- Express.js

### Database
- MySQL
- SQL

## Installation

Clone the repository:

```bash
git clone https://github.com/sourandsour/Rota-App.git
```

Navigate into the project directory:

```bash
cd rotaapp
```

Install dependencies:

```bash
npm install
```

## Database Setup

Create a MySQL database named `rotaapp` and import the provided SQL schema file:

```bash
mysql -u <username> -p rotaapp < schema.sql
```

## Running the Server

Start the backend server:

```bash
cd src/backend
node server.js
```
## Usage

1. Launch the application
2. Log in as a manager or employee
3. Create and manage weekly rotas
4. Submit availability or shift change requests
5. Automatically generate schedules for staff